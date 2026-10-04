/** Reviewed CC0 samples. Keep bytes and hashes in sync when replacing a file. */
export const LEARNING_SOUND_GAIN = 0.2;
export const LEARNING_SOUND_FILES = {
  correct: {
    url: "/audio/math-learning/correct.wav",
    sha256: "118f13df116ac3ca83e19439ab8147edaceab497d6b16b8386580beb3038536d",
    bytes: 28446,
    durationSeconds: 0.3220181405895692,
    sampleRate: 44100,
    channels: 1,
    bitsPerSample: 16,
    peak: 0.893280029296875,
    rms: 0.17331852007683615,
    sourceFile: "Audio/confirmation_003.ogg",
    sourceSha256:
      "3091bf0be0497f825769ee0733ca7bdc3bcd59bd6c6e8f2ba8f93d580ff38022",
  },
  soft: {
    url: "/audio/math-learning/neutral.wav",
    sha256: "1ae14438ec3d8a40da78f0ff795b91754d32068faba052e89e6e0ef583905660",
    bytes: 14302,
    durationSeconds: 0.16165532879818595,
    sampleRate: 44100,
    channels: 1,
    bitsPerSample: 16,
    peak: 0.947998046875,
    rms: 0.08181265272710268,
    sourceFile: "Audio/pluck_002.ogg",
    sourceSha256:
      "c977fe249ff42d1c93a552b33abc13a8399df3879fa510475426e5c4bbac1da9",
  },
  complete: {
    url: "/audio/math-learning/complete.wav",
    sha256: "236f790b5d90aa13476638d635e910866b8b10b5ced0e87afbad289f58dd6021",
    bytes: 47584,
    durationSeconds: 0.5390022675736962,
    sampleRate: 44100,
    channels: 1,
    bitsPerSample: 16,
    peak: 0.895751953125,
    rms: 0.1802232279982954,
    sourceFile: "Audio/confirmation_002.ogg",
    sourceSha256:
      "33b17a9a9a2397c62b285c52c33a907fdffb476909c99e42dde603f6a7a8b12c",
  },
} as const;
