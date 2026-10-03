import { describe, expect, it } from "vitest";
import {
  textbookAttemptSubmitSchema,
  textbookConceptReviewSchema,
  textbookConceptTargetSchema,
} from "@/contracts/textbookConcept.contract";
import {
  textbookBlockSchema,
  textbookConfigSchema,
  textbookExchangeSchema,
  textbookItemLayoutSchema,
  textbookPackagePathSchema,
  textbookProblemSnapshotSchema,
  textbookVideoBindingSchema,
} from "@/contracts/textbookExchange.contract";
import {
  textbookPublishReserveSchema,
  textbookRequestSchema,
} from "@/contracts/textbook.contract";
import {
  textbookStudentBlankSchema,
  textbookStudentVideoSchema,
  textbookStudentAttemptSchema,
  textbookReviewStartSchema,
} from "@/contracts/textbookStudent.contract";

const id = "11111111-1111-4111-8111-111111111111";
const config = {
  bookId: id,
  schoolLevel: "elementary",
  grade: 5,
  semester: 1,
  volume: 1,
  volumeCount: 1,
  displayCode: "5-1-1",
  title: "분수의 덧셈",
  curriculumVersion: "2022",
  mode: "integrated",
  pageBudget: { target: 100, tolerance: 5, strict: false },
  print: {
    paper: "A4",
    innerMarginMm: 18,
    outerMarginMm: 12,
    sectionStart: "even-left",
    coverMode: "included",
    firstPhysicalPageIndex: 1,
  },
  videoPolicy: "optional",
};
const legacyPackage = {
  schemaVersion: "injaewon.textbook.exchange.v1",
  exportedAt: "2026-10-03T00:00:00.000Z",
  config,
  edition: {
    editionId: id,
    label: "1판 초안",
    status: "draft",
    revision: 1,
    publishedAt: null,
    manifestHash: null,
  },
  units: [],
  snapshots: [],
  items: [],
  assets: [],
  qrTargets: [],
  videoBindings: [],
  pageMap: [],
  rendererVersion: "1",
  templateVersion: "1",
};

describe("textbook shared contract boundaries", () => {
  it("does not expose unpublished video identities or teacher observation prose", () => {
    expect(
      textbookStudentVideoSchema.safeParse({
        state: "withdrawn",
        providerVideoId: "abcdefghijk",
        startSeconds: 0,
        endSeconds: null,
      }).success,
    ).toBe(false);
    expect(
      textbookStudentVideoSchema.safeParse({
        state: "ready",
        providerVideoId: null,
        startSeconds: 0,
        endSeconds: null,
      }).success,
    ).toBe(false);
    expect(
      textbookStudentAttemptSchema.safeParse({
        attemptId: id,
        form: "map",
        channel: "teacher-observed",
        response: "교사 개인 관찰",
        submittedAt: "2026-10-03T00:00:00.000Z",
        reviewStatus: "checked",
      }).success,
    ).toBe(false);
    expect(
      textbookReviewStartSchema.safeParse({
        status: "started",
        reasonCode: null,
        replayed: true,
        href: "/learn?view=collection",
      }).success,
    ).toBe(false);
  });
  it("rejects conflicting grading metadata while preserving mismatched raw figure array lengths", () => {
    const snapshot = {
      snapshotId: id,
      source: {
        system: "todays-math",
        problemId: id,
        problemCode: "E51403-TEST",
      },
      sourceUpdatedAt: null,
      capturedAt: "2026-10-03T00:00:00.000Z",
      unitId: id,
      familyKey: null,
      difficulty: "기본",
      problemType: "계산",
      payload: {
        format: "markdown-latex",
        content: "1+1",
        answer: "2",
        solution: null,
        questionType: null,
        figures: [],
      },
      contentHash: "a".repeat(64),
      rawSource: {
        figureUrls: ["/figures/x.png"],
        figureDims: [100],
        figureSourceMm: [],
        choiceFigureIndex: [],
        figureSvgAssetId: null,
      },
      sourceMetadata: {
        unitId: id,
        grade: "초5",
        chapter: "분수",
        section: "통분",
        difficulty: "기본",
        originalScore: null,
      },
    };
    expect(textbookProblemSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(
      textbookProblemSnapshotSchema.safeParse({
        ...snapshot,
        sourceMetadata: { ...snapshot.sourceMetadata, difficulty: "응용" },
      }).success,
    ).toBe(false);
  });
  it("preserves the exact absence of optional extensions in an older exchange", () => {
    expect(textbookExchangeSchema.parse(legacyPackage)).toEqual(legacyPackage);
    expect(
      "conceptIntegration" in textbookExchangeSchema.parse(legacyPackage),
    ).toBe(false);
  });
  it("rejects unknown fields and unsupported version instead of silently deleting data", () => {
    expect(
      textbookExchangeSchema.safeParse({ ...legacyPackage, futureData: {} })
        .success,
    ).toBe(false);
    expect(
      textbookExchangeSchema.safeParse({
        ...legacyPackage,
        schemaVersion: "injaewon.textbook.exchange.v2",
      }).success,
    ).toBe(false);
  });
  it("rejects impossible grade, volume and work-line combinations", () => {
    expect(
      textbookConfigSchema.safeParse({
        ...config,
        schoolLevel: "middle",
        grade: 5,
      }).success,
    ).toBe(false);
    expect(
      textbookConfigSchema.safeParse({ ...config, volume: 2 }).success,
    ).toBe(false);
    expect(
      textbookItemLayoutSchema.safeParse({
        columnSpan: 1,
        minWorkLines: 4,
        preferredWorkLines: 2,
        maxWorkLines: 6,
        keepTogether: true,
      }).success,
    ).toBe(false);
  });
  it("keeps graph, course and explorer references in separate namespaces", () => {
    expect(
      textbookConceptTargetSchema.safeParse({
        namespace: "course-section",
        cardId: "g5-common-denominator",
      }).success,
    ).toBe(false);
    expect(
      textbookConceptTargetSchema.parse({
        namespace: "course-section",
        courseSectionId: "5-1-4-3",
      }),
    ).toEqual({ namespace: "course-section", courseSectionId: "5-1-4-3" });
  });
  it("requires review evidence and disallows published unreviewed bindings", () => {
    expect(
      textbookConceptReviewSchema.safeParse({
        status: "confirmed",
        candidateRule: "manual",
        reviewedBy: null,
        reviewedAt: null,
        targetHash: null,
      }).success,
    ).toBe(false);
    expect(
      textbookVideoBindingSchema.safeParse({
        bindingId: id,
        snapshotId: id,
        videoId: id,
        status: "published",
        startSeconds: 0,
        endSeconds: null,
        reviewedAgainstHash: null,
      }).success,
    ).toBe(false);
  });
  it("does not permit answers or hidden keywords in student blank responses", () => {
    const blank = {
      form: "cloze",
      prompts: [
        {
          id: "e5-1-4-3-c1",
          label: "통분",
          pieces: [
            { kind: "text", text: "분모를 " },
            { kind: "blank", index: 0 },
          ],
        },
      ],
    };
    expect(textbookStudentBlankSchema.parse(blank)).toEqual(blank);
    expect(
      textbookStudentBlankSchema.safeParse({ ...blank, answer: "같게" })
        .success,
    ).toBe(false);
    expect(
      textbookStudentBlankSchema.safeParse({
        form: "cloze",
        prompts: [
          {
            ...blank.prompts[0],
            pieces: [{ kind: "blank", index: 0, text: "같게" }],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("student submissions cannot impersonate another student or submit unsupported paper forms", () => {
    expect(
      textbookAttemptSubmitSchema.safeParse({
        requestId: id,
        form: "term",
        response: "같게 합니다",
        studentId: id,
      }).success,
    ).toBe(false);
    expect(
      textbookAttemptSubmitSchema.safeParse({
        requestId: id,
        form: "figure",
        response: "답",
      }).success,
    ).toBe(false);
  });
  it("finalization accepts only a request identity and rejects client verdicts or PDFs", () => {
    expect(textbookRequestSchema.parse({ requestId: id })).toEqual({
      requestId: id,
    });
    expect(
      textbookRequestSchema.safeParse({
        requestId: id,
        passed: true,
        pageMap: [],
      }).success,
    ).toBe(false);
    expect(
      textbookPublishReserveSchema.safeParse({
        requestId: id,
        expectedRevision: 0,
      }).success,
    ).toBe(false);
  });
  it.each([
    "../secret",
    "/assets/x.png",
    "assets\\x.png",
    "C:/x.png",
    "assets/%2e%2e/x.png",
    "assets//x.png",
    "assets/../x.png",
  ])("rejects unsafe archive path %s", (path) => {
    expect(textbookPackagePathSchema.safeParse(path).success).toBe(false);
  });
  it("preserves the legacy recall block but refuses repetition checks on keyword and sentence steps", () => {
    const block = {
      blockId: "recall-1",
      kind: "concept-recall",
      phase: "study",
      markdown: "개념을 읽습니다.",
      showRepetitionChecks: true,
    };
    expect(textbookBlockSchema.parse(block)).toEqual(block);
    expect(
      textbookBlockSchema.safeParse({ ...block, phase: "keywords" }).success,
    ).toBe(false);
  });
});
