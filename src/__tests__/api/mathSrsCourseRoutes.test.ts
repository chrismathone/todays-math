// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  studentId: "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2",
  otherId: "ee7be323-de24-4c8c-b6d1-1da66f09efdf",
  ownerId: "d56e582b-a5af-4763-8b0a-801ecff4b5a5",
  classId: "7e7c388b-c264-4d39-809b-527723b8b74b",
  session: null as unknown,
  rows: new Map<
    string,
    { studentId: string; revision: number; payload: unknown }
  >(),
  withdrawn: false,
  disabled: false,
  missing: false,
  grade: null as string | null,
  audit: vi.fn<(args: unknown) => Promise<unknown>>(async () => ({})),
  render: vi.fn(async () => ({
    ok: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" />',
  })),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, fn: unknown) => fn,
}));
vi.mock("@/lib/figure/renderFigureSpec", () => ({
  renderFigureSpec: f.render,
}));
vi.mock("@/lib/db", () => {
  const student = (id: string) => ({
    id,
    name: "학생",
    classId: f.classId,
    eywaBindingId: null,
    isTest: false,
    enrollments: [],
    eywaWithdrawnAt: f.withdrawn ? new Date() : null,
    class: {
      id: f.classId,
      name: "초3",
      grade: f.grade,
      userId: f.ownerId,
      branchId: null,
      eywaBindingId: null,
    },
    studentAccount: {
      id: f.otherId,
      disabledAt: f.disabled ? new Date() : null,
    },
  });
  return {
    db: {
      eywaManagedAccount: { findUnique: async () => null },
      user: { findUnique: async () => ({ authSource: "local" }) },
      async $transaction<T>(work: (tx: object) => Promise<T>): Promise<T> {
        return work(this);
      },
      accountAuditLog: { create: f.audit },
      unit: { findFirst: vi.fn(async () => null) },
      problem: { findMany: vi.fn(async () => []) },
      student: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          [f.studentId, f.otherId].includes(where.id)
            ? student(where.id)
            : null,
        ),
        findMany: vi.fn(
          async ({
            where,
          }: {
            where: { class?: { userId: string }; eywaWithdrawnAt?: null };
          }) => {
            if (where.class && where.class.userId !== f.ownerId) return [];
            return where.eywaWithdrawnAt === null && f.withdrawn
              ? []
              : [student(f.studentId), student(f.otherId)];
          },
        ),
      },
      class: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === f.classId ? student(f.studentId).class : null,
        findMany: async ({ where }: { where: { userId?: string } }) =>
          where.userId && where.userId !== f.ownerId
            ? []
            : [{ id: f.classId, name: "초3" }],
      },
      studentSrsState: {
        findUnique: async ({ where }: { where: { studentId: string } }) => {
          if (f.missing) throw { code: "P2021" };
          return structuredClone(f.rows.get(where.studentId) ?? null);
        },
        findMany: async ({
          where,
        }: {
          where: { studentId: { in: string[] } };
        }) => {
          if (f.missing) throw { code: "P2021" };
          return where.studentId.in.flatMap((id) =>
            f.rows.has(id) ? [structuredClone(f.rows.get(id)!)] : [],
          );
        },
        create: async ({
          data,
        }: {
          data: { studentId: string; revision: number; payload: unknown };
        }) => {
          if (f.rows.has(data.studentId)) throw { code: "P2002" };
          f.rows.set(data.studentId, structuredClone(data));
          return data;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { studentId: string; revision: number };
          data: { payload: unknown };
        }) => {
          const row = f.rows.get(where.studentId);
          if (!row || row.revision !== where.revision) return { count: 0 };
          f.rows.set(where.studentId, {
            ...row,
            revision: row.revision + 1,
            payload: structuredClone(data.payload),
          });
          return { count: 1 };
        },
      },
    },
  };
});
import { GET, POST } from "@/app/api/learn/math-srs/course/route";
import { POST as PLAN } from "@/app/api/learn/math-srs/course/plan/route";
import { POST as ATTEMPT } from "@/app/api/learn/math-srs/course/attempts/route";
import { POST as HINT } from "@/app/api/learn/math-srs/course/hint/route";
import { POST as FOLLOW_UP } from "@/app/api/learn/math-srs/course/follow-up/route";
import { GET as FIGURE } from "@/app/api/learn/math-srs/course/figure/route";
import { GET as ROSTER } from "@/app/api/math-srs/course/route";
import {
  GET as DETAIL,
  POST as TEACHER_PLAN,
} from "@/app/api/students/[id]/math-srs/course/route";
import {
  courseDashboardResponseSchema,
  courseRosterStudentResponseSchema,
  courseStudentDetailResponseSchema,
  courseStudentResponseSchema,
  type CourseAttemptInput,
} from "@/contracts/mathSrsCourse.contract";
import {
  emptyCourseState,
  revealCourseHint,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";
import { db } from "@/lib/db";

const base = "http://localhost:3000";
const coursePath = "/api/learn/math-srs/course";
const request = (
  path = coursePath,
  method = "GET",
  body?: unknown,
  origin = base,
) =>
  new Request(`${base}${path}`, {
    method,
    headers: { origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const plan = {
  startSectionId: "3-1-1-1",
  dailyQuestionCount: 10,
  enabled: true,
  expectedRevision: 0,
};
const teacher = (changes = {}) => {
  f.session = {
    user: {
      id: f.ownerId,
      name: "선생님",
      role: "director",
      isAdmin: false,
      approvalStatus: "approved",
      menus: ["srs"],
      ...changes,
    },
  };
};
const studentSession = () => {
  f.session = {
    student: { studentId: f.studentId, mustChangePassword: false },
  };
};
const context = (id = f.studentId) => ({ params: Promise.resolve({ id }) });
const teacherPath = (id = f.studentId) => `/api/students/${id}/math-srs/course`;
async function started() {
  teacher();
  expect(
    (await TEACHER_PLAN(request(teacherPath(), "POST", plan), context()))
      .status,
  ).toBe(200);
  studentSession();
  const response = await POST(request(coursePath, "POST", {}));
  expect(response.status).toBe(200);
  return courseStudentResponseSchema.parse(await response.json()).data;
}
beforeEach(() => {
  f.rows.clear();
  f.withdrawn = false;
  f.disabled = false;
  f.missing = false;
  f.grade = null;
  f.render.mockClear();
  f.audit.mockReset();
  vi.stubEnv("AUTH_URL", base);
  studentSession();
});
afterEach(() => vi.unstubAllEnvs());

describe("course follow-ups — «한 번 더 → 풀이» (plan §3.2)", () => {
  const asking = (path: string, body: unknown) =>
    new Request(`${base}${path}`, {
      method: "POST",
      headers: {
        origin: base,
        "Content-Type": "application/json",
        "x-course-follow-up": "1",
      },
      body: JSON.stringify(body),
    });
  const read = async (response: Response) => {
    expect(response.status).toBe(200);
    return courseStudentResponseSchema.parse(await response.json()).data;
  };
  const stored = () =>
    parseSrsState(f.rows.get(f.studentId)!.payload).course!.learner.session!;

  it.each(["next-first", "retry"])(
    "saves a clock-back %s after follow-up answer/done through the actual route, with duplicate writes zero",
    async (boundary) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const at = (minute: number) =>
        new Date(Date.parse("2026-10-21T14:50:00.000Z") + minute * 60_000);
      const writes = vi.spyOn(db.studentSrsState, "updateMany");
      try {
        vi.setSystemTime(at(0));
        const course = startAutomaticCourse(
          setCoursePlan(
            emptyCourseState(),
            { ...plan, dailyQuestionCount: 10 },
            at(0),
          ),
          at(0),
          1,
          randomUUID,
        );
        // Replace generated content with a synthetic arithmetic fixture; no student payload.
        course.learner.session!.problems = course.learner.session!.problems.map(
          (problem) => ({
            ...problem,
            content: "1 + 1 = ?",
            answer: "2",
            solution: "1 + 1 = 2",
            figureSpec: null,
            answerChoices: null,
            interactive: null,
            input: { mode: "number", label: "답", placeholder: "", help: "" },
          }),
        );
        f.rows.set(f.studentId, {
          studentId: f.studentId,
          revision: 1,
          payload: { ...emptySrsState(), course },
        });
        const problems = stored().problems;
        const sessionId = stored().id;
        const first = {
          sessionId,
          problemId: problems[0].id,
          submittedAnswer: "3",
        };
        vi.setSystemTime(at(1));
        await read(await ATTEMPT(asking(`${coursePath}/attempts`, first)));
        const index = boundary === "retry" ? 4 : 0;
        if (boundary === "retry") {
          for (let i = 1; i <= 4; i++) {
            vi.setSystemTime(at(i + 1));
            await read(
              await ATTEMPT(
                asking(`${coursePath}/attempts`, {
                  sessionId,
                  problemId: problems[i].id,
                  submittedAnswer: i === 4 ? "3" : "2",
                }),
              ),
            );
          }
        }
        const ids = { sessionId, problemId: problems[index].id };
        vi.setSystemTime(at(11));
        await read(
          await FOLLOW_UP(
            asking(`${coursePath}/follow-up`, {
              ...ids,
              action: "answer",
              submittedAnswer: "2",
            }),
          ),
        );
        vi.setSystemTime(at(12));
        await read(
          await FOLLOW_UP(
            asking(`${coursePath}/follow-up`, { ...ids, action: "done" }),
          ),
        );
        const before = structuredClone(stored());
        vi.setSystemTime(at(-1440));
        writes.mockClear();
        const receipt = f.rows.get(f.studentId);
        await read(await ATTEMPT(asking(`${coursePath}/attempts`, first)));
        expect(f.rows.get(f.studentId)).toBe(receipt);
        expect(writes).not.toHaveBeenCalled();
        const next =
          boundary === "retry"
            ? {
                sessionId,
                problemId: problems[0].id,
                submittedAnswer: "2",
                retryIndex: 0,
              }
            : { sessionId, problemId: problems[1].id, submittedAnswer: "2" };
        await read(await ATTEMPT(asking(`${coursePath}/attempts`, next)));
        expect(writes).toHaveBeenCalledTimes(1);
        const session = stored(); // The persisted payload must pass the full stored parser.
        expect(
          (boundary === "retry"
            ? session.retry!.attempts
            : session.attempts
          ).at(-1)!.answeredAt,
        ).toBe(at(12).toISOString());
        expect(session.followUps).toEqual(before.followUps);
        expect(session.problems).toEqual(before.problems);
        expect(session.attempts.slice(0, before.attempts.length)).toEqual(
          before.attempts,
        );
        writes.mockClear();
        const saved = f.rows.get(f.studentId);
        await read(await ATTEMPT(asking(`${coursePath}/attempts`, next)));
        expect(f.rows.get(f.studentId)).toBe(saved);
        expect(writes).not.toHaveBeenCalled();
      } finally {
        writes.mockRestore();
        vi.useRealTimers();
      }
    },
  );

  it("records «모르겠어요» as an opened solution and «알겠어요» for a screen that asks", async () => {
    const { session } = await started();
    const p0 = session!.problems[0];
    const ids = { sessionId: session!.id, problemId: p0.id };
    const gave = await read(
      await ATTEMPT(
        asking(`${coursePath}/attempts`, {
          ...ids,
          submittedAnswer: "",
          giveUp: true,
        }),
      ),
    );
    expect(gave.session!.problems[0].followUp).toEqual({
      state: "solution",
      done: false,
    });
    expect(gave.session!.problems[0].hint).not.toBeNull();
    const done = await read(
      await FOLLOW_UP(
        asking(`${coursePath}/follow-up`, { ...ids, action: "done" }),
      ),
    );
    expect(done.session!.problems[0].followUp).toEqual({
      state: "solution",
      done: true,
    });
    expect(stored().followUps?.[0].doneAt).not.toBeNull();
  });

  it("keeps the old records and response for a screen that does not ask", async () => {
    const { session } = await started();
    const ids = { sessionId: session!.id, problemId: session!.problems[0].id };
    const gave = await read(
      await ATTEMPT(
        request(`${coursePath}/attempts`, "POST", {
          ...ids,
          submittedAnswer: "",
          giveUp: true,
        }),
      ),
    );
    expect("followUp" in gave.session!.problems[0]).toBe(false);
    expect(stored().followUps).toBeUndefined();
    expect(
      (
        await FOLLOW_UP(
          request(`${coursePath}/follow-up`, "POST", {
            ...ids,
            action: "done",
          }),
        )
      ).status,
    ).toBe(409);
  });

  it("takes a second answer right after a wrong one", async () => {
    let { session } = await started();
    let followed = false;
    for (const problem of stored().problems) {
      const ids = { sessionId: session!.id, problemId: problem.id };
      const wrong =
        problem.input.mode !== "self-check"
          ? problem.answerChoices?.find(
              (choice) => gradeCourseAnswer(problem, choice) === false,
            )
          : undefined;
      if (!wrong || followed) {
        session = (
          await read(
            await ATTEMPT(
              asking(`${coursePath}/attempts`, {
                ...ids,
                submittedAnswer:
                  problem.input.mode === "self-check" ? "" : problem.answer,
                ...(problem.input.mode === "self-check"
                  ? { selfCorrect: true }
                  : {}),
              }),
            ),
          )
        ).session;
        continue;
      }
      const missed = await read(
        await ATTEMPT(
          asking(`${coursePath}/attempts`, { ...ids, submittedAnswer: wrong }),
        ),
      );
      const view = missed.session!.problems.find((p) => p.id === problem.id)!;
      expect(view.followUp).toEqual({ state: "awaiting", done: false });
      expect(view.hint).toBeNull();
      const again = await read(
        await FOLLOW_UP(
          asking(`${coursePath}/follow-up`, {
            ...ids,
            action: "answer",
            submittedAnswer: problem.answer,
          }),
        ),
      );
      expect(
        again.session!.problems.find((p) => p.id === problem.id)!.followUp,
      ).toEqual({ state: "correct", done: false });
      expect(stored().followUps).toMatchObject([
        { problemId: problem.id, kind: "retry", correct: true },
      ]);
      // The first answer stays wrong.
      expect(
        stored().attempts.find((a) => a.problemId === problem.id)?.correct,
      ).toBe(false);
      followed = true;
      session = again.session;
    }
    expect(followed).toBe(true);
    expect(stored().completedAt).not.toBeNull();
    expect(stored().retry).toBeUndefined();
  });
});

describe("the class grade's default course plan (2026-10-19)", () => {
  afterEach(() => vi.useRealTimers());
  it("shows a 초5 student the 2nd-semester start without writing, and keeps the plan when practice starts", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-19T10:00:00.000Z"));
    f.grade = "초5";
    const read = courseStudentResponseSchema.parse(
      await (await GET(request())).json(),
    ).data;
    expect(read.summary.status).not.toBe("setup");
    expect(read.summary.currentSectionId).toBe("5-2-1-1");
    expect(f.rows.size).toBe(0);
    expect((await POST(request(coursePath, "POST", {}))).status).toBe(200);
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload);
    expect(stored.course?.plan?.startSectionId).toBe("5-2-1-1");
    expect(stored.course?.learner.session?.sectionId).toBe("5-2-1-1");
  });
});

describe("student course API", () => {
  it("requires an active student session, including account and withdrawal checks", async () => {
    f.session = null;
    expect((await GET(request())).status).toBe(401);
    teacher();
    expect((await GET(request())).status).toBe(401);
    f.session = {
      student: { studentId: f.studentId, mustChangePassword: true },
    };
    expect((await GET(request())).status).toBe(403);
    studentSession();
    f.disabled = true;
    expect((await GET(request())).status).toBe(401);
    f.disabled = false;
    f.withdrawn = true;
    expect((await GET(request())).status).toBe(401);
    expect(f.rows.size).toBe(0);
  });
  it("returns setup without writing; retired plan writes reject cross-origin and any body", async () => {
    const response = await GET(request());
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).data.summary.status).toBe("setup");
    expect(f.rows.size).toBe(0);
    expect(
      (
        await PLAN(
          request(`${coursePath}/plan`, "POST", plan, "https://evil.example"),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await PLAN(
          request(`${coursePath}/plan`, "POST", {
            ...plan,
            startSectionId: "unknown",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await PLAN(
          request(`${coursePath}/plan`, "POST", {
            ...plan,
            studentId: f.otherId,
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("stores real student IDs, grades on server, persists hints and conflicts on stale answers/plans", async () => {
    const state = await started();
    expect(f.rows.has(f.studentId)).toBe(true);
    const session = state.session!;
    expect(JSON.stringify(session)).not.toMatch(
      /"(?:seed|figureSpec|answer|solution)":/,
    );
    const input = { sessionId: session.id, problemId: session.problems[0].id };
    expect(
      (await HINT(request(`${coursePath}/hint`, "POST", input))).status,
    ).toBe(409);
    const stored = parseSrsState(f.rows.get(f.studentId)!.payload).course!;
    const answer = {
      ...input,
      submittedAnswer: stored.learner.session!.problems[0].answer,
    };
    const first = await ATTEMPT(
      request(`${coursePath}/attempts`, "POST", answer),
    );
    expect(first.status).toBe(200);
    const result = await first.json();
    expect(result.data.session.attempts[0]).toMatchObject({
      usedHint: false,
      correct: true,
    });
    expect(result.data.session.problems[0].hint).toBeNull();
    const revision = result.data.revision;
    const duplicate = await ATTEMPT(
      request(`${coursePath}/attempts`, "POST", answer),
    );
    expect((await duplicate.json()).data.revision).toBe(revision);
    const revealed = await HINT(request(`${coursePath}/hint`, "POST", input));
    expect(revealed.status).toBe(200);
    expect(
      (await revealed.json()).data.session.problems[0].hint,
    ).not.toBeNull();
    expect(
      (
        await ATTEMPT(
          request(`${coursePath}/attempts`, "POST", {
            ...answer,
            submittedAnswer: "99999",
          }),
        )
      ).status,
    ).toBe(409);
    teacher();
    const stale = await TEACHER_PLAN(
      request(teacherPath(), "POST", {
        ...plan,
        expectedRevision: state.revision,
      }),
      context(),
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("REVISION_MISMATCH");
  });
  it("renders only the authenticated student's stored opaque problem, without accepting seeds", async () => {
    const state = await started();
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload);
    const problem = saved.course!.learner.session!.problems[0];
    problem.figureSpec = { version: 2, shapes: [] };
    f.rows.get(f.studentId)!.payload = saved;
    const path = `${coursePath}/figure?sessionId=${state.session!.id}&problemId=${problem.id}`;
    const response = await FIGURE(request(path));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(f.render).toHaveBeenCalledWith(
      problem.figureSpec,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    f.session = {
      student: { studentId: f.otherId, mustChangePassword: false },
    };
    expect((await FIGURE(request(path))).status).toBe(404);
    expect((await FIGURE(request(`${path}&seed=71`))).status).toBe(400);
  });
  it("uses 503 for missing or malformed storage without resetting it", async () => {
    f.missing = true;
    expect((await GET(request())).status).toBe(503);
    f.missing = false;
    f.rows.set(f.studentId, {
      studentId: f.studentId,
      revision: 1,
      payload: { version: 1, course: "damaged" },
    });
    expect((await GET(request())).status).toBe(503);
    expect((await POST(request(coursePath, "POST", {}))).status).toBe(503);
    expect(f.rows.get(f.studentId)!.revision).toBe(1);
  });
});

describe("teacher course roster, plans and detail", () => {
  it("records only changed plan fields after each successful teacher save", async () => {
    teacher();
    const first = await TEACHER_PLAN(
      request(teacherPath(), "POST", plan),
      context(),
    );
    expect(first.status).toBe(200);
    expect(f.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        actorId: f.ownerId,
        action: "math_srs.course_plan_changed",
        outcome: "success",
        details: {
          studentId: f.studentId,
          revision: 1,
          beforeStartSectionId: null,
          afterStartSectionId: plan.startSectionId,
          beforeDailyQuestionCount: null,
          afterDailyQuestionCount: 10,
          beforeEnabled: null,
          afterEnabled: true,
        },
      },
    });
    f.audit.mockClear();
    const changed = await TEACHER_PLAN(
      request(teacherPath(), "POST", {
        ...plan,
        expectedRevision: 1,
        dailyQuestionCount: 15,
        enabled: false,
      }),
      context(),
    );
    expect(changed.status).toBe(200);
    expect(f.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        actorId: f.ownerId,
        action: "math_srs.course_plan_changed",
        outcome: "success",
        details: {
          studentId: f.studentId,
          revision: 2,
          beforeDailyQuestionCount: 10,
          afterDailyQuestionCount: 15,
          beforeEnabled: true,
          afterEnabled: false,
        },
      },
    });
    f.audit.mockClear();
    const moved = await TEACHER_PLAN(
      request(teacherPath(), "POST", {
        ...plan,
        startSectionId: "3-1-1-2",
        expectedRevision: 2,
        dailyQuestionCount: 15,
        enabled: false,
      }),
      context(),
    );
    expect(moved.status).toBe(200);
    expect(f.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        actorId: f.ownerId,
        action: "math_srs.course_plan_changed",
        outcome: "success",
        details: {
          studentId: f.studentId,
          revision: 3,
          beforeStartSectionId: plan.startSectionId,
          afterStartSectionId: "3-1-1-2",
        },
      },
    });
  });

  it("does not audit unchanged settings or stale and foreign writes", async () => {
    teacher();
    await TEACHER_PLAN(request(teacherPath(), "POST", plan), context());
    f.audit.mockClear();
    const before = structuredClone(f.rows.get(f.studentId));
    const unchanged = await TEACHER_PLAN(
      request(teacherPath(), "POST", {
        ...plan,
        expectedRevision: 1,
      }),
      context(),
    );
    expect(unchanged.status).toBe(200);
    expect(f.rows.get(f.studentId)).toEqual(before);
    expect(f.audit).not.toHaveBeenCalled();
    const stale = await TEACHER_PLAN(
      request(teacherPath(), "POST", plan),
      context(),
    );
    expect(stale.status).toBe(409);
    expect((await stale.json()).error.code).toBe("REVISION_MISMATCH");
    teacher({ id: f.otherId });
    expect(
      (
        await TEACHER_PLAN(
          request(teacherPath(), "POST", {
            ...plan,
            expectedRevision: 1,
            enabled: false,
          }),
          context(),
        )
      ).status,
    ).toBe(403);
    expect(f.rows.get(f.studentId)).toEqual(before);
    expect(f.audit).not.toHaveBeenCalled();
  });

  it("keeps mission guards distinct from revisions and does not audit refused changes", async () => {
    const state = await started();
    expect(f.audit).toHaveBeenCalledTimes(1); // The teacher configured the fixture plan.
    f.audit.mockClear();
    teacher();
    const response = await TEACHER_PLAN(
      request(teacherPath(), "POST", {
        ...plan,
        expectedRevision: state.revision,
        startSectionId: "3-1-1-2",
      }),
      context(),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toEqual({
      code: "CONFLICT",
      message: "진행 중인 학습을 마친 뒤 시작 소단원을 바꿔 주세요.",
    });
    expect(f.audit).not.toHaveBeenCalled();
  });

  it("audits only the winning concurrent plan write", async () => {
    teacher();
    const responses = await Promise.all([
      TEACHER_PLAN(request(teacherPath(), "POST", plan), context()),
      TEACHER_PLAN(
        request(teacherPath(), "POST", { ...plan, dailyQuestionCount: 15 }),
        context(),
      ),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(f.audit).toHaveBeenCalledTimes(1);
    const saved = parseSrsState(f.rows.get(f.studentId)!.payload).course!.plan!;
    expect(f.audit.mock.calls[0]).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          details: expect.objectContaining({
            afterDailyQuestionCount: saved.dailyQuestionCount,
          }),
        }),
      }),
    ]);
  });

  it("preserves a successful plan save when the audit store fails", async () => {
    teacher();
    f.audit.mockRejectedValueOnce(new Error("audit unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await TEACHER_PLAN(
        request(teacherPath(), "POST", plan),
        context(),
      );
      expect(response.status).toBe(200);
      expect(f.rows.get(f.studentId)?.revision).toBe(1);
      expect(f.audit).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith("Unable to record account activity.");
    } finally {
      error.mockRestore();
    }
  });

  it("enforces approval, SRS menu, and role gates", async () => {
    f.session = null;
    expect((await ROSTER(request("/api/math-srs/course"))).status).toBe(401);
    for (const changes of [
      { approvalStatus: "pending" },
      { menus: ["teaching"] },
      { role: "reviewer" },
    ]) {
      teacher(changes);
      expect((await ROSTER(request("/api/math-srs/course"))).status).toBe(403);
      expect(
        (await TEACHER_PLAN(request(teacherPath(), "POST", plan), context()))
          .status,
      ).toBe(403);
    }
  });
  it("uses ownedStudentsWhere, excludes withdrawn students and respects administrator ownership", async () => {
    teacher();
    let response = await ROSTER(request("/api/math-srs/course"));
    expect(
      courseDashboardResponseSchema.parse(await response.json()).data.students,
    ).toHaveLength(2);
    expect(db.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eywaWithdrawnAt: null,
          OR: expect.arrayContaining([
            expect.objectContaining({
              eywaBindingId: null,
              classId: { in: [f.classId] },
            }),
          ]),
        }),
      }),
    );
    teacher({ id: f.otherId });
    response = await ROSTER(request("/api/math-srs/course"));
    expect((await response.json()).data.students).toHaveLength(0);
    expect(
      (await TEACHER_PLAN(request(teacherPath(), "POST", plan), context()))
        .status,
    ).toBe(403);
    teacher({
      id: f.otherId,
      isAdmin: true,
      isSuperAdmin: true,
      menus: ["srs"],
    });
    response = await TEACHER_PLAN(
      request(teacherPath(), "POST", plan),
      context(),
    );
    expect(response.status).toBe(200);
    expect(
      courseRosterStudentResponseSchema.safeParse(await response.json())
        .success,
    ).toBe(true);
    f.withdrawn = true;
    expect(
      (await (await ROSTER(request("/api/math-srs/course"))).json()).data
        .students,
    ).toHaveLength(0);
    expect((await DETAIL(request(teacherPath()), context())).status).toBe(404);
  });
  it("returns detailed partial-session evidence and rejects foreign or unknown detail requests", async () => {
    const state = await started();
    await ATTEMPT(
      request(`${coursePath}/attempts`, "POST", {
        sessionId: state.session!.id,
        problemId: state.session!.problems[0].id,
        submittedAnswer: "",
        giveUp: true,
      }),
    );
    teacher();
    const detail = await DETAIL(request(teacherPath()), context());
    expect(detail.status).toBe(200);
    const data = courseStudentDetailResponseSchema.parse(
      await detail.json(),
    ).data;
    expect(data.activity[0]).toMatchObject({
      answered: 1,
      correct: 0,
      unaidedCorrect: 0,
    });
    expect(data.sections[0]).toMatchObject({
      attempts: 1,
      completedSessions: 0,
    });
    expect(data.recentSessions[0].answered).toBe(1);
    expect(data.recentAttempts).toHaveLength(1);
    expect(data.recentAttempts[0].answer).toBeTruthy();
    expect(data.recentAttempts[0].solution).toBeTruthy();
    teacher({ id: f.otherId });
    expect((await DETAIL(request(teacherPath()), context())).status).toBe(403);
    expect(
      (await DETAIL(request(teacherPath()), context(randomUUID()))).status,
    ).toBe(404);
  });
  it("same-origin protects teacher writes and storage failures remain 503", async () => {
    teacher();
    expect(
      (
        await TEACHER_PLAN(
          request(teacherPath(), "POST", plan, "https://evil.example"),
          context(),
        )
      ).status,
    ).toBe(403);
    f.missing = true;
    expect((await ROSTER(request("/api/math-srs/course"))).status).toBe(503);
    expect(
      (await TEACHER_PLAN(request(teacherPath(), "POST", plan), context()))
        .status,
    ).toBe(503);
  });
});

describe("relearn flag for the preview card (consensus 2026-10-20)", () => {
  const reading = (relearn: boolean) =>
    new Request(`${base}${coursePath}`, {
      headers: relearn ? { "x-course-relearn": "1" } : {},
    });
  const read = async (response: Response) => {
    expect(response.status).toBe(200);
    return courseStudentResponseSchema.parse(await response.json()).data;
  };

  it("tells only a screen that asks that this lesson's section was finished before", async () => {
    const { session } = await started();
    expect(session!.mode).toBe("learn");
    expect((await read(await GET(reading(true)))).session).not.toHaveProperty(
      "relearn",
    );
    // A poor first lesson, the next day's review, then the same section again.
    const day = Date.parse("2026-09-22T16:00:00.000Z");
    const at = (n: number) => new Date(day + n * 86_400_000);
    const finish = (state: StoredCourse, when: Date, wrong: boolean) => {
      while (!state.learner.session!.completedAt) {
        const s = state.learner.session!;
        const p = s.problems[s.attempts.length];
        let input: CourseAttemptInput = {
          sessionId: s.id,
          problemId: p.id,
          submittedAnswer: p.answer,
        };
        if (wrong) input = { ...input, submittedAnswer: "", giveUp: true };
        else if (p.input.mode === "self-check") {
          state = revealCourseHint(state, input);
          input = { ...input, selfCorrect: true };
        }
        state = submitCourseAttempt(state, input, when);
      }
      while (
        state.learner.session!.retry &&
        !state.learner.session!.retry.completedAt
      ) {
        const s = state.learner.session!;
        const p = s.problems.find(
          (x) => x.id === s.retry!.pendingProblemIds[0],
        )!;
        const input: CourseAttemptInput = {
          sessionId: s.id,
          problemId: p.id,
          submittedAnswer: wrong ? "" : p.answer,
          retryIndex: s.retry!.attempts.length,
          ...(wrong
            ? { giveUp: true }
            : p.input.mode === "self-check"
              ? { selfCorrect: true }
              : {}),
        };
        if (!wrong && p.input.mode === "self-check")
          state = revealCourseHint(state, input);
        state = submitCourseAttempt(state, input, when);
      }
      return state;
    };
    const start = (state: StoredCourse, when: Date, seed: number) =>
      startAutomaticCourse(state, when, seed, randomUUID);
    const planned = setCoursePlan(
      emptyCourseState(),
      { ...plan, dailyQuestionCount: 10 },
      at(0),
    );
    const poor = finish(start(planned, at(0), 71), at(0), true);
    const reviewed = finish(start(poor, at(1), 99), at(1), false);
    const again = start(reviewed, at(1), 123);
    expect(again.learner.session!.mode).toBe("learn");
    const row = f.rows.get(f.studentId)!;
    f.rows.set(f.studentId, {
      ...row,
      payload: { ...(row.payload as object), course: again },
    });
    expect((await read(await GET(reading(true)))).session!.relearn).toBe(true);
    expect((await read(await GET(reading(false)))).session).not.toHaveProperty(
      "relearn",
    );
  });
});
