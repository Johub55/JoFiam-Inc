/**
 * Audio FX helper for Werkdonalds POS & WerkPay
 * Includes 2-tone chime bell, cash register ding, click beeps, and Dutch speech synthesis for pickup order TV & kitchen.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;
  public isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wd_sound_enabled');
      if (stored !== null) {
        this.isEnabled = stored === 'true';
      }

      // Pre-warm AudioContext on first user interaction anywhere
      const unlockAudio = () => {
        this.initCtx();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }
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

  public speakOrder(orderNo: number | string) {
    this.bell();
    if (!this.isEnabled) return;
    setTimeout(() => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const text = `Attentie! Bestelling nummer ${orderNo} is gereed om af te halen!`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'nl-NL';
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
          utterance.volume = 1.0;

          // Select Dutch voice if available
          const voices = window.speechSynthesis.getVoices();
          const dutchVoice = voices.find(v => v.lang.toLowerCase().startsWith('nl'));
          if (dutchVoice) {
            utterance.voice = dutchVoice;
          }

          window.speechSynthesis.speak(utterance);
        }
      } catch {
        // SpeechSynthesis not available or permitted
      }
    }, 450);
  }
}

export const AudioFX = new SoundEffects();
