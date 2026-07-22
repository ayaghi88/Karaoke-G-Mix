import React, { useRef, useState } from 'react';
import { Upload, Music, Play, Sparkles, Check, FileAudio } from 'lucide-react';
import { DEMO_TRACKS, DemoTrackOption } from '../utils/demoAudioGenerator';
import { TrackMetadata } from '../types';

interface AudioUploaderProps {
  onLoadAudioFile: (file: File) => void;
  onLoadDemoTrack: (demo: DemoTrackOption) => void;
  isLoading: boolean;
  currentTrack: TrackMetadata | null;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onLoadAudioFile,
  onLoadDemoTrack,
  isLoading,
  currentTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('pop_groove');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
        onLoadAudioFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadAudioFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Upload Dropzone */}
        <div className="lg:col-span-7">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
            className="hidden"
          />
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30 scale-[0.99]'
                : 'border-slate-700/80 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-900/60'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Drop your original song file here or <span className="text-cyan-400 underline">browse</span>
            </h3>
            <p className="text-xs text-slate-400">
              Supports MP3, WAV, FLAC, OGG, M4A • Unlimited file size • 100% Free
            </p>
          </div>
        </div>

        {/* Demo Songs Picker */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test With Free Demo Songs</span>
              </div>
              <span className="text-[10px] text-slate-500">Instant AI/DSP Test</span>
            </div>

            <div className="space-y-1.5 mb-3">
              {DEMO_TRACKS.map((demo) => {
                const isSelected = selectedDemoId === demo.id;
                return (
                  <button
                    key={demo.id}
                    onClick={() => setSelectedDemoId(demo.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                        : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium text-slate-200 truncate">{demo.name}</p>
                        <p className="text-[10px] text-slate-400">{demo.genre} • {demo.bpm} BPM</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            id="btn-load-demo"
            disabled={isLoading}
            onClick={() => {
              const demo = DEMO_TRACKS.find((d) => d.id === selectedDemoId) || DEMO_TRACKS[0];
              onLoadDemoTrack(demo);
            }}
            className="w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Generating Audio Stems...</span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Load Selected Demo Track</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
