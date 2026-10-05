/**
 * A small synthetic recording for the identity tests: four questions, of which
 * 1 and 3 print one sentence and 2 and 4 print another, exactly the situation
 * of a repeated "appropriate response" instruction. No corpus, GPU or network.
 */
import { createHash } from "node:crypto";

const sha = (value) => createHash("sha256").update(value).digest("hex");

export const RATE = 48000;
export const FRAMES = 960; // one 20 ms window
const LOUD = FRAMES * 32768 ** 2 * 10 ** (-20 / 10);

export const SENTENCE_A =
  "대화를 듣고, 여자의 마지막 말에 대한 남자의 응답으로 가장 적절한 것을 고르시오.";
export const SENTENCE_B =
  "대화를 듣고, 남자의 마지막 말에 대한 여자의 응답으로 가장 적절한 것을 고르시오.";

export const SCRIPT =
  "안내 방송입니다.  1번 " +
  SENTENCE_A +
  "  W: Kevin, have you booked a table at Charlie’s for our team dinner? M : Not yet. W: ____  2번 " +
  SENTENCE_B +
  "  M : Mom, you’d better park your car in the underground parking lot today. W: Why? It’s more convenient to park outside. W: ____  3번 " +
  SENTENCE_A +
  "  W: Hello, Mr. Watson. What do you want to do with your hair today? M : Can you cut it just a little bit? M : ____  4번 " +
  SENTENCE_B +
  "  M : Excuse me, could you tell me where the city library is? W: Sure. Go straight two blocks.";

/** Window positions of every question's number onset and dialogue onset. */
export const PLACES = {
  1: { number: 200, dialogue: 700 },
  2: { number: 1500, dialogue: 2000 },
  3: { number: 2800, dialogue: 3300 },
  4: { number: 4100, dialogue: 4600 },
};
export const WINDOWS = 6000;

export function energy() {
  const values = new Float64Array(WINDOWS);
  const sound = (from, to) => values.fill(LOUD, from, to);
  for (const place of Object.values(PLACES)) {
    sound(place.number, place.number + 40); // the spoken number
    sound(place.number + 80, place.number + 420); // its sentence
    sound(place.dialogue, place.dialogue + 500); // the dialogue
  }
  return values;
}

export const SOURCE = {
  sourceRecordId: "fixture-source",
  sourceAudioSha256: sha("fixture audio"),
  playbackDurationMs: (WINDOWS * FRAMES * 1000) / RATE,
  clock: {
    sampleRate: RATE,
    channels: 2,
    frameCount: WINDOWS * FRAMES,
    pcmSha256: sha("fixture pcm"),
  },
  questions: [1, 2, 3, 4].map((n) => ({
    questionId: "q" + n,
    sourceNumber: n,
    instruction: null,
    promptSentence: n % 2 ? SENTENCE_A : SENTENCE_B,
    kind: "single",
    spokenNumbers: [n],
    scopeQuestionNumbers: [n],
  })),
};

export const native = () => ({
  energy: energy(),
  windowFrames: FRAMES,
  sampleRate: RATE,
  frameCount: WINDOWS * FRAMES,
});

const segment = (id, text, from, to, extra = {}) => ({
  id,
  text,
  localStartSeconds: from,
  localEndSeconds: to,
  avgLogProbability: -0.2,
  noSpeechProbability: 0.1,
  compressionRatio: 1,
  uncertain: false,
  words: [],
  ...extra,
});

/** One stored probe. `texts` become consecutive segments. */
export function probe(
  id,
  {
    onsetWindow,
    windows,
    language,
    purpose,
    texts,
    segmentExtra = {},
    lead = 20,
  },
) {
  const startFrame = (onsetWindow - lead) * FRAMES;
  const frameCount = windows * FRAMES;
  const duration = frameCount / RATE;
  const step = Math.min(3, duration / Math.max(1, texts.length));
  return {
    id,
    purpose,
    startFrame,
    frameCount,
    onsetFrame: onsetWindow * FRAMES,
    quietBeforeFrames: lead * FRAMES,
    sampleRate: RATE,
    channels: 2,
    durationSeconds: duration,
    requestedLanguage: language,
    clipPcmSha256: sha("clip" + id + startFrame),
    inputSampleRate: 16000,
    inputSampleCount: Math.round(duration * 16000),
    inputMonoFloat32Sha256: sha("mono" + id + startFrame),
    overflow: false,
    segments: texts.map((text, i) =>
      segment(
        i + 1,
        text,
        i * step,
        Math.min(duration, (i + 1) * step - 0.01),
        segmentExtra[i + 1] ?? {},
      ),
    ),
  };
}

/** A container with its request, as `ProbeStore` would hand it over. */
export function stored(path, probes, mutate = {}) {
  const request = {
    sources: [
      {
        sourceRecordId: SOURCE.sourceRecordId,
        sourceAudioSha256: SOURCE.sourceAudioSha256,
        probes: probes.map((p) => ({
          id: p.id,
          startFrame: p.startFrame,
          frameCount: p.frameCount,
          onsetFrame: p.onsetFrame,
          quietBeforeFrames: p.quietBeforeFrames,
        })),
      },
    ],
  };
  const requestSha256 = sha(JSON.stringify(request));
  const container = {
    sourceRecordId: SOURCE.sourceRecordId,
    sourceAudioSha256: SOURCE.sourceAudioSha256,
    nativePcm: {
      sampleRate: RATE,
      channels: 2,
      frameCount: SOURCE.clock.frameCount,
      sha256: SOURCE.clock.pcmSha256,
    },
    requestPath: path + ".request",
    requestSha256,
    requestedLanguage: "ko",
    humanReviewed: false,
    originalAudioModified: false,
    round: "001",
    probes,
    ...mutate,
  };
  return {
    path,
    containerSha256: sha(JSON.stringify(container)),
    container,
    requestSha256,
    request,
  };
}

/** The literal eight-word opening of each section's first utterance, and that utterance as heard. */
export const OPENINGS = {
  1: {
    quote: "Kevin, have you booked a table at Charlie’s",
    heard: "Kevin, have you booked a table at Charlie's for our team dinner?",
  },
  2: {
    quote: "Mom, you’d better park your car in the",
    heard:
      "Mom, you'd better park your car in the underground parking lot today.",
  },
  3: {
    quote: "Hello, Mr. Watson. What do you want to",
    heard: "Hello, Mr. Watson. What do you want to do with your hair today?",
  },
  4: {
    quote: "Excuse me, could you tell me where the",
    heard: "Excuse me, could you tell me where the city library is?",
  },
};

/**
 * A complete, valid claim for question `number`: bare digits in the long probe,
 * a number-only clip that wrote "N번", and the section's own opening in English.
 */
export function validInput(number = 2, change = {}) {
  const place = PLACES[number];
  const sentence = number % 2 ? SENTENCE_A : SENTENCE_B;
  const cue = probe(1, {
    onsetWindow: place.number,
    windows: 700,
    language: "ko",
    purpose: "gap_onset",
    texts: [`${number}. ${sentence.replace(",", "")}`],
  });
  const clip = probe(2, {
    onsetWindow: place.number,
    windows: 75,
    language: "ko",
    purpose: "cue_only",
    texts: [`${number}번`],
  });
  const { quote, heard } = OPENINGS[number];
  const turnAt = SCRIPT.indexOf(quote);
  const dialogue = probe(1, {
    onsetWindow: place.dialogue,
    windows: 700,
    language: "en",
    purpose: "first_dialogue",
    texts: [heard, "And then some more."],
  });
  const cueStore = stored("C:/fixture/probes/round-001/fixture-source.json", [
    cue,
    clip,
  ]);
  const dialogueStore = stored(
    "C:/fixture/probes/round-002/fixture-source.json",
    [dialogue],
  );
  const startFrame = cue.startFrame;
  const input = {
    question: SOURCE.questions[number - 1],
    source: SOURCE,
    native: native(),
    script: { text: SCRIPT },
    claim: {
      seekStartMs: Math.floor((startFrame * 1000) / RATE),
      seekEndMs: SOURCE.playbackDurationMs,
      startFrame,
      onsetFrame: cue.onsetFrame,
      cueProbe: {
        path: cueStore.path,
        sha256: cueStore.containerSha256,
        probeId: 1,
      },
      numberClip: {
        path: cueStore.path,
        sha256: cueStore.containerSha256,
        probeId: 2,
      },
      dialogueProbe: {
        path: dialogueStore.path,
        sha256: dialogueStore.containerSha256,
        probeId: 1,
      },
      opening: {
        method: "first_utterance_prefix",
        quotes: [
          {
            text: quote,
            startCharacter: turnAt,
            endCharacter: turnAt + quote.length,
          },
        ],
        dialogueProbeSegmentIds: [1],
      },
    },
    loaded: {
      cueProbe: cueStore,
      numberClip: cueStore,
      dialogueProbe: dialogueStore,
    },
    readingsAtStart: [],
    neighbors: {
      previous:
        number > 1
          ? {
              sourceNumber: number - 1,
              startMs:
                ((PLACES[number - 1].number - 20) * FRAMES * 1000) / RATE,
            }
          : null,
      next:
        number < 4
          ? {
              sourceNumber: number + 1,
              startMs:
                ((PLACES[number + 1].number - 20) * FRAMES * 1000) / RATE,
            }
          : null,
      isLastQuestion: number === 4,
    },
    baseline: { hasVerifiedStart: false },
  };
  return typeof change === "function" ? (change(input) ?? input) : input;
}

/** Re-seals a mutated stored container so only the intended rule can refuse it. */
export function reseal(loaded) {
  loaded.request.sources[0].probes = loaded.container.probes.map((p) => ({
    id: p.id,
    startFrame: p.startFrame,
    frameCount: p.frameCount,
    onsetFrame: p.onsetFrame,
    quietBeforeFrames: p.quietBeforeFrames,
  }));
  loaded.requestSha256 = sha(JSON.stringify(loaded.request));
  loaded.container.requestSha256 = loaded.requestSha256;
  loaded.containerSha256 = sha(JSON.stringify(loaded.container));
  return loaded;
}

/** Points the claim's references at the (re-sealed) stored containers again. */
export function rebind(input) {
  for (const key of ["cueProbe", "numberClip", "dialogueProbe"])
    if (input.claim[key] && input.loaded[key]) {
      input.claim[key].path = input.loaded[key].path;
      input.claim[key].sha256 = input.loaded[key].containerSha256;
    }
  return input;
}
