/**
 * A small synthetic recording: three single questions, a shared instruction
 * for 4 and 5 with separately announced members, and a closing. Loudness, the
 * Korean recognitions at each heading and the English recognitions inside each
 * passage are all made here; nothing touches the real corpus.
 */
import { energyAtDbfs } from "../../claude/lib/activity.mjs";
import { ABSOLUTE } from "../lib/rules.mjs";

export const RATE = 44100;
export const FRAMES = 882;
export const WINDOWS = 14000;
const LOUD = energyAtDbfs(-20, FRAMES);

/** Onset window of each heading. */
export const AT = { 1: 500, 2: 3000, 3: 5500, head: 8000, 4: 8600, 5: 10000, closing: 12000 };
export const startOf = (onsetWindow) => (onsetWindow - 20) * FRAMES;

export function makeNative(extraIslands = []) {
  const energy = new Float64Array(WINDOWS);
  const island = (from, length) => energy.fill(LOUD, from, from + length);
  for (const onset of Object.values(AT)) island(onset, 150);
  // Dialogue sound inside each passage.
  for (const from of [800, 3300, 5800, 8900, 10300]) island(from, 900);
  for (const [from, length] of extraIslands) island(from, length);
  return {
    energy,
    windowFrames: FRAMES,
    sampleRate: RATE,
    channels: 2,
    frameCount: WINDOWS * FRAMES,
    pcmSha256: "p".repeat(64),
    cachePath: "native.json",
    cacheSha256: "c".repeat(64),
    energyPath: "energy.f64",
    energySha256: "e".repeat(64),
  };
}

let nextSegment = 1;
export const segment = (text, start, end, overrides = {}) => ({
  id: nextSegment++,
  text,
  localStartSeconds: start,
  localEndSeconds: end,
  avgLogProbability: -0.2,
  noSpeechProbability: 0.1,
  compressionRatio: 1.1,
  uncertain: false,
  words: [{ text, localStartSeconds: start, localEndSeconds: end, probability: 0.9 }],
  ...overrides,
});

let nextProbe = 1;
/** A stored recognition as the session hands it to the rules. */
export function listening(language, startFrame, windows, segments, overrides = {}) {
  const id = nextProbe++;
  const frameCount = windows * FRAMES;
  return {
    ref: {
      path: "probes/round-001/source.json",
      sha256: "f".repeat(64),
      probeId: id,
      startFrame,
      frameCount,
      clipPcmSha256: "a".repeat(64),
      inputMonoFloat32Sha256: "b".repeat(64),
    },
    language,
    startFrame,
    frameCount,
    onsetFrame: language === "ko" ? startFrame + 20 * FRAMES : null,
    own: true,
    probe: {
      id,
      startFrame,
      frameCount,
      durationSeconds: frameCount / RATE,
      overflow: false,
      onsetMethod: ABSOLUTE,
      segments,
    },
    ...overrides,
  };
}

const INSTRUCTION = "대화를 듣고 남자가 할 일을 고르세요.";
export const heading = (onsetWindow, text, overrides) =>
  listening("ko", startOf(onsetWindow), 400, [segment(text, 0.4, 5)], overrides);

export const koreanListenings = () => [
  heading(AT[1], "1번입니다. " + INSTRUCTION),
  heading(AT[2], "2번입니다. " + INSTRUCTION),
  heading(AT[3], "3번입니다. " + INSTRUCTION),
  heading(AT.head, "4번과 5번은 대화를 듣고 이어질 응답으로 알맞은 것을 고르는 문제입니다."),
  heading(AT[4], "4번입니다."),
  heading(AT[5], "5번입니다."),
  heading(AT.closing, "수고하셨습니다. 이상으로 듣기평가를 마치겠습니다."),
];

/** One English clip inside a passage, saying `text`. */
export const english = (fromWindow, windows, text, overrides) =>
  listening("en", fromWindow * FRAMES, windows, [segment(text, 0.5, 6)], overrides);

export const QUOTES = {
  a: "I moved to a new house last Saturday.",
  b: "Turn off the light when you leave the room.",
  c: "You can buy all fruits and vegetables at half price.",
  d: "I won first prize at the English speech contest.",
  e: "Let's make a mini blog for spider lovers.",
};

export const englishListenings = () => [
  english(900, 1000, "How was your weekend? " + QUOTES.a),
  english(3400, 1000, "First of all, " + QUOTES.b),
  english(5900, 1000, QUOTES.c + " Thank you."),
  english(8900, 1000, "Hi, Minsoo. " + QUOTES.d),
  english(10400, 1000, "I like spiders best. " + QUOTES.e),
];

export function makeRecord() {
  return {
    sourceRecordId: "ebs-test-1",
    setId: "set-1",
    revision: 7,
    documentSha256: "d".repeat(64),
    reconstructed: true,
    source: { year: 2007 },
    audio: { sha256: "b".repeat(64), durationMs: Math.ceil((WINDOWS * FRAMES * 1000) / RATE) },
    sourceAudioSha256: "a".repeat(64),
  };
}

/** Displayed numbers deliberately differ from the original passages. */
export const TARGETS = [
  { questionId: "q-a", sourceNumber: 9, quotes: [QUOTES.a] },
  { questionId: "q-b", sourceNumber: 1, quotes: [QUOTES.b] },
  { questionId: "q-c", sourceNumber: 2, quotes: [QUOTES.c] },
  { questionId: "q-d", sourceNumber: 3, quotes: [QUOTES.d] },
  { questionId: "q-e", sourceNumber: 4, quotes: [QUOTES.e] },
];

/** The frozen whole-record recognition the generation quoted from. */
export const frozenSegments = () => [
  { id: 101, text: "How was your weekend? " + QUOTES.a, startSeconds: 20, endSeconds: 30 },
  { id: 102, text: "First of all, " + QUOTES.b, startSeconds: 70, endSeconds: 80 },
  { id: 103, text: QUOTES.c + " Thank you.", startSeconds: 120, endSeconds: 130 },
  { id: 104, text: "Hi, Minsoo. " + QUOTES.d, startSeconds: 180, endSeconds: 190 },
  { id: 105, text: "I like spiders best. " + QUOTES.e, startSeconds: 210, endSeconds: 220 },
  { id: 106, text: "Yes, I do.", startSeconds: 31, endSeconds: 32 },
];

export function makeInput(overrides = {}) {
  const targets = overrides.targets ?? TARGETS;
  const asrSegments = overrides.asrSegments ?? frozenSegments();
  return {
    record: makeRecord(),
    native: makeNative(),
    certRows: [],
    koListenings: koreanListenings(),
    enListenings: englishListenings(),
    generation: {
      byQuestion: new Map(
        targets.map((t, i) => [
          t.questionId,
          {
            generatedOrdinal: i + 1,
            evidenceQuotes: t.quotes,
            frozenSourceSegmentIds:
              t.segmentIds ??
              asrSegments
                .filter((s) => t.quotes.some((q) => s.text.includes(q)))
                .map((s) => s.id),
            groundingIntact: true,
            estimatedStartMs: null,
            estimatedEndMs: null,
          },
        ]),
      ),
      inputs: {
        prepared: { path: "prepared.json", sha256: "1".repeat(64) },
        generationAlignment: { path: "alignment.json", sha256: "2".repeat(64) },
      },
    },
    hints: { numbers: [], englishWords: [], asrSegments, inputs: {} },
    targets: targets.map((t) => ({ ...t, provider: "grok", status: "held", reconstructed: true })),
    blind: false,
    certificateSha256: "9".repeat(64),
    ...overrides,
  };
}

/** An official script of the same recording: every number printed once, in order. */
export const SCRIPT = [
  "1번 대화를 듣고, 남자가 한 일을 고르시오.",
  "M: How was your weekend?",
  "W: " + QUOTES.a,
  "2번 다음을 듣고, 여자가 할 일을 고르시오.",
  "W: First of all, turn off the light when you leave the room.",
  "3번 다음을 듣고, 무엇에 관한 안내인지 고르시오.",
  "M: " + QUOTES.c + " Thank you.",
  "4번 대화를 듣고, 이어질 응답을 고르시오.",
  "M: Hi, Minsoo.",
  "W: " + QUOTES.d,
  "5번 대화를 듣고, 이어질 응답을 고르시오.",
  "M: I like spiders best.",
  "W: " + QUOTES.e,
].join("\n");

/** The same source as an official one: questions keep their own numbers. */
export function makeOfficialInput(numbers, overrides = {}) {
  const input = makeInput({ targets: [] });
  delete input.generation;
  input.record = {
    ...input.record,
    reconstructed: false,
    questions: [1, 2, 3, 4, 5].map((n) => ({ id: "o-" + n, sourceNumber: n })),
  };
  return {
    ...input,
    script: { text: SCRIPT, sha256: "5".repeat(64) },
    targets: numbers.map((n) => ({
      questionId: "o-" + n,
      sourceNumber: n,
      provider: "claude",
      status: "held",
      reconstructed: false,
    })),
    ...overrides,
  };
}

export const rowOf = (result, questionId) =>
  result.rows.find((row) => row.questionId === questionId);
