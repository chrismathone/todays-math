// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorized: true,
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: vi.fn(async () =>
    state.authorized
      ? { account: { id: "self-id" }, response: null }
      : {
          account: null,
          response: Response.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 },
          ),
        },
  ),
}));
vi.mock("@/lib/db", () => {
  const tx = {
    user: { updateMany: state.updateMany },
    accountAuditLog: { create: state.auditCreate },
  };
  return {
    db: {
      user: { findUnique: state.findUnique },
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    },
  };
});
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));

import { PATCH } from "@/app/api/account/profile/route";

const date = new Date("2026-09-23T00:00:00.000Z");
const request = (body: unknown) =>
  new Request("http://localhost/api/account/profile", {
    method: "PATCH",
    headers: { origin: "http://localhost", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  state.findUnique.mockReset();
  state.updateMany.mockReset();
  state.auditCreate.mockReset();
  state.authorized = true;
  state.findUnique
    .mockResolvedValueOnce({
      name: "기존 이름",
      deletedAt: null,
      suspendedAt: null,
    })
    .mockResolvedValueOnce({ name: "새 이름", updatedAt: date });
  state.updateMany.mockResolvedValue({ count: 1 });
  state.auditCreate.mockResolvedValue({});
});

describe("self profile changes", () => {
  it("requires an approved session before touching account data", async () => {
    state.authorized = false;
    expect((await PATCH(request({ name: "새 이름" }))).status).toBe(401);
    expect(state.findUnique).not.toHaveBeenCalled();
  });

  it("rejects attempts to submit another user's identity", async () => {
    expect(
      (await PATCH(request({ name: "새 이름", userId: "other-id" }))).status,
    ).toBe(400);
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it("changes only the session owner's name and records an audit event", async () => {
    const response = await PATCH(request({ name: " 새 이름 " }));
    expect(response.status).toBe(200);
    expect(state.updateMany).toHaveBeenCalledWith({
      where: {
        id: "self-id",
        name: "기존 이름",
        deletedAt: null,
        suspendedAt: null,
      },
      data: { name: "새 이름" },
    });
    expect(state.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "self-id",
        actorId: "self-id",
        action: "account.profile_updated",
      }),
    });
    expect((await response.json()).data).toEqual({
      name: "새 이름",
      updatedAt: date.toISOString(),
    });
  });

  it("does not write an audit event when a concurrent change prevents saving", async () => {
    state.updateMany.mockResolvedValue({ count: 0 });
    expect((await PATCH(request({ name: "새 이름" }))).status).toBe(409);
    expect(state.auditCreate).not.toHaveBeenCalled();
  });
});
