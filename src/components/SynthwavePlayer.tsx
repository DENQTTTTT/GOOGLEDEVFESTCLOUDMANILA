/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Radio,
  Disc3,
  Sparkles,
  Music4
} from 'lucide-react';
import { synthEngine, DUMMY_TRACKS } from '../audio/synthEngine';
import { Track } from '../types';
import { Visualizer } from './Visualizer';

interface SynthwavePlayerProps {
  className?: string;
}

export const SynthwavePlayer: React.FC<SynthwavePlayerProps> = ({ className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track>(synthEngine.getTrack());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(synthEngine.getDuration());
  const [volume, setVolume] = useState(synthEngine.getVolume());
  const [isMuted, setIsMuted] = useState(synthEngine.getIsMuted());

  useEffect(() => {
    // Listeners from synth engine
    const unTime = synthEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    });

    const unTrack = synthEngine.onTrackChange((t) => {
      setCurrentTrack(t);
    });

    const unPlay = synthEngine.onPlayStateChange((playing) => {
      setIsPlaying(playing);
    });

    return () => {
      unTime();
      unTrack();
      unPlay();
    };
  }, []);

  const handlePlayPause = () => {
    synthEngine.togglePlayPause();
  };

  const handleNext = () => {
    synthEngine.nextTrack();
  };

  const handlePrev = () => {
    synthEngine.prevTrack();
  };

  const handleSelectTrack = (idx: number) => {
    synthEngine.selectTrack(idx);
    if (!isPlaying) {
      synthEngine.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    synthEngine.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    synthEngine.setVolume(val);
  };

  const handleToggleMute = () => {
    synthEngine.toggleMute();
    setIsMuted(synthEngine.getIsMuted());
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section aria-label="Synthwave Music Deck" className={`relative rounded-xl border border-pink-500/40 bg-[#120824]/90 backdrop-blur-md p-4 sm:p-5 shadow-2xl overflow-hidden neon-border-purple ${className}`}>
      {/* Top cassette header */}
      <div className="flex items-center justify-between border-b border-pink-500/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-pink-400 animate-pulse" />
          <h2 className="text-sm font-arcade tracking-wider text-pink-300">
            SYNTH-DECK 1984
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
            HI-FI STEREO
          </span>
          <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-pink-950/60 border border-pink-500/30 text-pink-400">
            DOLBY B-NR
          </span>
        </div>
      </div>

      {/* Cassette Tape Realistic Graphic Display */}
      <div className="relative rounded-lg border-2 border-pink-500/50 bg-[#1a0a33] p-3 mb-4 shadow-inner overflow-hidden">
        {/* Cassette Texture Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-pink-900/20 via-transparent to-black/60 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Cassette Label Strip */}
          <div className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 py-1 px-3 rounded-t flex items-center justify-between shadow-md">
            <span className="text-[10px] font-arcade text-white tracking-widest truncate">
              {currentTrack.title}
            </span>
            <span className="text-[10px] font-mono text-yellow-200 font-bold ml-2">
              SIDE A · {currentTrack.bpm} BPM
            </span>
          </div>

          {/* Cassette Spool Window */}
          <div className="w-full bg-[#0a0314] border border-pink-500/30 py-3 px-6 rounded-b flex items-center justify-between relative shadow-inner">
            {/* Left Spool */}
            <div className="relative flex items-center justify-center">
              <div
                className={`w-11 h-11 rounded-full border-2 border-cyan-400/80 bg-neutral-900 flex items-center justify-center transition-transform ${
                  isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                }`}
              >
                <div className="w-4 h-4 rounded-full border border-pink-400 bg-neutral-800 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                </div>
                <div className="absolute w-8 h-1 bg-cyan-400/30 rotate-45" />
                <div className="absolute w-8 h-1 bg-cyan-400/30 -rotate-45" />
              </div>
            </div>

            {/* Center Tape Level View */}
            <div className="flex-1 mx-4 flex flex-col items-center">
              <div className="w-24 h-5 border border-pink-500/40 rounded bg-black/60 flex items-center justify-center px-1 overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-pink-500 to-cyan-500 rounded-sm transition-all duration-300"
                  style={{ width: `${Math.max(10, progressPercent)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-pink-400/80 mt-1 tracking-wider">
                {currentTrack.genre}
              </span>
            </div>

            {/* Right Spool */}
            <div className="relative flex items-center justify-center">
              <div
                className={`w-11 h-11 rounded-full border-2 border-pink-400/80 bg-neutral-900 flex items-center justify-center transition-transform ${
                  isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
                }`}
              >
                <div className="w-4 h-4 rounded-full border border-cyan-400 bg-neutral-800 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-300" />
                </div>
                <div className="absolute w-8 h-1 bg-pink-400/30 rotate-45" />
                <div className="absolute w-8 h-1 bg-pink-400/30 -rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track Metadata & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
        <div>
          <div className="text-base font-display font-bold text-white tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="neon-text-pink">{currentTrack.title}</span>
          </div>
          <div className="text-xs text-pink-300/80 font-tech">
            by {currentTrack.artist} · <span className="text-cyan-300">{currentTrack.genre}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-cyan-400 tabular-nums font-bold">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Scrub Bar */}
      <div className="mb-4">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek track position"
            className="w-full h-2 bg-purple-950/80 rounded-lg appearance-none cursor-pointer accent-pink-500 border border-pink-500/30 focus:outline-none focus:ring-1 focus:ring-pink-400"
          />
        </div>
      </div>

      {/* Transport Controls & Volume */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            aria-label="Previous Track"
            className="p-2.5 rounded-lg border border-pink-500/40 bg-pink-950/40 text-pink-300 hover:text-white hover:bg-pink-800/50 hover:border-pink-400 transition-all active:scale-95 shadow-md"
            title="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayPause}
            aria-label={isPlaying ? 'Pause Music' : 'Play Music'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-pink-400 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-tech font-bold tracking-wider hover:from-pink-500 hover:to-purple-500 shadow-lg shadow-pink-600/30 transition-all active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span className="text-xs font-arcade">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span className="text-xs font-arcade">PLAY</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            aria-label="Next Track"
            className="p-2.5 rounded-lg border border-pink-500/40 bg-pink-950/40 text-pink-300 hover:text-white hover:bg-pink-800/50 hover:border-pink-400 transition-all active:scale-95 shadow-md"
            title="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-pink-500/20">
          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="text-pink-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Master Volume"
            className="w-18 sm:w-24 h-1.5 bg-purple-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Visualizer widget */}
      <Visualizer isPlaying={isPlaying} color={currentTrack.moodColor} className="mb-4" />

      {/* 3 Dummy Tracks Selector Tabs */}
      <div>
        <div className="text-[10px] font-arcade text-pink-300/70 mb-2 flex items-center gap-1.5">
          <Music4 className="w-3.5 h-3.5 text-pink-400" />
          SELECT SYNTHWAVE CASSETTE
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DUMMY_TRACKS.map((trk, idx) => {
            const isSelected = trk.id === currentTrack.id;
            return (
              <button
                key={trk.id}
                onClick={() => handleSelectTrack(idx)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-pink-400 bg-gradient-to-br from-pink-950/70 to-purple-900/60 shadow-md shadow-pink-500/20'
                    : 'border-pink-500/20 bg-black/40 hover:border-pink-500/40 hover:bg-pink-950/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono font-bold text-cyan-400">
                    TAPE 0{idx + 1}
                  </span>
                  {isSelected && isPlaying && (
                    <Disc3 className="w-3 h-3 text-pink-400 animate-spin" />
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate font-display">
                  {trk.title}
                </div>
                <div className="text-[10px] text-pink-300/70 truncate font-tech">
                  {trk.artist} · {trk.bpm} BPM
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
