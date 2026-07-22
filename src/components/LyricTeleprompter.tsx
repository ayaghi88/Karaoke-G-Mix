import React, { useState, useEffect } from 'react';
import { FileText, Clock, Sparkles, Edit3, Check, Plus, Trash2, RefreshCw, BookmarkPlus } from 'lucide-react';
import { LyricLine, TrackMetadata } from '../types';

interface LyricTeleprompterProps {
  currentTrack: TrackMetadata | null;
  currentTime: number;
  onSeekTo: (time: number) => void;
}

const DEFAULT_DEMO_LYRICS: Record<string, LyricLine[]> = {
  pop_groove: [
    { id: '1', time: 0, text: '♪ (Upbeat Synth Intro) ♪' },
    { id: '2', time: 4, text: 'Walking through the neon lights tonight' },
    { id: '3', time: 8, text: 'Chasing shadows under city skies so bright' },
    { id: '4', time: 12, text: 'Feel the rhythm pulsing in our heart and soul' },
    { id: '5', time: 16, text: 'Take my hand and let the music take control!' },
  ],
  acoustic_ballad: [
    { id: '1', time: 0, text: '♪ (Acoustic Guitar Strum) ♪' },
    { id: '2', time: 3, text: 'Summer breeze whispers through the trees' },
    { id: '3', time: 7, text: 'Memories floating on the ocean seas' },
    { id: '4', time: 11, text: 'Sing a song of love and harmony' },
  ],
  rock_jam: [
    { id: '1', time: 0, text: '♪ (Heavy Rock Drums & Guitars) ♪' },
    { id: '2', time: 4, text: 'Turn the amplifier up to ten!' },
    { id: '3', time: 8, text: 'We are never backing down again!' },
    { id: '4', time: 12, text: 'Let the electric thunder rock the floor!' },
  ],
};

export const LyricTeleprompter: React.FC<LyricTeleprompterProps> = ({
  currentTrack,
  currentTime,
  onSeekTo,
}) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isSyncingMode, setIsSyncingMode] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const [isFetchingLyrics, setIsFetchingLyrics] = useState<boolean>(false);

  const fetchLyricsForTrack = async (trackName: string) => {
    setIsFetchingLyrics(true);
    try {
      const res = await fetch(`/api/lyrics?title=${encodeURIComponent(trackName)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
        const formatted = data.lyrics.map((item: { time: number; text: string }, idx: number) => ({
          id: String(idx + 1),
          time: item.time,
          text: item.text,
        }));
        setLyrics(formatted);
      }
    } catch (err) {
      console.warn('Lyrics fetch error:', err);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  useEffect(() => {
    if (!currentTrack) return;

    if (DEFAULT_DEMO_LYRICS[currentTrack.id]) {
      setLyrics(DEFAULT_DEMO_LYRICS[currentTrack.id]);
    } else {
      // Fetch or generate synced lyrics for current song (e.g. Hurt - Christina Aguilera)
      fetchLyricsForTrack(currentTrack.name);
    }
  }, [currentTrack]);

  // Active line calculation
  const activeLineIndex = lyrics.reduce((activeIdx, line, idx) => {
    if (currentTime >= line.time) {
      return idx;
    }
    return activeIdx;
  }, 0);

  const handleParseRawText = () => {
    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const duration = currentTrack?.duration || 180;
    const interval = Math.max(3, Math.floor(duration / Math.max(1, lines.length)));
    
    const parsed: LyricLine[] = lines.map((text, index) => ({
      id: String(index + 1),
      time: index * interval,
      text: text.trim(),
    }));
    setLyrics(parsed);
    setIsSyncingMode(false);
  };

  const tagActiveLineTime = (index: number) => {
    const updated = [...lyrics];
    updated[index].time = Math.round(currentTime);
    // Sort lines chronologically
    updated.sort((a, b) => a.time - b.time);
    setLyrics(updated);
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Synchronized Karaoke Teleprompter
            </h2>
            <p className="text-xs text-slate-400">
              Live scrolling lyrics with time-tagging sync mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentTrack && (
            <button
              onClick={() => fetchLyricsForTrack(currentTrack.name)}
              disabled={isFetchingLyrics}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLyrics ? 'animate-spin' : ''}`} />
              <span>{isFetchingLyrics ? 'Syncing...' : 'Auto-Sync Lyrics'}</span>
            </button>
          )}

          <button
            onClick={() => setIsSyncingMode(!isSyncingMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSyncingMode ? 'View Teleprompter' : 'Edit / Paste Lyrics'}</span>
          </button>
        </div>
      </div>

      {!isSyncingMode ? (
        /* Teleprompter View */
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 min-h-[300px] flex flex-col items-center justify-center space-y-4 text-center shadow-inner relative overflow-hidden">
          {lyrics.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 space-y-2">
              <p>No lyrics synced yet.</p>
              <button
                onClick={() => fetchLyricsForTrack(currentTrack?.name || 'Hurt - Christina Aguilera')}
                className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg font-bold text-xs"
              >
                Auto-Fetch Song Lyrics
              </button>
            </div>
          ) : (
            lyrics.map((line, idx) => {
              const isActive = idx === activeLineIndex;
              return (
                <div
                  key={line.id}
                  className={`group relative flex items-center justify-center gap-3 w-full transition-all duration-300 ${
                    isActive ? 'scale-105' : 'opacity-40 hover:opacity-80'
                  }`}
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-800">
                    {formatSecs(line.time)}
                  </span>

                  <div
                    onClick={() => onSeekTo(line.time)}
                    className={`cursor-pointer ${
                      isActive
                        ? 'text-base sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-amber-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : 'text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {line.text}
                  </div>

                  <button
                    onClick={() => tagActiveLineTime(idx)}
                    title="Tag current playhead time to this line"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white rounded text-[10px]"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Edit / Paste Lyrics View */
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Paste Song Lyrics (One verse per line):
          </label>
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Seems like it was yesterday when I saw your face...\nYou told me how proud you were...\nIf only I knew what I know today...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleParseRawText}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Apply & Auto-Space Timestamps</span>
          </button>
        </div>
      )}
    </div>
  );
};
