// @vitest-environment node
/**
 * 오늘의 영어 — 세트 API `/api/english/exams/[id]/sets` · `/api/english/sets/[id]` (D-148 · 25 §3 · §4.4).
 *
 * 저장은 검증기(`validateEnglishDraft`)를 지나야 하고 늘 «초안» · `revision: 1` 이다. 고치기는 `revision` CAS —
 * 남이 먼저 저장했으면 409 REVISION_MISMATCH. 원문 복원(`makeCloze`) 초안도 같은 길로 저장된다.
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

type Viewer = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  branchId?: string | null;
  branchRole?: "owner" | "manager" | "teacher" | null;
};
const sessionState = vi.hoisted(() => ({ user: null as Viewer | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeEnglishDb } = await import("@/mocks/englishTestDouble");
  return { db: composeEnglishDb(prismaTestDouble) };
});

import {
  GET as listSets,
  POST as createSet,
} from "@/app/api/english/exams/[id]/sets/route";
import {
  DELETE as deleteSet,
  GET as getSet,
  PUT as putSet,
} from "@/app/api/english/sets/[id]/route";

import { errorResponseSchema } from "@/contracts/common.contract";
import {
  englishSetListResponseSchema,
  englishSetResponseSchema,
  type EnglishQuestion,
  type EnglishSetCreate,
} from "@/contracts/english.contract";
import { makeCloze } from "@/lib/english/cloze";
import { USER_OTHER_ID, USER_TEACHER_ID } from "@/mocks/data";
import {
  englishRows,
  seedEnglishExam,
  seedEnglishQuestionSet,
} from "@/mocks/englishTestDouble";
import { seedUsers } from "@/mocks/prismaTestDouble";

const issuesSchema = z.strictObject({
  issues: z.array(
    z.strictObject({
      question: z.number().int().nullable(),
      message: z.string(),
    }),
  ),
});

const ORIGIN = "http://localhost";
const NOT_FOUND_ID = "00000000-0000-4000-8000-00000000dead";
const BRANCH_A = "30000000-0000-4000-8000-00000000000a";
const BRANCH_TEACHER_ID = "10000000-0000-4000-8000-0000000000a1";
const BRANCH_ADMIN_ID = "10000000-0000-4000-8000-0000000000a2";

const TEACHER: Viewer = {
  id: USER_TEACHER_ID,
  email: "teacher@example.com",
  name: "김원장",
  isAdmin: false,
};
const BRANCH_ADMIN: Viewer = {
  id: BRANCH_ADMIN_ID,
  email: "branch-admin@example.com",
  name: "지점 관리자",
  isAdmin: true,
  branchId: BRANCH_A,
  branchRole: "owner",
};

const PASSAGE =
  "Students worked together to build a small garden behind their school. They learned that cooperation makes difficult tasks easier. Now the garden is a quiet place where everyone can rest.";

const QUESTIONS: EnglishQuestion[] = [
  {
    type: "주제",
    prompt: "윗글의 주제로 가장 적절한 것은?",
    options: ["Cooperation", "A city", "A season", "A festival", "A journey"],
    answer: "1",
    explanation: "협력을 설명하는 글입니다.",
    evidence: "cooperation makes difficult tasks easier",
  },
  {
    type: "서술형",
    prompt: "학생들이 배운 점을 우리말로 쓰시오.",
    options: [],
    answer: "협력하면 어려운 일이 쉬워진다.",
    explanation: "협력 · 어려운 일 · 쉬워짐",
    evidence: "They learned that cooperation makes difficult tasks easier.",
  },
];

const DRAFT: EnglishSetCreate = {
  title: "협력 세트",
  source: "chatgpt",
  passage: PASSAGE,
  questions: QUESTIONS,
};

function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(url, {
    method,
    headers: {
      origin: ORIGIN,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const setsUrl = (examId: string) =>
  `${ORIGIN}/api/english/exams/${examId}/sets`;
const setUrl = (id: string) => `${ORIGIN}/api/english/sets/${id}`;

let examId: string;
let othersExamId: string;

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  // 🔴 main 의 .env 가 AUTH_URL=http://localhost:3000 을 워커에 싣는다(교훈 2026-09-20 · 검토 A) —
  //    같은 출처 검사가 요청 origin(http://localhost)과 견주게 둘 다 비운다(선례 classOwner.test.ts)
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  sessionState.user = TEACHER;
  seedUsers([
    {
      id: BRANCH_TEACHER_ID,
      email: "branch-teacher@example.com",
      name: "지점 강사",
      isAdmin: false,
      branchId: BRANCH_A,
      branchRole: "teacher",
      deletedAt: null,
    },
    {
      id: BRANCH_ADMIN_ID,
      email: BRANCH_ADMIN.email,
      name: BRANCH_ADMIN.name,
      isAdmin: true,
      branchId: BRANCH_A,
      branchRole: "owner",
      deletedAt: null,
    },
  ]);
  examId = seedEnglishExam({
    userId: USER_TEACHER_ID,
    school: "한빛중학교",
    grade: "중2",
    title: "2학기 중간",
  }).id;
  othersExamId = seedEnglishExam({
    userId: USER_OTHER_ID,
    school: "남의학교",
    grade: "고1",
    title: "남의 시험",
  }).id;
});

describe("POST /api/english/exams/[id]/sets — 저장", () => {
  it("검증기를 지난 초안은 201 · 상태는 늘 «초안» · revision 1 · 유형 딱지는 순서대로 중복 없이", async () => {
    const res = await createSet(
      jsonRequest(setsUrl(examId), "POST", DRAFT),
      withId(examId),
    );
    expect(res.status).toBe(201);
    const body = englishSetResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      examId,
      title: "협력 세트",
      source: "chatgpt",
      status: "초안",
      revision: 1,
      questionCount: 2,
      types: ["주제", "서술형"],
      passage: PASSAGE,
    });
    expect(body.data.questions).toEqual(QUESTIONS);
    const [row] = englishRows.sets();
    expect(row).toMatchObject({
      id: body.data.id,
      status: "초안",
      revision: 1,
    });
  });

  it("만든 조건(meta)을 함께 보내면 그대로 저장하고 돌려준다 · 안 보내면 null(원장님 2026-10-01 «메타데이터 기억되게»)", async () => {
    const meta = {
      path: "api" as const,
      mode: "original" as const,
      difficulty: "표준" as const,
      count: 2,
      types: ["주제" as const, "서술형" as const],
      model: "gpt-6-luna",
      promptVersion: "v3",
    };
    const res = await createSet(
      jsonRequest(setsUrl(examId), "POST", { ...DRAFT, meta }),
      withId(examId),
    );
    expect(res.status).toBe(201);
    const body = englishSetResponseSchema.parse(await res.json());
    expect(body.data.meta).toEqual(meta);
    expect(englishRows.sets()[0]!.meta).toEqual(meta);

    const bare = await createSet(
      jsonRequest(setsUrl(examId), "POST", DRAFT),
      withId(examId),
    );
    expect(
      englishSetResponseSchema.parse(await bare.json()).data.meta,
    ).toBeNull();

    // 모르는 칸이 든 meta 는 계약이 막는다(400) — 아무 글이나 쌓이지 않게
    const wrong = await createSet(
      jsonRequest(setsUrl(examId), "POST", {
        ...DRAFT,
        meta: { ...meta, note: "x" },
      }),
      withId(examId),
    );
    expect(wrong.status).toBe(400);
  });

  it("clientKey 가 같고 본문이 같으면 200 으로 그 행을 돌려준다 · 본문이 다르면 409 · 키가 없으면 201 · 다른 시험은 별개", async () => {
    const key = "11111111-1111-4111-8111-111111111111";
    const meta = {
      path: "chatgpt" as const,
      clientKey: key,
      materialName: "가".repeat(255),
    };
    const first = await createSet(
      jsonRequest(setsUrl(examId), "POST", { ...DRAFT, meta }),
      withId(examId),
    );
    expect(first.status).toBe(201);
    const created = englishSetResponseSchema.parse(await first.json());
    expect(created.data.meta).toEqual(meta);

    const edited = await putSet(
      jsonRequest(setUrl(created.data.id), "PUT", {
        title: DRAFT.title,
        status: "검토 중",
        passage: DRAFT.passage,
        questions: DRAFT.questions,
        revision: 1,
      }),
      withId(created.data.id),
    );
    expect(edited.status).toBe(200);

    const again = await createSet(
      jsonRequest(setsUrl(examId), "POST", { ...DRAFT, meta }),
      withId(examId),
    );
    expect(again.status).toBe(200);
    const kept = englishSetResponseSchema.parse(await again.json());
    expect(kept.data.id).toBe(created.data.id);
    expect(kept.data.status).toBe("검토 중");
    expect(kept.data.revision).toBe(2);
    expect(kept.data.meta).toEqual(meta);
    expect(englishRows.sets()).toHaveLength(1);

    const clash = await createSet(
      jsonRequest(setsUrl(examId), "POST", {
        ...DRAFT,
        title: "다른 제목",
        meta,
      }),
      withId(examId),
    );
    expect(clash.status).toBe(409);
    expect(errorResponseSchema.parse(await clash.json()).error).toMatchObject({
      code: "CONFLICT",
      message: "같은 저장 키인데 내용이 다릅니다. 새로 저장해 주세요.",
    });
    expect(englishRows.sets()).toHaveLength(1);
    expect(englishRows.sets()[0]?.title).toBe(DRAFT.title);

    const bare = await createSet(
      jsonRequest(setsUrl(examId), "POST", DRAFT),
      withId(examId),
    );
    expect(bare.status).toBe(201);
    expect(englishRows.sets()).toHaveLength(2);

    const secondExamId = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "기말",
    }).id;
    const otherExam = await createSet(
      jsonRequest(setsUrl(secondExamId), "POST", { ...DRAFT, meta }),
      withId(secondExamId),
    );
    expect(otherExam.status).toBe(201);
    const otherBody = englishSetResponseSchema.parse(await otherExam.json());
    expect(otherBody.data.id).not.toBe(created.data.id);
    expect(otherBody.data.examId).toBe(secondExamId);
    expect(englishRows.sets()).toHaveLength(3);
  });

  it("상태를 «검토 완료»로 보내도 계약이 거절한다(400) — 저장은 늘 초안", async () => {
    const res = await createSet(
      jsonRequest(setsUrl(examId), "POST", { ...DRAFT, status: "검토 완료" }),
      withId(examId),
    );
    expect(res.status).toBe(400);
  });

  it.each([
    ["제목 없음", { ...DRAFT, title: "" }],
    ["출처가 목록 밖", { ...DRAFT, source: "gemini" }],
    ["문항 0개", { ...DRAFT, questions: [] }],
    [
      "모르는 유형",
      { ...DRAFT, questions: [{ ...QUESTIONS[0], type: "듣기" }] },
    ],
  ])("%s → 400 VALIDATION_ERROR (계약)", async (_label, body) => {
    const res = await createSet(
      jsonRequest(setsUrl(examId), "POST", body),
      withId(examId),
    );
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it.each([
    [
      "근거가 지문에 없음",
      { ...QUESTIONS[0], evidence: "penguins in the city" },
      /근거/,
    ],
    [
      "보기가 넷",
      { ...QUESTIONS[0], options: QUESTIONS[0].options.slice(0, 4) },
      /5개/,
    ],
    ["정답 번호 범위 밖", { ...QUESTIONS[0], answer: "6" }, /1~5/],
    [
      "서술형에 보기",
      { ...QUESTIONS[1], options: ["a", "b", "c", "d", "e"] },
      /보기가 없어야/,
    ],
  ])(
    "%s → 422 ENGLISH_DRAFT_REJECTED · details.issues 에 문항 번호",
    async (_label, question, pattern) => {
      const res = await createSet(
        jsonRequest(setsUrl(examId), "POST", {
          ...DRAFT,
          questions: [QUESTIONS[1], question],
        }),
        withId(examId),
      );
      expect(res.status).toBe(422);
      const body = errorResponseSchema.parse(await res.json());
      expect(body.error.code).toBe("ENGLISH_DRAFT_REJECTED");
      const { issues } = issuesSchema.parse(body.error.details);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.every((issue) => issue.question === 1)).toBe(true);
      expect(issues.some((issue) => pattern.test(issue.message))).toBe(true);
      expect(englishRows.sets()).toHaveLength(0);
    },
  );

  it("원문 복원(makeCloze) 초안은 그대로 저장된다 — 세 길이 같은 규칙을 지난다", async () => {
    const cloze = makeCloze(PASSAGE, 3, "원문 복원 연습");
    expect(cloze.ok).toBe(true);
    if (!cloze.ok) return;
    const res = await createSet(
      jsonRequest(setsUrl(examId), "POST", cloze.draft),
      withId(examId),
    );
    expect(res.status).toBe(201);
    const body = englishSetResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      source: "cloze",
      types: ["원문 복원"],
      questionCount: cloze.draft.questions.length,
    });
  });

  it("세션 없음 401 · 없는 시험 404 · 남의 시험 403 · 다른 출처 403 · 지점 관리자는 지점 강사의 시험에 저장한다", async () => {
    sessionState.user = null;
    expect(
      (
        await createSet(
          jsonRequest(setsUrl(examId), "POST", DRAFT),
          withId(examId),
        )
      ).status,
    ).toBe(401);
    sessionState.user = TEACHER;
    expect(
      (
        await createSet(
          jsonRequest(setsUrl(NOT_FOUND_ID), "POST", DRAFT),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await createSet(
          jsonRequest(setsUrl(othersExamId), "POST", DRAFT),
          withId(othersExamId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await createSet(
          jsonRequest(setsUrl(examId), "POST", DRAFT, {
            origin: "https://evil.test",
          }),
          withId(examId),
        )
      ).status,
    ).toBe(403);
    const branchExam = seedEnglishExam({
      userId: BRANCH_TEACHER_ID,
      school: "지점학교",
      grade: "중3",
      title: "지점 시험",
    });
    sessionState.user = BRANCH_ADMIN;
    expect(
      (
        await createSet(
          jsonRequest(setsUrl(branchExam.id), "POST", DRAFT),
          withId(branchExam.id),
        )
      ).status,
    ).toBe(201);
    expect(englishRows.sets()).toHaveLength(1);
  });
});

describe("GET /api/english/exams/[id]/sets — 요약 목록", () => {
  it("요약만(지문·문항 없음) · 최근 고친 것이 먼저 · 다른 시험 것은 안 섞인다", async () => {
    const old = seedEnglishQuestionSet({
      examId,
      title: "오래된 세트",
      passage: PASSAGE,
      questions: QUESTIONS,
      updatedAt: new Date("2026-09-01T00:00:00Z"),
    });
    const fresh = seedEnglishQuestionSet({
      examId,
      title: "최근 세트",
      passage: PASSAGE,
      questions: [QUESTIONS[1]],
      status: "검토 완료",
      updatedAt: new Date("2026-09-20T00:00:00Z"),
    });
    seedEnglishQuestionSet({
      examId: othersExamId,
      title: "남의 세트",
      passage: "p",
    });

    const res = await listSets(
      jsonRequest(setsUrl(examId), "GET"),
      withId(examId),
    );
    expect(res.status).toBe(200);
    const body = englishSetListResponseSchema.parse(await res.json());
    expect(body.data.map((s) => s.id)).toEqual([fresh.id, old.id]);
    expect(body.data[0]).toMatchObject({
      status: "검토 완료",
      questionCount: 1,
      types: ["서술형"],
    });
    expect(body.data[1]).toMatchObject({
      questionCount: 2,
      types: ["주제", "서술형"],
    });
    expect(JSON.stringify(body)).not.toContain(PASSAGE);
  });

  it("없는 시험 404 · 남의 시험 403", async () => {
    expect(
      (
        await listSets(
          jsonRequest(setsUrl(NOT_FOUND_ID), "GET"),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await listSets(
          jsonRequest(setsUrl(othersExamId), "GET"),
          withId(othersExamId),
        )
      ).status,
    ).toBe(403);
  });
});

describe("GET /api/english/sets/[id]", () => {
  it("세트 전체를 돌려준다 · 없으면 404 · 남의 것 403 · 세션 없음 401", async () => {
    const mine = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
      questions: QUESTIONS,
      source: "deepseek",
    });
    const others = seedEnglishQuestionSet({
      examId: othersExamId,
      title: "남의 세트",
      passage: "p",
      questions: [QUESTIONS[1]],
    });
    const res = await getSet(
      jsonRequest(setUrl(mine.id), "GET"),
      withId(mine.id),
    );
    expect(res.status).toBe(200);
    const body = englishSetResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      id: mine.id,
      source: "deepseek",
      passage: PASSAGE,
      questionCount: 2,
    });
    expect(body.data.questions).toEqual(QUESTIONS);
    expect(
      (
        await getSet(
          jsonRequest(setUrl(NOT_FOUND_ID), "GET"),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (await getSet(jsonRequest(setUrl(others.id), "GET"), withId(others.id)))
        .status,
    ).toBe(403);
    sessionState.user = null;
    expect(
      (await getSet(jsonRequest(setUrl(mine.id), "GET"), withId(mine.id)))
        .status,
    ).toBe(401);
  });
});

describe("PUT /api/english/sets/[id] — revision CAS", () => {
  const update = (
    id: string,
    body: unknown,
    headers?: Record<string, string>,
  ) => putSet(jsonRequest(setUrl(id), "PUT", body, headers), withId(id));

  it("맞는 revision 이면 저장하고 revision 이 하나 오른다 · 상태·제목·지문·문항이 바뀐다", async () => {
    const set = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    const res = await update(set.id, {
      title: "고친 세트",
      status: "검토 중",
      passage: PASSAGE,
      questions: [QUESTIONS[1]],
      revision: 1,
    });
    expect(res.status).toBe(200);
    const body = englishSetResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      title: "고친 세트",
      status: "검토 중",
      revision: 2,
      questionCount: 1,
      types: ["서술형"],
    });
    expect(englishRows.sets()[0]).toMatchObject({
      revision: 2,
      status: "검토 중",
    });
  });

  it("🔴 낡은 revision 은 409 REVISION_MISMATCH — 아무것도 안 바뀐다 · 다시 읽은 값이면 저장된다", async () => {
    const set = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    const first = await update(set.id, {
      title: "첫 저장",
      status: "초안",
      passage: PASSAGE,
      questions: QUESTIONS,
      revision: 1,
    });
    expect(first.status).toBe(200);

    const stale = await update(set.id, {
      title: "낡은 저장",
      status: "검토 완료",
      passage: PASSAGE,
      questions: QUESTIONS,
      revision: 1,
    });
    expect(stale.status).toBe(409);
    const body = errorResponseSchema.parse(await stale.json());
    expect(body.error.code).toBe("REVISION_MISMATCH");
    expect(body.error.message).toBe(
      "다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.",
    );
    expect(englishRows.sets()[0]).toMatchObject({
      title: "첫 저장",
      status: "초안",
      revision: 2,
    });

    const fresh = await update(set.id, {
      title: "다시 읽고 저장",
      status: "검토 완료",
      passage: PASSAGE,
      questions: QUESTIONS,
      revision: 2,
    });
    expect(fresh.status).toBe(200);
    expect(
      englishSetResponseSchema.parse(await fresh.json()).data.revision,
    ).toBe(3);
  });

  it("검증기에 걸리면 422 — 저장되지 않는다", async () => {
    const set = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    const res = await update(set.id, {
      title: "세트",
      status: "초안",
      passage: PASSAGE,
      questions: [{ ...QUESTIONS[0], evidence: "not in the passage" }],
      revision: 1,
    });
    expect(res.status).toBe(422);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "ENGLISH_DRAFT_REJECTED",
    );
    expect(englishRows.sets()[0]).toMatchObject({ revision: 1 });
  });

  it.each([
    [
      "revision 없음",
      { title: "t", status: "초안", passage: PASSAGE, questions: QUESTIONS },
    ],
    [
      "상태가 목록 밖",
      {
        title: "t",
        status: "승인",
        passage: PASSAGE,
        questions: QUESTIONS,
        revision: 1,
      },
    ],
    [
      "출처는 못 바꾼다(계약에 없음)",
      {
        title: "t",
        status: "초안",
        passage: PASSAGE,
        questions: QUESTIONS,
        revision: 1,
        source: "manual",
      },
    ],
  ])("%s → 400", async (_label, body) => {
    const set = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    expect((await update(set.id, body)).status).toBe(400);
  });

  it("없는 세트 404 · 남의 세트 403 · 다른 출처 403 · 지점 관리자는 지점 강사의 세트를 고친다", async () => {
    const body = {
      title: "t",
      status: "초안",
      passage: PASSAGE,
      questions: QUESTIONS,
      revision: 1,
    };
    const mine = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    const others = seedEnglishQuestionSet({
      examId: othersExamId,
      title: "남의 세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    expect((await update(NOT_FOUND_ID, body)).status).toBe(404);
    expect((await update(others.id, body)).status).toBe(403);
    expect(
      (await update(mine.id, body, { origin: "https://evil.test" })).status,
    ).toBe(403);
    const branchExam = seedEnglishExam({
      userId: BRANCH_TEACHER_ID,
      school: "지점학교",
      grade: "중3",
      title: "지점 시험",
    });
    const branchSet = seedEnglishQuestionSet({
      examId: branchExam.id,
      title: "지점 세트",
      passage: PASSAGE,
      questions: QUESTIONS,
    });
    sessionState.user = BRANCH_ADMIN;
    expect((await update(branchSet.id, body)).status).toBe(200);
  });
});

describe("DELETE /api/english/sets/[id]", () => {
  it("지우면 행이 사라진다 · 없으면 404 · 남의 것 403", async () => {
    const mine = seedEnglishQuestionSet({
      examId,
      title: "세트",
      passage: PASSAGE,
    });
    const others = seedEnglishQuestionSet({
      examId: othersExamId,
      title: "남의 세트",
      passage: PASSAGE,
    });
    expect(
      (
        await deleteSet(
          jsonRequest(setUrl(others.id), "DELETE"),
          withId(others.id),
        )
      ).status,
    ).toBe(403);
    const res = await deleteSet(
      jsonRequest(setUrl(mine.id), "DELETE"),
      withId(mine.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: mine.id } });
    expect(englishRows.sets().map((s) => s.id)).toEqual([others.id]);
    expect(
      (await deleteSet(jsonRequest(setUrl(mine.id), "DELETE"), withId(mine.id)))
        .status,
    ).toBe(404);
  });
});
