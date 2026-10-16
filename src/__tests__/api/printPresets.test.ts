// Pure in-memory database boundary: never connects to the configured remote DB.
/**
 * 시험지 만들기 3단계 «내 양식»(W6 · 2026-10-16)의 길 — `/api/studio/print-presets`.
 * 주인만 · 늘 비공개 · 출력(export) 메뉴 · 이름은 한 사람 안에서 하나 · 50개까지 · 바꾸기는 버전을 맞춰야 ·
 * 적용하면 마지막 사용이 오늘 · 새 시험지 기본 양식은 한 사람에 하나.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import type { PrintPresetInput } from "@/contracts/printPreset.contract";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  user: { findFirst: vi.fn() },
  document: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@/lib/accountAccess", () => ({ authorizeAccount: mocks.authorize }));
vi.mock("@/lib/db", () => {
  const tx = { user: mocks.user, workspaceDocument: mocks.document };
  return {
    db: { ...tx, $transaction: (fn: (value: typeof tx) => unknown) => fn(tx) },
  };
});

import { GET, POST } from "@/app/api/studio/print-presets/route";
import { PATCH, DELETE } from "@/app/api/studio/print-presets/[presetId]/route";

const me = "10000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000002";
type Row = Record<string, unknown>;
type Doc = {
  userId: string;
  id: string;
  kind: string;
  title: string;
  payload: Row;
  revision: number;
  visibility: string;
  sharedBranchId: string | null;
  problemCount: number;
};
let docs: Doc[];
let account: AccountAccess;
let userOk: boolean;

const preset = (patch: Partial<PrintPresetInput> = {}): PrintPresetInput => ({
  v: 1,
  name: "일일TEST 2단",
  options: { ...DEFAULT_PRINT_OPTIONS, columns: 2 },
  head: {
    schoolName: "인재원학원",
    subject: "수학",
    examDuration: "20분",
    examiner: "박선생",
    totalScore: 100,
    academyName: "",
    instructorName: "",
  },
  ...patch,
});
const stored = (
  id: string,
  name: string,
  lastUsedAt: string,
  isDefault = false,
  patch: Partial<Doc> = {},
): Doc => ({
  userId: me,
  id,
  kind: "printPreset",
  title: name,
  payload: {
    ...preset({ name }),
    isDefault,
    lastUsedAt,
    savedAt: lastUsedAt,
  },
  revision: 1,
  visibility: "private",
  sharedBranchId: null,
  problemCount: 0,
  ...patch,
});

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && "in" in (value as Row))
      return ((value as Row).in as unknown[]).includes(row[key]);
    return row[key] === value;
  });
}
const request = (method: string, path = "", body?: unknown) =>
  new Request(`http://localhost/api/studio/print-presets${path}`, {
    method,
    headers: { origin: "http://localhost", "x-workspace-owner": me },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const ctx = (presetId: string) => ({ params: Promise.resolve({ presetId }) });
const list = async () => (await (await GET(request("GET"))).json()).data;
const defaults = () =>
  docs
    .filter((doc) => doc.kind === "printPreset" && doc.userId === me)
    .filter((doc) => doc.payload.isDefault)
    .map((doc) => doc.id);

beforeEach(() => {
  vi.resetAllMocks();
  userOk = true;
  account = {
    id: me,
    name: "나",
    email: "me@example.test",
    role: "director",
    isAdmin: false,
    approvalStatus: "approved",
    menus: ["export"],
    branchId: null,
  };
  docs = [
    stored("p-old", "단원평가 학교식", "2026-09-30T01:00:00.000Z"),
    stored("p-new", "일일TEST 2단", "2026-10-14T01:00:00.000Z", true),
    // 같은 표의 자료 · 출제 조건 · 남의 양식 — 목록에 섞이지 않는다.
    {
      ...stored("draft-1", "시험지", "2026-10-15T01:00:00.000Z"),
      kind: "draft",
    },
    {
      ...stored("cond-1", "조건", "2026-10-15T01:00:00.000Z"),
      kind: "examCondition",
    },
    stored("p-theirs", "남의 양식", "2026-10-15T01:00:00.000Z", true, {
      userId: other,
    }),
  ];
  mocks.authorize.mockImplementation(async (req: Request) =>
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.get("origin") !== "http://localhost"
      ? {
          account: null,
          response: Response.json({ error: {} }, { status: 403 }),
        }
      : { account: { ...account }, response: null },
  );
  mocks.user.findFirst.mockImplementation(async () =>
    userOk ? { id: me } : null,
  );
  mocks.document.findMany.mockImplementation(
    async ({ where }: { where: Row }) =>
      docs.filter((doc) => matches(doc, where)),
  );
  mocks.document.findFirst.mockImplementation(
    async ({ where }: { where: Row }) =>
      docs.find((doc) => matches(doc, where)) ?? null,
  );
  mocks.document.create.mockImplementation(
    async ({ data }: { data: Omit<Doc, "revision"> }) => {
      const doc: Doc = { revision: 1, ...data };
      docs.push(doc);
      return doc;
    },
  );
  mocks.document.updateMany.mockImplementation(
    async ({ where, data }: { where: Row; data: Row }) => {
      const rows = docs.filter((doc) => matches(doc, where));
      for (const doc of rows) {
        const { revision, ...rest } = data;
        Object.assign(doc, rest);
        if (revision) doc.revision += 1;
      }
      return { count: rows.length };
    },
  );
  mocks.document.deleteMany.mockImplementation(
    async ({ where }: { where: Row }) => {
      const before = docs.length;
      docs = docs.filter((doc) => !matches(doc, where));
      return { count: before - docs.length };
    },
  );
});

describe("print presets API (W6)", () => {
  it("lists only my presets, newest use first, never documents, conditions or a colleague's", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    expect(body.data.map((row: Row) => row.id)).toEqual(["p-new", "p-old"]);
    expect(body.meta.limit).toBe(50);
    expect(mocks.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: me, kind: "printPreset" } }),
    );
  });

  it("creates a private preset with no problems and sets the dates", async () => {
    const response = await POST(
      request("POST", "", { preset: preset({ name: "  주간 확인 " }) }),
    );
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.preset).toMatchObject({ name: "주간 확인", isDefault: false });
    const row = docs.find((doc) => doc.id === data.id)!;
    expect(row).toMatchObject({
      userId: me,
      kind: "printPreset",
      title: "주간 확인",
      visibility: "private",
      sharedBranchId: null,
      problemCount: 0,
    });
    expect(row.payload).not.toHaveProperty("problems");
    expect((await list())[0].id).toBe(data.id);
    expect(defaults()).toEqual(["p-new"]);
  });

  it("keeps one default per user — saving as default or [기본으로] moves it", async () => {
    const saved = await POST(
      request("POST", "", {
        preset: preset({ name: "새 기본" }),
        makeDefault: true,
      }),
    );
    const { data } = await saved.json();
    expect(data.preset.isDefault).toBe(true);
    expect(defaults()).toEqual([data.id]);
    // 남의 기본은 건드리지 않는다.
    expect(docs.find((doc) => doc.id === "p-theirs")!.payload.isDefault).toBe(
      true,
    );
    const moved = await PATCH(
      request("PATCH", "/p-old", { action: "default", isDefault: true }),
      ctx("p-old"),
    );
    expect(moved.status).toBe(200);
    expect(defaults()).toEqual(["p-old"]);
    const cleared = await PATCH(
      request("PATCH", "/p-old", { action: "default", isDefault: false }),
      ctx("p-old"),
    );
    expect(cleared.status).toBe(200);
    expect(defaults()).toEqual([]);
  });

  it("refuses a duplicate name with the existing row, and replaces it only with its revision", async () => {
    const duplicate = await POST(request("POST", "", { preset: preset() }));
    expect(duplicate.status).toBe(409);
    const refused = await duplicate.json();
    expect(refused.error.code).toBe("PRINT_PRESET_NAME_TAKEN");
    expect(refused.error.existing).toEqual({ id: "p-new", revision: 1 });
    const stale = await POST(
      request("POST", "", {
        preset: preset(),
        replace: { id: "p-new", expectedRevision: 7 },
      }),
    );
    expect(stale.status).toBe(409);
    const replaced = await POST(
      request("POST", "", {
        preset: preset({ options: { ...DEFAULT_PRINT_OPTIONS, columns: 1 } }),
        replace: { id: "p-new", expectedRevision: 1 },
      }),
    );
    expect(replaced.status).toBe(200);
    const { data } = await replaced.json();
    expect(data).toMatchObject({ id: "p-new", revision: 2 });
    expect(data.preset.options.columns).toBe(1);
    // 바꿔 저장해도 기본은 남는다.
    expect(data.preset.isDefault).toBe(true);
  });

  it("caps presets at 50 per user with a Korean 409", async () => {
    for (let i = 0; i < 48; i += 1)
      docs.push(stored(`p-${i}`, `양식 ${i}`, "2026-10-01T00:00:00.000Z"));
    const response = await POST(
      request("POST", "", { preset: preset({ name: "하나 더" }) }),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("PRINT_PRESET_LIMIT");
    expect(body.error.message).toContain("50개");
    expect(
      (
        await POST(
          request("POST", "", {
            preset: preset(),
            replace: { id: "p-new", expectedRevision: 1 },
          }),
        )
      ).status,
    ).toBe(200);
  });

  it("renames with optimistic concurrency and keeps names unique", async () => {
    const taken = await PATCH(
      request("PATCH", "/p-old", {
        action: "rename",
        name: "일일TEST 2단",
        expectedRevision: 1,
      }),
      ctx("p-old"),
    );
    expect(taken.status).toBe(409);
    expect((await taken.json()).error.code).toBe("PRINT_PRESET_NAME_TAKEN");
    expect(
      (
        await PATCH(
          request("PATCH", "/p-old", {
            action: "rename",
            name: "단원평가",
            expectedRevision: 3,
          }),
          ctx("p-old"),
        )
      ).status,
    ).toBe(409);
    const renamed = await PATCH(
      request("PATCH", "/p-old", {
        action: "rename",
        name: " 단원평가 ",
        expectedRevision: 1,
      }),
      ctx("p-old"),
    );
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).data.preset.name).toBe("단원평가");
    expect(docs.find((doc) => doc.id === "p-old")!.title).toBe("단원평가");
  });

  it("applying (touch) bumps lastUsedAt so the preset moves to the top", async () => {
    expect(
      (
        await PATCH(
          request("PATCH", "/p-old", { action: "touch" }),
          ctx("p-old"),
        )
      ).status,
    ).toBe(200);
    expect((await list()).map((row: Row) => row.id)).toEqual([
      "p-old",
      "p-new",
    ]);
  });

  it("deletes only with the current revision", async () => {
    expect(
      (await DELETE(request("DELETE", "/p-old?revision=2"), ctx("p-old")))
        .status,
    ).toBe(409);
    expect(
      (await DELETE(request("DELETE", "/p-old?revision=1"), ctx("p-old")))
        .status,
    ).toBe(200);
    expect(docs.some((doc) => doc.id === "p-old")).toBe(false);
  });

  it("cannot see, change or delete another user's preset, a document or a condition", async () => {
    for (const id of ["p-theirs", "draft-1", "cond-1"]) {
      for (const body of [
        { action: "touch" },
        { action: "default", isDefault: true },
        { action: "rename", name: "x", expectedRevision: 1 },
      ])
        expect(
          (await PATCH(request("PATCH", `/${id}`, body), ctx(id))).status,
        ).toBe(404);
      expect(
        (await DELETE(request("DELETE", `/${id}?revision=1`), ctx(id))).status,
      ).toBe(409);
    }
    expect(docs).toHaveLength(5);
  });

  it("rejects malformed bodies, problems, a switched account and missing menus", async () => {
    expect(
      (
        await POST(
          request("POST", "", {
            preset: { ...preset(), problems: [{ id: "p" }] },
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request("POST", "", { preset: {} }))).status).toBe(400);
    const switched = new Request("http://localhost/api/studio/print-presets", {
      headers: { "x-workspace-owner": other },
    });
    expect((await GET(switched)).status).toBe(403);
    account.menus = ["bank", "library"];
    expect((await GET(request("GET"))).status).toBe(403);
    account.menus = ["export"];
    userOk = false;
    expect((await GET(request("GET"))).status).toBe(403);
  });

  it("refuses cross-site mutations", async () => {
    const response = await POST(
      new Request("http://localhost/api/studio/print-presets", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ preset: preset({ name: "x" }) }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
