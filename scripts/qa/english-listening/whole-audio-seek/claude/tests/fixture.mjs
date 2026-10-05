/**
 * A small synthetic recording for the tests: six questions that cover every
 * spoken form, measured energy with a spoken-number island before each start,
 * and stored probes that begin exactly at each proposed start.
 *
 * Nothing here touches the real inventory, audio or caches.
 */
import { energyAtDbfs } from "../lib/activity.mjs";
import { POLICY } from "../lib/policy.mjs";
import { questionPlans } from "../lib/questions.mjs";
import { resolveSource } from "../lib/resolve.mjs";
import { assembleRow } from "../lib/rows.mjs";
import { scriptSections } from "../lib/script.mjs";

export const RATE = 48000;
export const FRAMES = 960;
export const WINDOWS = 3600;
export const INVENTORY_SHA = "1".repeat(64);
const hex = (char) => char.repeat(64);

export const SHARED_INSTRUCTION =
  "대화를 듣고, 남자의 마지막 말에 이어질 여자의 응답으로 가장 적절한 것을 고르시오.";
export const PASSAGE_INSTRUCTION = "다음을 듣고, 물음에 답하시오.";
export const PROMPTS = {
  1: "대화를 듣고, 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
  2: "다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
  5: "여자가 하는 말의 주제로 가장 적절한 것을 고르시오.",
  6: "언급된 동물이 아닌 것을 고르시오.",
};
/** Onset window of the spoken number that begins each start. */
export const ONSETS = { 1: 500, 2: 1000, 3: 1500, 4: 2000, 5: 2500 };
export const MEMBER_WORDS =
  "hi dave what are you doing here i am waiting for the bus to go home".split(
    " ",
  );

export function makeRecord(overrides = {}) {
  const sourceRecordId = "ebs-test-1";
  const sourceAudioSha256 = hex("a");
  const question = (sourceNumber, prompt, instruction) => ({
    id: `question-${sourceNumber}`,
    sourceNumber,
    prompt,
    ...(instruction ? { instruction } : {}),
    evidence: [],
    metadata: { sourceRecordId, sourceAudioSha256 },
    audioRange: null,
  });
  return {
    sourceRecordId,
    setId: "set-1",
    revision: 4,
    documentSha256: hex("d"),
    reconstructed: false,
    assignedAgent: "claude",
    groupId: "group-1",
    audio: { sha256: hex("b"), durationMs: (WINDOWS * FRAMES * 1000) / RATE },
    sourceAudioSha256,
    asrPath: "asr.json",
    asrSha256: hex("c"),
    preparedPath: "prepared.json",
    preparedSha256: hex("e"),
    questions: [
      question(1, PROMPTS[1]),
      question(2, PROMPTS[2]),
      question(3, "Woman: ________", SHARED_INSTRUCTION),
      question(4, "Woman: ________", SHARED_INSTRUCTION),
      question(5, PROMPTS[5], PASSAGE_INSTRUCTION),
      question(6, PROMPTS[6], PASSAGE_INSTRUCTION),
    ],
    ...overrides,
  };
}

/** Measured energy: quiet everywhere except a number island and what follows it. */
export function makeNative(record, onsets = Object.values(ONSETS)) {
  const loud = energyAtDbfs(-12, FRAMES);
  const energy = new Float64Array(WINDOWS);
  const paint = (from, to) => {
    for (let w = from; w < to; w++) energy[w] = loud;
  };
  for (const onset of onsets) {
    paint(onset, onset + 40);
    paint(onset + 70, onset + 300);
  }
  return {
    energy,
    windowFrames: FRAMES,
    metaPath: "native.json",
    metaSha256: hex("f"),
    energyPath: "energy.f64",
    meta: {
      pcm: {
        sampleRate: RATE,
        channels: 2,
        frameCount: WINDOWS * FRAMES,
        sha256: hex("9"),
      },
      energy: { sha256: hex("8") },
    },
  };
}

let nextProbeId = 1;
export const resetProbeIds = () => {
  nextProbeId = 1;
};

/** A stored probe that begins a fixed lead before `onsetWindow`. */
export function makeProbe(onsetWindow, texts, options = {}) {
  const lead = options.lead ?? POLICY.leadWindows;
  const startFrame = (onsetWindow - lead) * FRAMES;
  const frameCount = (options.windows ?? POLICY.probeWindows) * FRAMES;
  const durationSeconds = frameCount / RATE;
  const list = Array.isArray(texts) ? texts : [texts];
  const span = Math.min(durationSeconds, 12) / list.length;
  return {
    id: nextProbeId++,
    purpose: options.purpose ?? "bridge_onset",
    startFrame,
    frameCount,
    onsetFrame: onsetWindow * FRAMES,
    quietBeforeFrames: 20 * FRAMES,
    sampleRate: RATE,
    channels: 2,
    durationSeconds,
    ...(options.language ? { requestedLanguage: options.language } : {}),
    clipPcmSha256: hex("2"),
    inputSampleRate: 16000,
    inputSampleCount: Math.round(durationSeconds * 16000),
    inputMonoFloat32Sha256: hex("3"),
    latestRecognizedEndSeconds: span * list.length,
    overflow: false,
    segments: list.map((text, index) => ({
      id: index + 1,
      text,
      localStartSeconds: span * index,
      localEndSeconds: span * (index + 1),
      avgLogProbability: -0.2,
      noSpeechProbability: 0.1,
      compressionRatio: 1.2,
      uncertain: options.uncertain?.[index] ?? false,
      words: [],
    })),
  };
}

export function probeSet(record, native, probes) {
  return {
    path: "probes/round-001/ebs-test-1.json",
    sha256: hex("4"),
    round: "round-001",
    artifact: {
      sourceRecordId: record.sourceRecordId,
      sourceAudioSha256: record.sourceAudioSha256,
      inventorySha256: INVENTORY_SHA,
      requestedLanguage: "ko",
      nativePcm: {
        sampleRate: native.meta.pcm.sampleRate,
        channels: native.meta.pcm.channels,
        frameCount: native.meta.pcm.frameCount,
        sha256: native.meta.pcm.sha256,
      },
      probes,
    },
  };
}

/** Probes that prove every start of the fixture. */
export function goodProbes() {
  resetProbeIds();
  return [
    makeProbe(
      ONSETS[1],
      "1번 대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
    ),
    makeProbe(
      ONSETS[2],
      "2번. 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오.",
    ),
    makeProbe(ONSETS[3], [
      "3번과 4번. 대화를 듣고 남자의 마지막 말에 이어질 여자의 응답으로 가장 적절한 것을 고르시오.",
      "3번",
    ]),
    makeProbe(ONSETS[4], "4번", { purpose: "cue_only", windows: 150 }),
    makeProbe(
      ONSETS[4],
      "Hi Dave, what are you doing here? I am waiting for the bus to go home.",
      { purpose: "member_dialogue", language: "en" },
    ),
    makeProbe(ONSETS[5], "5번과 6번 다음을 듣고 물음에 답하시오."),
  ];
}

export const ASR = {
  segments: [
    {
      id: 1,
      text: "1번",
      estimatedStartSeconds: 9,
      estimatedEndSeconds: 11,
      uncertain: false,
    },
    {
      id: 2,
      text: "대화를 듣고 남자가 구입할 물병으로 가장 적절한 것을 고르시오.",
      estimatedStartSeconds: 11,
      estimatedEndSeconds: 16,
      uncertain: false,
    },
    {
      id: 3,
      text: "2번",
      estimatedStartSeconds: 18,
      estimatedEndSeconds: 21,
      uncertain: false,
    },
    {
      id: 4,
      text: "수고하셨습니다.",
      estimatedStartSeconds: 70,
      estimatedEndSeconds: 71,
      uncertain: false,
    },
  ],
};

/** The official script of the fixture, as a transcript prints it. */
export const TRANSCRIPT = [
  "ANN : 이제 시작하겠습니다.",
  "1번 대화를 듣고, 남자가 구입할 물병으로 가장 적절한 것을 고르시오. M: Good afternoon. W: Hello, what can I do for you today?",
  "2번 다음을 듣고, 내일의 날씨로 가장 적절한 것을 고르시오. W: Good morning, here is the weather for tomorrow.",
  "【3-4】대화를 듣고, 남자의 마지막 말에 이어질 여자의 응답으로 가장 적절한 것을 고르시오.",
  "3번 Woman: ________ M: Jimin, look at these roses here. W: Wow, they are really beautiful.",
  "4번 W: Hi Dave, what are you doing here? M: I am waiting for the bus to go home.",
  "【5-6】 다음을 듣고, 물음에 답하시오. W: Hello everyone, some animals find their way home without a map.",
  "5번 여자가 하는 말의 주제로 가장 적절한 것을 고르시오. 6번 언급된 동물이 아닌 것을 고르시오.",
  "시그널 IN ANN : 수고하셨습니다.",
].join(" ");
export const TRANSCRIPT_SHA = "7".repeat(64);

/** Sections exactly as the tools split the fixture transcript. */
export function sectionsFor(record = makeRecord()) {
  const plans = questionPlans(record);
  const { sections, reason } = scriptSections(
    TRANSCRIPT,
    plans,
    plans.map((plan) => plan.ownSentence),
  );
  if (!sections)
    throw new Error("Fixture transcript does not split: " + reason);
  return sections;
}

export function buildLedger({
  record,
  native,
  probes,
  sections = sectionsFor(),
  asr = ASR,
}) {
  const plans = questionPlans(record);
  const set = probeSet(record, native, probes);
  const resolved = resolveSource({
    record,
    plans,
    native,
    probeSets: [set],
    asr,
    dialogue: null,
    sections,
  });
  const rows = resolved.rows.map((row) =>
    assembleRow({
      record,
      native,
      row,
      section: sections?.get(row.plan.sourceNumber) ?? null,
      transcriptSha256: TRANSCRIPT_SHA,
      check:
        resolved.heard.find(
          (item) =>
            item.probe.purpose === "existing_verified_check" &&
            item.probe.questionNumber === row.plan.sourceNumber,
        ) ?? null,
    }),
  );
  const count = (status) => rows.filter((row) => row.status === status).length;
  const marks = {
    schemaVersion: 1,
    evidenceContractVersion: 1,
    provider: "claude",
    inventorySha256: INVENTORY_SHA,
    policy: POLICY,
    counts: {
      candidate: count("candidate"),
      held: count("held"),
      existing_verified: count("existing_verified"),
    },
    records: rows,
  };
  const env = {
    inventorySha256: INVENTORY_SHA,
    records: [record],
    context: () => ({
      plans,
      sections,
      transcriptText: TRANSCRIPT,
      transcriptSha256: TRANSCRIPT_SHA,
    }),
    native: () => native,
    asr: () => asr,
    probeFile: (path) => {
      if (path !== set.path) throw new Error("no such probe file");
      return { sha256: set.sha256, artifact: set.artifact };
    },
  };
  return { plans, resolved, rows, marks, env, set };
}
