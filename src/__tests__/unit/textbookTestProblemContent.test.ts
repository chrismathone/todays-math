// @vitest-environment node
import type { Problem } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { problemCreateRequestSchema } from "@/contracts/problem.contract";
import { testProblemItemSchema } from "@/contracts/test.contract";
import type { ProblemSnapshot } from "@/contracts/textbookExchange.contract";
import { serializeTestProblemItem } from "@/lib/serializers";
import { gradeAnswers } from "@/lib/testResults/gradeAnswers";
import {
  contentOf,
  metadataOf,
  serializeFrozenTestProblemItem,
  snapshotOf,
  type TestSnapshotRow,
} from "@/lib/tests/testProblemContent";
import { contentHash, snapshotHash } from "@/lib/textbook/hash.server";

const PROBLEM_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PROBLEM_ID = "22222222-2222-4222-8222-222222222222";
const SNAPSHOT_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_SNAPSHOT_ID = "44444444-4444-4444-8444-444444444444";
const UNIT_ID = "55555555-5555-4555-8555-555555555555";
const LIVE_UNIT_ID = "66666666-6666-4666-8666-666666666666";
const OWNER_ID = "77777777-7777-4777-8777-777777777777";
const TEST_ID = "88888888-8888-4888-8888-888888888888";
const ITEM_ID = "99999999-9999-4999-8999-999999999999";
const CAPTURED_AT = "2026-10-03T01:00:00.000Z";
const SOURCE_UPDATED_AT = "2026-10-02T02:00:00.000Z";

function liveProblem(): Problem & {
  unit: { id: string; grade: string; chapter: string; section: string };
} {
  return {
    id: PROBLEM_ID,
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

function frozenSnapshot(
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

function testItem(snapshot = frozenSnapshot()) {
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

describe("시험지 고정 문항의 원문과 운영 상태", () => {
  it("은행이 바뀌어도 캡처 원문·단원·코드를 읽고 현재 출제 자격은 유지한다", () => {
    const snapshot = frozenSnapshot();
    const row = testItem(snapshot);
    const before = structuredClone(row);
    const content = contentOf(row);

    // 초5 표시 모델은 대분수로 바꿀 수 있어도 채점용 원문은 바뀌면 안 된다.
    expect(content.content).toBe(snapshot.payload.content);
    expect(content.answer).toBe(snapshot.payload.answer);
    expect(content.content).toContain("\r\ne\u0301");
    expect(content).toMatchObject({
      id: PROBLEM_ID,
      problemCode: "E50101-A01-001",
      unitId: UNIT_ID,
      difficulty: "기본",
      problemType: "계산",
      familyKey: snapshot.familyKey,
      solution: null,
      questionType: null,
      score: 3.5,
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
      choiceFigureIndex: [],
      figureSvg: null,
      unit: {
        id: UNIT_ID,
        grade: "초5",
        chapter: "분수",
        section: "고정한 소단원",
      },
      reviewStatus: "rejected",
      directUseAllowed: false,
      pool: "private",
    });
    expect(content.createdAt.toISOString()).toBe(CAPTURED_AT);
    expect(content.updatedAt.toISOString()).toBe(SOURCE_UPDATED_AT);
    expect(row).toEqual(before);
  });

  it.each([0, null])(
    "원본 배점 %s을 최신 은행 배점으로 채우지 않는다",
    (originalScore) => {
      const base = frozenSnapshot();
      const row = testItem(
        frozenSnapshot({
          sourceMetadata: { ...base.sourceMetadata!, originalScore },
        }),
      );
      expect(metadataOf(row)).toEqual({
        unitId: UNIT_ID,
        difficulty: "기본",
        score: originalScore,
        unitLabel: { grade: "초5", chapter: "분수", section: "고정한 소단원" },
      });
      expect(contentOf(row).score).toBe(originalScore);
      expect(row.score).toBe(11);
    },
  );

  it.each([
    { originalScore: 0, adjustedScore: 7, expectedScore: 7 },
    { originalScore: 3.5, adjustedScore: 0, expectedScore: 0 },
    { originalScore: null, adjustedScore: null, expectedScore: 100 },
  ])(
    "고정 정답을 채점하고 시험지 배점 $adjustedScore을 우선한다",
    ({ originalScore, adjustedScore, expectedScore }) => {
      const base = frozenSnapshot();
      const row = testItem(
        frozenSnapshot({
          payload: { ...base.payload, answer: " 2\r\n" },
          sourceMetadata: { ...base.sourceMetadata!, originalScore },
        }),
      );
      row.score = adjustedScore;
      const content = contentOf(row);
      const result = gradeAnswers(
        [
          {
            problemId: PROBLEM_ID,
            selectedChoice: 2,
            essayScore: null,
            sequence: 2,
          },
        ],
        [
          {
            id: content.id,
            unitId: content.unitId,
            difficulty: content.difficulty,
            answer: content.answer,
            score: content.score,
            adjustedScore: row.score,
          },
        ],
      );
      expect(content.answer).toBe(" 2\r\n");
      expect(result.graded[0]).toMatchObject({
        isCorrect: true,
        unitId: UNIT_ID,
        difficulty: "기본",
        maxPoints: expectedScore,
      });
      expect(result.score).toBe(expectedScore);
    },
  );
});

describe("시험지 고정 문항의 실제 응답 계약", () => {
  it.each([
    { label: "null", solution: null },
    { label: "빈 문자열", solution: "" },
    { label: "공백·CRLF", solution: " \r\n\t" },
  ])("해설 $label을 바꾸지 않고 응답 schema를 통과한다", ({ solution }) => {
    const base = frozenSnapshot();
    const row = testItem(
      frozenSnapshot({ payload: { ...base.payload, solution } }),
    );
    const parsed = testProblemItemSchema.parse(
      serializeFrozenTestProblemItem(row),
    );
    expect(parsed.problem.solution).toBe(solution);
    expect(parsed.problem.questionType).toBeNull();
    expect(parsed.snapshotId).toBe(SNAPSHOT_ID);
    expect(parsed.problem.figureUrls).toEqual([]);
    expect(parsed.problem.figureDims).toEqual([]);
    expect(parsed.problem.figureSourceMm).toEqual([]);
    expect(parsed.problem.choiceFigureIndex).toEqual([]);
  });

  it.each([0, 10_001, 100_000])(
    "길이 %s의 고정 텍스트를 상세 응답에서 잃지 않는다",
    (length) => {
      const text = "가".repeat(length);
      const base = frozenSnapshot();
      const row = testItem(
        frozenSnapshot({
          payload: {
            ...base.payload,
            content: text,
            answer: text,
            solution: text,
          },
        }),
      );
      const parsed = testProblemItemSchema.parse(
        serializeFrozenTestProblemItem(row),
      );
      expect(parsed.problem.content).toBe(text);
      expect(parsed.problem.answer).toBe(text);
      expect(parsed.problem.solution).toBe(text);
    },
  );

  it("읽기 확장이 문제 등록의 빈 본문 금지나 읽기 상한까지 풀지는 않는다", () => {
    const parsed = testProblemItemSchema.parse(
      serializeFrozenTestProblemItem(testItem()),
    );
    expect(
      testProblemItemSchema.safeParse({
        ...parsed,
        problem: { ...parsed.problem, content: "가".repeat(100_001) },
      }).success,
    ).toBe(false);
    expect(
      problemCreateRequestSchema.safeParse({
        unitId: UNIT_ID,
        source: "manual",
        difficulty: "기본",
        problemType: "계산",
        content: "",
        answer: "2",
      }).success,
    ).toBe(false);
  });

  it("고정 그림의 순서·실측치·물리폭과 모르는 보기 짝 null을 함께 내보낸다", () => {
    const firstId = "a".repeat(64);
    const secondId = "b".repeat(64);
    const base = frozenSnapshot();
    const row = testItem(
      frozenSnapshot({
        payload: {
          ...base.payload,
          figures: [
            {
              assetId: firstId,
              sha256: firstId,
              choiceIndex: null,
              sourceWidthMm: 12,
              altText: null,
            },
            {
              assetId: secondId,
              sha256: secondId,
              choiceIndex: 3,
              sourceWidthMm: 24,
              altText: null,
            },
          ],
        },
      }),
    );
    const snapshotAssets = new Map([
      [
        firstId,
        { url: "data:image/png;base64,Zmlyc3Q=", widthPx: 40, heightPx: 80 },
      ],
      [
        secondId,
        { url: "data:image/png;base64,c2Vjb25k", widthPx: 60, heightPx: 90 },
      ],
    ]);
    const parsed = testProblemItemSchema.parse(
      serializeFrozenTestProblemItem({ ...row, snapshotAssets }),
    );
    expect(parsed.problem.figureUrls).toEqual([
      "data:image/png;base64,Zmlyc3Q=",
      "data:image/png;base64,c2Vjb25k",
    ]);
    expect(parsed.problem.figureDims).toEqual([40, 80, 60, 90]);
    expect(parsed.problem.figureSourceMm).toEqual([12, 24]);
    expect(parsed.problem.choiceFigureIndex).toEqual([null, 3]);
    expect(() => contentOf(row)).toThrow();
  });
});

describe("고정 문항의 동일성·무결성", () => {
  it("snapshotId가 있는데 관계가 빠지거나 다른 행이면 live 내용으로 대체하지 않는다", () => {
    const row = testItem();
    expect(() => snapshotOf({ ...row, snapshot: null })).toThrow();
    expect(() => contentOf({ ...row, snapshot: undefined })).toThrow();
    expect(() =>
      contentOf({
        ...row,
        snapshot: { ...row.snapshot, id: OTHER_SNAPSHOT_ID },
      }),
    ).toThrow();
  });

  it("유효한 해시여도 다른 원본 ID 또는 다른 source namespace는 거절한다", () => {
    for (const source of [
      {
        system: "todays-math" as const,
        problemId: OTHER_PROBLEM_ID,
        problemCode: "E50101-A01-001",
      },
      { system: "studio-authored" as const, localId: "local-problem" },
    ]) {
      const row = testItem(frozenSnapshot({ source }));
      expect(() => snapshotOf(row)).toThrow(/원본 ID/);
      expect(() => serializeFrozenTestProblemItem(row)).toThrow();
    }
  });

  it("정답 변경과 contentHash 자체 변경을 모두 거절한다", () => {
    const snapshot = frozenSnapshot();
    const row = testItem(snapshot);
    expect(() =>
      contentOf({
        ...row,
        snapshot: {
          ...row.snapshot,
          payload: { ...snapshot.payload, answer: "변조 정답" },
        },
      }),
    ).toThrow(/해시/);
    expect(() =>
      metadataOf({
        ...row,
        snapshot: { ...row.snapshot, contentHash: "f".repeat(64) },
      }),
    ).toThrow(/해시/);
  });

  it("payload가 같아도 출처·원본 배열·배점 또는 snapshotHash가 변하면 거절한다", () => {
    const snapshot = frozenSnapshot();
    const row = testItem(snapshot);
    const variants: TestSnapshotRow[] = [
      {
        ...row.snapshot,
        sourceRef: { ...snapshot.source, problemCode: "E50101-A01-002" },
      },
      {
        ...row.snapshot,
        rawSource: { ...snapshot.rawSource!, figureDims: [123, 456] },
      },
      {
        ...row.snapshot,
        sourceMetadata: { ...snapshot.sourceMetadata!, originalScore: 99 },
      },
      { ...row.snapshot, snapshotHash: "f".repeat(64) },
    ];
    for (const stored of variants)
      expect(() => snapshotOf({ ...row, snapshot: stored })).toThrow(/해시/);
  });

  it("원본 FK의 삭제 여부 대신 불변 source.problemId를 동일성으로 쓴다", () => {
    const row = testItem();
    const detached = { ...row, snapshot: { ...row.snapshot, problemId: null } };
    expect(snapshotOf(detached)?.source).toEqual({
      system: "todays-math",
      problemId: PROBLEM_ID,
      problemCode: "E50101-A01-001",
    });
    expect(contentOf(detached).content).toBe(frozenSnapshot().payload.content);
  });
});

describe("snapshotId 없는 기존 시험지", () => {
  it("null 연결은 같은 live 객체와 기존 직렬화 모양을 유지한다", () => {
    const row = { ...testItem(), snapshotId: null };
    expect(snapshotOf(row)).toBeNull();
    expect(contentOf(row)).toBe(row.problem);
    expect(metadataOf(row)).toEqual({
      unitId: LIVE_UNIT_ID,
      difficulty: "심화상",
      score: 87,
      unitLabel: null,
    });
    const before = serializeTestProblemItem(row);
    const actual = serializeFrozenTestProblemItem(row);
    expect(actual).toEqual(before);
    expect(testProblemItemSchema.parse(actual)).toEqual(before);
    expect(actual).not.toHaveProperty("snapshotId");
    for (const field of ["figureDims", "figureSourceMm", "choiceFigureIndex"])
      expect(actual.problem).not.toHaveProperty(field);
  });

  it("옛 호출자의 snapshotId 생략도 그대로 읽는다", () => {
    const row = { problemId: PROBLEM_ID, problem: liveProblem() };
    expect(snapshotOf(row)).toBeNull();
    expect(contentOf(row)).toBe(row.problem);
  });
});
