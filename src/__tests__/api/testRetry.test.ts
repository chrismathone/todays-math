import type { Prisma } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({
  user: {
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
    isAdmin: false,
  } as { id: string; email: string; name: string; isAdmin: boolean } | null,
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));

import { POST } from "@/app/api/tests/[id]/retry/route";
import { retryPlanResponseSchema } from "@/contracts/retry.contract";
import { db } from "@/lib/db";
import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { problemEligibleWhere } from "@/lib/problemEligibility";
import { RETRY_CANDIDATE_SELECT } from "@/lib/tests/retryCandidates";
import {
  MOCK_STUDENT_1,
  MOCK_STUDENT_2,
  STUDENT_IDS,
  CLASS_A_ID,
  TEST_RESULT_FIXTURE_TEST_ID,
  TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID,
  TEST_NOT_FOUND_ID,
  TEST_DRAFT_ID,
} from "@/mocks/data";

const testId = TEST_RESULT_FIXTURE_TEST_ID;
const studentId = MOCK_STUDENT_1.id;

async function request(body: unknown = { studentId }, id = testId) {
  return POST(
    new NextRequest(`http://localhost/api/tests/${id}/retry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function makeProblem(
  overrides: Partial<Prisma.ProblemUncheckedCreateInput> = {},
) {
  const base = (await db.problem.findUnique({
    where: { id: TEST_RESULT_PROBLEM_OBJECTIVE_CORRECT_ID },
  }))!;
  const {
    id: _id,
    problemCode: _code,
    createdAt: _created,
    updatedAt: _updated,
    ...data
  } = base;
  void [_id, _code, _created, _updated];
  return db.problem.create({
    data: {
      ...data,
      source: "school_textbook",
      familyKey: "retry-fixture-F",
      reviewStatus: "approved",
      directUseAllowed: true,
      pool: "shared",
      content: "$3+2$의 값은?",
      answer: "$5$",
      ...overrides,
    },
  });
}

async function original(order = 10, familyKey = "retry-fixture-F") {
  const problem = await makeProblem({ familyKey });
  await db.testProblem.create({
    data: { testId, problemId: problem.id, orderIndex: order },
  });
  return problem;
}

async function child(
  parent: Awaited<ReturnType<typeof original>>,
  slot: number,
  overrides: Partial<Prisma.ProblemUncheckedCreateInput> = {},
) {
  return makeProblem({
    source: "transformed",
    unitId: parent.unitId,
    familyKey: parent.familyKey,
    originProblemId: parent.id,
    externalId: `tb-retry-v1:${parent.id}:${slot}`,
    content: `$${slot + 3}+2$의 값은?`,
    answer: `$${slot + 5}$`,
    ...overrides,
  });
}

async function grading(
  ids: string[],
  who = studentId,
  absent = false,
  inTest = testId,
) {
  const result = await db.testResult.create({
    data: {
      testId: inTest,
      studentId: who,
      gradingMode: "marks",
      absent,
      score: absent ? null : 0,
      predictedScore: absent ? null : 0,
    },
  });
  await db.problemAnswer.createMany({
    data: ids.map((problemId, sequence) => ({
      testResultId: result.id,
      problemId,
      sequence,
      isCorrect: false,
      selectedChoice: null,
      essayScore: null,
    })),
  });
  return result;
}

beforeEach(() => {
  vi.restoreAllMocks();
  sessionState.user = {
    id: "10000000-0000-4000-8000-000000000001",
    email: "teacher@todaysmath.test",
    name: "테스트 강사",
    isAdmin: false,
  };
});

describe("POST /api/tests/{id}/retry — 실제 계획 · 질의 · 응답 배선", () => {
  it("교과서 오답의 두 문항 배정을 명시적 count로 줄이지 못한다", async () => {
    const parent = await original();
    await child(parent, 1);
    await child(parent, 2);
    await grading([parent.id]);
    expect((await request({ studentId, count: 1 })).status).toBe(422);
    const { data } = retryPlanResponseSchema.parse(
      await (await request({ studentId, count: 2 })).json(),
    );
    expect(data.requestedCount).toBe(2);
    expect(data.picked).toHaveLength(2);
  });
  it("같은 갈래의 교과서 오답도 원문마다 지정 변형 두 개와 직접 출처를 반환한다", async () => {
    // 채점 응답 순서가 뒤집혀도 시험지 순서대로 원문별 쌍이 나간다.
    const a = await original(11),
      b = await original(10);
    const a1 = await child(a, 1),
      a2 = await child(a, 2),
      b1 = await child(b, 1),
      b2 = await child(b, 2);
    const result = await grading([a.id, b.id]);
    const query = vi.spyOn(db.problem, "findMany");
    const response = await request({ studentId, testResultId: result.id });
    expect(response.status).toBe(200);
    const { data } = retryPlanResponseSchema.parse(await response.json());
    expect(data.wrongProblemIds).toEqual([b.id, a.id]);
    expect(data.requestedCount).toBe(4);
    expect(
      data.picked.map((seat) => [
        seat.problem.id,
        seat.problem.source,
        seat.problem.originProblemId,
        seat.wrongProblemId,
      ]),
    ).toEqual([
      [b1.id, "transformed", b.id, b.id],
      [b2.id, "transformed", b.id, b.id],
      [a1.id, "transformed", a.id, a.id],
      [a2.id, "transformed", a.id, a.id],
    ]);
    expect(data.picked[0]!.problem.externalId).toBe(`tb-retry-v1:${b.id}:1`);
    expect(data.picked[0]!.problem.content).toBe(b1.content);
    expect(data.picked[0]!.problem.answer).toBe(b1.answer);
    expect(data.picked[0]!.problem.familyKey).toBe(b.familyKey);
    expect(data.shortfall).toBe(0);
    expect(data.foldedWrong).toBe(0);
    expect(data.textbookShortfalls).toEqual([]);
    // 명시적으로 요청한 QA 실행에서 실제 라우트 응답을 보관한다. 일반 시험은 파일을 쓰지 않는다.
    if (process.env.TEXTBOOK_RETRY_API_EVIDENCE_PATH) {
      writeFileSync(
        process.env.TEXTBOOK_RETRY_API_EVIDENCE_PATH,
        JSON.stringify(
          {
            fixture:
              "In-memory synthetic fixture; not production IDs, content or approvals",
            request: {
              method: "POST",
              path: `/api/tests/${testId}/retry`,
              body: { studentId, testResultId: result.id },
            },
            response: { status: response.status, data },
          },
          null,
          2,
        ) + "\n",
      );
    }
    const candidateCall = query.mock.calls.find(([args]) =>
      JSON.stringify(args?.where).includes("tb-retry-v1"),
    )![0]!;
    expect(candidateCall.select).toEqual(RETRY_CANDIDATE_SELECT);
    expect(candidateCall.where).toEqual({
      AND: [
        problemEligibleWhere(),
        {
          OR: [
            {
              source: "transformed",
              originProblemId: { in: [b.id, a.id] },
              externalId: {
                in: [b.id, a.id].flatMap((id) =>
                  [1, 2].map((slot) => `tb-retry-v1:${id}:${slot}`),
                ),
              },
            },
          ],
        },
      ],
    });
  });

  it.each([0, 1])(
    "지정 변형이 %i개 승인되어 있으면 그 수만 반환하고 부족을 명시한다",
    async (available) => {
      const parent = await original();
      await child(parent, 1, {
        reviewStatus: available ? "approved" : "pending",
      });
      await child(parent, 2, { reviewStatus: "pending" });
      await child(parent, 3); // 임의의 추가 슬롯으로 메우지 않는다.
      await child(parent, 1, {
        externalId: `textbook-recovery:old:${parent.id}`,
      });
      await grading([parent.id]);
      const response = await request();
      expect(response.status).toBe(200);
      const { data } = retryPlanResponseSchema.parse(await response.json());
      expect(data.requestedCount).toBe(2);
      expect(data.picked).toHaveLength(available);
      expect(data.shortfall).toBe(2 - available);
      expect(data.textbookShortfalls).toEqual([
        { wrongProblemId: parent.id, required: 2, available },
      ]);
      expect(
        data.picked.every(
          (seat) => seat.origin === "형제" && seat.problem.id !== parent.id,
        ),
      ).toBe(true);
    },
  );

  it.each([
    { directUseAllowed: false },
    { pool: "private" as const },
    { reviewStatus: "pending" as const },
    { reviewStatus: "rejected" as const },
    { answer: MISSING_ANSWER },
    { source: "school_textbook" as const },
    { originProblemId: TEST_NOT_FOUND_ID },
  ])(
    "숨김·잠금·미승인·잘못 연결된 후보를 응답에 싣지 않는다: %o",
    async (override) => {
      const parent = await original();
      const good = await child(parent, 1);
      await child(parent, 2, override);
      await grading([parent.id]);
      const response = await request();
      const { data } = retryPlanResponseSchema.parse(await response.json());
      expect(data.picked.map((seat) => seat.problem.id)).toEqual([good.id]);
      expect(data.shortfall).toBe(1);
    },
  );

  it("직접 부모가 맞아도 다른 단원의 변형은 뽑지 않는다", async () => {
    const parent = await original();
    await child(parent, 1, { unitId: TEST_NOT_FOUND_ID });
    await grading([parent.id]);
    const { data } = retryPlanResponseSchema.parse(
      await (await request()).json(),
    );
    expect(data.picked).toEqual([]);
    expect(data.shortfall).toBe(2);
  });

  it("제외 목록을 지정 쌍에 적용하며 없는 슬롯을 원문으로 메우지 않는다", async () => {
    const parent = await original();
    const first = await child(parent, 1),
      second = await child(parent, 2);
    await grading([parent.id]);
    const { data } = retryPlanResponseSchema.parse(
      await (await request({ studentId, excludeIds: [first.id] })).json(),
    );
    expect(data.picked.map((seat) => seat.problem.id)).toEqual([second.id]);
    expect(data.shortfall).toBe(1);
  });

  it("응답 본문을 읽기 직전에 자격이 닫힌 변형도 부족으로 남긴다", async () => {
    const parent = await original();
    const first = await child(parent, 1),
      second = await child(parent, 2);
    await grading([parent.id]);
    const find = db.problem.findMany.bind(db.problem);
    const closeBeforeRead = async (
      args: Parameters<typeof db.problem.findMany>[0],
    ) => {
      if (!args?.select)
        await db.problem.update({
          where: { id: second.id },
          data: { directUseAllowed: false },
        });
      return find(args);
    };
    // 인메모리 대역의 Promise는 PrismaPromise의 표시만 없다. 질의 · 반환 행은 원래 대역을 쓴다.
    vi.spyOn(db.problem, "findMany").mockImplementation(
      closeBeforeRead as typeof db.problem.findMany,
    );
    const { data } = retryPlanResponseSchema.parse(
      await (await request()).json(),
    );
    expect(data.picked.map((seat) => seat.problem.id)).toEqual([first.id]);
    expect(data.shortfall).toBe(1);
    expect(data.textbookShortfalls).toEqual([
      { wrongProblemId: parent.id, required: 2, available: 1 },
    ]);
  });

  it("일반 출처는 한 갈래 한 자리·원문 대체·명시된 문항 수를 유지한다", async () => {
    const first = await original(10),
      second = await original(11);
    await db.problem.update({
      where: { id: first.id },
      data: { source: "past_exam" },
    });
    await db.problem.update({
      where: { id: second.id },
      data: { source: "past_exam" },
    });
    await grading([first.id, second.id]);
    const { data } = retryPlanResponseSchema.parse(
      await (await request({ studentId, count: 8 })).json(),
    );
    expect(data.requestedCount).toBe(8);
    expect(data.picked).toHaveLength(1);
    expect(data.foldedWrong).toBe(1);
    expect(data.shortfall).toBe(7);
    const singleton = await original(12, "single-family");
    await db.problem.update({
      where: { id: singleton.id },
      data: { source: "manual" },
    });
    const result = await grading([singleton.id]);
    const payload = retryPlanResponseSchema.parse(
      await (await request({ studentId, testResultId: result.id })).json(),
    ).data;
    expect(
      payload.picked.map((seat) => [seat.problem.id, seat.origin]),
    ).toEqual([[singleton.id, "원문"]]);
  });

  it("명시한 채점 기록을 사용하고 다른 학생의 최신 결과로 바꾸지 않는다", async () => {
    const parent = await original();
    await child(parent, 1);
    await child(parent, 2);
    const old = await grading([parent.id]);
    await grading([]);
    const other = await grading([parent.id], MOCK_STUDENT_2.id);
    const specified = retryPlanResponseSchema.parse(
      await (await request({ studentId, testResultId: old.id })).json(),
    ).data;
    expect(specified.testResultId).toBe(old.id);
    expect(specified.picked).toHaveLength(2);
    const latest = retryPlanResponseSchema.parse(
      await (await request()).json(),
    ).data;
    expect(latest.wrongProblemIds).toEqual([]);
    expect(latest.requestedCount).toBe(0);
    expect((await request({ studentId, testResultId: other.id })).status).toBe(
      404,
    );
  });

  it("다른 시험의 채점 기록을 빌려 쓰지 않는다", async () => {
    const other = await grading([], studentId, false, TEST_DRAFT_ID);
    expect((await request({ studentId, testResultId: other.id })).status).toBe(
      404,
    );
  });

  it("시험 대상이 다른 학생인 개별 시험은 거절한다", async () => {
    await db.test.update({
      where: { id: testId },
      data: { studentId: MOCK_STUDENT_2.id },
    });
    expect((await request()).status).toBe(404);
  });

  it("다른 반 학생이나 다른 반 시험에 접근할 수 없다", async () => {
    expect((await request({ studentId: STUDENT_IDS[3]! })).status).toBe(404);
    await db.class.update({
      where: { id: CLASS_A_ID },
      data: { userId: "10000000-0000-4000-8000-000000000002" },
    });
    expect((await request()).status).toBe(403);
  });

  it("결시·초안·시험 밖 오답은 복습으로 해석하지 않는다", async () => {
    const absent = await grading([], studentId, true);
    expect((await request({ studentId, testResultId: absent.id })).status).toBe(
      422,
    );
    expect((await request({ studentId }, TEST_DRAFT_ID)).status).toBe(422);
    const wrong = await makeProblem();
    const result = await grading([wrong.id]);
    expect((await request({ studentId, testResultId: result.id })).status).toBe(
      422,
    );
  });

  it("공용 풀에서 빠진 오답 원문을 조용히 누락하지 않는다", async () => {
    const parent = await original();
    await db.problem.update({
      where: { id: parent.id },
      data: { pool: "private" },
    });
    await grading([parent.id]);
    expect((await request()).status).toBe(422);
  });

  it("로그인과 명시적인 학생 id를 요구하고 임의 오답 입력은 거절한다", async () => {
    expect((await request({})).status).toBe(400);
    expect(
      (await request({ studentId, wrongProblemIds: [TEST_NOT_FOUND_ID] }))
        .status,
    ).toBe(400);
    expect((await request({ studentId }, "invalid")).status).toBe(400);
    sessionState.user = null;
    expect((await request()).status).toBe(401);
  });

  it("계획 조회가 시험 · 문항 · 채점 기록을 수정하지 않는다", async () => {
    const parent = await original();
    await child(parent, 1);
    await child(parent, 2);
    await grading([parent.id]);
    const mutations = [
      vi.spyOn(db.test, "create"),
      vi.spyOn(db.test, "update"),
      vi.spyOn(db.problem, "create"),
      vi.spyOn(db.problem, "update"),
      vi.spyOn(db.testResult, "create"),
      vi.spyOn(db.problemAnswer, "createMany"),
    ];
    expect((await request()).status).toBe(200);
    for (const mutation of mutations) expect(mutation).not.toHaveBeenCalled();
  });
});
