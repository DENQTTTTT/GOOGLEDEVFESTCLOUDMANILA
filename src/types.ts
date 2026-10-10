/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  duration: number; // in seconds
  description: string;
  moodColor: string; // hex for neon accents
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

export interface ScoreEntry {
  id: string;
  initials: string;
  score: number;
  wave: number;
  date: string;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
}

export interface Invader {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 0 | 1 | 2; // 0 = squid (top, 30pts), 1 = crab (mid, 20pts), 2 = octopus (low, 10pts)
  points: number;
  color: string;
  alive: boolean;
  frame: 0 | 1;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  fromPlayer: boolean;
  color: string;
}

export interface BunkerPixel {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  color: string;
}

export interface Bunker {
  x: number;
  y: number;
  pixels: BunkerPixel[];
}

export interface Ufo {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  points: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
}
