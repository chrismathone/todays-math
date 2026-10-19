/** Read-only stock capacity. Counts rows, families and distinct stems separately. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  defaultRatioFor,
  DIFFICULTY_LADDER,
} from "../../../src/contracts/difficulty";
import { balanceDifficulty } from "../../../src/lib/generator/balanceDifficulty";
import { familyIdOf } from "../../../src/lib/generator/familyKey";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import { classifyFormatWithChoices } from "../../../src/lib/problem/provenance";
import { problemEligibleWhere } from "../../../src/lib/problemEligibility";

const prisma = new PrismaClient({ log: [] });
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const sessions = [1, 3, 5, 10, 15];
const widths = [8, 10, 20];
type Edge = { to: number; cap: number; back: number };
class Flow {
  edges: Edge[][];
  constructor(size: number) {
    this.edges = Array.from({ length: size }, () => []);
  }
  add(from: number, to: number, cap: number) {
    this.edges[from].push({ to, cap, back: this.edges[to].length });
    this.edges[to].push({
      to: from,
      cap: 0,
      back: this.edges[from].length - 1,
    });
  }
  max(source: number, sink: number, limit = Infinity) {
    let total = 0;
    while (total < limit) {
      const parent: [number, number][] = Array.from(
        { length: this.edges.length },
        () => [-1, -1],
      );
      parent[source] = [source, -1];
      const queue = [source];
      for (let at = 0; at < queue.length && parent[sink][0] < 0; at++) {
        const from = queue[at];
        this.edges[from].forEach((edge, index) => {
          if (edge.cap > 0 && parent[edge.to][0] < 0) {
            parent[edge.to] = [from, index];
            queue.push(edge.to);
          }
        });
      }
      if (parent[sink][0] < 0) break;
      let amount = limit - total;
      for (let at = sink; at !== source;) {
        const [from, index] = parent[at];
        amount = Math.min(amount, this.edges[from][index].cap);
        at = from;
      }
      for (let at = sink; at !== source;) {
        const [from, index] = parent[at];
        const edge = this.edges[from][index];
        edge.cap -= amount;
        this.edges[at][edge.back].cap += amount;
        at = from;
      }
      total += amount;
    }
    return total;
  }
}

/** One distinct stem can be assigned to just one family; each family at most once per sheet. */
function stemCapacity(stems: Map<string, Set<string>>, sheets: number): number {
  const families = new Map<string, number>();
  for (const choices of stems.values())
    for (const family of choices)
      families.set(family, (families.get(family) ?? 0) + 1);
  if ([...stems.values()].every((f) => f.size === 1))
    return [...families.values()].reduce(
      (sum, size) => sum + Math.min(size, sheets),
      0,
    );
  if ([...families.values()].every((size) => size <= sheets)) return stems.size;
  const familyKeys = [...families.keys()];
  const familyIndex = new Map(
    familyKeys.map((key, index) => [key, 1 + stems.size + index]),
  );
  const sink = 1 + stems.size + familyKeys.length;
  const flow = new Flow(sink + 1);
  let index = 0;
  for (const choices of stems.values()) {
    const node = 1 + index++;
    flow.add(0, node, 1);
    for (const family of choices) flow.add(node, familyIndex.get(family)!, 1);
  }
  for (const node of familyIndex.values()) flow.add(node, sink, sheets);
  return flow.max(0, sink);
}

type Candidate = {
  id: string;
  unitId: string;
  familyKey: string | null;
  difficulty: (typeof DIFFICULTY_LADDER)[number];
  problemType: string;
  directUseAllowed: boolean;
};
function tierCapacity(rows: Candidate[], count: number): number {
  const ratio = defaultRatioFor(count);
  const families = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = familyIdOf(row);
    const set = families.get(key) ?? new Set();
    set.add(row.difficulty);
    families.set(key, set);
  }
  const sink = 1 + families.size + DIFFICULTY_LADDER.length;
  const flow = new Flow(sink + 1);
  let index = 0;
  for (const tiers of families.values()) {
    const node = 1 + index++;
    flow.add(0, node, 1);
    DIFFICULTY_LADDER.forEach((tier, i) => {
      if (tiers.has(tier)) flow.add(node, 1 + families.size + i, 1);
    });
  }
  DIFFICULTY_LADDER.forEach((tier, i) =>
    flow.add(1 + families.size + i, sink, ratio[tier]),
  );
  return flow.max(0, sink, count);
}

function controls() {
  const examples: [Map<string, Set<string>>, number, number][] = [
    [new Map(), 1, 0],
    [
      new Map([
        ["a", new Set(["f"])],
        ["b", new Set(["f"])],
      ]),
      1,
      1,
    ],
    [
      new Map([
        ["a", new Set(["f"])],
        ["b", new Set(["f"])],
      ]),
      2,
      2,
    ],
    [new Map([["a", new Set(["f", "g"])]]), 1, 1],
    [
      new Map([
        ["a", new Set(["f", "g"])],
        ["b", new Set(["f"])],
        ["c", new Set(["f"])],
      ]),
      1,
      2,
    ],
    [
      new Map([
        ["a", new Set(["f", "g"])],
        ["b", new Set(["f"])],
        ["c", new Set(["f"])],
      ]),
      2,
      3,
    ],
  ];
  for (const [stems, count, expected] of examples)
    if (stemCapacity(stems, count) !== expected)
      throw new Error("Capacity control failed");
}

async function main() {
  controls();
  const baselineHead = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const report = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const measuredAt = new Date().toISOString();
      const units = await tx.unit.findMany({
        select: {
          id: true,
          grade: true,
          chapter: true,
          section: true,
          orderIndex: true,
          semester: true,
        },
        orderBy: [{ grade: "asc" }, { orderIndex: "asc" }],
      });
      const rows = await tx.problem.findMany({
        where: problemEligibleWhere(),
        orderBy: { id: "asc" },
        select: {
          id: true,
          unitId: true,
          source: true,
          difficulty: true,
          familyKey: true,
          problemType: true,
          questionType: true,
          content: true,
          answer: true,
          directUseAllowed: true,
          figureSvg: true,
          figureUrls: true,
        },
      });
      const byUnit = new Map<string, typeof rows>();
      for (const row of rows) {
        const own = byUnit.get(row.unitId) ?? [];
        own.push(row);
        byUnit.set(row.unitId, own);
      }
      const details = units.map((unit) => {
        const own = byUnit.get(unit.id) ?? [];
        const families = new Map<string, number>();
        const payloads = new Set<string>();
        const stems = new Map<string, Set<string>>();
        const tiers = Object.fromEntries(
          DIFFICULTY_LADDER.map((tier) => [
            tier,
            { rows: 0, families: new Set<string>() },
          ]),
        );
        const formats = Object.fromEntries(
          ["multiple_choice", "short_answer", "descriptive", "unknown"].map(
            (format) => [format, { rows: 0, families: new Set<string>() }],
          ),
        );
        const sources: Record<string, number> = {};
        const rawQuestionTypes: Record<string, number> = {};
        for (const row of own) {
          const family = familyIdOf(row);
          families.set(family, (families.get(family) ?? 0) + 1);
          const parsed = parseProblemContent(row.content);
          const format = classifyFormatWithChoices(parsed.choices.length, row);
          formats[format].rows++;
          formats[format].families.add(family);
          tiers[row.difficulty].rows++;
          tiers[row.difficulty].families.add(family);
          payloads.add(hash([row.content, row.figureSvg, row.figureUrls]));
          const stem = hash([
            parsed.question.replace(/\s+/g, " ").trim(),
            row.figureSvg,
            row.figureUrls,
          ]);
          const linked = stems.get(stem) ?? new Set<string>();
          linked.add(family);
          stems.set(stem, linked);
          sources[row.source] = (sources[row.source] ?? 0) + 1;
          const rawType = row.questionType ?? "(null)";
          rawQuestionTypes[rawType] = (rawQuestionTypes[rawType] ?? 0) + 1;
        }
        const repeated = sessions.map((sheets) => ({
          sheets,
          rowAssignments: [...families.values()].reduce(
            (sum, count) => sum + Math.min(count, sheets),
            0,
          ),
          distinctStemAssignments: stemCapacity(stems, sheets),
        }));
        const scenarios = widths.map((count) => {
          const auto = balanceDifficulty(own, defaultRatioFor(count), count);
          return {
            count,
            autoActual: auto.selected.length,
            autoSubstitutions: auto.substitutions.length,
            strictDefaultTierActual: tierCapacity(own, count),
            oneSheetDistinctStemActual: Math.min(
              count,
              repeated[0].distinctStemAssignments,
            ),
            repeated: repeated.map((r) => ({
              sheets: r.sheets,
              required: r.sheets * count,
              rowsEnough: r.rowAssignments >= r.sheets * count,
              distinctStemsEnough:
                r.distinctStemAssignments >= r.sheets * count,
            })),
          };
        });
        return {
          ...unit,
          markedOutsideCurriculum: /교육과정 외/.test(
            `${unit.chapter} ${unit.section}`,
          ),
          eligibleRows: own.length,
          distinctPayloads: payloads.size,
          distinctStems: stems.size,
          families: families.size,
          familySizeHistogram: Object.fromEntries(
            [...families.values()].reduce(
              (map, n) => map.set(n, (map.get(n) ?? 0) + 1),
              new Map<number, number>(),
            ),
          ),
          tiers: Object.fromEntries(
            Object.entries(tiers).map(([key, value]) => [
              key,
              { rows: value.rows, families: value.families.size },
            ]),
          ),
          formats: Object.fromEntries(
            Object.entries(formats).map(([key, value]) => [
              key,
              { rows: value.rows, families: value.families.size },
            ]),
          ),
          sources,
          rawQuestionTypes,
          repeated,
          scenarios,
        };
      });
      const grades = [...new Set(units.map((unit) => unit.grade))].map(
        (grade) => {
          const own = details.filter((unit) => unit.grade === grade);
          return {
            grade,
            units: own.length,
            markedOutsideCurriculum: own.filter(
              (unit) => unit.markedOutsideCurriculum,
            ).length,
            eligibleRows: own.reduce((n, unit) => n + unit.eligibleRows, 0),
            families: own.reduce((n, unit) => n + unit.families, 0),
            distinctPayloads: own.reduce(
              (n, unit) => n + unit.distinctPayloads,
              0,
            ),
            distinctStems: own.reduce((n, unit) => n + unit.distinctStems, 0),
            zero: own.filter((unit) => !unit.eligibleRows).length,
            under8Families: own.filter((unit) => unit.families < 8).length,
            under10Families: own.filter((unit) => unit.families < 10).length,
            under20Families: own.filter((unit) => unit.families < 20).length,
            difficultyRows: Object.fromEntries(
              DIFFICULTY_LADDER.map((tier) => [
                tier,
                own.reduce((n, unit) => n + unit.tiers[tier].rows, 0),
              ]),
            ),
            formatRows: Object.fromEntries(
              Object.keys(own[0]?.formats ?? {}).map((format) => [
                format,
                own.reduce((n, unit) => n + unit.formats[format].rows, 0),
              ]),
            ),
            scenarios: widths.map((count) => ({
              count,
              autoFilled: own.filter(
                (unit) =>
                  unit.scenarios.find((s) => s.count === count)!.autoActual ===
                  count,
              ).length,
              exactDefaultTierFilled: own.filter(
                (unit) =>
                  unit.scenarios.find((s) => s.count === count)!
                    .strictDefaultTierActual === count,
              ).length,
              distinctStemFilled: own.filter(
                (unit) =>
                  unit.scenarios.find((s) => s.count === count)!
                    .oneSheetDistinctStemActual === count,
              ).length,
              repeated: sessions.map((sheets) => ({
                sheets,
                rowsEnough: own.filter(
                  (unit) =>
                    unit.scenarios
                      .find((s) => s.count === count)!
                      .repeated.find((r) => r.sheets === sheets)!.rowsEnough,
                ).length,
                distinctStemsEnough: own.filter(
                  (unit) =>
                    unit.scenarios
                      .find((s) => s.count === count)!
                      .repeated.find((r) => r.sheets === sheets)!
                      .distinctStemsEnough,
                ).length,
              })),
            })),
          };
        },
      );
      return {
        measuredAt,
        completedAt: new Date().toISOString(),
        baselineHead,
        readOnly: true,
        isolation: "RepeatableRead",
        eligibleRows: rows.length,
        units: units.length,
        defaultRatios: Object.fromEntries(
          widths.map((count) => [count, defaultRatioFor(count)]),
        ),
        assumptions: {
          oneUnitAtATime: true,
          oneFamilyPerSheet: true,
          repeatSessions: sessions,
          contentUniqueness:
            "same parsed question with normalized whitespace plus exact SVG and URL array, within one unit",
          payloadUniqueness:
            "exact content including choices plus SVG and URL array, within one unit",
          repeatedCapacity:
            "Maximum flow: distinct stem capacity 1, family capacity number of sheets. Row alternative sums min(rows per family, sheets). This is stock capacity, not actual account/learner recent-use history.",
          exactTierCapacity:
            "Family-to-tier max flow for the product default ratio, without neighboring-tier substitution.",
          autoCapacity:
            "Actual balanceDifficulty with the default ratio; no historical exclusions. Substitutions counted.",
          arithmeticSeparate: true,
        },
        grades,
        details,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 600000, maxWait: 60000 },
  );
  const at = process.argv.indexOf("--out");
  const out = resolve(
    at < 0
      ? ".qa-artifacts/problem-bank-reinforcement-20261018/capacity"
      : process.argv[at + 1]!,
  );
  mkdirSync(out, { recursive: true });
  writeFileSync(
    resolve(out, "census.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        output: resolve(out, "census.json"),
        eligibleRows: report.eligibleRows,
        grades: report.grades.map(
          ({
            grade,
            units,
            eligibleRows,
            families,
            distinctStems,
            zero,
            under8Families,
            under10Families,
            under20Families,
          }) => ({
            grade,
            units,
            eligibleRows,
            families,
            distinctStems,
            zero,
            under8Families,
            under10Families,
            under20Families,
          }),
        ),
      },
      null,
      2,
    ),
  );
}
main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]")
        : "Capacity census failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
