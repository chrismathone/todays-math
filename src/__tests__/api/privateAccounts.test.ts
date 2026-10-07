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
  documentAsset: { deleteMany: vi.fn(), createMany: vi.fn() },
  audit: { create: vi.fn(), createMany: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => {
  const db = {
    eywaManagedAccount: { findUnique: vi.fn(async () => null) },
    user: mocks.user,
    workspaceDocument: mocks.doc,
    workspaceAsset: mocks.asset,
    workspaceDocumentAsset: mocks.documentAsset,
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
import type { ConceptBlankSelection } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { composeSheets, sheetItemCount } from "@/lib/concept-blank/compose";

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
  it.each([false, true])(
    "rejects private storage access for a zero-menu owner/superadmin=%s",
    async (isSuperAdmin) => {
      login({ isAdmin: true, isSuperAdmin, menus: [] });
      expect((await readDocument(request(), "draft-1")).status).toBe(403);
      expect(
        (await writePrivateAsset(request("PUT", { data: "image" }), "asset-1"))
          .status,
      ).toBe(403);
      expect(mocks.doc.findFirst).not.toHaveBeenCalled();
      expect(mocks.asset.create).not.toHaveBeenCalled();
    },
  );
  it("requires a session, approval, and separate administrator privilege", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await authorizeAccount(request())).response?.status).toBe(401);
    login({ approvalStatus: "pending" });
    expect((await authorizeAccount(request())).response?.status).toBe(403);
    login();
    expect((await authorizeAccount(request(), true)).response?.status).toBe(
      403,
    );
    login({ isAdmin: true, isSuperAdmin: true });
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
      include: { user: { select: { name: true } } },
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
      include: { user: { select: { name: true } } },
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
    login({ isAdmin: true, isSuperAdmin: true });
    mocks.doc.findUnique.mockResolvedValue({
      ...document,
      userId: otherId,
      payload: { image: "/api/library/assets/abc" },
    });
    const response = await readDocument(request(), "draft-1", otherId);
    expect(mocks.doc.findUnique).toHaveBeenCalledWith({
      where: { userId_id: { userId: otherId, id: "draft-1" } },
      include: { user: { select: { name: true } } },
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
  it("rejects a concurrent update between the initial read and the revision-fenced write", async () => {
    mocks.doc.updateMany.mockResolvedValue({ count: 0 });
    const response = await saveDocument(
      request("PUT", {
        kind: "draft",
        title: "늦은 수정",
        payload: { problems: [] },
        expectedRevision: 1,
      }),
      "draft-1",
    );
    expect(response.status).toBe(409);
    expect(mocks.doc.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, id: "draft-1", revision: 1 },
      }),
    );
    expect(mocks.doc.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(mocks.audit.create).not.toHaveBeenCalled();
  });

  it("rejects changing document kind even with the current revision", async () => {
    const response = await saveDocument(
      request("PUT", {
        kind: "extraction",
        title: "다른 자료",
        payload: { data: { crops: [] } },
        expectedRevision: 1,
      }),
      "draft-1",
    );
    expect(response.status).toBe(409);
    expect(mocks.doc.updateMany).not.toHaveBeenCalled();
    expect(mocks.audit.create).not.toHaveBeenCalled();
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
  it.each([false, true])(
    "requires the editor and library menus independently for privileged accounts, superadmin=%s",
    async (isSuperAdmin) => {
      login({ isAdmin: true, isSuperAdmin, menus: ["library"] });
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
      login({ isAdmin: true, isSuperAdmin, menus: ["export"] });
      expect(
        (
          await deleteDocument(
            request(
              "DELETE",
              undefined,
              "/api/library/documents/draft-1?revision=1",
            ),
            "draft-1",
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await renameDocument(
            request("PATCH", { title: "시험지", expectedRevision: 1 }),
            "draft-1",
          )
        ).status,
      ).toBe(403);
      expect(mocks.doc.updateMany).not.toHaveBeenCalled();
      expect(mocks.doc.deleteMany).not.toHaveBeenCalled();
    },
  );
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

// 원장님 2026-10-01 «개념 백지를 담아서 내 시험지에 저장하고 다음에 또 쓸수 있게»(26 §9 ⑾) — 고르기만 담는다(고정 문항).
describe("concept blank in 내 시험지", () => {
  const selection: ConceptBlankSelection = {
    sections: ["초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기"],
    forms: [
      {
        form: "term",
        counts: { 하: 10, 중: 10, 상: 10 },
        extras: { 하: 10, 중: 10, 상: 10 },
      },
    ],
    title: "합동 백지",
  };
  const blankRequest = (body: unknown) =>
    request("PUT", body, "/api/library/documents/blank-1");

  it("saves the selection and counts the items its sheets print", async () => {
    mocks.doc.findUnique.mockResolvedValue(null);
    const response = await saveDocument(
      blankRequest({
        kind: "conceptBlank",
        title: "합동 백지",
        payload: { selection },
        expectedRevision: null,
      }),
      "blank-1",
    );
    expect(response.status).toBe(200);
    const printed = composeSheets(selection, CONCEPT_BLANK_BANK).reduce(
      (n, sheet) => n + sheetItemCount(sheet),
      0,
    );
    expect(printed).toBeGreaterThan(0);
    expect(mocks.doc.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        id: "blank-1",
        kind: "conceptBlank",
        payload: { selection },
        problemCount: printed,
      }),
    });
  });

  it("refuses anything but a dateless selection — reopening prints today", async () => {
    mocks.doc.findUnique.mockResolvedValue(null);
    for (const payload of [
      { selection: { ...selection, date: "2026-10-01" } },
      { selection: { ...selection, sections: [] } },
      { problems: [] },
    ])
      expect(
        (
          await saveDocument(
            blankRequest({
              kind: "conceptBlank",
              title: "합동 백지",
              payload,
              expectedRevision: null,
            }),
            "blank-1",
          )
        ).status,
      ).toBe(400);
    expect(mocks.doc.create).not.toHaveBeenCalled();
  });

  it("needs the 개념 백지 menu to save", async () => {
    login({ menus: ["library"] });
    mocks.doc.findUnique.mockResolvedValue(null);
    expect(
      (
        await saveDocument(
          blankRequest({
            kind: "conceptBlank",
            title: "합동 백지",
            payload: { selection },
            expectedRevision: null,
          }),
          "blank-1",
        )
      ).status,
    ).toBe(403);
    expect(mocks.doc.create).not.toHaveBeenCalled();
  });

  it("renaming keeps the sheet title in step, 40 characters at most", async () => {
    mocks.doc.findFirst.mockResolvedValue({
      ...document,
      id: "blank-1",
      kind: "conceptBlank",
      payload: { selection },
    });
    const rename = (title: string) =>
      renameDocument(
        request(
          "PATCH",
          { title, expectedRevision: 1 },
          "/api/library/documents/blank-1",
        ),
        "blank-1",
      );
    expect((await rename("3월 2주 백지")).status).toBe(200);
    expect(mocks.doc.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "3월 2주 백지",
          payload: { selection: { ...selection, title: "3월 2주 백지" } },
        }),
      }),
    );
    mocks.doc.updateMany.mockClear();
    expect((await rename("가".repeat(41))).status).toBe(400);
    expect(mocks.doc.updateMany).not.toHaveBeenCalled();
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
    login({ isAdmin: true, isSuperAdmin: true });
    mocks.user.findFirst.mockResolvedValue({
      ...account,
      isAdmin: true,
      isSuperAdmin: true,
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
    login({ isAdmin: true, isSuperAdmin: true });
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
    login({ isAdmin: true, isSuperAdmin: true });
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
  it("🔴 accepts but does not store UI telemetry from an account that is not approved", async () => {
    // 가입은 열려 있다 — 승인받지 않은 계정이 요청마다 50줄씩 끝없이 쌓을 수 있었다(2026-10-07 검수).
    // 화면의 기록기가 재시도 · 오류로 번지지 않게 응답은 승인 계정과 같은 204 다.
    for (const approvalStatus of ["pending", "rejected"] as const) {
      login({ approvalStatus });
      const response = await activity(
        request("POST", {
          ownerId: userId,
          events: [
            {
              id: crypto.randomUUID(),
              action: "click",
              label: "승인 대기",
              path: "/approval-pending",
            },
          ],
        }),
      );
      expect(response.status).toBe(204);
    }
    expect(mocks.audit.createMany).not.toHaveBeenCalled();
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
