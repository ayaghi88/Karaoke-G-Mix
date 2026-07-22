/**
 * Generates synthetic musical demo tracks with vocals and instrumentals.
 * Allows instant testing of vocal removal DSP without requiring an uploaded file.
 */

export interface DemoTrackOption {
  id: string;
  name: string;
  artist: string;
  genre: string;
  bpm: number;
  description: string;
  generate: (ctx: AudioContext) => AudioBuffer;
}

export const DEMO_TRACKS: DemoTrackOption[] = [
  {
    id: 'pop_groove',
    name: 'Midnight Neon (Pop Anthem)',
    artist: 'Aura & The Echoes',
    genre: 'Synthpop / Dance',
    bpm: 120,
    description: 'Catchy synthpop song with centered lead vocals, stereo synth chords, punchy bass, and drums.',
    generate: (ctx: AudioContext) => createPopDemo(ctx),
  },
  {
    id: 'acoustic_ballad',
    name: 'Summer Waves (Acoustic)',
    artist: 'Luna Vane',
    genre: 'Acoustic Pop',
    bpm: 95,
    description: 'Acoustic guitar backing track with clear lead vocals and stereo strings.',
    generate: (ctx: AudioContext) => createAcousticDemo(ctx),
  },
  {
    id: 'rock_jam',
    name: 'Electric Skyline (Rock)',
    artist: 'Starlight Overdrive',
    genre: 'Indie Rock',
    bpm: 128,
    description: 'Energetic indie rock with driving drums, stereo guitars, and centered rock vocals.',
    generate: (ctx: AudioContext) => createRockDemo(ctx),
  },
];

function createPopDemo(ctx: AudioContext): AudioBuffer {
  const duration = 18; // 18 seconds snippet
  const sampleRate = ctx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 120;
  const beatSec = 60 / bpm;

  // Chord Progression: Am - F - C - G
  const chordFreqs = [
    [220, 261.63, 329.63], // Am
    [174.61, 220, 261.63],  // F
    [261.63, 329.63, 392],  // C
    [196, 246.94, 293.66],  // G
  ];

  // Vocal Lead Pitch Sequence (Centered)
  const vocalPitches = [
    440, 493.88, 523.25, 440, 392, 440, 523.25, 587.33,
    523.25, 493.88, 440, 392, 349.23, 392, 440, 440
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const beatIndex = Math.floor(t / beatSec);
    const measureProgress = (t % (beatSec * 4)) / (beatSec * 4);
    const chordIdx = Math.floor((t / (beatSec * 4)) % 4);

    let l = 0;
    let r = 0;

    // 1. Kick Drum (Centered, low freq sweep)
    const beatPhase = (t % beatSec) / beatSec;
    if (beatPhase < 0.25) {
      const env = Math.exp(-beatPhase * 18);
      const freq = 130 * Math.exp(-beatPhase * 25) + 35;
      const kick = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
      l += kick;
      r += kick;
    }

    // 2. Snare Drum (Beat 2 & 4)
    if ((Math.floor(t / beatSec) % 2) === 1) {
      if (beatPhase < 0.2) {
        const env = Math.exp(-beatPhase * 20);
        const noise = (Math.random() * 2 - 1) * env * 0.35;
        const tone = Math.sin(2 * Math.PI * 180 * t) * env * 0.2;
        l += (noise + tone) * 0.9;
        r += (noise + tone) * 1.1; // Slight stereo variance
      }
    }

    // 3. Stereo Synth Pad (Chords panned left and right)
    const curChord = chordFreqs[chordIdx];
    for (let c = 0; c < curChord.length; c++) {
      const f = curChord[c];
      const panOffset = (c - 1) * 0.4; // -0.4, 0, 0.4
      const synthSample = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * 0.08;
      l += synthSample * (1 - panOffset);
      r += synthSample * (1 + panOffset);
    }

    // 4. Sub Bass (Centered, low end)
    const rootFreq = curChord[0] / 2;
    const bassEnv = Math.exp(-((t % (beatSec / 2)) / (beatSec / 2)) * 4);
    const bass = Math.sin(2 * Math.PI * rootFreq * t) * bassEnv * 0.4;
    l += bass;
    r += bass;

    // 5. LEAD VOCAL (Dead Centered, Formant-synthesized singing voice)
    // Vocals are centered so Left = Right exactly!
    const noteIdx = Math.floor((t / (beatSec / 2)) % vocalPitches.length);
    const vFreq = vocalPitches[noteIdx];
    const vPhase = (t % (beatSec / 2)) / (beatSec / 2);
    if (vPhase < 0.85 && t > 1.0) {
      const vEnv = Math.sin(Math.PI * (vPhase / 0.85));
      const vibrato = 1 + 0.015 * Math.sin(2 * Math.PI * 5.5 * t);
      const f0 = vFreq * vibrato;
      // Formant synthesis (simulating vocal vowel sounds like 'ah' and 'oh')
      const vocalSignal = (
        Math.sin(2 * Math.PI * f0 * t) * 0.4 +
        Math.sin(2 * Math.PI * f0 * 2 * t) * 0.25 +
        Math.sin(2 * Math.PI * f0 * 3 * t) * 0.15 +
        Math.sin(2 * Math.PI * f0 * 4 * t) * 0.08
      ) * vEnv * 0.38;

      l += vocalSignal;
      r += vocalSignal;
    }

    left[i] = Math.max(-1, Math.min(1, l));
    right[i] = Math.max(-1, Math.min(1, r));
  }

  return buffer;
}

function createAcousticDemo(ctx: AudioContext): AudioBuffer {
  const duration = 16;
  const sampleRate = ctx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 95;
  const beatSec = 60 / bpm;
  const vocalPitches = [329.63, 392, 440, 392, 329.63, 293.66, 261.63, 293.66];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let l = 0;
    let r = 0;

    // Guitar Strum (panned slightly wide)
    const strumPhase = (t % (beatSec / 2)) / (beatSec / 2);
    if (strumPhase < 0.6) {
      const guitarEnv = Math.exp(-strumPhase * 5);
      const strum1 = Math.sin(2 * Math.PI * 196 * t) * guitarEnv * 0.2;
      const strum2 = Math.sin(2 * Math.PI * 246.94 * t) * guitarEnv * 0.2;
      l += strum1 * 1.3 + strum2 * 0.7;
      r += strum1 * 0.7 + strum2 * 1.3;
    }

    // Lead Vocal (DEAD CENTER)
    const noteIdx = Math.floor((t / beatSec) % vocalPitches.length);
    const vFreq = vocalPitches[noteIdx];
    const vEnv = Math.sin(Math.PI * ((t % beatSec) / beatSec));
    const vocal = (Math.sin(2 * Math.PI * vFreq * t) + 0.3 * Math.sin(4 * Math.PI * vFreq * t)) * vEnv * 0.4;
    
    l += vocal;
    r += vocal;

    left[i] = Math.max(-1, Math.min(1, l));
    right[i] = Math.max(-1, Math.min(1, r));
  }

  return buffer;
}

function createRockDemo(ctx: AudioContext): AudioBuffer {
  const duration = 16;
  const sampleRate = ctx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const bpm = 128;
  const beatSec = 60 / bpm;

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    let l = 0;
    let r = 0;

    // Heavy Drums
    const beatPhase = (t % beatSec) / beatSec;
    if (beatPhase < 0.15) {
      const kick = Math.sin(2 * Math.PI * (120 * Math.exp(-beatPhase * 30) + 40) * t) * Math.exp(-beatPhase * 20) * 0.6;
      l += kick;
      r += kick;
    }

    // Distorted Guitar (Wide Stereo)
    const gFreq = 164.81; // E3
    const guitarWave = Math.sin(2 * Math.PI * gFreq * t);
    const clippedG = Math.max(-0.3, Math.min(0.3, guitarWave));
    l += clippedG * 0.8;
    r -= clippedG * 0.8; // Inverted right channel for ultra-wide guitar stereo

    // Lead Vocal (DEAD CENTER)
    const vFreq = 329.63 * (1 + 0.01 * Math.sin(2 * Math.PI * 6 * t));
    const vocal = (Math.sin(2 * Math.PI * vFreq * t) + 0.5 * Math.sin(2 * Math.PI * vFreq * 2 * t)) * 0.35;
    l += vocal;
    r += vocal;

    left[i] = Math.max(-1, Math.min(1, l));
    right[i] = Math.max(-1, Math.min(1, r));
  }

  return buffer;
}
