/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private volume: number = 0.4;
  private stepIndex: number = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Player laser cannon shot
   */
  public playLaser() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Invader explosion
   */
  public playInvaderExplosion() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const bufferSize = ctx.sampleRate * 0.18;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Invader step cadence (4 notes alternating)
   */
  public playInvaderStep() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const freqs = [65, 58, 52, 48];
    const freq = freqs[this.stepIndex % freqs.length];
    this.stepIndex++;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Player ship destruction
   */
  public playPlayerHit() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(60, now + 0.4);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Shield pixel hit
   */
  public playShieldHit() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * UFO mystery ship bonus sound
   */
  public playUfoHit() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    [440, 554, 659, 880].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);

      gain.gain.setValueAtTime(0.3, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.16);
    });
  }

  /**
   * Wave clear fanfare
   */
  public playWaveClear() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.25, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.26);
    });
  }
}

export const soundFx = new SoundEffectsEngine();
