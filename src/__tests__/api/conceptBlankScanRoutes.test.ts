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
import {
  GET as markupGet,
  POST as markupPost,
} from "@/app/api/concept-blank/scan/submissions/[id]/markup/route";
import { changeScanMarkup } from "@/lib/concept-blank/scan/markupStore";
import { overrideScanGrade } from "@/lib/concept-blank/scan/submission";
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
  model.mockReset();
  mocks.auth.mockResolvedValue(student());
  mocks.runtime.mockReturnValue({
    db: local.db,
    origin,
    storage: () => storage,
    config: () => scanConfig({}),
    onError: vi.fn(),
    model: () => model,
  });
});
async function flush() {
  while (mocks.tasks.length) await mocks.tasks.shift()!();
}
const studentText = "대응하는 변의 길이가 같습니다.";
async function gradedMarkup() {
  mocks.auth.mockResolvedValue(student());
  vi.stubEnv("CONCEPT_BLANK_SCAN_MARKUP", "on");
  model.mockImplementationOnce(async (r) => {
    const input = JSON.parse(r.prompt.split("\n").at(-1)!);
    return JSON.stringify({
      slots: input.slots.map(({ id }: { id: string }) => ({
        id,
        status: "read",
        text: studentText,
      })),
    });
  });
  model.mockImplementationOnce(async (r) => {
    expect(r.promptVersion).toBe("cb-scan-semantic-20261126-v3-markup");
    const input = JSON.parse(r.prompt.split("\n").at(-1)!);
    return JSON.stringify({
      grades: input.map(({ id }: { id: string }) => ({
        id,
        label: "partial",
        reason: "뜻의 일부가 빠졌습니다.",
      })),
      notes: [
        {
          targetId: input[0].id,
          slotId: input[0].studentAnswer[0].slot,
          kind: "missing",
          quote: "변의 길이",
          say: "더 필요한 조건을 찾아보세요.",
          fix: "바른 답은 교사 전용",
        },
        {
          targetId: (input[1] ?? input[0]).id,
          slotId: (input[1] ?? input[0]).studentAnswer[0].slot,
          kind: "wrong",
          quote: "원래 쓰지 않은 글",
          say: "폐기할 설명",
          fix: "",
        },
      ],
    });
  });
  try {
    const {
      data: { id },
    } = await (await start(req("/submissions", "POST", payload()))).json();
    const imageDataUrl = await QRCode.toDataURL(
      `${origin}/concept-blank/scan?p=${world.issued.id}&page=1&part=student`,
      { width: 700, margin: 4 },
    );
    const uploadResponse = await upload(
      req(`/submissions/${id}/photos`, "POST", { revision: 0, imageDataUrl }),
      ctx(id),
    );
    expect(uploadResponse.status).toBe(201);
    const {
      data: { photoId },
    } = await uploadResponse.json();
    const { data: captured } = await (
      await get(req(`/submissions/${id}`), ctx(id))
    ).json();
    const processResponse = await job(
      req(`/submissions/${id}/jobs`, "POST", {
        kind: "read",
        revision: captured.revision,
      }),
      ctx(id),
    );
    expect(processResponse.status, await processResponse.clone().text()).toBe(
      202,
    );
    await flush();
    const url = `/submissions/${id}/markup`;
    const read = async () =>
      (await (await markupGet(req(url), ctx(id))).json()).data;
    const post = (input: unknown) =>
      markupPost(req(url, "POST", input), ctx(id));
    expect(await read()).toEqual({ targets: [] });
    mocks.auth.mockResolvedValue(teacher());
    const { data: view } = await (
      await get(req(`/submissions/${id}`), ctx(id))
    ).json();
    expect(
      view.state,
      String(mocks.runtime().onError.mock.calls[0]?.[0] ?? view.lastError),
    ).toBe("graded");
    const teacherMarkup = await read();
    const draft = teacherMarkup.targets.find(
      (target: { notes: unknown[] }) => target.notes.length,
    );
    expect(draft, JSON.stringify(teacherMarkup)).toBeDefined();
    expect(draft.notes[0]).toMatchObject({
      quote: "변의 길이",
      fix: "바른 답은 교사 전용",
      published: false,
    });
    return { id, photoId, url, read, post, draft, view };
  } finally {
    vi.stubEnv("CONCEPT_BLANK_SCAN_MARKUP", undefined);
  }
}
describe("authenticated scan HTTP routes with local PostgreSQL", () => {
  it("returns markup 503 independently from the existing result route", async () => {
    const response = await start(req("/submissions", "POST", payload()));
    const { id } = (await response.json()).data;
    await local.db.query(
      "ALTER TABLE concept_blank_scan_markup RENAME TO markup_migration_missing",
    );
    try {
      expect(
        (await markupGet(req(`/submissions/${id}/markup`), ctx(id))).status,
      ).toBe(503);
      expect((await get(req(`/submissions/${id}`), ctx(id))).status).toBe(200);
    } finally {
      await local.db.query(
        "ALTER TABLE markup_migration_missing RENAME TO concept_blank_scan_markup",
      );
    }
  });
  it("keeps only published allowlisted fields, retains the prior publication through edits, and removes explicitly", async () => {
    const { draft, read, post, id } = await gradedMarkup();
    expect(model).toHaveBeenCalledTimes(2);
    const [{ count: snapshots }] = await local.db.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM concept_blank_scan_markup WHERE submission_id=$1::uuid AND action='snapshot'",
      [id],
    );
    expect(snapshots).toBe(world.snapshot.pages[0].targets.length);
    const statuses = await local.db.query<{ status: string }>(
      "SELECT DISTINCT status FROM concept_blank_scan_markup WHERE submission_id=$1::uuid",
      [id],
    );
    expect(statuses.map(({ status }) => status)).toContain("ready");
    const publish = {
      action: "publish",
      gradeId: draft.gradeId,
      sequence: draft.sequence,
      requestId: randomUUID(),
    };
    mocks.auth.mockResolvedValue(student());
    expect((await post(publish)).status).toBe(403);
    mocks.auth.mockResolvedValue(teacher());
    expect((await post(publish)).status).toBe(200);
    expect((await post(publish)).status).toBe(200);
    mocks.auth.mockResolvedValue(student());
    const expected = {
      targets: [
        {
          gradeId: draft.gradeId,
          notes: [
            {
              id: draft.notes[0].id,
              slotId: draft.notes[0].slotId,
              say: draft.notes[0].say,
            },
          ],
        },
      ],
    };
    expect(await read()).toEqual(expected);

    mocks.auth.mockResolvedValue(teacher());
    const say = "새로 고친 설명입니다.";
    expect(
      (
        await post({
          ...publish,
          action: "edit",
          requestId: randomUUID(),
          sequence: 2,
          noteId: draft.notes[0].id,
          kind: "wrong",
          say,
          fix: "새 비공개 답",
        })
      ).status,
    ).toBe(200);
    mocks.auth.mockResolvedValue(student());
    expect(await read()).toEqual(expected);
    mocks.auth.mockResolvedValue(teacher());
    expect(
      (
        await post({
          ...publish,
          action: "remove",
          requestId: randomUUID(),
          sequence: 3,
          noteId: draft.notes[0].id,
        })
      ).status,
    ).toBe(200);
    mocks.auth.mockResolvedValue(student());
    expect(await read()).toEqual({ targets: [] });
  });

  it("authorizes only the owner or an eligible teacher and serializes two teachers publishing", async () => {
    const { id, url, draft, read } = await gradedMarkup();
    mocks.auth.mockResolvedValue({
      student: { ...student().student, studentId: randomUUID() },
    });
    expect((await markupGet(req(url), ctx(id))).status).toBe(403);
    const other = {
      ...teacher(),
      user: { ...teacher().user, id: world.userB },
    };
    const branch = randomUUID();
    await local.db.query(
      "INSERT INTO branch(id,name) VALUES ($1::uuid,'다른 첨삭 지점')",
      [branch],
    );
    await local.db.query(
      `UPDATE "user" SET is_admin=true, branch_role='manager', branch_id=$2::uuid WHERE id=$1::uuid`,
      [world.userB, branch],
    );
    try {
      mocks.auth.mockResolvedValue(other);
      expect((await markupGet(req(url), ctx(id))).status).toBe(403);
      await local.db.query(
        `UPDATE "user" SET branch_id=$2::uuid WHERE id=$1::uuid`,
        [world.userB, world.branchId],
      );
      expect((await read()).targets).toEqual(expect.arrayContaining([draft]));
      const input = {
        action: "publish" as const,
        gradeId: draft.gradeId,
        sequence: draft.sequence,
      };
      const results = await Promise.allSettled([
        changeScanMarkup(
          world.teacher,
          id,
          { ...input, requestId: randomUUID() },
          local.db,
        ),
        changeScanMarkup(
          { kind: "teacher", id: world.userB },
          id,
          { ...input, requestId: randomUUID() },
          local.db,
        ),
      ]);
      expect(results[0].status).toBe("fulfilled");
      expect(results[1]).toMatchObject({
        status: "rejected",
        reason: { status: 409 },
      });
    } finally {
      await local.db.query(
        `UPDATE "user" SET is_admin=false, branch_role='teacher', branch_id=$2::uuid WHERE id=$1::uuid`,
        [world.userB, world.branchId],
      );
    }
  });

  it("keeps published list notes through photo expiry and deletion, and rejects publication racing a grade replacement", async () => {
    const { id, photoId, draft, read, post, view } = await gradedMarkup();
    const publish = {
      action: "publish" as const,
      gradeId: draft.gradeId,
      sequence: draft.sequence,
      requestId: randomUUID(),
    };
    expect((await post(publish)).status).toBe(200);
    mocks.auth.mockResolvedValue(student());
    const published = await read();
    await local.db.query(
      "UPDATE concept_blank_scan_photo SET created_at=CURRENT_TIMESTAMP-interval '2 days',expires_at=CURRENT_TIMESTAMP-interval '1 day' WHERE id=$1::uuid",
      [photoId],
    );
    expect(await read()).toEqual(published);
    expect(
      (
        await sign(req(`/submissions/${id}/photos/${photoId}`), {
          params: Promise.resolve({ id, photoId }),
        })
      ).status,
    ).toBe(404);
    mocks.auth.mockResolvedValue(teacher());
    expect(
      (
        await remove(
          req(`/submissions/${id}/photos/${photoId}`, "DELETE", {
            revision: view.revision,
          }),
          { params: Promise.resolve({ id, photoId }) },
        )
      ).status,
    ).toBe(200);
    mocks.auth.mockResolvedValue(student());
    expect(await read()).toEqual(published);

    const { data: latest } = await (
      await get(req(`/submissions/${id}`), ctx(id))
    ).json();
    const grade = latest.grades.find(
      ({ id }: { id: string }) => id === draft.gradeId,
    );
    const results = await Promise.allSettled([
      overrideScanGrade(
        world.teacher,
        id,
        {
          revision: latest.revision,
          targetId: grade.targetId,
          reason: "교사가 원본을 확인했습니다.",
          label: "incorrect",
        },
        local.db,
      ),
      changeScanMarkup(
        world.teacher,
        id,
        { ...publish, sequence: 2, requestId: randomUUID() },
        local.db,
      ),
    ]);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1]).toMatchObject({
      status: "rejected",
      reason: { status: 409 },
    });
    expect(await read()).toEqual({ targets: [] });
    mocks.auth.mockResolvedValue(teacher());
    const newDraft = (await read()).targets.find(
      (target: { notes: unknown[] }) => target.notes.length,
    );
    expect(newDraft).toMatchObject({
      sequence: 0,
      notes: [{ published: false }],
    });
    expect(newDraft.gradeId).not.toBe(draft.gradeId);
    expect(
      (
        await post({
          ...publish,
          gradeId: newDraft.gradeId,
          sequence: 0,
          requestId: randomUUID(),
        })
      ).status,
    ).toBe(200);
    mocks.auth.mockResolvedValue(student());
    expect((await read()).targets[0].gradeId).toBe(newDraft.gradeId);
  });
  it("never attaches a publication to a replacement photo and constrains grade and photo references", async () => {
    const { id, photoId, draft, post, read } = await gradedMarkup();
    const publish = {
      action: "publish",
      gradeId: draft.gradeId,
      sequence: draft.sequence,
      requestId: randomUUID(),
    };
    expect((await post(publish)).status).toBe(200);
    const borrowed = await gradedMarkup();
    for (const [gradeKey, photoKey] of [
      [borrowed.draft.gradeId, photoId],
      [draft.gradeId, borrowed.photoId],
    ]) {
      await expect(
        local.db.query(
          `INSERT INTO concept_blank_scan_markup(id,submission_id,grade_id,photo_id,sequence,action,notes,teacher_id)
         VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,99,'edit','[]',$5::uuid)`,
          [randomUUID(), id, gradeKey, photoKey, world.userA],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    }
    await expect(
      local.db.query(
        "DELETE FROM concept_blank_scan_markup WHERE id=$1::uuid",
        [publish.requestId],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    // Published submissions reject uploads. Simulate older evidence after a photo
    // replacement to establish that the markup reader also checks photo identity.
    await local.db.transaction(async (tx) => {
      await tx.query(
        "UPDATE concept_blank_scan_photo SET is_current=false WHERE id=$1::uuid",
        [photoId],
      );
      await tx.query(
        `INSERT INTO concept_blank_scan_photo
          (id,submission_id,page_number,version,is_current,bucket,object_key,content_sha256,mime_type,width,height,registration,created_at,expires_at)
         SELECT $2::uuid,submission_id,page_number,version+1,true,bucket,$3::text,content_sha256,mime_type,width,height,registration,created_at,expires_at
         FROM concept_blank_scan_photo WHERE id=$1::uuid`,
        [photoId, randomUUID(), `test-replacement/${randomUUID()}`],
      );
    });
    mocks.auth.mockResolvedValue(student());
    expect(await read()).toEqual({ targets: [] });
    mocks.auth.mockResolvedValue(teacher());
    expect(
      (await post({ ...publish, sequence: 2, requestId: randomUUID() })).status,
    ).toBe(409);
  });
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
  it("captures, reads after disconnect, grades and publishes without a confirmation step, and allows a reasoned teacher correction only", async () => {
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
    // 원장님 2026-11-25 «지금은 채점만 하면 됨» — 읽기 뒤 확인 단계 없이 바로 채점 · 공개한다.
    expect(view.state).toBe("graded");
    expect(view.grades.length).toBeGreaterThan(0);
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
    expect(response.status).toBe(409);
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
