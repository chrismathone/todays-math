import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
vi.mock("server-only", () => ({}));
type Token = Record<string, unknown>;
type AuthConfig = {
  callbacks: {
    jwt: (input: {
      token: Token;
      user?: { id: string };
      trigger?: string;
      session?: unknown;
    }) => Promise<Token | null>;
  };
};
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  configuration: { value: null as unknown as AuthConfig },
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.findUnique },
    eywaManagedAccount: { findUnique: vi.fn(async () => null) },
    accountAuditLog: { create: vi.fn() },
  },
}));
vi.mock("next-auth", () => ({
  default: (configuration: AuthConfig) => {
    mocks.configuration.value = configuration;
    return { auth: vi.fn() };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (configuration: unknown) => configuration,
}));
import "@/lib/auth";
const user = {
  id: "u1",
  name: "선생님",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  disabledMenus: [],
  deletedAt: null,
};
beforeEach(() => {
  vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
  vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "");
  mocks.findUnique.mockReset();
  mocks.findUnique.mockResolvedValue(user);
});
afterEach(() => vi.unstubAllEnvs());
describe("existing session access refresh", () => {
  it.each([null, "branch-b"])(
    "invalidates the old session after membership changes to %s",
    async (branchId) => {
      mocks.findUnique.mockResolvedValue({
        ...user,
        branchId,
        branchRole: branchId ? "teacher" : null,
        sessionVersion: 2,
      });
      expect(
        await mocks.configuration.value.callbacks.jwt({
          token: { id: "u1", branchId: "branch-a", sessionVersion: 1 },
        }),
      ).toBeNull();
      expect(
        await mocks.configuration.value.callbacks.jwt({
          token: { id: "u1", sessionVersion: 2 },
        }),
      ).toMatchObject({
        branchId,
        branchRole: branchId ? "teacher" : null,
        isAdmin: false,
      });
    },
  );
  it("keeps legacy English denials and immediately applies individual menu revocation", async () => {
    mocks.findUnique.mockResolvedValue({ ...user, disabledMenus: ["english"] });
    const blocked = await mocks.configuration.value.callbacks.jwt({
      token: { sub: "u1" },
    });
    expect(blocked?.menus).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => !menu.startsWith("english")),
    );
    mocks.findUnique.mockResolvedValue({
      ...user,
      disabledMenus: ["english-maker"],
    });
    const partial = await mocks.configuration.value.callbacks.jwt({
      token: blocked!,
    });
    expect(partial?.menus).toContain("english-school");
    expect(partial?.menus).toContain("english-library");
    expect(partial?.menus).not.toContain("english-maker");
  });
  it("replaces forged client update claims with current DB access", async () => {
    mocks.findUnique.mockResolvedValue({
      ...user,
      approvalStatus: "pending",
      disabledMenus: ["studio"],
    });
    const result = await mocks.configuration.value.callbacks.jwt({
      token: {
        id: "u1",
        isAdmin: true,
        menus: ALL_WORKSPACE_MENUS,
        approvalStatus: "approved",
      },
      trigger: "update",
      session: { isAdmin: true },
    });
    expect(result).toMatchObject({
      id: "u1",
      isAdmin: false,
      approvalStatus: "pending",
    });
    expect(result?.menus).not.toContain("studio");
  });
  it("applies approval and menu revocation without issuing a new login", async () => {
    const first = await mocks.configuration.value.callbacks.jwt({
      token: { sub: "u1" },
    });
    expect(first?.menus).toContain("bank");
    mocks.findUnique.mockResolvedValue({
      ...user,
      disabledMenus: ["bank"],
      approvalStatus: "rejected",
    });
    const second = await mocks.configuration.value.callbacks.jwt({
      token: first!,
    });
    expect(second?.menus).not.toContain("bank");
    expect(second?.approvalStatus).toBe("rejected");
  });
  it("invalidates deleted or missing accounts", async () => {
    mocks.findUnique.mockResolvedValue({ ...user, deletedAt: new Date() });
    expect(
      await mocks.configuration.value.callbacks.jwt({ token: { id: "u1" } }),
    ).toBeNull();
    mocks.findUnique.mockResolvedValue(null);
    expect(
      await mocks.configuration.value.callbacks.jwt({ token: { id: "u1" } }),
    ).toBeNull();
    expect(
      await mocks.configuration.value.callbacks.jwt({ token: {} }),
    ).toBeNull();
  });
  it("keeps personal denials for the highest administrator", async () => {
    mocks.findUnique.mockResolvedValue({
      ...user,
      isAdmin: true,
      isSuperAdmin: true,
      disabledMenus: ["bank"],
    });
    expect(
      (
        await mocks.configuration.value.callbacks.jwt({
          token: {},
          user: { id: "u1" },
        })
      )?.menus,
    ).toEqual(ALL_WORKSPACE_MENUS.filter((menu) => menu !== "bank"));
  });
  it.each([false, true])(
    "refreshes branch policy on the existing token for owner/superadmin=%s",
    async (isSuperAdmin) => {
      vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "u1");
      const assigned = {
        ...user,
        isAdmin: true,
        isSuperAdmin,
        branchId: "branch-a",
        branchRole: "owner",
        disabledMenus: ["studio"],
        branch: { disabledMenus: [], menuRevision: 1 },
      };
      mocks.findUnique.mockResolvedValue(assigned);
      const first = await mocks.configuration.value.callbacks.jwt({
        token: { id: "u1" },
      });
      expect(first?.menus).toContain("bank");
      expect(first?.menus).not.toContain("studio");
      mocks.findUnique.mockResolvedValue({
        ...assigned,
        branch: {
          disabledMenus: ["bank", "english-listening"],
          menuRevision: 2,
        },
      });
      const second = await mocks.configuration.value.callbacks.jwt({
        token: first!,
      });
      expect(second?.menus).not.toContain("bank");
      expect(second?.menus).not.toContain("english-listening");
      expect(second?.isAdmin).toBe(true);
      expect(mocks.findUnique).toHaveBeenLastCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            branch: {
              select: {
                disabledMenus: true,
                ownerDisabledMenus: true,
                menuRevision: true,
              },
            },
          }),
        }),
      );
      mocks.findUnique.mockResolvedValue({
        ...assigned,
        branch: { disabledMenus: [], menuRevision: 3 },
      });
      const restored = await mocks.configuration.value.callbacks.jwt({
        token: second!,
      });
      expect(restored?.menus).toContain("bank");
      expect(restored?.menus).not.toContain("studio");
    },
  );
  it("fails closed when an assigned account's live branch relation is missing", async () => {
    mocks.findUnique.mockResolvedValue({
      ...user,
      branchId: "missing",
      branch: null,
    });
    const result = await mocks.configuration.value.callbacks.jwt({
      token: { id: "u1", menus: ALL_WORKSPACE_MENUS },
    });
    expect(result?.menus).toEqual([]);
  });
});
