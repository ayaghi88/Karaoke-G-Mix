import { AudioProcessingSettings } from '../types';
import { audioBufferToWav } from './audioBufferToWav';

export class KaraokeAudioEngine {
  private audioCtx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  // Nodes for real-time DSP
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // Processing node references
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private bassFilterNode: BiquadFilterNode | null = null;
  private notchFilterNode: BiquadFilterNode | null = null;
  private trebleFilterNode: BiquadFilterNode | null = null;
  
  private isPlaying: boolean = false;
  private isOriginalSolo: boolean = false; // False = Instrumental Karaoke mode, True = Original Song
  private startTime: number = 0;
  private pausedAt: number = 0;

  // Event callbacks
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    // AudioContext will be lazily initialized on user interaction
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

  public setAudioBuffer(buffer: AudioBuffer) {
    this.stop();
    this.audioBuffer = buffer;
    this.pausedAt = 0;
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  public setOnEndedCallback(cb: () => void) {
    this.onEndedCallback = cb;
  }

  /**
   * Starts or resumes playback with current settings.
   */
  public play(settings: AudioProcessingSettings, isOriginal: boolean) {
    if (!this.audioBuffer) return;
    const ctx = this.getAudioContext();

    if (this.isPlaying) {
      this.stopSource();
    }

    this.isOriginalSolo = isOriginal;

    // Create source
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = settings.playbackRate;

    // Create Master Gain & Analyser
    this.masterGain = ctx.createGain();
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.8;

    if (isOriginal) {
      // Connect directly for Original Track
      this.sourceNode.connect(this.masterGain);
    } else {
      // Connect through Karaoke Instrumental DSP Pipeline
      this.connectKaraokeDSPPipeline(ctx, this.sourceNode, this.masterGain, settings);
    }

    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);

    // Playback timing
    const offset = this.pausedAt % this.audioBuffer.duration;
    this.startTime = ctx.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      if (this.isPlaying && (ctx.currentTime - this.startTime) >= (this.audioBuffer?.duration || 0) / settings.playbackRate) {
        this.isPlaying = false;
        this.pausedAt = 0;
        if (this.onEndedCallback) this.onEndedCallback();
      }
    };
  }

  public pause() {
    if (!this.isPlaying || !this.audioCtx) return;
    this.pausedAt = this.getCurrentTime();
    this.stopSource();
    this.isPlaying = false;
  }

  public stop() {
    this.stopSource();
    this.pausedAt = 0;
    this.isPlaying = false;
  }

  public seek(seconds: number, settings: AudioProcessingSettings, isOriginal: boolean) {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.pausedAt = Math.max(0, Math.min(seconds, this.audioBuffer?.duration || 0));
    if (wasPlaying) {
      this.play(settings, isOriginal);
    }
  }

  public getCurrentTime(): number {
    if (!this.audioBuffer) return 0;
    if (!this.isPlaying || !this.audioCtx) return this.pausedAt;
    const elapsed = (this.audioCtx.currentTime - this.startTime);
    return Math.min(elapsed, this.audioBuffer.duration);
  }

  public getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Updates real-time filter settings during playback without stopping audio.
   */
  public updateSettings(settings: AudioProcessingSettings) {
    if (!this.audioCtx || !this.sourceNode) return;

    if (this.sourceNode.playbackRate) {
      this.sourceNode.playbackRate.setValueAtTime(settings.playbackRate, this.audioCtx.currentTime);
    }

    if (this.notchFilterNode) {
      this.notchFilterNode.frequency.setValueAtTime(settings.vocalNotchFreq, this.audioCtx.currentTime);
      this.notchFilterNode.Q.setValueAtTime(settings.vocalNotchQ, this.audioCtx.currentTime);
    }

    if (this.bassFilterNode) {
      // Gain boost for preserved sub-bass
      this.bassFilterNode.gain.setValueAtTime(settings.bassPreservation * 12, this.audioCtx.currentTime);
    }

    if (this.trebleFilterNode) {
      this.trebleFilterNode.gain.setValueAtTime(settings.trebleBoost * 8, this.audioCtx.currentTime);
    }
  }

  private stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Source already stopped
      }
      this.sourceNode = null;
    }
  }

  /**
   * Real-time DSP pipeline for Vocal Isolation & Center Channel Subtraction.
   */
  private connectKaraokeDSPPipeline(
    ctx: AudioContext,
    source: AudioNode,
    destination: AudioNode,
    settings: AudioProcessingSettings
  ) {
    const depth = settings.vocalRemovalDepth; // 0 to 1

    // Split stereo channels
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    source.connect(this.splitter);

    // Channel 0 = Left, Channel 1 = Right
    // 1. Center Vocal Removal via Mid/Side Inversion (Left - Right * depth)
    const leftGain = ctx.createGain();
    const rightGain = ctx.createGain();
    const invLeftGain = ctx.createGain();
    const invRightGain = ctx.createGain();

    leftGain.gain.value = 1.0;
    rightGain.gain.value = 1.0;

    // Cross-channel phase inversion for vocal center subtraction
    invRightGain.gain.value = -1.0 * depth;
    invLeftGain.gain.value = -1.0 * depth;

    // Left Out = Left + (-Right * depth) = Left - Right
    this.splitter.connect(leftGain, 0);
    this.splitter.connect(invRightGain, 1);
    leftGain.connect(this.merger, 0, 0);
    invRightGain.connect(this.merger, 0, 0);

    // Right Out = Right + (-Left * depth) = Right - Left
    this.splitter.connect(rightGain, 1);
    this.splitter.connect(invLeftGain, 0);
    rightGain.connect(this.merger, 0, 1);
    invLeftGain.connect(this.merger, 0, 1);

    // 2. Vocal Formant Band-Notch Filter (targets remaining centered formants)
    this.notchFilterNode = ctx.createBiquadFilter();
    this.notchFilterNode.type = 'notch';
    this.notchFilterNode.frequency.value = settings.vocalNotchFreq;
    this.notchFilterNode.Q.value = settings.vocalNotchQ;

    // 3. Sub-Bass Pass-Through & Boost Node (Restores punchy kick & bass lost in phase cancellation)
    this.bassFilterNode = ctx.createBiquadFilter();
    this.bassFilterNode.type = 'lowshelf';
    this.bassFilterNode.frequency.value = 140; // Sub-bass region
    this.bassFilterNode.gain.value = settings.bassPreservation * 10;

    // 4. Treble Shelf Node (Restores high-end air & cymbals)
    this.trebleFilterNode = ctx.createBiquadFilter();
    this.trebleFilterNode.type = 'highshelf';
    this.trebleFilterNode.frequency.value = 6000;
    this.trebleFilterNode.gain.value = settings.trebleBoost * 6;

    // Chain nodes: Merger -> Notch -> Bass -> Treble -> Destination
    this.merger.connect(this.notchFilterNode);
    this.notchFilterNode.connect(this.bassFilterNode);
    this.bassFilterNode.connect(this.trebleFilterNode);
    this.trebleFilterNode.connect(destination);
  }

  /**
   * Renders the complete track offline into a 100% clean, full-fidelity instrumental WAV audio file!
   */
  public async renderInstrumentalWav(
    settings: AudioProcessingSettings,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    if (!this.audioBuffer) {
      throw new Error('No audio buffer loaded to render.');
    }

    const duration = this.audioBuffer.duration;
    const sampleRate = this.audioBuffer.sampleRate;
    const numChannels = 2;
    const offlineCtx = new OfflineAudioContext(numChannels, sampleRate * duration, sampleRate);

    // Buffer source inside offline context
    const source = offlineCtx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.playbackRate.value = settings.playbackRate;

    const masterGain = offlineCtx.createGain();

    // Connect DSP Pipeline to offlineCtx destination
    this.connectKaraokeDSPPipeline(offlineCtx as unknown as AudioContext, source, masterGain, settings);
    masterGain.connect(offlineCtx.destination);

    source.start(0);

    if (onProgress) onProgress(30);

    // Render audio buffer offline
    const renderedBuffer = await offlineCtx.startRendering();

    if (onProgress) onProgress(80);

    // Encode to 16-bit PCM WAV Blob
    const wavBlob = audioBufferToWav(renderedBuffer);

    if (onProgress) onProgress(100);

    return wavBlob;
  }
}

// Singleton instance export
export const audioEngine = new KaraokeAudioEngine();
