/**
 * 🔴 RED → 🟢 — **채점 입력 API** (D-134 트랙 1 · 브리프 `tracks/briefs/grading-input.md` §1.2·§3).
 *
 * 구현: `src/app/api/tests/[id]/grade/route.ts` · `src/lib/testResults/saveGradingMarks.ts`
 *       · `src/lib/testResults/loadGradeSheet.ts` · `src/lib/testResults/gradeMarks.ts`
 *       · `src/lib/testResults/scoreRollup.ts`
 * 계약: `src/contracts/testresult.contract.ts`
 *
 * ## 이 파일이 잠그는 다섯
 *
 *   ① 틀린 번호만 저장 → `ProblemAnswer` 가 **전 문항** 생기고 **표시한 것만** `isCorrect=false`.
 *      행이 없는 것을 «맞음»으로 읽게 두면 `marks` 와 `answers` 두 방식이 서로를 오염시킨다.
 *   ② 시험지 대상 학생 중 **빠진 이름**이 있으면 거절한다 — 그리고 **몇 명이 아니라 이름**을 돌려준다(19 §5′).
 *   ③ 결시 학생은 `AnalysisReport` 가 **안 생긴다**(23 §4 ③ — 결시로 그린 «단원별 정답률»은 거짓이다).
 *   ④ 결시 학생의 점수가 **어떤 집계에도 0으로 안 들어간다** — `rollupScores` 로 잰다.
 *   ⑤ 남의 반 시험지는 못 채점한다 — D-130 **짝 시험**은 `adminSeesAll.test.ts` 가 든다
 *      (같은 픽스처·같은 뷰어·관리자 표시 하나만 다르게). 여기서는 소유자 아님 403 만 확인한다.
 *
 * ## 🔴 «0으로 안 들어간다»는 **반증 짝**으로 잰다
 *
 * 결시를 0으로 세도 우연히 같은 값이 나오면 시험이 거짓말을 한다. 그래서 ④ 는
 * 「결시를 빼고 낸 평균」과 「결시를 0으로 세었을 때의 평균」을 **둘 다 계산해** 서로
 * 다름을 단언한 뒤, 구현이 앞엣것과 같은지 본다.
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));

const sessionState = vi.hoisted(() => ({
  user: {
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
  } as { id: string; email: string; name: string } | null,
}));

import {
  GET as getGradeSheet,
  POST as saveGrades,
} from "@/app/api/tests/[id]/grade/route";

import { errorResponseSchema } from "@/contracts/common.contract";
import {
  gradeSheetResponseSchema,
  gradeSubmitResponseSchema,
} from "@/contracts/testresult.contract";
import { db } from "@/lib/db";
import { rollupScores } from "@/lib/testResults/scoreRollup";
import {
  MOCK_STUDENT_1,
  MOCK_STUDENT_2,
  MOCK_STUDENT_3,
  STUDENT_IDS,
  TEST_DRAFT_ID,
  TEST_NOT_FOUND_ID,
  TEST_RESULT_FIXTURE_TEST_ID,
  TEST_RESULT_PROBLEM_ESSAY_ID,
  TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
  TEST_RESULT_PROBLEM_OBJECTIVE_WRONG_ID,
} from "@/mocks/data";

/** 채점 픽스처 시험지 — 반 A · 인쇄됨 · 문항 3개(배점 10 · 10 · 80). */
const TEST_ID = TEST_RESULT_FIXTURE_TEST_ID;
const P1 = TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID; // 10점
const P2 = TEST_RESULT_PROBLEM_OBJECTIVE_WRONG_ID; // 10점
const P3 = TEST_RESULT_PROBLEM_ESSAY_ID; // 80점
/** 반 A 의 학생 셋 — 시험지 대상이 곧 이 셋이다. */
const ROSTER = [MOCK_STUDENT_1, MOCK_STUDENT_2, MOCK_STUDENT_3];
const STUDENT_OTHER_CLASS = STUDENT_IDS[3]!; // 반 B

function req(path: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

const gradeUrl = (id: string) => `/api/tests/${id}/grade`;

/** 전원 채점 — 오답을 학생마다 다르게 준다. */
function everyone(
  over: Partial<
    Record<number, { absent: boolean; wrongProblemIds: string[] }>
  > = {},
) {
  return {
    entries: ROSTER.map((s, i) => ({
      studentId: s.id,
      absent: over[i]?.absent ?? false,
      wrongProblemIds: over[i]?.wrongProblemIds ?? [],
    })),
  };
}

async function save(body: unknown, testId = TEST_ID) {
  return saveGrades(req(gradeUrl(testId), "POST", body), withId(testId));
}

// ─────────────────────────────────────────────
// 채점표 조회 — 세 상태의 원천
// ─────────────────────────────────────────────

describe("GET /api/tests/{id}/grade — 채점표", () => {
  it("시험지 대상 학생과 문항을 계약대로 돌려준다", async () => {
    const res = await getGradeSheet(
      req(gradeUrl(TEST_ID), "GET"),
      withId(TEST_ID),
    );
    expect(res.status).toBe(200);
    const { data } = gradeSheetResponseSchema.parse(await res.json());

    expect(data.students.map((s) => s.name)).toEqual(ROSTER.map((s) => s.name));
    expect(data.problems.map((p) => p.no)).toEqual([1, 2, 3]);
    expect(data.problems.map((p) => p.problemId)).toEqual([P1, P2, P3]);
  });

  it("🔴 채점한 적 없는 학생은 latest 가 null 이다 — «아직 안 봄»은 행이 없는 것", async () => {
    const res = await getGradeSheet(
      req(gradeUrl(TEST_ID), "GET"),
      withId(TEST_ID),
    );
    const { data } = gradeSheetResponseSchema.parse(await res.json());
    expect(data.students.every((s) => s.latest === null)).toBe(true);
  });

  it("저장한 뒤에는 그 학생의 오답 번호가 그대로 돌아온다", async () => {
    await save(everyone({ 0: { absent: false, wrongProblemIds: [P2] } }));
    const res = await getGradeSheet(
      req(gradeUrl(TEST_ID), "GET"),
      withId(TEST_ID),
    );
    const { data } = gradeSheetResponseSchema.parse(await res.json());
    const first = data.students[0]!;
    expect(first.latest?.wrongProblemIds).toEqual([P2]);
    expect(first.latest?.correctCount).toBe(2);
    expect(first.latest?.gradingMode).toBe("marks");
  });

  it("없는 시험지는 404", async () => {
    const res = await getGradeSheet(
      req(gradeUrl(TEST_NOT_FOUND_ID), "GET"),
      withId(TEST_NOT_FOUND_ID),
    );
    expect(res.status).toBe(404);
  });

  it("🔴 초안 시험지는 채점표를 안 연다 — 아직 나가지 않은 시험지다", async () => {
    const res = await getGradeSheet(
      req(gradeUrl(TEST_DRAFT_ID), "GET"),
      withId(TEST_DRAFT_ID),
    );
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────
// ① 틀린 번호만 저장
// ─────────────────────────────────────────────

describe("① POST — 틀린 번호만 저장한다", () => {
  it("🔴 ProblemAnswer 가 **전 문항** 생기고 표시한 것만 isCorrect=false 다", async () => {
    const res = await save(
      everyone({ 0: { absent: false, wrongProblemIds: [P2] } }),
    );
    expect(res.status).toBe(201);

    const result = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_1.id },
      orderBy: { takenAt: "desc" },
    });
    const answers = await db.problemAnswer.findMany({
      where: { testResultId: result!.id },
    });
    expect(answers).toHaveLength(3);
    expect(
      Object.fromEntries(answers.map((a) => [a.problemId, a.isCorrect])),
    ).toEqual({ [P1]: true, [P2]: false, [P3]: true });
  });

  it("🔴 marks 채점은 선택번호·서술형 점수를 지어내지 않는다 — 둘 다 NULL", async () => {
    await save(everyone({ 0: { absent: false, wrongProblemIds: [P2] } }));
    const result = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_1.id },
      orderBy: { takenAt: "desc" },
    });
    const answers = await db.problemAnswer.findMany({
      where: { testResultId: result!.id },
    });
    expect(answers.every((a) => a.selectedChoice === null)).toBe(true);
    expect(answers.every((a) => a.essayScore === null)).toBe(true);
  });

  it("gradingMode 가 marks 로 적힌다 — 기존 /submit 의 answers 와 갈린다", async () => {
    await save(everyone());
    const result = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_1.id },
      orderBy: { takenAt: "desc" },
    });
    expect(result!.gradingMode).toBe("marks");
    expect(result!.absent).toBe(false);
  });

  it("점수는 맞은 문항의 배점 합이다 — 하나도 안 틀리면 만점", async () => {
    await save(
      everyone({
        0: { absent: false, wrongProblemIds: [] },
        1: { absent: false, wrongProblemIds: [P3] },
      }),
    );
    const perfect = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_1.id },
      orderBy: { takenAt: "desc" },
    });
    const lostEssay = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_2.id },
      orderBy: { takenAt: "desc" },
    });
    expect(perfect!.score).toBe(100);
    expect(lostEssay!.score).toBe(20); // 80점짜리 서술형만 틀렸다
  });

  it("채점한 학생마다 분석 리포트가 하나씩 생긴다", async () => {
    await save(everyone({ 0: { absent: false, wrongProblemIds: [P2] } }));
    const results = await db.testResult.findMany({
      where: { testId: TEST_ID },
    });
    for (const r of results) {
      const report = await db.analysisReport.findUnique({
        where: { testResultId: r.id },
      });
      expect(report).not.toBeNull();
    }
  });

  it("응답에 학생별 점수 목록이 담긴다 — 이름 · 맞은 개수 / 전체", async () => {
    const res = await save(
      everyone({ 0: { absent: false, wrongProblemIds: [P2] } }),
    );
    const { data } = gradeSubmitResponseSchema.parse(await res.json());
    expect(data.scores.map((s) => s.name)).toEqual(ROSTER.map((s) => s.name));
    expect(data.scores[0]!.correctCount).toBe(2);
    expect(data.scores[0]!.problemCount).toBe(3);
    expect(data.gradedCount).toBe(3);
    expect(data.absentCount).toBe(0);
  });

  it("🔴 시험지에 없는 문항 번호는 거절한다", async () => {
    const res = await save({
      entries: ROSTER.map((s) => ({
        studentId: s.id,
        absent: false,
        wrongProblemIds: [TEST_NOT_FOUND_ID],
      })),
    });
    expect(res.status).toBe(400);
    expect(
      await db.testResult.findMany({ where: { testId: TEST_ID } }),
    ).toHaveLength(0);
  });

  it("🔴 초안 시험지는 채점을 안 받는다", async () => {
    const res = await save(
      {
        entries: [
          { studentId: MOCK_STUDENT_1.id, absent: false, wrongProblemIds: [] },
        ],
      },
      TEST_DRAFT_ID,
    );
    expect(res.status).toBe(422);
  });

  it("재채점(정정)은 막지 않는다 — 새 행이 쌓이고 최신이 이긴다", async () => {
    await save(everyone({ 0: { absent: false, wrongProblemIds: [P1, P2] } }));
    await save(everyone({ 0: { absent: false, wrongProblemIds: [P2] } }));

    const rows = await db.testResult.findMany({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_1.id },
      orderBy: { takenAt: "desc" },
    });
    expect(rows.length).toBe(2);

    const res = await getGradeSheet(
      req(gradeUrl(TEST_ID), "GET"),
      withId(TEST_ID),
    );
    const { data } = gradeSheetResponseSchema.parse(await res.json());
    expect(data.students[0]!.latest?.wrongProblemIds).toEqual([P2]);
  });
});

// ─────────────────────────────────────────────
// ② 빠진 학생 — 이름을 돌려준다
// ─────────────────────────────────────────────

describe("② POST — 빠진 학생이 있으면 거절하고 **이름**을 돌려준다", () => {
  it("🔴 한 명이 빠지면 422 이고 그 이름이 문구에 있다", async () => {
    const res = await save({
      entries: ROSTER.slice(0, 2).map((s) => ({
        studentId: s.id,
        absent: false,
        wrongProblemIds: [],
      })),
    });
    expect(res.status).toBe(422);
    const { error } = errorResponseSchema.parse(await res.json());
    expect(error.message).toContain(MOCK_STUDENT_3.name);
    // 🔴 「1명 남음」이 아니라 이름이다 — 숫자만 대면 원장님이 명단을 다시 훑어야 한다.
    expect(error.message).not.toMatch(/\d+\s*명 (?:남|빠)/);
  });

  it("🔴 여럿이 빠지면 이름을 **전부** 나열한다", async () => {
    const res = await save({
      entries: [
        { studentId: MOCK_STUDENT_1.id, absent: false, wrongProblemIds: [] },
      ],
    });
    const { error } = errorResponseSchema.parse(await res.json());
    expect(error.message).toContain(MOCK_STUDENT_2.name);
    expect(error.message).toContain(MOCK_STUDENT_3.name);
  });

  it("🔴 거절하면 **아무것도 저장되지 않는다** — 반쪽 채점이 남으면 안 된다", async () => {
    await save({
      entries: ROSTER.slice(0, 2).map((s) => ({
        studentId: s.id,
        absent: false,
        wrongProblemIds: [],
      })),
    });
    expect(
      await db.testResult.findMany({ where: { testId: TEST_ID } }),
    ).toHaveLength(0);
    expect(await db.problemAnswer.findMany({ where: {} })).toHaveLength(0);
  });

  it("🔴 대상이 아닌 학생(다른 반)이 섞이면 거절한다", async () => {
    const res = await save({
      entries: [
        ...ROSTER.map((s) => ({
          studentId: s.id,
          absent: false,
          wrongProblemIds: [],
        })),
        { studentId: STUDENT_OTHER_CLASS, absent: false, wrongProblemIds: [] },
      ],
    });
    expect(res.status).toBe(422);
    expect(
      await db.testResult.findMany({ where: { testId: TEST_ID } }),
    ).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// ③④ 결시
// ─────────────────────────────────────────────

describe("③ 결시 학생은 분석 리포트가 안 생긴다", () => {
  it("🔴 AnalysisReport 가 없다", async () => {
    await save(everyone({ 2: { absent: true, wrongProblemIds: [] } }));
    const absent = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_3.id },
      orderBy: { takenAt: "desc" },
    });
    expect(absent!.absent).toBe(true);
    expect(
      await db.analysisReport.findUnique({
        where: { testResultId: absent!.id },
      }),
    ).toBeNull();
  });

  it("🔴 결시의 점수는 0 이 아니라 null 이다", async () => {
    await save(everyone({ 2: { absent: true, wrongProblemIds: [] } }));
    const absent = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_3.id },
      orderBy: { takenAt: "desc" },
    });
    expect(absent!.score).toBeNull();
    expect(absent!.predictedScore).toBeNull();
  });

  it("🔴 결시 학생에게는 ProblemAnswer 를 만들지 않는다 — 전 문항 오답과 다른 뜻이다", async () => {
    await save(everyone({ 2: { absent: true, wrongProblemIds: [] } }));
    const absent = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_3.id },
      orderBy: { takenAt: "desc" },
    });
    expect(
      await db.problemAnswer.findMany({ where: { testResultId: absent!.id } }),
    ).toHaveLength(0);
  });

  it("같은 시험지의 다른 학생은 그대로 채점된다", async () => {
    await save(everyone({ 2: { absent: true, wrongProblemIds: [] } }));
    const present = await db.testResult.findFirst({
      where: { testId: TEST_ID, studentId: MOCK_STUDENT_1.id },
      orderBy: { takenAt: "desc" },
    });
    expect(present!.absent).toBe(false);
    expect(present!.score).toBe(100);
  });

  it("응답의 결시 학생 줄은 점수가 null 이고 결시로 표시된다", async () => {
    const res = await save(
      everyone({ 2: { absent: true, wrongProblemIds: [] } }),
    );
    const { data } = gradeSubmitResponseSchema.parse(await res.json());
    const third = data.scores[2]!;
    expect(third.absent).toBe(true);
    expect(third.score).toBeNull();
    expect(data.gradedCount).toBe(2);
    expect(data.absentCount).toBe(1);
  });
});

describe("④ 🔴 결시 점수가 **어떤 집계에도 0으로 안 들어간다**", () => {
  it("평균이 결시를 빼고 계산된다 — 0으로 세었을 때와 값이 다르다", async () => {
    // 1번 만점(100) · 2번 서술형만 틀림(20) · 3번 결시
    await save(
      everyone({
        1: { absent: false, wrongProblemIds: [P3] },
        2: { absent: true, wrongProblemIds: [] },
      }),
    );
    const rows = await db.testResult.findMany({ where: { testId: TEST_ID } });
    const rollup = rollupScores(
      rows.map((r) => ({ score: r.score, absent: r.absent })),
    );

    const withoutAbsent = (100 + 20) / 2; // 60
    const asZero = (100 + 20 + 0) / 3; // 40 — 결시를 0으로 세면 이 값이 된다
    // 🔴 반증 짝 — 두 값이 같으면 이 시험은 아무것도 못 가른다.
    expect(withoutAbsent).not.toBe(asZero);

    expect(rollup.averageScore).toBe(withoutAbsent);
    expect(rollup.gradedCount).toBe(2);
    expect(rollup.absentCount).toBe(1);
  });

  it("전원 결시면 평균은 0 이 아니라 null 이다", async () => {
    await save(
      everyone({
        0: { absent: true, wrongProblemIds: [] },
        1: { absent: true, wrongProblemIds: [] },
        2: { absent: true, wrongProblemIds: [] },
      }),
    );
    const rows = await db.testResult.findMany({ where: { testId: TEST_ID } });
    const rollup = rollupScores(
      rows.map((r) => ({ score: r.score, absent: r.absent })),
    );
    expect(rollup.averageScore).toBeNull();
    expect(rollup.gradedCount).toBe(0);
  });

  it("🔴 결시가 아니어도 점수가 null 인 행은 평균에 안 들어간다 — «없는 값»은 언제나 빠진다", () => {
    const rollup = rollupScores([
      { score: 80, absent: false },
      { score: null, absent: false },
    ]);
    expect(rollup.averageScore).toBe(80);
    expect(rollup.gradedCount).toBe(1);
  });
});

// ─────────────────────────────────────────────
// ⑤ 소유 범위
// ─────────────────────────────────────────────

describe("⑤ 소유 범위", () => {
  it("로그인하지 않으면 401", async () => {
    const saved = sessionState.user;
    sessionState.user = null;
    try {
      const res = await getGradeSheet(
        req(gradeUrl(TEST_ID), "GET"),
        withId(TEST_ID),
      );
      expect(res.status).toBe(401);
    } finally {
      sessionState.user = saved;
    }
  });

  it("남의 시험지는 403 이고 아무것도 저장되지 않는다", async () => {
    const saved = sessionState.user;
    sessionState.user = {
      id: "10000000-0000-4000-8000-000000000002",
      email: "other@todaysmath.test",
      name: "다른 강사",
    };
    try {
      const res = await save(everyone());
      expect(res.status).toBe(403);
      expect(
        await db.testResult.findMany({ where: { testId: TEST_ID } }),
      ).toHaveLength(0);
    } finally {
      sessionState.user = saved;
    }
  });
});
