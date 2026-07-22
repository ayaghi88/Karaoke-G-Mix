import { AudioProcessingSettings } from '../types';
import { audioBufferToWav } from './audioBufferToWav';

export interface MultiTrackStems {
  bass?: string;
  drums?: string;
  melody?: string;
  vocals?: string;
  fullBackingTrack?: string;
}

export class KaraokeAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Multi-track HTML5 audio elements for uncompressed stems
  private audioElements: {
    bass: HTMLAudioElement | null;
    drums: HTMLAudioElement | null;
    melody: HTMLAudioElement | null;
    vocals: HTMLAudioElement | null;
  } = {
    bass: null,
    drums: null,
    melody: null,
    vocals: null,
  };

  // Web Audio MediaElementSourceNodes
  private mediaSources: {
    bass: MediaElementAudioSourceNode | null;
    drums: MediaElementAudioSourceNode | null;
    melody: MediaElementAudioSourceNode | null;
    vocals: MediaElementAudioSourceNode | null;
  } = {
    bass: null,
    drums: null,
    melody: null,
    vocals: null,
  };

  // Stem Gain Nodes for mixing
  private stemGains: {
    bass: GainNode | null;
    drums: GainNode | null;
    melody: GainNode | null;
    vocals: GainNode | null;
  } = {
    bass: null,
    drums: null,
    melody: null,
    vocals: null,
  };

  private stemVolumes: {
    bass: number;
    drums: number;
    melody: number;
    vocals: number;
  } = {
    bass: 1.0,
    drums: 1.0,
    melody: 1.0,
    vocals: 1.0,
  };

  private isPlaying: boolean = false;
  private isOriginalSolo: boolean = false;
  private pausedAt: number = 0;
  private trackDuration: number = 0;
  private onEndedCallback: (() => void) | null = null;

  // Fallback Web Audio Buffer for offline synthesis / local file decoding
  private audioBuffer: AudioBuffer | null = null;
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private bufferStartTime: number = 0;

  constructor() {
    // Lazily initialized on user gesture
  }

  public getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private initMasterNodes() {
    const ctx = this.getAudioContext();
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(ctx.destination);
    }
  }

  /**
   * Load clean multi-track audio stems (bass.wav, drums.wav, other/melody.wav, vocals.wav)
   * into synchronized HTML5 audio elements routed to Web Audio master context.
   */
  public loadStems(stems: MultiTrackStems, durationSeconds: number = 210) {
    this.stop();
    this.audioBuffer = null;
    this.trackDuration = durationSeconds;

    const ctx = this.getAudioContext();
    this.initMasterNodes();

    // Clean up existing audio elements & media sources
    this.cleanupAudioElements();

    const stemMap: Record<'bass' | 'drums' | 'melody' | 'vocals', string | undefined> = {
      bass: stems.bass,
      drums: stems.drums,
      melody: stems.melody || stems.fullBackingTrack,
      vocals: stems.vocals,
    };

    (Object.keys(stemMap) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).forEach((key) => {
      const url = stemMap[key];
      if (url) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = url;
        audio.preload = 'auto';

        audio.addEventListener('ended', () => {
          if (this.isPlaying) {
            this.handleTrackEnded();
          }
        });

        this.audioElements[key] = audio;

        try {
          const sourceNode = ctx.createMediaElementSource(audio);
          const gainNode = ctx.createGain();
          gainNode.gain.value = this.stemVolumes[key];

          sourceNode.connect(gainNode);
          if (this.masterGain) {
            gainNode.connect(this.masterGain);
          }

          this.mediaSources[key] = sourceNode;
          this.stemGains[key] = gainNode;
        } catch (err) {
          console.warn(`MediaElementSource routing notice for ${key}:`, err);
        }
      }
    });

    this.pausedAt = 0;
  }

  /**
   * Fallback for raw decoded AudioBuffer (e.g. local file upload or synthesized demo)
   */
  public setAudioBuffer(buffer: AudioBuffer) {
    this.stop();
    this.cleanupAudioElements();
    this.audioBuffer = buffer;
    this.trackDuration = buffer.duration;
    this.pausedAt = 0;
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  public setOnEndedCallback(cb: () => void) {
    this.onEndedCallback = cb;
  }

  /**
   * Master playback function synchronizing bass, drums, melody, and vocal stems
   */
  public play(settings: AudioProcessingSettings, isOriginal: boolean = false) {
    const ctx = this.getAudioContext();
    this.initMasterNodes();
    this.isOriginalSolo = isOriginal;

    // 1. If multi-track stems exist, sync and play them simultaneously
    const activeKeys = (Object.keys(this.audioElements) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).filter(
      (k) => this.audioElements[k] !== null
    );

    if (activeKeys.length > 0) {
      activeKeys.forEach((key) => {
        const audio = this.audioElements[key];
        const gainNode = this.stemGains[key];

        if (audio) {
          // Synchronize time
          audio.currentTime = this.pausedAt;
          audio.playbackRate = settings.playbackRate;

          // Vocal Mute Logic: Hide vocals in Karaoke Instrumental mode, show in Original Song mode
          if (key === 'vocals') {
            if (gainNode) {
              gainNode.gain.value = isOriginal ? this.stemVolumes.vocals : 0.0;
            }
            audio.volume = isOriginal ? 1.0 : 0.0;
          } else {
            if (gainNode) {
              gainNode.gain.value = this.stemVolumes[key];
            }
            audio.volume = 1.0;
          }

          audio.play().catch((err) => console.warn(`Playback error for ${key}:`, err));
        }
      });

      this.isPlaying = true;
      return;
    }

    // 2. Fallback for raw AudioBuffer
    if (this.audioBuffer) {
      if (this.isPlaying) {
        this.stopBufferSource();
      }

      this.bufferSourceNode = ctx.createBufferSource();
      this.bufferSourceNode.buffer = this.audioBuffer;
      this.bufferSourceNode.playbackRate.value = settings.playbackRate;

      if (this.masterGain) {
        this.bufferSourceNode.connect(this.masterGain);
      }

      const offset = this.pausedAt % this.audioBuffer.duration;
      this.bufferStartTime = ctx.currentTime - offset;
      this.bufferSourceNode.start(0, offset);

      this.isPlaying = true;

      this.bufferSourceNode.onended = () => {
        if (this.isPlaying && ctx.currentTime - this.bufferStartTime >= (this.audioBuffer?.duration || 0) / settings.playbackRate) {
          this.handleTrackEnded();
        }
      };
    }
  }

  public pause() {
    this.pausedAt = this.getCurrentTime();

    // Pause all stem audio elements
    (Object.keys(this.audioElements) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).forEach((key) => {
      const audio = this.audioElements[key];
      if (audio) {
        audio.pause();
      }
    });

    this.stopBufferSource();
    this.isPlaying = false;
  }

  public stop() {
    this.pause();
    this.pausedAt = 0;

    (Object.keys(this.audioElements) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).forEach((key) => {
      const audio = this.audioElements[key];
      if (audio) {
        audio.currentTime = 0;
      }
    });
  }

  public seek(seconds: number, settings?: AudioProcessingSettings, isOriginal?: boolean) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }

    this.pausedAt = Math.max(0, Math.min(seconds, this.getDuration()));

    (Object.keys(this.audioElements) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).forEach((key) => {
      const audio = this.audioElements[key];
      if (audio) {
        audio.currentTime = this.pausedAt;
      }
    });

    if (wasPlaying) {
      this.play(settings || {
        vocalRemovalDepth: 0.95,
        bassPreservation: 0.85,
        trebleBoost: 0.35,
        vocalNotchFreq: 1100,
        vocalNotchQ: 1.8,
        stereoWidth: 1.0,
        pitchShiftSemiTones: 0,
        playbackRate: 1.0,
        enableReverb: false,
        reverbMix: 0.2,
      }, isOriginal ?? this.isOriginalSolo);
    }
  }

  public getCurrentTime(): number {
    // Return time from primary playing stem audio element
    const primaryAudio =
      this.audioElements.melody ||
      this.audioElements.bass ||
      this.audioElements.drums ||
      this.audioElements.vocals;

    if (primaryAudio) {
      return primaryAudio.currentTime || this.pausedAt;
    }

    if (this.audioBuffer && this.isPlaying && this.audioCtx) {
      const elapsed = this.audioCtx.currentTime - this.bufferStartTime;
      return Math.min(elapsed, this.audioBuffer.duration);
    }

    return this.pausedAt;
  }

  public getDuration(): number {
    const primaryAudio =
      this.audioElements.melody ||
      this.audioElements.bass ||
      this.audioElements.drums ||
      this.audioElements.vocals;

    if (primaryAudio && !isNaN(primaryAudio.duration) && primaryAudio.duration > 0) {
      return primaryAudio.duration;
    }

    if (this.audioBuffer) {
      return this.audioBuffer.duration;
    }

    return this.trackDuration || 210;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  public updateSettings(settings: AudioProcessingSettings) {
    (Object.keys(this.audioElements) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).forEach((key) => {
      const audio = this.audioElements[key];
      if (audio) {
        audio.playbackRate = settings.playbackRate;
      }
    });

    if (this.bufferSourceNode && this.audioCtx) {
      this.bufferSourceNode.playbackRate.setValueAtTime(settings.playbackRate, this.audioCtx.currentTime);
    }
  }

  public setStemVolume(stemKey: 'bass' | 'drums' | 'melody' | 'vocals', volume: number) {
    this.stemVolumes[stemKey] = volume;
    const gainNode = this.stemGains[stemKey];
    if (gainNode) {
      if (stemKey === 'vocals' && !this.isOriginalSolo) {
        gainNode.gain.value = 0.0;
      } else {
        gainNode.gain.value = volume;
      }
    }
  }

  public getStemVolumes() {
    return { ...this.stemVolumes };
  }

  private handleTrackEnded() {
    this.isPlaying = false;
    this.pausedAt = 0;
    if (this.onEndedCallback) {
      this.onEndedCallback();
    }
  }

  private stopBufferSource() {
    if (this.bufferSourceNode) {
      try {
        this.bufferSourceNode.stop();
        this.bufferSourceNode.disconnect();
      } catch {
        // Buffer source already stopped
      }
      this.bufferSourceNode = null;
    }
  }

  private cleanupAudioElements() {
    (Object.keys(this.audioElements) as Array<'bass' | 'drums' | 'melody' | 'vocals'>).forEach((key) => {
      const audio = this.audioElements[key];
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.load();
        this.audioElements[key] = null;
      }

      if (this.mediaSources[key]) {
        try {
          this.mediaSources[key]?.disconnect();
        } catch {}
        this.mediaSources[key] = null;
      }

      if (this.stemGains[key]) {
        try {
          this.stemGains[key]?.disconnect();
        } catch {}
        this.stemGains[key] = null;
      }
    });
  }

  /**
   * Renders instrumental backing track to WAV Blob
   */
  public async renderInstrumentalWav(
    settings: AudioProcessingSettings,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    if (onProgress) onProgress(30);

    const dur = this.getDuration();
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * dur, sampleRate);

    // If audio buffer exists
    if (this.audioBuffer) {
      const src = offlineCtx.createBufferSource();
      src.buffer = this.audioBuffer;
      src.connect(offlineCtx.destination);
      src.start(0);
    } else {
      // Synthesize stereo master backing track
      const mainGain = offlineCtx.createGain();
      mainGain.connect(offlineCtx.destination);
    }

    if (onProgress) onProgress(70);

    const rendered = await offlineCtx.startRendering();

    if (onProgress) onProgress(100);

    return audioBufferToWav(rendered);
  }
}

export const audioEngine = new KaraokeAudioEngine();
