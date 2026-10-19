// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/arithmetic-v2/registry", async () => {
  const fixture = await import("@/__tests__/helpers/arithmeticV2Fixture");
  return {
    getArithmeticV2Definition: fixture.getFixtureDefinition,
    arithmeticV2Definitions: () => fixture.fixtureDefinitions,
  };
});
const db = vi.hoisted(() => ({
  workspaceDocument: { findMany: vi.fn() },
  accountAuditLog: { findMany: vi.fn() },
  problem: { findMany: vi.fn() },
  test: { findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({ db }));
import { fixtureRequest } from "../helpers/arithmeticV2Fixture";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2";
import {
  buildArithmeticSheet,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
  defaultArithmeticConstraints,
} from "@/lib/arithmetic";
import { loadUsageLabels } from "@/lib/usageLabels/load";
import {
  USAGE_LABEL_MAX_COPY_ROWS,
  USAGE_LABEL_MAX_DOCUMENTS,
  usageLabelsRequestSchema,
  usageLabelsResponseSchema,
} from "@/contracts/usageLabels.contract";
import { arithmeticV2UsageTypeKey } from "@/lib/usageLabels/typeKey";

const now = new Date("2026-10-14T00:00:00.000Z");
const viewer = { id: "owner-a", branchId: "branch-a", isAdmin: false };
type Row = {
  id: string;
  userId: string;
  kind: string;
  createdAt: Date;
  payload: unknown;
};
let rows: Row[];
const row = (
  id: string,
  typeId = "test-add",
  userId = viewer.id,
  createdAt = now,
): Row => ({
  id,
  userId,
  createdAt,
  kind: "arithmeticSheet",
  payload: buildArithmeticV2Sheet(fixtureRequest(2, typeId)),
});
beforeEach(() => {
  vi.clearAllMocks();
  rows = [];
  db.workspaceDocument.findMany.mockImplementation(
    async ({
      where,
      take,
    }: {
      where: {
        userId: string;
        kind: string;
        createdAt: { gte?: Date; lte: Date };
      };
      take: number;
    }) =>
      rows
        .filter(
          (r) =>
            r.userId === where.userId &&
            r.kind === where.kind &&
            (!where.createdAt.gte || r.createdAt >= where.createdAt.gte) &&
            r.createdAt <= where.createdAt.lte,
        )
        .slice(0, take),
  );
  db.accountAuditLog.findMany.mockResolvedValue([]);
});
describe("v2 owner usage counts", () => {
  it("ranks by current rankGroup across unrequested peers; deduplicates document types and excludes copies/other owners", async () => {
    const repeated = fixtureRequest(2);
    repeated.rounds.push(repeated.rounds[0]);
    rows = Array.from({ length: 5 }, (_, i) => ({
      ...row(`a-${i}`),
      payload: buildArithmeticV2Sheet(repeated),
    }));
    rows.push(
      ...Array.from({ length: 8 }, (_, i) => row(`peer-${i}`, "test-peer")),
      ...Array.from({ length: 20 }, (_, i) =>
        row(`unrelated-${i}`, "test-other"),
      ),
      row("copy"),
      row("other-owner", "test-add", "owner-b"),
    );
    rows.push(
      {
        ...row("copy-field"),
        payload: {
          ...buildArithmeticV2Sheet(fixtureRequest()),
          sourceDocumentId: "a-0",
        },
      },
      {
        ...row("corrupt"),
        payload: { kind: "arithmeticSheet", payloadVersion: 2 },
      },
    );
    db.accountAuditLog.findMany.mockResolvedValue([
      { details: { documentId: "copy", sourceDocumentId: "a-0" } },
    ]);
    const response = await loadUsageLabels(
      viewer,
      { arithmeticV2TypeIds: ["test-add"], period: "all" },
      now,
    );
    expect(response.arithmeticV2Types).toEqual([
      expect.objectContaining({
        typeId: "test-add",
        typeKey: arithmeticV2UsageTypeKey("test-add"),
        rankGroup: "test-addition",
        count: 5,
        rank: 2,
        observedCandidates: 2,
        label: "내 학습지 사용 2위",
      }),
    ]);
    expect(response.metrics.arithmeticV2?.group).toBe("rankGroup");
    expect(response.arithmeticTypes).toEqual([]);
    expect(db.workspaceDocument.findMany).toHaveBeenCalledTimes(1);
    expect(db.workspaceDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: viewer.id,
          kind: "arithmeticSheet",
          createdAt: { lte: now },
        },
      }),
    );
    expect(db.accountAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: viewer.id, action: "material.copied" },
      }),
    );
    expect(db.problem.findMany).not.toHaveBeenCalled();
    expect(db.test.findMany).not.toHaveBeenCalled();
  });
  it("uses retained createdAt and keeps v1/v2 counts in separate populations", async () => {
    const constraints = defaultArithmeticConstraints("times-table");
    rows = [
      row("new"),
      row("old", "test-add", viewer.id, new Date("2026-01-01T00:00:00Z")),
      row("future", "test-add", viewer.id, new Date("2027-01-01T00:00:00Z")),
      {
        ...row("v1"),
        payload: buildArithmeticSheet({
          engineVersion: ARITHMETIC_ENGINE_VERSION,
          catalogVersion: ARITHMETIC_CATALOG_VERSION,
          seed: "legacy",
          rounds: [
            { skills: [{ skillId: "times-table", constraints, count: 2 }] },
          ],
        }),
      },
    ];
    const request = {
      arithmeticV2TypeIds: ["test-add"],
      arithmeticTypes: [{ skillId: "times-table", constraints }],
    };
    const recent = await loadUsageLabels(viewer, request, now);
    expect(recent.arithmeticV2Types[0].count).toBe(1);
    expect(recent.arithmeticTypes[0].count).toBe(1);
    const all = await loadUsageLabels(
      viewer,
      { ...request, period: "all" },
      now,
    );
    expect(all.arithmeticV2Types[0].count).toBe(2);
    expect(all.period.basis).toBe("retained-created-at");
  });
  it("distinguishes zero and unknown; rejects duplicate IDs; parses legacy responses", async () => {
    const response = await loadUsageLabels(
      viewer,
      { arithmeticV2TypeIds: ["test-add", "unknown"] },
      now,
    );
    expect(
      response.arithmeticV2Types.map((item) => [item.state, item.count]),
    ).toEqual([
      ["zero", 0],
      ["unknown", null],
    ]);
    expect(
      usageLabelsRequestSchema.safeParse({
        arithmeticV2TypeIds: ["test-add", "test-add"],
      }).success,
    ).toBe(false);
    const legacy = structuredClone(response) as Record<string, unknown>;
    delete legacy.arithmeticV2Types;
    delete (legacy.metrics as Record<string, unknown>).arithmeticV2;
    expect(usageLabelsResponseSchema.parse(legacy).arithmeticV2Types).toEqual(
      [],
    );
  });
  it.each(["documents", "copies", "database"])(
    "does not invent counts when %s is incomplete",
    async (boundary) => {
      if (boundary === "documents")
        db.workspaceDocument.findMany.mockResolvedValue(
          Array(USAGE_LABEL_MAX_DOCUMENTS + 1).fill(row("a")),
        );
      if (boundary === "copies")
        db.accountAuditLog.findMany.mockResolvedValue(
          Array(USAGE_LABEL_MAX_COPY_ROWS + 1).fill({ details: {} }),
        );
      if (boundary === "database")
        db.workspaceDocument.findMany.mockRejectedValue(new Error("offline"));
      const response = await loadUsageLabels(
        viewer,
        { arithmeticV2TypeIds: ["test-add"] },
        now,
      );
      expect(response.arithmeticV2Types[0]).toMatchObject({
        state: "unavailable",
        count: null,
        rank: null,
      });
    },
  );
});
