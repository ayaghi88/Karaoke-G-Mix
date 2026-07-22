import React, { useState, useEffect, useRef } from 'react';
import { FileText, Edit3, Check, RefreshCw, BookmarkPlus, Sparkles, Zap, Radio } from 'lucide-react';
import { LyricLine, TrackMetadata } from '../types';

interface LyricTeleprompterProps {
  currentTrack: TrackMetadata | null;
  currentTime: number;
  onSeekTo: (time: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

// Utility function to parse raw LRC string format [mm:ss.xx] Lyric Line
export function parseLrcString(lrcContent: string): LyricLine[] {
  if (!lrcContent || typeof lrcContent !== 'string') return [];

  const lines = lrcContent.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  lines.forEach((line, index) => {
    const times: number[] = [];
    let match: RegExpExecArray | null;

    // Extract all [mm:ss.xx] timestamps in the line
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const sub = match[3];
      const ms = sub.length === 2 ? parseInt(sub, 10) * 10 : parseInt(sub, 10);
      const totalSeconds = minutes * 60 + seconds + ms / 1000;
      times.push(totalSeconds);
    }

    // Clean lyrics line text
    const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();

    if (text && times.length > 0) {
      times.forEach((timeSec) => {
        const timeMs = Math.round(timeSec * 1000);
        const wordsArr = text.split(' ').map((w, wIdx) => ({
          word: w,
          timeMs: timeMs + wIdx * 320,
        }));

        result.push({
          id: `lrc-${index}-${timeMs}`,
          time: timeSec,
          timeMs,
          text,
          words: wordsArr,
        });
      });
    }
  });

  return result.sort((a, b) => a.time - b.time);
}

export const LyricTeleprompter: React.FC<LyricTeleprompterProps> = ({
  currentTrack,
  currentTime,
  onSeekTo,
  audioRef,
}) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isSyncingMode, setIsSyncingMode] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const [isFetchingLyrics, setIsFetchingLyrics] = useState<boolean>(false);
  const [exactMs, setExactMs] = useState<number>(0);
  const [sourceLabel, setSourceLabel] = useState<string>('LRCLIB Sync Database');

  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Frame-perfect requestAnimationFrame loop polling audio time continuously
  useEffect(() => {
    const syncLoop = () => {
      const audioTime = audioRef?.current ? audioRef.current.currentTime : currentTime;
      setExactMs(Math.round(audioTime * 1000));
      animFrameRef.current = requestAnimationFrame(syncLoop);
    };

    animFrameRef.current = requestAnimationFrame(syncLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentTime, audioRef]);

  // STEP 1: FETCH REAL TIME-TAGGED LYRICS FROM LRCLIB API OR BACKEND
  const fetchLrclibLyrics = async (trackName: string, artistName?: string) => {
    setIsFetchingLyrics(true);
    try {
      // 1. Try LRCLIB Public API first
      let searchQuery = trackName;
      if (artistName && !trackName.toLowerCase().includes(artistName.toLowerCase())) {
        searchQuery = `${trackName} ${artistName}`;
      }

      console.log('Fetching synchronized lyrics from LRCLIB API for:', searchQuery);
      const lrclibRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`);

      if (lrclibRes.ok) {
        const searchData = await lrclibRes.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          const syncedMatch = searchData.find((item: any) => item.syncedLyrics && item.syncedLyrics.trim().length > 0);
          if (syncedMatch && syncedMatch.syncedLyrics) {
            const parsed = parseLrcString(syncedMatch.syncedLyrics);
            if (parsed.length > 0) {
              setLyrics(parsed);
              setSourceLabel(`LRCLIB Live (${syncedMatch.artistName || 'Verified'})`);
              setIsFetchingLyrics(false);
              return;
            }
          }
        }
      }

      // 2. Fallback to Enterprise Synced Lyrics Database
      const res = await fetch(`/api/lyrics/sync?title=${encodeURIComponent(trackName)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.lyrics)) {
        const formatted: LyricLine[] = data.lyrics.map((item: any, idx: number) => ({
          id: `ent-${idx + 1}`,
          time: item.timeSec ?? item.time ?? 0,
          timeMs: item.timeMs ?? (item.timeSec ? item.timeSec * 1000 : 0),
          text: item.text,
          words: item.words || [],
        }));
        setLyrics(formatted);
        setSourceLabel('Enterprise LRC Sync Engine');
      }
    } catch (err) {
      console.warn('LRCLIB API & Enterprise lyrics sync warning:', err);
    } finally {
      setIsFetchingLyrics(false);
    }
  };

  useEffect(() => {
    if (!currentTrack) return;
    fetchLrclibLyrics(currentTrack.name, currentTrack.artist);
  }, [currentTrack]);

  // Compute active line index: currentTime >= line.time, but < next line.time
  const activeLineIndex = lyrics.reduce((activeIdx, line, idx) => {
    const currentSec = exactMs / 1000;
    if (currentSec >= line.time) {
      return idx;
    }
    return activeIdx;
  }, 0);

  // Auto-scroll centered line smoothly into view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  const handleParseRawText = () => {
    if (rawText.includes('[') && rawText.includes(']')) {
      const parsed = parseLrcString(rawText);
      if (parsed.length > 0) {
        setLyrics(parsed);
        setIsSyncingMode(false);
        setSourceLabel('User Custom LRC File');
        return;
      }
    }

    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const duration = currentTrack?.duration || 210;
    const interval = Math.max(3, Math.floor(duration / Math.max(1, lines.length)));

    const parsed: LyricLine[] = lines.map((text, index) => {
      const timeSec = index * interval;
      return {
        id: `custom-${index + 1}`,
        time: timeSec,
        timeMs: timeSec * 1000,
        text: text.trim(),
        words: text.trim().split(' ').map((w, wIdx) => ({
          word: w,
          timeMs: timeSec * 1000 + wIdx * 350,
        })),
      };
    });
    setLyrics(parsed);
    setIsSyncingMode(false);
    setSourceLabel('Custom Auto-Spaced Timestamps');
  };

  const tagActiveLineTime = (index: number) => {
    const updated = [...lyrics];
    const currentSec = exactMs / 1000;
    updated[index].time = currentSec;
    updated[index].timeMs = Math.round(currentSec * 1000);
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
          <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shadow-md">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Automated LRC Teleprompter Engine
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Frame-Accurate • {sourceLabel}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              LRCLIB API synchronized lyrics with requestAnimationFrame auto-scrolling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentTrack && (
            <button
              onClick={() => fetchLrclibLyrics(currentTrack.name, currentTrack.artist)}
              disabled={isFetchingLyrics}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLyrics ? 'animate-spin' : ''}`} />
              <span>{isFetchingLyrics ? 'Fetching LRCLIB...' : 'Fetch LRCLIB Synced'}</span>
            </button>
          )}

          <button
            onClick={() => setIsSyncingMode(!isSyncingMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSyncingMode ? 'View Teleprompter' : 'Paste Raw .LRC'}</span>
          </button>
        </div>
      </div>

      {!isSyncingMode ? (
        /* Teleprompter Frame-Accurate Scrolling Display */
        <div
          ref={containerRef}
          className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 max-h-[380px] overflow-y-auto space-y-5 text-center shadow-inner relative scrollbar-thin scrollbar-thumb-slate-800"
        >
          {lyrics.length === 0 ? (
            <div className="text-xs text-slate-500 py-12 space-y-3">
              <p>No synchronized .LRC lyrics loaded.</p>
              <button
                onClick={() => fetchLrclibLyrics(currentTrack?.name || 'Hurt', currentTrack?.artist || 'Christina Aguilera')}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Fetch LRCLIB Synced Lyrics
              </button>
            </div>
          ) : (
            lyrics.map((line, idx) => {
              const isActive = idx === activeLineIndex;

              return (
                <div
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  className={`group relative flex items-center justify-center gap-3 w-full py-2 px-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-950/40 border border-cyan-800/50 scale-105 shadow-lg'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                >
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-slate-400 rounded border border-slate-800">
                    {formatSecs(line.time)}
                  </span>

                  <div
                    onClick={() => onSeekTo(line.time)}
                    className="cursor-pointer text-sm sm:text-lg font-bold transition-all flex flex-wrap items-center justify-center gap-1.5"
                  >
                    {line.words && line.words.length > 0 ? (
                      line.words.map((w, wIdx) => {
                        const isWordPassed = exactMs >= w.timeMs;
                        return (
                          <span
                            key={wIdx}
                            className={`transition-colors duration-150 ${
                              isActive && isWordPassed
                                ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)] font-black'
                                : isActive
                                ? 'text-cyan-200 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {w.word}
                          </span>
                        );
                      })
                    ) : (
                      <span
                        className={
                          isActive
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-amber-300 font-black text-lg sm:text-xl drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                            : 'text-slate-400'
                        }
                      >
                        {line.text}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => tagActiveLineTime(idx)}
                    title="Tag current playhead timestamp"
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
        /* Edit / Paste Raw LRC View */
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Paste Raw .LRC String or Standard Lyrics:
          </label>
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`[00:08.00] Seems like it was yesterday when I saw your face\n[00:16.00] You told me how proud you were, but I walked away\n[00:24.00] If only I knew what I know today...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleParseRawText}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Parse & Activate Teleprompter</span>
          </button>
        </div>
      )}
    </div>
  );
};
