import React, { useEffect, useRef } from 'react';
import { Activity, Radio } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
  isOriginal: boolean;
  vocalRemovalDepth: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  isOriginal,
  vocalRemovalDepth,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = 140);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 140;
      }
    };
    window.addEventListener('resize', handleResize);

    const renderVisualizer = () => {
      const analyser = audioEngine.getAnalyserNode();
      ctx.clearRect(0, 0, width, height);

      // Draw background grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.2;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;

          // Color gradient depending on original vs karaoke stem
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          if (isOriginal) {
            gradient.addColorStop(0, '#f59e0b'); // Amber for original
            gradient.addColorStop(1, '#ef4444');
          } else {
            gradient.addColorStop(0, '#06b6d4'); // Cyan to Indigo for Karaoke Instrumental
            gradient.addColorStop(1, '#6366f1');
          }

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }
      } else {
        // Flat idle line
        ctx.strokeStyle = isOriginal ? '#f59e0b' : '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animFrameId.current = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, isOriginal]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200">
            Real-Time Audio Spectrum & Vocal Isolation Meter
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isOriginal ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isOriginal ? 'Original Audio' : 'Instrumental Karaoke Stem'}
            </span>
          </span>
          {!isOriginal && (
            <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/60 font-mono">
              Vocal Cut: -{Math.round(vocalRemovalDepth * 24)} dB
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
        <canvas ref={canvasRef} className="w-full h-[140px] block" />
      </div>
    </div>
  );
};
