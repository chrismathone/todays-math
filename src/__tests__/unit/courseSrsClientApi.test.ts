import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCourseDashboard,
  getCourseState,
  getCourseStudentDetail,
  saveCourseStudentPlan,
} from "@/components/math-srs/courseApi";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("account-backed SRS client boundary", () => {
  it.each(["REVISION_MISMATCH", "CONFLICT"])(
    "preserves the %s error code for teacher plan saves",
    async (code) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json(
            {
              error: {
                code,
                message: "진행 중인 학습을 마친 뒤 시작 소단원을 바꿔 주세요.",
              },
            },
            { status: 409 },
          ),
        ),
      );
      expect(
        await saveCourseStudentPlan("student", {
          expectedRevision: 3,
          startSectionId: "3-1-1-1",
          dailyQuestionCount: 10,
          enabled: true,
        }),
      ).toEqual({
        ok: false,
        status: 409,
        code,
        message: "진행 중인 학습을 마친 뒤 시작 소단원을 바꿔 주세요.",
      });
    },
  );
  it("validates successful responses instead of accepting corrupt reports", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ data: { classes: [], students: [{ id: "bad" }] } }),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await getCourseDashboard()).toMatchObject({
      ok: false,
      status: 200,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/math-srs/course",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it.each([401, 403, 503])(
    "retains HTTP %i when a gateway returns HTML",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(new Response("<h1>Unavailable</h1>", { status })),
      );
      expect(await getCourseState()).toMatchObject({ ok: false, status });
    },
  );
  it("posts revision-guarded teacher settings and preserves conflict guidance", async () => {
    const input = {
      expectedRevision: 3,
      startSectionId: "3-1-1-1",
      dailyQuestionCount: 10 as const,
      enabled: true,
    };
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { message: "최신 진도를 다시 불러와 주세요." } },
          { status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await saveCourseStudentPlan("student", input)).toEqual({
      ok: false,
      status: 409,
      message: "최신 진도를 다시 불러와 주세요.",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/students/student/math-srs/course",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });
  it("bounds a stalled request so the screen can offer a retry", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    const request = getCourseState();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await request).toMatchObject({
      ok: false,
      status: 0,
      message: expect.stringContaining("응답이 늦어지고"),
    });
  });
  it("keeps student identifiers in one URL segment", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: { message: "없음" } }, { status: 404 }),
      );
    vi.stubGlobal("fetch", fetcher);
    await getCourseStudentDetail("a/b");
    expect(fetcher.mock.calls[0][0]).toBe(
      "/api/students/a%2Fb/math-srs/course",
    );
  });
});
