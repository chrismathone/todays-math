// All storage is mocked: the configured database is shared production.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  ALL_WORKSPACE_MENUS,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  user: { findFirst: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  doc: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    deleteMany: vi.fn(),
  },
  asset: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  audit: { create: vi.fn(), createMany: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => {
  const db = {
    user: mocks.user,
    workspaceDocument: mocks.doc,
    workspaceAsset: mocks.asset,
    accountAuditLog: mocks.audit,
  };
  return {
    db: {
      ...db,
      $transaction: async (fn: (tx: typeof db) => unknown) => fn(db),
    },
  };
});
import { authorizeAccount } from "@/lib/accountAccess";
import {
  readDocument,
  saveDocument,
  deleteDocument,
  renameDocument,
} from "@/lib/privateDocumentActions";
import { readPrivateAsset, writePrivateAsset } from "@/lib/privateAssets";
import { PATCH as updateAccount } from "@/app/api/admin/users/[id]/route";
import { POST as activity } from "@/app/api/account/activity/route";
import { auditData } from "@/lib/audit";

const userId = "10000000-0000-4000-8000-000000000001";
const otherId = "20000000-0000-4000-8000-000000000002";
const account: AccountAccess = {
  id: userId,
  name: "선생님",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: [...ALL_WORKSPACE_MENUS],
};
const date = new Date("2026-09-14T00:00:00.000Z");
const document = {
  userId,
  id: "draft-1",
  kind: "draft",
  title: "기출",
  payload: { problems: [] },
  problemCount: 0,
  revision: 1,
  createdAt: date,
  updatedAt: date,
};
function login(patch: Partial<AccountAccess> = {}) {
  mocks.auth.mockResolvedValue({ user: { ...account, ...patch } });
}
function request(
  method = "GET",
  body?: unknown,
  path = "/api/library/documents/draft-1",
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { origin: "http://localhost", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  login();
  mocks.audit.create.mockResolvedValue({});
  mocks.audit.createMany.mockResolvedValue({ count: 1 });
  mocks.doc.findUnique.mockResolvedValue(document);
  mocks.doc.findUniqueOrThrow.mockResolvedValue({ ...document, revision: 2 });
  mocks.doc.updateMany.mockResolvedValue({ count: 1 });
  mocks.doc.deleteMany.mockResolvedValue({ count: 1 });
  mocks.doc.findFirst.mockResolvedValue(document);
  mocks.asset.findUnique.mockResolvedValue(null);
  mocks.user.findFirst.mockResolvedValue({
    ...account,
    disabledMenus: [],
    createdAt: date,
    updatedAt: date,
  });
});

describe("account guards", () => {
  it("requires a session, approval, and separate administrator privilege", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await authorizeAccount(request())).response?.status).toBe(401);
    login({ approvalStatus: "pending" });
    expect((await authorizeAccount(request())).response?.status).toBe(403);
    login();
    expect((await authorizeAccount(request(), true)).response?.status).toBe(
      403,
    );
    login({ isAdmin: true });
    expect((await authorizeAccount(request(), true)).account?.id).toBe(userId);
  });
  it("rejects cross-origin and missing-origin mutations", async () => {
    expect(
      (
        await authorizeAccount(
          request("PATCH", {}, "/api/admin/users", {
            origin: "https://evil.test",
          }),
        )
      ).response?.status,
    ).toBe(403);
    expect(
      (
        await authorizeAccount(
          new Request("http://localhost/api/admin/users", { method: "PATCH" }),
        )
      ).response?.status,
    ).toBe(403);
  });
  it("does not allow a stale browser account queue to write under a new session", async () => {
    const response = await saveDocument(
      request(
        "PUT",
        {
          kind: "draft",
          title: "시험지",
          payload: { problems: [] },
          expectedRevision: 1,
        },
        undefined,
        { "x-workspace-owner": otherId },
      ),
      "draft-1",
    );
    expect(response.status).toBe(403);
    expect(mocks.doc.updateMany).not.toHaveBeenCalled();
  });
});

describe("private material ownership and revision control", () => {
  it("always scopes ordinary reads to the authenticated owner and excludes owner fields", async () => {
    const response = await readDocument(
      request(
        "GET",
        undefined,
        "/api/library/documents/draft-1?userId=" + otherId,
      ),
      "draft-1",
    );
    expect(mocks.doc.findUnique).toHaveBeenCalledWith({
      where: { userId_id: { userId, id: "draft-1" } },
    });
    expect((await response.json()).data).not.toHaveProperty("userId");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("D-130 ⑶: an admin's ordinary read is still scoped to the admin's own materials", async () => {
    login({ isAdmin: true });
    await readDocument(
      request(
        "GET",
        undefined,
        "/api/library/documents/draft-1?userId=" + otherId,
      ),
      "draft-1",
    );
    expect(mocks.doc.findUnique).toHaveBeenCalledWith({
      where: { userId_id: { userId, id: "draft-1" } },
    });
    // 남의 자료를 여는 길은 감사 기록을 남기는 관리자 점검(ownerId 지정) 하나뿐이다
    expect(mocks.audit.create).not.toHaveBeenCalled();
  });
  it("does not let a regular account read another user's admin resource", async () => {
    expect((await readDocument(request(), "draft-1", otherId)).status).toBe(
      403,
    );
    expect(mocks.doc.findUnique).not.toHaveBeenCalled();
  });
  it("admin inspection uses target ownership and authenticated asset URLs", async () => {
    login({ isAdmin: true });
    mocks.doc.findUnique.mockResolvedValue({
      ...document,
      userId: otherId,
      payload: { image: "/api/library/assets/abc" },
    });
    const response = await readDocument(request(), "draft-1", otherId);
    expect(mocks.doc.findUnique).toHaveBeenCalledWith({
      where: { userId_id: { userId: otherId, id: "draft-1" } },
    });
    expect((await response.json()).data.payload.image).toBe(
      `/api/admin/users/${otherId}/assets/abc`,
    );
    expect(mocks.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: otherId, actorId: userId }),
      }),
    );
  });
  it("stale saves and deletes leave existing material untouched", async () => {
    const response = await saveDocument(
      request("PUT", {
        kind: "draft",
        title: "시험지",
        payload: { problems: [] },
        expectedRevision: 0,
      }),
      "draft-1",
    );
    expect(response.status).toBe(409);
    expect(mocks.doc.updateMany).not.toHaveBeenCalled();
    mocks.doc.findFirst.mockResolvedValue(null);
    expect(
      (
        await deleteDocument(
          request(
            "DELETE",
            undefined,
            "/api/library/documents/draft-1?revision=8",
          ),
          "draft-1",
        )
      ).status,
    ).toBe(409);
    expect(mocks.doc.deleteMany).not.toHaveBeenCalled();
  });
  it("creates in the caller's DB scope and records completed save metadata", async () => {
    mocks.doc.findUnique.mockResolvedValue(null);
    const response = await saveDocument(
      request("PUT", {
        kind: "draft",
        title: "시험지",
        payload: { problems: [] },
        expectedRevision: null,
      }),
      "draft-1",
    );
    expect(response.status).toBe(200);
    expect(mocks.doc.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId, id: "draft-1" }),
      }),
    );
    expect(mocks.audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "material.created",
        outcome: "success",
        userId,
        actorId: userId,
      }),
    });
  });
  it("checks the editor menu even when library reads are permitted", async () => {
    login({ menus: ["library"] });
    expect(
      (
        await saveDocument(
          request("PUT", {
            kind: "draft",
            title: "시험지",
            payload: { problems: [] },
            expectedRevision: 1,
          }),
          "draft-1",
        )
      ).status,
    ).toBe(403);
    expect(mocks.doc.updateMany).not.toHaveBeenCalled();
  });
  it("allows library-only renaming without exposing editing permission", async () => {
    login({ menus: ["library"] });
    expect(
      (
        await renameDocument(
          request("PATCH", { title: "새 이름", expectedRevision: 1 }),
          "draft-1",
        )
      ).status,
    ).toBe(200);
    expect(mocks.doc.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, id: "draft-1", revision: 1 },
        data: expect.objectContaining({
          title: "새 이름",
          payload: expect.objectContaining({ title: "새 이름" }),
        }),
      }),
    );
  });
});

describe("immutable private assets", () => {
  it("stores verified image bytes in the caller's owner scope", async () => {
    const bytes = new TextEncoder().encode("image fixture");
    const id = createHash("sha256").update(bytes).digest("hex");
    const response = await writePrivateAsset(
      new Request("http://localhost/api/library/assets/" + id, {
        method: "PUT",
        headers: {
          origin: "http://localhost",
          "content-type": "image/png",
          "content-range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
        },
        body: bytes,
      }),
      id,
    );
    expect(response.status).toBe(200);
    expect(mocks.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId, id, size: bytes.length }),
      }),
    );
  });
  it("rejects hash mismatches and never serves an incomplete upload", async () => {
    const id = "a".repeat(64);
    const response = await writePrivateAsset(
      new Request("http://localhost/api/library/assets/" + id, {
        method: "PUT",
        headers: {
          origin: "http://localhost",
          "content-type": "image/png",
          "content-range": "bytes 0-0/1",
        },
        body: new Uint8Array([1]),
      }),
      id,
    );
    expect(response.status).toBe(409);
    expect(mocks.asset.create).not.toHaveBeenCalled();
    mocks.asset.findUnique.mockResolvedValue({
      bytes: new Uint8Array([1]),
      size: 2,
    });
    expect((await readPrivateAsset(request(), id)).status).toBe(404);
  });
});

describe("administrator changes and activity integrity", () => {
  it("refuses changing administrator privileges through the account form", async () => {
    login({ isAdmin: true });
    mocks.user.findFirst.mockResolvedValue({
      ...account,
      isAdmin: true,
      disabledMenus: [],
      createdAt: date,
      updatedAt: date,
    });
    expect(
      (
        await updateAccount(
          request("PATCH", {
            approvalStatus: "rejected",
            expectedUpdatedAt: date.toISOString(),
          }),
          { params: Promise.resolve({ id: otherId }) },
        )
      )?.status,
    ).toBe(403);
    expect(mocks.user.updateMany).not.toHaveBeenCalled();
  });
  it("rejects stale admin changes and does not record them as completed", async () => {
    login({ isAdmin: true });
    mocks.user.updateMany.mockResolvedValue({ count: 0 });
    expect(
      (
        await updateAccount(
          request("PATCH", {
            menus: [],
            expectedUpdatedAt: date.toISOString(),
          }),
          { params: Promise.resolve({ id: otherId }) },
        )
      )?.status,
    ).toBe(409);
    expect(mocks.audit.create).not.toHaveBeenCalled();
  });
  it("applies approval and menu change together with an audit record", async () => {
    login({ isAdmin: true });
    mocks.user.updateMany.mockResolvedValue({ count: 1 });
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      ...account,
      id: otherId,
      disabledMenus: ["studio"],
      createdAt: date,
      updatedAt: date,
    });
    const response = await updateAccount(
      request("PATCH", {
        approvalStatus: "approved",
        menus: ["library"],
        expectedUpdatedAt: date.toISOString(),
      }),
      { params: Promise.resolve({ id: otherId }) },
    );
    expect(response?.status).toBe(200);
    expect(mocks.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          approvalStatus: "approved",
          disabledMenus: ALL_WORKSPACE_MENUS.filter(
            (menu) => menu !== "library",
          ),
        },
      }),
    );
    expect(mocks.audit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "account.settings_changed",
        userId: otherId,
        actorId: userId,
      }),
    });
  });
  it("deduplicates UI telemetry and separates it from confirmed server actions", async () => {
    const id = crypto.randomUUID();
    const response = await activity(
      request("POST", {
        ownerId: userId,
        events: [
          {
            id,
            action: "click",
            label: "자료 저장",
            path: "/#library?token=secret",
          },
        ],
      }),
    );
    expect(response.status).toBe(204);
    expect(mocks.audit.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        expect.objectContaining({
          eventId: `${userId}:${id}`,
          action: "ui.click",
          outcome: "requested",
          details: { label: "자료 저장", path: "/#library" },
        }),
      ],
    });
  });
  it("rejects foreign-owner or forged confirmed-action telemetry", async () => {
    expect(
      (
        await activity(
          request("POST", {
            ownerId: otherId,
            events: [
              {
                id: crypto.randomUUID(),
                action: "click",
                label: "저장",
                path: "/",
              },
            ],
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await activity(
          request("POST", {
            ownerId: userId,
            events: [
              {
                id: crypto.randomUUID(),
                action: "account.settings_changed",
                label: "저장",
                path: "/",
              },
            ],
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.audit.createMany).not.toHaveBeenCalled();
  });
  it("omits passwords, tokens and material bodies from server audit details", () => {
    expect(
      auditData({
        action: "test",
        outcome: "requested",
        details: {
          password: "secret",
          accessToken: "secret",
          cookie: "secret",
          payload: "secret",
          title: "시험지",
        },
      }).details,
    ).toEqual({ title: "시험지" });
  });
});
