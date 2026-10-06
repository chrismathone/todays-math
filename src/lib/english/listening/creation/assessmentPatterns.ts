import { z } from "zod";
import retainedPatterns from "./assessment-patterns.json";

export const GRADES = [
  "middle1",
  "middle2",
  "middle3",
  "high1",
  "high2",
  "high3",
] as const;
export type PatternGrade = (typeof GRADES)[number];
export const QUESTION_TYPES = [
  "detail",
  "emotion",
  "relationship",
  "location",
  "reply",
  "purpose",
  "visual",
  "number",
  "gist",
  "opinion",
  "inference",
  "sequence",
  "unknown",
] as const;
export type PatternQuestionType = (typeof QUESTION_TYPES)[number];
export const TOPICS = [
  "school",
  "home",
  "shopping",
  "travel",
  "health",
  "leisure",
  "work",
  "community",
  "environment",
  "technology",
  "culture",
] as const;
export const STEM_FORMS = [
  "detail_selection",
  "negative_selection",
  "speaker_intention",
  "affective_state",
  "participant_relation",
  "setting_identification",
  "response_completion",
  "visual_matching",
  "quantity_calculation",
  "global_meaning",
  "speaker_position",
  "implicit_meaning",
  "event_order",
  "unmatched",
] as const;
export const DISTRACTOR_SIGNALS = [
  "numeric_alternatives",
  "negative_truth_selection",
  "response_alternatives",
  "visual_alternatives",
  "shared_vocabulary_alternatives",
  "parallel_brief_alternatives",
] as const;

const count = z.number().int().nonnegative();
const measure = z.number().nonnegative().nullable();
const closedCounts = <T extends readonly [string, ...string[]]>(labels: T) =>
  z
    .object(
      Object.fromEntries(labels.map((label) => [label, count])) as Record<
        T[number],
        typeof count
      >,
    )
    .strict();
export const metricSchema = z
  .object({
    count,
    missing: count,
    min: measure,
    p10: measure,
    median: measure,
    p90: measure,
    max: measure,
    mean: measure,
  })
  .strict();
const typeCounts = closedCounts(QUESTION_TYPES);
export const splitPatternSchema = z
  .object({
    sources: count,
    questions: count,
    questionCountHistogram: z.array(
      z.object({ questionCount: count, sources: count }).strict(),
    ),
    types: z
      .object({
        observedMetadata: typeCounts,
        inferredMetadata: typeCounts,
        inferredStem: typeCounts,
        unresolved: count,
        effective: typeCounts,
      })
      .strict(),
    stemForms: closedCounts(STEM_FORMS),
    responseForms: z
      .object({
        fiveChoice: count,
        shortResponse: count,
        otherChoice: count,
        unknown: count,
      })
      .strict(),
    stemLanguage: z
      .object({ koreanPresent: count, koreanAbsent: count, empty: count })
      .strict(),
    choiceLanguage: closedCounts([
      "korean",
      "english",
      "mixed",
      "nonverbal_or_empty",
    ]),
    questionStructure: z
      .object({
        dialogueInferred: count,
        monologueInferred: count,
        unknown: count,
        sharedInstructionQuestionsInferred: count,
        sharedInstructionSourcesInferred: count,
        sharedStructureUnknownQuestions: count,
        imagePresent: count,
        twoGenderRolesMentioned: count,
      })
      .strict(),
    topics: z
      .object({
        questionMetadataInferred: closedCounts(TOPICS),
        questionTextInferred: closedCounts(TOPICS),
        transcriptSourcesInferred: closedCounts(TOPICS),
        questionsWithoutTopicSignal: count,
        transcriptSourcesWithoutTopicSignal: count,
      })
      .strict(),
    distractorSignalsInferred: closedCounts(DISTRACTOR_SIGNALS),
    transcript: z
      .object({
        selectedDatabaseEnglish: count,
        selectedDocument: count,
        selectedLocalAsr: count,
        missing: count,
        databaseEnglishMissing: count,
        databaseBilingualMissing: count,
        documentMissing: count,
        localAsrMissing: count,
        selectedContainsKorean: count,
        sourceTextWithSpeakerMarkers: count,
        asrWithDiarization: count,
        speakerCountUnknown: count,
        turnCountUnknown: count,
        asrHumanReviewed: count,
        uncertainAsrSegments: count,
        totalAsrSegments: count,
      })
      .strict(),
    timing: z
      .object({
        databaseDurationMatched: count,
        databaseDurationUnmatchedOrUnknown: count,
        databasePositiveInBoundsWords: count,
        databaseDefectiveOrMissingWords: count,
        alignmentHumanReviewed: count,
        inBoundsSeekRanges: count,
        invalidOrMissingSeekRanges: count,
        seekRangesEndingAtSourceEnd: count,
        sourcesWithOverlappingSeekRanges: count,
      })
      .strict(),
    proxies: z
      .object({
        sourceDurationSeconds: metricSchema,
        englishWordsPerSource: metricSchema,
        englishWordsPerAudioMinute: metricSchema,
        englishLongWordRatio: metricSchema,
        englishUniqueWordRatio: metricSchema,
        englishWordsPerPunctuationSentence: metricSchema,
        labeledTurnsPerSource: metricSchema,
        labeledSpeakersPerSource: metricSchema,
      })
      .strict(),
  })
  .strict();
const populationSplit = z.object({ sources: count, questions: count }).strict();
const gradeSchema = z
  .object({ official: splitPatternSchema, reconstructed: splitPatternSchema })
  .strict();
export const assessmentPatternSchema = z
  .object({
    schemaVersion: z.literal(1),
    population: z
      .object({
        sources: count,
        questions: count,
        official: populationSplit,
        reconstructed: populationSplit,
      })
      .strict(),
    coverage: z
      .object({
        inventoryRecords: count,
        liveDocuments: count,
        matchedInventorySources: count,
        frozenQuestionCountDifferences: count,
        asrFilesRead: count,
        preparedFilesRead: count,
        alignmentFilesRead: count,
        asrFilesMissing: count,
        preparedFilesMissing: count,
        alignmentFilesMissing: count,
        databaseEnglishRows: count,
        databaseBilingualRows: count,
        unmatchedDatabaseRows: count,
        duplicateDatabaseProfiles: count,
        liveQuestionsProcessed: count,
      })
      .strict(),
    totals: z
      .object({
        official: splitPatternSchema,
        reconstructed: splitPatternSchema,
      })
      .strict(),
    grades: z
      .object({
        middle1: gradeSchema,
        middle2: gradeSchema,
        middle3: gradeSchema,
        high1: gradeSchema,
        high2: gradeSchema,
        high3: gradeSchema,
      })
      .strict(),
  })
  .strict();
export type SplitPatterns = z.infer<typeof splitPatternSchema>;
export type AssessmentPatterns = z.infer<typeof assessmentPatternSchema>;

/** Strict closed fields retain only numeric aggregates and fixed vocabulary. */
export function loadAssessmentPatterns(
  value: unknown = retainedPatterns,
): AssessmentPatterns {
  const parsed = assessmentPatternSchema.parse(value);
  const sum = (values: Record<string, number>) =>
    Object.values(values).reduce((total, n) => total + n, 0);
  for (const attribution of ["official", "reconstructed"] as const) {
    const total = parsed.totals[attribution];
    if (
      total.sources !== parsed.population[attribution].sources ||
      total.questions !== parsed.population[attribution].questions
    )
      throw new Error("Pattern population mismatch");
    if (
      GRADES.reduce((n, g) => n + parsed.grades[g][attribution].sources, 0) !==
        total.sources ||
      GRADES.reduce(
        (n, g) => n + parsed.grades[g][attribution].questions,
        0,
      ) !== total.questions
    )
      throw new Error("Pattern grade totals mismatch");
    for (const stats of [
      total,
      ...GRADES.map((g) => parsed.grades[g][attribution]),
    ]) {
      if (
        sum(stats.types.effective) !== stats.questions ||
        sum(stats.stemForms) !== stats.questions ||
        sum(stats.responseForms) !== stats.questions ||
        sum(stats.choiceLanguage) !== stats.questions
      )
        throw new Error("Pattern question accounting mismatch");
      if (
        sum(stats.types.observedMetadata) +
          sum(stats.types.inferredMetadata) +
          sum(stats.types.inferredStem) +
          stats.types.unresolved !==
        stats.questions
      )
        throw new Error("Pattern type attribution mismatch");
      if (
        stats.types.effective.unknown !== stats.types.unresolved ||
        stats.types.observedMetadata.unknown ||
        stats.types.inferredMetadata.unknown ||
        stats.types.inferredStem.unknown
      )
        throw new Error("Pattern unknown accounting mismatch");
      for (const type of QUESTION_TYPES.filter((type) => type !== "unknown")) {
        if (
          stats.types.effective[type] !==
          stats.types.observedMetadata[type] +
            stats.types.inferredMetadata[type] +
            stats.types.inferredStem[type]
        )
          throw new Error("Pattern effective type mismatch");
      }
      if (attribution === "reconstructed" && sum(stats.types.observedMetadata))
        throw new Error(
          "Reconstructed labels cannot be observed official evidence",
        );
      if (
        stats.transcript.selectedDatabaseEnglish +
          stats.transcript.selectedDocument +
          stats.transcript.selectedLocalAsr +
          stats.transcript.missing !==
        stats.sources
      )
        throw new Error("Pattern transcript accounting mismatch");
      if (
        sum(stats.stemLanguage) !== stats.questions ||
        stats.questionStructure.dialogueInferred +
          stats.questionStructure.monologueInferred +
          stats.questionStructure.unknown !==
          stats.questions ||
        stats.questionStructure.sharedInstructionQuestionsInferred +
          stats.questionStructure.sharedStructureUnknownQuestions !==
          stats.questions
      )
        throw new Error("Pattern structural accounting mismatch");
      if (
        stats.timing.inBoundsSeekRanges +
          stats.timing.invalidOrMissingSeekRanges !==
          stats.questions ||
        stats.timing.databasePositiveInBoundsWords +
          stats.timing.databaseDefectiveOrMissingWords !==
          stats.sources ||
        stats.timing.databaseDurationMatched +
          stats.timing.databaseDurationUnmatchedOrUnknown !==
          stats.sources
      )
        throw new Error("Pattern timing accounting mismatch");
      if (
        stats.questionCountHistogram.reduce((n, bin) => n + bin.sources, 0) !==
          stats.sources ||
        stats.questionCountHistogram.reduce(
          (n, bin) => n + bin.sources * bin.questionCount,
          0,
        ) !== stats.questions ||
        new Set(stats.questionCountHistogram.map((bin) => bin.questionCount))
          .size !== stats.questionCountHistogram.length
      )
        throw new Error("Pattern question-count histogram mismatch");
      for (const metric of Object.values(stats.proxies)) {
        if (
          metric.count + metric.missing !== stats.sources ||
          (metric.count === 0 ? metric.mean !== null : metric.mean === null)
        )
          throw new Error("Pattern measurement accounting mismatch");
      }
    }
    for (const type of QUESTION_TYPES) {
      if (
        GRADES.reduce(
          (n, g) => n + parsed.grades[g][attribution].types.effective[type],
          0,
        ) !== total.types.effective[type]
      )
        throw new Error("Pattern grade type totals mismatch");
    }
  }
  if (
    parsed.population.official.sources +
      parsed.population.reconstructed.sources !==
      parsed.population.sources ||
    parsed.population.official.questions +
      parsed.population.reconstructed.questions !==
      parsed.population.questions ||
    parsed.coverage.liveDocuments !== parsed.population.sources ||
    parsed.coverage.liveQuestionsProcessed !== parsed.population.questions
  )
    throw new Error("Pattern coverage mismatch");
  return parsed;
}

/** Author-written structural descriptions, never imported source stems. */
export const KOREAN_STEM_STRUCTURE = {
  detail:
    "한국어로 청취 대상과 찾아야 할 정보 범주를 지정하고 선택을 요구한다.",
  emotion: "한국어로 화자의 감정 상태를 판단할 대상을 지정한다.",
  relationship: "한국어로 참여자 사이의 관계를 추론할 대상을 지정한다.",
  location: "한국어로 사건이나 대화의 장소 범주를 지정한다.",
  reply: "한국어로 발화의 맥락과 응답할 차례를 지정한다.",
  purpose: "한국어로 화자의 의도나 전달 목적을 판단하도록 구성한다.",
  visual: "한국어로 청취 정보와 새로 제작한 시각 자료의 대응을 요구한다.",
  number: "한국어로 수량, 시간 또는 비용의 계산 대상을 지정한다.",
  gist: "한국어로 전체 내용의 중심 의미를 판단하도록 구성한다.",
  opinion: "한국어로 화자의 견해나 주장을 판단할 대상을 지정한다.",
  inference: "한국어로 직접 진술되지 않은 의미를 추론하도록 구성한다.",
  sequence: "한국어로 사건이나 행동 사이의 순서 관계를 판단하도록 구성한다.",
  unknown: "교사가 목적과 문항 유형을 먼저 결정한 뒤 한국어 구조를 설계한다.",
} satisfies Record<PatternQuestionType, string>;

export const ORIGINAL_GENERATION_CONSTRAINTS = Object.freeze({
  promptLanguage: "ko" as const,
  choiceLanguage: "follow-assessed-skill" as const,
  defaultChoiceCount: 5,
  shortResponseRequiresTeacherDesign: true,
  sharedQuestionLinksRequireTeacherDesign: true,
  newScenesNamesNumbersAndScripts: true,
  useSourceExamplesOrRetrieval: false,
  deterministicSingleCorrectAnswerCheck: true,
  verifyAnswerAgainstOriginalScript: true,
  teacherReviewRequired: true,
  treatProxiesAsDifficultyLabels: false,
});

export interface CreationBlueprint {
  grade: PatternGrade;
  questionCount: number | null;
  officialSources: number;
  reconstructedSourcesExcludedFromStyle: number;
  allocation: {
    type: PatternQuestionType;
    count: number;
    stemStructure: string;
  }[];
  observedTypeQuestions: number;
  inferredTypeQuestions: number;
  unresolvedTypeQuestions: number;
  difficultyProxies: SplitPatterns["proxies"];
  requiresTeacherDesign: boolean;
  constraints: typeof ORIGINAL_GENERATION_CONSTRAINTS;
}

/** Deterministic quota proposal from official evidence only; unknown slots stay unknown. */
export function buildCreationBlueprint(
  grade: PatternGrade,
  requestedCount?: number,
  patterns = loadAssessmentPatterns(),
): CreationBlueprint {
  if (!GRADES.includes(grade)) throw new Error("Unsupported pattern grade");
  if (
    requestedCount !== undefined &&
    (!Number.isSafeInteger(requestedCount) ||
      requestedCount < 1 ||
      requestedCount > 100)
  )
    throw new Error("Question count must be between 1 and 100");
  const official = patterns.grades[grade].official;
  const mode = [...official.questionCountHistogram].sort(
    (a, b) => b.sources - a.sources || a.questionCount - b.questionCount,
  )[0]?.questionCount;
  const questionCount = requestedCount ?? mode ?? null;
  const quotas = QUESTION_TYPES.map((type) => {
    const exact =
      official.questions && questionCount
        ? (official.types.effective[type] * questionCount) / official.questions
        : 0;
    return { type, count: Math.floor(exact), remainder: exact % 1 };
  });
  const allocated = quotas.reduce((n, q) => n + q.count, 0);
  if (questionCount && official.questions) {
    const ranked = [...quotas].sort(
      (a, b) =>
        b.remainder - a.remainder ||
        QUESTION_TYPES.indexOf(a.type) - QUESTION_TYPES.indexOf(b.type),
    );
    for (let i = 0; i < questionCount - allocated; i++) ranked[i].count++;
  } else if (questionCount)
    quotas.find((q) => q.type === "unknown")!.count = questionCount;
  return {
    grade,
    questionCount,
    officialSources: official.sources,
    reconstructedSourcesExcludedFromStyle:
      patterns.grades[grade].reconstructed.sources,
    allocation: quotas
      .filter((q) => q.count > 0)
      .map(({ type, count: n }) => ({
        type,
        count: n,
        stemStructure: KOREAN_STEM_STRUCTURE[type],
      })),
    observedTypeQuestions: Object.values(
      official.types.observedMetadata,
    ).reduce((n, q) => n + q, 0),
    inferredTypeQuestions:
      Object.values(official.types.inferredMetadata).reduce(
        (n, q) => n + q,
        0,
      ) + Object.values(official.types.inferredStem).reduce((n, q) => n + q, 0),
    unresolvedTypeQuestions: official.types.unresolved,
    difficultyProxies: official.proxies,
    requiresTeacherDesign: !official.sources || official.types.unresolved > 0,
    constraints: ORIGINAL_GENERATION_CONSTRAINTS,
  };
}
