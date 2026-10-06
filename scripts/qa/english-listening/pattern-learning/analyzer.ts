import {
  GRADES,
  QUESTION_TYPES,
  TOPICS,
  STEM_FORMS,
  DISTRACTOR_SIGNALS,
  loadAssessmentPatterns,
  type AssessmentPatterns,
  type PatternGrade,
  type PatternQuestionType,
  type SplitPatterns,
} from "../../../../src/lib/english/listening/creation/assessmentPatterns";

export interface PrivateQuestion {
  id: string;
  prompt?: string;
  instruction?: string;
  choices?: { id?: string; text?: string }[];
  answerChoiceId?: string;
  responseType?: string;
  image?: unknown;
  audioRange?: { startMs?: number; endMs?: number };
  metadata?: {
    questionType?: string;
    topics?: string[];
    classification?: { method?: string };
  };
}
export interface PrivateRecord {
  sourceRecordId: string;
  setId: string;
  reconstructed: boolean;
  asrPath?: string;
  preparedPath?: string;
  alignmentPath?: string;
  audio?: { durationMs?: number };
  questions?: unknown[];
  document?: {
    level: string;
    groups: {
      audio?: { durationMs?: number };
      transcript?: { text?: string; spokenText?: string };
      questions: PrivateQuestion[];
    }[];
  };
}
export interface TranscriptRow {
  set_id: string;
  profile: string;
  text?: string;
  display_text?: string;
  duration_ms?: number;
  words?: { start: number; end: number; text: string }[];
  timing_quality?: { durationMatched?: boolean };
}
export interface Supplement {
  asr?: {
    durationSeconds?: number;
    humanReviewed?: boolean;
    segments?: {
      text?: string;
      uncertain?: boolean;
      speaker?: unknown;
      speakerId?: unknown;
      speaker_id?: unknown;
    }[];
  };
  prepared?: unknown;
  alignment?: { humanReviewed?: boolean };
}
export interface PrivateCoverage {
  sourceRecordId: string;
  setId: string;
  grade: PatternGrade;
  reconstructed: boolean;
  liveQuestionsProcessed: number;
  asrRead: boolean;
  preparedRead: boolean;
  alignmentRead: boolean;
  databaseEnglishPresent: boolean;
  databaseBilingualPresent: boolean;
  transcriptPresent: boolean;
}
export const EXPECTED_POPULATION = {
  sources: 193,
  questions: 3699,
  officialSources: 121,
  officialQuestions: 2417,
  reconstructedSources: 72,
  reconstructedQuestions: 1282,
} as const;
export type ExpectedPopulation = {
  [K in keyof typeof EXPECTED_POPULATION]: number;
};
const GRADE_MAP: Record<string, PatternGrade> = {
  중1: "middle1",
  중2: "middle2",
  중3: "middle3",
  고1: "high1",
  고2: "high2",
  고3: "high3",
  ...Object.fromEntries(GRADES.map((g) => [g, g])),
};
const tokens = (text: string) =>
  text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
const nonempty = (text?: string) =>
  typeof text === "string" && text.trim().length > 0;
const zeros = <T extends readonly string[]>(
  labels: T,
): Record<T[number], number> =>
  Object.fromEntries(labels.map((k) => [k, 0])) as Record<T[number], number>;
const emptyMetric = () => ({
  count: 0,
  missing: 0,
  min: null,
  p10: null,
  median: null,
  p90: null,
  max: null,
  mean: null,
});

function emptyStats(): SplitPatterns {
  return {
    sources: 0,
    questions: 0,
    questionCountHistogram: [],
    types: {
      observedMetadata: zeros(QUESTION_TYPES),
      inferredMetadata: zeros(QUESTION_TYPES),
      inferredStem: zeros(QUESTION_TYPES),
      unresolved: 0,
      effective: zeros(QUESTION_TYPES),
    },
    stemForms: zeros(STEM_FORMS),
    responseForms: {
      fiveChoice: 0,
      shortResponse: 0,
      otherChoice: 0,
      unknown: 0,
    },
    stemLanguage: { koreanPresent: 0, koreanAbsent: 0, empty: 0 },
    choiceLanguage: zeros([
      "korean",
      "english",
      "mixed",
      "nonverbal_or_empty",
    ] as const),
    questionStructure: {
      dialogueInferred: 0,
      monologueInferred: 0,
      unknown: 0,
      sharedInstructionQuestionsInferred: 0,
      sharedInstructionSourcesInferred: 0,
      sharedStructureUnknownQuestions: 0,
      imagePresent: 0,
      twoGenderRolesMentioned: 0,
    },
    topics: {
      questionMetadataInferred: zeros(TOPICS),
      questionTextInferred: zeros(TOPICS),
      transcriptSourcesInferred: zeros(TOPICS),
      questionsWithoutTopicSignal: 0,
      transcriptSourcesWithoutTopicSignal: 0,
    },
    distractorSignalsInferred: zeros(DISTRACTOR_SIGNALS),
    transcript: {
      selectedDatabaseEnglish: 0,
      selectedDocument: 0,
      selectedLocalAsr: 0,
      missing: 0,
      databaseEnglishMissing: 0,
      databaseBilingualMissing: 0,
      documentMissing: 0,
      localAsrMissing: 0,
      selectedContainsKorean: 0,
      sourceTextWithSpeakerMarkers: 0,
      asrWithDiarization: 0,
      speakerCountUnknown: 0,
      turnCountUnknown: 0,
      asrHumanReviewed: 0,
      uncertainAsrSegments: 0,
      totalAsrSegments: 0,
    },
    timing: {
      databaseDurationMatched: 0,
      databaseDurationUnmatchedOrUnknown: 0,
      databasePositiveInBoundsWords: 0,
      databaseDefectiveOrMissingWords: 0,
      alignmentHumanReviewed: 0,
      inBoundsSeekRanges: 0,
      invalidOrMissingSeekRanges: 0,
      seekRangesEndingAtSourceEnd: 0,
      sourcesWithOverlappingSeekRanges: 0,
    },
    proxies: {
      sourceDurationSeconds: emptyMetric(),
      englishWordsPerSource: emptyMetric(),
      englishWordsPerAudioMinute: emptyMetric(),
      englishLongWordRatio: emptyMetric(),
      englishUniqueWordRatio: emptyMetric(),
      englishWordsPerPunctuationSentence: emptyMetric(),
      labeledTurnsPerSource: emptyMetric(),
      labeledSpeakersPerSource: emptyMetric(),
    },
  };
}
type ProxyKey = keyof SplitPatterns["proxies"];
interface Accumulator {
  stats: SplitPatterns;
  values: Record<ProxyKey, (number | null)[]>;
}
function accumulator(): Accumulator {
  const stats = emptyStats();
  return {
    stats,
    values: Object.fromEntries(
      Object.keys(stats.proxies).map((k) => [k, [] as (number | null)[]]),
    ) as Accumulator["values"],
  };
}
function summarize(
  values: (number | null)[],
): SplitPatterns["proxies"][ProxyKey] {
  const known = values
    .filter((n): n is number => n !== null && Number.isFinite(n))
    .sort((a, b) => a - b);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const quantile = (fraction: number) => {
    if (!known.length) return null;
    const position = (known.length - 1) * fraction;
    const lower = Math.floor(position),
      upper = Math.ceil(position);
    return round(
      known[lower] + (known[upper] - known[lower]) * (position - lower),
    );
  };
  return {
    count: known.length,
    missing: values.length - known.length,
    min: known.length ? round(known[0]) : null,
    p10: quantile(0.1),
    median: quantile(0.5),
    p90: quantile(0.9),
    max: known.length ? round(known[known.length - 1]) : null,
    mean: known.length
      ? round(known.reduce((a, b) => a + b, 0) / known.length)
      : null,
  };
}
function finalize(acc: Accumulator): SplitPatterns {
  for (const key of Object.keys(acc.values) as ProxyKey[])
    acc.stats.proxies[key] = summarize(acc.values[key]);
  acc.stats.questionCountHistogram.sort(
    (a, b) => a.questionCount - b.questionCount,
  );
  return acc.stats;
}

const TYPE_RULES: [PatternQuestionType, RegExp][] = [
  ["reply", /응답|응대|이어질|마지막 말.*(대답|반응)/],
  ["visual", /그림|도표|포스터|일정표|시간표|표를 보고/],
  ["emotion", /심정|기분|감정/],
  ["relationship", /관계/],
  ["location", /장소|어디|목적지/],
  ["purpose", /목적|의도/],
  ["number", /얼마|금액|비용|지불|시각|시간|몇 시|개수|수량|가격/],
  ["opinion", /의견|주장|견해/],
  ["gist", /주제|요지|제목|중심 내용/],
  ["sequence", /순서/],
  ["inference", /추론|암시/],
  [
    "detail",
    /내용.*(일치|옳|맞)|일치.*(내용|것)|이유|할 일|부탁|언급|언제|무엇|무슨|어떤|몇/,
  ],
];
const FORM_BY_TYPE: Record<PatternQuestionType, (typeof STEM_FORMS)[number]> = {
  detail: "detail_selection",
  emotion: "affective_state",
  relationship: "participant_relation",
  location: "setting_identification",
  reply: "response_completion",
  purpose: "speaker_intention",
  visual: "visual_matching",
  number: "quantity_calculation",
  gist: "global_meaning",
  opinion: "speaker_position",
  inference: "implicit_meaning",
  sequence: "event_order",
  unknown: "unmatched",
};
export function inferStemType(text: string): PatternQuestionType {
  return TYPE_RULES.find(([, rule]) => rule.test(text))?.[0] ?? "unknown";
}
const NEGATIVE = /않은|없는|아닌|않는|아니한/;
const SHARED =
  /두 물음|두 질문|번부터\s*\d+\s*번까지|\[\s*\d+\s*[~～–−-]\s*\d+\s*\]/;
const TOPIC_RULES: Record<(typeof TOPICS)[number], RegExp> = {
  school:
    /학교|수업|학생|숙제|교실|시험|\b(?:school|class|student|homework|teacher|exam)\b/i,
  home: /가정|가족|집안|부모|\b(?:family|parent|kitchen|house|home)\b/i,
  shopping:
    /쇼핑|구매|상점|판매|가격|\b(?:shop|store|buy|price|sale|order|customer)\b/i,
  travel:
    /여행|교통|공항|기차|버스|\b(?:travel|airport|train|bus|hotel|flight|trip)\b/i,
  health:
    /건강|병원|진료|운동|\b(?:health|hospital|doctor|exercise|fitness|medicine)\b/i,
  leisure:
    /여가|취미|스포츠|휴가|\b(?:hobby|sport|game|vacation|movie|picnic)\b/i,
  work: /직업|직장|회사|업무|\b(?:work|office|job|company|meeting|interview)\b/i,
  community:
    /지역|행사|자원봉사|공공|\b(?:community|event|volunteer|library|festival)\b/i,
  environment:
    /환경|재활용|자연|\b(?:environment|recycle|nature|pollution|wildlife|energy)\b/i,
  technology:
    /기술|컴퓨터|인터넷|\b(?:technology|computer|internet|software|online|digital)\b/i,
  culture:
    /문화|공연|박물관|예술|\b(?:culture|concert|museum|art|music|exhibition)\b/i,
};
function topicSignals(text: string) {
  return TOPICS.filter((topic) => TOPIC_RULES[topic].test(text));
}
function speakerMarkers(text: string) {
  return [
    ...text.matchAll(
      /(?:^|\n)\s*(M|W|Man|Woman|Boy|Girl|Speaker\s*\d+)\s*:/gim,
    ),
  ].map((m) => m[1].toLowerCase());
}
function assertPopulation(
  records: PrivateRecord[],
  inventory: PrivateRecord[],
  expected: ExpectedPopulation,
) {
  if (
    records.length !== expected.sources ||
    inventory.length !== expected.sources
  )
    throw new Error("Population incomplete");
  for (const list of [records, inventory]) {
    if (
      list.some(
        (r) =>
          !r.sourceRecordId || !r.setId || typeof r.reconstructed !== "boolean",
      ) ||
      new Set(list.map((r) => r.sourceRecordId)).size !== expected.sources ||
      new Set(list.map((r) => r.setId)).size !== expected.sources
    )
      throw new Error("Population identity incomplete or duplicated");
  }
  const ids = new Set(inventory.map((r) => r.sourceRecordId));
  if (
    records.some(
      (r) =>
        !ids.has(r.sourceRecordId) ||
        !r.document ||
        !GRADE_MAP[r.document.level],
    )
  )
    throw new Error("Live document coverage incomplete");
  const invById = new Map(inventory.map((r) => [r.sourceRecordId, r]));
  if (
    records.some(
      (r) =>
        invById.get(r.sourceRecordId)!.reconstructed !== r.reconstructed ||
        invById.get(r.sourceRecordId)!.setId !== r.setId,
    )
  )
    throw new Error("Population attribution mismatch");
  for (const split of [false, true]) {
    const subset = records.filter((r) => r.reconstructed === split);
    const questions = subset.flatMap((r) =>
      r.document!.groups.flatMap((g) => g.questions),
    );
    if (
      subset.length !==
        (split ? expected.reconstructedSources : expected.officialSources) ||
      questions.length !==
        (split ? expected.reconstructedQuestions : expected.officialQuestions)
    )
      throw new Error("Population split incomplete");
    if (
      questions.some((q) => !q.id) ||
      new Set(questions.map((q) => q.id)).size !== questions.length
    )
      throw new Error("Question identity incomplete or duplicated");
  }
  if (
    expected.officialQuestions + expected.reconstructedQuestions !==
    expected.questions
  )
    throw new Error("Expected population inconsistent");
}

/** Every live question is visited once; raw data stays in memory or the private receipt. */
export function analyzeCorpus(
  packet: { records: PrivateRecord[]; transcripts: TranscriptRow[] },
  inventory: { records: PrivateRecord[] },
  supplements: Map<string, Supplement>,
  expected: ExpectedPopulation = EXPECTED_POPULATION,
): { patterns: AssessmentPatterns; privateCoverage: PrivateCoverage[] } {
  assertPopulation(packet.records, inventory.records, expected);
  const totals = { official: accumulator(), reconstructed: accumulator() };
  const grades = Object.fromEntries(
    GRADES.map((g) => [
      g,
      { official: accumulator(), reconstructed: accumulator() },
    ]),
  ) as Record<PatternGrade, typeof totals>;
  const rowMap = new Map<string, TranscriptRow[]>();
  const sourceSetIds = new Set(packet.records.map((r) => r.setId));
  const coverage: AssessmentPatterns["coverage"] = {
    inventoryRecords: inventory.records.length,
    liveDocuments: packet.records.length,
    matchedInventorySources: packet.records.length,
    frozenQuestionCountDifferences: 0,
    asrFilesRead: 0,
    preparedFilesRead: 0,
    alignmentFilesRead: 0,
    asrFilesMissing: 0,
    preparedFilesMissing: 0,
    alignmentFilesMissing: 0,
    databaseEnglishRows: 0,
    databaseBilingualRows: 0,
    unmatchedDatabaseRows: 0,
    duplicateDatabaseProfiles: 0,
    liveQuestionsProcessed: 0,
  };
  for (const row of packet.transcripts) {
    if (!sourceSetIds.has(row.set_id)) {
      coverage.unmatchedDatabaseRows++;
      continue;
    }
    if (row.profile === "english") coverage.databaseEnglishRows++;
    if (row.profile === "bilingual") coverage.databaseBilingualRows++;
    const rows = rowMap.get(row.set_id) ?? [];
    if (rows.some((r) => r.profile === row.profile))
      coverage.duplicateDatabaseProfiles++;
    rows.push(row);
    rowMap.set(row.set_id, rows);
  }
  if (coverage.duplicateDatabaseProfiles)
    throw new Error("Ambiguous database transcript profiles");
  const invById = new Map(inventory.records.map((r) => [r.sourceRecordId, r]));
  const privateCoverage: PrivateCoverage[] = [];
  for (const record of packet.records) {
    const grade = GRADE_MAP[record.document!.level];
    const split = record.reconstructed ? "reconstructed" : "official";
    const supplement = supplements.get(record.sourceRecordId) ?? {};
    for (const field of ["asr", "prepared", "alignment"] as const) {
      const readKey = `${field}FilesRead` as
        "asrFilesRead" | "preparedFilesRead" | "alignmentFilesRead";
      const missingKey = `${field}FilesMissing` as
        "asrFilesMissing" | "preparedFilesMissing" | "alignmentFilesMissing";
      coverage[supplement[field] ? readKey : missingKey]++;
    }
    const questions = record.document!.groups.flatMap((g) => g.questions);
    coverage.liveQuestionsProcessed += questions.length;
    if (
      invById.get(record.sourceRecordId)?.questions?.length !== questions.length
    )
      coverage.frozenQuestionCountDifferences++;
    const rows = rowMap.get(record.setId) ?? [];
    const englishRow = rows.find(
      (r) => r.profile === "english" && nonempty(r.text),
    );
    const bilingualRow = rows.find(
      (r) =>
        r.profile === "bilingual" &&
        (nonempty(r.text) || nonempty(r.display_text)),
    );
    const documentText = record
      .document!.groups.map(
        (g) => g.transcript?.spokenText || g.transcript?.text || "",
      )
      .join("\n")
      .trim();
    const asrText =
      supplement.asr?.segments
        ?.map((s) => s.text ?? "")
        .join("\n")
        .trim() ?? "";
    // Bilingual rows are coverage evidence, never an extra English-word observation.
    const selected = englishRow
      ? "selectedDatabaseEnglish"
      : nonempty(documentText)
        ? "selectedDocument"
        : nonempty(asrText)
          ? "selectedLocalAsr"
          : "missing";
    const text = englishRow?.text ?? (documentText || asrText);
    const durationMs =
      record.audio?.durationMs ??
      record.document!.groups[0]?.audio?.durationMs ??
      (supplement.asr?.durationSeconds
        ? supplement.asr.durationSeconds * 1000
        : undefined);
    const validDuration =
      typeof durationMs === "number" &&
      Number.isFinite(durationMs) &&
      durationMs > 0
        ? durationMs
        : null;
    const wordTokens = tokens(text);
    const sentences = text
      .split(/[.!?]+/)
      .map(tokens)
      .filter((s) => s.length > 0);
    const markers = speakerMarkers(text);
    const diarized =
      supplement.asr?.segments?.some(
        (s) => s.speaker != null || s.speakerId != null || s.speaker_id != null,
      ) ?? false;
    const timedWords = englishRow?.words ?? [];
    const allWordsValid =
      timedWords.length > 0 &&
      validDuration !== null &&
      timedWords.every(
        (w) =>
          Number.isFinite(w.start) &&
          Number.isFinite(w.end) &&
          w.start >= 0 &&
          w.end > w.start &&
          w.end <= validDuration,
      );
    const transcriptTopics = topicSignals(text);
    const sharedSource = questions.some((q) =>
      SHARED.test(`${q.instruction ?? ""} ${q.prompt ?? ""}`),
    );
    const ranges = questions
      .map((q) => q.audioRange)
      .filter(
        (r): r is NonNullable<typeof r> =>
          !!r && typeof r.startMs === "number" && typeof r.endMs === "number",
      );
    const overlapping = ranges.some((a, i) =>
      ranges
        .slice(i + 1)
        .some((b) => a.startMs! < b.endMs! && b.startMs! < a.endMs!),
    );
    for (const acc of [totals[split], grades[grade][split]]) {
      const s = acc.stats;
      s.sources++;
      s.questions += questions.length;
      const histogram = s.questionCountHistogram.find(
        (h) => h.questionCount === questions.length,
      );
      if (histogram) histogram.sources++;
      else
        s.questionCountHistogram.push({
          questionCount: questions.length,
          sources: 1,
        });
      s.transcript[selected]++;
      if (!englishRow) s.transcript.databaseEnglishMissing++;
      if (!bilingualRow) s.transcript.databaseBilingualMissing++;
      if (!nonempty(documentText)) s.transcript.documentMissing++;
      if (!nonempty(asrText)) s.transcript.localAsrMissing++;
      if (/[가-힣]/.test(text)) s.transcript.selectedContainsKorean++;
      if (markers.length) s.transcript.sourceTextWithSpeakerMarkers++;
      else {
        s.transcript.speakerCountUnknown++;
        s.transcript.turnCountUnknown++;
      }
      if (diarized) s.transcript.asrWithDiarization++;
      if (supplement.asr?.humanReviewed) s.transcript.asrHumanReviewed++;
      s.transcript.totalAsrSegments += supplement.asr?.segments?.length ?? 0;
      s.transcript.uncertainAsrSegments +=
        supplement.asr?.segments?.filter(
          (segment) => segment.uncertain === true,
        ).length ?? 0;
      if (englishRow?.timing_quality?.durationMatched === true)
        s.timing.databaseDurationMatched++;
      else s.timing.databaseDurationUnmatchedOrUnknown++;
      if (allWordsValid) s.timing.databasePositiveInBoundsWords++;
      else s.timing.databaseDefectiveOrMissingWords++;
      if (supplement.alignment?.humanReviewed)
        s.timing.alignmentHumanReviewed++;
      if (sharedSource) s.questionStructure.sharedInstructionSourcesInferred++;
      if (overlapping) s.timing.sourcesWithOverlappingSeekRanges++;
      transcriptTopics.forEach(
        (topic) => s.topics.transcriptSourcesInferred[topic]++,
      );
      if (!transcriptTopics.length)
        s.topics.transcriptSourcesWithoutTopicSignal++;
      const sourceValues: Partial<Record<ProxyKey, number | null>> = {
        sourceDurationSeconds:
          validDuration === null ? null : validDuration / 1000,
        englishWordsPerSource:
          selected === "missing" ? null : wordTokens.length,
        englishWordsPerAudioMinute:
          selected === "missing" || !validDuration
            ? null
            : (wordTokens.length * 60000) / validDuration,
        englishLongWordRatio: wordTokens.length
          ? wordTokens.filter((w) => w.length >= 8).length / wordTokens.length
          : null,
        englishUniqueWordRatio: wordTokens.length
          ? new Set(wordTokens).size / wordTokens.length
          : null,
        englishWordsPerPunctuationSentence: sentences.length
          ? sentences.reduce((n, sentence) => n + sentence.length, 0) /
            sentences.length
          : null,
        labeledTurnsPerSource: markers.length || null,
        labeledSpeakersPerSource: markers.length ? new Set(markers).size : null,
      };
      for (const [key, value] of Object.entries(sourceValues))
        acc.values[key as ProxyKey].push(value);
      for (const q of questions) {
        const stem = `${q.instruction ?? ""} ${q.prompt ?? ""}`.trim();
        const metadataType = QUESTION_TYPES.includes(
          q.metadata?.questionType as PatternQuestionType,
        )
          ? (q.metadata!.questionType as PatternQuestionType)
          : "unknown";
        const stemType = inferStemType(stem);
        let type = metadataType;
        if (metadataType !== "unknown") {
          const observed =
            !record.reconstructed &&
            q.metadata?.classification?.method === "source_label";
          s.types[observed ? "observedMetadata" : "inferredMetadata"][
            metadataType
          ]++;
        } else if (stemType !== "unknown") {
          type = stemType;
          s.types.inferredStem[type]++;
        } else s.types.unresolved++;
        s.types.effective[type]++;
        s.stemForms[
          NEGATIVE.test(stem) ? "negative_selection" : FORM_BY_TYPE[stemType]
        ]++;
        const choices = q.choices ?? [];
        if (choices.length === 5) s.responseForms.fiveChoice++;
        else if (q.responseType === "short_response")
          s.responseForms.shortResponse++;
        else if (choices.length) s.responseForms.otherChoice++;
        else s.responseForms.unknown++;
        if (!stem) s.stemLanguage.empty++;
        else if (/[가-힣]/.test(stem)) s.stemLanguage.koreanPresent++;
        else s.stemLanguage.koreanAbsent++;
        const choiceText = choices.map((c) => c.text ?? "").join(" ");
        const korean = /[가-힣]/.test(choiceText),
          english = /[a-z]/i.test(choiceText);
        s.choiceLanguage[
          korean && english
            ? "mixed"
            : korean
              ? "korean"
              : english
                ? "english"
                : "nonverbal_or_empty"
        ]++;
        if (/대화/.test(stem)) s.questionStructure.dialogueInferred++;
        else if (/하는 말|말을 듣고|담화|독백|강연|방송|안내/.test(stem))
          s.questionStructure.monologueInferred++;
        else s.questionStructure.unknown++;
        if (SHARED.test(stem))
          s.questionStructure.sharedInstructionQuestionsInferred++;
        else s.questionStructure.sharedStructureUnknownQuestions++;
        if (q.image != null) s.questionStructure.imagePresent++;
        if (/남자/.test(stem) && /여자/.test(stem))
          s.questionStructure.twoGenderRolesMentioned++;
        const metadataTopics = topicSignals(
          (q.metadata?.topics ?? []).join(" "),
        );
        const textTopics = topicSignals(`${stem} ${choiceText}`);
        metadataTopics.forEach(
          (topic) => s.topics.questionMetadataInferred[topic]++,
        );
        textTopics.forEach((topic) => s.topics.questionTextInferred[topic]++);
        if (!metadataTopics.length && !textTopics.length)
          s.topics.questionsWithoutTopicSignal++;
        if (choices.length > 1 && choices.every((c) => /\d/.test(c.text ?? "")))
          s.distractorSignalsInferred.numeric_alternatives++;
        if (NEGATIVE.test(stem))
          s.distractorSignalsInferred.negative_truth_selection++;
        if (type === "reply")
          s.distractorSignalsInferred.response_alternatives++;
        if (type === "visual")
          s.distractorSignalsInferred.visual_alternatives++;
        const choiceTokens = choices.map((c) => new Set(tokens(c.text ?? "")));
        if (
          choiceTokens.length > 1 &&
          [...choiceTokens[0]].some(
            (token) =>
              token.length >= 4 && choiceTokens.every((set) => set.has(token)),
          )
        )
          s.distractorSignalsInferred.shared_vocabulary_alternatives++;
        const lengths = choices.map(
          (c) => (c.text ?? "").trim().split(/\s+/).filter(Boolean).length,
        );
        if (lengths.length > 1 && lengths.every((n) => n > 0 && n <= 5))
          s.distractorSignalsInferred.parallel_brief_alternatives++;
        const range = q.audioRange;
        const validRange =
          validDuration !== null &&
          typeof range?.startMs === "number" &&
          typeof range.endMs === "number" &&
          Number.isFinite(range.startMs) &&
          Number.isFinite(range.endMs) &&
          range.startMs >= 0 &&
          range.endMs > range.startMs &&
          range.endMs <= validDuration;
        if (validRange) s.timing.inBoundsSeekRanges++;
        else s.timing.invalidOrMissingSeekRanges++;
        if (validRange && range!.endMs === validDuration)
          s.timing.seekRangesEndingAtSourceEnd++;
      }
    }
    privateCoverage.push({
      sourceRecordId: record.sourceRecordId,
      setId: record.setId,
      grade,
      reconstructed: record.reconstructed,
      liveQuestionsProcessed: questions.length,
      asrRead: !!supplement.asr,
      preparedRead: !!supplement.prepared,
      alignmentRead: !!supplement.alignment,
      databaseEnglishPresent: !!englishRow,
      databaseBilingualPresent: !!bilingualRow,
      transcriptPresent: selected !== "missing",
    });
  }
  const patterns = loadAssessmentPatterns({
    schemaVersion: 1,
    population: {
      sources: expected.sources,
      questions: expected.questions,
      official: {
        sources: expected.officialSources,
        questions: expected.officialQuestions,
      },
      reconstructed: {
        sources: expected.reconstructedSources,
        questions: expected.reconstructedQuestions,
      },
    },
    coverage,
    totals: {
      official: finalize(totals.official),
      reconstructed: finalize(totals.reconstructed),
    },
    grades: Object.fromEntries(
      GRADES.map((grade) => [
        grade,
        {
          official: finalize(grades[grade].official),
          reconstructed: finalize(grades[grade].reconstructed),
        },
      ]),
    ),
  });
  return { patterns, privateCoverage };
}
