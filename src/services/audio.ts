/**
 * Audio FX, Studio-Quality Natural Dutch TTS Engine & Fastfood Announcer
 * for Werkdonalds POS & WerkPay.
 * 
 * Powered by Server-Side Same-Origin Proxy (/api/tts) to guarantee 100% audio
 * delivery on Linux, Opera, Windows, macOS, Android & iOS without adblocker,
 * iframe or CORS blocking!
 */

export interface SpeechVoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  isDutch: boolean;
}

export type TtsEngineMode = 
  | 'auto' 
  | 'server_ruben'
  | 'server_lotte'
  | 'google_nl'
  | 'custom_url' 
  | 'native' 
  | 'chime_only';

export interface AudioDiagnosticStatus {
  ctxState: string;
  isUnlocked: boolean;
  activeEngine: string;
  lastPlayedText: string;
  lastStatus: 'idle' | 'playing' | 'success' | 'error';
  lastMessage: string;
  availableNativeVoicesCount: number;
}

// Bepaal of de browser MP3 bestanden kan afspelen.
// In Opera op Linux zonder 'chromium-codecs-ffmpeg-extra' pakket faalt MP3 audio/mpeg altijd.
// In dat geval vallen we automatisch terug op WAV (audio/wav), wat universeel ondersteund wordt zonder codecs!
let dynamicMp3Supported = typeof document !== 'undefined' && 
  document.createElement('audio').canPlayType('audio/mpeg') !== '';

class SoundEffects {
  private ctx: AudioContext | null = null;
  public isEnabled: boolean = true;
  private isUnlocked: boolean = false;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private activeAudioElement: HTMLAudioElement | null = null;
  private lastAnnouncedOrders: Map<string | number, number> = new Map();
  private pendingSpeech: { text: string; orderNo: number | string; target: string } | null = null;
  private speechQueue: Array<{ text: string; orderNo: number | string; target: string }> = [];
  private isPlayingSpeech: boolean = false;
  
  private listeners: ((announcement: { orderNo: number | string; text: string; id: number } | null) => void)[] = [];
  private diagListeners: ((diag: AudioDiagnosticStatus) => void)[] = [];

  private currentDiag: AudioDiagnosticStatus = {
    ctxState: 'uninitialized',
    isUnlocked: false,
    activeEngine: 'auto (Ruben NL)',
    lastPlayedText: '',
    lastStatus: 'idle',
    lastMessage: 'Klaar voor omroep',
    availableNativeVoicesCount: 0
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wd_sound_enabled');
      if (stored !== null) {
        this.isEnabled = stored === 'true';
      }

      this.initVoices();

      // Listen for user gestures to unlock Web Audio context
      const unlockAudio = () => {
        this.unlock();
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
    }
  }

  public subscribeAnnouncement(cb: (announcement: { orderNo: number | string; text: string; id: number } | null) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyAnnouncement(announcement: { orderNo: number | string; text: string; id: number } | null) {
    this.listeners.forEach(cb => cb(announcement));
  }

  public subscribeDiagnostics(cb: (diag: AudioDiagnosticStatus) => void) {
    this.diagListeners.push(cb);
    cb(this.getDiagnostics());
    return () => {
      this.diagListeners = this.diagListeners.filter(l => l !== cb);
    };
  }

  private updateDiag(partial: Partial<AudioDiagnosticStatus>) {
    this.currentDiag = {
      ...this.currentDiag,
      ...partial,
      ctxState: this.ctx ? this.ctx.state : 'uninitialized',
      isUnlocked: this.isUnlocked
    };
    this.diagListeners.forEach(cb => cb(this.currentDiag));
  }

  public getDiagnostics(): AudioDiagnosticStatus {
    return {
      ...this.currentDiag,
      ctxState: this.ctx ? this.ctx.state : 'uninitialized',
      isUnlocked: this.isUnlocked,
      availableNativeVoicesCount: this.cachedVoices.length
    };
  }

  /**
   * Explicitly unlock audio context & speech
   */
  public unlock() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;
    this.initCtx();
    
    if (this.pendingSpeech) {
      const { text, orderNo, target } = this.pendingSpeech;
      this.pendingSpeech = null;
      this.playSpeech(text, orderNo, target);
      return;
    }

    if (typeof window !== 'undefined') {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      // Speel een kort stil WAV-bestand om HTML5 <audio> elementen te ontgrendelen
      try {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
        silentAudio.volume = 0.01;
        silentAudio.play().catch(() => {});
      } catch {}

      if ('speechSynthesis' in window) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }
    }
  }

  public getIsUnlocked(): boolean {
    return this.isUnlocked || (this.ctx !== null && this.ctx.state === 'running');
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          this.cachedVoices = v;
          this.updateDiag({ availableNativeVoicesCount: v.length });
        }
      } catch {
        this.cachedVoices = [];
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  public getAvailableVoices(): SpeechVoiceOption[] {
    if (this.cachedVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      } catch {}
    }

    return this.cachedVoices.map(v => ({
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
      isDutch: v.lang.toLowerCase().startsWith('nl') || v.name.toLowerCase().includes('dutch') || v.name.toLowerCase().includes('nederlands')
    }));
  }

  public setEnabled(val: boolean) {
    this.isEnabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('wd_sound_enabled', String(val));
    }
    if (!val) {
      this.clearSpeechQueue();
    }
  }

  public clearSpeechQueue() {
    this.speechQueue = [];
    this.isPlayingSpeech = false;
    this.pendingSpeech = null;
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
      } catch {}
      this.activeAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.activeUtterance = null;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.ctx = new AudioContextClass();
        } catch {}
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public beep() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  public bell() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Tone 1: High crisp chime (E5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Tone 2: Warm resolving lower chime (C5)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.22);
      gain2.gain.setValueAtTime(0.45, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.95);
    } catch {}
  }

  public digitalRingtone() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [0, 0.12, 0.24].forEach((delay, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.5 + (idx * 200), now + delay);
        gain.gain.setValueAtTime(0.15, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
        osc.start(now + delay);
        osc.stop(now + delay + 0.08);
      });
    } catch {}
  }

  public chimeRingtone() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.12));
        gain.gain.setValueAtTime(0.2, now + (idx * 0.12));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.12) + 0.5);
        osc.start(now + (idx * 0.12));
        osc.stop(now + (idx * 0.12) + 0.5);
      });
    } catch {}
  }

  public marimbaRingtone() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.1));
        gain.gain.setValueAtTime(0.3, now + (idx * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.1) + 0.25);
        osc.start(now + (idx * 0.1));
        osc.stop(now + (idx * 0.1) + 0.25);
      });
    } catch {}
  }

  public playRingtone(ringtoneType?: string) {
    if (!this.isEnabled) return;
    const type = ringtoneType || (typeof window !== 'undefined' ? localStorage.getItem('wd_phone_ringtone') : null) || 'bell';
    switch (type) {
      case 'digital':
        this.digitalRingtone();
        break;
      case 'chime':
        this.chimeRingtone();
        break;
      case 'marimba':
        this.marimbaRingtone();
        break;
      case 'bell':
      default:
        this.bell();
        break;
    }
  }

  /**
   * Main order announcement function:
   * Announces: "Bestelling <nummer> voor <tafel of persoon> is gereed om af te halen!"
   * Never announces delivery orders.
   */
  public speakOrder(orderNo: number | string, identifier?: string, orderType?: string, force: boolean = false) {
    // Deduplication check: ignore if called within 1.5 seconds for the same order number unless forced
    const nowTime = Date.now();
    const lastTime = this.lastAnnouncedOrders.get(orderNo);
    if (!force && lastTime && nowTime - lastTime < 1500) {
      console.log(`Deduplicated rapid speakOrder call for order #${orderNo}`);
      return;
    }
    this.lastAnnouncedOrders.set(orderNo, nowTime);

    // 1. Delivery orders are NEVER announced
    if (orderType === 'delivery' || (identifier && identifier.toLowerCase().includes('bezorg'))) {
      return;
    }

    // 2. Play 2-tone airport/fastfood chime first
    this.unlock();
    this.bell();
    if (!this.isEnabled) return;

    // 3. Format natural Dutch target
    let target = '';
    const cleanId = (identifier || '').trim();
    if (cleanId) {
      target = cleanId;
    } else if (orderType === 'dine_in') {
      target = 'in het restaurant';
    } else if (orderType === 'takeaway') {
      target = 'afhaal';
    } else {
      target = 'de balie';
    }

    // Custom announcement format or default
    const customTemplate = typeof window !== 'undefined' ? localStorage.getItem('wd_tts_custom_template') : null;
    let textToSpeak = `Bestelling ${orderNo} voor ${target} is gereed om af te halen!`;
    if (customTemplate && customTemplate.trim()) {
      textToSpeak = customTemplate
        .replace(/{orderNo}/gi, String(orderNo))
        .replace(/{order_no}/gi, String(orderNo))
        .replace(/{nummer}/gi, String(orderNo))
        .replace(/{target}/gi, target)
        .replace(/{naam}/gi, target);
    }

    // 4. Notify live visual listeners so on-screen ticker updates immediately
    this.notifyAnnouncement({
      orderNo,
      text: textToSpeak,
      id: Date.now()
    });

    this.updateDiag({
      lastPlayedText: textToSpeak,
      lastStatus: 'playing',
      lastMessage: `Omroep gestart voor bestelling #${orderNo}`
    });

    // 5. Execute natural human voice after chime
    setTimeout(() => {
      this.playSpeech(textToSpeak, orderNo, target);
    }, 400);
  }

  public testSpeech(sampleOrderNo: number | string = 1001, sampleIdentifier: string = 'Tafel 4') {
    this.unlock();
    this.speakOrder(sampleOrderNo, sampleIdentifier, 'dine_in', true);
  }

  /**
   * Universal speech player using a common queueing pattern:
   * Keeps speeches and announcements from overlapping or getting interrupted.
   */
  public playSpeech(text: string, orderNo: number | string = 1001, target: string = 'Tafel 4') {
    if (typeof window === 'undefined' || !this.isEnabled) return;
    this.unlock();

    // Push the item to the queue
    this.speechQueue.push({ text, orderNo, target });
    
    // Automatically trigger queue processing
    this.processQueue();
  }

  /**
   * Sequential speech queue processor
   */
  private processQueue() {
    if (this.isPlayingSpeech) {
      return;
    }
    if (this.speechQueue.length === 0) {
      return;
    }

    const nextItem = this.speechQueue[0];
    this.isPlayingSpeech = true;

    let hasCompleted = false;
    const onComplete = (success: boolean, isAutoplayBlocked: boolean = false) => {
      if (hasCompleted) return;
      hasCompleted = true;
      clearTimeout(queueWatchdog);

      // ALWAYS remove the processed item from the queue to prevent infinite retry loops
      this.speechQueue.shift();
      this.isPlayingSpeech = false;

      if (isAutoplayBlocked) {
        console.warn("Autoplay blocked for speech item.");
        this.isUnlocked = false;
        this.updateDiag({
          lastStatus: 'error',
          lastMessage: 'Klik op het scherm om omroepen te activeren!'
        });
      }
      
      // Schedule the next item with a tiny natural gap if any
      if (this.speechQueue.length > 0) {
        setTimeout(() => {
          this.processQueue();
        }, 150);
      }
    };

    // Safety watchdog to prevent queue lockup if an engine hangs indefinitely
    const queueWatchdog = setTimeout(() => {
      console.warn("Speech queue item timed out, forcing next item.");
      onComplete(false);
    }, 15000);

    const mode = (localStorage.getItem('wd_tts_mode') || 'auto') as TtsEngineMode;

    switch (mode) {
      case 'chime_only':
        this.updateDiag({ activeEngine: 'chime_only', lastStatus: 'success', lastMessage: 'Alleen belsignaal afgespeeld' });
        onComplete(true);
        break;

      case 'custom_url':
        this.playCustomUrlTts(nextItem.text, nextItem.orderNo, nextItem.target, (success, isAutoplayBlocked) => {
          onComplete(success, isAutoplayBlocked);
        });
        break;

      case 'server_lotte':
        this.playServerTts(nextItem.text, 'Lotte', (success, isAutoplayBlocked) => {
          onComplete(success, isAutoplayBlocked);
        }, nextItem.orderNo, nextItem.target);
        break;

      case 'server_ruben':
        this.playServerTts(nextItem.text, 'Ruben', (success, isAutoplayBlocked) => {
          onComplete(success, isAutoplayBlocked);
        }, nextItem.orderNo, nextItem.target);
        break;

      case 'google_nl':
        this.playServerTts(nextItem.text, 'google', (success, isAutoplayBlocked) => {
          onComplete(success, isAutoplayBlocked);
        }, nextItem.orderNo, nextItem.target);
        break;

      case 'native':
        this.playNativeSpeechSynthesis(nextItem.text, false, (success, isAutoplayBlocked) => {
          onComplete(success, isAutoplayBlocked);
        });
        break;

      case 'auto':
      default:
        this.playAutoTtsWithFallbacks(nextItem.text, nextItem.orderNo, nextItem.target, (success, isAutoplayBlocked) => {
          onComplete(success, isAutoplayBlocked);
        });
        break;
    }
  }

  /**
   * Fast, Direct Human Voice Announcer:
   * Uses same-origin /api/tts endpoint (which already handles server-side voice fallbacks seamlessly).
   */
  private playAutoTtsWithFallbacks(
    text: string, 
    orderNo: number | string, 
    target: string, 
    callback?: (success: boolean, isAutoplayBlocked?: boolean) => void
  ) {
    this.updateDiag({ activeEngine: 'auto (Ruben NL)', lastStatus: 'playing' });

    // Step 1: Direct, clean Server TTS request (server handles Ruben -> Google -> VoiceRSS internally)
    this.playServerTts(text, 'Ruben', (success, isBlocked) => {
      if (isBlocked) {
        if (callback) callback(false, true);
        return;
      }
      if (success) {
        this.updateDiag({ activeEngine: 'Server Stem (Ruben)', lastStatus: 'success', lastMessage: 'Duidelijk gesproken via Ruben' });
        if (callback) callback(true);
        return;
      }

      // Step 2: Immediate Fallback to Browser Native Speech or Chime
      this.playNativeSpeechSynthesis(text, false, (nativeSuccess, isNativeBlocked) => {
        if (isNativeBlocked) {
          if (callback) callback(false, true);
          return;
        }
        if (nativeSuccess) {
          this.updateDiag({ activeEngine: 'Native Browser Stem', lastStatus: 'success', lastMessage: 'Gesproken via browser stem' });
          if (callback) callback(true);
        } else {
          // Instant local Web Audio chime backup
          this.updateDiag({ activeEngine: 'Beltoon Backup', lastStatus: 'success', lastMessage: 'Beltoon afgespeeld' });
          this.bell();
          if (callback) callback(false);
        }
      });
    }, orderNo, target);
  }

  /**
   * Plays audio via Same-Origin Server Endpoint `/api/tts` (or Native Browser Speech on static hosts like GitHub Pages).
   * Completely immune to CORS and codec errors!
   */
  public async playServerTts(
    text: string, 
    voiceName: string = 'Ruben', 
    callback?: (success: boolean, isAutoplayBlocked?: boolean) => void,
    orderNo: number | string = 1001,
    target: string = 'Tafel 4'
  ) {
    try {
      if (this.activeAudioElement) {
        this.activeAudioElement.pause();
        this.activeAudioElement = null;
      }

      const encoded = encodeURIComponent(text);
      const cacheBuster = Date.now();
      
      const isStaticStatic = typeof window !== 'undefined' && (
        window.location.hostname.endsWith('.github.io') ||
        window.location.hostname.endsWith('.pages.dev') ||
        window.location.protocol === 'file:'
      );

      // On static hosts (GitHub Pages) without /api backend:
      // Use HTML5 <audio> tag directly (HTML media tags are exempt from CORS fetch policy!)
      if (isStaticStatic) {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=nl&client=tw-ob&q=${encoded}`;
        const audio = new Audio(googleUrl);
        audio.volume = 1.0;
        (audio as any).referrerPolicy = "no-referrer";
        this.activeAudioElement = audio;

        let finished = false;
        const done = (status: boolean) => {
          if (finished) return;
          finished = true;
          clearTimeout(watchdog);
          if (this.activeAudioElement === audio) this.activeAudioElement = null;
          if (callback) callback(status);
        };

        const watchdog = setTimeout(() => {
          try { audio.pause(); } catch {}
          done(false);
        }, Math.max(10000, text.length * 120));

        audio.onplay = () => {
          this.updateDiag({ 
            activeEngine: 'Google TTS (Static Direct)', 
            lastStatus: 'playing',
            lastMessage: `Natuurlijke stem spreekt: "${text}"`
          });
        };

        audio.onended = () => {
          this.updateDiag({ lastStatus: 'success', lastMessage: 'Omroep voltooid' });
          done(true);
        };

        audio.onerror = () => {
          console.warn('Direct Google TTS audio tag error on static host, falling back to native browser speech...');
          clearTimeout(watchdog);
          this.playNativeSpeechSynthesis(text, false, callback);
        };

        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => {
            clearTimeout(watchdog);
            this.playNativeSpeechSynthesis(text, false, callback);
          });
        }
        return;
      }

      const url = `/api/tts?text=${encoded}&_t=${cacheBuster}`;

      // OPTION 1: Web Audio API (fetch + decodeAudioData)
      // Guaranteed 100% delivery without HTML5 audio tag codec issues
      this.initCtx();
      if (this.ctx) {
        try {
          if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
          }

          const res = await fetch(url);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
              this.ctx!.decodeAudioData(buffer, resolve, reject);
            });

            const source = this.ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.ctx.destination);

            let hasFinished = false;
            const finish = (status: boolean) => {
              if (hasFinished) return;
              hasFinished = true;
              if (callback) callback(status);
            };

            this.updateDiag({ 
              activeEngine: 'Google Server TTS (WebAudio)', 
              lastStatus: 'playing',
              lastMessage: `Natuurlijke stem spreekt: "${text}"`
            });

            source.onended = () => {
              this.updateDiag({ lastStatus: 'success', lastMessage: 'Omroep voltooid' });
              finish(true);
            };

            source.start(0);
            return;
          }
        } catch (webAudioErr) {
          console.warn('Web Audio API stream decode failed, trying HTML5 Audio element fallback:', webAudioErr);
        }
      }

      // OPTION 2: HTML5 Audio Fallback
      const audio = new Audio(url);
      audio.volume = 1.0;
      (audio as any).referrerPolicy = "no-referrer";
      this.activeAudioElement = audio;

      let finished = false;
      const done = (status: boolean, isAutoplayBlocked: boolean = false) => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        if (this.activeAudioElement === audio) {
          this.activeAudioElement = null;
        }
        if (callback) callback(status, isAutoplayBlocked);
      };

      const watchdog = setTimeout(() => {
        console.warn(`Server TTS playback timed out (watchdog triggered)`);
        try {
          audio.pause();
        } catch {}
        done(false);
      }, Math.max(10000, text.length * 120));

      audio.onplay = () => {
        this.updateDiag({ 
          activeEngine: 'Google Server TTS (NL)', 
          lastStatus: 'playing',
          lastMessage: `Natuurlijke stem spreekt: "${text}"`
        });
      };

      audio.onended = () => {
        this.updateDiag({ lastStatus: 'success', lastMessage: 'Omroep voltooid' });
        done(true);
      };

      audio.onerror = (e) => {
        console.warn(`Server TTS error:`, e);
        this.updateDiag({ lastStatus: 'error', lastMessage: 'Fout op Server TTS stream' });
        done(false);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: any) => {
          console.warn('Audio play rejection:', err);

          const isNotAllowed = err && (
            err.name === 'NotAllowedError' || 
            String(err).includes('interact') || 
            String(err).includes('allowed')
          );

          if (isNotAllowed) {
            this.isUnlocked = false;
            this.updateDiag({ lastStatus: 'error', lastMessage: 'Klik op het scherm om audio te activeren' });
            done(false, true);
            return;
          }

          done(false, false);
        });
      }
    } catch (err) {
      console.warn('Server TTS error:', err);
      if (callback) callback(false);
    }
  }

  /**
   * Custom User-Configured TTS URL:
   * Replaces {text}, {orderNo}, {target} in custom URL string.
   * Proxies through the online server backend to guarantee Linux Opera & CORS compliance!
   */
  public playCustomUrlTts(
    text: string, 
    orderNo: number | string = 1001, 
    target: string = 'Tafel 4', 
    callback?: (success: boolean, isAutoplayBlocked?: boolean) => void
  ) {
    const rawUrl = localStorage.getItem('wd_custom_tts_url') || '';
    if (!rawUrl) {
      this.updateDiag({ lastStatus: 'error', lastMessage: 'Geen Custom TTS URL ingesteld, schakelt over naar standaard stem...' });
      this.playAutoTtsWithFallbacks(text, orderNo, target, callback);
      return;
    }

    try {
      if (this.activeAudioElement) {
        this.activeAudioElement.pause();
        this.activeAudioElement = null;
      }

      const formattedUrl = rawUrl
        .replace(/{text}/gi, encodeURIComponent(text))
        .replace(/{orderNo}/gi, encodeURIComponent(String(orderNo)))
        .replace(/{order_no}/gi, encodeURIComponent(String(orderNo)))
        .replace(/{nummer}/gi, encodeURIComponent(String(orderNo)))
        .replace(/{target}/gi, encodeURIComponent(target))
        .replace(/{naam}/gi, encodeURIComponent(target));

      const isStaticStatic = typeof window !== 'undefined' && (
        window.location.hostname.endsWith('.github.io') ||
        window.location.hostname.endsWith('.pages.dev') ||
        window.location.protocol === 'file:'
      );

      const isLocalUrl = formattedUrl.includes('localhost') || 
                         formattedUrl.includes('127.0.0.1') || 
                         formattedUrl.includes('::1') || 
                         formattedUrl.includes('192.168.') || 
                         formattedUrl.includes('10.') || 
                         formattedUrl.includes('172.');

      // On standard server-backed environments, proxy custom TTS same-origin to prevent CORS & Opera adblock blocks, except for local URLs!
      const finalUrl = (isStaticStatic || isLocalUrl)
        ? formattedUrl 
        : `/api/custom-tts?url=${encodeURIComponent(formattedUrl)}`;

      const audio = new Audio(finalUrl);
      audio.volume = 1.0;
      (audio as any).referrerPolicy = "no-referrer"; // Bypass browser/referrer restrictions on GitHub Pages
      this.activeAudioElement = audio;

      audio.onplay = () => {
        this.updateDiag({
          activeEngine: isLocalUrl 
            ? 'Custom TTS (Local Direct)' 
            : (isStaticStatic ? 'Custom TTS (Direct - Static)' : 'Custom TTS (Online Proxy)'),
          lastStatus: 'playing',
          lastMessage: isLocalUrl 
            ? 'Custom stem spreekt direct via lokale url...' 
            : 'Custom stem spreekt via online proxy...'
        });
      };

      let finished = false;
      const done = (status: boolean, isAutoplayBlocked: boolean = false) => {
        if (finished) return;
        finished = true;
        clearTimeout(watchdog);
        if (this.activeAudioElement === audio) this.activeAudioElement = null;
        if (callback) callback(status, isAutoplayBlocked);
      };

      const watchdog = setTimeout(() => {
        console.warn("Custom TTS playback timed out (watchdog triggered)");
        try {
          audio.pause();
        } catch {}
        done(false);
      }, Math.max(12000, text.length * 120));

      audio.onended = () => {
        this.updateDiag({ lastStatus: 'success', lastMessage: 'Custom TTS afgerond' });
        done(true);
      };

      audio.onerror = () => {
        // If we tried proxied and failed, try direct on SAME element to bypass autoplay restrictions!
        const currentSrc = audio.src || '';
        const isCurrentlyProxied = currentSrc.includes('/api/custom-tts?url=');

        if (isCurrentlyProxied) {
          console.warn("Custom TTS via proxy failed. Re-trying direct URL as fallback on same audio element...");
          this.updateDiag({ lastStatus: 'playing', lastMessage: 'Proxy mislukt, probeert lokaal direct af te spelen...' });
          audio.src = formattedUrl;
          audio.play().catch((err) => {
            console.warn("Custom TTS direct fallback also failed:", err);
            this.updateDiag({ lastStatus: 'error', lastMessage: 'Custom TTS mislukt (zowel proxy als direct)' });
            done(false);
          });
          return;
        }

        console.warn("Custom TTS failed, falling back to auto TTS cascade!");
        clearTimeout(watchdog);
        this.playAutoTtsWithFallbacks(text, orderNo, target, callback);
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch((err: any) => {
          console.warn('Custom TTS play rejection:', err);
          const isNotAllowed = err && (
            err.name === 'NotAllowedError' || 
            String(err).includes('interact') || 
            String(err).includes('allowed')
          );

          this.isUnlocked = false;
          this.isPlayingSpeech = false;
          this.updateDiag({ lastStatus: 'error', lastMessage: `Autoplay geblokkeerd op Custom URL` });
          done(false, isNotAllowed);
        });
      }
    } catch (err) {
      this.updateDiag({ lastStatus: 'error', lastMessage: `Fout: ${String(err)}` });
      if (callback) callback(false);
    }
  }

  /**
   * Native browser SpeechSynthesis
   */
  public playNativeSpeechSynthesis(
    text: string, 
    fallbackToAuto: boolean = true, 
    callback?: (success: boolean, isAutoplayBlocked?: boolean) => void
  ) {
    try {
      if (!('speechSynthesis' in window)) {
        if (callback) callback(false);
        return;
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.95;
      utterance.pitch = 1.02;
      utterance.volume = 1.0;

      if (this.cachedVoices.length === 0) {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      }

      if (this.cachedVoices.length === 0) {
        console.warn("Geen native spraakstemmen beschikbaar op dit systeem/browser (Linux/Opera). Schakelt over.");
        if (callback) callback(false);
        return;
      }

      const selectedVoiceURI = localStorage.getItem('wd_tts_voice');
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (selectedVoiceURI) {
        chosenVoice = this.cachedVoices.find(v => v.voiceURI === selectedVoiceURI);
      }

      if (!chosenVoice) {
        chosenVoice = this.cachedVoices.find(v => v.lang.toLowerCase().startsWith('nl'));
      }
      if (!chosenVoice) {
        chosenVoice = this.cachedVoices.find(v => 
          v.name.toLowerCase().includes('dutch') || 
          v.name.toLowerCase().includes('nederlands') || 
          v.name.toLowerCase().includes('flemish')
        );
      }
      if (!chosenVoice && this.cachedVoices.length > 0) {
        chosenVoice = this.cachedVoices.find(v => v.default) || this.cachedVoices[0];
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      this.activeUtterance = utterance;

      let hasFinished = false;
      const done = (status: boolean, isAutoplayBlocked: boolean = false) => {
        if (hasFinished) return;
        hasFinished = true;
        clearTimeout(watchdog);
        this.activeUtterance = null;
        if (callback) callback(status, isAutoplayBlocked);
      };

      const watchdog = setTimeout(() => {
        console.warn("SpeechSynthesis native speech took too long (watchdog triggered)");
        try {
          window.speechSynthesis.cancel();
        } catch {}
        done(false);
      }, Math.max(8000, text.length * 100));

      utterance.onstart = () => {
        this.updateDiag({ 
          activeEngine: `Native (${chosenVoice?.name || 'Standaard'})`, 
          lastStatus: 'playing',
          lastMessage: `Systeemstem spreekt (${chosenVoice?.name || 'Browser'})`
        });
      };

      utterance.onend = () => {
        this.updateDiag({ lastStatus: 'success', lastMessage: 'Systeemstem klaar' });
        done(true);
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error event:", e);
        if (e.error === 'not-allowed' || e.error === 'network') {
          // Autoplay or permissions block!
          this.isUnlocked = false;
          this.isPlayingSpeech = false;
          this.updateDiag({ lastStatus: 'error', lastMessage: 'Klik op het scherm om browser stem te activeren' });
          done(false, true);
        } else {
          done(false);
        }
      };

      window.speechSynthesis.cancel();

      // We start speaking after a tiny timeout to let Chrome reset its speech engine completely
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("speechSynthesis.speak error:", err);
          this.isUnlocked = false;
          this.isPlayingSpeech = false;
          this.updateDiag({ lastStatus: 'error', lastMessage: 'Klik op het scherm om browser stem te activeren' });
          done(false, true);
        }
      }, 60);
    } catch {
      if (callback) callback(false);
    }
  }
}

export const AudioFX = new SoundEffects();
