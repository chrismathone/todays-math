import type { Problem } from "@prisma/client";
import type { ProblemSnapshot } from "@/contracts/textbookExchange.contract";
import type { TestSnapshotRow } from "@/lib/tests/testProblemContent";
import { contentHash, snapshotHash } from "@/lib/textbook/hash.server";

export const PROBLEM_ID = "11111111-1111-4111-8111-111111111111";
export const OTHER_PROBLEM_ID = "22222222-2222-4222-8222-222222222222";
export const SNAPSHOT_ID = "33333333-3333-4333-8333-333333333333";
export const OTHER_SNAPSHOT_ID = "44444444-4444-4444-8444-444444444444";
export const UNIT_ID = "55555555-5555-4555-8555-555555555555";
export const LIVE_UNIT_ID = "66666666-6666-4666-8666-666666666666";
export const OWNER_ID = "77777777-7777-4777-8777-777777777777";
export const TEST_ID = "88888888-8888-4888-8888-888888888888";
export const ITEM_ID = "99999999-9999-4999-8999-999999999999";
export const CAPTURED_AT = "2026-10-03T01:00:00.000Z";
export const SOURCE_UPDATED_AT = "2026-10-02T02:00:00.000Z";

export function liveProblem(): Problem & {
  unit: { id: string; grade: string; chapter: string; section: string };
} {
  return {
    id: PROBLEM_ID,
    questionGroupKey: null,
    userId: null,
    unitId: LIVE_UNIT_ID,
    source: "manual",
    originProblemId: null,
    difficulty: "심화상",
    problemType: "활용",
    questionType: "서술형",
    content: "은행에서 나중에 바꾼 본문",
    answer: "4",
    solution: "은행에서 나중에 추가한 해설",
    figureSvg: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="2"/></svg>',
    figureSource: "engine",
    figureUrls: ["/figures/live/new.png"],
    figureDims: [900, 800],
    figureSourceMm: [99],
    choiceFigureIndex: [5],
    externalId: null,
    sourceFile: null,
    school: null,
    subject: null,
    examId: null,
    questionNumber: null,
    score: 87,
    reviewStatus: "rejected",
    directUseAllowed: false,
    pool: "private",
    familyKey: "solo:changed-live-family",
    problemCode: "J30103-B02-009",
    sourceMaterialId: null,
    solutionSource: "none",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-03T05:00:00.000Z"),
    unit: {
      id: LIVE_UNIT_ID,
      grade: "중1",
      chapter: "변경한 대단원",
      section: "변경한 소단원",
    },
  };
}

export function frozenSnapshot(
  overrides: Partial<ProblemSnapshot> = {},
): ProblemSnapshot {
  const snapshot: ProblemSnapshot = {
    snapshotId: SNAPSHOT_ID,
    source: {
      system: "todays-math",
      problemId: PROBLEM_ID,
      problemCode: "E50101-A01-001",
    },
    capturedAt: CAPTURED_AT,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
    unitId: UNIT_ID,
    familyKey: "elem:초5|고정 단원|기본",
    difficulty: "기본",
    problemType: "계산",
    payload: {
      format: "markdown-latex",
      content:
        String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.` + "\r\ne\u0301",
      answer: String.raw` $\frac{13}{3}$ ` + "\r\n",
      solution: null,
      questionType: null,
      figures: [],
    },
    rawSource: {
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
      choiceFigureIndex: [],
      figureSvgAssetId: null,
    },
    sourceMetadata: {
      unitId: UNIT_ID,
      grade: "초5",
      chapter: "분수",
      section: "고정한 소단원",
      difficulty: "기본",
      originalScore: 3.5,
    },
    contentHash: "0".repeat(64),
    ...overrides,
  };
  snapshot.contentHash = contentHash(snapshot.payload);
  snapshot.snapshotHash = snapshotHash(snapshot);
  return snapshot;
}

export function testItem(snapshot = frozenSnapshot()) {
  const stored: TestSnapshotRow = {
    id: snapshot.snapshotId,
    userId: OWNER_ID,
    sourceRef: snapshot.source,
    sourceUpdatedAt: snapshot.sourceUpdatedAt
      ? new Date(snapshot.sourceUpdatedAt)
      : null,
    capturedAt: new Date(snapshot.capturedAt),
    unitId: snapshot.unitId,
    familyKey: snapshot.familyKey,
    difficulty: snapshot.difficulty,
    problemType: snapshot.problemType,
    payload: snapshot.payload,
    contentHash: snapshot.contentHash,
    rawSource: snapshot.rawSource,
    sourceMetadata: snapshot.sourceMetadata,
    snapshotHash: snapshot.snapshotHash!,
  };
  return {
    id: ITEM_ID,
    testId: TEST_ID,
    problemId: PROBLEM_ID,
    snapshotId: snapshot.snapshotId,
    snapshot: stored,
    orderIndex: 2,
    replaced: false,
    score: 11 as number | null,
    problem: liveProblem(),
  };
}
