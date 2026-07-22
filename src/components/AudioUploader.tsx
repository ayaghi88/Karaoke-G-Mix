import React, { useRef, useState } from 'react';
import { Upload, Music, Play, Sparkles, Check, Youtube, ArrowRight, ShieldCheck } from 'lucide-react';
import { DEMO_TRACKS, DemoTrackOption } from '../utils/demoAudioGenerator';
import { TrackMetadata } from '../types';

interface AudioUploaderProps {
  onLoadAudioFile: (file: File) => void;
  onLoadDemoTrack: (demo: DemoTrackOption) => void;
  onLoadYoutubeUrl: (url: string, title?: string) => void;
  isLoading: boolean;
  currentTrack: TrackMetadata | null;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onLoadAudioFile,
  onLoadDemoTrack,
  onLoadYoutubeUrl,
  isLoading,
  currentTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('pop_groove');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeTitle, setYoutubeTitle] = useState<string>('');

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

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    onLoadYoutubeUrl(youtubeUrl, youtubeTitle.trim() || undefined);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Top Banner: YouTube URL Import Feature */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-950 to-cyan-950/60 border border-red-900/40 rounded-xl p-4">
        <form onSubmit={handleYoutubeSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30">
                <Youtube className="w-4 h-4" />
              </div>
              <span>Import Original Song from YouTube URL</span>
            </div>
            <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> YouTube Copyright-Safe "Karaoke G-Mix"
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-7">
              <input
                id="youtube-url-input"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube Link (e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="md:col-span-3">
              <input
                id="youtube-title-input"
                type="text"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                placeholder="Song Name (Optional)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                id="btn-import-youtube"
                type="submit"
                disabled={isLoading || !youtubeUrl.trim()}
                className="w-full h-full py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {isLoading ? (
                  <span>Extracting...</span>
                ) : (
                  <>
                    <span>G-Mix Extract</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

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
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30 scale-[0.99]'
                : 'border-slate-700/80 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-900/60'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 mb-2 shadow-inner">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-slate-200 mb-1">
              Drop audio file here or <span className="text-cyan-400 underline">browse</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Upload MP3, WAV, FLAC, OGG • 100% Free
            </p>
          </div>
        </div>

        {/* Demo Songs Picker */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test With Demo Tracks</span>
              </div>
              <span className="text-[10px] text-slate-500">Instant Test</span>
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
              <span>Generating Stems...</span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Load Demo Track</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
