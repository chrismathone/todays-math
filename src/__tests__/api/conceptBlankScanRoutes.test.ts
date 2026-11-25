// @vitest-environment node
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { openScanTestDb } from "../helpers/conceptBlankScanDb";
import { scanWorld } from "../helpers/conceptBlankScanFixture";
import { scanConfig, type ScanModel } from "@/lib/concept-blank/scan/model";
import type { ScanPhotoStorage } from "@/lib/concept-blank/scan/storage.server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  runtime: vi.fn(),
  tasks: [] as (() => Promise<unknown>)[],
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/concept-blank/scan/runtime.server", () => ({
  scanRuntime: mocks.runtime,
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (task: () => Promise<unknown>) => mocks.tasks.push(task),
}));
import { GET as issueGet } from "@/app/api/concept-blank/scan/issued/[id]/route";
import { POST as start } from "@/app/api/concept-blank/scan/submissions/route";
import { GET as get } from "@/app/api/concept-blank/scan/submissions/[id]/route";
import { POST as upload } from "@/app/api/concept-blank/scan/submissions/[id]/photos/route";
import { POST as answer } from "@/app/api/concept-blank/scan/submissions/[id]/answers/route";
import { POST as job } from "@/app/api/concept-blank/scan/submissions/[id]/jobs/route";
import { POST as override } from "@/app/api/concept-blank/scan/submissions/[id]/override/route";
import {
  GET as sign,
  DELETE as remove,
} from "@/app/api/concept-blank/scan/submissions/[id]/photos/[photoId]/route";
import { GET as purge } from "@/app/api/concept-blank/scan/purge/cron/route";
import { POST as nameStart } from "@/app/api/concept-blank/scan/name-captures/route";
import {
  GET as nameGet,
  POST as nameAction,
} from "@/app/api/concept-blank/scan/name-captures/[id]/route";
import { POST as assignStudent } from "@/app/api/concept-blank/scan/submissions/[id]/student/route";
import { GET as queue } from "@/app/api/concept-blank/scan/queue/cron/route";
let local: Awaited<ReturnType<typeof openScanTestDb>>,
  world: Awaited<ReturnType<typeof scanWorld>>;
const origin = "https://today.example.test",
  base = `${origin}/api/concept-blank/scan`,
  objects = new Map<string, Buffer>();
const storage: ScanPhotoStorage = {
  bucket: "test-private",
  upload: async (k, b) => {
    objects.set(k, Buffer.from(b));
  },
  read: async (k) => objects.get(k)!,
  signedUrl: async () => "https://example.test/photo",
  remove: async (k) => {
    objects.delete(k);
  },
};
const model = vi.fn<ScanModel>(async (r) => {
  if (r.operation === "read") {
    const p = JSON.parse(r.prompt.split("\n").at(-1)!);
    return JSON.stringify({
      slots: p.slots.map((s: { id: string }) => ({
        id: s.id,
        status: "unreadable",
        text: "",
      })),
    });
  }
  throw Error("no paid model");
});
const req = (suffix: string, method = "GET", body?: unknown) =>
  new Request(`${base}${suffix}`, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const student = () => ({
  student: { studentId: world.studentA, mustChangePassword: false },
});
const teacher = () => ({
  user: {
    id: world.userA,
    role: "director",
    approvalStatus: "approved",
    menus: ["conceptBlank"],
  },
});
const payload = () => ({
  printedSheetId: world.issued.id,
  requestId: randomUUID(),
});
beforeAll(async () => {
  local = await openScanTestDb();
  world = await scanWorld(local);
}, 60_000);
afterAll(async () => {
  await local?.pg.close();
});
beforeEach(() => {
  // 로컬 `.env` 의 AUTH_URL 이 같은 출처 검사에 섞이지 않게(워크트리에는 `.env` 가 없어 초록이었다).
  vi.stubEnv("AUTH_URL", origin);
  vi.stubEnv("NEXTAUTH_URL", "");
  mocks.tasks.length = 0;
  model.mockClear();
  mocks.auth.mockResolvedValue(student());
  mocks.runtime.mockReturnValue({
    db: local.db,
    origin,
    storage: () => storage,
    config: () => scanConfig({}),
    model: () => model,
  });
});
async function flush() {
  while (mocks.tasks.length) await mocks.tasks.shift()!();
}
describe("authenticated scan HTTP routes with local PostgreSQL", () => {
  it("requires the cron secret before touching the queue, even for a signed-in teacher", async () => {
    vi.stubEnv("CRON_SECRET", "scan-queue-test-secret");
    mocks.auth.mockResolvedValue(teacher());
    mocks.runtime.mockClear();
    try {
      expect((await queue(req("/queue/cron"))).status).toBe(401);
      expect(mocks.runtime).not.toHaveBeenCalled();
      const request = req("/queue/cron");
      request.headers.set("authorization", "Bearer scan-queue-test-secret");
      expect((await queue(request)).status).toBe(200);
      expect(model).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("returns 401/403 before DB/storage and rejects cross-origin and forged actor fields", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await start(req("/submissions", "POST", payload()))).status).toBe(
      401,
    );
    mocks.auth.mockResolvedValue({
      student: { ...student().student, mustChangePassword: true },
    });
    expect((await start(req("/submissions", "POST", payload()))).status).toBe(
      403,
    );
    mocks.auth.mockResolvedValue(student());
    expect(
      (
        await start(
          new Request(`${base}/submissions`, {
            method: "POST",
            headers: {
              origin: "https://other.test",
              "content-type": "application/json",
            },
            body: JSON.stringify(payload()),
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await start(
          req("/submissions", "POST", {
            ...payload(),
            actor: { kind: "teacher", id: world.userA },
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("returns current allowed students only to teachers and no answer keys to students", async () => {
    let response = await issueGet(
      req(`/issued/${world.issued.id}`),
      ctx(world.issued.id),
    );
    expect(response.status).toBe(200);
    let body = await response.json();
    expect(body.data.students.map((s: { id: string }) => s.id)).toEqual([
      world.studentA,
    ]);
    expect(JSON.stringify(body)).not.toContain("referenceAnswer");
    mocks.auth.mockResolvedValue(teacher());
    response = await issueGet(
      req(`/issued/${world.issued.id}`),
      ctx(world.issued.id),
    );
    body = await response.json();
    expect(body.data.students.map((s: { id: string }) => s.id)).toEqual([
      world.studentA,
    ]);
    mocks.auth.mockResolvedValue({
      user: { ...teacher().user, id: world.userB },
    });
    expect(
      (await issueGet(req(`/issued/${world.issued.id}`), ctx(world.issued.id)))
        .status,
    ).toBe(403);
  });
  it("captures, reads after disconnect, confirms blank, publishes and allows a reasoned teacher correction only", async () => {
    let response = await start(req("/submissions", "POST", payload()));
    expect(response.status).toBe(201);
    const id = (await response.json()).data.id;
    response = await job(
      req(`/submissions/${id}/jobs`, "POST", { kind: "read", revision: 0 }),
      ctx(id),
    );
    expect(response.status).toBe(409);
    const dataUrl = await QRCode.toDataURL(
      `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
      { width: 700, margin: 4 },
    );
    response = await upload(
      req(`/submissions/${id}/photos`, "POST", {
        revision: 0,
        imageDataUrl: dataUrl,
      }),
      ctx(id),
    );
    expect(response.status).toBe(201);
    const photoId = (await response.json()).data.photoId;
    let view = (await (await get(req(`/submissions/${id}`), ctx(id))).json())
      .data;
    const controller = new AbortController();
    const request = new Request(
      req(`/submissions/${id}/jobs`, "POST", {
        kind: "read",
        revision: view.revision,
      }),
      { signal: controller.signal },
    );
    response = await job(request, ctx(id));
    expect(response.status).toBe(202);
    controller.abort();
    await flush();
    view = (await (await get(req(`/submissions/${id}`), ctx(id))).json()).data;
    expect(view.state).toBe("checking");
    expect(view.grades).toEqual([]);
    expect(model).toHaveBeenCalledTimes(1);
    response = await answer(
      req(`/submissions/${id}/answers`, "POST", {
        revision: view.revision,
        readId: view.readings[0].id,
        slotId: view.readings[0].slotId,
        resolution: "blank",
        text: "",
      }),
      ctx(id),
    );
    expect(response.status).toBe(200);
    view = (await (await get(req(`/submissions/${id}`), ctx(id))).json()).data;
    response = await job(
      req(`/submissions/${id}/jobs`, "POST", {
        kind: "grade",
        revision: view.revision,
      }),
      ctx(id),
    );
    expect(response.status).toBe(202);
    await flush();
    view = (await (await get(req(`/submissions/${id}`), ctx(id))).json()).data;
    expect(view.state).toBe("graded");
    expect(view.grades[0].label).toBe("incorrect");
    const change = {
      revision: view.revision,
      targetId: view.grades[0].targetId,
      label: "partial",
      reason: "사진에 쓴 뜻 일부를 확인했습니다.",
    };
    expect(
      (
        await override(
          req(`/submissions/${id}/override`, "POST", change),
          ctx(id),
        )
      ).status,
    ).toBe(403);
    const photoCtx = { params: Promise.resolve({ id, photoId }) };
    expect(
      (await sign(req(`/submissions/${id}/photos/${photoId}`), photoCtx))
        .status,
    ).toBe(200);
    expect(
      (
        await remove(
          req(`/submissions/${id}/photos/${photoId}`, "DELETE", {
            revision: view.revision,
          }),
          photoCtx,
        )
      ).status,
    ).toBe(403);
    mocks.auth.mockResolvedValue(teacher());
    expect(
      (
        await override(
          req(`/submissions/${id}/override`, "POST", change),
          ctx(id),
        )
      ).status,
    ).toBe(200);
    view = (await (await get(req(`/submissions/${id}`), ctx(id))).json()).data;
    expect(view.state).toBe("teacher-corrected");
    expect(view.grades.at(-1).reason).toBe(change.reason);
    expect(
      (
        await remove(
          req(`/submissions/${id}/photos/${photoId}`, "DELETE", {
            revision: view.revision,
          }),
          photoCtx,
        )
      ).status,
    ).toBe(200);
  });
  it("returns 503 for absent additive tables without pretending a submission exists", async () => {
    mocks.runtime.mockReturnValue({
      db: {
        transaction: async () => {
          throw { code: "42P01" };
        },
      },
    });
    const response = await start(req("/submissions", "POST", payload()));
    expect(response.status).toBe(503);
    expect((await response.json()).error.message).toContain("DB 적용");
  });
  it("locks cleanup to the existing cron secret, never a teacher/student session", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await purge(req("/purge/cron"))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "local-test-secret");
    expect((await purge(req("/purge/cron"))).status).toBe(401);
    const response = await purge(
      new Request(`${base}/purge/cron`, {
        headers: { authorization: "Bearer local-test-secret" },
      }),
    );
    expect(response.status).toBe(200);
    vi.unstubAllEnvs();
  });
});

it("guards every name route and joins an uncertain teacher capture only after explicit choice", async () => {
  const unknown = randomUUID();
  for (const response of [
    await nameStart(req("/name-captures", "POST", {})),
    await nameGet(req(`/name-captures/${unknown}`), ctx(unknown)),
    await nameAction(
      req(`/name-captures/${unknown}`, "POST", { action: "retry" }),
      ctx(unknown),
    ),
    await assignStudent(
      req(`/submissions/${unknown}/student`, "POST", {}),
      ctx(unknown),
    ),
  ])
    expect(response.status).toBe(403);
  mocks.auth.mockResolvedValue(teacher());
  const imageDataUrl = await QRCode.toDataURL(
    `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
    { width: 700 },
  );
  const response = await nameStart(
    req("/name-captures", "POST", { ...payload(), imageDataUrl }),
  );
  expect(response.status).toBe(202);
  const {
    data: { id },
  } = await response.json();
  await flush();
  const before = (
    await (await nameGet(req(`/name-captures/${id}`), ctx(id))).json()
  ).data;
  expect(before.submissionId).toBeNull();
  expect(before.writtenName.status).toBe("unreadable");
  expect((await get(req(`/submissions/${id}`), ctx(id))).status).toBe(404);
  expect(
    (
      await nameAction(
        req(`/name-captures/${id}`, "POST", {
          action: "choose",
          studentId: world.studentA,
        }),
        ctx(id),
      )
    ).status,
  ).toBe(200);
  const linked = (await (await get(req(`/submissions/${id}`), ctx(id))).json())
    .data;
  expect(linked.writtenName.method).toBe("teacher-picked");
  expect(linked.grades).toEqual([]);
});
