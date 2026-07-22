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

  // Unified SINGLE HTML5 Audio Element to bypass browser autoplay policies & sync drift
  private singleAudio: HTMLAudioElement | null = null;
  private singleMediaSource: MediaElementAudioSourceNode | null = null;

  private vocalsAudio: HTMLAudioElement | null = null;
  private vocalsMediaSource: MediaElementAudioSourceNode | null = null;
  private vocalsGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private isOriginalSolo: boolean = false;
  private pausedAt: number = 0;
  private trackDuration: number = 0;
  private onEndedCallback: (() => void) | null = null;

  // Fallback AudioBuffer for Web Audio synthesis or local file decoding
  private audioBuffer: AudioBuffer | null = null;
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private bufferStartTime: number = 0;

  constructor() {
    // Lazily initialized on user interaction
  }

  public getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx({ latencyHint: 'interactive' });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public attachPersistentAudioElement(element: HTMLAudioElement) {
    if (!element) return;
    this.singleAudio = element;
    this.singleAudio.crossOrigin = 'anonymous';
    this.singleAudio.preload = 'auto';

    this.singleAudio.onended = () => {
      if (this.isPlaying) {
        this.handleTrackEnded();
      }
    };

    const ctx = this.getAudioContext();
    this.initMasterNodes();

    try {
      if (!this.singleMediaSource) {
        this.singleMediaSource = ctx.createMediaElementSource(this.singleAudio);
        if (this.masterGain) {
          this.singleMediaSource.connect(this.masterGain);
        }
      }
    } catch (err) {
      console.warn('MediaElementSource initialization info:', err);
    }
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

  private setupSingleAudioElement() {
    if (!this.singleAudio) {
      this.singleAudio = new Audio();
      this.singleAudio.crossOrigin = 'anonymous';
      this.singleAudio.preload = 'auto';

      this.singleAudio.addEventListener('ended', () => {
        if (this.isPlaying) {
          this.handleTrackEnded();
        }
      });

      const ctx = this.getAudioContext();
      this.initMasterNodes();

      try {
        this.singleMediaSource = ctx.createMediaElementSource(this.singleAudio);
        if (this.masterGain) {
          this.singleMediaSource.connect(this.masterGain);
        }
      } catch (err) {
        console.warn('MediaElementSource initialization info:', err);
      }
    }
  }

  /**
   * Loads clean backing track stems or combines Demucs (bass.wav, drums.wav, other.wav) 
   * into ONE pristine merged audio stream / Blob URL for the single HTML5 audio node.
   */
  public async loadStems(stems: MultiTrackStems, durationSeconds: number = 210) {
    this.stop();
    this.audioBuffer = null;
    this.trackDuration = durationSeconds;
    this.setupSingleAudioElement();

    const backingUrl = stems.fullBackingTrack || stems.melody;

    // Check if we need to fetch & merge individual stem files into a single AudioBuffer
    if (!backingUrl && (stems.bass || stems.drums || stems.melody)) {
      try {
        const ctx = this.getAudioContext();
        const urls = [stems.bass, stems.drums, stems.melody].filter((u): u is string => Boolean(u));
        const buffers: AudioBuffer[] = [];

        for (const url of urls) {
          const res = await fetch(url);
          const arrayBuf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          buffers.push(decoded);
        }

        if (buffers.length > 0) {
          const maxChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
          const maxLen = Math.max(...buffers.map((b) => b.length));
          const sampleRate = buffers[0].sampleRate;

          const offlineCtx = new OfflineAudioContext(maxChannels, maxLen, sampleRate);
          buffers.forEach((buf) => {
            const src = offlineCtx.createBufferSource();
            src.buffer = buf;
            src.connect(offlineCtx.destination);
            src.start(0);
          });

          const mergedBuffer = await offlineCtx.startRendering();
          this.audioBuffer = mergedBuffer;
          this.trackDuration = mergedBuffer.duration;

          const wavBlob = audioBufferToWav(mergedBuffer);
          const blobUrl = URL.createObjectURL(wavBlob);
          if (this.singleAudio) {
            this.singleAudio.src = blobUrl;
          }
        }
      } catch (err) {
        console.warn('Stem merger fallback to stream URL:', err);
        if (this.singleAudio && backingUrl) {
          this.singleAudio.src = backingUrl;
        }
      }
    } else if (this.singleAudio && backingUrl) {
      this.singleAudio.src = backingUrl;
    }

    // Setup vocals audio element if vocal stem is provided
    if (stems.vocals) {
      if (!this.vocalsAudio) {
        this.vocalsAudio = new Audio();
        this.vocalsAudio.crossOrigin = 'anonymous';
        this.vocalsAudio.preload = 'auto';

        const ctx = this.getAudioContext();
        try {
          this.vocalsMediaSource = ctx.createMediaElementSource(this.vocalsAudio);
          this.vocalsGain = ctx.createGain();
          this.vocalsMediaSource.connect(this.vocalsGain);
          if (this.masterGain) {
            this.vocalsGain.connect(this.masterGain);
          }
        } catch {}
      }
      this.vocalsAudio.src = stems.vocals;
      if (this.vocalsGain) {
        this.vocalsGain.gain.value = this.isOriginalSolo ? 1.0 : 0.0;
      }
    }

    this.pausedAt = 0;
  }

  public setAudioBuffer(buffer: AudioBuffer) {
    this.stop();
    this.audioBuffer = buffer;
    this.trackDuration = buffer.duration;

    this.setupSingleAudioElement();
    if (this.singleAudio) {
      const wavBlob = audioBufferToWav(buffer);
      this.singleAudio.src = URL.createObjectURL(wavBlob);
    }

    this.pausedAt = 0;
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  public setOnEndedCallback(cb: () => void) {
    this.onEndedCallback = cb;
  }

  /**
   * Master playback function triggered directly on user button click gesture.
   */
  public play(settings: AudioProcessingSettings, isOriginal: boolean = false) {
    const ctx = this.getAudioContext();
    this.initMasterNodes();
    this.isOriginalSolo = isOriginal;

    this.setupSingleAudioElement();

    if (this.vocalsAudio && this.vocalsGain) {
      this.vocalsGain.gain.value = isOriginal ? 1.0 : 0.0;
      this.vocalsAudio.volume = isOriginal ? 1.0 : 0.0;
      this.vocalsAudio.currentTime = this.pausedAt;
      this.vocalsAudio.playbackRate = settings.playbackRate;
      this.vocalsAudio.play().catch(() => {});
    }

    if (this.singleAudio && this.singleAudio.src) {
      this.singleAudio.currentTime = this.pausedAt;
      this.singleAudio.playbackRate = settings.playbackRate;

      this.singleAudio
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch((err) => {
          console.warn('HTML5 single audio playback notice:', err);
          this.playFallbackBuffer(settings);
        });

      this.isPlaying = true;
      return;
    }

    this.playFallbackBuffer(settings);
  }

  private playFallbackBuffer(settings: AudioProcessingSettings) {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();

    this.stopBufferSource();

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

  public pause() {
    this.pausedAt = this.getCurrentTime();

    if (this.singleAudio) {
      this.singleAudio.pause();
    }
    if (this.vocalsAudio) {
      this.vocalsAudio.pause();
    }

    this.stopBufferSource();
    this.isPlaying = false;
  }

  public stop() {
    this.pause();
    this.pausedAt = 0;

    if (this.singleAudio) {
      this.singleAudio.currentTime = 0;
    }
    if (this.vocalsAudio) {
      this.vocalsAudio.currentTime = 0;
    }
  }

  public seek(seconds: number, settings?: AudioProcessingSettings, isOriginal?: boolean) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.pause();
    }

    this.pausedAt = Math.max(0, Math.min(seconds, this.getDuration()));

    if (this.singleAudio) {
      this.singleAudio.currentTime = this.pausedAt;
    }
    if (this.vocalsAudio) {
      this.vocalsAudio.currentTime = this.pausedAt;
    }

    if (wasPlaying) {
      this.play(
        settings || {
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
        },
        isOriginal ?? this.isOriginalSolo
      );
    }
  }

  public getCurrentTime(): number {
    if (this.singleAudio && !isNaN(this.singleAudio.currentTime) && this.singleAudio.currentTime > 0) {
      return this.singleAudio.currentTime;
    }

    if (this.audioBuffer && this.isPlaying && this.audioCtx) {
      const elapsed = this.audioCtx.currentTime - this.bufferStartTime;
      return Math.min(elapsed, this.audioBuffer.duration);
    }

    return this.pausedAt;
  }

  public getDuration(): number {
    if (this.singleAudio && !isNaN(this.singleAudio.duration) && this.singleAudio.duration > 0) {
      return this.singleAudio.duration;
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
    if (this.singleAudio) {
      this.singleAudio.playbackRate = settings.playbackRate;
    }
    if (this.vocalsAudio) {
      this.vocalsAudio.playbackRate = settings.playbackRate;
    }
    if (this.bufferSourceNode && this.audioCtx) {
      this.bufferSourceNode.playbackRate.setValueAtTime(settings.playbackRate, this.audioCtx.currentTime);
    }
  }

  public setStemVolume(stemKey: 'bass' | 'drums' | 'melody' | 'vocals', volume: number) {
    if (stemKey === 'vocals' && this.vocalsGain) {
      this.vocalsGain.gain.value = this.isOriginalSolo ? volume : 0.0;
    }
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
      } catch {}
      this.bufferSourceNode = null;
    }
  }

  public async renderInstrumentalWav(
    settings: AudioProcessingSettings,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    if (onProgress) onProgress(30);

    const dur = this.getDuration();
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * dur, sampleRate);

    if (this.audioBuffer) {
      const src = offlineCtx.createBufferSource();
      src.buffer = this.audioBuffer;
      src.connect(offlineCtx.destination);
      src.start(0);
    } else {
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
