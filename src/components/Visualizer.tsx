/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { synthEngine } from '../audio/synthEngine';

interface VisualizerProps {
  isPlaying: boolean;
  color?: string;
  className?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({
  isPlaying,
  color = '#ff2a8d',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'bars' | 'wave'>('bars');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Dark background with subtle grid line
      ctx.fillStyle = 'rgba(15, 7, 31, 0.6)';
      ctx.fillRect(0, 0, width, height);

      // Draw faint center zero line
      ctx.strokeStyle = 'rgba(255, 42, 141, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const analyser = synthEngine.analyser;

      if (!analyser || !isPlaying) {
        // Idle gentle breathing line
        const t = performance.now() * 0.003;
        ctx.strokeStyle = 'rgba(255, 42, 141, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.04 + t) * (isPlaying ? 8 : 3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      if (viewMode === 'bars') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barCount = 28;
        const barWidth = Math.floor(width / barCount) - 2;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(3, percent * (height - 6));

          const x = i * (barWidth + 2) + 2;
          const y = height - barHeight;

          // Neon gradient from Cyan to Pink/Magenta
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, '#00f0ff');
          grad.addColorStop(0.5, '#b026ff');
          grad.addColorStop(1, '#ff2a8d');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Top bright cap
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(0, y - 2), barWidth, 2);
        }
      } else {
        // Oscilloscope waveform mode
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, viewMode, color]);

  return (
    <div className={`relative flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] tracking-wider text-pink-300/80 font-arcade">
          AUDIO SPECTRUM
        </span>
        <button
          onClick={() => setViewMode(v => (v === 'bars' ? 'wave' : 'bars'))}
          className="text-[9px] px-2 py-0.5 rounded border border-pink-500/30 text-pink-300 hover:text-white hover:border-pink-400 bg-pink-950/40 transition-colors uppercase font-mono tracking-wider"
          title="Toggle Spectrum Bars / Waveform"
        >
          {viewMode === 'bars' ? 'Bars' : 'Wave'}
        </button>
      </div>

      <div className="relative rounded border border-pink-500/30 overflow-hidden bg-black/50 p-1 shadow-inner">
        <canvas
          ref={canvasRef}
          width={320}
          height={68}
          className="w-full h-16 block rounded"
        />
        {/* Subtle scanline overlay for visualizer */}
        <div className="absolute inset-0 crt-overlay opacity-40 pointer-events-none" />
      </div>
    </div>
  );
};
