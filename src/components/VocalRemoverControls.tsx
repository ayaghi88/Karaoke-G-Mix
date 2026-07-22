import React, { useState } from 'react';
import { Sliders, Volume2, ShieldAlert, Sparkles, RefreshCw, Zap, Disc, Music, Mic, Radio } from 'lucide-react';
import { AudioProcessingSettings } from '../types';
import { audioEngine } from '../utils/audioEngine';

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
  const [stemVolumes, setStemVolumes] = useState<{
    bass: number;
    drums: number;
    melody: number;
    vocals: number;
  }>({
    bass: 1.0,
    drums: 1.0,
    melody: 1.0,
    vocals: 1.0,
  });

  const handleStemVolumeChange = (key: 'bass' | 'drums' | 'melody' | 'vocals', val: number) => {
    const updated = { ...stemVolumes, [key]: val };
    setStemVolumes(updated);
    audioEngine.setStemVolume(key, val);
  };

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
              Demucs AI Multi-Track Audio Stem Console
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" /> Full Stereo Width • Sub-Bass Preserved
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Synchronized Multi-Track HTML5 Audio Routing (bass.wav, drums.wav, other.wav)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setStemVolumes({ bass: 1.0, drums: 1.0, melody: 1.0, vocals: 1.0 });
            audioEngine.setStemVolume('bass', 1.0);
            audioEngine.setStemVolume('drums', 1.0);
            audioEngine.setStemVolume('melody', 1.0);
            audioEngine.setStemVolume('vocals', 1.0);
            onResetDefaults();
          }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-800 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Stems
        </button>
      </div>

      {isOriginal && (
        <div className="mb-4 p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-amber-200 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Playing Original Song:</strong> Full vocal stem is active. Switch to <em>"Karaoke Instrumental"</em> in the player bar to mute vocals and isolate backing stems.
          </span>
        </div>
      )}

      {/* Multi-Track Demucs Stem Mixer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 1. Bass Stem (bass.wav) */}
        <div className="bg-slate-950/90 border border-indigo-900/50 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-indigo-300 flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-indigo-400" /> Bass Stem (bass.wav)
            </span>
            <span className="text-indigo-400 font-mono">{Math.round(stemVolumes.bass * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={stemVolumes.bass}
            onChange={(e) => handleStemVolumeChange('bass', parseFloat(e.target.value))}
            className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Pristine uncompressed low-end bassline isolated directly by Demucs AI model.
          </p>
        </div>

        {/* 2. Drums Stem (drums.wav) */}
        <div className="bg-slate-950/90 border border-emerald-900/50 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-emerald-300 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" /> Drums Stem (drums.wav)
            </span>
            <span className="text-emerald-400 font-mono">{Math.round(stemVolumes.drums * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={stemVolumes.drums}
            onChange={(e) => handleStemVolumeChange('drums', parseFloat(e.target.value))}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Punchy kick drum, snare, and hi-hats maintained at original studio depth.
          </p>
        </div>

        {/* 3. Instruments / Melody Stem (other.wav) */}
        <div className="bg-slate-950/90 border border-cyan-900/50 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-cyan-300 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-cyan-400" /> Instruments Stem (other.wav)
            </span>
            <span className="text-cyan-400 font-mono">{Math.round(stemVolumes.melody * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={stemVolumes.melody}
            onChange={(e) => handleStemVolumeChange('melody', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <p className="text-[10px] text-slate-400">
            Guitars, synths, pianos, and orchestrations with 100% full stereo width.
          </p>
        </div>

        {/* 4. Vocal Stem (vocals.wav) */}
        <div className="bg-slate-950/90 border border-amber-900/50 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-300 flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-amber-400" /> Vocal Stem (vocals.wav)
            </span>
            <span className="text-amber-400 font-mono">
              {isOriginal ? `${Math.round(stemVolumes.vocals * 100)}%` : 'MUTED (Karaoke)'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={stemVolumes.vocals}
            disabled={!isOriginal}
            onChange={(e) => handleStemVolumeChange('vocals', parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-30"
          />
          <p className="text-[10px] text-slate-400">
            Lead and backing vocals. Muted automatically in Karaoke Instrumental mode.
          </p>
        </div>
      </div>

      {/* Speed & Pitch Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Transpose */}
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
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
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
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            Adjust the key of the track up or down to comfortably match your vocal range.
          </p>
        </div>

        {/* Playback Tempo */}
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
