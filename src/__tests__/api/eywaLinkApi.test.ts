// @vitest-environment node
/**
 * `POST|DELETE /api/account/eywa-link` — eywa 연결·연결 안 함·해제 (D-139 ⑹).
 *
 * 세션은 `auth()` 만 대역으로 세우고 `getAccountAccess`·`sameOriginMutation`·`recordAudit` 는 **진짜**를 탄다
 * (세션을 통째로 모킹하면 «학생 세션은 user 가 없다» 같은 겹이 안 보인다). 연결 대기 쿠키는 진짜 봉인 함수로 만든다.
 *
 * 🔴 양방향 유일 — 이 계정에 이미 다른 sub 가 있으면 덮어쓰지 않고, 이 sub 가 다른 계정에 있으면 거절한다.
 *    마지막 벽은 조건부 update(`eywaUserId: null`)와 유일 색인(P2002) — 둘 다 «거절»로 받는다.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  process.env.AUTH_SECRET = "eywa-link-api-test-secret-0123456789abcdef";
  process.env.AUTH_URL = "http://localhost:3000";
  return { origin: "http://localhost:3000" };
});

const state = vi.hoisted(() => ({
  session: null as unknown,
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  audits: [] as Record<string, unknown>[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
vi.mock("@/lib/db", () => {
  const client = {
    user: { findUnique: state.findUnique, updateMany: state.updateMany },
    accountAuditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return data;
      }),
    },
  };
  return {
    db: {
      ...client,
      $transaction: async (fn: (tx: typeof client) => unknown) => fn(client),
    },
  };
});

import { Prisma } from "@prisma/client";

import { DELETE, POST } from "@/app/api/account/eywa-link/route";
import { EYWA_LINK_MESSAGES } from "@/contracts/eywaLink.contract";
import {
  EYWA_LINK_PENDING_COOKIE,
  sealEywaLinkPending,
} from "@/lib/eywaLinkPending";

const ME = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const SUB = "5b1c7e9a-2d4f-4a6b-9c8d-0e1f2a3b4c5d";
const OTHER_SUB = "6c2d8f0b-3e5a-4b7c-8d9e-1f2a3b4c5d6e";
const EYWA_EMAIL = "eywa-person@example.test";
const MY_EMAIL = "teacher@example.test";

const directorSession = (over: Record<string, unknown> = {}) => ({
  user: {
    id: ME,
    name: "선생님",
    email: MY_EMAIL,
    role: "director",
    isAdmin: false,
    isSuperAdmin: false,
    approvalStatus: "approved",
    menus: [],
    ...over,
  },
  expires: "2099-01-01T00:00:00.000Z",
});
const studentSession = {
  student: {
    accountId: "20000000-0000-4000-8000-000000000001",
    studentId: "30000000-0000-4000-8000-000000000001",
    name: "이서준",
    mustChangePassword: false,
  },
  expires: "2099-01-01T00:00:00.000Z",
};

const pending = (now = new Date(), secret = process.env.AUTH_SECRET) =>
  sealEywaLinkPending(
    { sub: SUB, name: "김선생", email: EYWA_EMAIL },
    { secret, now },
  )!;

function request(
  method: "POST" | "DELETE",
  body: unknown,
  {
    cookie = `${EYWA_LINK_PENDING_COOKIE}=${pending()}`,
    origin = env.origin,
    site = "same-origin",
  } = {},
) {
  return new NextRequest(`${env.origin}/api/account/eywa-link`, {
    method,
    headers: {
      origin,
      "sec-fetch-site": site,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const post = (body: unknown, opts?: Parameters<typeof request>[2]) =>
  (POST as unknown as (r: NextRequest) => Promise<Response>)(
    request("POST", body, opts),
  );
const del = (opts?: Parameters<typeof request>[2]) =>
  (DELETE as unknown as (r: NextRequest) => Promise<Response>)(
    request("DELETE", undefined, opts),
  );

const pendingCleared = (res: Response) =>
  (res as unknown as { cookies: NextRequest["cookies"] }).cookies.get(
    EYWA_LINK_PENDING_COOKIE,
  );

/** 행 둘 — 나(연결 안 됨) · 다른 계정(연결 안 됨). 이메일·id·sub 로 찾는다 */
let rows: Record<string, Record<string, unknown>>;
function seed(
  me: Record<string, unknown> = {},
  other: Record<string, unknown> = {},
) {
  rows = {
    [ME]: {
      id: ME,
      eywaUserId: null,
      deletedAt: null,
      suspendedAt: null,
      ...me,
    },
    [OTHER]: {
      id: OTHER,
      eywaUserId: null,
      deletedAt: null,
      suspendedAt: null,
      ...other,
    },
  };
}

beforeEach(() => {
  state.session = directorSession();
  state.audits.length = 0;
  state.findUnique.mockReset();
  state.updateMany.mockReset();
  seed();
  state.findUnique.mockImplementation(
    async ({ where }: { where: { id?: string; eywaUserId?: string } }) =>
      Object.values(rows).find((row) =>
        where.id !== undefined
          ? row.id === where.id
          : row.eywaUserId === where.eywaUserId,
      ) ?? null,
  );
  state.updateMany.mockResolvedValue({ count: 1 });
});

describe("POST — 문지기", () => {
  it.each([
    ["다른 사이트 origin", { origin: "https://evil.example" }],
    ["cross-site 표시", { site: "cross-site" }],
  ])("🔴 %s → 403 · DB 안 건드림 · 감사 없음", async (_label, opts) => {
    const res = await post({ action: "link" }, opts);
    expect(res.status).toBe(403);
    expect(await res.json()).toStrictEqual({
      error: { code: "FORBIDDEN", message: "같은 사이트에서 요청해 주세요." },
    });
    expect(state.findUnique).not.toHaveBeenCalled();
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(state.audits).toStrictEqual([]);
  });

  it.each([
    ["로그인 안 함", null],
    ["🔴 학생 세션", studentSession],
  ])("%s → 401 · DB 안 건드림", async (_label, session) => {
    state.session = session;
    const res = await post({ action: "link" });
    expect(res.status).toBe(401);
    expect(state.findUnique).not.toHaveBeenCalled();
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["action 없음", {}],
    ["모르는 action", { action: "steal" }],
    ["다른 계정 id 를 끼워 넣음", { action: "link", userId: OTHER }],
    ["sub 를 끼워 넣음", { action: "link", eywaUserId: OTHER_SUB }],
  ])("%s → 400", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(state.updateMany).not.toHaveBeenCalled();
  });
});

describe("POST link", () => {
  it("🔴 성공 — 조건부 update(eywaUserId: null)로 이 계정에만 · 쿠키 삭제 · 감사에 이메일 없음", async () => {
    const res = await post({ action: "link" });
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ data: { linked: true } });
    expect(state.updateMany).toHaveBeenCalledTimes(1);
    expect(state.updateMany).toHaveBeenCalledWith({
      where: { id: ME, eywaUserId: null, deletedAt: null, suspendedAt: null },
      data: { eywaUserId: SUB, eywaLinkedAt: expect.any(Date) },
    });
    expect(pendingCleared(res)).toMatchObject({
      value: "",
      path: "/",
      maxAge: 0,
    });
    expect(state.audits).toStrictEqual([
      {
        userId: ME,
        actorId: ME,
        action: "auth.eywa-link",
        outcome: "success",
        details: { action: "link", eywaUserId: SUB },
      },
    ]);
    const written = JSON.stringify(state.audits);
    expect(written).not.toContain(EYWA_EMAIL);
    expect(written).not.toContain(MY_EMAIL);
  });

  it("승인 대기 계정도 연결한다 (SSO 가 승인 대기를 들이는 것과 같은 문턱)", async () => {
    state.session = directorSession({ approvalStatus: "pending" });
    expect((await post({ action: "link" })).status).toBe(200);
  });

  it("🔴 이 계정에 이미 다른 sub 가 있으면 덮어쓰지 않고 거절 (409) · 쿠키 삭제 · 감사 denied", async () => {
    seed({ eywaUserId: OTHER_SUB });
    const res = await post({ action: "link" });
    expect(res.status).toBe(409);
    expect(await res.json()).toStrictEqual({
      error: { code: "CONFLICT", message: EYWA_LINK_MESSAGES.accountLinked },
    });
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(rows[ME].eywaUserId).toBe(OTHER_SUB);
    expect(pendingCleared(res)).toMatchObject({ value: "", maxAge: 0 });
    expect(state.audits).toStrictEqual([
      {
        userId: ME,
        actorId: ME,
        action: "auth.eywa-link",
        outcome: "denied",
        details: { action: "link", eywaUserId: SUB, reason: "account-linked" },
      },
    ]);
  });

  it("🔴 이 sub 가 이미 다른 계정에 있으면 거절 (409)", async () => {
    seed({}, { eywaUserId: SUB });
    const res = await post({ action: "link" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toBe(
      EYWA_LINK_MESSAGES.eywaLinked,
    );
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(state.audits[0]).toMatchObject({
      outcome: "denied",
      details: { reason: "eywa-linked-elsewhere" },
    });
  });

  it("🔴 유일 색인 위반(P2002 — 앞 확인과 쓰기 사이에 남이 먼저 묶음)도 거절로 받는다", async () => {
    state.updateMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await post({ action: "link" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toBe(
      EYWA_LINK_MESSAGES.eywaLinked,
    );
    expect(pendingCleared(res)).toMatchObject({ maxAge: 0 });
    expect(state.audits).toMatchObject([
      { outcome: "denied", details: { reason: "eywa-linked-elsewhere" } },
    ]);
  });

  it("🔴 조건부 update 가 0행(경주 — 그 사이 연결·정지·삭제) → 409, 덮어쓰지 않음", async () => {
    state.updateMany.mockResolvedValue({ count: 0 });
    const res = await post({ action: "link" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toBe(EYWA_LINK_MESSAGES.changed);
    expect(state.audits).toMatchObject([
      { outcome: "denied", details: { reason: "changed" } },
    ]);
  });

  it("같은 sub 로 이미 연결돼 있으면 쓰지 않고 성공", async () => {
    seed({ eywaUserId: SUB });
    const res = await post({ action: "link" });
    expect(res.status).toBe(200);
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(pendingCleared(res)).toMatchObject({ maxAge: 0 });
  });

  it.each([
    ["쿠키 없음", ""],
    [
      "🔴 다른 열쇠로 봉인",
      `${EYWA_LINK_PENDING_COOKIE}=${pending(new Date(), "another-auth-secret-0123456789abcdef")}`,
    ],
    [
      "🔴 만료(11분 전)",
      `${EYWA_LINK_PENDING_COOKIE}=${pending(new Date(Date.now() - 11 * 60_000))}`,
    ],
    ["🔴 위조", `${EYWA_LINK_PENDING_COOKIE}=v1.eyJzdWIiOiJ4In0.AAAA`],
  ])(
    "%s → 404 · 쓰기 없음 · 쿠키 삭제 · 감사 failed",
    async (_label, cookie) => {
      const res = await post({ action: "link" }, { cookie });
      expect(res.status).toBe(404);
      expect(await res.json()).toStrictEqual({
        error: { code: "NOT_FOUND", message: EYWA_LINK_MESSAGES.expired },
      });
      expect(state.updateMany).not.toHaveBeenCalled();
      expect(pendingCleared(res)).toMatchObject({ value: "", maxAge: 0 });
      expect(state.audits).toStrictEqual([
        {
          userId: ME,
          actorId: ME,
          action: "auth.eywa-link",
          outcome: "failed",
          details: { action: "link", reason: "expired" },
        },
      ]);
    },
  );
});

describe("POST dismiss", () => {
  it("쿠키만 지우고 감사 — 쓰기 없음", async () => {
    const res = await post({ action: "dismiss" });
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ data: { dismissed: true } });
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(pendingCleared(res)).toMatchObject({
      value: "",
      path: "/",
      maxAge: 0,
    });
    expect(state.audits).toStrictEqual([
      {
        userId: ME,
        actorId: ME,
        action: "auth.eywa-link",
        outcome: "success",
        details: { action: "dismiss", eywaUserId: SUB },
      },
    ]);
  });

  it("쿠키가 이미 없거나 만료여도 지우기만 하고 성공 (감사는 남길 것이 없다)", async () => {
    const res = await post({ action: "dismiss" }, { cookie: "" });
    expect(res.status).toBe(200);
    expect(pendingCleared(res)).toMatchObject({ maxAge: 0 });
    expect(state.audits).toStrictEqual([]);
  });
});

describe("DELETE — 계정 주인이 자기 연결을 푼다 (화면 없음)", () => {
  it("연결돼 있으면 두 칸을 비우고 감사 auth.eywa-unlink", async () => {
    seed({ eywaUserId: SUB });
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ data: { unlinked: true } });
    expect(state.updateMany).toHaveBeenCalledWith({
      where: { id: ME, eywaUserId: SUB },
      data: { eywaUserId: null, eywaLinkedAt: null },
    });
    expect(state.audits).toStrictEqual([
      {
        userId: ME,
        actorId: ME,
        action: "auth.eywa-unlink",
        outcome: "success",
        details: { eywaUserId: SUB, by: "self" },
      },
    ]);
  });

  it("연결이 없으면 404 · 쓰기 없음", async () => {
    const res = await del();
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toBe(EYWA_LINK_MESSAGES.notLinked);
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it("경주로 0행이면 409", async () => {
    seed({ eywaUserId: SUB });
    state.updateMany.mockResolvedValue({ count: 0 });
    expect((await del()).status).toBe(409);
  });

  it.each([
    ["다른 사이트", { origin: "https://evil.example" }, directorSession(), 403],
    ["로그인 안 함", {}, null, 401],
    ["🔴 학생 세션", {}, studentSession, 401],
  ] as const)("%s → %i · 쓰기 없음", async (_label, opts, session, status) => {
    seed({ eywaUserId: SUB });
    state.session = session;
    expect((await del(opts)).status).toBe(status);
    expect(state.updateMany).not.toHaveBeenCalled();
  });
});
