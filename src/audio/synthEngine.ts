/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from '../types';

export const DUMMY_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: "Sunset Boulevard '86",
    artist: "Sunset Boulevard",
    genre: "Dreamwave / Outrun",
    bpm: 116,
    duration: 204, // 3:24
    description: "Sun-drenched analog synthesizers, rolling basslines, and nostalgic palm tree breezes.",
    moodColor: "#ff2a8d",
  },
  {
    id: 'track-2',
    title: "Cyber Highway 2084",
    artist: "Miami Drift",
    genre: "Darksynth / Electro",
    bpm: 128,
    duration: 225, // 3:45
    description: "Fast-paced neon highway pursuit with aggressive arpeggios and punchy retro drums.",
    moodColor: "#00f0ff",
  },
  {
    id: 'track-3',
    title: "Midnight Mirage",
    artist: "Crystal Hologram",
    genre: "Vaporwave / Chill",
    bpm: 104,
    duration: 192, // 3:12
    description: "Lush detuned chorus pads, cassette tape warmth, and shimmering lo-fi chimes.",
    moodColor: "#b026ff",
  },
];

// Note frequencies in Hz
const NOTE_FREQS: Record<string, number> = {
  // Octave 1
  C1: 32.7, D1: 36.71, E1: 41.2, F1: 43.65, G1: 49.0, A1: 55.0, B1: 61.74,
  // Octave 2
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54, B2: 123.47,
  // Octave 3
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, B3: 246.94,
  // Octave 4
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, B4: 493.88,
  // Octave 5
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, Bb5: 932.33,
};

type StepCallback = (current: number, total: number) => void;
type TrackCallback = (track: Track) => void;
type PlayStateCallback = (playing: boolean) => void;

export class SynthwaveAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;

  private currentTrackIndex = 0;
  private isPlaying = false;
  private volume = 0.7;
  private isMuted = false;

  private playbackStartTime = 0;
  private pausedAtTime = 0;
  private currentVirtualTime = 0;

  private schedulerTimer: number | null = null;
  private progressTimer: number | null = null;

  // Track sequencer position
  private nextStepTime = 0;
  private currentStep = 0;
  private scheduleAheadTime = 0.15; // 150ms lookahead

  // Callbacks
  private onTimeListeners: Set<StepCallback> = new Set();
  private onTrackListeners: Set<TrackCallback> = new Set();
  private onPlayStateListeners: Set<PlayStateCallback> = new Set();

  constructor() {
    // Lazy initialized on user gesture
  }

  public init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getTrack(): Track {
    return DUMMY_TRACKS[this.currentTrackIndex];
  }

  public getTracks(): Track[] {
    return DUMMY_TRACKS;
  }

  public getTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentTime(): number {
    return this.currentVirtualTime;
  }

  public getDuration(): number {
    return this.getTrack().duration;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public play() {
    this.init();
    if (this.isPlaying) return;

    this.isPlaying = true;
    if (this.ctx) {
      this.playbackStartTime = this.ctx.currentTime - this.pausedAtTime;
      this.nextStepTime = this.ctx.currentTime;
    }

    this.startScheduler();
    this.startProgressTracker();
    this.notifyPlayState(true);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pausedAtTime = this.currentVirtualTime;

    this.stopScheduler();
    this.stopProgressTracker();
    this.notifyPlayState(false);
  }

  public togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextTrack() {
    this.selectTrack((this.currentTrackIndex + 1) % DUMMY_TRACKS.length);
  }

  public prevTrack() {
    const prev = (this.currentTrackIndex - 1 + DUMMY_TRACKS.length) % DUMMY_TRACKS.length;
    this.selectTrack(prev);
  }

  public selectTrack(index: number) {
    if (index < 0 || index >= DUMMY_TRACKS.length) return;
    const wasPlaying = this.isPlaying;
    this.pause();
    this.currentTrackIndex = index;
    this.currentVirtualTime = 0;
    this.pausedAtTime = 0;
    this.currentStep = 0;

    this.notifyTrackChange(this.getTrack());
    this.notifyTimeUpdate(0, this.getTrack().duration);

    if (wasPlaying) {
      this.play();
    }
  }

  public seek(targetSeconds: number) {
    const track = this.getTrack();
    const clamped = Math.max(0, Math.min(track.duration, targetSeconds));
    this.currentVirtualTime = clamped;
    this.pausedAtTime = clamped;

    if (this.ctx && this.isPlaying) {
      this.playbackStartTime = this.ctx.currentTime - clamped;
      // sync sequencer step
      const stepDuration = 60 / track.bpm / 4; // 16th note
      this.currentStep = Math.floor(clamped / stepDuration) % 64;
      this.nextStepTime = this.ctx.currentTime;
    }

    this.notifyTimeUpdate(this.currentVirtualTime, track.duration);
  }

  // Event subscription
  public onTimeUpdate(cb: StepCallback): () => void {
    this.onTimeListeners.add(cb);
    return () => this.onTimeListeners.delete(cb);
  }

  public onTrackChange(cb: TrackCallback): () => void {
    this.onTrackListeners.add(cb);
    return () => this.onTrackListeners.delete(cb);
  }

  public onPlayStateChange(cb: PlayStateCallback): () => void {
    this.onPlayStateListeners.add(cb);
    return () => this.onPlayStateListeners.delete(cb);
  }

  private notifyTimeUpdate(curr: number, total: number) {
    this.onTimeListeners.forEach(cb => cb(curr, total));
  }

  private notifyTrackChange(track: Track) {
    this.onTrackListeners.forEach(cb => cb(track));
  }

  private notifyPlayState(playing: boolean) {
    this.onPlayStateListeners.forEach(cb => cb(playing));
  }

  // Web Audio lookahead scheduling
  private startScheduler() {
    this.stopScheduler();
    this.schedulerTimer = window.setInterval(() => {
      this.scheduleLoop();
    }, 25);
  }

  private stopScheduler() {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private startProgressTracker() {
    this.stopProgressTracker();
    this.progressTimer = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;
      const track = this.getTrack();
      const elapsed = this.ctx.currentTime - this.playbackStartTime;
      this.currentVirtualTime = elapsed % track.duration;

      this.notifyTimeUpdate(this.currentVirtualTime, track.duration);

      // Auto loop or next track when duration finishes
      if (elapsed >= track.duration) {
        this.nextTrack();
      }
    }, 100);
  }

  private stopProgressTracker() {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private scheduleLoop() {
    if (!this.ctx || !this.isPlaying) return;
    const track = this.getTrack();
    const stepDuration = 60 / track.bpm / 4; // 16th note length in seconds

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime, track);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar loop of 16 steps
    }
  }

  private scheduleStep(step: number, time: number, track: Track) {
    if (!this.ctx || !this.masterGain) return;

    // Track 1: Sunset Boulevard '86 (A Minor: Am - F - C - G)
    // Track 2: Cyber Highway 2084 (D Minor: Dm - Bb - F - C)
    // Track 3: Midnight Mirage (G Minor: Gm - Eb - Bb - F)
    const trackIdx = this.currentTrackIndex;

    // 1. DRUMS (Kick, Snare, HiHat)
    const barStep = step % 16;
    // Kick on 0, 8 (or 0, 6, 8, 14 for energetic Cyber Highway)
    if (trackIdx === 1) {
      if (barStep === 0 || barStep === 6 || barStep === 8 || barStep === 14) {
        this.triggerKick(time, 1.0);
      }
    } else {
      if (barStep === 0 || barStep === 8) {
        this.triggerKick(time, 0.9);
      }
    }

    // Snare on 4, 12 (standard 2 & 4 backbeat)
    if (barStep === 4 || barStep === 12) {
      this.triggerSnare(time, trackIdx === 1 ? 0.8 : 0.6);
    }

    // Hi-hat on every odd 16th, open hat on 2, 6, 10, 14
    if (step % 2 === 0) {
      this.triggerHiHat(time, step % 4 === 2 ? 0.25 : 0.15);
    }

    // 2. BASSLINE
    this.scheduleBassline(trackIdx, step, time);

    // 3. SYNTH PADS / ARPEGGIOS
    this.scheduleSynthLayers(trackIdx, step, time);

    // 4. LEAD MELODY
    this.scheduleLead(trackIdx, step, time);
  }

  private scheduleBassline(trackIdx: number, step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    const bar = Math.floor((step % 64) / 16);
    const subStep = step % 4; // 16th note rhythm

    let root = 'A1';
    let high = 'A2';

    if (trackIdx === 0) {
      // Am - F - C - G
      const roots = ['A1', 'F1', 'C2', 'G1'];
      const highs = ['A2', 'F2', 'C3', 'G2'];
      root = roots[bar];
      high = highs[bar];
    } else if (trackIdx === 1) {
      // Dm - Bb - F - C
      const roots = ['D1', 'Bb1', 'F1', 'C1'];
      const highs = ['D2', 'Bb2', 'F2', 'C2'];
      root = roots[bar];
      high = highs[bar];
    } else {
      // Gm - Eb - Bb - F
      const roots = ['G1', 'Eb2', 'Bb1', 'F1'];
      const highs = ['G2', 'Eb3', 'Bb2', 'F2'];
      root = roots[bar];
      high = highs[bar];
    }

    // Rolling 80s bassline rhythm: Root on 0, High on 2, Root on 1, 3
    const note = (subStep === 2) ? high : root;
    const freq = NOTE_FREQS[note] || 55;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.12);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private scheduleSynthLayers(trackIdx: number, step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    const bar = Math.floor((step % 64) / 16);

    // Arp on every other 16th step (8th note cadence)
    if (step % 2 === 0) {
      let chordNotes = ['A3', 'C4', 'E4'];
      if (trackIdx === 0) {
        const chords = [
          ['A3', 'C4', 'E4'], // Am
          ['F3', 'A3', 'C4'], // F
          ['C3', 'E3', 'G3'], // C
          ['G3', 'B3', 'D4'], // G
        ];
        chordNotes = chords[bar];
      } else if (trackIdx === 1) {
        const chords = [
          ['D3', 'F3', 'A3'],   // Dm
          ['Bb3', 'D4', 'F4'],  // Bb
          ['F3', 'A3', 'C4'],   // F
          ['C3', 'E3', 'G3'],   // C
        ];
        chordNotes = chords[bar];
      } else {
        const chords = [
          ['G3', 'Bb3', 'D4'],  // Gm
          ['Eb3', 'G3', 'Bb3'], // Eb
          ['Bb3', 'D4', 'F4'],  // Bb
          ['F3', 'A3', 'C4'],   // F
        ];
        chordNotes = chords[bar];
      }

      const noteIdx = (Math.floor(step / 2)) % chordNotes.length;
      const noteName = chordNotes[noteIdx];
      const freq = NOTE_FREQS[noteName] || 220;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = trackIdx === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(trackIdx === 1 ? 1800 : 1200, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.24);
    }
  }

  private scheduleLead(trackIdx: number, step: number, time: number) {
    if (!this.ctx || !this.masterGain) return;
    const bar = Math.floor((step % 64) / 16);
    const sub = step % 16;

    // Melodic notes trigger on strategic steps
    const leadMap: Record<number, string> = {
      0: 'E4', 4: 'G4', 8: 'A4', 12: 'C5',
    };

    if (trackIdx === 0) {
      const melodyByBar: Record<number, Record<number, string>> = {
        0: { 0: 'E4', 4: 'A4', 8: 'C5', 12: 'B4' },
        1: { 0: 'A4', 4: 'F4', 8: 'A4', 12: 'C5' },
        2: { 0: 'G4', 4: 'E4', 8: 'G4', 12: 'E4' },
        3: { 0: 'D4', 4: 'G4', 8: 'B4', 12: 'A4' },
      };
      const note = melodyByBar[bar]?.[sub];
      if (note) this.triggerLeadNote(time, NOTE_FREQS[note] || 440, 0.45);
    } else if (trackIdx === 1) {
      // Faster cyber melody
      const cyberMelody: Record<number, string> = {
        0: 'D4', 3: 'F4', 6: 'A4', 8: 'D5', 11: 'C5', 14: 'A4'
      };
      const note = cyberMelody[sub];
      if (note) this.triggerLeadNote(time, NOTE_FREQS[note] || 440, 0.35);
    } else {
      // Chill vaporwave lead on slower beats
      if (sub === 0 || sub === 8) {
        const vaporNotes = ['D4', 'Eb4', 'F4', 'G4'];
        const note = vaporNotes[bar];
        this.triggerLeadNote(time, NOTE_FREQS[note] || 330, 0.8);
      }
    }
  }

  private triggerLeadNote(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.006, time); // detuned chorus effect

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.frequency.exponentialRampToValueAtTime(900, time + duration);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration + 0.05);
    osc2.stop(time + duration + 0.05);
  }

  private triggerKick(time: number, power: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.09);

    gain.gain.setValueAtTime(0.6 * power, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  private triggerSnare(time: number, power: number) {
    if (!this.ctx || !this.masterGain) return;
    // Tone body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.08);

    oscGain.gain.setValueAtTime(0.3 * power, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(1.5, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35 * power, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
  }

  private triggerHiHat(time: number, gainLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }
}

export const synthEngine = new SynthwaveAudioEngine();
