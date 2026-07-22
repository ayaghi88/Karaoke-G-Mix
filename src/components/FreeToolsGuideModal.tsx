import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Zap, Disc, HelpCircle, ExternalLink } from 'lucide-react';

interface FreeToolsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FreeToolsGuideModal: React.FC<FreeToolsGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative space-y-5 text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Master Audio Producer Guide: 100% Free Instrumental Extraction
            </h2>
            <p className="text-xs text-slate-400">
              How to create identical karaoke backing tracks without paying subscription fees
            </p>
          </div>
        </div>

        {/* Section 1: How Web Audio API DSP Works (Built-in) */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            1. Built-In Web Audio DSP Engine (This App - Zero Cost & Instant)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            In standard studio mixing, lead vocals are panned <strong>dead center</strong> (identical left and right amplitude). By using <strong>Mid/Side Phase Subtraction (<code className="text-cyan-300">Left - Right</code>)</strong>, the centered vocals cancel each other out completely!
          </p>
          <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside pt-1">
            <li><strong>Bass Preservation:</strong> Passes 20Hz–140Hz mono sub-bass so the kick drum and bassline stay punchy.</li>
            <li><strong>Formant Notch Filter:</strong> Cuts residual vocal frequencies (300Hz–3kHz) without muffling stereo instruments.</li>
            <li><strong>Offline WAV Export:</strong> Renders 16-bit uncompressed WAV files directly in your browser.</li>
          </ul>
        </div>

        {/* Section 2: Top External Free AI Stem Removers */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Disc className="w-4 h-4 text-indigo-400" />
            2. Recommended Free AI Vocal Removers & Neural Stem Extractors
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tool 1 */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-300">VocalRemover.org</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-semibold">100% Free Daily</span>
              </div>
              <p className="text-[11px] text-slate-400">
                AI deep learning model that separates vocals and instrumentals in ~20 seconds. Very clean results.
              </p>
            </div>

            {/* Tool 2 */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-cyan-300">LALAL.AI (Free Preview)</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800 font-semibold">Free Preview</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Stem separation for drums, bass, vocals, and piano. You can process snippets for free or use our built-in DSP.
              </p>
            </div>

            {/* Tool 3 */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-300">Ultimate Vocal Remover (UVR5)</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800 font-semibold">Open Source (Unlimited Free)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                The industry-standard open-source application used by master audio engineers. Runs locally on Windows/Mac using AI models like MDX-Net & Demucs with 0 fee forever.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Producer Tips */}
        <div className="p-3 bg-cyan-950/30 border border-cyan-800/50 rounded-xl text-xs space-y-1">
          <span className="font-bold text-cyan-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Master Producer Tip for Stereo Reverb:
          </span>
          <p className="text-[11px] text-slate-300">
            If a song has heavy stereo reverb on the vocal track, set the <strong>Vocal Formant Notch</strong> slider to <strong>1200 Hz</strong> and turn <strong>Sub-Bass Preservation</strong> to <strong>80%</strong> to retain maximum instrumental clarity!
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow transition-all hover:brightness-110"
          >
            Got It, Back to Studio
          </button>
        </div>
      </div>
    </div>
  );
};
