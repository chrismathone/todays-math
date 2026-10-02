// @vitest-environment node
/**
 * 오늘의 영어 — 시험 API `/api/english/exams` · `/api/english/exams/[id]` (D-148 · 25 §3 · 브리프 english-base §1.6).
 *
 * 핸들러를 함수로 직접 부르고 응답을 계약으로 `.parse()` 한다. 세션은 모킹, DB 는 `composeEnglishDb(prismaTestDouble)`
 * (계정은 원래 대역 · 영어 표 셋은 `englishTestDouble`).
 *
 * 소유 범위(D-130)는 짝으로 본다 — 같은 요청을 «강사(자기 것만)» · «지점 관리자(지점 전체)» · «다른 지점 관리자» 로.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Viewer = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  menus?: import("@/contracts/accountAccess.contract").WorkspaceMenu[];
  isSuperAdmin?: boolean;
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
  GET as listExams,
  POST as createExam,
} from "@/app/api/english/exams/route";
import {
  DELETE as deleteExam,
  PATCH as patchExam,
} from "@/app/api/english/exams/[id]/route";

import { errorResponseSchema } from "@/contracts/common.contract";
import {
  englishExamListResponseSchema,
  englishExamResponseSchema,
} from "@/contracts/english.contract";
import { USER_OTHER_ID, USER_TEACHER_ID } from "@/mocks/data";
import {
  englishRows,
  seedEnglishExam,
  seedEnglishMaterial,
  seedEnglishQuestionSet,
} from "@/mocks/englishTestDouble";
import { seedUsers } from "@/mocks/prismaTestDouble";

const ORIGIN = "http://localhost";
const NOT_FOUND_ID = "00000000-0000-4000-8000-00000000dead";
const BRANCH_A = "30000000-0000-4000-8000-00000000000a";
const BRANCH_B = "30000000-0000-4000-8000-00000000000b";
const BRANCH_TEACHER_ID = "10000000-0000-4000-8000-0000000000a1";
const BRANCH_ADMIN_ID = "10000000-0000-4000-8000-0000000000a2";
const OTHER_BRANCH_ADMIN_ID = "10000000-0000-4000-8000-0000000000b2";

const TEACHER: Viewer = {
  id: USER_TEACHER_ID,
  email: "teacher@example.com",
  name: "김원장",
  isAdmin: false,
  menus: ["english"],
};
const BRANCH_TEACHER: Viewer = {
  id: BRANCH_TEACHER_ID,
  email: "branch-teacher@example.com",
  name: "지점 강사",
  isAdmin: false,
  menus: ["english"],
  branchId: BRANCH_A,
  branchRole: "teacher",
};
const BRANCH_ADMIN: Viewer = {
  id: BRANCH_ADMIN_ID,
  email: "branch-admin@example.com",
  name: "지점 관리자",
  isAdmin: true,
  branchId: BRANCH_A,
  branchRole: "owner",
};
const OTHER_BRANCH_ADMIN: Viewer = {
  id: OTHER_BRANCH_ADMIN_ID,
  email: "other-branch-admin@example.com",
  name: "다른 지점 관리자",
  isAdmin: true,
  branchId: BRANCH_B,
  branchRole: "owner",
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
const examUrl = (id?: string) =>
  `${ORIGIN}/api/english/exams${id ? `/${id}` : ""}`;

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
      email: BRANCH_TEACHER.email,
      name: BRANCH_TEACHER.name,
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
    {
      id: OTHER_BRANCH_ADMIN_ID,
      email: OTHER_BRANCH_ADMIN.email,
      name: OTHER_BRANCH_ADMIN.name,
      isAdmin: true,
      branchId: BRANCH_B,
      branchRole: "owner",
      deletedAt: null,
    },
  ]);
});

const NEW_EXAM = {
  school: "한빛중학교",
  grade: "중2",
  title: "2학기 중간고사",
};

describe("POST /api/english/exams", () => {
  it("세션이 없으면 401", async () => {
    sessionState.user = null;
    const res = await createExam(jsonRequest(examUrl(), "POST", NEW_EXAM));
    expect(res.status).toBe(401);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "UNAUTHORIZED",
    );
  });

  it("다른 출처의 쓰기는 403 (같은 출처 검사)", async () => {
    const res = await createExam(
      jsonRequest(examUrl(), "POST", NEW_EXAM, { origin: "https://evil.test" }),
    );
    expect(res.status).toBe(403);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "FORBIDDEN",
    );
  });

  it("새 시험은 201 · 요약 수 0 · 날짜 없음 · 출제 설정 빈 배열 — 저장 행의 소유자는 세션 사용자", async () => {
    const res = await createExam(jsonRequest(examUrl(), "POST", NEW_EXAM));
    expect(res.status).toBe(201);
    const body = englishExamResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      ...NEW_EXAM,
      examDate: null,
      types: [],
      materialCount: 0,
      setCount: 0,
      reviewedCount: 0,
    });
    const rows = englishRows.exams();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: body.data.id,
      userId: USER_TEACHER_ID,
    });
  });

  it("시험 날짜는 달력 날짜 그대로 돌아온다", async () => {
    const res = await createExam(
      jsonRequest(examUrl(), "POST", { ...NEW_EXAM, examDate: "2026-10-15" }),
    );
    expect(res.status).toBe(201);
    expect(
      englishExamResponseSchema.parse(await res.json()).data.examDate,
    ).toBe("2026-10-15");
  });

  it.each([
    ["학년이 목록 밖", { ...NEW_EXAM, grade: "초6" }],
    ["이름이 빈 글", { ...NEW_EXAM, title: "   " }],
    ["모르는 칸", { ...NEW_EXAM, types: ["주제"] }],
    ["날짜 형식", { ...NEW_EXAM, examDate: "2026/10/15" }],
    ["본문이 JSON 이 아님", undefined],
  ])("%s → 400 VALIDATION_ERROR", async (_label, body) => {
    const res = await createExam(
      body === undefined
        ? new NextRequest(examUrl(), {
            method: "POST",
            headers: { origin: ORIGIN, "content-type": "application/json" },
            body: "{not json",
          })
        : jsonRequest(examUrl(), "POST", body),
    );
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });
});

describe("GET /api/english/exams — 범위 · 요약 · 차례", () => {
  it("세션이 없으면 401", async () => {
    sessionState.user = null;
    const res = await listExams(jsonRequest(examUrl(), "GET"));
    expect(res.status).toBe(401);
  });

  it("강사는 자기 시험만 · 요약 수는 자료·세트·검토 완료를 센다 · 새것이 먼저", async () => {
    const older = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "1학기 기말",
      createdAt: new Date("2026-03-01T00:00:00Z"),
    });
    const newer = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "2학기 중간",
      createdAt: new Date("2026-09-01T00:00:00Z"),
    });
    seedEnglishExam({
      userId: USER_OTHER_ID,
      school: "남의학교",
      grade: "고1",
      title: "남의 시험",
    });
    seedEnglishMaterial({ examId: older.id, name: "지문", content: "text" });
    seedEnglishMaterial({
      examId: older.id,
      name: "파일.pdf",
      bytes: new Uint8Array([1]),
    });
    seedEnglishQuestionSet({
      examId: older.id,
      title: "세트 1",
      passage: "p",
      status: "검토 완료",
    });
    seedEnglishQuestionSet({
      examId: older.id,
      title: "세트 2",
      passage: "p",
      status: "초안",
    });
    seedEnglishQuestionSet({
      examId: older.id,
      title: "세트 3",
      passage: "p",
      status: "검토 완료",
    });

    const res = await listExams(jsonRequest(examUrl(), "GET"));
    expect(res.status).toBe(200);
    const body = englishExamListResponseSchema.parse(await res.json());
    expect(body.data.map((exam) => exam.id)).toEqual([newer.id, older.id]);
    expect(body.data[1]).toMatchObject({
      materialCount: 2,
      setCount: 3,
      reviewedCount: 2,
    });
    expect(body.data[0]).toMatchObject({
      materialCount: 0,
      setCount: 0,
      reviewedCount: 0,
    });
  });

  it("지점 관리자는 지점 강사의 시험을 본다 · 다른 지점 관리자는 못 본다 · 지점 강사는 자기 것만", async () => {
    const mine = seedEnglishExam({
      userId: BRANCH_TEACHER_ID,
      school: "지점학교",
      grade: "중3",
      title: "지점 강사 시험",
    });
    const admins = seedEnglishExam({
      userId: BRANCH_ADMIN_ID,
      school: "지점학교",
      grade: "고1",
      title: "지점 관리자 시험",
    });
    seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "독립학원",
      grade: "중1",
      title: "독립 운영자 시험",
    });

    const listFor = async (viewer: Viewer) => {
      sessionState.user = viewer;
      const res = await listExams(jsonRequest(examUrl(), "GET"));
      expect(res.status).toBe(200);
      return englishExamListResponseSchema
        .parse(await res.json())
        .data.map((exam) => exam.id)
        .sort();
    };
    expect(await listFor(BRANCH_ADMIN)).toEqual([mine.id, admins.id].sort());
    expect(await listFor(BRANCH_TEACHER)).toEqual([mine.id]);
    expect(await listFor(OTHER_BRANCH_ADMIN)).toEqual([]);
  });
});

describe("PATCH /api/english/exams/[id]", () => {
  it("없는 시험은 404 · 남의 시험은 403 · 지점 관리자는 지점 강사의 시험을 고친다 · 다른 지점 관리자는 403", async () => {
    const others = seedEnglishExam({
      userId: USER_OTHER_ID,
      school: "남의학교",
      grade: "고1",
      title: "남의 시험",
    });
    const branch = seedEnglishExam({
      userId: BRANCH_TEACHER_ID,
      school: "지점학교",
      grade: "중3",
      title: "지점 강사 시험",
    });
    const patch = async (viewer: Viewer, id: string) => {
      sessionState.user = viewer;
      return patchExam(
        jsonRequest(examUrl(id), "PATCH", { title: "고친 이름" }),
        withId(id),
      );
    };
    expect((await patch(TEACHER, NOT_FOUND_ID)).status).toBe(404);
    expect((await patch(TEACHER, others.id)).status).toBe(403);
    expect((await patch(OTHER_BRANCH_ADMIN, branch.id)).status).toBe(403);
    const ok = await patch(BRANCH_ADMIN, branch.id);
    expect(ok.status).toBe(200);
    expect(englishExamResponseSchema.parse(await ok.json()).data.title).toBe(
      "고친 이름",
    );
  });

  it("이름 · 날짜 · 출제 설정을 고치고 요약 수를 함께 돌려준다", async () => {
    const exam = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "옛 이름",
      examDate: new Date("2026-10-01T00:00:00.000Z"),
    });
    seedEnglishQuestionSet({
      examId: exam.id,
      title: "세트",
      passage: "p",
      status: "검토 완료",
    });
    const res = await patchExam(
      jsonRequest(examUrl(exam.id), "PATCH", {
        title: "새 이름",
        examDate: "2026-11-20",
        types: ["주제", "어법"],
      }),
      withId(exam.id),
    );
    expect(res.status).toBe(200);
    const body = englishExamResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      title: "새 이름",
      examDate: "2026-11-20",
      types: ["주제", "어법"],
      setCount: 1,
      reviewedCount: 1,
    });
    expect(englishRows.exams()[0]).toMatchObject({
      title: "새 이름",
      types: ["주제", "어법"],
    });
  });

  it("날짜를 null 로 지울 수 있다", async () => {
    const exam = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "시험",
      examDate: new Date("2026-10-01T00:00:00.000Z"),
    });
    const res = await patchExam(
      jsonRequest(examUrl(exam.id), "PATCH", { examDate: null }),
      withId(exam.id),
    );
    expect(res.status).toBe(200);
    expect(
      englishExamResponseSchema.parse(await res.json()).data.examDate,
    ).toBe(null);
  });

  it.each([
    ["빈 본문", {}],
    ["같은 유형 둘", { types: ["주제", "주제"] }],
    ["원문 복원은 출제 설정에 못 넣는다", { types: ["원문 복원"] }],
    ["학교는 못 고친다(계약에 없음)", { school: "다른 학교" }],
  ])("%s → 400", async (_label, body) => {
    const exam = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "시험",
    });
    const res = await patchExam(
      jsonRequest(examUrl(exam.id), "PATCH", body),
      withId(exam.id),
    );
    expect(res.status).toBe(400);
  });

  it("다른 출처의 쓰기는 403", async () => {
    const exam = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "시험",
    });
    const res = await patchExam(
      jsonRequest(
        examUrl(exam.id),
        "PATCH",
        { title: "x" },
        { origin: "https://evil.test" },
      ),
      withId(exam.id),
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/english/exams/[id]", () => {
  it("시험을 지우면 딸린 자료·세트도 같이 사라진다(Cascade) · 남의 것은 남는다", async () => {
    const exam = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "시험",
    });
    const keep = seedEnglishExam({
      userId: USER_OTHER_ID,
      school: "남의학교",
      grade: "고1",
      title: "남의 시험",
    });
    seedEnglishMaterial({ examId: exam.id, name: "지문", content: "t" });
    seedEnglishQuestionSet({ examId: exam.id, title: "세트", passage: "p" });
    seedEnglishMaterial({ examId: keep.id, name: "남의 지문", content: "t" });
    seedEnglishQuestionSet({
      examId: keep.id,
      title: "남의 세트",
      passage: "p",
    });

    const res = await deleteExam(
      jsonRequest(examUrl(exam.id), "DELETE"),
      withId(exam.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: exam.id } });
    expect(englishRows.exams().map((r) => r.id)).toEqual([keep.id]);
    expect(englishRows.materials().map((r) => r.examId)).toEqual([keep.id]);
    expect(englishRows.sets().map((r) => r.examId)).toEqual([keep.id]);
  });

  it("없으면 404 · 남의 것은 403 · 다른 출처는 403", async () => {
    const others = seedEnglishExam({
      userId: USER_OTHER_ID,
      school: "남의학교",
      grade: "고1",
      title: "남의 시험",
    });
    const mine = seedEnglishExam({
      userId: USER_TEACHER_ID,
      school: "한빛중학교",
      grade: "중2",
      title: "시험",
    });
    expect(
      (
        await deleteExam(
          jsonRequest(examUrl(NOT_FOUND_ID), "DELETE"),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await deleteExam(
          jsonRequest(examUrl(others.id), "DELETE"),
          withId(others.id),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteExam(
          jsonRequest(examUrl(mine.id), "DELETE", undefined, {
            origin: "https://evil.test",
          }),
          withId(mine.id),
        )
      ).status,
    ).toBe(403);
    expect(englishRows.exams()).toHaveLength(2);
  });
});
