// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  access: vi.fn(),
  srs: vi.fn(),
  reviewAccess: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/textbook/studentAccess", () => ({ resolveStudentQr: f.access }));
vi.mock("@/lib/math-srs/serverStore", () => ({ readSrsState: f.srs }));
vi.mock("@/lib/textbook/studentReview", () => ({
  textbookReviewAccess: f.reviewAccess,
}));

import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import {
  redirectStudentSession,
  studentTextbookRequest,
  TextbookStudentRequestError,
} from "@/components/learn/textbook/studentTextbookApi";
import {
  textbookConfigSchema,
  type ProblemSnapshot,
} from "@/contracts/textbookExchange.contract";
import { textbookStudentQrSchema } from "@/contracts/textbookStudent.contract";
import type { LectureRowLike } from "@/lib/concept/studentLecture";
import { SrsUnavailable } from "@/lib/math-srs/serverState";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";
import {
  conceptContentHash,
  contentHash,
  snapshotHash,
} from "@/lib/textbook/hash.server";
import type { SqlParam, TextbookSql } from "@/lib/textbook/server/sql";
import type { StudentQrTarget } from "@/lib/textbook/studentAccess";
import {
  readFrozenConcept,
  readStudentQr,
  studentConceptDto,
} from "@/lib/textbook/studentRead";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const EDITION_ID = "33333333-3333-4333-8333-333333333333";
const ITEM_ID = "44444444-4444-4444-8444-444444444444";
const SNAPSHOT_ID = "55555555-5555-4555-8555-555555555555";
const SLUG = "problem-qr-token-12345";
const NOW = new Date("2026-10-03T00:00:00.000Z");
const target: StudentQrTarget = {
  qrTargetId: ITEM_ID,
  slug: SLUG,
  kind: "item",
  editionId: EDITION_ID,
  ownerId: OWNER_ID,
  itemId: ITEM_ID,
  snapshotId: SNAPSHOT_ID,
  conceptKey: null,
  sectionId: null,
};
const conceptTarget: StudentQrTarget = {
  ...target,
  slug: "linked-allowed-token-12345",
  kind: "concept",
  conceptKey: "allowed",
  itemId: null,
  snapshotId: null,
};

function snapshot(): ProblemSnapshot {
  const value: ProblemSnapshot = {
    snapshotId: SNAPSHOT_ID,
    source: {
      system: "todays-math",
      problemId: ITEM_ID,
      problemCode: "E50101-A01-001",
    },
    sourceUpdatedAt: null,
    capturedAt: NOW.toISOString(),
    unitId: null,
    familyKey: null,
    difficulty: null,
    problemType: null,
    payload: {
      format: "markdown-latex",
      content: "학생에게 보여 줄 고정 문제",
      answer: "HIDDEN_ANSWER_CANARY",
      solution: "HIDDEN_SOLUTION_CANARY",
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
      unitId: null,
      grade: null,
      chapter: null,
      section: null,
      difficulty: null,
      originalScore: null,
    },
    contentHash: "0".repeat(64),
  };
  value.contentHash = contentHash(value.payload);
  value.snapshotHash = snapshotHash(value);
  return value;
}

function concept(): TextbookConcept {
  const section = "초5::분수::통분";
  const value: TextbookConcept = {
    conceptKey: "allowed",
    unitKey: "fractions",
    sectionKey: "concept",
    title: "통분",
    kind: "방법",
    unitId: null,
    body: {
      goal: "설명하기",
      prerequisites: [],
      definition: "TEACHER_MANUSCRIPT_CANARY",
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [],
    links: [],
    mappingVersion: "1",
    derivedFromConceptKey: null,
    frozen: {
      contentHash: "0".repeat(64),
      parserVersion: "1",
      compositionVersion: "1",
      mappingVersion: "1",
      sections: [
        { blankSectionKey: section, title: "통분", unitLabel: "분수" },
      ],
      entries: [
        {
          entryKind: "concept",
          payload: {
            id: "frozen-entry",
            section,
            term: "통분",
            kind: "방법",
            level: "하",
            definition: "분모를 {숨긴핵심어}로 바꾸는 방법입니다.",
            example: {
              prompt: "통분이란 무엇인가요?",
              answer: "EXAMPLE_ANSWER_CANARY",
            },
          },
        },
      ],
      selection: [
        {
          blankSectionKey: section,
          entryKind: "concept",
          entryId: "frozen-entry",
          form: "cloze",
          level: "하",
        },
      ],
      assetHashes: [],
    },
  };
  value.frozen!.contentHash = conceptContentHash(value);
  return value;
}

function fixture(policy?: "never" | "assigned") {
  const frozen = snapshot();
  const frozenConcept = concept();
  const config = textbookConfigSchema.parse({
    bookId: OWNER_ID,
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
    ...(policy ? { studentSolutionPolicy: policy } : {}),
  });
  const state = {
    frozen,
    frozenConcept,
    conceptLectures: [] as LectureRowLike[],
    conceptKeys: [] as string[],
    assets: [] as {
      assetId: string;
      widthPx: number | null;
      heightPx: number | null;
    }[],
    videos: [] as {
      status: string;
      provider: string;
      providerVideoId: string;
      startSeconds: number;
      endSeconds: number | null;
      reviewedAgainstHash: string | null;
      reviewedBy: string | null;
      reviewedAt: string | null;
    }[],
  };
  const query = vi.fn(
    async (
      statement: string,
      params: readonly SqlParam[] = [],
    ): Promise<unknown[]> => {
      if (statement.includes('FROM "textbook_problem_snapshot"')) {
        expect(params).toEqual([SNAPSHOT_ID, OWNER_ID]);
        return [state.frozen];
      }
      if (statement.includes('FROM "textbook_item" i JOIN')) {
        expect(params).toEqual([ITEM_ID, EDITION_ID]);
        return [{ displayNumber: "3", conceptKeys: state.conceptKeys, config }];
      }
      if (statement.includes('FROM "textbook_video_binding"')) {
        expect(params).toEqual([SNAPSHOT_ID, OWNER_ID]);
        return state.videos;
      }
      if (statement.includes('JOIN "concept_lecture"')) {
        expect(params).toEqual([
          EDITION_ID,
          state.frozenConcept.unitKey,
          state.frozenConcept.conceptKey,
          state.frozenConcept.unitId,
        ]);
        return state.conceptLectures;
      }
      if (statement.includes('FROM "textbook_asset"')) {
        expect(params).toEqual([
          OWNER_ID,
          JSON.stringify(
            state.frozen.payload.figures.map((figure) => figure.assetId),
          ),
        ]);
        return state.assets;
      }
      if (statement.includes('FROM "textbook_concept" c'))
        return [{ ...state.frozenConcept, blankForms: null }];
      if (statement.includes('FROM "textbook_concept"')) {
        const key = params[1];
        return key === "missing"
          ? []
          : [
              {
                conceptKey: key,
                title: key === "allowed" ? "허용 개념" : "OUTSIDE_TITLE_CANARY",
              },
            ];
      }
      if (statement.includes('FROM "textbook_qr_target"')) {
        return [
          {
            slug:
              params[1] === "allowed"
                ? conceptTarget.slug
                : "linked-outside-token-12345",
          },
        ];
      }
      throw new Error(`Unexpected SQL in student read test: ${statement}`);
    },
  );
  const execute = vi.fn(async () => {
    throw new Error("GET must not write");
  });
  const sql: TextbookSql = {
    query: async <T>(statement: string, params?: readonly SqlParam[]) =>
      (await query(statement, params)) as T[],
    execute,
  };
  return { state, sql, query, execute };
}

function refreshSnapshotHashes(value: ProblemSnapshot) {
  value.contentHash = contentHash(value.payload);
  value.snapshotHash = snapshotHash(value);
}

function freezeTree(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  f.access.mockImplementation(
    async (_sql: TextbookSql, studentId: string, slug: string) => {
      expect(studentId).toBe(STUDENT_ID);
      if (slug === SLUG) return { ok: true, target };
      if (slug === conceptTarget.slug)
        return { ok: true, target: conceptTarget };
      return { ok: false, reason: "not-assigned" };
    },
  );
  f.srs.mockResolvedValue({ revision: 0, state: {} });
  f.reviewAccess.mockReturnValue({
    available: false,
    reasonCode: "no-existing-concept-record",
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("학생 QR 클라이언트의 실제 요청·계정 변경 복구", () => {
  it.each([
    { message: STUDENT_CHANGED_MESSAGE, reload: true },
    {
      message: "같은 요청 번호로 다른 내용을 제출할 수 없습니다.",
      reload: false,
    },
  ])(
    "409 $message은 해당하는 복구만 실행한다",
    async ({ message, reload: shouldReload }) => {
      const reload = vi.fn();
      const assign = vi.fn();
      vi.stubGlobal("window", {
        location: { pathname: `/q/${SLUG}`, reload, assign },
      });
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: "CONFLICT", message } }),
            { status: 409, headers: { "content-type": "application/json" } },
          ),
        );
      vi.stubGlobal("fetch", fetch);
      // Keep both the request decoder and recovery helper real; only the HTTP response is supplied here.
      const error: unknown = await studentTextbookRequest(
        `/api/learn/textbook/q/${SLUG}`,
        textbookStudentQrSchema,
        { studentId: STUDENT_ID },
      ).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(TextbookStudentRequestError);
      expect(error).toMatchObject({ status: 409, message });
      expect(
        new Headers(fetch.mock.calls[0]![1]?.headers).get("x-student-id"),
      ).toBe(STUDENT_ID);
      redirectStudentSession(error);
      expect(reload).toHaveBeenCalledTimes(shouldReload ? 1 : 0);
      expect(assign).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
});

describe("학생 QR의 실제 고정 내용·공개 정책", () => {
  it("초등 QR의 본문·답·해설은 공통 분수 표시를 쓰되 고정 원문과 영상 검수 해시는 바꾸지 않는다", async () => {
    const { sql, state, execute } = fixture("assigned");
    const raw = state.frozen;
    raw.sourceMetadata!.grade = "초5";
    raw.payload.content =
      String.raw`$\frac{7}{3}$ m만큼 걸었습니다.` + "\r\n가";
    raw.payload.answer = String.raw`$\frac{13}{3}$ m`;
    raw.payload.solution = String.raw`남은 거리는 $\frac{10}{3}$ m입니다.`;
    refreshSnapshotHashes(raw);
    const before = JSON.stringify(raw);
    const hashes = {
      contentHash: raw.contentHash,
      snapshotHash: raw.snapshotHash,
    };
    state.videos = [
      {
        status: "published",
        provider: "youtube",
        providerVideoId: "abcdefghijk",
        startSeconds: 3,
        endSeconds: 12,
        reviewedAgainstHash: raw.contentHash,
        reviewedBy: OWNER_ID,
        reviewedAt: NOW.toISOString(),
      },
    ];
    freezeTree(raw);
    const shown = fractionViewFor({
      grade: raw.sourceMetadata!.grade,
      ...raw.payload,
    });
    const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
    expect(dto).toMatchObject({
      kind: "problem",
      textSolutionAvailable: true,
      content: shown(raw.payload.content),
      answer: shown(raw.payload.answer),
      solution: shown(raw.payload.solution!),
      video: { state: "ready", providerVideoId: "abcdefghijk" },
    });
    expect(dto).toMatchObject({
      content: String.raw`$2\frac{1}{3}$ m만큼 걸었습니다.` + "\r\n가",
      answer: String.raw`$4\frac{1}{3}$ m`,
      solution: String.raw`남은 거리는 $3\frac{1}{3}$ m입니다.`,
    });
    expect(JSON.stringify(raw)).toBe(before);
    expect(contentHash(raw.payload)).toBe(hashes.contentHash);
    expect(snapshotHash(raw)).toBe(hashes.snapshotHash);
    expect(await readStudentQr(sql, STUDENT_ID, SLUG, NOW)).toEqual(dto);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(["answer", "solution"] as const)(
    "비공개 %s에 있는 분수 이름도 공통 표시 판단에 쓰되 정답 내용은 보내지 않는다",
    async (field) => {
      const { sql, state } = fixture("never");
      const raw = state.frozen;
      raw.sourceMetadata!.grade = "초5";
      raw.payload.content = String.raw`$\frac{7}{3}$ m만큼 이동했습니다.`;
      raw.payload.answer = String.raw`$\frac{13}{3}$ HIDDEN_ANSWER_CANARY`;
      raw.payload.solution = String.raw`$\frac{10}{3}$ HIDDEN_SOLUTION_CANARY`;
      raw.payload[field] += " 가분수로 나타낸다.";
      refreshSnapshotHashes(raw);
      const before = JSON.stringify(raw);
      freezeTree(raw);
      const shown = fractionViewFor({
        grade: raw.sourceMetadata!.grade,
        ...raw.payload,
      });
      const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
      expect(dto).toMatchObject({
        kind: "problem",
        content: shown(raw.payload.content),
        textSolutionAvailable: false,
        answer: null,
        solution: null,
      });
      expect(dto).toHaveProperty("content", raw.payload.content);
      expect(JSON.stringify(dto)).not.toMatch(
        /HIDDEN_ANSWER_CANARY|HIDDEN_SOLUTION_CANARY|가분수로 나타낸다/,
      );
      expect(JSON.stringify(raw)).toBe(before);
      expect(contentHash(raw.payload)).toBe(raw.contentHash);
      expect(snapshotHash(raw)).toBe(raw.snapshotHash);
    },
  );

  it.each(["중2", null])(
    "출처 학년 %s은 초등 교재에 실려도 원문 표시와 null 해설을 보존한다",
    async (grade) => {
      const { sql, state } = fixture("assigned");
      state.frozen.sourceMetadata!.grade = grade;
      state.frozen.payload.content = String.raw`$\frac{7}{3}$을 계산하시오.`;
      state.frozen.payload.answer = String.raw`$\frac{13}{3}$`;
      state.frozen.payload.solution = null;
      refreshSnapshotHashes(state.frozen);
      const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
      expect(dto).toMatchObject({
        content: state.frozen.payload.content,
        answer: state.frozen.payload.answer,
        solution: null,
      });
    },
  );

  it("같은 자산의 반복 배치와 null·0·2 보기 연결을 순서·개별 폭·누락 치수 그대로 보존한다", async () => {
    const { sql, state, execute } = fixture();
    const first = "a".repeat(64),
      second = "b".repeat(64);
    state.frozen.payload.figures = [
      {
        assetId: first,
        sha256: first,
        choiceIndex: null,
        sourceWidthMm: 12,
        altText: "본문 그림",
      },
      {
        assetId: second,
        sha256: second,
        choiceIndex: 0,
        sourceWidthMm: null,
        altText: null,
      },
      {
        assetId: first,
        sha256: first,
        choiceIndex: 2,
        sourceWidthMm: 24,
        altText: "세 번째 보기 그림",
      },
    ];
    state.frozen.rawSource = {
      figureUrls: ["/private/a.png", "/private/b.png", "/private/a.png"],
      figureDims: [300, 200, 400, 100, 300, 200],
      figureSourceMm: [12, 0, 24],
      choiceFigureIndex: [],
      figureSvgAssetId: null,
    };
    // Database result order and de-duplication must not reorder or collapse occurrences in the snapshot.
    state.assets = [
      { assetId: second, widthPx: 400, heightPx: null },
      { assetId: first, widthPx: 300, heightPx: 200 },
    ];
    refreshSnapshotHashes(state.frozen);
    const before = JSON.stringify(state.frozen);
    freezeTree(state.frozen);
    const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
    if (dto.kind !== "problem")
      throw new Error("Expected the authorized problem QR");
    expect(dto.figures).toEqual([
      {
        assetId: first,
        url: `/api/learn/textbook/q/${SLUG}/assets/${first}`,
        widthPx: 300,
        heightPx: 200,
        choiceIndex: null,
        sourceWidthMm: 12,
        altText: "본문 그림",
      },
      {
        assetId: second,
        url: `/api/learn/textbook/q/${SLUG}/assets/${second}`,
        widthPx: 400,
        heightPx: null,
        choiceIndex: 0,
        sourceWidthMm: null,
        altText: null,
      },
      {
        assetId: first,
        url: `/api/learn/textbook/q/${SLUG}/assets/${first}`,
        widthPx: 300,
        heightPx: 200,
        choiceIndex: 2,
        sourceWidthMm: 24,
        altText: "세 번째 보기 그림",
      },
    ]);
    expect(dto.figures.map((figure) => figure.choiceIndex)).toEqual([
      null,
      0,
      2,
    ]);
    expect(JSON.stringify(dto)).not.toContain("/private/");
    expect(JSON.stringify(state.frozen)).toBe(before);
    expect(contentHash(state.frozen.payload)).toBe(state.frozen.contentHash);
    expect(snapshotHash(state.frozen)).toBe(state.frozen.snapshotHash);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([undefined, "never"] as const)(
    "해설 정책 %s은 정답과 해설을 JSON에서 제거한다",
    async (policy) => {
      const { sql, execute } = fixture(policy);
      const dto = textbookStudentQrSchema.parse(
        await readStudentQr(sql, STUDENT_ID, SLUG, NOW),
      );
      expect(dto).toMatchObject({
        kind: "problem",
        content: "학생에게 보여 줄 고정 문제",
        textSolutionAvailable: false,
        answer: null,
        solution: null,
      });
      const json = JSON.stringify(dto);
      expect(json).not.toContain("HIDDEN_ANSWER_CANARY");
      expect(json).not.toContain("HIDDEN_SOLUTION_CANARY");
      expect(json).not.toContain("rawSource");
      expect(execute).not.toHaveBeenCalled();
      expect(f.srs).not.toHaveBeenCalled();
    },
  );

  it("명시적으로 assigned인 판본에서만 고정 정답·해설을 공개한다", async () => {
    const { sql, state } = fixture("assigned");
    const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
    expect(dto).toMatchObject({
      textSolutionAvailable: true,
      answer: state.frozen.payload.answer,
      solution: state.frozen.payload.solution,
    });
    expect(f.access).toHaveBeenCalledWith(sql, STUDENT_ID, SLUG);
  });

  it.each(["content", "sourceMetadata"] as const)(
    "고정 %s가 해시 이후 바뀌면 내용을 반환하지 않는다",
    async (field) => {
      const { sql, state, query, execute } = fixture("assigned");
      if (field === "content") state.frozen.payload.answer = "CHANGED_ANSWER";
      else state.frozen.sourceMetadata!.originalScore = 99;
      await expect(readStudentQr(sql, STUDENT_ID, SLUG, NOW)).rejects.toThrow(
        /해시/,
      );
      expect(query).toHaveBeenCalledTimes(1);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it("현재 범위 밖 개념과 없는 개념을 문제의 이동 목록에 넣지 않는다", async () => {
    const { sql, state } = fixture();
    state.conceptKeys = ["outside", "allowed", "missing"];
    const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
    expect(dto).toMatchObject({
      concepts: [{ conceptKey: "allowed", title: "허용 개념" }],
    });
    expect(JSON.stringify(dto)).not.toContain("OUTSIDE_TITLE_CANARY");
    expect(f.access).toHaveBeenCalledWith(
      sql,
      STUDENT_ID,
      "linked-outside-token-12345",
    );
    expect(f.access).toHaveBeenCalledWith(sql, STUDENT_ID, conceptTarget.slug);
  });

  it("개념 접근 검사 자체의 장애를 배정 거절인 것처럼 삼키지 않는다", async () => {
    const { sql, state } = fixture();
    state.conceptKeys = ["allowed"];
    f.access
      .mockResolvedValueOnce({ ok: true, target })
      .mockRejectedValueOnce(new Error("access-store-unavailable"));
    await expect(readStudentQr(sql, STUDENT_ID, SLUG, NOW)).rejects.toThrow(
      "access-store-unavailable",
    );
  });
});

describe("영상의 검수된 내용과 학생 공개", () => {
  it.each([
    {
      label: "다른 본문 해시",
      status: "published",
      currentHash: false,
      reviewed: true,
      expected: "preparing",
    },
    {
      label: "검수자 없음",
      status: "published",
      currentHash: true,
      reviewed: false,
      expected: "preparing",
    },
    {
      label: "철회",
      status: "withdrawn",
      currentHash: true,
      reviewed: true,
      expected: "withdrawn",
    },
    {
      label: "현재 검수본",
      status: "published",
      currentHash: true,
      reviewed: true,
      expected: "ready",
    },
  ])(
    "$label 영상의 ID 공개를 구분한다",
    async ({ status, currentHash, reviewed, expected }) => {
      const { sql, state } = fixture();
      state.videos = [
        {
          status,
          provider: "youtube",
          providerVideoId: "abcdefghijk",
          startSeconds: 3,
          endSeconds: 12,
          reviewedAgainstHash: currentHash
            ? state.frozen.contentHash
            : "f".repeat(64),
          reviewedBy: reviewed ? OWNER_ID : null,
          reviewedAt: NOW.toISOString(),
        },
      ];
      const dto = await readStudentQr(sql, STUDENT_ID, SLUG, NOW);
      expect(dto.video.state).toBe(expected);
      expect(dto.video.providerVideoId).toBe(
        expected === "ready" ? "abcdefghijk" : null,
      );
      if (expected !== "ready")
        expect(JSON.stringify(dto)).not.toContain("abcdefghijk");
    },
  );
});

describe("개념 원문은 해시로 검증하고 답 없는 백지만 내보낸다", () => {
  it("개념 QR은 배정과 고정 해시를 확인한 뒤 실제 강의 투영으로 영상과 답 없는 백지를 함께 읽는다", async () => {
    const { sql, state, query, execute } = fixture();
    state.conceptLectures = [
      {
        id: ITEM_ID,
        unitId: OWNER_ID,
        title: "PRIVATE_LECTURE_TITLE_CANARY",
        status: "published",
        videoUrl: "https://www.youtube.com/watch?v=abcdefghijk",
        seconds: 120,
        sortOrder: 0,
      },
    ];
    const rawBefore = JSON.stringify(state.frozenConcept);
    freezeTree(state.frozenConcept);
    const dto = await readStudentQr(sql, STUDENT_ID, conceptTarget.slug, NOW);
    expect(dto).toMatchObject({
      kind: "concept",
      concept: {
        editionId: EDITION_ID,
        conceptKey: "allowed",
        frozenHash: state.frozenConcept.frozen!.contentHash,
      },
      video: {
        state: "ready",
        providerVideoId: "abcdefghijk",
        startSeconds: 0,
        endSeconds: null,
      },
    });
    expect(JSON.stringify(dto)).not.toMatch(
      /TEACHER_MANUSCRIPT_CANARY|EXAMPLE_ANSWER_CANARY|PRIVATE_LECTURE_TITLE_CANARY|숨긴핵심어|videoUrl|watch|percent/,
    );
    expect(
      query.mock.calls.filter(([statement]) =>
        statement.includes('JOIN "concept_lecture"'),
      ),
    ).toHaveLength(1);
    expect(
      query.mock.calls.filter(([statement]) =>
        statement.includes('FROM "textbook_concept" c'),
      ),
    ).toHaveLength(1);
    expect(f.access).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(state.frozenConcept)).toBe(rawBefore);
    expect(execute).not.toHaveBeenCalled();
  });

  it("개념 해시가 달라졌으면 영상 조회나 SRS 조회에 도달하지 않는다", async () => {
    const { sql, state, query, execute } = fixture();
    state.frozenConcept.body.definition = "변경한 개념 원고";
    await expect(
      readStudentQr(sql, STUDENT_ID, conceptTarget.slug, NOW),
    ).rejects.toThrow(/해시/);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]![0]).toContain('FROM "textbook_concept" c');
    expect(f.srs).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("현재 개념 배정이 거절되면 원고와 영상 모두 조회하지 않는다", async () => {
    const { sql, query, execute } = fixture();
    f.access.mockResolvedValue({ ok: false, reason: "not-assigned" });
    await expect(
      readStudentQr(sql, STUDENT_ID, conceptTarget.slug, NOW),
    ).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalled();
    expect(f.srs).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it("원고·예시 정답·숨긴 핵심어는 DTO에 넣지 않는다", async () => {
    const { sql, execute } = fixture();
    const dto = await studentConceptDto(sql, STUDENT_ID, conceptTarget, NOW);
    expect(dto.blanks[0]?.prompts[0]?.pieces).toContainEqual({
      kind: "blank",
      index: 0,
    });
    for (const secret of [
      "TEACHER_MANUSCRIPT_CANARY",
      "EXAMPLE_ANSWER_CANARY",
      "숨긴핵심어",
    ])
      expect(JSON.stringify(dto)).not.toContain(secret);
    expect(execute).not.toHaveBeenCalled();
  });

  it("고정 개념 본문 변경을 현재 은행으로 덮지 않고 거절한다", async () => {
    const { sql, state } = fixture();
    state.frozenConcept.body.definition = "변경한 개념 원고";
    await expect(readFrozenConcept(sql, conceptTarget)).rejects.toThrow(/해시/);
    expect(f.srs).not.toHaveBeenCalled();
  });

  it("SRS 저장소가 준비되지 않아도 검증된 개념백지는 열 수 있다", async () => {
    const { sql, execute } = fixture();
    f.srs.mockRejectedValue(new SrsUnavailable("학습 저장소 준비 중"));
    const dto = await studentConceptDto(sql, STUDENT_ID, conceptTarget, NOW);
    expect(dto.blanks).toHaveLength(1);
    expect(dto.reviewAccess).toEqual({
      available: false,
      reasonCode: "learning-records-unavailable",
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
