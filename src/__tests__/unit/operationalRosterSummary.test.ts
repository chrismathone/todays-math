// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  loadOperationalRoster,
  loadOperationalRosterSummary,
} from "@/lib/classAccess";

const classes = [
  { id: "a", name: "A", grade: "초3" },
  { id: "b", name: "B", grade: "중1" },
];
const account = {
  id: "account",
  disabledAt: null,
  createdAt: new Date("2026-10-01"),
};
const common = {
  branchId: "branch",
  createdAt: new Date("2026-10-02"),
  eywaWithdrawnAt: null,
};
const rows = [
  {
    ...common,
    id: "local",
    name: "로컬",
    classId: "a",
    class: classes[0],
    eywaBindingId: null,
    studentAccount: null,
    enrollments: [],
  },
  {
    ...common,
    id: "managed",
    name: "연계",
    classId: "old-primary",
    class: { id: "old-primary", name: "예전 반" },
    eywaBindingId: "binding",
    studentAccount: account,
    enrollments: ["a", "b", "a"].map((classId) => ({
      classId,
      class: classes.find((c) => c.id === classId),
      eywaLastReportText: "not needed by status boards",
    })),
  },
];
const identity = (
  row: Awaited<ReturnType<typeof loadOperationalRosterSummary>>[number],
) => ({
  id: row.id,
  name: row.name,
  classId: row.classId,
  class: row.class,
  branchId: row.branchId,
  createdAt: row.createdAt,
  eywaWithdrawnAt: row.eywaWithdrawnAt,
  studentAccount: row.studentAccount,
});
afterEach(() => vi.restoreAllMocks());

describe("status roster preserves the operational roster contract", () => {
  it.each([false, true])(
    "keeps identity, enrollment order, accounts and scope (on hold: %s)",
    async (includeOnHold) => {
      const find = vi.spyOn(db.student, "findMany");
      find.mockResolvedValueOnce(rows as never);
      const before = await loadOperationalRoster(
        classes.map((c) => c.id),
        includeOnHold,
      );
      const oldArgs = find.mock.calls[0][0]!;
      find.mockResolvedValueOnce(
        rows.map(({ class: ignored, ...row }) => {
          void ignored;
          return {
            ...row,
            enrollments: row.enrollments.map(({ classId }) => ({ classId })),
          };
        }) as never,
      );
      const after = await loadOperationalRosterSummary(classes, includeOnHold);
      const args = find.mock.calls[1][0]!;
      expect(args.where).toEqual(oldArgs.where);
      expect(args.select!.enrollments).toMatchObject({
        where: (oldArgs.include!.enrollments as { where: unknown }).where,
      });
      expect(after.map(identity)).toEqual(before.map((r) => identity(r)));
      expect(after.map((r) => [r.id, r.classId])).toEqual([
        ["local", "a"],
        ["managed", "a"],
        ["managed", "b"],
      ]);
      expect(args.select).not.toHaveProperty("class");
      expect(args.select).not.toHaveProperty("eywaLastReportText");
      expect(args.select!.enrollments).toMatchObject({
        select: { classId: true },
      });
    },
  );

  it("does not query or read students when no class is in scope", async () => {
    const find = vi.spyOn(db.student, "findMany");
    expect(await loadOperationalRosterSummary([], true)).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});
