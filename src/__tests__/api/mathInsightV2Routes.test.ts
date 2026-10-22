// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
import {
  mathInsightV2SnapshotResponseSchema,
  mathInsightV2InquiryResponseSchema,
} from "@/contracts/mathInsightV2.contract";
import { runModelApi } from "@/lib/studio-ai/api";
import { recordErrorLog } from "@/lib/errorLog/record";
import { emptySrsState } from "@/lib/math-srs/serverState";
import {
  at,
  FAIL,
  plannedCourse,
  practise,
} from "../helpers/mathPrerequisiteCourse";
import {
  BRANCH_1,
  BRANCH_2,
  db,
  ids,
  params,
  teacherSession,
  sameBranchAdmin,
  otherBranchAdmin,
  world,
} from "../helpers/srsTeacherWorld";
const path = `/api/students/${ids.studied}/math-srs/insight`;
function request(
  method = "GET",
  body?: unknown,
  version: string | null = "2",
  signal?: AbortSignal,
  query = "",
) {
  return new Request(`http://localhost:3000${path}${query}`, {
    method,
    signal,
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...(version === null ? {} : { "x-math-insight-version": version }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const get = (query = "") =>
  GET(request("GET", undefined, "2", undefined, query), params(ids.studied));
const post = (query = "") =>
  POST(
    request(
      "POST",
      { query: "저장된 계획과 관찰을 보여 주세요" },
      "2",
      undefined,
      query,
    ),
    params(ids.studied),
  );
let tick = 0;
let accountPatch: Record<string, unknown>;
let studentPatch: Record<string, unknown>;
let classPatch: Record<string, unknown>;
let onModel: () => void | Promise<void>;
function validSelection(prompt: string) {
  const s = JSON.parse(prompt.split("\n").at(-1)!);
  return JSON.stringify({
    snapshotId: s.snapshotId,
    intent: "context",
    factIds: [s.facts[0].id],
    evidenceIds: [],
    candidateIds: [],
  });
}
beforeEach(() => {
  world.reset();
  vi.clearAllMocks();
  accountPatch = {};
  studentPatch = {};
  classPatch = {};
  onModel = () => {};
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
  vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
  world.session = teacherSession();
  vi.spyOn(Date, "now").mockReturnValue(2_000_000_000_000 + ++tick * 60_001);
  const originalUser = db.user.findUnique;
  vi.spyOn(db.user, "findUnique").mockImplementation(async (args) =>
    "select" in args &&
    (args as { select?: { disabledMenus?: boolean } }).select?.disabledMenus
      ? ({
          ...(world.session as ReturnType<typeof teacherSession>).user,
          disabledMenus: [],
          branch: {
            disabledMenus: [],
            ownerDisabledMenus: [],
            menuRevision: 0,
          },
          sessionVersion: 0,
          deletedAt: null,
          suspendedAt: null,
          manualSuspendedAt: null,
          ...accountPatch,
        } as never)
      : originalUser(args),
  );
  const originalStudent = db.student.findUnique;
  vi.spyOn(db.student, "findUnique").mockImplementation(async (args) => {
    const row = await originalStudent(args);
    return row
      ? ({
          ...row,
          ...studentPatch,
          class: { ...row.class, ...classPatch },
        } as never)
      : null;
  });
  const originalClass = db.class.findUnique;
  vi.spyOn(db.class, "findUnique").mockImplementation(async (args) => {
    const row = await originalClass(args);
    return row ? ({ ...row, ...classPatch } as never) : null;
  });
  vi.mocked(runModelApi).mockImplementation(async (input) => {
    await onModel();
    return validSelection(input.prompt);
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
it("opts in strictly while no-header GET/POST retain v1", async () => {
  const r = await get();
  expect(r.status).toBe(200);
  const s = mathInsightV2SnapshotResponseSchema.parse(await r.json()).data;
  expect(s.planContext.status).toBe("absent");
  expect(s.retention.sourcePresence).toBe("none-retained");
  expect(r.headers.get("cache-control")).toContain("no-store");
  const legacy = await GET(
    request("GET", undefined, null),
    params(ids.studied),
  );
  expect((await legacy.json()).data.scope.pilotId).toBe(
    "elementary-fractions-v1",
  );
  vi.mocked(runModelApi).mockImplementationOnce(async (input) => {
    const s = JSON.parse(input.prompt.split("\n").at(-1)!);
    return JSON.stringify({
      snapshotId: s.snapshotId,
      intent: "insufficient",
      evidenceIds: [],
      candidateIds: [],
    });
  });
  const legacyPost = await POST(
    request("POST", { query: "설명" }, null),
    params(ids.studied),
  );
  expect(legacyPost.status).toBe(200);
  expect((await legacyPost.json()).data).not.toHaveProperty("factIds");
});
it.each(["", "1", "3", "02", "2, 2"])(
  "rejects header %j without record/model read",
  async (version) => {
    const read = vi.spyOn(db.studentSrsState, "findUnique");
    expect(
      (await GET(request("GET", undefined, version), params(ids.studied)))
        .status,
    ).toBe(400);
    expect(read).not.toHaveBeenCalled();
    expect(runModelApi).not.toHaveBeenCalled();
  },
);
it("rejects strict body/scope/content-type and bounds input", async () => {
  const read = vi.spyOn(db.studentSrsState, "findUnique");
  for (const body of [
    { query: "説明", evidence: [] },
    { query: "" },
    { query: "x".repeat(501) },
    { query: 2 },
  ])
    expect(
      (await POST(request("POST", body), params(ids.studied))).status,
    ).toBe(400);
  expect((await get("?unknown=x")).status).toBe(400);
  expect(
    (await get(`?classId=${ids.classId}&classId=${ids.classId}`)).status,
  ).toBe(400);
  const wrongMime = request("POST", { query: "설명" });
  wrongMime.headers.set("content-type", "application/jsonp");
  expect((await POST(wrongMime, params(ids.studied))).status).toBe(400);
  const plain = request("POST", { query: "설명" });
  plain.headers.set("content-type", "text/plain");
  expect((await POST(plain, params(ids.studied))).status).toBe(400);
  expect(
    (
      await POST(
        request("POST", { query: "x".repeat(5000) }),
        params(ids.studied),
      )
    ).status,
  ).toBe(413);
  expect(read).not.toHaveBeenCalled();
  expect(runModelApi).not.toHaveBeenCalled();
});
it("denies session or fresh DB authorization before learning reads/model", async () => {
  const read = vi.spyOn(db.studentSrsState, "findUnique");
  for (const session of [
    null,
    { student: { studentId: ids.studied } },
    teacherSession({ menus: [] }),
    otherBranchAdmin(),
  ]) {
    world.session = session;
    expect((await get()).status).toBeGreaterThanOrEqual(400);
    expect((await post()).status).toBeGreaterThanOrEqual(400);
  }
  world.session = teacherSession();
  for (const patch of [
    { disabledMenus: ["srs"] },
    { approvalStatus: "pending" },
    { deletedAt: new Date() },
    { suspendedAt: new Date() },
    { branchId: BRANCH_2 },
  ]) {
    accountPatch = patch;
    expect((await get()).status).toBeGreaterThanOrEqual(400);
    expect((await post()).status).toBeGreaterThanOrEqual(400);
  }
  expect(read).not.toHaveBeenCalled();
  expect(runModelApi).not.toHaveBeenCalled();
  expect(world.writes).toBe(0);
});
it("uses exact JWT admin normalization and existing legacy scopes", async () => {
  world.session = sameBranchAdmin();
  accountPatch = { ...sameBranchAdmin().user };
  expect((await get()).status).toBe(200);
  accountPatch = { ...sameBranchAdmin().user, branchRole: "teacher" };
  classPatch = { userId: ids.colleague };
  expect((await get()).status).toBe(403);
  world.session = sameBranchAdmin({ isSuperAdmin: true, menus: [] });
  accountPatch = {
    ...sameBranchAdmin({ isSuperAdmin: true }).user,
    disabledMenus: ["srs"],
  };
  expect((await get()).status).toBe(200);
  expect((await get(`?branchId=${BRANCH_2}`)).status).toBe(404);
});
it("rechecks current DB menu even when cached session claims remain authorized", async () => {
  const read = vi.spyOn(db.studentSrsState, "findUnique");
  onModel = () => {
    accountPatch = { disabledMenus: ["srs"] };
  };
  const r = await post();
  expect(r.status).toBe(403);
  expect(await r.json()).not.toHaveProperty("data");
  expect(read).toHaveBeenCalledTimes(1);
  expect(runModelApi).toHaveBeenCalledTimes(1);
  accountPatch = {};
  onModel = () => {};
  expect((await post()).status).toBe(200);
});
it.each([
  { sessionVersion: 1 },
  { approvalStatus: "rejected" },
  { suspendedAt: new Date() },
  { manualSuspendedAt: new Date() },
  { deletedAt: new Date() },
  {
    branch: { disabledMenus: ["srs"], ownerDisabledMenus: [], menuRevision: 1 },
  },
])("denies account revocation during inference %j", async (patch) => {
  onModel = () => {
    accountPatch = patch;
  };
  expect((await post()).status).toBe(403);
  expect(world.writes).toBe(0);
});
it.each([{ name: "이름 변경" }])(
  "returns safe conflict on authorized account context changes %j",
  async (patch) => {
    onModel = () => {
      accountPatch = patch;
    };
    const r = await post();
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ error: { code: "CONFLICT" } });
  },
);
it("denies reassigned class ownership and withdrawn student after model", async () => {
  onModel = () => {
    classPatch = { userId: ids.colleague };
  };
  expect((await post()).status).toBe(403);
  classPatch = {};
  onModel = () => {
    studentPatch = { eywaWithdrawnAt: new Date() };
  };
  expect((await post()).status).toBe(404);
});
it("returns safe 409 for authorized class/branch/grade context changes", async () => {
  onModel = () => {
    studentPatch = { branchId: BRANCH_2 };
  };
  const r = await post();
  expect(r.status).toBe(409);
  expect(await r.json()).not.toHaveProperty("data");
  studentPatch = {};
  onModel = () => {
    classPatch = { grade: "초4" };
  };
  expect((await post()).status).toBe(409);
});
it("explicit branch narrowing is checked again after inference", async () => {
  onModel = () => {
    studentPatch = { branchId: BRANCH_2 };
  };
  expect((await post(`?branchId=${BRANCH_1}`)).status).toBe(404);
});
it("rejects changed revision and unchanged-revision course edits without stale payload", async () => {
  const initial = {
    ...emptySrsState(),
    course: plannedCourse("3-1-1-1", new Date("2026-01-01")),
  };
  world.rows.set(ids.studied, {
    studentId: ids.studied,
    revision: 2,
    payload: initial,
  });
  onModel = () => {
    world.rows.set(ids.studied, {
      studentId: ids.studied,
      revision: 3,
      payload: initial,
    });
  };
  let r = await post();
  expect(r.status).toBe(409);
  expect(await r.json()).not.toHaveProperty("data");
  world.rows.set(ids.studied, {
    studentId: ids.studied,
    revision: 2,
    payload: initial,
  });
  onModel = () => {
    world.rows.set(ids.studied, {
      studentId: ids.studied,
      revision: 2,
      payload: {
        ...initial,
        course: {
          ...initial.course,
          plan: { ...initial.course.plan!, enabled: false },
        },
      },
    });
  };
  r = await post();
  expect(r.status).toBe(409);
  expect(runModelApi).toHaveBeenCalledTimes(2);
  expect(world.writes).toBe(0);
});
it("unchanged authoritative state does not conflict when time/asOf advances", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2031-01-01T01:00:00Z"));
  onModel = () => {
    vi.setSystemTime(new Date("2031-01-02T01:00:00Z"));
  };
  const r = await post();
  expect(r.status).toBe(200);
  expect(
    mathInsightV2InquiryResponseSchema.parse(await r.json()).data.snapshot.asOf,
  ).toBe("2031-01-01T01:00:00.000Z");
});
it("masks current/cached identities and transmits only privacy-bounded selector input", async () => {
  vi.mocked(runModelApi).mockImplementationOnce(async (input) => {
    expect(input).toMatchObject({
      maxOutputTokens: 700,
      singleAttempt: true,
      suppressUpstreamDetails: true,
    });
    expect(input.signal).toBeInstanceOf(AbortSignal);
    for (const value of [
      ids.studied,
      ids.owner,
      "서연",
      "선생님",
      "teacher@example.test",
    ])
      expect(input.prompt).not.toContain(value);
    return validSelection(input.prompt);
  });
  const r = await POST(
    request("POST", { query: "서연 선생님 저장된 기록" }),
    params(ids.studied),
  );
  expect(r.status).toBe(200);
  expect(
    (
      await POST(
        request("POST", { query: "student@example.com" }),
        params(ids.studied),
      )
    ).status,
  ).toBe(400);
  expect(runModelApi).toHaveBeenCalledTimes(1);
});
it("keeps missing-config GET available and POST safe, and suppresses upstream failures", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  expect((await post()).status).toBe(503);
  expect((await get()).status).toBe(200);
  vi.stubEnv("GEMINI_API_KEY", "synthetic-key");
  vi.mocked(runModelApi).mockRejectedValueOnce(
    new Error("SECRET upstream raw answer"),
  );
  const r = await post();
  expect(r.status).toBe(502);
  expect(await r.text()).not.toContain("SECRET");
  expect(JSON.stringify(vi.mocked(recordErrorLog).mock.calls)).not.toContain(
    "SECRET",
  );
  expect((await post()).status).toBe(200);
  expect(world.writes).toBe(0);
});
it("strict model forgery is refused and failure releases admission", async () => {
  vi.mocked(runModelApi).mockResolvedValueOnce('{"diagnosis":"invented"}');
  expect((await post()).status).toBe(502);
  expect((await post()).status).toBe(200);
});
it("overlap and client cancellation release admission without automatic model retry", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  vi.mocked(runModelApi).mockImplementationOnce(
    async (input) =>
      new Promise<string>((_, reject) => {
        started();
        input.signal.addEventListener(
          "abort",
          () => reject(input.signal.reason),
          { once: true },
        );
      }),
  );
  const controller = new AbortController();
  const pending = POST(
    request("POST", { query: "계획" }, "2", controller.signal),
    params(ids.studied),
  );
  await ready;
  expect((await post()).status).toBe(429);
  controller.abort();
  expect((await pending).status).toBe(499);
  expect(runModelApi).toHaveBeenCalledTimes(1);
  expect((await post()).status).toBe(200);
});
it("timeout is safe 504 and releases admission", async () => {
  const original = AbortSignal.timeout;
  const timeout = new AbortController();
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) =>
    ms === 20_000 ? timeout.signal : original(ms),
  );
  vi.mocked(runModelApi).mockImplementationOnce(
    async (input) =>
      new Promise<string>((_, reject) => {
        input.signal.addEventListener(
          "abort",
          () => reject(new Error("SECRET provider timeout")),
          { once: true },
        );
        timeout.abort();
      }),
  );
  const r = await post();
  expect(r.status).toBe(504);
  expect(await r.text()).not.toContain("SECRET");
  expect((await post()).status).toBe(504); // The same deliberately aborted timeout signal remains active.
  vi.mocked(AbortSignal.timeout).mockRestore();
  expect((await post()).status).toBe(200);
});
it("GET grade-wide observations are actual retained transitions and never write records", async () => {
  const start = at("2026-10-01T01:00:00Z"),
    course = practise(
      plannedCourse("3-1-1-1", start),
      "3-1-1-1",
      "learn",
      start,
      FAIL,
    );
  world.rows.set(ids.studied, {
    studentId: ids.studied,
    revision: 4,
    payload: { ...emptySrsState(), course },
  });
  const r = await get();
  expect(r.status).toBe(200);
  const s = mathInsightV2SnapshotResponseSchema.parse(await r.json()).data;
  expect(s.observations[0].grade).toBe(3);
  expect(s.observations[0].independentIncorrect).toBe(2);
  expect(s.pilot.evidence).toHaveLength(0);
  expect(world.writes).toBe(0);
});

it("rejects an authorized same-branch class reassignment with safe409 and releases admission", async () => {
  world.session = sameBranchAdmin();
  accountPatch = { ...sameBranchAdmin().user };
  onModel = () => {
    studentPatch = { classId: ids.fresh };
    classPatch = { id: ids.fresh, userId: ids.colleague };
  };
  const r = await post();
  expect(r.status).toBe(409);
  expect(await r.json()).not.toHaveProperty("data");
  onModel = () => {};
  studentPatch = {};
  classPatch = {};
  expect((await post()).status).toBe(200);
});
