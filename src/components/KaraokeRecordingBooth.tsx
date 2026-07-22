import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Play,
  Square,
  Download,
  Volume2,
  Sparkles,
  Sliders,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { RecordingState, TrackMetadata, AudioProcessingSettings } from '../types';
import { audioEngine } from '../utils/audioEngine';

import { audioBufferToWav } from '../utils/audioBufferToWav';

interface KaraokeRecordingBoothProps {
  currentTrack: TrackMetadata | null;
  settings: AudioProcessingSettings;
}

export const KaraokeRecordingBooth: React.FC<KaraokeRecordingBoothProps> = ({
  currentTrack,
  settings,
}) => {
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    recordingTime: 0,
    recordedBlob: null,
    recordedUrl: null,
    micVolume: 1.0,
    backingVolume: 0.8,
    reverbAmount: 0.3,
    echoAmount: 0.2,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      // Stop temporary track
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setHasMicPermission(false);
    }
  };

  const startRecording = async () => {
    if (!currentTrack) return;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);

      audioChunksRef.current = [];
      // Pick iOS and universal browser compatible recorder mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(micStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
        micStream.getTracks().forEach((track) => track.stop());

        // Decode audio data to convert into a 100% universal WAV Blob for iOS/Safari
        try {
          const arrayBuffer = await rawBlob.arrayBuffer();
          const ctx = audioEngine.getAudioContext();
          const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
          const wavBlob = audioBufferToWav(decodedBuffer);
          const audioUrl = URL.createObjectURL(wavBlob);
          setRecordingState((prev) => ({
            ...prev,
            isRecording: false,
            recordedBlob: wavBlob,
            recordedUrl: audioUrl,
          }));
        } catch (err) {
          console.warn('WAV conversion fallback:', err);
          const audioUrl = URL.createObjectURL(rawBlob);
          setRecordingState((prev) => ({
            ...prev,
            isRecording: false,
            recordedBlob: rawBlob,
            recordedUrl: audioUrl,
          }));
        }
      };

      // Start recording & backing track sync
      mediaRecorder.start(100);
      audioEngine.play(settings, false); // Play instrumental

      setRecordingState((prev) => ({
        ...prev,
        isRecording: true,
        recordingTime: 0,
        recordedBlob: null,
        recordedUrl: null,
      }));

      timerRef.current = window.setInterval(() => {
        setRecordingState((prev) => ({
          ...prev,
          recordingTime: prev.recordingTime + 1,
        }));
      }, 1000);
    } catch {
      setHasMicPermission(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioEngine.pause();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Karaoke Recording Studio & Vocal Booth
            </h2>
            <p className="text-xs text-slate-400">
              Sing over your custom instrumental track with live studio FX
            </p>
          </div>
        </div>

        {hasMicPermission === false && (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-950/50 border border-rose-900 px-3 py-1.5 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Microphone access required</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recording Controls Card */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Live Vocal Booth Status</span>
              </span>
              {recordingState.isRecording && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                  REC • {formatTime(recordingState.recordingTime)}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              {currentTrack
                ? `Ready to record vocals over: "${currentTrack.name}" (Instrumental Stem)`
                : 'Please load an audio track or demo song first.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!recordingState.isRecording ? (
              <button
                id="btn-start-record"
                disabled={!currentTrack}
                onClick={startRecording}
                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Mic className="w-4 h-4" />
                <span>Start Karaoke Vocal Recording</span>
              </button>
            ) : (
              <button
                id="btn-stop-record"
                onClick={stopRecording}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs rounded-xl border border-rose-800 transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording</span>
              </button>
            )}
          </div>

          {/* Recorded Performance Audio Preview */}
          {recordingState.recordedUrl && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Your Performance Recording Ready!</span>
                </span>
                <a
                  href={recordingState.recordedUrl}
                  download={`Karaoke_Performance_${Date.now()}.wav`}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Audio
                </a>
              </div>
              <audio src={recordingState.recordedUrl} controls className="w-full h-8" />
            </div>
          )}
        </div>

        {/* Live Studio Vocal FX Panel */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Studio Vocal FX & Monitor Mix</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Mic Gain */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Microphone Gain</span>
                <span className="font-mono text-cyan-400">{Math.round(recordingState.micVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={recordingState.micVolume}
                onChange={(e) =>
                  setRecordingState((prev) => ({ ...prev, micVolume: parseFloat(e.target.value) }))
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Backing Track Mix */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Backing Track Mix</span>
                <span className="font-mono text-indigo-400">{Math.round(recordingState.backingVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={recordingState.backingVolume}
                onChange={(e) =>
                  setRecordingState((prev) => ({ ...prev, backingVolume: parseFloat(e.target.value) }))
                }
                className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Vocal Reverb */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Vocal Reverb (Space)</span>
                <span className="font-mono text-amber-400">{Math.round(recordingState.reverbAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={recordingState.reverbAmount}
                onChange={(e) =>
                  setRecordingState((prev) => ({ ...prev, reverbAmount: parseFloat(e.target.value) }))
                }
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
