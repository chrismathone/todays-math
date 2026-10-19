import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";

vi.mock("server-only", () => ({}));

import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";
afterEach(() => vi.unstubAllEnvs());

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "김강사",
  email: "teacher@example.com",
  role: "director" as const,
  isAdmin: true,
  isSuperAdmin: true,
  branchId: "22222222-2222-4222-8222-222222222222",
  branchRole: "owner" as const,
  branch: {
    name: "서울 지점",
    disabledMenus: ["bank"],
    ownerDisabledMenus: [] as string[],
    menuRevision: 3,
  },
  eywaUserId: null,
  eywaManagedAccounts: [],
  approvalStatus: "approved" as const,
  disabledMenus: ["studio"],
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-23T00:00:00.000Z"),
  suspendedAt: null,
  deletedAt: null,
  authSource: "local",
};

type UserRow = Parameters<typeof managedAccount>[0];
type Mapping = UserRow["eywaManagedAccounts"][number];
const userId = "11111111-1111-4111-8111-111111111111";
const branchId = "22222222-2222-4222-8222-222222222222";
const sourceId = "33333333-3333-4333-8333-333333333333";
function mapping(overrides: Partial<Mapping> = {}): Mapping {
  return {
    status: "confirmed",
    currentUserId: userId,
    sourceUserId: sourceId,
    currentSourceUserId: sourceId,
    confirmedAt: new Date("2026-09-01T00:00:00Z"),
    endedAt: null,
    conflictReason: null,
    blockReasons: [],
    sourceEpoch: "epoch",
    binding: {
      targetBranchId: branchId,
      mode: "active",
      enabled: true,
      healthy: true,
      retiredAt: null,
      sourceEpoch: "epoch",
    },
    ...overrides,
  };
}
function user(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: userId,
    name: "김강사",
    email: "teacher@example.com",
    role: "director",
    isAdmin: false,
    isSuperAdmin: false,
    branchId,
    branchRole: "teacher",
    branch: {
      name: "인재원 침산",
      disabledMenus: [],
      ownerDisabledMenus: [],
      menuRevision: 1,
    },
    eywaUserId: sourceId,
    eywaManagedAccounts: [mapping()],
    approvalStatus: "approved",
    disabledMenus: [],
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-23T00:00:00.000Z"),
    suspendedAt: null,
    deletedAt: null,
    authSource: "local",
    ...overrides,
  };
}

describe("관리자 계정 응답", () => {
  it("uses current managed assignment for editor locks independently of the sync badge", () => {
    expect(managedAccount(user()).branchAssignmentLocked).toBe(true);
    expect(
      managedAccount(
        user({
          eywaManagedAccounts: [
            mapping({ binding: { ...mapping().binding, enabled: false } }),
          ],
        }),
      ).branchAssignmentLocked,
    ).toBe(true);
    expect(
      managedAccount(
        user({
          eywaManagedAccounts: [
            mapping({
              currentUserId: null,
              status: "ended",
              endedAt: new Date(),
            }),
          ],
        }),
      ).branchAssignmentLocked,
    ).toBe(false);
  });
  it.each([null, row.branchId])(
    "serializes the service switch independently of branch caps for branch %s",
    (branchId) => {
      const input = {
        ...row,
        isSuperAdmin: false,
        branchId,
        branch: branchId
          ? { ...row.branch, disabledMenus: ["english-listening"] }
          : null,
      };
      // No enrolment list: an ordinary account is limited by its stored menus only.
      vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "");
      vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
      const open = managedAccount(input);
      expect(open.unavailableMenus).toEqual([]);
      expect(open.configuredMenus).toContain("english-listening");
      expect(open.menus.includes("english-listening")).toBe(branchId === null);
      vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
      const off = managedAccount(input);
      expect(off.unavailableMenus).toEqual(["english-listening"]);
      expect(off.configuredMenus).toContain("english-listening");
      expect(off.menus).not.toContain("english-listening");
      expect(off.branchMenus).toEqual(
        branchId
          ? ALL_WORKSPACE_MENUS.filter((menu) => menu !== "english-listening")
          : null,
      );
    },
  );
  it("does not mistake a personal listening denial for an independent rollout restriction", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
    const account = managedAccount({
      ...row,
      disabledMenus: ["english-listening"],
    });
    expect(account.unavailableMenus).toEqual([]);
    expect(account.configuredMenus).not.toContain("english-listening");
    expect(account.menus).not.toContain("english-listening");
  });
  it("지점 내정보를 제공하며 비밀번호 필드는 조회하거나 직렬화하지 않는다", () => {
    expect(managedAccountSelect).not.toHaveProperty("passwordHash");
    const account = managedAccount({
      id: "11111111-1111-4111-8111-111111111111",
      name: "김강사",
      email: "teacher@example.com",
      role: "director",
      isAdmin: false,
      isSuperAdmin: false,
      branchId: "22222222-2222-4222-8222-222222222222",
      branchRole: "teacher",
      branch: {
        name: "서울 지점",
        disabledMenus: [],
        ownerDisabledMenus: [],
        menuRevision: 1,
      },
      eywaUserId: null,
      eywaManagedAccounts: [],
      approvalStatus: "approved",
      disabledMenus: [],
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-23T00:00:00.000Z"),
      suspendedAt: null,
      deletedAt: null,
      authSource: "local",
    });
    expect(account.branchName).toBe("서울 지점");
    expect(JSON.stringify(account)).not.toMatch(/password|hash/i);
  });
  it("exposes configured policy, exact branch cap and pilot-filtered effective menus even for the highest admin", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
    const account = managedAccount(row);
    expect(account.configuredMenus).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "studio"),
    );
    expect(account.branchMenus).toEqual(
      ALL_WORKSPACE_MENUS.filter((menu) => menu !== "bank"),
    );
    expect(account.branchMenuRevision).toBe(3);
    expect(account.menus).not.toContain("bank");
    expect(account.menus).not.toContain("studio");
    expect(account.menus).not.toContain("english-listening");
    expect(account.configuredMenus).toContain("english-listening");
  });
  it("returns null branch facts for unassigned accounts without changing personal configuration", () => {
    const account = managedAccount({ ...row, branchId: null, branch: null });
    expect(account.branchMenus).toBeNull();
    expect(account.branchMenuRevision).toBeNull();
    expect(account.menus).toContain("bank");
    expect(account.menus).not.toContain("studio");
  });

  it("같은 지점과 이메일 또는 옛 에이와 식별자만으로 연결되었다고 표시하지 않는다", () => {
    expect(managedAccount(user({ eywaManagedAccounts: [] })).eywaSync).toEqual({
      status: "unlinked",
      branchName: null,
      reason: "에이와에 연결되지 않은 계정입니다.",
    });
  });

  it("현재 확정된 연결의 지점 이름을 제공하고 이전 기록이나 다른 연결 검토를 우선하지 않는다", () => {
    const account = managedAccount(
      user({
        eywaManagedAccounts: [
          mapping({
            status: "conflict",
            currentUserId: null,
            conflictReason: "managed_elsewhere",
          }),
          mapping({
            status: "ended",
            currentUserId: null,
            endedAt: new Date(),
          }),
          mapping(),
        ],
      }),
    );
    expect(account.eywaSync).toEqual({
      status: "linked",
      branchName: "인재원 침산",
      reason: null,
    });
  });

  it.each([
    ["candidate", "승인"],
    ["conflict", "검토"],
    ["ended", "종료"],
    ["review", "검토"],
  ])(
    "%s 상태는 현재 사용자 표시가 남아 있어도 연결되지 않았다",
    (status, reason) => {
      const sync = managedAccount(
        user({ eywaManagedAccounts: [mapping({ status })] }),
      ).eywaSync;
      expect(sync?.status).toBe("unlinked");
      expect(sync?.reason).toContain(reason);
    },
  );

  it.each([
    { currentUserId: null },
    { currentUserId: "another-user" },
    { currentSourceUserId: null },
    { currentSourceUserId: "another-source" },
    { confirmedAt: null },
    { endedAt: new Date() },
    { conflictReason: "identity_conflict" },
    { sourceEpoch: "old-epoch" },
    { blockReasons: ["source_removed"] },
  ])(
    "유효하지 않은 현재 식별자 또는 종료·검토 대상 연결은 거부한다: %j",
    (override) => {
      expect(
        managedAccount(user({ eywaManagedAccounts: [mapping(override)] }))
          .eywaSync?.status,
      ).toBe("unlinked");
    },
  );

  it.each([
    { eywaUserId: null },
    { eywaUserId: "another-source" },
    { branchId: "another-branch" },
    { branch: null },
  ])("사용자의 실제 식별자와 소속을 확인한다: %j", (override) => {
    expect(managedAccount(user(override)).eywaSync?.status).toBe("unlinked");
  });

  it.each([
    [{ mode: "shadow" }, "활성화"],
    [{ enabled: false }, "꺼져"],
    [{ healthy: false }, "확인할 수 없어"],
    [{ retiredAt: new Date() }, "종료"],
  ] as const)(
    "지점 연결 불가 사유를 안전한 안내로 제공한다: %j",
    (override, reason) => {
      const row = mapping();
      row.binding = { ...row.binding, ...override };
      const sync = managedAccount(
        user({ eywaManagedAccounts: [row] }),
      ).eywaSync;
      expect(sync?.status).toBe("unlinked");
      expect(sync?.reason).toContain(reason);
    },
  );

  it("로그인 확인 기한이 만료되었거나 계정 로그인이 제한되어도 확정된 연결은 유지한다", () => {
    const row = { ...mapping(), leaseExpiresAt: new Date(0) };
    const binding = {
      ...row.binding,
      leaseExpiresAt: new Date(0),
      validatedAt: new Date(0),
    };
    const sync = managedAccount(
      user({
        suspendedAt: new Date(),
        eywaManagedAccounts: [{ ...row, binding }],
      }),
    ).eywaSync;
    expect(sync).toEqual({
      status: "linked",
      branchName: "인재원 침산",
      reason: "계정 로그인이 정지되어 있습니다.",
    });
    expect(
      managedAccount(
        user({
          eywaManagedAccounts: [
            mapping({ blockReasons: ["staff_ineligible"] }),
          ],
        }),
      ).eywaSync?.status,
    ).toBe("linked");
  });

  it("조회와 응답에서 원본 개인정보·제어 데이터와 기술 오류를 노출하지 않는다", () => {
    const selection = JSON.stringify(managedAccountSelect);
    expect(selection).not.toMatch(
      /sourceEmail|sourceName|control|lastError|confirmationEvidence|leaseExpiresAt|password/i,
    );
    const row = {
      ...mapping({
        status: "conflict",
        conflictReason: "raw_error_other@example.com",
      }),
      sourceEmail: "source-secret@example.com",
      sourceName: "source-secret",
      confirmationEvidence: "private-evidence",
      binding: {
        ...mapping().binding,
        control: { secret: "private-control" },
        lastError: "raw-internal-error",
      },
    };
    const result = managedAccount(user({ eywaManagedAccounts: [row] }));
    expect(result.eywaSync).toEqual({
      status: "unlinked",
      branchName: null,
      reason: "계정 연결에 관리자 검토가 필요합니다.",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /eywaUserId|eywaManagedAccounts|source-secret|private-|raw_|raw-|currentSourceUserId/,
    );
    expect(Object.keys(result.eywaSync!)).toEqual([
      "status",
      "branchName",
      "reason",
    ]);
  });
});
