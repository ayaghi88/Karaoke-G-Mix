import React, { useState, useEffect } from 'react';
import { FileText, Clock, Sparkles, Edit3, Check, Plus, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (currentTrack && DEFAULT_DEMO_LYRICS[currentTrack.id]) {
      setLyrics(DEFAULT_DEMO_LYRICS[currentTrack.id]);
    } else if (lyrics.length === 0) {
      setLyrics([
        { id: '1', time: 0, text: '♪ (Instrumental Opening) ♪' },
        { id: '2', time: 5, text: 'Paste or type your song lyrics below to sync time!' },
      ]);
    }
  }, [currentTrack]);

  // Find active line
  const activeLineIndex = lyrics.reduce((activeIdx, line, idx) => {
    if (currentTime >= line.time) {
      return idx;
    }
    return activeIdx;
  }, 0);

  const handleParseRawText = () => {
    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const parsed: LyricLine[] = lines.map((text, index) => ({
      id: String(index + 1),
      time: index * 4, // default 4 sec gap
      text: text.trim(),
    }));
    setLyrics(parsed);
    setIsSyncingMode(false);
  };

  const tagNextLineTime = () => {
    // Find first line with time 0 or update current active line
    const unTaggedIndex = lyrics.findIndex((l, idx) => idx > 0 && l.time === 0);
    if (unTaggedIndex !== -1) {
      const updated = [...lyrics];
      updated[unTaggedIndex].time = Math.round(currentTime);
      setLyrics(updated);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
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

        <button
          onClick={() => setIsSyncingMode(!isSyncingMode)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
        >
          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isSyncingMode ? 'View Teleprompter' : 'Edit / Paste Lyrics'}</span>
        </button>
      </div>

      {!isSyncingMode ? (
        /* Teleprompter View */
        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-8 min-h-[280px] flex flex-col items-center justify-center space-y-4 text-center shadow-inner">
          {lyrics.map((line, idx) => {
            const isActive = idx === activeLineIndex;
            return (
              <div
                key={line.id}
                onClick={() => onSeekTo(line.time)}
                className={`cursor-pointer transition-all duration-300 ${
                  isActive
                    ? 'text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-amber-300 scale-105 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-400'
                }`}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      ) : (
        /* Edit / Paste Lyrics View */
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Paste Song Lyrics (One line per verse):
          </label>
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Verse 1 line 1...\nVerse 1 line 2...\nChorus line 1...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleParseRawText}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Apply Lyrics to Teleprompter</span>
          </button>
        </div>
      )}
    </div>
  );
};
