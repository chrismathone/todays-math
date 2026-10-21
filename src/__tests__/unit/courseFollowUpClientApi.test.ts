import { afterEach, describe, expect, it, vi } from "vitest";
import * as api from "@/components/math-srs/courseApi";
import {
  COURSE_FOLLOW_UP_HEADER,
  COURSE_RELEARN_HEADER,
  type CourseFollowUpInput,
} from "@/contracts/mathSrsCourse.contract";

afterEach(() => vi.unstubAllGlobals());

const ids = {
  sessionId: "44444444-4444-4444-8444-444444444444",
  problemId: "55555555-5555-4555-8555-555555555555",
};
const plan = {
  expectedRevision: 0,
  startSectionId: "3-1-1-1",
  dailyQuestionCount: 10 as const,
  enabled: true,
};
const state = {
  student: {
    id: ids.problemId,
    name: "Student",
    classId: ids.sessionId,
    className: "Class",
  },
  revision: 1,
  plan: null,
  session: null,
  summary: {
    status: "setup",
    currentSectionId: null,
    dueCount: 0,
    todayAnswered: 0,
    todayCorrect: 0,
    todayGoal: 10,
    completedSections: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    recommendation: null,
  },
};
function stubFetch(payload: unknown = { data: state }, status = 200) {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => Response.json(payload, { status }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("course follow-up client requests", () => {
  it("opts every student request into follow-ups and preserves JSON writes", async () => {
    const fetcher = stubFetch();
    await api.getCourseState();
    await api.startCourse();
    await api.answerCourse({ ...ids, submittedAnswer: "2" });
    await api.hintCourse(ids);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/learn/math-srs/course",
      "/api/learn/math-srs/course",
      "/api/learn/math-srs/course/attempts",
      "/api/learn/math-srs/course/hint",
    ]);
    for (const [, options] of fetcher.mock.calls) {
      expect(options.headers[COURSE_FOLLOW_UP_HEADER]).toBe("1");
      // Consensus 2026-10-20: these screens also understand the relearn flag.
      expect(options.headers[COURSE_RELEARN_HEADER]).toBe("1");
      expect(options.cache).toBe("no-store");
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
    expect(fetcher.mock.calls[0][1].method).toBeUndefined();
    for (const [, options] of fetcher.mock.calls.slice(1)) {
      expect(options.method).toBe("POST");
      expect(options.headers["content-type"]).toBe("application/json");
    }
  });

  it.each<CourseFollowUpInput>([
    { ...ids, action: "answer", submittedAnswer: "2" },
    { ...ids, action: "answer", giveUp: true },
    { ...ids, action: "done" },
  ])("posts $action and parses the existing student state", async (input) => {
    const fetcher = stubFetch();
    expect(await api.followUpCourse(input)).toEqual({ ok: true, data: state });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/learn/math-srs/course/follow-up",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          [COURSE_FOLLOW_UP_HEADER]: "1",
          [COURSE_RELEARN_HEADER]: "1",
        },
        body: JSON.stringify(input),
      }),
    );
  });

  it("rejects malformed follow-up responses and preserves conflicts", async () => {
    stubFetch({ data: { revision: 1 } });
    expect(await api.followUpCourse({ ...ids, action: "done" })).toMatchObject({
      ok: false,
      status: 200,
    });
    stubFetch({ error: { code: "CONFLICT", message: "Reload" } }, 409);
    expect(await api.followUpCourse({ ...ids, action: "done" })).toEqual({
      ok: false,
      status: 409,
      code: "CONFLICT",
      message: "Reload",
    });
  });

  it("preserves teacher GET and POST headers and scoped URLs", async () => {
    const fetcher = stubFetch({ error: { message: "Unavailable" } }, 403);
    await api.getCourseDashboard("branch/id");
    await api.getCourseStudentDetail("a/b", "class", "branch");
    await api.saveCourseStudentPlan("a/b", plan, "class", "branch");
    await api.getExplorerTeacherSettings("a/b", "class", "branch");
    await api.saveExplorerTeacherSettings(
      "a/b",
      "class",
      { expectedRevision: 0, courseGrade: 5, goalUnitId: "5-1-1" },
      "branch",
    );
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/math-srs/course?branchId=branch%2Fid",
      "/api/students/a%2Fb/math-srs/course?classId=class&branchId=branch",
      "/api/students/a%2Fb/math-srs/course?classId=class&branchId=branch",
      "/api/admin/students/a%2Fb/explorer-settings?classId=class&branchId=branch",
      "/api/admin/students/a%2Fb/explorer-settings?classId=class&branchId=branch",
    ]);
    for (const index of [0, 1, 3])
      expect(fetcher.mock.calls[index][1].headers).toBeUndefined();
    for (const index of [2, 4])
      expect(fetcher.mock.calls[index][1].headers).toEqual({
        "content-type": "application/json",
      });
  });
});
