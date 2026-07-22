import React, { useRef, useState } from 'react';
import { Upload, Sparkles, Youtube, ArrowRight, Search } from 'lucide-react';
import { TrackMetadata } from '../types';

interface AudioUploaderProps {
  onLoadAudioFile: (file: File) => void;
  onLoadYoutubeUrl: (query: string, title?: string, artist?: string, song?: string) => void;
  isLoading: boolean;
  currentTrack: TrackMetadata | null;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  onLoadAudioFile,
  onLoadYoutubeUrl,
  isLoading,
  currentTrack,
  audioRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeTitle, setYoutubeTitle] = useState<string>('');
  const [artistInput, setArtistInput] = useState<string>('');
  const [songInput, setSongInput] = useState<string>('');

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

  const unlockAudioContext = () => {
    if (audioRef?.current) {
      audioRef.current
        .play()
        .then(() => {
          if (audioRef.current) audioRef.current.pause();
        })
        .catch((e) => console.log('Unlocked audio context', e));
    }
  };

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    unlockAudioContext();
    onLoadYoutubeUrl(youtubeUrl, youtubeTitle.trim() || undefined);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanArtist = artistInput.trim();
    const cleanSong = songInput.trim();
    if (!cleanArtist || !cleanSong) return;
    unlockAudioContext();
    const combinedTitle = `${cleanSong} - ${cleanArtist}`;
    onLoadYoutubeUrl(combinedTitle, combinedTitle, cleanArtist, cleanSong);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Search by Artist & Song Name Form (No URL required) */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-950 to-blue-950/70 border border-cyan-800/40 rounded-xl p-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <div className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                <Search className="w-4 h-4" />
              </div>
              <span>Generate Karaoke by Artist & Song Title (No URL needed)</span>
            </div>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Auto Official Audio Extractor
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-5">
              <input
                id="artist-input"
                type="text"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                placeholder="Artist Name (e.g. Christina Aguilera)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="md:col-span-5">
              <input
                id="song-input"
                type="text"
                value={songInput}
                onChange={(e) => setSongInput(e.target.value)}
                placeholder="Song Title (e.g. Hurt)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                id="btn-search-karaoke"
                type="submit"
                disabled={isLoading || !artistInput.trim() || !songInput.trim()}
                className="w-full h-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {isLoading ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <span>Generate Track</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Optional YouTube URL Import */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-950 to-slate-900 border border-red-900/40 rounded-xl p-3">
        <form onSubmit={handleYoutubeSubmit} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Youtube className="w-4 h-4 text-red-500" />
              <span>Or Paste Direct YouTube Link</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-7">
              <input
                id="youtube-url-input"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste YouTube Link (e.g. https://www.youtube.com/watch?v=...)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="md:col-span-3">
              <input
                id="youtube-title-input"
                type="text"
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                placeholder="Song Name (Optional)"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="md:col-span-2">
              <button
                id="btn-import-youtube"
                type="submit"
                disabled={isLoading || !youtubeUrl.trim()}
                className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-1 disabled:opacity-40"
              >
                {isLoading ? 'Extracting...' : 'Extract Link'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-5 items-center">
        {/* Upload Dropzone */}
        <div>
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
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
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
      </div>
    </div>
  );
};
