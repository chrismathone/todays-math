// Pure in-memory database boundary: never connects to the configured remote DB.
/**
 * 시험지 만들기 «이름 붙인 출제 조건»(W5 · 2026-10-16)의 길 — `/api/studio/exam-conditions`.
 * 주인만 · 늘 비공개 · 이름은 한 사람 안에서 하나 · 50개까지 · 바꾸기는 버전을 맞춰야 · 적용하면 마지막 사용이 오늘.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import type { ExamConditionInput } from "@/contracts/examCondition.contract";

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

import { GET, POST } from "@/app/api/studio/exam-conditions/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/studio/exam-conditions/[conditionId]/route";

const me = "10000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000002";
const branch = "30000000-0000-4000-8000-000000000003";
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

const condition = (
  patch: Partial<ExamConditionInput> = {},
): ExamConditionInput => ({
  v: 1,
  name: "중2 확인 · 부등식 18",
  source: {
    group: "",
    books: [],
    kinds: [],
    materials: [],
    label: "전체 출처",
  },
  rows: [
    { unitId: "u1", label: "일차부등식의 해와 성질", count: 5, fixed: false },
    { unitId: "u2", label: "일차부등식의 풀이", count: 8, fixed: true },
  ],
  total: 13,
  ladder: {
    연산: null,
    기본: 6,
    응용: 7,
    심화하: 0,
    심화중: null,
    심화상: null,
  },
  recent: true,
  familyRule: true,
  ...patch,
});
const stored = (
  id: string,
  name: string,
  lastUsedAt: string,
  patch: Partial<Doc> = {},
): Doc => ({
  userId: me,
  id,
  kind: "examCondition",
  title: name,
  payload: { ...condition({ name }), lastUsedAt },
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
  new Request(`http://localhost/api/studio/exam-conditions${path}`, {
    method,
    headers: { origin: "http://localhost", "x-workspace-owner": me },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const ctx = (conditionId: string) => ({
  params: Promise.resolve({ conditionId }),
});
const list = async () => (await (await GET(request("GET"))).json()).data;

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
    menus: ["bank"],
    branchId: branch,
  };
  docs = [
    stored("c-old", "단원 마무리 25", "2026-09-30T01:00:00.000Z"),
    stored("c-new", "중2 확인 · 부등식 18", "2026-10-14T01:00:00.000Z"),
    // 같은 표의 자료와 남의 조건 — 목록에 섞이지 않는다.
    {
      ...stored("draft-1", "시험지", "2026-10-15T01:00:00.000Z"),
      kind: "draft",
    },
    stored("c-theirs", "남의 조건", "2026-10-15T01:00:00.000Z", {
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

describe("exam conditions API (W5)", () => {
  it("lists only my conditions, newest use first, never documents or a colleague's", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    expect(body.data.map((row: Row) => row.id)).toEqual(["c-new", "c-old"]);
    expect(body.meta.limit).toBe(50);
    expect(mocks.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: me, kind: "examCondition" },
      }),
    );
  });

  it("creates a private condition with no problems and sets lastUsedAt", async () => {
    const response = await POST(
      request("POST", "", { condition: condition({ name: "  일일 8문항 " }) }),
    );
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.condition.name).toBe("일일 8문항");
    expect(Date.parse(data.condition.lastUsedAt)).toBeGreaterThan(
      Date.parse("2026-10-15T00:00:00Z"),
    );
    const row = docs.find((doc) => doc.id === data.id)!;
    expect(row).toMatchObject({
      userId: me,
      kind: "examCondition",
      title: "일일 8문항",
      visibility: "private",
      sharedBranchId: null,
      problemCount: 0,
    });
    expect(row.payload).not.toHaveProperty("problems");
    expect((await list())[0].id).toBe(data.id);
  });

  it("refuses a duplicate name with the existing row, and replaces it only with its revision", async () => {
    const duplicate = await POST(
      request("POST", "", { condition: condition({ total: 9 }) }),
    );
    expect(duplicate.status).toBe(409);
    const refused = await duplicate.json();
    expect(refused.error.code).toBe("EXAM_CONDITION_NAME_TAKEN");
    expect(refused.error.existing).toEqual({ id: "c-new", revision: 1 });
    expect(docs.filter((doc) => doc.kind === "examCondition")).toHaveLength(3);

    const stale = await POST(
      request("POST", "", {
        condition: condition({ total: 9 }),
        replace: { id: "c-new", expectedRevision: 7 },
      }),
    );
    expect(stale.status).toBe(409);

    const replaced = await POST(
      request("POST", "", {
        condition: condition({ total: 9 }),
        replace: { id: "c-new", expectedRevision: 1 },
      }),
    );
    expect(replaced.status).toBe(200);
    const { data } = await replaced.json();
    expect(data).toMatchObject({ id: "c-new", revision: 2 });
    expect(data.condition.total).toBe(9);
  });

  it("caps conditions at 50 per user with a Korean 409", async () => {
    for (let i = 0; i < 48; i += 1)
      docs.push(stored(`c-${i}`, `조건 ${i}`, "2026-10-01T00:00:00.000Z"));
    const response = await POST(
      request("POST", "", { condition: condition({ name: "하나 더" }) }),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("EXAM_CONDITION_LIMIT");
    expect(body.error.message).toContain("50개");
    // 바꿔 저장은 수를 늘리지 않는다.
    expect(
      (
        await POST(
          request("POST", "", {
            condition: condition({ total: 12 }),
            replace: { id: "c-new", expectedRevision: 1 },
          }),
        )
      ).status,
    ).toBe(200);
  });

  it("renames with optimistic concurrency and keeps names unique", async () => {
    const taken = await PATCH(
      request("PATCH", "/c-old", {
        action: "rename",
        name: "중2 확인 · 부등식 18",
        expectedRevision: 1,
      }),
      ctx("c-old"),
    );
    expect(taken.status).toBe(409);
    expect((await taken.json()).error.code).toBe("EXAM_CONDITION_NAME_TAKEN");
    const stale = await PATCH(
      request("PATCH", "/c-old", {
        action: "rename",
        name: "단원 마무리",
        expectedRevision: 3,
      }),
      ctx("c-old"),
    );
    expect(stale.status).toBe(409);
    const renamed = await PATCH(
      request("PATCH", "/c-old", {
        action: "rename",
        name: " 단원 마무리 ",
        expectedRevision: 1,
      }),
      ctx("c-old"),
    );
    expect(renamed.status).toBe(200);
    const { data } = await renamed.json();
    expect(data).toMatchObject({ revision: 2 });
    expect(data.condition.name).toBe("단원 마무리");
    expect(docs.find((doc) => doc.id === "c-old")!.title).toBe("단원 마무리");
  });

  it("applying (touch) bumps lastUsedAt so the condition moves to the top", async () => {
    const response = await PATCH(
      request("PATCH", "/c-old", { action: "touch" }),
      ctx("c-old"),
    );
    expect(response.status).toBe(200);
    expect((await list()).map((row: Row) => row.id)).toEqual([
      "c-old",
      "c-new",
    ]);
  });

  it("deletes only with the current revision", async () => {
    expect(
      (await DELETE(request("DELETE", "/c-old?revision=2"), ctx("c-old")))
        .status,
    ).toBe(409);
    expect(
      (await DELETE(request("DELETE", "/c-old?revision=1"), ctx("c-old")))
        .status,
    ).toBe(200);
    expect(docs.some((doc) => doc.id === "c-old")).toBe(false);
  });

  it("cannot see, rename, touch or delete another user's condition or a document", async () => {
    for (const id of ["c-theirs", "draft-1"]) {
      expect(
        (await PATCH(request("PATCH", `/${id}`, { action: "touch" }), ctx(id)))
          .status,
      ).toBe(404);
      expect(
        (
          await PATCH(
            request("PATCH", `/${id}`, {
              action: "rename",
              name: "x",
              expectedRevision: 1,
            }),
            ctx(id),
          )
        ).status,
      ).toBe(404);
      expect(
        (await DELETE(request("DELETE", `/${id}?revision=1`), ctx(id))).status,
      ).toBe(409);
    }
    expect(docs).toHaveLength(4);
  });

  it("rejects malformed bodies, problem payloads, a switched account and missing menus", async () => {
    expect(
      (
        await POST(
          request("POST", "", {
            condition: { ...condition(), problems: [{ id: "p" }] },
          }),
        )
      ).status,
    ).toBe(400);
    expect((await POST(request("POST", "", { condition: {} }))).status).toBe(
      400,
    );
    const switched = new Request(
      "http://localhost/api/studio/exam-conditions",
      {
        headers: { "x-workspace-owner": other },
      },
    );
    expect((await GET(switched)).status).toBe(403);
    account.menus = ["library"];
    expect((await GET(request("GET"))).status).toBe(403);
    account.menus = ["bank"];
    userOk = false;
    expect((await GET(request("GET"))).status).toBe(403);
  });

  it("refuses cross-site mutations", async () => {
    const response = await POST(
      new Request("http://localhost/api/studio/exam-conditions", {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({ condition: condition({ name: "x" }) }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
