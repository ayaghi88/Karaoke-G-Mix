import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Music,
  Sliders,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { AudioProcessingSettings, TrackMetadata } from '../types';

interface PlayerBarProps {
  currentTrack: TrackMetadata | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isOriginal: boolean;
  setIsOriginal: (val: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onExportWav: () => void;
  isExporting: boolean;
  exportProgress: number;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isOriginal,
  setIsOriginal,
  onPlay,
  onPause,
  onSeek,
  onExportWav,
  isExporting,
  exportProgress,
}) => {
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    onSeek(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-4 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Track info & A/B Mode Toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-cyan-400 shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-100 truncate">
                {currentTrack ? currentTrack.name : 'No Audio Track Loaded'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {currentTrack ? currentTrack.artist : 'Upload an MP3 or select demo'}
              </p>
            </div>
          </div>

          {/* A/B Switch: Original vs Instrumental */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center shrink-0">
            <button
              id="mode-instrumental"
              onClick={() => setIsOriginal(false)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                !isOriginal
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              Karaoke Instrumental
            </button>
            <button
              id="mode-original"
              onClick={() => setIsOriginal(true)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isOriginal
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Original Song
            </button>
          </div>
        </div>

        {/* Playback Transport & Seekbar */}
        <div className="flex-1 max-w-xl w-full flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onSeek(0)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
              title="Restart Track"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="btn-play-pause"
              disabled={!currentTrack}
              onClick={isPlaying ? onPause : onPlay}
              className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40 disabled:hover:bg-cyan-500"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
          </div>

          <div className="w-full flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeekChange}
              disabled={!currentTrack}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            id="btn-export-wav"
            disabled={!currentTrack || isExporting}
            onClick={onExportWav}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generating G-Mix ({exportProgress}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Karaoke G-Mix (YouTube Safe)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
