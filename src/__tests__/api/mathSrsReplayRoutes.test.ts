// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const f = vi.hoisted(() => ({
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  otherId: "ee7be323-de24-4c8c-b6d1-1da66f09efdf",
  session: null as unknown,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  withdrawn: false,
  disabled: false,
  missing: false,
  create: vi.fn(),
  update: vi.fn(),
  read: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
vi.mock("@/lib/figure/renderFigureSpec", () => ({ renderFigureSpec: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        name: "학생",
        classId: f.otherId,
        class: { id: f.otherId, name: "테스트반" },
        eywaWithdrawnAt: f.withdrawn ? new Date() : null,
        studentAccount: {
          id: f.otherId,
          disabledAt: f.disabled ? new Date() : null,
        },
      }),
    },
    studentSrsState: {
      findUnique: async ({ where }: { where: { studentId: string } }) => {
        f.read(where.studentId);
        if (f.missing) throw { code: "P2021" };
        return f.rows.get(where.studentId) ?? null;
      },
      create: f.create,
      updateMany: f.update,
    },
  },
}));

import { GET, POST } from "@/app/api/learn/math-srs/replay/route";
import {
  mathSrsReplayResponseSchema,
  type MathSrsReplayKind,
} from "@/contracts/mathSrsReplay.contract";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";
import { replayProblem } from "@/lib/math-srs/replay";
import { checkAnswer } from "@/lib/math-srs/sharedAnswers";
import {
  emptySrsState,
  parseSrsState,
  startSrsMission,
  submitSrsAttempt,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";

const now = new Date("2026-09-25T03:00:00.000Z");
const base = "http://localhost:3000";
const path = "/api/learn/math-srs/replay";
const get = (kind: MathSrsReplayKind = "elementary", step = 1, extra = "") =>
  GET(new Request(`${base}${path}?kind=${kind}&step=${step}${extra}`));
const post = (
  kind: MathSrsReplayKind,
  step: number,
  problemId: string,
  submittedAnswer: string,
  revealSolution = false,
  origin = base,
) =>
  POST(
    new Request(`${base}${path}`, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        step,
        problemId,
        submittedAnswer,
        revealSolution,
      }),
    }),
  );
const readData = async (response: Response) => {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return mathSrsReplayResponseSchema.parse(await response.json()).data;
};
function save(state: StoredSrsState, studentId = f.studentId) {
  const parsed = parseSrsState(state);
  f.rows.set(studentId, { studentId, revision: 38, payload: parsed });
  return parsed;
}
function course(at = now): StoredCourse {
  return startAutomaticCourse(
    setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: "3-1-1-1",
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      at,
    ),
    at,
    71,
    randomUUID,
  );
}
function answerCourse(state: StoredCourse, wrong = false, at = now) {
  const session = state.learner.session!;
  const problem = session.problems[session.attempts.length];
  expect(problem.input.mode).toBe("number");
  return submitCourseAttempt(
    state,
    {
      sessionId: session.id,
      problemId: problem.id,
      submittedAnswer: wrong ? "" : problem.answer,
      ...(wrong ? { giveUp: true } : {}),
    },
    at,
  );
}
function firstSession(count = 5, wrongFirst = false, at = now) {
  let state = course(at);
  for (let i = 0; i < count; i++)
    state = answerCourse(state, wrongFirst && i === 0, at);
  return state;
}
function middle(count = 1, at = now) {
  let state = startSrsMission(emptySrsState(), f.studentId, at, 71, randomUUID);
  for (let i = 0; i < count; i++) {
    const mission = state.missions[0];
    state = submitSrsAttempt(
      state,
      f.studentId,
      {
        missionId: mission.id,
        problemId: mission.problems[i].id,
        submittedAnswer: String(mission.problems[i].answer),
        elapsedSeconds: 10,
        rating: "good",
      },
      at,
    );
  }
  return state;
}
beforeEach(() => {
  f.rows.clear();
  f.withdrawn = false;
  f.disabled = false;
  f.missing = false;
  f.create.mockClear();
  f.update.mockClear();
  f.read.mockClear();
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("AUTH_URL", base);
});
afterEach(() => {
  expect(f.create).not.toHaveBeenCalled();
  expect(f.update).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("completed board tile replay API", () => {
  it("maps today's earlier session and current partial session to the actual saved questions", async () => {
    let c = firstSession();
    const previous = c.learner.session!;
    c = startAutomaticCourse(c, now, 83, randomUUID);
    c = answerCourse(answerCourse(c));
    const state = save({ ...emptySrsState(), course: c });
    const before = structuredClone(f.rows);
    const old = await readData(await get("elementary", 3));
    const active = await readData(await get("elementary", 7));
    expect(old.problemId).toBe(previous.problems[2].id);
    expect(active.problemId).toBe(c.learner.session!.problems[1].id);
    expect(old.canRevealSolution).toBe(true);
    expect(active.canRevealSolution).toBe(false);
    expect(active.subtitle).toMatch(/^초3 · 1학기 · /);
    expect(active.title).toBeTruthy();
    expect(f.rows).toEqual(before);
    expect(state.course!.learner.session!.attempts).toHaveLength(2);
    expect((await get("elementary", 8)).status).toBe(409);
  });

  it("returns exactly four choices, no answer key, seed, old answer, hint, or solution even after an earlier reveal", async () => {
    const c = firstSession();
    const session = c.learner.session!;
    const problem = session.problems[0];
    session.revealedProblemIds = [problem.id];
    save({ ...emptySrsState(), course: c });
    const data = await readData(await get());
    expect(Object.keys(data).sort()).toEqual(
      [
        "kind",
        "step",
        "problemId",
        "title",
        "subtitle",
        "content",
        "figureUrl",
        "answerChoices",
        "interactive",
        "correct",
        "canRevealSolution",
        "solution",
      ].sort(),
    );
    expect(data.correct).toBeNull();
    expect(data.solution).toBeNull();
    expect(data.answerChoices).toHaveLength(4);
    expect(
      data.answerChoices.filter((choice) => gradeCourseAnswer(problem, choice)),
    ).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain('"answer":');
    expect(JSON.stringify(data)).not.toContain('"submittedAnswer":');
    expect((await readData(await get())).answerChoices).toEqual(
      data.answerChoices,
    );
  });

  it("checks a replay without updating any stored counters, revision, session or memories", async () => {
    const c = firstSession(2);
    save({ ...middle(2), course: c });
    const before = structuredClone(f.rows);
    const problem = c.learner.session!.problems[0];
    const data = await readData(
      await post("elementary", 1, problem.id, problem.answer),
    );
    expect(data.correct).toBe(true);
    expect(data.solution).toBeNull();
    const wrong = await readData(
      await post("elementary", 1, problem.id, "-987654", true),
    );
    expect(wrong.correct).toBe(false);
    expect(wrong.solution).toBeNull();
    expect(f.rows).toEqual(before);
    expect(f.rows.get(f.studentId)!.revision).toBe(38);
  });

  it("reveals only on explicit request with a correct replay after both original and retry rounds finish", async () => {
    let c = firstSession(5, true);
    const problem = c.learner.session!.problems[0];
    save({ ...emptySrsState(), course: c });
    let data = await readData(
      await post("elementary", 1, problem.id, problem.answer, true),
    );
    expect(data.correct).toBe(true);
    expect(data.canRevealSolution).toBe(false);
    expect(data.solution).toBeNull();
    c = submitCourseAttempt(
      c,
      {
        sessionId: c.learner.session!.id,
        problemId: problem.id,
        submittedAnswer: problem.answer,
        retryIndex: 0,
      },
      now,
    );
    save({ ...emptySrsState(), course: c });
    const before = structuredClone(f.rows);
    data = await readData(
      await post("elementary", 1, problem.id, problem.answer),
    );
    expect(data.canRevealSolution).toBe(true);
    expect(data.solution).toBeNull();
    data = await readData(
      await post("elementary", 1, problem.id, "-987654", true),
    );
    expect(data.solution).toBeNull();
    data = await readData(
      await post("elementary", 1, problem.id, problem.answer, true),
    );
    expect(data.solution).toEqual({
      answer: problem.answer,
      solution: problem.solution,
    });
    expect(f.rows).toEqual(before);
  });

  it("rejects unopened tiles and mismatched saved problem ids", async () => {
    const c = firstSession(1);
    save({ ...emptySrsState(), course: c });
    expect((await get("elementary", 2)).status).toBe(409);
    expect(
      (await post("elementary", 2, c.learner.session!.problems[1].id, "1"))
        .status,
    ).toBe(409);
    expect((await post("elementary", 1, randomUUID(), "1")).status).toBe(409);
  });

  it("handles a KST date rollover with a stale-board conflict instead of replaying a different question", async () => {
    const yesterday = new Date("2026-09-24T14:59:00.000Z");
    const old = firstSession(5, false, yesterday);
    const oldProblem = old.learner.session!.problems[0];
    const c = answerCourse(startAutomaticCourse(old, now, 83, randomUUID));
    save({ ...emptySrsState(), course: c });
    const today = await readData(await get());
    expect(today.problemId).toBe(c.learner.session!.problems[0].id);
    expect(
      (await post("elementary", 1, oldProblem.id, oldProblem.answer)).status,
    ).toBe(409);
    expect((await get("elementary", 2)).status).toBe(409);
  });

  it("only reads the authenticated student's row and rejects foreign ids and injected student selectors", async () => {
    const own = firstSession(1);
    const other = firstSession(1);
    save({ ...emptySrsState(), course: own });
    save({ ...emptySrsState(), course: other }, f.otherId);
    const foreign = other.learner.session!.problems[0];
    expect(
      (await post("elementary", 1, foreign.id, foreign.answer)).status,
    ).toBe(409);
    expect((await get("elementary", 1, `&studentId=${f.otherId}`)).status).toBe(
      400,
    );
    expect(f.read.mock.calls.flat()).toEqual([f.studentId]);
  });

  it("requires an active student and checks withdrawal/disabled-account state", async () => {
    f.session = null;
    expect((await get()).status).toBe(401);
    f.session = { user: { role: "director", id: f.otherId } };
    expect((await get()).status).toBe(401);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: true },
    };
    expect((await get()).status).toBe(403);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: false },
    };
    f.withdrawn = true;
    expect((await get()).status).toBe(401);
    f.withdrawn = false;
    f.disabled = true;
    expect((await get()).status).toBe(401);
    expect(f.read).not.toHaveBeenCalled();
  });

  it("enforces same-origin POST and no-store on errors", async () => {
    const response = await post(
      "elementary",
      1,
      randomUUID(),
      "1",
      false,
      "https://other.example",
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(f.read).not.toHaveBeenCalled();
    f.missing = true;
    expect((await get()).status).toBe(503);
  });

  it("validates replay coordinates and payloads instead of accepting arbitrary grade requests", async () => {
    for (const query of [
      "kind=other&step=1",
      "kind=middle&step=0",
      "kind=middle&step=1.5",
      "kind=middle&step=501",
    ]) {
      expect((await GET(new Request(`${base}${path}?${query}`))).status).toBe(
        400,
      );
    }
    expect(
      (
        await POST(
          new Request(`${base}${path}`, {
            method: "POST",
            headers: { origin: base },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect((await post("middle", 1, randomUUID(), "")).status).toBe(400);
    expect(f.read).not.toHaveBeenCalled();
  });

  it("replays a completed middle-school tile with numeric grading and four unique choices", async () => {
    const state = save(middle(2));
    const before = structuredClone(f.rows);
    const problem = state.missions[0].problems[0];
    const data = await readData(await get("middle"));
    expect(data.problemId).toBe(problem.id);
    expect(data.solution).toBeNull();
    expect(data.correct).toBeNull();
    expect(data.answerChoices).toHaveLength(4);
    expect(new Set(data.answerChoices).size).toBe(4);
    expect(
      data.answerChoices.filter((choice) =>
        checkAnswer(choice, problem.answer),
      ),
    ).toHaveLength(1);
    const correct = data.answerChoices.find((choice) =>
      checkAnswer(choice, problem.answer),
    )!;
    expect(
      (await readData(await post("middle", 1, problem.id, correct, true)))
        .correct,
    ).toBe(true);
    expect(
      (await readData(await post("middle", 1, problem.id, correct, true)))
        .solution,
    ).toBeNull();
    expect((await get("middle", 3)).status).toBe(409);
    expect(f.rows).toEqual(before);
  });

  it("retains solved tiles in a middle mission started yesterday and reveals only after it is finished", async () => {
    const yesterday = new Date("2026-09-24T10:00:00.000Z");
    let state = save(middle(2, yesterday));
    const problem = state.missions[0].problems[0];
    expect((await readData(await get("middle"))).problemId).toBe(problem.id);
    state = save(middle(12));
    const completed = state.missions[0].problems[0];
    const before = structuredClone(f.rows);
    const data = await readData(
      await post("middle", 1, completed.id, String(completed.answer), true),
    );
    expect(data.solution).toEqual({
      answer: completed.answerText,
      solution: completed.solution.join("\n"),
    });
    expect(
      (await readData(await post("middle", 1, completed.id, "-987654", true)))
        .solution,
    ).toBeNull();
    expect(f.rows).toEqual(before);
  });

  it("rejects a legacy self-check question instead of inventing grading or exposing its solution", () => {
    const c = firstSession(1);
    const problem = c.learner.session!.problems[0];
    problem.content = "덧셈의 원리를 설명하시오.";
    problem.input.mode = "self-check";
    const state = { ...emptySrsState(), course: c };
    const before = structuredClone(state);
    expect(() => replayProblem(state, "elementary", 1, now)).toThrow(
      "이 문제는 선생님과 함께 다시 확인해 주세요.",
    );
    expect(state).toEqual(before);
  });

  it("adapts a legacy printed four-candidate question without changing its saved prompt", async () => {
    let c = course();
    const p = c.learner.session!.problems[0];
    p.content =
      "다음 수 중에서 $28$의 약수가 아닌 수를 찾아 쓰시오.\n$2,\\ 7,\\ 23,\\ 14$";
    p.answer = "$23$";
    p.answerChoices = undefined;
    p.interactive = undefined;
    c = answerCourse(c);
    save({ ...emptySrsState(), course: c });
    const before = structuredClone(f.rows);
    const data = await readData(await get());
    expect(data.content).not.toContain("2,\\ 7");
    expect(data.answerChoices).toEqual(
      expect.arrayContaining(["$2$", "$7$", "$23$", "$14$"]),
    );
    expect(
      (await readData(await post("elementary", 1, p.id, "$23$"))).correct,
    ).toBe(true);
    expect(f.rows).toEqual(before);
  });

  it("keeps a saved fraction interactive with its protected figure URL and grades equivalent fractions", async () => {
    let c = course();
    const p = c.learner.session!.problems[0];
    p.content =
      "막대를 똑같이 세 조각으로 나누어 두 조각을 칠했습니다. 칠한 부분은 전체의 얼마입니까?";
    p.answer = "$\\frac{2}{3}$";
    p.answerChoices = undefined;
    p.interactive = undefined;
    p.figureSpec = { type: "fraction_bar" };
    c = answerCourse(c);
    save({ ...emptySrsState(), course: c });
    const before = structuredClone(f.rows);
    const data = await readData(await get());
    expect(data.interactive).toEqual({
      kind: "fraction-parts",
      denominator: 3,
      shape: "bar",
    });
    expect(data.figureUrl).toBe(
      `/api/learn/math-srs/course/figure?sessionId=${c.learner.session!.id}&problemId=${p.id}`,
    );
    expect(
      data.answerChoices.filter((choice) => gradeCourseAnswer(p, choice)),
    ).toHaveLength(1);
    expect(
      (await readData(await post("elementary", 1, p.id, "4/6"))).correct,
    ).toBe(true);
    expect(f.rows).toEqual(before);
  });

  it.each([
    ["x + 3 = 5", "$x + 3 = 5$"],
    ["\\frac{x}{2} = 3", "$\\frac{x}{2} = 3$"],
    ["$2x = 1$", "$2x = 1$"],
    ["\\(2x = 1\\)", "$2x = 1$"],
    ["\\[2x = 1\\]", "$2x = 1$"],
  ])("adds math boundaries to the saved equation %s", (equation, displayed) => {
    const state = middle(1);
    const problem = state.missions[0].problems[0];
    problem.equation = equation;
    const data = replayProblem(state, "middle", 1, now);
    expect(data.content).toContain(`\n\n${displayed}`);
    expect(problem.equation).toBe(equation);
  });

  it.each([0, -3, 0.5, -2 / 3, 1.25, 1000000])(
    "keeps middle distractors numerically distinct for answer %s",
    (answer) => {
      const state = middle(1);
      const p = state.missions[0].problems[0];
      p.answer = answer;
      const before = structuredClone(state);
      const data = replayProblem(state, "middle", 1, now);
      expect(data.answerChoices).toHaveLength(4);
      expect(
        data.answerChoices.filter((choice) => checkAnswer(choice, answer)),
      ).toHaveLength(1);
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          expect(data.answerChoices[i]).not.toBe(data.answerChoices[j]);
        }
      }
      expect(replayProblem(state, "middle", 1, now).answerChoices).toEqual(
        data.answerChoices,
      );
      expect(state).toEqual(before);
    },
  );
});
