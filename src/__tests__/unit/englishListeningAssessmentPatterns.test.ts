// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  GRADES,
  QUESTION_TYPES,
  assessmentPatternSchema,
  buildCreationBlueprint,
  loadAssessmentPatterns,
} from "../../lib/english/listening/creation/assessmentPatterns";
import {
  analyzeCorpus,
  EXPECTED_POPULATION,
  inferStemType,
  type ExpectedPopulation,
  type PrivateRecord,
  type Supplement,
  type TranscriptRow,
} from "../../../scripts/qa/english-listening/pattern-learning/analyzer";

// Authored fixture values are synthetic and contain no external source material.
function syntheticRecord(
  index: number,
  reconstructed: boolean,
  questionCount: number,
): PrivateRecord {
  return {
    sourceRecordId: `synthetic-source-${index}`,
    setId: `synthetic-set-${index}`,
    reconstructed,
    audio: { durationMs: 60000 },
    questions: Array(questionCount).fill(null),
    document: {
      level: GRADES[index % GRADES.length],
      groups: [
        {
          transcript: {
            spokenText: "Synthetic fixture words belong only to this test.",
          },
          questions: Array.from(
            { length: questionCount },
            (_, questionIndex) => ({
              id: `synthetic-question-${index}-${questionIndex}`,
              prompt: "합성 검증 자료",
              choices: Array.from({ length: 5 }, (_, n) => ({
                id: `synthetic-choice-${n}`,
                text: "합성 선택",
              })),
              metadata: {
                questionType: "detail",
                classification: {
                  method: reconstructed ? "ai" : "source_label",
                },
              },
            }),
          ),
        },
      ],
    },
  };
}
function analyze(
  records: PrivateRecord[],
  transcripts: TranscriptRow[] = [],
  supplements = new Map<string, Supplement>(),
) {
  const official = records.filter((r) => !r.reconstructed),
    reconstructed = records.filter((r) => r.reconstructed);
  const countQuestions = (rs: PrivateRecord[]) =>
    rs.reduce(
      (n, r) => n + r.document!.groups.flatMap((g) => g.questions).length,
      0,
    );
  const expected: ExpectedPopulation = {
    sources: records.length,
    questions: countQuestions(records),
    officialSources: official.length,
    officialQuestions: countQuestions(official),
    reconstructedSources: reconstructed.length,
    reconstructedQuestions: countQuestions(reconstructed),
  };
  return analyzeCorpus(
    { records, transcripts },
    { records },
    supplements,
    expected,
  );
}

describe("aggregate listening pattern learning", () => {
  it("visits all 193 population members and refuses omissions and duplicate identities", () => {
    const records = Array.from({ length: 193 }, (_, i) =>
      syntheticRecord(
        i,
        i >= 121,
        i < 121 ? (i === 120 ? 17 : 20) : i === 192 ? 4 : 18,
      ),
    );
    const packet = { records, transcripts: [] };
    const result = analyzeCorpus(packet, { records }, new Map());
    expect(result.patterns.population).toEqual({
      sources: 193,
      questions: 3699,
      official: { sources: 121, questions: 2417 },
      reconstructed: { sources: 72, questions: 1282 },
    });
    expect(result.privateCoverage).toHaveLength(193);
    expect(
      result.privateCoverage.reduce((n, r) => n + r.liveQuestionsProcessed, 0),
    ).toBe(3699);
    expect(() =>
      analyzeCorpus(
        { ...packet, records: records.slice(1) },
        { records },
        new Map(),
      ),
    ).toThrow("Population incomplete");
    expect(() =>
      analyzeCorpus(
        { ...packet, records: [records[0], ...records.slice(0, 192)] },
        { records },
        new Map(),
      ),
    ).toThrow("duplicated");
    expect(EXPECTED_POPULATION.questions).toBe(3699);
  });

  it("keeps reconstructed metadata out of observed official style even if mislabeled source_label", () => {
    const official = syntheticRecord(0, false, 1),
      reconstruction = syntheticRecord(1, true, 1);
    reconstruction.document!.groups[0].questions[0].metadata = {
      questionType: "inference",
      classification: { method: "source_label" },
    };
    const result = analyze([official, reconstruction]).patterns;
    expect(result.totals.official.types.observedMetadata.detail).toBe(1);
    expect(result.totals.official.types.effective.inference).toBe(0);
    expect(result.totals.reconstructed.types.observedMetadata.inference).toBe(
      0,
    );
    expect(result.totals.reconstructed.types.inferredMetadata.inference).toBe(
      1,
    );
    expect(buildCreationBlueprint("middle1", 10, result).allocation).toEqual([
      { type: "detail", count: 10, stemStructure: expect.any(String) },
    ]);
  });

  it("distinguishes observed labels, stem inferences, unknowns and unsupported grades", () => {
    const record = syntheticRecord(0, false, 3),
      questions = record.document!.groups[0].questions;
    questions[1].metadata = { questionType: "unknown" };
    questions[1].prompt = "합성 감정 범주";
    questions[2].metadata = { questionType: "unknown" };
    const p = analyze([record]).patterns;
    expect(p.totals.official.types.observedMetadata.detail).toBe(1);
    expect(p.totals.official.types.inferredStem.emotion).toBe(1);
    expect(p.totals.official.types.unresolved).toBe(1);
    expect(p.totals.official.types.effective.unknown).toBe(1);
    const unsupported = buildCreationBlueprint("high3", 3, p);
    expect(unsupported.officialSources).toBe(0);
    expect(unsupported.allocation[0].type).toBe("unknown");
    expect(unsupported.requiresTeacherDesign).toBe(true);
    expect(inferStemType("합성 분류 자료")).toBe("unknown");
  });

  it("attributes missing transcripts and falls back to document then ASR without using bilingual text as English", () => {
    const records = [0, 1, 2].map((i) => syntheticRecord(i, false, 1));
    records[1].document!.groups[0].transcript = { spokenText: "   ", text: "" };
    records[2].document!.groups[0].transcript = undefined;
    const transcripts: TranscriptRow[] = [
      {
        set_id: records[0].setId,
        profile: "bilingual",
        text: "Synthetic bilingual row is coverage evidence.",
      },
    ];
    const supplements = new Map<string, Supplement>([
      [
        records[1].sourceRecordId,
        { asr: { segments: [{ text: "Synthetic local ASR fixture." }] } },
      ],
    ]);
    const result = analyze(records, transcripts, supplements);
    expect(result.patterns.totals.official.transcript).toMatchObject({
      selectedDocument: 1,
      selectedLocalAsr: 1,
      selectedDatabaseEnglish: 0,
      missing: 1,
      databaseEnglishMissing: 3,
      databaseBilingualMissing: 2,
      documentMissing: 2,
    });
    expect(
      result.patterns.totals.official.proxies.englishWordsPerSource.missing,
    ).toBe(1);
    expect(result.privateCoverage[2].transcriptPresent).toBe(false);
  });

  it("does not double-count English and bilingual variants and rejects ambiguous duplicate profiles", () => {
    const record = syntheticRecord(0, false, 1);
    const english = {
      set_id: record.setId,
      profile: "english",
      text: "one two three",
    };
    const bilingual = {
      set_id: record.setId,
      profile: "bilingual",
      text: "one two three four five six",
    };
    const p = analyze([record], [english, bilingual]).patterns;
    expect(p.totals.official.proxies.englishWordsPerSource.mean).toBe(3);
    expect(p.coverage.databaseEnglishRows).toBe(1);
    expect(p.coverage.databaseBilingualRows).toBe(1);
    expect(() => analyze([record], [english, english])).toThrow("Ambiguous");
  });

  it("records seek tails and unknown speaker/turn counts without inventing per-question duration", () => {
    const record = syntheticRecord(0, false, 2);
    record.document!.groups[0].questions[0].audioRange = {
      startMs: 1000,
      endMs: 60000,
    };
    record.document!.groups[0].questions[1].audioRange = {
      startMs: 30000,
      endMs: 60000,
    };
    const s = analyze([record]).patterns.totals.official;
    expect(s.timing.seekRangesEndingAtSourceEnd).toBe(2);
    expect(s.timing.sourcesWithOverlappingSeekRanges).toBe(1);
    expect(s.transcript.speakerCountUnknown).toBe(1);
    expect(s.proxies.labeledTurnsPerSource).toMatchObject({
      count: 0,
      missing: 1,
      mean: null,
    });
    expect(s.proxies).not.toHaveProperty("questionRangeSeconds");
  });

  it("uses live document questions when frozen inventory question counts differ", () => {
    const record = syntheticRecord(0, false, 1);
    const expected = {
      sources: 1,
      questions: 1,
      officialSources: 1,
      officialQuestions: 1,
      reconstructedSources: 0,
      reconstructedQuestions: 0,
    };
    const p = analyzeCorpus(
      { records: [record], transcripts: [] },
      { records: [{ ...record, questions: [] }] },
      new Map(),
      expected,
    ).patterns;
    expect(p.coverage.liveQuestionsProcessed).toBe(1);
    expect(p.coverage.frozenQuestionCountDifferences).toBe(1);
  });

  it("strictly rejects raw source fields and dynamic text at every retained level", () => {
    const p = analyze([syntheticRecord(0, false, 1)]).patterns;
    expect(
      assessmentPatternSchema.safeParse({
        ...p,
        sourceTitle: "private synthetic title",
      }).success,
    ).toBe(false);
    const nested = structuredClone(p);
    Object.assign(nested.grades.middle1.official.transcript, {
      text: "private synthetic text",
    });
    expect(assessmentPatternSchema.safeParse(nested).success).toBe(false);
    const corrupted = structuredClone(p);
    Object.assign(corrupted.totals.official.types.effective, {
      detail: "private synthetic prompt",
    });
    expect(assessmentPatternSchema.safeParse(corrupted).success).toBe(false);
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain("synthetic-source");
    expect(serialized).not.toContain("Synthetic fixture");
    expect(() =>
      loadAssessmentPatterns({
        ...p,
        population: { ...p.population, questions: 2 },
      }),
    ).toThrow("mismatch");
  });

  it("loads the retained real aggregate with exact completeness, known/unknown accounting and all six grade blueprints", () => {
    const p = loadAssessmentPatterns();
    expect(p.coverage).toMatchObject({
      inventoryRecords: 193,
      liveDocuments: 193,
      matchedInventorySources: 193,
      asrFilesRead: 193,
      preparedFilesRead: 193,
      alignmentFilesRead: 193,
      databaseEnglishRows: 193,
      databaseBilingualRows: 193,
      liveQuestionsProcessed: 3699,
    });
    expect(p.totals.official.responseForms.fiveChoice).toBe(2417);
    expect(p.totals.reconstructed.responseForms.fiveChoice).toBe(1282);
    expect(p.totals.reconstructed.types.observedMetadata.detail).toBe(0);
    expect(p.totals.official.transcript.missing).toBe(0);
    expect(p.totals.reconstructed.transcript.missing).toBe(0);
    for (const grade of GRADES) {
      const blueprint = buildCreationBlueprint(grade);
      expect(blueprint.questionCount).toBe(20);
      expect(blueprint.allocation.reduce((n, a) => n + a.count, 0)).toBe(20);
      expect(blueprint.constraints.teacherReviewRequired).toBe(true);
      expect(
        blueprint.allocation.every((a) => QUESTION_TYPES.includes(a.type)),
      ).toBe(true);
    }
    expect(() => buildCreationBlueprint("middle1", 0)).toThrow();
    expect(() => buildCreationBlueprint("middle1", 3.5)).toThrow();
  });
});
