export interface TrackMetadata {
  id: string;
  name: string;
  artist: string;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  fileSize?: number;
  youtubeUrl?: string;
  isYoutubeImport?: boolean;
  copyrightCleared?: boolean;
  gMixVersion?: string;
  instrumentalStreamUrl?: string;
  vocalsStreamUrl?: string;
  isCloudStream?: boolean;
}

export interface AudioProcessingSettings {
  vocalRemovalDepth: number; // 0 to 1 (0% to 100%)
  bassPreservation: number; // 0 to 1 (preserves sub bass 20-150Hz)
  trebleBoost: number; // 0 to 1 (air frequencies 6kHz+)
  vocalNotchFreq: number; // 300 to 3000 Hz (target vocal frequency)
  vocalNotchQ: number; // 0.5 to 5.0 (filter sharpness)
  stereoWidth: number; // 0 to 2.0 (stereo expansion)
  pitchShiftSemiTones: number; // -6 to +6 semitones
  playbackRate: number; // 0.75 to 1.25
  enableReverb: boolean;
  reverbMix: number; // 0 to 1
}

export interface LyricWord {
  word: string;
  timeMs: number;
}

export interface LyricLine {
  id: string;
  time: number; // in seconds
  timeMs?: number;
  text: string;
  words?: LyricWord[];
}

export interface RecordingState {
  isRecording: boolean;
  recordingTime: number;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  micVolume: number;
  backingVolume: number;
  reverbAmount: number;
  echoAmount: number;
}

export type ActiveTab = 'remover' | 'recording' | 'lyrics' | 'guide';
