import React from 'react';
import { Sliders, Volume2, ShieldAlert, Sparkles, RefreshCw, Zap, Disc } from 'lucide-react';
import { AudioProcessingSettings } from '../types';

interface VocalRemoverControlsProps {
  settings: AudioProcessingSettings;
  onChangeSettings: (newSettings: AudioProcessingSettings) => void;
  onResetDefaults: () => void;
  isOriginal: boolean;
}

export const VocalRemoverControls: React.FC<VocalRemoverControlsProps> = ({
  settings,
  onChangeSettings,
  onResetDefaults,
  isOriginal,
}) => {
  const updateSetting = <K extends keyof AudioProcessingSettings>(
    key: K,
    value: AudioProcessingSettings[K]
  ) => {
    onChangeSettings({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Master DSP Vocal Isolation & Instrumental Controls
            </h2>
            <p className="text-xs text-slate-400">
              Center Phase Subtraction, Formant Notch Filtering, & Bass Preservation
            </p>
          </div>
        </div>

        <button
          onClick={onResetDefaults}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-800 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {isOriginal && (
        <div className="mb-4 p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-200 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Playing Original Track:</strong> Switch to <em>"Karaoke Instrumental"</em> in the player bar below to hear vocal isolation effects in real time.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Vocal Isolation Depth */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> Vocal Cut Depth
            </span>
            <span className="text-cyan-400 font-mono">{Math.round(settings.vocalRemovalDepth * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.vocalRemovalDepth}
            onChange={(e) => updateSetting('vocalRemovalDepth', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Phase cancels dead-centered vocals while maintaining full stereo instrumental backing.
          </p>
        </div>

        {/* 2. Sub-Bass Preservation */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-indigo-400" /> Sub-Bass Preservation
            </span>
            <span className="text-indigo-400 font-mono">{Math.round(settings.bassPreservation * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.bassPreservation}
            onChange={(e) => updateSetting('bassPreservation', parseFloat(e.target.value))}
            className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Injects low-frequency mono glue (20Hz - 140Hz) so kick drums and basslines stay punchy.
          </p>
        </div>

        {/* 3. Vocal Notch Target Frequency */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Vocal Formant Notch
            </span>
            <span className="text-amber-400 font-mono">{settings.vocalNotchFreq} Hz</span>
          </div>
          <input
            type="range"
            min="300"
            max="3000"
            step="25"
            value={settings.vocalNotchFreq}
            onChange={(e) => updateSetting('vocalNotchFreq', parseInt(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Target specific vocal registers (Low: 500Hz Tenor/Bass, High: 1.8kHz Soprano).
          </p>
        </div>

        {/* 4. Treble & Air Boost */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> High Air & Cymbals Boost
            </span>
            <span className="text-emerald-400 font-mono">{Math.round(settings.trebleBoost * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.trebleBoost}
            onChange={(e) => updateSetting('trebleBoost', parseFloat(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Enhances crisp acoustics, hi-hats, and synth sparkle above 6 kHz.
          </p>
        </div>

        {/* 5. Key Shift / Transpose */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200">Key Transpose (Semitones)</span>
            <span className="text-cyan-400 font-mono">
              {settings.pitchShiftSemiTones > 0 ? `+${settings.pitchShiftSemiTones}` : settings.pitchShiftSemiTones} st
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSetting('pitchShiftSemiTones', Math.max(-6, settings.pitchShiftSemiTones - 1))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold"
            >
              -
            </button>
            <input
              type="range"
              min="-6"
              max="6"
              step="1"
              value={settings.pitchShiftSemiTones}
              onChange={(e) => updateSetting('pitchShiftSemiTones', parseInt(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => updateSetting('pitchShiftSemiTones', Math.min(6, settings.pitchShiftSemiTones + 1))}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            Adjust the key of the track up or down to comfortably match your vocal range.
          </p>
        </div>

        {/* 6. Playback Tempo / Speed */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200">Track Speed / Tempo</span>
            <span className="text-cyan-400 font-mono">{settings.playbackRate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.25"
            step="0.05"
            value={settings.playbackRate}
            onChange={(e) => updateSetting('playbackRate', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Slowing down or speeding up track tempo for practice session.
          </p>
        </div>
      </div>
    </div>
  );
};
