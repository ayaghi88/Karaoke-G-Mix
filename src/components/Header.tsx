import React from 'react';
import { Disc3, HelpCircle, Mic, Music2, Sparkles, SlidersHorizontal, FileText } from 'lucide-react';
import { ActiveTab, TrackMetadata } from '../types';

interface HeaderProps {
  currentTrack: TrackMetadata | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTrack,
  activeTab,
  setActiveTab,
  onOpenGuide,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Disc3 className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                Karaoke <span className="text-cyan-400">G-Mix</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/80 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-amber-400" /> YouTube Safe • 100% Free
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentTrack ? `${currentTrack.name} (${currentTrack.gMixVersion || 'Karaoke G-Mix'})` : 'YouTube Song Instrumental Extractor & Replica Generator'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button
            id="tab-remover"
            onClick={() => setActiveTab('remover')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'remover'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Vocal Remover
          </button>

          <button
            id="tab-recording"
            onClick={() => setActiveTab('recording')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'recording'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            Sing & Record
          </button>

          <button
            id="tab-lyrics"
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'lyrics'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Sync Lyrics
          </button>
        </nav>

        {/* Free Producer Guide Trigger */}
        <div className="flex items-center gap-2">
          <button
            id="btn-free-guide"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 rounded-xl transition-all"
            title="Free AI Vocal Removal Guide & Tools"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Free Tools Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
};
