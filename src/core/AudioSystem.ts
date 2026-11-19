export class AudioSystem {
  private ctx: AudioContext | null = null;
  public muted = false;
  public bgmEnabled = true;
  public sfxEnabled = true;
  private bgmTimer: number | null = null;
  private stepIdx = 0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlockAndStartBgm(): void {
    const ctx = this.ensureContext();
    if (!ctx || this.bgmTimer !== null) return;
    // Nhạc nền ngũ cung ấm áp dịu nhẹ kiểu Stardew lo-fi
    const notes = [261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63];
    this.bgmTimer = window.setInterval(() => {
      if (this.muted || !this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const freq = notes[this.stepIdx % notes.length];
      this.stepIdx++;
      if (this.stepIdx % 3 === 0) return; // Khoảng nghỉ chill
      this.playTone(freq, 0.45, 'triangle', 0.025);
    }, 680);
  }

  private playTone(freq: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  private playSfxTone(freq: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.sfxEnabled) return;
    this.playTone(freq, dur, type, vol);
  }

  public playBlip(pitch = 520): void {
    this.playSfxTone(pitch + (Math.random() * 60 - 30), 0.055, 'square', 0.025);
  }

  public playStep(): void {
    this.playSfxTone(130 + Math.random() * 25, 0.06, 'triangle', 0.02);
  }

  public playHoe(): void {
    this.playSfxTone(180, 0.08, 'sawtooth', 0.04);
    setTimeout(() => this.playSfxTone(120, 0.07, 'triangle', 0.035), 40);
  }

  public playWater(): void {
    this.playSfxTone(420, 0.08, 'sine', 0.035);
    setTimeout(() => this.playSfxTone(540, 0.1, 'sine', 0.03), 50);
    setTimeout(() => this.playSfxTone(620, 0.1, 'sine', 0.025), 110);
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

  public playCoin(): void {
    this.playSfxTone(784, 0.09, 'square', 0.03);
    setTimeout(() => this.playSfxTone(1046.5, 0.16, 'square', 0.03), 80);
  }

  public playChime(): void {
    this.playSfxTone(880, 0.2, 'sine', 0.03);
    setTimeout(() => this.playSfxTone(1174.66, 0.25, 'sine', 0.025), 120);
  }
}
