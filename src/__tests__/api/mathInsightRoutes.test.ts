// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/lib/auth",
  async () => (await import("../helpers/srsTeacherWorld")).authModule,
);
vi.mock(
  "@/lib/db",
  async () => (await import("../helpers/srsTeacherWorld")).dbModule,
);
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn(async () => undefined),
}));
vi.mock("@/lib/studio-ai/api", () => ({ runModelApi: vi.fn() }));
import { GET, POST } from "@/app/api/students/[id]/math-srs/insight/route";
import { runModelApi } from "@/lib/studio-ai/api";
import { readSrsState } from "@/lib/math-srs/serverStore";
import { mathInsightSnapshotResponseSchema } from "@/contracts/mathInsight.contract";
import {
  BRANCH_2,
  db,
  ids,
  otherBranchAdmin,
  params,
  req,
  sameBranchAdmin,
  teacherSession,
  world,
} from "../helpers/srsTeacherWorld";
const path = `/api/students/${ids.studied}/math-srs/insight`;
const get = (query = "") => GET(req(path + query), params(ids.studied));
const post = (body: unknown = { query: "기록을 보여 주세요" }) =>
  POST(req(path, "POST", body), params(ids.studied));
beforeEach(() => {
  world.reset();
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
  vi.stubEnv("GEMINI_API_KEY", "");
  world.session = teacherSession();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("teacher-only insight admission", () => {
  it("denies unauthenticated/student/menu-less/foreign branch/class/student before record/model read", async () => {
    const read = vi.spyOn(db.studentSrsState, "findUnique");
    for (const session of [
      null,
      { student: { studentId: ids.studied } },
      teacherSession({ menus: [] }),
      otherBranchAdmin(),
      teacherSession({ id: ids.colleague }),
    ]) {
      world.session = session;
      expect((await get()).status).toBeGreaterThanOrEqual(400);
      expect((await post()).status).toBeGreaterThanOrEqual(400);
    }
    world.session = teacherSession();
    expect((await get(`?classId=${ids.fresh}`)).status).toBe(404);
    expect(
      (
        await GET(
          req(`/api/students/${ids.withdrawn}/math-srs/insight`),
          params(ids.withdrawn),
        )
      ).status,
    ).toBe(404);
    expect(read).not.toHaveBeenCalled();
    expect(runModelApi).not.toHaveBeenCalled();
    expect(world.writes).toBe(0);
  });
  it("reads with owner/branch admin and keeps explicit superadmin context narrowed", async () => {
    for (const session of [
      teacherSession(),
      sameBranchAdmin(),
      sameBranchAdmin({ isSuperAdmin: true, menus: [] }),
    ]) {
      world.session = session;
      const r = await get();
      expect(r.status).toBe(200);
      expect(r.headers.get("cache-control")).toContain("no-store");
      const s = mathInsightSnapshotResponseSchema.parse(await r.json()).data;
      expect(s.context?.studentId).toBe(ids.studied);
      expect(s.freshness).toBe("insufficient");
      expect((await get(`?branchId=${BRANCH_2}`)).status).toBe(404);
    }
    expect(world.writes).toBe(0);
  });
  it("rejects unknown/duplicate query and unknown body/client evidence", async () => {
    const read = vi.spyOn(db.studentSrsState, "findUnique");
    expect((await get("?studentId=other")).status).toBe(400);
    expect(
      (await get(`?classId=${ids.classId}&classId=${ids.classId}`)).status,
    ).toBe(400);
    expect((await post({ query: "설명", evidence: [] })).status).toBe(400);
    expect((await post({ query: "x".repeat(501) })).status).toBe(400);
    expect(read).not.toHaveBeenCalled();
    expect(runModelApi).not.toHaveBeenCalled();
  });
  it("missing key is safe 503, deterministic GET still works, no writes", async () => {
    expect((await post()).status).toBe(503);
    expect((await get()).status).toBe(200);
    expect(runModelApi).not.toHaveBeenCalled();
    expect(world.writes).toBe(0);
  });
  it("bounds streamed body even without content-length", async () => {
    const r = new Request(`http://localhost:3000${path}`, {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: "x".repeat(5000) }),
    });
    expect((await POST(r, params(ids.studied))).status).toBe(413);
    expect(runModelApi).not.toHaveBeenCalled();
  });
  it("rejects identity-bearing inquiry and masks known teacher/student names before model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
    expect(
      (await post({ query: "메일 student@example.com을 분석" })).status,
    ).toBe(400);
    vi.mocked(runModelApi).mockImplementation(async (input) => {
      expect(input.prompt).not.toContain("서연");
      expect(input.prompt).not.toContain(ids.studied);
      const data = JSON.parse(input.prompt.split("\n").at(-1)!);
      return JSON.stringify({
        snapshotId: data.snapshotId,
        intent: "insufficient",
        evidenceIds: [],
        candidateIds: [],
      });
    });
    expect((await post({ query: "서연의 기록을 보여 주세요" })).status).toBe(
      200,
    );
    expect(world.writes).toBe(0);
    expect((await readSrsState(ids.studied)).revision).toBe(0);
  });
  it("refuses model unknown facts and releases concurrency admission after failure", async () => {
    vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
    vi.mocked(runModelApi).mockResolvedValue('{"diagnosis":"unsupported"}');
    expect((await post()).status).toBe(502);
    expect((await post()).status).toBe(502);
    expect(world.writes).toBe(0);
  });
});
