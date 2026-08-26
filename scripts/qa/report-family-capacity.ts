/**
 * 한 시험지에 같은 family_key 를 한 번만 쓸 때의 소단원별 분모를 센다.
 *
 *   npx tsx scripts/qa/report-family-capacity.ts --as-of 2026-08-26
 *   npx tsx scripts/qa/report-family-capacity.ts --as-of 2026-08-26 --json
 *   npx tsx scripts/qa/report-family-capacity.ts --as-of 2026-08-26 --env C:\\path\\to\\.env
 *
 * 공유 DB에는 Prisma `findMany`(SELECT)만 실행한다. 적재·수정·잠금 해제 기능은 없다.
 * 분모는 실제 자동 출제 자격과 같다(D-22·D-101):
 *   pool=shared AND review_status=approved AND direct_use_allowed=true
 *   AND answer <> '(정답 없음)'
 *
 * D-20은 `test.status`·반·학생을 좁히지 않고, 원장별로 기준일 포함 14일 전부터
 * 기준일까지의 모든 시험지에 실린 problem_id를 제외한 뒤 남은 distinct family를 센다.
 */
import { MISSING_ANSWER } from "../../src/lib/missingAnswer";
import { readEnvFile } from "../import/readEnvFile";

const RECENT_WINDOW_DAYS = 14;

type Args = {
  asOf: string;
  envPath?: string;
  json: boolean;
  limit: number;
};

type UnitRow = {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
};

type EligibleRow = {
  id: string;
  unitId: string;
  source: string;
  familyKey: string | null;
};

type ClassRow = {
  userId: string;
  defaultProblemCount: number;
};

type RecentTestRow = {
  userId: string;
  testProblems: Array<{ problemId: string }>;
};

type SourceStats = {
  rows: number;
  families: number;
  soloRows: number;
  nullRows: number;
  emptyRows: number;
  groupedFamilies: number;
  maxFamilySize: number;
};

type UnitStats = {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
  eligibleRows: number;
  families: number;
  soloRows: number;
  nullRows: number;
  emptyRows: number;
  sourceRows: Record<string, number>;
  shortageByProblemCount: Record<string, number>;
  remainingFamiliesByOwner: Record<string, number>;
};

function parseArgs(argv: string[]): Args {
  let asOf: string | undefined;
  let envPath: string | undefined;
  let json = false;
  let limit = 30;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--as-of") {
      asOf = argv[++i];
    } else if (arg === "--env") {
      envPath = argv[++i];
    } else if (arg === "--limit") {
      limit = Number(argv[++i]);
    } else {
      throw new Error(`알 수 없는 인자: ${arg}`);
    }
  }

  if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new Error("--as-of YYYY-MM-DD가 필요하다.");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("--limit는 1 이상의 정수여야 한다.");
  }
  return { asOf, envPath, json, limit };
}

function utcDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function addDays(isoDate: string, days: number): string {
  return new Date(utcDay(isoDate).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function normalizedFamilyKey(row: Pick<EligibleRow, "id" | "familyKey">) {
  const key = row.familyKey?.trim();
  return key ? key : `solo:${row.id}`;
}

function familyIdentity(row: EligibleRow) {
  return `${row.unitId}\u0000${normalizedFamilyKey(row)}`;
}

function isSolo(row: EligibleRow) {
  return normalizedFamilyKey(row).startsWith("solo:");
}

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function sourceStats(rows: EligibleRow[]): Record<string, SourceStats> {
  const bySource = new Map<string, EligibleRow[]>();
  for (const row of rows) {
    const bucket = bySource.get(row.source) ?? [];
    bucket.push(row);
    bySource.set(row.source, bucket);
  }

  return Object.fromEntries(
    [...bySource.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([source, sourceRows]) => {
        const sizes = new Map<string, number>();
        for (const row of sourceRows) {
          const identity = familyIdentity(row);
          sizes.set(identity, (sizes.get(identity) ?? 0) + 1);
        }
        return [
          source,
          {
            rows: sourceRows.length,
            families: sizes.size,
            soloRows: sourceRows.filter(isSolo).length,
            nullRows: sourceRows.filter((row) => row.familyKey === null).length,
            emptyRows: sourceRows.filter(
              (row) => row.familyKey !== null && row.familyKey.trim() === "",
            ).length,
            groupedFamilies: [...sizes.values()].filter((size) => size > 1)
              .length,
            maxFamilySize: Math.max(0, ...sizes.values()),
          },
        ];
      }),
  );
}

function ownerLabels(classes: ClassRow[]) {
  const classCounts = new Map<string, number>();
  for (const row of classes) {
    classCounts.set(row.userId, (classCounts.get(row.userId) ?? 0) + 1);
  }
  return new Map(
    [...classCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([userId], index) => [userId, `owner-${index + 1}`]),
  );
}

function buildReport(input: {
  asOf: string;
  units: UnitRow[];
  allProblems: EligibleRow[];
  eligible: EligibleRow[];
  classes: ClassRow[];
  recentTests: RecentTestRow[];
}) {
  const { asOf, units, allProblems, eligible, classes, recentTests } = input;
  const defaultProblemCounts: Record<string, number> = {};
  for (const row of classes) {
    increment(defaultProblemCounts, String(row.defaultProblemCount));
  }
  const observedProblemCounts = Object.keys(defaultProblemCounts)
    .map(Number)
    .sort((a, b) => a - b);

  const labels = ownerLabels(classes);
  const recentIdsByOwner = new Map<string, Set<string>>();
  const recentTestCounts = new Map<string, number>();
  for (const test of recentTests) {
    recentTestCounts.set(
      test.userId,
      (recentTestCounts.get(test.userId) ?? 0) + 1,
    );
    const ids = recentIdsByOwner.get(test.userId) ?? new Set<string>();
    for (const item of test.testProblems) ids.add(item.problemId);
    recentIdsByOwner.set(test.userId, ids);
  }

  const rowsByUnit = new Map<string, EligibleRow[]>();
  for (const row of eligible) {
    const bucket = rowsByUnit.get(row.unitId) ?? [];
    bucket.push(row);
    rowsByUnit.set(row.unitId, bucket);
  }

  const unitStats: UnitStats[] = units.map((unit) => {
    const rows = rowsByUnit.get(unit.id) ?? [];
    const families = new Set(rows.map(familyIdentity)).size;
    const sourceRows: Record<string, number> = {};
    for (const row of rows) increment(sourceRows, row.source);

    const remainingFamiliesByOwner: Record<string, number> = {};
    for (const [userId, label] of labels) {
      const recentIds = recentIdsByOwner.get(userId) ?? new Set<string>();
      remainingFamiliesByOwner[label] = new Set(
        rows.filter((row) => !recentIds.has(row.id)).map(familyIdentity),
      ).size;
    }

    return {
      ...unit,
      eligibleRows: rows.length,
      families,
      soloRows: rows.filter(isSolo).length,
      nullRows: rows.filter((row) => row.familyKey === null).length,
      emptyRows: rows.filter(
        (row) => row.familyKey !== null && row.familyKey.trim() === "",
      ).length,
      sourceRows,
      shortageByProblemCount: Object.fromEntries(
        observedProblemCounts.map((count) => [
          String(count),
          Math.max(0, count - families),
        ]),
      ),
      remainingFamiliesByOwner,
    };
  });

  const familySizes = new Map<string, number>();
  for (const row of eligible) {
    const identity = familyIdentity(row);
    familySizes.set(identity, (familySizes.get(identity) ?? 0) + 1);
  }
  const familySizeDistribution: Record<string, number> = {
    "1": 0,
    "2-3": 0,
    "4-7": 0,
    "8+": 0,
  };
  for (const size of familySizes.values()) {
    if (size === 1) familySizeDistribution["1"] += 1;
    else if (size <= 3) familySizeDistribution["2-3"] += 1;
    else if (size <= 7) familySizeDistribution["4-7"] += 1;
    else familySizeDistribution["8+"] += 1;
  }

  const owners = [...labels.entries()].map(([userId, label]) => ({
    label,
    classes: classes.filter((row) => row.userId === userId).length,
    recentTests: recentTestCounts.get(userId) ?? 0,
    recentProblemIds: recentIdsByOwner.get(userId)?.size ?? 0,
  }));

  return {
    asOf,
    recentWindow: {
      from: addDays(asOf, -RECENT_WINDOW_DAYS),
      to: asOf,
      inclusive: true,
    },
    eligibility:
      "pool=shared AND review_status=approved AND direct_use_allowed=true AND answer<>(정답 없음)",
    classes: {
      total: classes.length,
      owners: owners.length,
      defaultProblemCountDistribution: defaultProblemCounts,
    },
    owners,
    allProblemBank: {
      rows: allProblems.length,
      families: new Set(allProblems.map(familyIdentity)).size,
      soloRows: allProblems.filter(isSolo).length,
      nullRows: allProblems.filter((row) => row.familyKey === null).length,
      emptyRows: allProblems.filter(
        (row) => row.familyKey !== null && row.familyKey.trim() === "",
      ).length,
      bySource: sourceStats(allProblems),
    },
    eligible: {
      rows: eligible.length,
      unitsWithRows: rowsByUnit.size,
      totalUnits: units.length,
      families: familySizes.size,
      soloRows: eligible.filter(isSolo).length,
      nullRows: eligible.filter((row) => row.familyKey === null).length,
      emptyRows: eligible.filter(
        (row) => row.familyKey !== null && row.familyKey.trim() === "",
      ).length,
      familySizeDistribution,
      bySource: sourceStats(eligible),
    },
    units: unitStats,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.envPath) {
    const env = await readEnvFile(args.envPath);
    if (!env?.DATABASE_URL) {
      throw new Error(`${args.envPath}에 DATABASE_URL이 없다.`);
    }
    process.env.DATABASE_URL = env.DATABASE_URL;
    if (env.DIRECT_URL) process.env.DIRECT_URL = env.DIRECT_URL;
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 또는 --env가 필요하다.");
  }

  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const units = await db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: "asc" },
    });
    const eligible = await db.problem.findMany({
      where: {
        pool: "shared",
        reviewStatus: "approved",
        directUseAllowed: true,
        answer: { not: MISSING_ANSWER },
      },
      select: { id: true, unitId: true, source: true, familyKey: true },
    });
    // 우선순위 분모에는 넣지 않는다. 기출·자작이 `solo:*`로 독립 가족이 되는지
    // 출처별로 검산하기 위한 별도 모집단이다.
    const allProblems = await db.problem.findMany({
      select: { id: true, unitId: true, source: true, familyKey: true },
    });
    const classes = await db.class.findMany({
      select: { userId: true, defaultProblemCount: true },
    });
    const ownerIds = [...new Set(classes.map((row) => row.userId))];
    const recentTests =
      ownerIds.length === 0
        ? []
        : await db.test.findMany({
            where: {
              userId: { in: ownerIds },
              testDate: {
                gte: utcDay(addDays(args.asOf, -RECENT_WINDOW_DAYS)),
                lt: utcDay(addDays(args.asOf, 1)),
              },
            },
            select: {
              userId: true,
              testProblems: { select: { problemId: true } },
            },
          });

    const report = buildReport({
      asOf: args.asOf,
      units,
      allProblems,
      eligible,
      classes,
      recentTests,
    });
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    console.log(`기준일 ${report.asOf}`);
    console.log(
      `출제 가능 ${report.eligible.rows}행 / ${report.eligible.families}갈래`,
    );
    console.log(
      `family_key: solo ${report.eligible.soloRows}, NULL ${report.eligible.nullRows}, 빈 값 ${report.eligible.emptyRows}`,
    );
    console.log(
      `반 ${report.classes.total}개 · 기본 문항 수 ${JSON.stringify(report.classes.defaultProblemCountDistribution)}`,
    );
    console.log(
      `D-20 ${report.recentWindow.from}~${report.recentWindow.to}: ${report.owners.map((owner) => `${owner.label} 시험 ${owner.recentTests}장 / 문항 ${owner.recentProblemIds}개`).join(", ") || "원장 없음"}`,
    );
    console.log("\n전체 문제은행 출처별 (우선순위 분모 밖 검산)");
    console.table(report.allProblemBank.bySource);
    console.log("\n출처별");
    console.table(report.eligible.bySource);

    const primaryCount = Number(
      Object.entries(report.classes.defaultProblemCountDistribution).sort(
        (a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]),
      )[0]?.[0] ?? 0,
    );
    const primaryOwner = report.owners[0]?.label;
    const priority = [...report.units]
      .filter(
        (unit) => (unit.shortageByProblemCount[String(primaryCount)] ?? 0) > 0,
      )
      .sort((a, b) => {
        const shortageDiff =
          (b.shortageByProblemCount[String(primaryCount)] ?? 0) -
          (a.shortageByProblemCount[String(primaryCount)] ?? 0);
        if (shortageDiff !== 0) return shortageDiff;
        const remainingDiff = primaryOwner
          ? (a.remainingFamiliesByOwner[primaryOwner] ?? 0) -
            (b.remainingFamiliesByOwner[primaryOwner] ?? 0)
          : 0;
        return remainingDiff || a.orderIndex - b.orderIndex;
      })
      .slice(0, args.limit)
      .map((unit) => ({
        grade: unit.grade,
        chapter: unit.chapter,
        section: unit.section,
        families: unit.families,
        remaining: primaryOwner
          ? unit.remainingFamiliesByOwner[primaryOwner]
          : undefined,
        shortage: unit.shortageByProblemCount[String(primaryCount)],
      }));
    console.log(`\n정원 ${primaryCount} 기준 부족 우선 ${priority.length}개`);
    console.table(priority);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
