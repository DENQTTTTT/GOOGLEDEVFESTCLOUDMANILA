/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trophy, ArrowRight, Play } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  wave: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
  isNewHighScore: boolean;
  onSaveScore: (initials: string) => void;
  onDismiss: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  wave,
  accuracy,
  isNewHighScore,
  onSaveScore,
  onDismiss,
}) => {
  const [initials, setInitials] = useState('YOU');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = (initials.trim().slice(0, 3) || 'ACE').toUpperCase();
    onSaveScore(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border-2 border-pink-500 bg-[#15072b] p-6 sm:p-8 shadow-[0_0_50px_rgba(255,42,141,0.4)] text-center relative overflow-hidden">
        {/* Subtle scanline */}
        <div className="absolute inset-0 crt-overlay opacity-30 pointer-events-none" />

        {isNewHighScore ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-arcade text-xs mb-3 animate-bounce">
            <Trophy className="w-4 h-4 text-yellow-300" />
            NEW HIGH SCORE!
          </div>
        ) : (
          <div className="inline-block px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400 text-pink-300 font-arcade text-xs mb-3">
            MISSION REPORT
          </div>
        )}

        <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-wide mb-1 neon-text-pink">
          GAME OVER
        </h3>
        <p className="text-xs text-pink-300/80 font-tech mb-6">
          The neon armada has retreated. Record your name in the arcade history.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-black/50 p-3 rounded-xl border border-pink-500/20">
          <div>
            <div className="text-[10px] font-arcade text-pink-400 mb-1">SCORE</div>
            <div className="text-lg font-arcade text-yellow-300 tabular-nums">
              {score.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-arcade text-cyan-400 mb-1">WAVE</div>
            <div className="text-lg font-arcade text-cyan-300 tabular-nums">
              {wave}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-arcade text-purple-400 mb-1">ACCURACY</div>
            <div className="text-lg font-arcade text-purple-300 tabular-nums">
              {accuracy}%
            </div>
          </div>
        </div>

        {/* Initials Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-arcade text-cyan-300 mb-2">
              ENTER YOUR INITIALS
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={3}
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                autoFocus
                className="w-36 px-4 py-2.5 rounded-lg bg-black/80 border-2 border-cyan-400 text-cyan-300 font-arcade text-center text-2xl tracking-[0.3em] uppercase focus:outline-none focus:shadow-[0_0_15px_#00f0ff]"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2.5 rounded-lg border border-neutral-700 text-neutral-400 font-tech text-xs hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-pink-600 to-cyan-500 border border-pink-300 text-white font-arcade text-xs font-bold hover:brightness-110 shadow-lg shadow-pink-600/30 transition-transform active:scale-95"
            >
              <span>SUBMIT SCORE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
