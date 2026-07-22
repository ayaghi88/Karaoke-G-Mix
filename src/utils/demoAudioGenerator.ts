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

export function createFullSongDemo(
  ctx: AudioContext,
  songTitle: string = 'Hurt',
  artistName: string = 'Christina Aguilera',
  customDurationSeconds: number = 220,
  includeVocals: boolean = false
): AudioBuffer {
  const duration = Math.max(120, customDurationSeconds); // full song length (e.g. 220s / 3:40m)
  const sampleRate = ctx.sampleRate;
  const numFrames = sampleRate * duration;
  const buffer = ctx.createBuffer(2, numFrames, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const isBallad = songTitle.toLowerCase().includes('hurt') || songTitle.toLowerCase().includes('ballad');
  const bpm = isBallad ? 72 : 115;
  const beatSec = 60 / bpm;

  // Piano / Chord Progression (Am - F - C - G / Em - C - G - D)
  const chordFreqs = isBallad
    ? [
        [220, 261.63, 329.63, 440],   // Am
        [174.61, 220, 261.63, 349.23], // F
        [261.63, 329.63, 392, 523.25], // C
        [196, 246.94, 293.66, 392],    // G
      ]
    : [
        [130.81, 164.81, 196],
        [174.61, 220, 261.63],
        [196, 246.94, 293.66],
        [220, 261.63, 329.63],
      ];

  // Lead Vocal Melodic Sequence (Centered)
  const vocalPitches = [
    440, 493.88, 523.25, 587.33, 523.25, 493.88, 440, 392,
    349.23, 392, 440, 523.25, 659.25, 587.33, 523.25, 440
  ];

  for (let i = 0; i < numFrames; i++) {
    const t = i / sampleRate;
    const measureProgress = (t % (beatSec * 4)) / (beatSec * 4);
    const chordIdx = Math.floor((t / (beatSec * 4)) % chordFreqs.length);

    let l = 0;
    let r = 0;

    // Structure intensity envelope (Intro -> Verse 1 -> Chorus 1 -> Verse 2 -> Chorus 2 -> Bridge -> Climax -> Outro)
    let songStructureGain = 0.6;
    let hasDrums = false;
    let hasFullStrings = false;
    let vocalActive = false;

    if (t < 15) {
      // Intro (Piano & Cello pad)
      songStructureGain = 0.5;
      hasDrums = false;
      hasFullStrings = false;
      vocalActive = false;
    } else if (t < 60) {
      // Verse 1
      songStructureGain = 0.7;
      hasDrums = t > 35;
      hasFullStrings = true;
      vocalActive = true;
    } else if (t < 105) {
      // Chorus 1
      songStructureGain = 1.0;
      hasDrums = true;
      hasFullStrings = true;
      vocalActive = true;
    } else if (t < 145) {
      // Verse 2
      songStructureGain = 0.8;
      hasDrums = true;
      hasFullStrings = true;
      vocalActive = true;
    } else if (t < 185) {
      // Chorus 2 & Soaring Bridge
      songStructureGain = 1.1;
      hasDrums = true;
      hasFullStrings = true;
      vocalActive = true;
    } else if (t < duration - 15) {
      // Final Climax Chorus
      songStructureGain = 1.2;
      hasDrums = true;
      hasFullStrings = true;
      vocalActive = true;
    } else {
      // Outro Fade
      const fadeOut = Math.max(0, (duration - t) / 15);
      songStructureGain = 0.6 * fadeOut;
      hasDrums = false;
      hasFullStrings = true;
      vocalActive = t < duration - 8;
    }

    if (!includeVocals) {
      vocalActive = false;
    }

    // 1. Piano Arpeggio (Wide Stereo Panned Chords)
    const curChord = chordFreqs[chordIdx];
    const arpPhase = (t % (beatSec / 2)) / (beatSec / 2);
    const noteStep = Math.floor((t / (beatSec / 2)) % curChord.length);
    const pFreq = curChord[noteStep];
    const pEnv = Math.exp(-arpPhase * 3);
    const pianoSample = Math.sin(2 * Math.PI * pFreq * t) * pEnv * 0.12 * songStructureGain;
    const pan = (noteStep / curChord.length - 0.5) * 0.6; // Stereo panning
    l += pianoSample * (1 - pan);
    r += pianoSample * (1 + pan);

    // 2. Warm Cello / String Pad (Stereo)
    if (hasFullStrings) {
      const rootFreq = curChord[0] / 2;
      const stringPad = (
        Math.sin(2 * Math.PI * rootFreq * t) +
        0.5 * Math.sin(2 * Math.PI * (rootFreq * 1.5) * t) +
        0.3 * Math.sin(2 * Math.PI * (rootFreq * 2) * t)
      ) * 0.08 * songStructureGain;
      l += stringPad * 1.1;
      r += stringPad * 0.9;
    }

    // 3. Drums & Bass (Centered Kick/Bass, Stereo Snares)
    if (hasDrums) {
      const beatPhase = (t % beatSec) / beatSec;
      // Kick on beat 1 & 3
      if ((Math.floor(t / beatSec) % 2) === 0 && beatPhase < 0.25) {
        const kEnv = Math.exp(-beatPhase * 16);
        const kFreq = 120 * Math.exp(-beatPhase * 25) + 38;
        const kick = Math.sin(2 * Math.PI * kFreq * t) * kEnv * 0.45 * songStructureGain;
        l += kick;
        r += kick;
      }
      // Snare on beat 2 & 4
      if ((Math.floor(t / beatSec) % 2) === 1 && beatPhase < 0.2) {
        const sEnv = Math.exp(-beatPhase * 18);
        const noise = (Math.random() * 2 - 1) * sEnv * 0.25 * songStructureGain;
        l += noise;
        r += noise * 1.1;
      }
      // Bass line
      const bassFreq = curChord[0] / 2;
      const bass = Math.sin(2 * Math.PI * bassFreq * t) * 0.22 * songStructureGain;
      l += bass;
      r += bass;
    }

    // 4. CENTERED LEAD VOCAL (Formant-Synthesized Singing Voice, Center Channel)
    if (vocalActive) {
      const noteIdx = Math.floor((t / (beatSec * 1.5)) % vocalPitches.length);
      const vFreq = vocalPitches[noteIdx];
      const vPhase = (t % (beatSec * 1.5)) / (beatSec * 1.5);
      
      if (vPhase < 0.88) {
        const vEnv = Math.sin(Math.PI * (vPhase / 0.88));
        const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 6.0 * t);
        const f0 = vFreq * vibrato;
        // Vocal Formant Harmonics
        const vocal = (
          Math.sin(2 * Math.PI * f0 * t) * 0.45 +
          Math.sin(2 * Math.PI * f0 * 2 * t) * 0.28 +
          Math.sin(2 * Math.PI * f0 * 3 * t) * 0.18 +
          Math.sin(2 * Math.PI * f0 * 4 * t) * 0.10
        ) * vEnv * 0.42 * songStructureGain;

        // Dead Center: Left and Right are 100% identical
        l += vocal;
        r += vocal;
      }
    }

    left[i] = Math.max(-1, Math.min(1, l));
    right[i] = Math.max(-1, Math.min(1, r));
  }

  return buffer;
}

export function createPopDemo(ctx: AudioContext): AudioBuffer {
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
