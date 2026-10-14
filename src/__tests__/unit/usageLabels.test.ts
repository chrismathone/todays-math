import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = vi.hoisted(() => ({
  db: {
    test: { findMany: vi.fn() },
    testProblem: { findMany: vi.fn() },
    problem: { findMany: vi.fn() },
    workspaceDocument: { findMany: vi.fn() },
    accountAuditLog: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db }));

import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
} from "@/contracts/arithmetic.contract";
import {
  USAGE_LABEL_MAX_TESTS,
  USAGE_LABEL_PROBLEM_SCOPE,
  usageLabelsResponseSchema,
} from "@/contracts/usageLabels.contract";
import { buildArithmeticSheet } from "@/lib/arithmetic";
import { assembleUsageLabels } from "@/lib/usageLabels/assemble";
import { isCopiedDocument, loadUsageLabels } from "@/lib/usageLabels/load";
import { decideUsageRank, usageRankLabel } from "@/lib/usageLabels/rank";
import { arithmeticUsageTypeKey } from "@/lib/usageLabels/typeKey";

const NOW = new Date("2026-10-14T00:00:00.000Z");
const UNIT = "11111111-1111-4111-8111-111111111111";
const P1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const P2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const P3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const MISSING = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4";

const addConstraints = {
  carry: "none" as const,
  left: { min: 0, max: 9 },
  right: { min: 0, max: 9 },
};
const verticalConstraints = {
  carryCount: 0 as const,
  left: { min: 10, max: 99 },
  right: { min: 10, max: 99 },
};
const times = (dans: number[]) => ({
  dans,
  multiplier: { min: 1, max: 9 },
});

function unit(section = "소인수분해") {
  return { id: UNIT, grade: "중1", chapter: "소인수분해", section };
}

function eligible(id: string, section = "소인수분해") {
  return {
    id,
    pool: "shared",
    reviewStatus: "approved",
    directUseAllowed: true,
    answer: "4",
    unit: unit(section),
  };
}

function viewer(id = "teacher-a") {
  return { id, isAdmin: false, branchId: null };
}

describe("연산 유형 키", () => {
  it("단 순서가 달라도 같고, 시드와 문항 수는 키에 없다", () => {
    const left = arithmeticUsageTypeKey({
      skillId: "times-table",
      constraints: times([4, 2]),
    });
    const right = arithmeticUsageTypeKey({
      skillId: "times-table",
      constraints: times([2, 4]),
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
    });
    expect(left).toBe(right);
    expect(
      left.startsWith(`${ARITHMETIC_CATALOG_VERSION}\ntimes-table\n`),
    ).toBe(true);
    expect(left).not.toMatch(/seed|count|order/);
    expect(
      arithmeticUsageTypeKey({
        skillId: "one-digit-add",
        constraints: { ...addConstraints, carry: "some" },
      }),
    ).not.toBe(
      arithmeticUsageTypeKey({
        skillId: "one-digit-add",
        constraints: addConstraints,
      }),
    );
  });
});

describe("경쟁 순위", () => {
  it("공동 순위는 건너뛰고, 다섯 번 미만·후보 하나·10위 밖은 순위를 숨긴다", () => {
    const population = [
      { key: "a", count: 10 },
      { key: "b", count: 10 },
      { key: "c", count: 8 },
      { key: "d", count: 4 },
      { key: "e", count: 0 },
    ];
    expect(decideUsageRank(population, "a")).toMatchObject({
      state: "ranked",
      rank: 1,
      tied: true,
      count: 10,
    });
    expect(usageRankLabel("내 출제", 1, true)).toBe("내 출제 공동 1위");
    expect(decideUsageRank(population, "c").rank).toBe(3);
    expect(decideUsageRank(population, "d")).toMatchObject({
      state: "unranked",
      reason: "below-minimum",
      rank: null,
      count: 4,
    });
    expect(decideUsageRank(population, "e")).toMatchObject({
      state: "zero",
      reason: "unused",
      count: 0,
    });
    expect(decideUsageRank([{ key: "only", count: 20 }], "only")).toMatchObject(
      { state: "unranked", reason: "sparse-population", rank: null },
    );
    const crowd = Array.from({ length: 12 }, (_, index) => ({
      key: `p${index}`,
      count: 30 - index,
    }));
    expect(decideUsageRank(crowd, "p9")).toMatchObject({
      state: "ranked",
      rank: 10,
    });
    expect(decideUsageRank(crowd, "p10")).toMatchObject({
      state: "unranked",
      reason: "outside-top",
      rank: null,
      count: 20,
    });
  });
});

describe("요청 밖 모집단", () => {
  it("요청에 없는 문항이 순위를 밀고, 차시를 유형이라고 부르지 않는다", () => {
    const response = assembleUsageLabels({
      viewer: viewer(),
      period: "30d",
      now: NOW,
      problemIds: [P1],
      arithmeticTypes: [],
      problems: {
        complete: true,
        records: [eligible(P1), eligible(P2), eligible(P3)].map((row) => ({
          id: row.id,
          visible: true,
          eligible: true,
          ineligibleCode: null,
          unit: row.unit,
        })),
        uses: [
          { problemId: P1, testCount: 5 },
          { problemId: P2, testCount: 5 },
          { problemId: P3, testCount: 8 },
        ],
      },
      arithmetic: null,
    });
    expect(response.problems[0]).toMatchObject({
      problemId: P1,
      state: "ranked",
      rank: 2,
      tied: true,
      label: "내 출제 공동 2위",
      count: 5,
      unitName: "소인수분해",
    });
    expect(response.problems[0]?.tooltip).toBe(
      "차시 소인수분해 · 최근 30일 · 5회",
    );
    expect(response.problems[0]?.tooltip).not.toContain("유형");
    expect(response.period.history).toBe("not-an-event-log");
    expect(response.period.note).toContain("지운 기록");
    expect(usageLabelsResponseSchema.safeParse(response).success).toBe(true);
  });

  it("없음·0·자격 없음·집계 불가를 서로 다른 상태로 둔다", () => {
    const response = assembleUsageLabels({
      viewer: viewer(),
      period: "all",
      now: NOW,
      problemIds: [P1, P2, MISSING],
      arithmeticTypes: [],
      problems: {
        complete: true,
        records: [
          {
            id: P1,
            visible: true,
            eligible: true,
            ineligibleCode: null,
            unit: unit(),
          },
          {
            id: P2,
            visible: true,
            eligible: false,
            ineligibleCode: "locked",
            unit: unit(),
          },
          {
            id: MISSING,
            visible: false,
            eligible: false,
            ineligibleCode: null,
            unit: null,
          },
        ],
        uses: [],
      },
      arithmetic: null,
    });
    expect(response.problems.map((item) => item.state)).toEqual([
      "zero",
      "ineligible",
      "unknown",
    ]);
    expect(response.problems[0]?.count).toBe(0);
    expect(response.problems[1]?.count).toBeNull();
    expect(response.problems[2]?.unitName).toBeNull();
    expect(response.period.from).toBeNull();
    expect(response.period.label).toBe("보유 중인 기록");
  });
});

describe("저장된 시험과 학습지", () => {
  const tests = new Map<
    string,
    { id: string; createdAt: Date; status: "draft" | "confirmed" | "printed" }[]
  >();
  const links: { id: string; testId: string; problemId: string }[] = [];
  const problems = new Map<string, ReturnType<typeof eligible>>();

  beforeEach(() => {
    tests.clear();
    links.length = 0;
    problems.clear();
    db.test.findMany.mockReset().mockImplementation((async (args: {
      where?: {
        userId?: string;
        status?: { in?: string[] };
        createdAt?: { gte?: Date; lte?: Date };
      };
      take?: number;
    }) => {
      const where = args.where ?? {};
      const allowed = new Set(where.status?.in ?? ["confirmed", "printed"]);
      const rows = (tests.get(where.userId ?? "") ?? []).filter((row) => {
        if (!allowed.has(row.status)) return false;
        if (where.createdAt?.gte && row.createdAt < where.createdAt.gte) {
          return false;
        }
        if (where.createdAt?.lte && row.createdAt > where.createdAt.lte) {
          return false;
        }
        return true;
      });
      return rows.slice(0, args.take ?? rows.length);
    }) as never);
    db.testProblem.findMany.mockReset().mockImplementation((async (args: {
      where?: { testId?: { in?: string[] } };
    }) => {
      const ids = new Set(args.where?.testId?.in ?? []);
      return links.filter((link) => ids.has(link.testId));
    }) as never);
    db.problem.findMany.mockReset().mockImplementation((async (args: {
      where?: { id?: { in?: string[] } };
    }) => {
      const ids = args.where?.id?.in ?? [];
      return ids.flatMap((id) => {
        const row = problems.get(id);
        return row ? [row] : [];
      });
    }) as never);
    db.workspaceDocument.findMany.mockReset().mockResolvedValue([]);
    db.accountAuditLog.findMany.mockReset().mockResolvedValue([]);
  });

  it("같은 차시의 요청 밖 문항으로 순위를 매기고 다른 교사의 시험은 세지 않는다", async () => {
    problems.set(P1, eligible(P1));
    problems.set(P2, eligible(P2));
    problems.set(P3, eligible(P3));
    const own = Array.from({ length: 8 }, (_, index) => ({
      id: `own-${index}`,
      createdAt: NOW,
      status: "confirmed" as const,
    }));
    tests.set("teacher-a", [
      ...own,
      { id: "draft-1", createdAt: NOW, status: "draft" },
    ]);
    tests.set("teacher-b", [
      { id: "other-1", createdAt: NOW, status: "printed" },
    ]);
    for (const test of own.slice(0, 5)) {
      links.push({ id: `${test.id}-1`, testId: test.id, problemId: P1 });
      links.push({ id: `${test.id}-1b`, testId: test.id, problemId: P1 });
    }
    for (const test of own.slice(0, 5)) {
      links.push({ id: `${test.id}-2`, testId: test.id, problemId: P2 });
    }
    for (const test of own) {
      links.push({ id: `${test.id}-3`, testId: test.id, problemId: P3 });
    }
    links.push({ id: "foreign", testId: "other-1", problemId: P1 });
    links.push({ id: "draft-link", testId: "draft-1", problemId: P1 });
    const response = await loadUsageLabels(
      viewer("teacher-a"),
      { problemIds: [P1], period: "all" },
      NOW,
    );
    expect(response.scope).toMatchObject({
      viewerId: "teacher-a",
      problems: USAGE_LABEL_PROBLEM_SCOPE,
    });
    expect(response.problems[0]).toMatchObject({
      state: "ranked",
      rank: 2,
      tied: true,
      count: 5,
      label: "내 출제 공동 2위",
    });
    const where = db.test.findMany.mock.calls[0]?.[0] as {
      where?: { userId?: string; OR?: unknown };
    };
    expect(where.where?.userId).toBe("teacher-a");
    expect(where.where).not.toHaveProperty("OR");
    expect(JSON.stringify(where)).toContain("confirmed");
    expect(JSON.stringify(where)).toContain("printed");
    expect(JSON.stringify(where)).not.toContain("teacher-b");
    expect(JSON.stringify(where)).not.toContain("branchId");
  });

  it("기간은 만든 시각이고, 상한을 넘으면 순위를 만들지 않는다", async () => {
    problems.set(P1, eligible(P1));
    tests.set("teacher-a", [
      {
        id: "old",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        status: "printed",
      },
      { id: "new", createdAt: NOW, status: "confirmed" },
    ]);
    links.push(
      { id: "l-old", testId: "old", problemId: P1 },
      { id: "l-new", testId: "new", problemId: P1 },
      { id: "l-peer", testId: "new", problemId: P2 },
    );
    problems.set(P2, eligible(P2));
    const recent = await loadUsageLabels(
      viewer(),
      { problemIds: [P1], period: "30d" },
      NOW,
    );
    expect(recent.problems[0]?.count).toBe(1);
    expect(recent.problems[0]?.state).toBe("unranked");
    const capped = Array.from(
      { length: USAGE_LABEL_MAX_TESTS + 1 },
      (_, index) => ({
        id: `cap-${index}`,
        createdAt: NOW,
        status: "confirmed" as const,
      }),
    );
    tests.set("teacher-a", capped);
    db.testProblem.findMany.mockClear();
    const overflow = await loadUsageLabels(
      viewer(),
      { problemIds: [P1], period: "all" },
      NOW,
    );
    expect(overflow.problems[0]?.state).toBe("unavailable");
    expect(overflow.problems[0]?.rank).toBeNull();
    expect(db.testProblem.findMany).not.toHaveBeenCalled();
  });

  it("학습지는 원본 문서의 유형을 한 번만 세고 사본은 빼며 문제 표를 읽지 않는다", async () => {
    const original = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "sheet-a",
      rounds: [
        {
          skills: [
            { skillId: "one-digit-add", count: 1, constraints: addConstraints },
          ],
        },
        {
          skills: [
            { skillId: "one-digit-add", count: 1, constraints: addConstraints },
          ],
        },
      ],
    });
    const other = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "sheet-b",
      rounds: [
        {
          skills: [
            {
              skillId: "two-digit-vertical-add",
              count: 1,
              constraints: verticalConstraints,
            },
          ],
        },
      ],
    });
    const timesSheet = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "sheet-c",
      rounds: [
        {
          skills: [
            {
              skillId: "times-table",
              count: 1,
              constraints: times([2]),
            },
          ],
        },
      ],
    });
    const documents = [
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `add-${index}`,
        payload: original,
      })),
      { id: "vertical-1", payload: other },
      { id: "copy-audit", payload: original },
      { id: "copy-field", payload: { ...original, sourceDocumentId: "add-0" } },
      { id: "broken", payload: { kind: "arithmeticSheet" } },
      { id: "times-1", payload: timesSheet },
    ];
    expect(
      isCopiedDocument("copy-field", { sourceDocumentId: "add-0" }, new Set()),
    ).toBe(true);
    expect(isCopiedDocument("add-0", original, new Set())).toBe(false);
    db.workspaceDocument.findMany.mockImplementation((async (args: {
      where?: { userId?: string };
    }) => (args.where?.userId === "teacher-a" ? documents : [])) as never);
    db.accountAuditLog.findMany.mockResolvedValue([
      { details: { documentId: "copy-audit", sourceDocumentId: "add-0" } },
    ] as never);
    db.problem.findMany.mockClear();
    db.test.findMany.mockClear();
    const response = await loadUsageLabels(
      viewer(),
      {
        arithmeticTypes: [
          { skillId: "one-digit-add", constraints: addConstraints },
          { skillId: "times-table", constraints: times([2]) },
        ],
        period: "all",
      },
      NOW,
    );
    expect(response.arithmeticTypes[0]).toMatchObject({
      state: "ranked",
      rank: 1,
      count: 5,
      operator: "+",
      label: "내 학습지 사용 1위",
    });
    expect(response.arithmeticTypes[0]?.tooltip).toContain("연산 +");
    expect(response.arithmeticTypes[0]?.tooltip).not.toContain("차시");
    expect(response.arithmeticTypes[1]).toMatchObject({
      state: "unranked",
      reason: "sparse-population",
      count: 1,
      operator: "×",
    });
    expect(db.problem.findMany).not.toHaveBeenCalled();
    expect(db.test.findMany).not.toHaveBeenCalled();
    const where = db.workspaceDocument.findMany.mock.calls[0]?.[0];
    expect(JSON.stringify(where)).toContain("arithmeticSheet");
    expect(JSON.stringify(where)).toContain("teacher-a");
  });

  it("생성과 다시 읽기는 서로 다른 표를 본다", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "lib", "usageLabels", "load.ts"),
      "utf8",
    );
    const arithmetic = source.slice(
      source.indexOf("async function loadArithmeticSide"),
    );
    const problemsSide = source.slice(
      source.indexOf("async function loadProblemSide"),
      source.indexOf("async function loadArithmeticSide"),
    );
    expect(arithmetic).not.toMatch(/db\.test|db\.problem/);
    expect(problemsSide).toContain("userId: viewer.id");
    expect(problemsSide).not.toMatch(
      /workspaceDocument|accountAuditLog|accessibleTestsWhere/,
    );
    expect(source).not.toMatch(/accessibleTestsWhere/);
    expect(source).not.toMatch(/prisma\.\$execute|update\(|create\(/);
  });
});
