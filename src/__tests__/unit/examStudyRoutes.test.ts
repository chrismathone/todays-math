import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studyCatalog, studyGeneration } from "./examStudyFixtures";
import type {
  ExamStudyDraft,
  ExamStudyGenerateOptions,
  ExamStudyGenerateRequest,
} from "@/contracts/examStudy.contract";

const fixture = vi.hoisted(() => ({
  session: null as unknown,
  generate: vi.fn(),
  catalog: vi.fn(),
  render: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  auth: (handler?: (request: unknown) => unknown) =>
    handler
      ? (request: NextRequest) =>
          handler(Object.assign(request, { auth: fixture.session }))
      : Promise.resolve(fixture.session),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  logRejectedResponse: vi.fn(
    (options: { response: Response }) => options.response,
  ),
}));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("Unexpected database access in exam study route test");
      },
    },
  ),
}));
vi.mock("@/lib/learn/studentLearningMenusStore", () => ({
  getStudentLearningMenus: vi.fn(async () => ({})),
}));
vi.mock("@/lib/examStudy", () => ({
  generateExamStudy: fixture.generate,
  getExamStudyCatalog: fixture.catalog,
}));
vi.mock("@/lib/figure/renderFigureSpec", () => ({
  renderFigureSpec: fixture.render,
}));

import {
  createExamStudy,
  examStudyCatalog,
  resolveExamStudy,
} from "@/lib/examStudyRoutes";
import { proxy } from "@/proxy";

const teacher = {
  id: "fixture-teacher",
  name: "검사 교사",
  email: "fixture@example.invalid",
  role: "director",
  approvalStatus: "approved",
  isAdmin: false,
  menus: ["bank"],
  branchRole: "teacher",
  branchId: "fixture-branch",
};
const recipe: ExamStudyGenerateRequest = {
  course: "중1",
  count: 1,
  seed: 2,
  format: "혼합",
  maxPerFamily: 1,
};
const request = (
  method: string,
  body?: unknown,
  path = "/api/exam/practice",
  origin = "http://localhost",
) =>
  new Request(`http://localhost${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    headers: { origin, "content-type": "application/json" },
  });

beforeEach(() => {
  fixture.session = { user: { ...teacher } };
  fixture.generate
    .mockReset()
    .mockImplementation(async (input: ExamStudyGenerateRequest) =>
      studyGeneration(input),
    );
  fixture.catalog.mockReset().mockReturnValue(studyCatalog);
  fixture.render.mockReset().mockResolvedValue({
    ok: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg"/>',
  });
});

describe("exam study authenticated route boundary", () => {
  it.each([
    [null, 401],
    [{ student: { id: "student", mustChangePassword: false } }, 401],
    [{ user: { ...teacher, role: "reviewer" } }, 403],
    [{ user: { ...teacher, menus: ["export"] } }, 403],
    [{ user: { ...teacher, menus: ["textbook"] } }, 403],
    [{ user: { ...teacher, menus: [], branchRole: "manager" } }, 403],
    [{ user: { ...teacher, approvalStatus: "pending" } }, 403],
  ])(
    "denies missing account, student, reviewer, menu cap and pending approval: %j",
    async (session, status) => {
      fixture.session = session;
      expect((await createExamStudy(request("POST", recipe))).status).toBe(
        status,
      );
      expect((await examStudyCatalog(request("GET"))).status).toBe(status);
      expect(fixture.generate).not.toHaveBeenCalled();
      expect(fixture.catalog).not.toHaveBeenCalled();
    },
  );

  it("authorizes an approved teacher and keeps generated questions private", async () => {
    const response = await createExamStudy(request("POST", recipe));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).data.questions).toHaveLength(1);
  });

  it("uses the same-origin mutation guard even when the menu is available", async () => {
    expect(
      (
        await createExamStudy(
          request("POST", recipe, undefined, "https://external.example"),
        )
      ).status,
    ).toBe(403);
    expect(fixture.generate).not.toHaveBeenCalled();
  });

  it.each([
    { ...recipe, content: "client original" },
    { ...recipe, count: 31 },
    { ...recipe, schoolName: "x".repeat(17_000) },
    '{"course":"중1","count":1,"count":2,"seed":2}',
  ])(
    "rejects original fields, unbounded bodies and duplicate JSON keys before generation",
    async (body) => {
      expect((await createExamStudy(request("POST", body))).status).toBe(400);
      expect(fixture.generate).not.toHaveBeenCalled();
    },
  );

  it("checks catalog query names, duplicate course and course vocabulary", async () => {
    for (const path of [
      "/api/exam/practice?original=1",
      "/api/exam/practice?course=중1&course=중2",
      "/api/exam/practice?course=unknown",
    ])
      expect(
        (await examStudyCatalog(request("GET", undefined, path))).status,
      ).toBe(400);
    expect(
      (
        await examStudyCatalog(
          request("GET", undefined, "/api/exam/practice?course=중1"),
        )
      ).status,
    ).toBe(200);
    expect(fixture.catalog).toHaveBeenCalledWith("중1");
  });

  it("pins output to the same recipe and refuses a changed digest or empty generation", async () => {
    const body = { recipe, expectedDigest: "b".repeat(64) };
    expect(
      (
        await resolveExamStudy(
          request("POST", body, "/api/exam/practice/resolve"),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await resolveExamStudy(
          request(
            "POST",
            { ...body, expectedDigest: "c".repeat(64) },
            "/api/exam/practice/resolve",
          ),
        )
      ).status,
    ).toBe(409);
    fixture.generate.mockResolvedValueOnce({
      ...studyGeneration(recipe),
      deliveredCount: 0,
      questions: [],
    });
    expect(
      (
        await resolveExamStudy(
          request("POST", body, "/api/exam/practice/resolve"),
        )
      ).status,
    ).toBe(409);
  });
});

describe("figure preparation is strict and bounded", () => {
  it("does not accept a figure when rendering dropped required dimensions", async () => {
    fixture.render.mockResolvedValueOnce({
      ok: true,
      svg: "<svg/>",
      droppedDimensions: ["length"],
    });
    fixture.generate.mockImplementationOnce(
      async (
        input: ExamStudyGenerateRequest,
        options: ExamStudyGenerateOptions,
      ) => {
        const result = studyGeneration(input);
        const prepared = await options.prepare!({
          ...result.questions[0]!,
          figureSpec: { version: "graph-1" },
        });
        expect(prepared.ok).toBe(false);
        return {
          ...result,
          status: "unavailable",
          deliveredCount: 0,
          questions: [],
        };
      },
    );
    const response = await createExamStudy(request("POST", recipe));
    expect((await response.json()).data.deliveredCount).toBe(0);
    expect(fixture.render).toHaveBeenCalledWith(
      { version: "graph-1" },
      expect.objectContaining({
        strict: true,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("limits simultaneous Python calls to two", async () => {
    let active = 0,
      maximum = 0;
    fixture.render.mockImplementation(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { ok: true, svg: "<svg/>" };
    });
    fixture.generate.mockImplementationOnce(
      async (
        input: ExamStudyGenerateRequest,
        options: ExamStudyGenerateOptions,
      ) => {
        const result = studyGeneration(input);
        const item: ExamStudyDraft = {
          ...result.questions[0]!,
          figureSpec: { version: "graph-1" },
        };
        const prepared = await Promise.all(
          Array.from({ length: 7 }, () => options.prepare!(item)),
        );
        expect(prepared.every((row) => row.ok)).toBe(true);
        return result;
      },
    );
    expect((await createExamStudy(request("POST", recipe))).status).toBe(200);
    expect(maximum).toBe(2);
  });

  it("refuses oversized SVG instead of delivering a figureless replacement", async () => {
    fixture.render.mockResolvedValueOnce({
      ok: true,
      svg: "x".repeat(2 * 1024 * 1024 + 1),
    });
    fixture.generate.mockImplementationOnce(
      async (
        input: ExamStudyGenerateRequest,
        options: ExamStudyGenerateOptions,
      ) => {
        const result = studyGeneration(input);
        expect(
          (
            await options.prepare!({
              ...result.questions[0]!,
              figureSpec: { version: "graph-1" },
            })
          ).ok,
        ).toBe(false);
        return result;
      },
    );
    expect((await createExamStudy(request("POST", recipe))).status).toBe(200);
  });
});

describe("the real proxy keeps the new paths inside the per-menu output policy (84d58378f)", () => {
  const paths = ["/api/exam/practice", "/api/exam/practice/resolve"];
  async function run(path: string) {
    return await (
      proxy as unknown as (input: NextRequest) => Promise<Response>
    )(new NextRequest(`http://localhost${path}`, { method: "POST" }));
  }
  it.each(["reviewer", "no-menu", "student"])(
    "denies %s at both new API paths",
    async (kind) => {
      fixture.session =
        kind === "student"
          ? { student: { id: "student", mustChangePassword: false } }
          : {
              user: {
                ...teacher,
                ...(kind === "reviewer" ? { role: "reviewer" } : { menus: [] }),
              },
            };
      for (const path of paths) expect((await run(path)).status).toBe(403);
    },
  );
  it("allows an output-capable menu teacher through both paths", async () => {
    for (const path of paths) expect((await run(path)).status).toBe(200);
  });
});
