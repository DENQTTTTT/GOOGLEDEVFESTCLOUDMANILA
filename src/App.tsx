/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Gamepad2, Volume2, Sparkles, Monitor, Tv, Info } from 'lucide-react';
import { SpaceInvadersGame } from './components/SpaceInvadersGame';
import { SynthwavePlayer } from './components/SynthwavePlayer';
import { ScoreBoard, INITIAL_HIGH_SCORES } from './components/ScoreBoard';
import { GameOverModal } from './components/GameOverModal';
import { VaporwaveBackdrop } from './components/VaporwaveBackdrop';
import { ScoreEntry } from './types';
import { synthEngine } from './audio/synthEngine';

const LOCAL_STORAGE_KEY = 'space_invaders_synthwave_scores';

export default function App() {
  // Scoreboard state with persistent localStorage
  const [scores, setScores] = useState<ScoreEntry[]>(() => {
    if (typeof window === 'undefined') return INITIAL_HIGH_SCORES;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return INITIAL_HIGH_SCORES;
  });

  const [latestScoreId, setLatestScoreId] = useState<string | null>(null);
  const [scanlinesEnabled, setScanlinesEnabled] = useState<boolean>(true);

  // Game Over Modal state
  const [gameOverData, setGameOverData] = useState<{
    open: boolean;
    score: number;
    wave: number;
    shotsFired: number;
    shotsHit: number;
    accuracy: number;
    isHighScore: boolean;
  }>({
    open: false,
    score: 0,
    wave: 1,
    shotsFired: 0,
    shotsHit: 0,
    accuracy: 0,
    isHighScore: false,
  });

  // Calculate current top high score
  const topHighScore = scores.length > 0
    ? Math.max(...scores.map((s) => s.score))
    : 9990;

  // Save scores to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // Ignore quota errors
    }
  }, [scores]);

  const handleGameOver = (
    finalScore: number,
    waveReached: number,
    stats: { shotsFired: number; shotsHit: number; accuracy: number }
  ) => {
    const isNewHighScore = finalScore > topHighScore && finalScore > 0;
    setGameOverData({
      open: true,
      score: finalScore,
      wave: waveReached,
      shotsFired: stats.shotsFired,
      shotsHit: stats.shotsHit,
      accuracy: stats.accuracy,
      isHighScore: isNewHighScore,
    });
  };

  const handleSaveScore = (initials: string) => {
    const newId = `score-${Date.now()}`;
    const newEntry: ScoreEntry = {
      id: newId,
      initials,
      score: gameOverData.score,
      wave: gameOverData.wave,
      date: new Date().toISOString().split('T')[0],
      shotsFired: gameOverData.shotsFired,
      shotsHit: gameOverData.shotsHit,
      accuracy: gameOverData.accuracy,
    };

    setScores((prev) => {
      const updated = [...prev, newEntry];
      return updated.sort((a, b) => b.score - a.score).slice(0, 20); // Top 20
    });

    setLatestScoreId(newId);
    setGameOverData((prev) => ({ ...prev, open: false }));
  };

  const handleAddManualScore = (entry: Omit<ScoreEntry, 'id'>) => {
    const newId = `score-${Date.now()}`;
    const newEntry: ScoreEntry = {
      ...entry,
      id: newId,
    };

    setScores((prev) => {
      const updated = [...prev, newEntry];
      return updated.sort((a, b) => b.score - a.score).slice(0, 20);
    });
    setLatestScoreId(newId);
  };

  const handleResetDefaults = () => {
    setScores(INITIAL_HIGH_SCORES);
    setLatestScoreId(null);
  };

  const handleClearScores = () => {
    setScores([]);
    setLatestScoreId(null);
  };

  return (
    <div className="relative min-h-screen bg-[#090214] text-pink-100 flex flex-col font-tech">
      {/* Background Graphic & Retro Lighting */}
      <VaporwaveBackdrop />

      {/* TOP BAR CONTRACT: exactly 3 zones separated by gap-8 */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-4 border-b border-pink-500/20 bg-[#0d031d]/90 backdrop-blur-md">
        {/* Zone 1: Brand Wordmark (Single text element in display face) */}
        <a
          href="#arcade"
          className="text-lg sm:text-xl font-display font-black tracking-wider text-white whitespace-nowrap shrink-0 neon-text-pink flex items-center gap-2"
        >
          <Gamepad2 className="w-5 h-5 text-pink-400" />
          <span>NEON INVADERS '84</span>
        </a>

        {/* Zone 2: 4-5 single-line nav links with subtle hover underlines */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-tech font-bold tracking-wider text-pink-300/80">
          <a
            href="#arcade"
            className="hover:text-white hover:underline underline-offset-4 decoration-pink-500 transition-colors whitespace-nowrap shrink-0"
          >
            Arcade Game
          </a>
          <a
            href="#soundtrack"
            className="hover:text-white hover:underline underline-offset-4 decoration-pink-500 transition-colors whitespace-nowrap shrink-0"
          >
            Synth Soundtrack
          </a>
          <a
            href="#scoreboard"
            className="hover:text-white hover:underline underline-offset-4 decoration-pink-500 transition-colors whitespace-nowrap shrink-0"
          >
            Hall of Fame
          </a>
          <a
            href="#instructions"
            className="hover:text-white hover:underline underline-offset-4 decoration-pink-500 transition-colors whitespace-nowrap shrink-0"
          >
            Controls & Guide
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action (CRT Scanlines Toggle) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setScanlinesEnabled((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-pink-500/40 bg-pink-950/40 text-pink-300 hover:text-white hover:border-pink-400 transition-all text-xs font-tech font-bold whitespace-nowrap shrink-0"
            title="Toggle retro CRT scanlines overlay"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{scanlinesEnabled ? 'Scanlines: ON' : 'Scanlines: OFF'}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
        {/* Subtle Subtitle metadata (Zero-pill discipline) */}
        <div className="flex flex-wrap items-center justify-between text-xs text-pink-400/80 gap-3 border-b border-pink-500/10 pb-3">
          <div className="flex items-center gap-2">
            <span>Synthwave Arcade Interceptor</span>
            <span aria-hidden="true">·</span>
            <span>Web Audio 80s Synthesizer</span>
            <span aria-hidden="true">·</span>
            <span>CRT Scanline Vector Engine</span>
          </div>
          <div className="text-cyan-400 font-mono text-[11px]">
            ALL-TIME HIGH SCORE: {topHighScore.toLocaleString()} PTS
          </div>
        </div>

        {/* GRID LAYOUT: Center Game Arcade Window + Integrated Synthwave Player Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* CENTER WINDOW: Space Invaders Game (Main Arcade Cabinet) */}
          <div id="arcade" className="lg:col-span-8 flex flex-col">
            <SpaceInvadersGame
              highScore={topHighScore}
              onGameOver={handleGameOver}
              scanlinesEnabled={scanlinesEnabled}
            />
          </div>

          {/* SIDEBAR: Synthwave Music Deck with 3 Dummy Tracks & Controls */}
          <div id="soundtrack" className="lg:col-span-4 flex flex-col gap-6">
            <SynthwavePlayer />

            {/* Quick Arcade Instructions Box */}
            <div id="instructions" className="rounded-xl border border-pink-500/30 bg-[#120824]/80 p-4 sm:p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-pink-300 font-arcade text-xs mb-3">
                <Info className="w-4 h-4 text-cyan-400" />
                HOW TO PLAY
              </div>
              <ul className="space-y-2 text-xs text-pink-200/80 font-tech">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold font-mono">◄/► or A/D</span>
                  <span>Move your interceptor cannon left and right</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-400 font-bold font-mono">SPACEBAR</span>
                  <span>Fire high-energy neon lasers (or tap FIRE button)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-300 font-bold font-mono">UFO SAUCER</span>
                  <span>Intercept mystery flying saucers for up to 300 bonus pts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-300 font-bold font-mono">BUNKERS</span>
                  <span>Take shelter behind destructible neon energy shields</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* PERSISTENT SCORE BOARD DISPLAYED BENEATH THE GAME WINDOW */}
        <div id="scoreboard" className="w-full mt-2">
          <ScoreBoard
            scores={scores}
            onAddScore={handleAddManualScore}
            onResetDefaults={handleResetDefaults}
            onClearScores={handleClearScores}
            latestScoreId={latestScoreId}
          />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-pink-500/20 bg-[#0d031d]/90 py-6 px-6 text-center text-xs text-pink-400/60 font-tech">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-pink-300 font-arcade text-[10px]">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 inline" />
            NEON INVADERS '84 · RETROWAVE ARCADE SYSTEM
          </div>
          <div className="text-pink-400/50">
            Powered by Web Audio Synth Engine & HTML5 Canvas · 1980s Vaporwave Aesthetics
          </div>
        </div>
      </footer>

      {/* GAME OVER MODAL FOR INITIALS & HIGH SCORE RECORDING */}
      {gameOverData.open && (
        <GameOverModal
          score={gameOverData.score}
          wave={gameOverData.wave}
          shotsFired={gameOverData.shotsFired}
          shotsHit={gameOverData.shotsHit}
          accuracy={gameOverData.accuracy}
          isNewHighScore={gameOverData.isHighScore}
          onSaveScore={handleSaveScore}
          onDismiss={() => setGameOverData((prev) => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
}
