// @vitest-environment node
import type { Prisma, PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEnglishBank,
  validateBankReference,
} from "@/lib/english/bank/service";
import { bankMenuDenied } from "@/lib/english/bank/http";
import { teacher, student } from "@/lib/english/listening/runtime/database";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";
import { canAccessListeningPilot } from "@/lib/listeningPilot";
import { withinOwnerScope } from "@/lib/ownerScope";

vi.mock("server-only", () => ({}));

const id = "10000000-0000-4000-8000-000000000001";
const resourceId = "20000000-0000-4000-8000-000000000001";
const account = {
  id,
  name: "Owner",
  email: "owner@example.test",
  role: "director" as const,
  isAdmin: true,
  isSuperAdmin: false,
  branchRole: "owner" as const,
  branchId: "branch-a",
  approvalStatus: "approved",
  deletedAt: null,
  suspendedAt: null,
  disabledMenus: [],
  branch: { disabledMenus: [], menuRevision: 1 },
};
const actor = { kind: "teacher" as const, userId: id };
const viewer = { ...account, menus: [] };
const userLookup = vi.fn();
const studentLookup = vi.fn();
const query = vi.fn();
const tx = {
  user: { findUnique: userLookup },
  studentAccount: { findUnique: studentLookup },
  $queryRaw: query,
  $executeRawUnsafe: vi.fn(),
} as unknown as Prisma.TransactionClient;
const transaction = vi.fn(
  async (work: (client: Prisma.TransactionClient) => Promise<unknown>) =>
    work(tx),
);
const database = { $transaction: transaction } as unknown as Pick<
  PrismaClient,
  "$transaction"
>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
  vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", id);
  userLookup.mockResolvedValue(account);
  query.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe("direct English service menu guards", () => {
  it.each([false, true])(
    "does not bypass bank access for owner/superadmin=%s",
    async (isSuperAdmin) => {
      const capped = { ...viewer, isSuperAdmin };
      expect(bankMenuDenied(capped)?.status).toBe(403);
      const bank = createEnglishBank(database);
      for (const call of [
        () => bank.list(capped, {}),
        () => bank.get(capped, resourceId),
        () => bank.uses(capped, resourceId),
        () => bank.create(capped, {}),
        () => bank.import(capped, {}),
        () => bank.update(capped, resourceId, {}),
        () => bank.archive(capped, resourceId, {}),
        () => bank.rights(capped, resourceId, {}),
        () => bank.prepare(capped, resourceId, {}),
      ])
        await expect(call()).rejects.toThrow("SOURCE_ACCESS_DENIED");
      await expect(
        validateBankReference(
          tx,
          capped,
          {
            passageId: resourceId,
            textRevision: 1,
            snapshotHash: "a".repeat(64),
          },
          "text",
          "cloze",
        ),
      ).rejects.toThrow("SOURCE_ACCESS_DENIED");
      expect(transaction).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    },
  );
  it.each(["material", "set"] as const)(
    "requires the original %s source menu even for an administrator",
    async (kind) => {
      const bank = createEnglishBank(database);
      await expect(
        bank.import(
          { ...viewer, isSuperAdmin: true, menus: ["english-bank"] },
          {
            clientKey: id,
            id: resourceId,
            kind,
            ...(kind === "set" ? { textKind: "passage" } : {}),
          },
        ),
      ).rejects.toThrow("SOURCE_ACCESS_DENIED");
      expect(query).not.toHaveBeenCalled();
    },
  );
  it("requires maker in addition to bank for direct preparation", async () => {
    expect(
      bankMenuDenied({ ...viewer, menus: ["english-bank"] }, true)?.status,
    ).toBe(403);
    await expect(
      createEnglishBank(database).prepare(
        { ...viewer, menus: ["english-bank"] },
        resourceId,
        {
          examId: resourceId,
          textRevision: 1,
          path: "cloze",
        },
      ),
    ).rejects.toThrow("SOURCE_ACCESS_DENIED");
    expect(query).not.toHaveBeenCalled();
  });
});

describe("listening teacher live branch policy", () => {
  it.each([false, true])(
    "denies direct runtime reads for a capped owner/superadmin=%s",
    async (isSuperAdmin) => {
      const runtime = createListeningRuntime(database);
      userLookup.mockResolvedValue({
        ...account,
        isSuperAdmin,
        branch: { disabledMenus: ["english-listening"], menuRevision: 2 },
      });
      // Assignments belong to the listening menu: a capped branch is refused before any query.
      await expect(
        runtime.teacherList(actor, "assignments"),
      ).rejects.toMatchObject({ status: 404 });
      expect(query).not.toHaveBeenCalled();
      expect(userLookup).toHaveBeenCalledWith({
        where: { id },
        include: {
          branch: {
            select: {
              disabledMenus: true,
              ownerDisabledMenus: true,
              menuRevision: true,
            },
          },
        },
      });
      // Sets are material work since 2026-10-04 (2de110c7e): the bank menu alone still opens them …
      await expect(runtime.teacherList(actor, "sets")).resolves.toEqual([]);
      // … and a branch that caps both menus closes them, again before any query.
      query.mockClear();
      userLookup.mockResolvedValue({
        ...account,
        isSuperAdmin,
        branch: {
          disabledMenus: ["english-listening", "english-bank"],
          menuRevision: 3,
        },
      });
      await expect(runtime.teacherList(actor, "sets")).rejects.toMatchObject({
        status: 404,
      });
      expect(query).not.toHaveBeenCalled();
    },
  );
  it("rechecks branch changes between calls and preserves personal denials", async () => {
    // Set lists open through either menu (see above), so «capped» here means both are off.
    const both = ["english-listening", "english-bank"];
    const runtime = createListeningRuntime(database);
    await expect(runtime.teacherList(actor, "sets")).resolves.toEqual([]);
    userLookup.mockResolvedValue({
      ...account,
      branch: { disabledMenus: both, menuRevision: 2 },
    });
    await expect(runtime.teacherList(actor, "sets")).rejects.toMatchObject({
      status: 404,
    });
    userLookup.mockResolvedValue({
      ...account,
      disabledMenus: both,
      branch: { disabledMenus: [], menuRevision: 3 },
    });
    await expect(runtime.teacherList(actor, "sets")).rejects.toMatchObject({
      status: 404,
    });
    userLookup.mockResolvedValue(account);
    await expect(runtime.teacherList(actor, "sets")).resolves.toEqual([]);
  });
  it("fails closed for a missing assigned branch but uses personal policy when unassigned", async () => {
    userLookup.mockResolvedValue({ ...account, branch: null });
    await expect(teacher(tx, actor)).rejects.toMatchObject({ status: 404 });
    userLookup.mockResolvedValue({ ...account, branchId: null, branch: null });
    expect((await teacher(tx, actor)).menus).toContain("english-listening");
  });
  it("applies an exact bank cap to listening search independently of listening permission", async () => {
    userLookup.mockResolvedValue({
      ...account,
      branch: { disabledMenus: ["english-bank"], menuRevision: 2 },
    });
    expect((await teacher(tx, actor)).menus).toContain("english-listening");
    await expect(
      createListeningRuntime(database).teacherBank(actor, "bank", {}),
    ).rejects.toMatchObject({ status: 404 });
    expect(query).not.toHaveBeenCalled();
  });
  it("turning off the three old branch English menus leaves bank and listening available", async () => {
    userLookup.mockResolvedValue({
      ...account,
      branch: {
        disabledMenus: ["english-school", "english-maker", "english-library"],
        menuRevision: 2,
      },
    });
    const current = await teacher(tx, actor);
    expect(current.menus).toContain("english-bank");
    expect(current.menus).toContain("english-listening");
    expect(withinOwnerScope(current, "colleague", "branch-a")).toBe(true);
    expect(withinOwnerScope(current, "colleague", "branch-b")).toBe(false);
  });
  it("preserves student pilot access when the content owner's staff branch menu is disabled", async () => {
    const owner = {
      ...account,
      branch: { disabledMenus: ["english-listening"], menuRevision: 2 },
    };
    const learner = {
      id: resourceId,
      studentId: "student",
      disabledAt: null,
      mustChangePassword: false,
      student: {
        id: "student",
        eywaWithdrawnAt: null,
        eywaBindingId: null,
        class: { user: owner },
      },
    };
    studentLookup.mockResolvedValue(learner);
    const studentActor = {
      kind: "student" as const,
      session: {
        accountId: resourceId,
        studentId: "student",
        name: "Student",
        mustChangePassword: false,
      },
    };
    expect(canAccessListeningPilot(owner, owner.disabledMenus)).toBe(true);
    await expect(student(tx, studentActor)).resolves.toBe(learner);
    userLookup.mockResolvedValue(owner);
    await expect(teacher(tx, actor)).rejects.toMatchObject({ status: 404 });
  });
});
