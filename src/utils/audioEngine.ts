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
  private instrumentalBuffer: AudioBuffer | null = null;
  private bufferSourceNode: AudioBufferSourceNode | null = null;
  private bufferStartTime: number = 0;

  // DSP Vocal Removal Nodes
  private directGain: GainNode | null = null;
  private vocalRemovedGain: GainNode | null = null;
  private notchFilter: BiquadFilterNode | null = null;
  private bassGain: GainNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;

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

    if (backingUrl) {
      try {
        const ctx = this.getAudioContext();
        const res = await fetch(backingUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          this.audioBuffer = decoded;
          this.trackDuration = decoded.duration;
        }
      } catch (err) {
        console.warn('Backing track decode notice, using singleAudio fallback:', err);
      }
    } else if (stems.bass || stems.drums || stems.melody) {
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
    this.setAudioBuffers(buffer, buffer);
  }

  public setAudioBuffers(originalBuffer: AudioBuffer, instrumentalBuffer?: AudioBuffer) {
    this.stop();
    this.audioBuffer = originalBuffer;
    this.instrumentalBuffer = instrumentalBuffer || originalBuffer;
    this.trackDuration = originalBuffer.duration;

    this.setupSingleAudioElement();
    if (this.singleAudio) {
      const wavBlob = audioBufferToWav(originalBuffer);
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

  private disconnectDSPGraph() {
    if (this.directGain) {
      try { this.directGain.disconnect(); } catch (e) {}
      this.directGain = null;
    }
    if (this.vocalRemovedGain) {
      try { this.vocalRemovedGain.disconnect(); } catch (e) {}
      this.vocalRemovedGain = null;
    }
    if (this.notchFilter) {
      try { this.notchFilter.disconnect(); } catch (e) {}
      this.notchFilter = null;
    }
    if (this.trebleFilter) {
      try { this.trebleFilter.disconnect(); } catch (e) {}
      this.trebleFilter = null;
    }
    if (this.bassGain) {
      try { this.bassGain.disconnect(); } catch (e) {}
      this.bassGain = null;
    }
  }

  public setOriginalMode(isOriginal: boolean, settings: AudioProcessingSettings) {
    this.isOriginalSolo = isOriginal;
    const ctx = this.audioCtx;
    if (!ctx) return;

    const now = ctx.currentTime;
    if (this.directGain) {
      this.directGain.gain.setValueAtTime(isOriginal ? 1.0 : 0.0, now);
    }
    if (this.vocalRemovedGain) {
      const remGain = isOriginal ? 0.0 : Math.min(1.0, settings.vocalRemovalDepth || 0.95);
      this.vocalRemovedGain.gain.setValueAtTime(remGain, now);
    }
  }

  private connectSourceToDSPGraph(
    sourceNode: AudioNode,
    settings: AudioProcessingSettings,
    isOriginal: boolean
  ) {
    const ctx = this.getAudioContext();
    this.initMasterNodes();
    this.disconnectDSPGraph();

    if (!this.masterGain) return;

    // 1. Direct path for Original Song (Contains full vocals and lyrics)
    this.directGain = ctx.createGain();
    this.directGain.gain.setValueAtTime(isOriginal ? 1.0 : 0.0, ctx.currentTime);
    sourceNode.connect(this.directGain);
    this.directGain.connect(this.masterGain);

    // 2. Vocal Removal Path for Karaoke Instrumental Mode (Cancels center-panned vocals)
    this.vocalRemovedGain = ctx.createGain();
    const targetRemGain = isOriginal ? 0.0 : Math.min(1.0, settings.vocalRemovalDepth || 0.95);
    this.vocalRemovedGain.gain.setValueAtTime(targetRemGain, ctx.currentTime);

    // Splitter into Left (0) and Right (1) channels
    const splitter = ctx.createChannelSplitter(2);
    sourceNode.connect(splitter);

    // Invert Right channel phase
    const rightInverter = ctx.createGain();
    rightInverter.gain.setValueAtTime(-1.0, ctx.currentTime);
    splitter.connect(rightInverter, 1);

    // Subtractor merger: L + (-R) = L - R (cancels center-panned vocals)
    const subtractorMerger = ctx.createChannelMerger(2);
    splitter.connect(subtractorMerger, 0, 0);       // Left channel -> Left
    rightInverter.connect(subtractorMerger, 0, 0);  // -Right channel -> Left
    splitter.connect(subtractorMerger, 0, 1);       // Left channel -> Right
    rightInverter.connect(subtractorMerger, 0, 1);  // -Right channel -> Right

    // Vocal Notch Filter
    this.notchFilter = ctx.createBiquadFilter();
    this.notchFilter.type = 'notch';
    this.notchFilter.frequency.setValueAtTime(settings.vocalNotchFreq || 1100, ctx.currentTime);
    this.notchFilter.Q.setValueAtTime(settings.vocalNotchQ || 1.8, ctx.currentTime);
    subtractorMerger.connect(this.notchFilter);

    // Treble Air Boost Filter
    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.setValueAtTime(6000, ctx.currentTime);
    const trebleDb = (settings.trebleBoost || 0.35) * 6;
    this.trebleFilter.gain.setValueAtTime(trebleDb, ctx.currentTime);
    this.notchFilter.connect(this.trebleFilter);
    this.trebleFilter.connect(this.vocalRemovedGain);

    // Sub-Bass Preservation Path (< 120Hz) - Connected to subtractorMerger to ensure NO un-canceled vocal leaks
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(120, ctx.currentTime);
    bassFilter.Q.setValueAtTime(0.707, ctx.currentTime);

    this.bassGain = ctx.createGain();
    const bassLevel = settings.bassPreservation !== undefined ? settings.bassPreservation : 0.85;
    this.bassGain.gain.setValueAtTime(bassLevel, ctx.currentTime);

    subtractorMerger.connect(bassFilter);
    bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.vocalRemovedGain);

    this.vocalRemovedGain.connect(this.masterGain);
  }

  /**
   * Master playback function triggered directly on user button click gesture.
   */
  public async play(settings: AudioProcessingSettings, isOriginal: boolean = false) {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume notice:', e);
      }
    }
    this.initMasterNodes();
    this.setOriginalMode(isOriginal, settings);

    if (this.vocalsAudio && this.vocalsGain) {
      this.vocalsGain.gain.value = isOriginal ? 1.0 : 0.0;
      this.vocalsAudio.volume = isOriginal ? 1.0 : 0.0;
      this.vocalsAudio.currentTime = this.pausedAt;
      this.vocalsAudio.playbackRate = settings.playbackRate;
      this.vocalsAudio.play().catch(() => {});
    }

    if (this.audioBuffer) {
      this.playFallbackBuffer(settings, isOriginal);
      this.isPlaying = true;
      return;
    }

    if (this.singleAudio && this.singleAudio.src) {
      this.singleAudio.currentTime = this.pausedAt;
      this.singleAudio.playbackRate = settings.playbackRate;

      try {
        await this.singleAudio.play();
        this.isPlaying = true;
      } catch (err) {
        console.warn('HTML5 single audio playback notice:', err);
      }
    }
  }

  private playFallbackBuffer(settings: AudioProcessingSettings, isOriginal: boolean = false) {
    const activeBuf = (!isOriginal && this.instrumentalBuffer) ? this.instrumentalBuffer : this.audioBuffer;
    if (!activeBuf) return;
    const ctx = this.getAudioContext();

    this.stopBufferSource();

    this.bufferSourceNode = ctx.createBufferSource();
    this.bufferSourceNode.buffer = activeBuf;
    this.bufferSourceNode.playbackRate.value = settings.playbackRate;

    // Connect source through live DSP vocal removal graph
    this.connectSourceToDSPGraph(this.bufferSourceNode, settings, isOriginal);

    const offset = this.pausedAt % activeBuf.duration;
    this.bufferStartTime = ctx.currentTime - offset;
    this.bufferSourceNode.start(0, offset);

    this.isPlaying = true;

    this.bufferSourceNode.onended = () => {
      if (this.isPlaying && ctx.currentTime - this.bufferStartTime >= (activeBuf.duration || 0) / settings.playbackRate) {
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
    if (this.bufferSourceNode && this.isPlaying && this.audioCtx && this.audioBuffer) {
      const elapsed = this.audioCtx.currentTime - this.bufferStartTime;
      return Math.min(Math.max(0, elapsed), this.audioBuffer.duration);
    }

    if (this.singleAudio && !this.singleAudio.paused && !isNaN(this.singleAudio.currentTime) && this.singleAudio.currentTime > 0) {
      return this.singleAudio.currentTime;
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
    if (this.notchFilter && this.audioCtx) {
      this.notchFilter.frequency.setValueAtTime(settings.vocalNotchFreq || 1100, this.audioCtx.currentTime);
      this.notchFilter.Q.setValueAtTime(settings.vocalNotchQ || 1.8, this.audioCtx.currentTime);
    }
    if (this.bassGain && this.audioCtx) {
      this.bassGain.gain.setValueAtTime(settings.bassPreservation !== undefined ? settings.bassPreservation : 0.85, this.audioCtx.currentTime);
    }
    if (this.vocalRemovedGain && this.audioCtx && !this.isOriginalSolo) {
      this.vocalRemovedGain.gain.setValueAtTime(Math.min(1.0, settings.vocalRemovalDepth || 0.95), this.audioCtx.currentTime);
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
    if (onProgress) onProgress(20);

    const dur = this.getDuration();
    const sampleRate = 44100;
    const totalFrames = Math.ceil(sampleRate * Math.max(1, dur));
    const offlineCtx = new OfflineAudioContext(2, totalFrames, sampleRate);

    const exportBuf = this.instrumentalBuffer || this.audioBuffer;
    if (exportBuf) {
      const src = offlineCtx.createBufferSource();
      src.buffer = exportBuf;

      const vocalRemovedGain = offlineCtx.createGain();
      vocalRemovedGain.gain.value = 1.0;

      const splitter = offlineCtx.createChannelSplitter(2);
      src.connect(splitter);

      const rightInverter = offlineCtx.createGain();
      rightInverter.gain.value = -1.0;
      splitter.connect(rightInverter, 1);

      const subtractorMerger = offlineCtx.createChannelMerger(2);
      splitter.connect(subtractorMerger, 0, 0);
      rightInverter.connect(subtractorMerger, 0, 0);
      splitter.connect(subtractorMerger, 0, 1);
      rightInverter.connect(subtractorMerger, 0, 1);

      const notchFilter = offlineCtx.createBiquadFilter();
      notchFilter.type = 'notch';
      notchFilter.frequency.value = settings.vocalNotchFreq || 1100;
      notchFilter.Q.value = settings.vocalNotchQ || 1.8;
      subtractorMerger.connect(notchFilter);

      const trebleFilter = offlineCtx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 6000;
      trebleFilter.gain.value = (settings.trebleBoost || 0.35) * 6;
      notchFilter.connect(trebleFilter);
      trebleFilter.connect(vocalRemovedGain);

      const bassFilter = offlineCtx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 120;
      const bassGain = offlineCtx.createGain();
      bassGain.gain.value = settings.bassPreservation !== undefined ? settings.bassPreservation : 0.85;
      subtractorMerger.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(vocalRemovedGain);

      vocalRemovedGain.connect(offlineCtx.destination);
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
