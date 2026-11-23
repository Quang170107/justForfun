export type BgmMood = 'day' | 'night' | 'rain';
export type FootstepSurface = 'grass' | 'wood' | 'stone';

interface AudioSettingsData {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
}

const AUDIO_STORAGE_KEY = 'tra_quan_tren_may_audio_v1';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  public muted = false;
  public bgmEnabled = true;
  public sfxEnabled = true;
  public bgmVolume = 0.7;
  public sfxVolume = 0.8;

  private currentMood: BgmMood = 'day';
  private bgmStarted = false;
  private bgmTimeout: number | null = null;
  private stepIdx = 0;

  private noiseBuffer: AudioBuffer | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AudioSettingsData>;
      if (typeof parsed.bgmEnabled === 'boolean') this.bgmEnabled = parsed.bgmEnabled;
      if (typeof parsed.sfxEnabled === 'boolean') this.sfxEnabled = parsed.sfxEnabled;
      if (typeof parsed.bgmVolume === 'number' && Number.isFinite(parsed.bgmVolume)) {
        this.bgmVolume = Math.max(0, Math.min(1, parsed.bgmVolume));
      }
      if (typeof parsed.sfxVolume === 'number' && Number.isFinite(parsed.sfxVolume)) {
        this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
    } catch {
      // Ignore storage read failures
    }
  }

  private saveSettings(): void {
    try {
      const payload: AudioSettingsData = {
        bgmEnabled: this.bgmEnabled,
        sfxEnabled: this.sfxEnabled,
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
      };
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const len = Math.floor(sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = last * 2.8;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private ensureRainAmbience(ctx: AudioContext): void {
    if (this.rainSource && this.rainGain) return;
    const buf = this.ensureNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 920;
    filter.Q.value = 0.55;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.rainSource = src;
    this.rainGain = gain;
  }

  private updateRainAmbienceGain(): void {
    if (!this.ctx || !this.rainGain) return;
    const active = !this.muted && this.bgmEnabled && this.currentMood === 'rain';
    const target = active ? Math.max(0.0001, 0.038 * this.bgmVolume) : 0.0001;
    const now = this.ctx.currentTime;
    this.rainGain.gain.cancelScheduledValues(now);
    this.rainGain.gain.setTargetAtTime(target, now, 0.25);
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    this.saveSettings();
    if (enabled) this.unlockAndStartBgm();
    this.updateRainAmbienceGain();
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    this.saveSettings();
  }

  public setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
    this.updateRainAmbienceGain();
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  public getBgmMood(): BgmMood {
    return this.currentMood;
  }

  public getBgmMoodLabel(): string {
    switch (this.currentMood) {
      case 'night':
        return '🌙 Giai điệu ban đêm';
      case 'rain':
        return '🌧️ Lo-fi ngày mưa';
      default:
        return '☀️ Acoustic ban ngày';
    }
  }

  public setBgmMood(mood: BgmMood): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    this.stepIdx = 0;
    this.updateRainAmbienceGain();
    if (this.bgmStarted) {
      if (this.bgmTimeout !== null) {
        window.clearTimeout(this.bgmTimeout);
        this.bgmTimeout = null;
      }
      this.scheduleNextBgmTick();
    }
  }

  public unlockAndStartBgm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.ensureRainAmbience(ctx);
    this.updateRainAmbienceGain();
    if (this.bgmStarted) return;
    this.bgmStarted = true;
    this.scheduleNextBgmTick();
  }

  private scheduleNextBgmTick(): void {
    if (!this.bgmStarted) return;
    const intervalMs =
      this.currentMood === 'day' ? 560 : this.currentMood === 'night' ? 840 : 760;

    this.bgmTimeout = window.setTimeout(() => {
      this.playCurrentBgmStep();
      this.scheduleNextBgmTick();
    }, intervalMs);
  }

  private playCurrentBgmStep(): void {
    if (
      this.muted ||
      !this.bgmEnabled ||
      this.bgmVolume <= 0.005 ||
      !this.ctx ||
      this.ctx.state !== 'running'
    ) {
      return;
    }

    const v = this.bgmVolume;
    const step = this.stepIdx++;

    if (this.currentMood === 'day') {
      // C-major pentatonic acoustic bounce
      const melody = [261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63, 293.66, 392.0, 440.0, 329.63];
      const bass = [130.81, 146.83, 174.61, 196.0];
      if (step % 4 === 0) {
        this.playTone(bass[Math.floor(step / 4) % bass.length], 0.85, 'sine', 0.022 * v);
      }
      if (step % 3 !== 2) {
        const freq = melody[step % melody.length];
        this.playTone(freq, 0.42, 'triangle', 0.024 * v);
      }
    } else if (this.currentMood === 'night') {
      // Soft A-minor / Dorian lullaby
      const melody = [440.0, 523.25, 659.25, 587.33, 493.88, 440.0, 392.0, 440.0];
      const pad = [220.0, 196.0, 174.61, 196.0];
      if (step % 4 === 0) {
        this.playTone(pad[Math.floor(step / 4) % pad.length], 1.35, 'sine', 0.018 * v);
      }
      if (step % 2 === 0) {
        this.playTone(melody[(step / 2) % melody.length], 0.65, 'sine', 0.017 * v);
      }
    } else {
      // Cozy melancholic Fmaj7 -> Em7 -> Dm7 -> Cmaj7 rain progression
      const arp = [349.23, 440.0, 523.25, 329.63, 392.0, 493.88, 293.66, 349.23, 440.0, 261.63, 329.63, 392.0];
      const bass = [174.61, 164.81, 146.83, 130.81];
      if (step % 3 === 0) {
        this.playTone(bass[Math.floor(step / 3) % bass.length], 1.1, 'triangle', 0.02 * v);
      }
      if (step % 5 !== 4) {
        this.playTone(arp[step % arp.length], 0.6, 'sine', 0.021 * v);
      }
    }
  }

  private playTone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideToFreq?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || vol <= 0.0002) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideToFreq), now + dur);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  private playNoiseBurst(dur: number, filterFreq: number, vol: number): void {
    const ctx = this.ensureContext();
    if (!ctx || vol <= 0.0002) return;
    const buf = this.ensureNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  private playSfxTone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideToFreq?: number
  ): void {
    if (!this.sfxEnabled || this.sfxVolume <= 0.005) return;
    this.playTone(freq, dur, type, vol * this.sfxVolume, slideToFreq);
  }

  public playBlip(pitch = 520): void {
    this.playSfxTone(pitch + (Math.random() * 60 - 30), 0.055, 'square', 0.026);
  }

  public playUiClick(): void {
    this.playSfxTone(580, 0.045, 'triangle', 0.03, 420);
  }

  public playMenuOpen(): void {
    this.playSfxTone(340, 0.075, 'triangle', 0.035, 510);
    setTimeout(() => this.playSfxTone(560, 0.08, 'sine', 0.025), 45);
  }

  public playMenuClose(): void {
    this.playSfxTone(480, 0.075, 'triangle', 0.03, 300);
  }

  public playStep(surface: FootstepSurface = 'grass'): void {
    if (!this.sfxEnabled || this.sfxVolume <= 0.005) return;
    const jitter = Math.random() * 20 - 10;
    if (surface === 'wood') {
      this.playSfxTone(235 + jitter, 0.058, 'triangle', 0.032, 130);
    } else if (surface === 'stone') {
      this.playSfxTone(660 + jitter * 1.5, 0.032, 'triangle', 0.024, 380);
      this.playNoiseBurst(0.03, 2400, 0.015 * this.sfxVolume);
    } else {
      this.playSfxTone(125 + jitter, 0.048, 'sine', 0.018, 82);
      this.playNoiseBurst(0.05, 1650, 0.022 * this.sfxVolume);
    }
  }

  public playHoe(): void {
    this.playSfxTone(185, 0.085, 'sawtooth', 0.042, 105);
    if (this.sfxEnabled && this.sfxVolume > 0.005) {
      this.playNoiseBurst(0.07, 780, 0.035 * this.sfxVolume);
    }
    setTimeout(() => this.playSfxTone(120, 0.07, 'triangle', 0.035), 40);
  }

  public playWater(): void {
    this.playSfxTone(420, 0.08, 'sine', 0.036, 510);
    setTimeout(() => this.playSfxTone(540, 0.1, 'sine', 0.032), 50);
    setTimeout(() => this.playSfxTone(640, 0.1, 'sine', 0.026), 110);
  }

  public playHarvest(): void {
    this.playSfxTone(523.25, 0.08, 'triangle', 0.05);
    setTimeout(() => this.playSfxTone(659.25, 0.11, 'triangle', 0.05), 60);
  }

  public playPourTea(): void {
    this.playSfxTone(392, 0.12, 'sine', 0.045);
    setTimeout(() => this.playSfxTone(493.88, 0.14, 'sine', 0.045), 90);
    setTimeout(() => this.playSfxTone(587.33, 0.18, 'triangle', 0.04), 190);
  }

  public playWindChime(): void {
    const notes = [1046.5, 1174.66, 1318.51, 1567.98];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playSfxTone(n, 0.34, 'sine', 0.024), idx * 95);
    });
  }

  public playCoin(): void {
    this.playSfxTone(784, 0.09, 'square', 0.03);
    setTimeout(() => this.playSfxTone(1046.5, 0.16, 'square', 0.03), 80);
  }

  public playChime(): void {
    this.playSfxTone(880, 0.2, 'sine', 0.032);
    setTimeout(() => this.playSfxTone(1174.66, 0.25, 'sine', 0.026), 120);
  }
}
