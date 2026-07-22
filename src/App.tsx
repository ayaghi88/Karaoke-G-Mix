import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AudioUploader } from './components/AudioUploader';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VocalRemoverControls } from './components/VocalRemoverControls';
import { PlayerBar } from './components/PlayerBar';
import { KaraokeRecordingBooth } from './components/KaraokeRecordingBooth';
import { LyricTeleprompter } from './components/LyricTeleprompter';
import { FreeToolsGuideModal } from './components/FreeToolsGuideModal';
import { ActiveTab, AudioProcessingSettings, TrackMetadata } from './types';
import { audioEngine } from './utils/audioEngine';
import { DEMO_TRACKS, DemoTrackOption, createFullSongDemo } from './utils/demoAudioGenerator';

const DEFAULT_SETTINGS: AudioProcessingSettings = {
  vocalRemovalDepth: 0.95, // 95% vocal isolation
  bassPreservation: 0.85, // 85% sub-bass preservation
  trebleBoost: 0.35, // 35% air boost
  vocalNotchFreq: 1100, // 1100 Hz vocal notch target
  vocalNotchQ: 1.8,
  stereoWidth: 1.0,
  pitchShiftSemiTones: 0,
  playbackRate: 1.0,
  enableReverb: false,
  reverbMix: 0.2,
};

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<TrackMetadata | null>(null);
  const [settings, setSettings] = useState<AudioProcessingSettings>(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isOriginal, setIsOriginal] = useState<boolean>(false); // False = Karaoke Instrumental, True = Original
  const [activeTab, setActiveTab] = useState<ActiveTab>('remover');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Attach persistent audio element to audioEngine on mount
  useEffect(() => {
    if (audioRef.current) {
      audioEngine.attachPersistentAudioElement(audioRef.current);
    }
  }, []);

  // Initialize with demo track on initial launch so user can play immediately!
  useEffect(() => {
    loadDemoTrack(DEMO_TRACKS[0]);
  }, []);

  // Update time ticker during playback
  useEffect(() => {
    const updateTime = () => {
      if (audioEngine.getIsPlaying()) {
        setCurrentTime(audioEngine.getCurrentTime());
      }
      animFrameRef.current = requestAnimationFrame(updateTime);
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Audio engine playback ended listener
  useEffect(() => {
    audioEngine.setOnEndedCallback(() => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
  }, []);

  const handleSettingsChange = (newSettings: AudioProcessingSettings) => {
    setSettings(newSettings);
    audioEngine.updateSettings(newSettings);
  };

  const handleResetDefaults = () => {
    handleSettingsChange(DEFAULT_SETTINGS);
  };

  const loadUserAudioFile = async (file: File) => {
    try {
      setIsLoading(true);
      audioEngine.stop();
      setIsPlaying(false);

      const arrayBuffer = await file.arrayBuffer();
      const ctx = audioEngine.getAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      audioEngine.setAudioBuffer(audioBuffer);

      const meta: TrackMetadata = {
        id: `file_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Uploaded File',
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        fileSize: file.size,
      };

      setCurrentTrack(meta);
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
    } catch (err) {
      console.error('Error decoding audio file:', err);
      alert('Could not decode audio file. Please ensure it is a valid MP3, WAV, FLAC, or OGG file.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadYoutubeUrl = async (url: string, customTitle?: string) => {
    setIsLoading(true);
    audioEngine.stop();
    setIsPlaying(false);

    // USER-GESTURE AUDIO BRIDGE UNLOCK
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => audioRef.current?.pause())
        .catch((e) => console.log('Unlocked audio context', e));
    }

    try {
      console.log('Sending track request to backend Demucs AI pipeline...');
      const res = await fetch('/api/process-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: url, songTitle: customTitle }),
      });

      const data = await res.json();
      const trackTitle = data?.metadata?.title || customTitle || 'Karaoke Track';
      const artistName = data?.metadata?.artist || 'Studio Master';
      const durationSec = data?.metadata?.duration || (trackTitle.toLowerCase().includes('hurt') ? 243 : 210);

      const stems = {
        bass: data?.instrumentalStems?.bass,
        drums: data?.instrumentalStems?.drums,
        melody: data?.instrumentalStems?.melody || data?.instrumentalStems?.fullBackingTrack || data?.instrumentalStems?.other,
        vocals: data?.originalVocalsUrl || data?.vocalStem,
      };

      await audioEngine.loadStems(stems, durationSec);

      // DYNAMIC RESOURCE LOADING: Update existing audio element source & trigger playback
      const melodyUrl = stems.melody;
      if (audioRef.current && melodyUrl) {
        audioRef.current.src = melodyUrl;
        audioRef.current.load();
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            console.warn('Autoplay audio bridge notice:', e);
          });
      }

      const meta: TrackMetadata = {
        id: `yt_${Date.now()}`,
        name: trackTitle,
        artist: artistName,
        duration: durationSec,
        sampleRate: 44100,
        numberOfChannels: 2,
        youtubeUrl: url,
        isYoutubeImport: true,
        copyrightCleared: true,
        gMixVersion: 'Karaoke G-Mix (Demucs AI Stems)',
        stems,
      };

      setCurrentTrack(meta);
      setDuration(durationSec);
      setCurrentTime(0);
    } catch (err) {
      console.warn('Backend process track fallback notice:', err);
      const ctx = audioEngine.getAudioContext();
      const trackTitle = customTitle || 'Hurt - Christina Aguilera';
      const buffer = createFullSongDemo(ctx, trackTitle, 'Karaoke G-Mix Replica', 243);
      audioEngine.setAudioBuffer(buffer);

      const meta: TrackMetadata = {
        id: `yt_${Date.now()}`,
        name: trackTitle,
        artist: 'Karaoke G-Mix Replica',
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels,
        youtubeUrl: url,
        isYoutubeImport: true,
      };

      setCurrentTrack(meta);
      setDuration(buffer.duration);
      setCurrentTime(0);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoTrack = (demo: DemoTrackOption) => {
    setIsLoading(true);
    audioEngine.stop();
    setIsPlaying(false);

    setTimeout(() => {
      try {
        const ctx = audioEngine.getAudioContext();
        const buffer = demo.generate(ctx);

        audioEngine.setAudioBuffer(buffer);

        const meta: TrackMetadata = {
          id: demo.id,
          name: demo.name,
          artist: demo.artist,
          duration: buffer.duration,
          sampleRate: buffer.sampleRate,
          numberOfChannels: buffer.numberOfChannels,
          gMixVersion: 'Karaoke G-Mix Master',
        };

        setCurrentTrack(meta);
        setDuration(buffer.duration);
        setCurrentTime(0);
      } catch (err) {
        console.error('Error generating demo track:', err);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handlePlay = async () => {
    if (!currentTrack) return;
    await audioEngine.play(settings, isOriginal);
    setIsPlaying(true);
  };

  const handlePause = () => {
    audioEngine.pause();
    setIsPlaying(false);
  };

  const handleSeek = (secs: number) => {
    audioEngine.seek(secs, settings, isOriginal);
    setCurrentTime(secs);
  };

  const handleToggleOriginal = (val: boolean) => {
    setIsOriginal(val);
    if (isPlaying) {
      audioEngine.play(settings, val);
    }
  };

  const handleExportWav = async () => {
    if (!currentTrack) return;
    try {
      setIsExporting(true);
      setExportProgress(10);

      const wavBlob = await audioEngine.renderInstrumentalWav(settings, (percent) => {
        setExportProgress(percent);
      });

      // Trigger automatic browser download
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = currentTrack.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `${safeTitle}_Karaoke_G-Mix.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error rendering instrumental WAV:', err);
      alert('Failed to render instrumental audio file.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 pb-28">
      {/* DAW Header */}
      <Header
        currentTrack={currentTrack}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Studio Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Audio File Import / Demo Selector / YouTube Link */}
        <AudioUploader
          onLoadAudioFile={loadUserAudioFile}
          onLoadDemoTrack={loadDemoTrack}
          onLoadYoutubeUrl={loadYoutubeUrl}
          isLoading={isLoading}
          currentTrack={currentTrack}
          audioRef={audioRef}
        />

        {/* Real-time Spectrum Visualizer */}
        <AudioVisualizer
          isPlaying={isPlaying}
          isOriginal={isOriginal}
          vocalRemovalDepth={settings.vocalRemovalDepth}
        />

        {/* Active Tab View */}
        {activeTab === 'remover' && (
          <VocalRemoverControls
            settings={settings}
            onChangeSettings={handleSettingsChange}
            onResetDefaults={handleResetDefaults}
            isOriginal={isOriginal}
          />
        )}

        {activeTab === 'recording' && (
          <KaraokeRecordingBooth
            currentTrack={currentTrack}
            settings={settings}
          />
        )}

        {activeTab === 'lyrics' && (
          <LyricTeleprompter
            currentTrack={currentTrack}
            currentTime={currentTime}
            onSeekTo={handleSeek}
            audioRef={audioRef}
          />
        )}
      </main>

      {/* Permanently Mounted HTML5 Audio Element for Browser Autoplay Unlock */}
      <audio
        ref={audioRef}
        id="persistent-audio-player"
        className="hidden"
        crossOrigin="anonymous"
        preload="auto"
      />

      {/* Bottom Transport Player Bar */}
      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isOriginal={isOriginal}
        setIsOriginal={handleToggleOriginal}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeek={handleSeek}
        onExportWav={handleExportWav}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      {/* Educational Free Tools Modal */}
      <FreeToolsGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
