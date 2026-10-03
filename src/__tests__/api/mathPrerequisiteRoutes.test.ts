// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StateRow = { studentId: string; revision: number; payload: unknown };
const f = vi.hoisted(() => ({
  a: "a0000000-0000-4000-8000-000000000001",
  b: "b0000000-0000-4000-8000-000000000002",
  foreign: "c0000000-0000-4000-8000-000000000003",
  owner: "d0000000-0000-4000-8000-000000000004",
  foreignOwner: "e0000000-0000-4000-8000-000000000005",
  classId: "f0000000-0000-4000-8000-000000000006",
  session: null as unknown,
  rows: new Map<string, StateRow>(),
  writes: [] as { studentId: string; revision: number; payload: unknown }[],
  casFailures: 0,
  disabled: new Set<string>(),
  withdrawn: new Set<string>(),
  supply: "normal" as "normal" | "checks-collide" | "all-collide",
  generated: [] as { sectionId: string; seed: number; bankSize: number }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: async () => null,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => f.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
vi.mock("@/lib/math-srs/elementary/generator", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/lib/math-srs/elementary/generator")
    >();
  return {
    ...original,
    generateCourseSession: (
      ...args: Parameters<typeof original.generateCourseSession>
    ) => {
      const [sectionId, seed, , , bank = []] = args;
      f.generated.push({ sectionId, seed, bankSize: bank.length });
      const session = original.generateCourseSession(...args);
      // Only the external generator dependency is faulted: policy, supply
      // validation, DTOs, handlers, guards and persistence remain real.
      const collide =
        f.supply === "all-collide" ||
        (f.supply === "checks-collide" &&
          ["5-1-5-4", "5-1-5-3"].includes(sectionId));
      return collide
        ? {
            ...session,
            problems: session.problems.map((problem) => ({
              ...problem,
              content: session.problems[0].content,
            })),
          }
        : session;
    },
  };
});
vi.mock("@/lib/db", () => {
  const student = (id: string) => ({
    id,
    name: id === f.a ? "학생 A" : id === f.b ? "학생 B" : "다른 반 학생",
    classId: id === f.foreign ? f.foreign : f.classId,
    eywaBindingId: null,
    enrollments: [],
    eywaWithdrawnAt: f.withdrawn.has(id) ? new Date() : null,
    class: {
      id: f.classId,
      name: "초5",
      userId: id === f.foreign ? f.foreignOwner : f.owner,
    },
    studentAccount: {
      id,
      disabledAt: f.disabled.has(id) ? new Date() : null,
    },
  });
  return {
    db: {
      // An empty bank forces the existing local engines; no DB/AI service.
      unit: { findFirst: vi.fn(async () => null) },
      problem: { findMany: vi.fn(async () => []) },
      student: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          [f.a, f.b, f.foreign].includes(where.id) ? student(where.id) : null,
        ),
        findMany: vi.fn(
          async ({
            where,
          }: {
            where: {
              class?: { userId?: string };
              OR?: { classId?: { in: string[] } }[];
            };
          }) =>
            [f.a, f.b, f.foreign]
              .map(student)
              .filter(
                (row) =>
                  !row.eywaWithdrawnAt &&
                  (!where.OR?.[0]?.classId ||
                    where.OR[0].classId.in.includes(row.classId)) &&
                  (!where.class?.userId ||
                    row.class.userId === where.class.userId),
              ),
        ),
      },
      class: {
        findMany: vi.fn(async () => [{ id: f.classId, name: "초5" }]),
      },
      studentSrsState: {
        findUnique: async ({ where }: { where: { studentId: string } }) =>
          structuredClone(f.rows.get(where.studentId) ?? null),
        findMany: async ({
          where,
        }: {
          where: { studentId: { in: string[] } };
        }) =>
          where.studentId.in.flatMap((id) =>
            f.rows.has(id) ? [structuredClone(f.rows.get(id)!)] : [],
          ),
        create: async ({ data }: { data: StateRow }) => {
          if (f.rows.has(data.studentId)) throw { code: "P2002" };
          f.writes.push(structuredClone(data));
          f.rows.set(data.studentId, structuredClone(data));
          return data;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { studentId: string; revision: number };
          data: { payload: unknown; revision: { increment: number } };
        }) => {
          f.writes.push({ ...where, payload: structuredClone(data.payload) });
          const row = f.rows.get(where.studentId);
          if (!row || row.revision !== where.revision) return { count: 0 };
          if (f.casFailures > 0) {
            f.casFailures -= 1;
            // A second tab wins an unrelated revision update. The retry
            // must use the new snapshot without changing request-owned IDs.
            f.rows.set(where.studentId, { ...row, revision: row.revision + 1 });
            return { count: 0 };
          }
          f.rows.set(where.studentId, {
            ...row,
            revision: row.revision + data.revision.increment,
            payload: structuredClone(data.payload),
          });
          return { count: 1 };
        },
      },
    },
  };
});

// Exercise Next's actual exported handlers, never a replacement route/DTO.
import { GET, POST } from "@/app/api/learn/math-srs/course/route";
import { POST as ATTEMPT } from "@/app/api/learn/math-srs/course/attempts/route";
import { POST as HINT } from "@/app/api/learn/math-srs/course/hint/route";
import { GET as ROSTER } from "@/app/api/math-srs/course/route";
import { GET as DETAIL } from "@/app/api/students/[id]/math-srs/course/route";
import {
  courseDashboardResponseSchema,
  courseStudentDetailResponseSchema,
  courseStudentResponseSchema,
  type CourseAttemptInput,
} from "@/contracts/mathSrsCourse.contract";
import { db } from "@/lib/db";
import {
  emptyCourseState,
  setCoursePlan,
  startRecommendedCourse,
  storedCourseSchema,
  submitCourseAttempt,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import { gradeCourseAnswer } from "@/lib/math-srs/elementary/answers";
import {
  emptySrsState,
  parseSrsState,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  exposedContents,
  normalizeContent,
} from "@/lib/math-prerequisite/evidence";
import { prerequisiteStep } from "@/lib/math-prerequisite/policy";
import { supplySafeSession } from "@/lib/math-prerequisite/supply";
import { bindExpedition } from "@/lib/math-explorers/expedition";

const base = "http://localhost:3000";
const coursePath = "/api/learn/math-srs/course";
const target = "5-2-2-1";
const check = "5-1-5-4";
const now = new Date("2026-10-03T03:00:00.000Z");
const day = 86_400_000;
let sequence = 0;
const fixtureId = () =>
  `10000000-0000-4000-8000-${(++sequence).toString().padStart(12, "0")}`;
const ago = (days: number) => new Date(now.getTime() - days * day);
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
const asStudent = (studentId = f.a) => {
  f.session = { student: { studentId, mustChangePassword: false } };
};
const asTeacher = (id = f.owner) => {
  f.session = {
    user: {
      id,
      role: "director",
      isAdmin: false,
      approvalStatus: "approved",
      menus: ["srs"],
    },
  };
};
const seedRow = (course: StoredCourse, studentId = f.a, revision = 10) => {
  const payload = parseSrsState({ ...emptySrsState(), course });
  f.rows.set(studentId, { studentId, revision, payload });
};
const state = (studentId = f.a) =>
  parseSrsState(f.rows.get(studentId)!.payload);
const savedCourse = (studentId = f.a) => state(studentId).course!;

function planned(goal: 5 | 10 | 15 | 20 = 10): StoredCourse {
  return setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: target,
      dailyQuestionCount: goal,
      enabled: true,
      expectedRevision: 0,
    },
    ago(7),
  );
}

/** Build source history through real transitions and safe, distinct content. */
function fixtureSession(
  course: StoredCourse,
  sectionId: string,
  mode: "learn" | "review",
  at: Date,
  key: string,
): StoredCourse {
  const supply = supplySafeSession({
    sectionId,
    mode,
    now: at,
    key,
    avoid: exposedContents(course),
  });
  if (!supply.ok) throw new Error(`Fixture supply exhausted: ${sectionId}`);
  return startRecommendedCourse(
    course,
    { sectionId, mode, reason: "Independent handler test fixture" },
    at,
    supply.seed,
    fixtureId,
    [],
    { ...supply, sectionId, mode },
  );
}

function answerInput(course: StoredCourse, wrong = false): CourseAttemptInput {
  const session = course.learner.session!;
  const retry =
    session.completedAt && session.retry && !session.retry.completedAt;
  const problem = retry
    ? session.problems.find(
        (p) => p.id === session.retry!.pendingProblemIds[0],
      )!
    : session.problems[session.attempts.length];
  return {
    sessionId: session.id,
    problemId: problem.id,
    submittedAnswer: wrong
      ? problem.answerChoices!.find(
          (choice) => gradeCourseAnswer(problem, choice) === false,
        )!
      : problem.answer,
    ...(retry ? { retryIndex: session.retry!.attempts.length } : {}),
  };
}

function finishFixture(
  course: StoredCourse,
  at: Date,
  wrong = 2,
): StoredCourse {
  while (!course.learner.session!.completedAt) {
    course = submitCourseAttempt(
      course,
      answerInput(course, course.learner.session!.attempts.length < wrong),
      at,
    );
  }
  while (
    course.learner.session!.retry &&
    !course.learner.session!.retry!.completedAt
  ) {
    course = submitCourseAttempt(course, answerInput(course), at);
  }
  return storedCourseSchema.parse(course);
}

function failedTwice(goal: 5 | 10 | 15 | 20 = 10): StoredCourse {
  let course = planned(goal);
  for (const [index, mode] of (["learn", "review"] as const).entries()) {
    const at = ago(index === 0 ? 5 : 2);
    course = fixtureSession(course, target, mode, at, `api-failure-${index}`);
    course = finishFixture(course, at);
  }
  return course;
}

function bindCheckMission(course: StoredCourse): StoredSrsState {
  const previous = parseSrsState({ ...emptySrsState(), course });
  const decision = prerequisiteStep(course, now, true, {
    answered: 0,
    goal: 10,
  });
  if (!decision?.session) throw new Error("Expected a supplied check fixture");
  const source = {
    ...previous,
    course: startRecommendedCourse(
      course,
      { sectionId: check, mode: "review", reason: decision.reason },
      now,
      decision.session.seed,
      fixtureId,
      [],
      decision.session,
    ),
  };
  return parseSrsState(
    bindExpedition(
      previous,
      source,
      {
        kind: "elementary",
        route: "bank",
        unitId: "g5-fractions",
        title: "분수",
        subtitle: "Independent handler fixture",
        goal: 10,
      },
      now,
      fixtureId(),
      fixtureId(),
    ),
  );
}

async function studentData(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  return courseStudentResponseSchema.parse(await response.json()).data;
}
async function detailData(studentId = f.a) {
  asTeacher();
  const response = await DETAIL(
    request(`/api/students/${studentId}/math-srs/course`),
    { params: Promise.resolve({ id: studentId }) },
  );
  expect(response.status).toBe(200);
  return courseStudentDetailResponseSchema.parse(await response.json()).data;
}
async function firstPassThroughRoute(wrong = 2, giveUp = false) {
  while (!savedCourse().learner.session!.completedAt) {
    const course = savedCourse();
    const input = answerInput(
      course,
      course.learner.session!.attempts.length < wrong,
    );
    const body = giveUp
      ? { ...input, submittedAnswer: "", giveUp: true }
      : input;
    await studentData(
      await ATTEMPT(request(`${coursePath}/attempts`, "POST", body)),
    );
  }
}
async function retryThroughRoute() {
  while (
    savedCourse().learner.session!.retry &&
    !savedCourse().learner.session!.retry!.completedAt
  ) {
    await studentData(
      await ATTEMPT(
        request(`${coursePath}/attempts`, "POST", answerInput(savedCourse())),
      ),
    );
  }
}

beforeEach(() => {
  sequence = 0;
  f.rows.clear();
  f.writes.length = 0;
  f.casFailures = 0;
  f.disabled.clear();
  f.withdrawn.clear();
  f.supply = "normal";
  f.generated.length = 0;
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.stubEnv("AUTH_URL", base);
  vi.stubEnv("MATH_PREREQ_CHECK", "on");
  asStudent();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("prerequisite pilot through actual course API handlers", () => {
  it.each([undefined, "off", "true"])(
    "retains ordinary due-target review and the old DTO when flag is %s",
    async (flag) => {
      seedRow(failedTwice());
      vi.stubEnv("MATH_PREREQ_CHECK", flag);
      const before = structuredClone(f.rows.get(f.a));
      f.generated.length = 0;
      const dto = await studentData(await GET(request()));
      expect(dto).not.toHaveProperty("prerequisiteContext");
      expect(dto.summary.recommendation).toMatchObject({
        sectionId: target,
        mode: "review",
      });
      expect(f.generated).toHaveLength(0);
      expect(f.rows.get(f.a)).toEqual(before);
      const detail = await detailData();
      expect(detail).not.toHaveProperty("prerequisite");
      asStudent();
      const started = await studentData(
        await POST(request(coursePath, "POST", {})),
      );
      expect(started.session).toMatchObject({
        sectionId: target,
        mode: "review",
      });
      expect(started).not.toHaveProperty("prerequisiteContext");
    },
  );

  it.each([5, 10, 15, 20] as const)(
    "issues the preflight check at a fresh daily goal of %i without bank calls or leaked answers",
    async (goal) => {
      seedRow(failedTwice(goal));
      const decision = prerequisiteStep(savedCourse(), now, true, {
        answered: 0,
        goal,
      });
      expect(decision?.kind).toBe("check");
      const before = structuredClone(f.rows.get(f.a));
      const dto = await studentData(await GET(request()));
      expect(dto.prerequisiteContext).toMatchObject({
        kind: "check",
        sectionId: check,
        targetSectionId: target,
        partial: true,
      });
      expect(dto.summary.recommendation).toMatchObject({
        sectionId: check,
        mode: "review",
      });
      expect(f.rows.get(f.a)).toEqual(before);
      const started = await studentData(
        await POST(request(coursePath, "POST", {})),
      );
      const stored = savedCourse().learner.session!;
      expect(started.session).toMatchObject({
        sectionId: check,
        mode: "review",
        completedAt: null,
      });
      expect(
        stored.problems.map(({ seed, content }) => ({ seed, content })),
      ).toEqual(
        decision!.session!.problems.map(({ seed, content }) => ({
          seed,
          content,
        })),
      );
      expect(started.session!.problems).toHaveLength(5);
      for (const problem of started.session!.problems) {
        expect(problem).not.toHaveProperty("answer");
        expect(problem).not.toHaveProperty("seed");
        expect(problem).not.toHaveProperty("solution");
        expect(problem.hint).toBeNull();
      }
      expect(db.unit.findFirst).not.toHaveBeenCalled();
      expect(db.problem.findMany).not.toHaveBeenCalled();
      expect(Object.keys(savedCourse())).not.toContain("prerequisiteContext");
      expect(parseSrsState(f.rows.get(f.a)!.payload)).toEqual(state());
    },
  );

  it("waits for a completed second first pass and retry, preserving its direct failure after successful retry", async () => {
    let course = finishFixture(
      fixtureSession(planned(), target, "learn", ago(5), "one-failure"),
      ago(5),
    );
    seedRow(course);
    expect(
      (await studentData(await GET(request()))).prerequisiteContext,
    ).toBeUndefined();
    course = fixtureSession(
      course,
      target,
      "review",
      ago(2),
      "second-first-pass",
    );
    seedRow(course);
    await firstPassThroughRoute();
    const first = structuredClone(savedCourse().learner.session!.attempts);
    const pending = await studentData(await GET(request()));
    expect(pending.summary.recommendation?.mode).toBe("resume");
    expect(pending.prerequisiteContext).toBeUndefined();
    await retryThroughRoute();
    const next = await studentData(await GET(request()));
    expect(next.summary.recommendation).toMatchObject({
      sectionId: check,
      mode: "review",
    });
    expect(savedCourse().learner.session!.attempts).toEqual(first);
    expect(
      savedCourse().learner.session!.retry!.attempts.every((a) => a.correct),
    ).toBe(true);
    const detail = await detailData();
    expect(
      detail.prerequisite!.sections.find((s) => s.sectionId === target),
    ).toMatchObject({
      outcome: "failed",
      independentIncorrect: 2,
      independentCorrect: 3,
      status: "not_passed_recent",
      sourceRetained: true,
      partial: true,
    });
  });

  it("does not turn an empty-answer give-up or an unfinished first pass into a second failure", async () => {
    let course = finishFixture(
      fixtureSession(planned(), target, "learn", ago(5), "before-giveup"),
      ago(5),
    );
    course = fixtureSession(course, target, "review", ago(2), "giveup-review");
    seedRow(course);
    await studentData(
      await ATTEMPT(
        request(`${coursePath}/attempts`, "POST", answerInput(course, true)),
      ),
    );
    expect(
      (await studentData(await GET(request()))).summary.recommendation?.mode,
    ).toBe("resume");
    await firstPassThroughRoute(0, true);
    await retryThroughRoute();
    expect(
      (await studentData(await GET(request()))).prerequisiteContext,
    ).toBeUndefined();
    const evidence = (await detailData()).prerequisite!.sections.find(
      (s) => s.sectionId === target,
    )!;
    expect(evidence).toMatchObject({
      outcome: "inconclusive",
      independentIncorrect: 1,
      independentCorrect: 0,
    });
  });

  it("keeps a first-pass duplicate idempotent, rejects its changed answer, and leaves post-answer solution reveal out of grading", async () => {
    seedRow(failedTwice());
    await studentData(await POST(request(coursePath, "POST", {})));
    const input = answerInput(savedCourse(), true);
    expect(
      (
        await HINT(
          request(`${coursePath}/hint`, "POST", {
            sessionId: input.sessionId,
            problemId: input.problemId,
          }),
        )
      ).status,
    ).toBe(409);
    const accepted = await studentData(
      await ATTEMPT(request(`${coursePath}/attempts`, "POST", input)),
    );
    const snapshot = structuredClone(f.rows.get(f.a));
    expect(
      (
        await studentData(
          await ATTEMPT(request(`${coursePath}/attempts`, "POST", input)),
        )
      ).revision,
    ).toBe(accepted.revision);
    expect(f.rows.get(f.a)).toEqual(snapshot);
    expect(
      (
        await ATTEMPT(
          request(`${coursePath}/attempts`, "POST", {
            ...input,
            submittedAnswer: savedCourse().learner.session!.problems[0].answer,
          }),
        )
      ).status,
    ).toBe(409);
    const hinted = await studentData(
      await HINT(
        request(`${coursePath}/hint`, "POST", {
          sessionId: input.sessionId,
          problemId: input.problemId,
        }),
      ),
    );
    expect(hinted.session!.problems[0].hint).not.toBeNull();
    await firstPassThroughRoute(2);
    await retryThroughRoute();
    const evidence = (await detailData()).prerequisite!.sections.find(
      (s) => s.sectionId === check,
    )!;
    expect(evidence).toMatchObject({
      outcome: "failed",
      independentIncorrect: 2,
      independentCorrect: 3,
    });
  });

  it("reuses session and problem IDs plus content/seeds across a genuine losing CAS and resumes on replay", async () => {
    seedRow(failedTwice());
    f.casFailures = 1;
    const started = await studentData(
      await POST(request(coursePath, "POST", {})),
    );
    expect(f.writes).toHaveLength(2);
    expect(f.writes.map((write) => write.revision)).toEqual([10, 11]);
    const first = parseSrsState(f.writes[0].payload).course!.learner.session!;
    const second = parseSrsState(f.writes[1].payload).course!.learner.session!;
    expect(second).toEqual(first);
    expect(started.session!.id).toBe(second.id);
    expect(started.revision).toBe(12);
    const beforeReplay = structuredClone(f.rows.get(f.a));
    const replay = await studentData(
      await POST(request(coursePath, "POST", {})),
    );
    expect(replay.session!.id).toBe(started.session!.id);
    expect(replay.revision).toBe(started.revision);
    expect(f.rows.get(f.a)).toEqual(beforeReplay);
    expect(f.writes).toHaveLength(2);
  });

  it("returns a failed check to fresh target learn before due review and suppresses check reassignment", async () => {
    let course = finishFixture(
      fixtureSession(
        planned(15),
        target,
        "learn",
        ago(5),
        "before-same-day-learn",
      ),
      ago(5),
    );
    course = finishFixture(
      fixtureSession(course, target, "learn", now, "same-day-learn"),
      now,
    );
    seedRow(course);
    await studentData(await POST(request(coursePath, "POST", {})));
    const checkedContents = new Set(
      savedCourse().learner.session!.problems.map((p) =>
        normalizeContent(p.content),
      ),
    );
    await firstPassThroughRoute();
    await retryThroughRoute();
    const returnDto = await studentData(await GET(request()));
    expect(returnDto.summary.todayAnswered).toBe(10);
    expect(returnDto.prerequisiteContext).toMatchObject({
      kind: "return",
      canStart: true,
      partial: true,
    });
    expect(returnDto.summary.recommendation).toMatchObject({
      sectionId: target,
      mode: "learn",
    });
    const exposed = exposedContents(savedCourse());
    const returned = await studentData(
      await POST(request(coursePath, "POST", {})),
    );
    expect(returned.session).toMatchObject({
      sectionId: target,
      mode: "learn",
      completedAt: null,
    });
    expect(returned.prerequisiteContext?.kind).toBe("return");
    for (const problem of returned.session!.problems) {
      expect(exposed.has(normalizeContent(problem.content))).toBe(false);
      expect(checkedContents.has(normalizeContent(problem.content))).toBe(
        false,
      );
    }
    await firstPassThroughRoute();
    await retryThroughRoute();
    vi.setSystemTime(new Date(now.getTime() + 2 * day));
    const afterCooldownObservation = await studentData(await GET(request()));
    // P1's cooldown does not confer mastery or suppress an eligible P2 on
    // a later day. It must prevent the ordinary due queue from reissuing P1.
    expect(afterCooldownObservation.summary.recommendation?.sectionId).toBe(
      "5-1-5-3",
    );
    const detail = await detailData();
    expect(detail.prerequisite!.heldSectionIds).toContain(check);
    expect(
      detail.prerequisite!.sections.find((s) => s.sectionId === check)!.outcome,
    ).toBe("failed");
    expect(detail.prerequisite!.holdReason).toContain("14일");
  });

  it("keeps retry replay idempotent and retry regrading forbidden without promoting a failed first pass", async () => {
    seedRow(failedTwice());
    await studentData(await POST(request(coursePath, "POST", {})));
    await firstPassThroughRoute();
    const input = answerInput(savedCourse());
    const graded = await studentData(
      await ATTEMPT(request(`${coursePath}/attempts`, "POST", input)),
    );
    const snapshot = structuredClone(f.rows.get(f.a));
    const replay = await studentData(
      await ATTEMPT(request(`${coursePath}/attempts`, "POST", input)),
    );
    expect(replay.revision).toBe(graded.revision);
    expect(f.rows.get(f.a)).toEqual(snapshot);
    const problem = savedCourse().learner.session!.problems.find(
      (p) => p.id === input.problemId,
    )!;
    const changed = {
      ...input,
      submittedAnswer: problem.answerChoices!.find(
        (choice) => gradeCourseAnswer(problem, choice) === false,
      )!,
    };
    expect(
      (await ATTEMPT(request(`${coursePath}/attempts`, "POST", changed)))
        .status,
    ).toBe(409);
    expect(f.rows.get(f.a)).toEqual(snapshot);
    await retryThroughRoute();
    const evidence = (await detailData()).prerequisite!.sections.find(
      (s) => s.sectionId === check,
    )!;
    expect(evidence).toMatchObject({
      outcome: "failed",
      independentIncorrect: 2,
      independentCorrect: 3,
    });
  });

  it("uses the open mission's ten slots through the real CAS guard when the course goal is five", async () => {
    const payload = bindCheckMission(failedTwice(5));
    f.rows.set(f.a, { studentId: f.a, revision: 10, payload });
    await firstPassThroughRoute();
    await retryThroughRoute();
    const checked = await studentData(await GET(request()));
    expect(checked.summary).toMatchObject({ todayAnswered: 5, todayGoal: 10 });
    expect(checked.summary.recommendation).toMatchObject({
      sectionId: target,
      mode: "learn",
    });
    const returned = await studentData(
      await POST(request(coursePath, "POST", {})),
    );
    expect(returned.session).toMatchObject({
      sectionId: target,
      mode: "learn",
    });
    expect(state().expedition!.mission!.sourceSessionIds).toHaveLength(2);
    expect(state().expedition!.mission!.status).toBe("active");
    await firstPassThroughRoute();
    expect(
      (await studentData(await GET(request()))).summary.recommendation?.mode,
    ).toBe("resume");
    await retryThroughRoute();
    expect(state().expedition!.mission).toMatchObject({
      answered: 10,
      status: "complete",
      retryRemaining: 0,
    });
    const complete = await studentData(await GET(request()));
    expect(complete.summary.recommendation).toBeNull();
  });

  it("defers the target return after five check answers when the course daily goal is five", async () => {
    seedRow(failedTwice(5));
    await studentData(await POST(request(coursePath, "POST", {})));
    await firstPassThroughRoute(0);
    const deferred = await studentData(await GET(request()));
    expect(deferred.summary.todayAnswered).toBe(5);
    expect(deferred.summary.recommendation).toBeNull();
    expect(deferred.prerequisiteContext).toMatchObject({
      kind: "return",
      canStart: false,
    });
    const before = structuredClone(f.rows.get(f.a));
    await studentData(await POST(request(coursePath, "POST", {})));
    expect(f.rows.get(f.a)).toEqual(before);
    vi.setSystemTime(new Date(now.getTime() + day));
    const nextDay = await studentData(await GET(request()));
    expect(nextDay.summary.recommendation).toMatchObject({
      sectionId: target,
      mode: "learn",
    });
    expect(nextDay.prerequisiteContext?.canStart).toBe(true);
  });

  it("tries exactly twenty seeds per exhausted check, then starts only a safely fresh target fallback", async () => {
    seedRow(failedTwice());
    f.supply = "checks-collide";
    f.generated.length = 0;
    const dto = await studentData(await GET(request()));
    for (const sectionId of [check, "5-1-5-3"]) {
      const seeds = f.generated
        .filter((entry) => entry.sectionId === sectionId)
        .map((entry) => entry.seed);
      // DTO construction recomputes the authoritative decision; every pass
      // must be the same bounded list, never an unbounded/fresh UUID loop.
      expect(new Set(seeds).size).toBe(20);
      expect(seeds.length % 20).toBe(0);
    }
    expect(dto.prerequisiteContext).toMatchObject({
      kind: "unavailable",
      canStart: true,
      sectionId: target,
    });
    expect(dto.summary.recommendation?.sectionId).toBe(target);
    const avoid = exposedContents(savedCourse());
    const started = await studentData(
      await POST(request(coursePath, "POST", {})),
    );
    expect(started.session!.sectionId).toBe(target);
    expect(
      new Set(started.session!.problems.map((p) => normalizeContent(p.content)))
        .size,
    ).toBe(5);
    expect(
      started.session!.problems.every(
        (p) => !avoid.has(normalizeContent(p.content)),
      ),
    ).toBe(true);
    expect(db.unit.findFirst).not.toHaveBeenCalled();
  });

  it("reports unavailable without writing or falsely completing when checks and target both exhaust", async () => {
    seedRow(failedTwice());
    f.supply = "all-collide";
    const snapshot = structuredClone(f.rows.get(f.a));
    const read = await studentData(await GET(request()));
    expect(read.summary.status).toBe("ready");
    expect(read.summary.recommendation).toBeNull();
    expect(read.prerequisiteContext).toMatchObject({
      kind: "unavailable",
      canStart: false,
      sectionId: null,
    });
    expect(read.prerequisiteContext!.reason).toContain("새 문제");
    for (let replay = 0; replay < 2; replay++) {
      const result = await studentData(
        await POST(request(coursePath, "POST", {})),
      );
      // The existing completed session remains an honest historical result;
      // no new empty session, completion, award or revision is manufactured.
      expect(result.session!.id).toBe(read.session!.id);
      expect(result.summary.status).not.toBe("complete");
      expect(result.summary.status).not.toBe("done");
      expect(result.prerequisiteContext?.canStart).toBe(false);
      expect(f.rows.get(f.a)).toEqual(snapshot);
    }
    expect(f.writes).toHaveLength(0);
  });

  it("isolates two authorized students' reads, checks, attempts and teacher evidence", async () => {
    seedRow(failedTwice(), f.a);
    seedRow(planned(), f.b);
    seedRow(failedTwice(), f.foreign);
    const bBefore = structuredClone(f.rows.get(f.b));
    const a = await studentData(await GET(request()));
    expect(a.prerequisiteContext?.kind).toBe("check");
    await studentData(await POST(request(coursePath, "POST", {})));
    const aBefore = structuredClone(f.rows.get(f.a));
    const aInput = answerInput(savedCourse());
    asStudent(f.b);
    const b = await studentData(await GET(request()));
    expect(b.student.id).toBe(f.b);
    expect(b.session).toBeNull();
    expect(b.prerequisiteContext).toBeUndefined();
    expect(b.summary.recommendation).toMatchObject({
      sectionId: target,
      mode: "learn",
    });
    expect(
      (await ATTEMPT(request(`${coursePath}/attempts`, "POST", aInput))).status,
    ).toBe(409);
    expect(f.rows.get(f.a)).toEqual(aBefore);
    expect(f.rows.get(f.b)).toEqual(bBefore);
    const bStarted = await studentData(
      await POST(request(coursePath, "POST", {})),
    );
    expect(bStarted.session!.sectionId).toBe(target);
    expect(f.rows.get(f.a)).toEqual(aBefore);
    const aDetail = await detailData(f.a);
    const bDetail = await detailData(f.b);
    expect(aDetail.student.id).toBe(f.a);
    expect(
      aDetail.prerequisite!.sections.find((s) => s.sectionId === target)!
        .outcome,
    ).toBe("failed");
    expect(bDetail.student.id).toBe(f.b);
    expect(
      bDetail.prerequisite!.sections.every((s) => s.outcome === "unknown"),
    ).toBe(true);
    const roster = await ROSTER(request("/api/math-srs/course"));
    const rosterData = courseDashboardResponseSchema.parse(
      await roster.json(),
    ).data;
    expect(rosterData.students.map((s) => s.id)).toEqual([f.a, f.b]);
    const denied = await DETAIL(
      request(`/api/students/${f.foreign}/math-srs/course`),
      { params: Promise.resolve({ id: f.foreign }) },
    );
    expect(denied.status).toBe(403);
  });

  it("keeps student auth, account status, origin and strict no-student-input guards ahead of supply and writes", async () => {
    seedRow(failedTwice());
    f.generated.length = 0;
    const snapshot = structuredClone(f.rows.get(f.a));
    asTeacher();
    expect((await GET(request())).status).toBe(401);
    asStudent();
    f.session = { student: { studentId: f.a, mustChangePassword: true } };
    expect((await POST(request(coursePath, "POST", {}))).status).toBe(403);
    asStudent();
    f.disabled.add(f.a);
    expect((await GET(request())).status).toBe(401);
    f.disabled.clear();
    f.withdrawn.add(f.a);
    expect((await GET(request())).status).toBe(401);
    f.withdrawn.clear();
    expect(
      (await POST(request(coursePath, "POST", {}, "https://foreign.example")))
        .status,
    ).toBe(403);
    for (const body of [
      { studentId: f.b },
      { sectionId: check },
      { mastered: ["E56-N03"] },
      { prerequisiteContext: { kind: "check" } },
    ]) {
      expect((await POST(request(coursePath, "POST", body))).status).toBe(400);
    }
    expect(f.generated).toHaveLength(0);
    expect(f.writes).toHaveLength(0);
    expect(f.rows.get(f.a)).toEqual(snapshot);
  });
});
