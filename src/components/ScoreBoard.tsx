/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, RotateCcw, Plus, Trash2, Award } from 'lucide-react';
import { ScoreEntry } from '../types';

interface ScoreBoardProps {
  scores: ScoreEntry[];
  onAddScore: (entry: Omit<ScoreEntry, 'id'>) => void;
  onResetDefaults: () => void;
  onClearScores: () => void;
  latestScoreId?: string | null;
}

export const INITIAL_HIGH_SCORES: ScoreEntry[] = [
  { id: 'seed-1', initials: 'NEO', score: 9990, wave: 4, date: '2026-10-08', shotsFired: 320, shotsHit: 285, accuracy: 89 },
  { id: 'seed-2', initials: 'VPR', score: 8450, wave: 3, date: '2026-10-07', shotsFired: 280, shotsHit: 238, accuracy: 85 },
  { id: 'seed-3', initials: 'SYN', score: 7120, wave: 3, date: '2026-10-06', shotsFired: 250, shotsHit: 202, accuracy: 81 },
  { id: 'seed-4', initials: 'OUT', score: 5600, wave: 2, date: '2026-10-05', shotsFired: 190, shotsHit: 148, accuracy: 78 },
  { id: 'seed-5', initials: 'CYB', score: 4200, wave: 2, date: '2026-10-04', shotsFired: 160, shotsHit: 118, accuracy: 74 },
  { id: 'seed-6', initials: 'RAD', score: 3100, wave: 1, date: '2026-10-03', shotsFired: 130, shotsHit: 92, accuracy: 71 },
  { id: 'seed-7', initials: 'SUN', score: 2400, wave: 1, date: '2026-10-02', shotsFired: 110, shotsHit: 73, accuracy: 66 },
  { id: 'seed-8', initials: 'GLW', score: 1800, wave: 1, date: '2026-10-01', shotsFired: 95, shotsHit: 59, accuracy: 62 },
];

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  scores,
  onAddScore,
  onResetDefaults,
  onClearScores,
  latestScoreId,
}) => {
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [initials, setInitials] = useState('ACE');
  const [scoreVal, setScoreVal] = useState(2500);
  const [waveVal, setWaveVal] = useState(2);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInitials = (initials.trim().slice(0, 3) || 'AAA').toUpperCase();
    onAddScore({
      initials: cleanInitials,
      score: Math.max(0, scoreVal),
      wave: Math.max(1, waveVal),
      date: new Date().toISOString().split('T')[0],
      shotsFired: 120,
      shotsHit: 90,
      accuracy: 75,
    });
    setManualModalOpen(false);
  };

  return (
    <section aria-label="Persistent Arcade Scoreboard" className="w-full rounded-xl border border-pink-500/30 bg-[#120824]/90 backdrop-blur-md p-4 sm:p-6 shadow-2xl neon-border-pink">
      {/* Scoreboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-pink-500/20 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-950/60 border border-pink-500/40 text-yellow-300">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-arcade tracking-wider text-pink-300 flex items-center gap-2">
              PERSISTENT ARCADE HALL OF FAME
            </h2>
            <p className="text-xs text-pink-300/70 font-tech mt-0.5">
              Saved locally · Top scores across all play sessions
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setManualModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/40 text-xs font-tech font-bold transition-all"
            title="Log custom score entry"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-500/30 bg-pink-950/30 text-pink-300 hover:text-white hover:bg-pink-900/40 text-xs font-tech transition-all"
            title="Restore arcade default leaderboard"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
          {scores.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all scoreboard entries?')) {
                  onClearScores();
                }
              }}
              className="p-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-red-400 transition-colors"
              title="Clear all scores"
              aria-label="Clear all scoreboard entries"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Table */}
      {scores.length === 0 ? (
        <div className="py-12 text-center text-pink-400/60 font-arcade text-xs">
          NO SCORES LOGGED YET. PLAY A GAME TO CLAIM #1!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-pink-500/20 text-[10px] font-arcade text-pink-400/80">
                <th className="py-2.5 px-3">RANK</th>
                <th className="py-2.5 px-3">INITIALS</th>
                <th className="py-2.5 px-3 text-right">SCORE</th>
                <th className="py-2.5 px-3 text-center">WAVE</th>
                <th className="py-2.5 px-3 text-right hidden sm:table-cell">ACCURACY</th>
                <th className="py-2.5 px-3 text-right hidden md:table-cell">DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-500/10">
              {scores.map((entry, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;
                const isCurrent = entry.id === latestScoreId;

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors font-mono ${
                      isCurrent
                        ? 'bg-pink-950/60 font-bold border-l-2 border-pink-400'
                        : idx % 2 === 0
                        ? 'bg-black/20 hover:bg-pink-950/20'
                        : 'bg-black/40 hover:bg-pink-950/20'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isTop1 ? (
                          <span className="text-yellow-300 font-arcade text-xs flex items-center gap-1">
                            <Medal className="w-4 h-4 text-yellow-300 inline" /> #1
                          </span>
                        ) : isTop2 ? (
                          <span className="text-slate-200 font-arcade text-xs flex items-center gap-1">
                            <Medal className="w-4 h-4 text-slate-300 inline" /> #2
                          </span>
                        ) : isTop3 ? (
                          <span className="text-amber-500 font-arcade text-xs flex items-center gap-1">
                            <Medal className="w-4 h-4 text-amber-500 inline" /> #3
                          </span>
                        ) : (
                          <span className="text-pink-400/70 font-arcade text-xs">
                            #{idx + 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Initials */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-arcade text-xs tracking-widest text-cyan-300">
                        {entry.initials}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-arcade text-xs sm:text-sm tabular-nums tracking-wider ${
                          isTop1
                            ? 'text-yellow-300 font-bold neon-text-yellow'
                            : 'text-pink-300'
                        }`}
                      >
                        {entry.score.toLocaleString()}
                      </span>
                    </td>

                    {/* Wave */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="text-xs font-tech text-purple-300 font-bold">
                        WAVE {entry.wave}
                      </span>
                    </td>

                    {/* Accuracy */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap hidden sm:table-cell">
                      <span className="text-xs text-cyan-300/90 font-mono tabular-nums">
                        {entry.accuracy}%
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-xs text-pink-300/50 hidden md:table-cell">
                      {entry.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Entry Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-pink-500/50 bg-[#16062d] p-6 shadow-2xl neon-border-pink">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-300" />
              <h3 className="font-arcade text-xs text-pink-300">
                LOG SCORE ENTRY
              </h3>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-tech text-pink-300/80 mb-1">
                  PLAYER INITIALS (3 LETTERS)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded bg-black/60 border border-pink-500/40 text-cyan-300 font-arcade text-center text-lg tracking-widest uppercase focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-tech text-pink-300/80 mb-1">
                  SCORE
                </label>
                <input
                  type="number"
                  min={0}
                  max={999999}
                  value={scoreVal}
                  onChange={(e) => setScoreVal(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded bg-black/60 border border-pink-500/40 text-yellow-300 font-arcade text-center text-sm tabular-nums focus:outline-none focus:border-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-tech text-pink-300/80 mb-1">
                  WAVE REACHED
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={waveVal}
                  onChange={(e) => setWaveVal(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded bg-black/60 border border-pink-500/40 text-pink-200 font-arcade text-center text-sm focus:outline-none focus:border-pink-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 font-tech text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 border border-pink-400 text-white font-tech font-bold text-xs hover:brightness-110"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
