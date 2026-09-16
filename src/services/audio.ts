/**
 * Audio FX helper for Werkdonalds POS & WerkPay
 * Includes 2-tone chime bell, cash register ding, click beeps, and Dutch speech synthesis
 * with full Linux / Chromium / Firefox compatibility and custom order announcement wording.
 */

export interface SpeechVoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  isDutch: boolean;
}

class SoundEffects {
  private ctx: AudioContext | null = null;
  public isEnabled: boolean = true;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private resumeTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wd_sound_enabled');
      if (stored !== null) {
        this.isEnabled = stored === 'true';
      }

      // Initialize speech synthesis voices & listen for changes (essential for Linux Chromium)
      this.initVoices();

      // Pre-warm AudioContext on first user interaction anywhere
      const unlockAudio = () => {
        this.initCtx();
        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.resume();
          } catch {}
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
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
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
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
    } catch {
      // Audio playback might be restricted before interaction
    }
  }

  public bell() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Tone 1: High crisp chime
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.start(now);
      osc1.stop(now + 0.45);

      // Tone 2: Warm resolving lower chime
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.2); // C5
      gain2.gain.setValueAtTime(0.4, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.9);
    } catch {
      // Ignore
    }
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
   * Omroepfunctie voor het afhaalscherm en de keuken:
   * Zegt: "Bestelling <nummer> voor <tafel of persoon> is gereed om af te halen!"
   * ALS het een bezorging is (orderType === 'delivery'):
   * NIET omroepen (wordt direct overgeslagen).
   */
  public speakOrder(orderNo: number | string, identifier?: string, orderType?: string) {
    // 1. Bezorgbestellingen worden NOOIT omgeroepen
    if (orderType === 'delivery' || (identifier && identifier.toLowerCase().includes('bezorg'))) {
      return;
    }

    // 2. Speel eerst de attentiebel / chime
    this.bell();
    if (!this.isEnabled) return;

    // Format target name / table according to user prompt
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

    const textToSpeak = `Bestelling ${orderNo} voor ${target} is gereed om af te halen!`;

    // 3. SpeechSynthesis with Linux Chrome / Firefox engine workarounds
    setTimeout(() => {
      this.executeSpeech(textToSpeak);
    }, 400);
  }

  public testSpeech(sampleOrderNo: number | string = 1001, sampleIdentifier: string = 'Tafel 4') {
    this.speakOrder(sampleOrderNo, sampleIdentifier, 'dine_in');
  }

  private executeSpeech(text: string) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      // Linux Chromium fix: Resume synthesis if paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      // Create new Utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Ensure voices are loaded (Linux async reload)
      if (this.cachedVoices.length === 0) {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
      }

      // Check for user-selected voice in settings
      const selectedVoiceURI = localStorage.getItem('wd_tts_voice');
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (selectedVoiceURI) {
        chosenVoice = this.cachedVoices.find(v => v.voiceURI === selectedVoiceURI);
      }

      // Fallback voice search logic:
      if (!chosenVoice) {
        // 1. nl-NL or nl_NL or nl-BE
        chosenVoice = this.cachedVoices.find(v => v.lang.toLowerCase().startsWith('nl'));
      }
      if (!chosenVoice) {
        // 2. Name contains Dutch / Nederlands
        chosenVoice = this.cachedVoices.find(v => 
          v.name.toLowerCase().includes('dutch') || 
          v.name.toLowerCase().includes('nederlands') || 
          v.name.toLowerCase().includes('flemish')
        );
      }
      if (!chosenVoice && this.cachedVoices.length > 0) {
        // 3. Linux Fallback: If no Dutch voice installed on Linux system,
        // use default voice but keep lang="nl-NL" so speech engine renders phonetics
        chosenVoice = this.cachedVoices.find(v => v.default) || this.cachedVoices[0];
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      // IMPORTANT LINUX CHROMIUM FIX:
      // Keep a reference on the class instance to prevent JavaScript garbage collector
      // from cancelling the utterance mid-speech on Linux Chrome!
      this.activeUtterance = utterance;

      // Keep synthesis alive during long sentences on Linux
      if (this.resumeTimer) clearInterval(this.resumeTimer);
      this.resumeTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(this.resumeTimer);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 3500);

      utterance.onend = () => {
        this.activeUtterance = null;
        if (this.resumeTimer) clearInterval(this.resumeTimer);
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis note:', e);
        this.activeUtterance = null;
        if (this.resumeTimer) clearInterval(this.resumeTimer);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS execution fallback:', err);
    }
  }
}

export const AudioFX = new SoundEffects();

