/** Type-level inventory from one immutable, read-only math-type-snapshot input. */
import { createHash } from "node:crypto";
import {
  createReadStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { strict as assert } from "node:assert";
import {
  DIFFICULTY_LADDER,
  defaultRatioFor,
} from "../../../src/contracts/difficulty";
import { SUPPORTED_GRADES } from "../../../src/contracts/supportedGrades";
import { familyIdOf } from "../../../src/lib/generator/familyKey";
import { balanceDifficulty } from "../../../src/lib/generator/balanceDifficulty";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import { classifyFormatWithChoices } from "../../../src/lib/problem/provenance";
import { isProblemEligible } from "../../../src/lib/problemEligibility";

type Unit = {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
};
type Row = {
  id: string;
  problemCode: string;
  unitId: string;
  familyKey: string | null;
  source: string;
  externalId: string | null;
  difficulty: (typeof DIFFICULTY_LADDER)[number];
  problemType: string;
  questionType: string | null;
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
  figureUrls: string[];
  pool: string;
  reviewStatus: string;
  directUseAllowed: boolean;
  eligible: boolean;
};
type Candidate = Pick<
  Row,
  | "id"
  | "unitId"
  | "familyKey"
  | "difficulty"
  | "problemType"
  | "directUseAllowed"
>;
type Family = {
  identity: string;
  unitId: string;
  familyKey: string | null;
  familyCode: string | null;
  grade: string;
  chapter: string;
  section: string;
  namespace: string;
  engineLinked: boolean;
  totalRows: number;
  eligibleRows: number;
  stems: Set<string>;
  payloads: Set<string>;
  allStems: Set<string>;
  shapes: Set<string>;
  sources: Record<string, number>;
  difficulties: Record<string, number>;
  formats: Record<string, number>;
  problemTypes: Record<string, number>;
  solutionLengths: number[];
  missingSolutions: number;
  figures: number;
  examples: string[];
};
class Flow {
  edges: { to: number; capacity: number; back: number }[][];
  constructor(size: number) {
    this.edges = Array.from({ length: size }, () => []);
  }
  add(from: number, to: number, capacity: number) {
    this.edges[from].push({ to, capacity, back: this.edges[to].length });
    this.edges[to].push({
      to: from,
      capacity: 0,
      back: this.edges[from].length - 1,
    });
  }
  max(source: number, sink: number) {
    let sum = 0;
    while (true) {
      const parent: [number, number][] = Array.from(
        { length: this.edges.length },
        () => [-1, -1],
      );
      const queue = [source];
      parent[source] = [source, -1];
      for (let i = 0; i < queue.length && parent[sink][0] < 0; i++) {
        const from = queue[i];
        this.edges[from].forEach((edge, j) => {
          if (edge.capacity > 0 && parent[edge.to][0] < 0) {
            parent[edge.to] = [from, j];
            queue.push(edge.to);
          }
        });
      }
      if (parent[sink][0] < 0) return sum;
      let amount = Infinity;
      for (let at = sink; at !== source;) {
        const [from, j] = parent[at];
        amount = Math.min(amount, this.edges[from][j].capacity);
        at = from;
      }
      for (let at = sink; at !== source;) {
        const [from, j] = parent[at];
        const edge = this.edges[from][j];
        edge.capacity -= amount;
        this.edges[at][edge.back].capacity += amount;
        at = from;
      }
      sum += amount;
    }
  }
}
function stemCapacity(stems: Map<string, Set<string>>, rounds: number) {
  const counts = new Map<string, number>();
  for (const families of stems.values())
    for (const family of families)
      counts.set(family, (counts.get(family) ?? 0) + 1);
  if ([...stems.values()].every((keys) => keys.size === 1))
    return [...counts.values()].reduce(
      (n, size) => n + Math.min(size, rounds),
      0,
    );
  if ([...counts.values()].every((size) => size <= rounds)) return stems.size;
  const names = [...counts.keys()];
  const indices = new Map(names.map((name, i) => [name, 1 + stems.size + i]));
  const sink = 1 + stems.size + names.length;
  const flow = new Flow(sink + 1);
  let i = 1;
  for (const families of stems.values()) {
    flow.add(0, i, 1);
    for (const family of families) flow.add(i, indices.get(family)!, 1);
    i++;
  }
  for (const index of indices.values()) flow.add(index, sink, rounds);
  return flow.max(0, sink);
}
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
const inc = (map: Record<string, number>, key: string) => {
  map[key] = (map[key] ?? 0) + 1;
};
const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(name);
  return resolve(at < 0 ? fallback : process.argv[at + 1]);
};
const input = arg("--input", ".qa-artifacts/math-type-audit-20261018");
const out = arg("--out", "docs/reports/math-type-audit-20261018");
mkdirSync(out, { recursive: true });
const json = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(input, name), "utf8"));

async function main() {
  const meta = json<{ total: number; eligible: number; sha256: string }>(
    "snapshot-meta.json",
  );
  const units = json<Unit[]>("units.json");
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const registry =
    json<{ unitId: string; familyKey: string; familyCode: string }[]>(
      "families.json",
    );
  const codeMap = new Map(
    registry.map((row) => [row.unitId + "\0" + row.familyKey, row.familyCode]),
  );
  const families = new Map<string, Family>();
  const unitStems = new Map<string, Map<string, Set<string>>>();
  const unitCandidates = new Map<string, Candidate[]>();
  const flags: {
    id: string;
    problemCode: string;
    unitId: string;
    familyKey: string | null;
    eligible: boolean;
    rule: string;
  }[] = [];
  const sourceCounts: Record<string, { total: number; eligible: number }> = {};
  const digest = createHash("sha256");
  let total = 0;
  let eligible = 0;
  const lines = createInterface({
    input: createReadStream(resolve(input, "snapshot.jsonl")),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    digest.update(line + "\n");
    const row = JSON.parse(line) as Row;
    total++;
    assert.equal(
      isProblemEligible(row),
      row.eligible,
      "snapshot eligibility parity",
    );
    if (row.eligible) eligible++;
    const source = (sourceCounts[row.source] ??= { total: 0, eligible: 0 });
    source.total++;
    if (row.eligible) source.eligible++;
    const unit = unitMap.get(row.unitId);
    const identity = familyIdOf(row);
    const namespace = (row.familyKey?.trim() || "solo:").split(":")[0];
    const family = families.get(identity) ?? {
      identity,
      unitId: row.unitId,
      familyKey: row.familyKey,
      familyCode: codeMap.get(identity) ?? null,
      grade: unit?.grade ?? "unknown",
      chapter: unit?.chapter ?? "",
      section: unit?.section ?? "",
      namespace,
      engineLinked: false,
      totalRows: 0,
      eligibleRows: 0,
      stems: new Set<string>(),
      allStems: new Set<string>(),
      shapes: new Set<string>(),
      payloads: new Set<string>(),
      sources: {},
      difficulties: {},
      formats: {},
      problemTypes: {},
      solutionLengths: [],
      missingSolutions: 0,
      figures: 0,
      examples: [],
    };
    family.totalRows++;
    family.engineLinked ||=
      row.source === "manual" &&
      (!!row.externalId?.startsWith("engine-") ||
        ["elem", "mid", "high", "judge", "native-desc"].includes(namespace));
    const parsed = parseProblemContent(row.content);
    const question = normalize(parsed.question);
    const stem = hash([question, row.figureSvg, row.figureUrls]);
    family.allStems.add(stem);
    const flag = (rule: string) =>
      flags.push({
        id: row.id,
        problemCode: row.problemCode,
        unitId: row.unitId,
        familyKey: row.familyKey,
        eligible: row.eligible,
        rule,
      });
    if (!row.content.trim()) flag("emptyContent");
    if (!row.answer.trim()) flag("blankAnswer");
    if (!row.solution?.trim()) flag("missingSolution");
    if (!unit) flag("missingUnit");
    if (row.questionType === "객관식" && !parsed.choices.length)
      flag("multipleChoiceWithoutParsedChoices_candidate");
    if (
      parsed.choices.length &&
      !row.figureUrls.length &&
      !row.figureSvg &&
      new Set(parsed.choices.map(normalize)).size !== parsed.choices.length
    )
      flag("identicalTextChoices_candidate");
    if (row.eligible) {
      family.eligibleRows++;
      family.stems.add(stem);
      family.payloads.add(hash([row.content, row.figureSvg, row.figureUrls]));
      family.shapes.add(hash(question.replace(/\d+(?:\.\d+)?/g, "#")));
      inc(family.sources, row.source);
      inc(family.difficulties, row.difficulty);
      inc(
        family.formats,
        classifyFormatWithChoices(parsed.choices.length, row),
      );
      inc(family.problemTypes, row.problemType);
      family.solutionLengths.push(normalize(row.solution ?? "").length);
      if (!row.solution?.trim()) family.missingSolutions++;
      if (row.figureSvg || row.figureUrls.length) family.figures++;
      if (family.examples.length < 3) family.examples.push(row.id);
      const stems = unitStems.get(row.unitId) ?? new Map<string, Set<string>>();
      const links = stems.get(stem) ?? new Set<string>();
      links.add(identity);
      stems.set(stem, links);
      unitStems.set(row.unitId, stems);
      const candidates = unitCandidates.get(row.unitId) ?? [];
      // Keep only selection fields; the private SVG/text snapshot stays out of the census output.
      candidates.push({
        id: row.id,
        unitId: row.unitId,
        familyKey: row.familyKey,
        difficulty: row.difficulty,
        problemType: row.problemType,
        directUseAllowed: row.directUseAllowed,
      });
      unitCandidates.set(row.unitId, candidates);
    }
    families.set(identity, family);
  }
  assert.equal(total, meta.total);
  assert.equal(eligible, meta.eligible);
  assert.equal(digest.digest("hex"), meta.sha256, "snapshot digest");
  const details = [...families.values()]
    .map((family) => {
      const {
        stems,
        allStems,
        shapes,
        payloads,
        solutionLengths,
        identity: _identity,
        ...rest
      } = family;
      void _identity;
      solutionLengths.sort((a, b) => a - b);
      return {
        ...rest,
        distinctStems: stems.size,
        allDistinctStems: allStems.size,
        distinctPayloads: payloads.size,
        numericSkeletons: shapes.size,
        stock3: stems.size >= 3,
        stock5: stems.size >= 5,
        stock10: stems.size >= 10,
        solutionLengthMedian: solutionLengths.length
          ? solutionLengths[Math.floor(solutionLengths.length / 2)]
          : null,
        solutionLengthMin: solutionLengths[0] ?? null,
      };
    })
    .sort(
      (a, b) =>
        a.grade.localeCompare(b.grade, "ko") ||
        a.unitId.localeCompare(b.unitId) ||
        (a.familyKey ?? "").localeCompare(b.familyKey ?? ""),
    );
  const unitDetails = units.map((unit) => {
    const own = details.filter(
      (family) => family.unitId === unit.id && family.eligibleRows,
    );
    const candidates = unitCandidates.get(unit.id) ?? [];
    const stems = unitStems.get(unit.id) ?? new Map<string, Set<string>>();
    const repeated = [1, 3, 5, 10, 15].map((rounds) => ({
      rounds,
      distinctStemCapacity: stemCapacity(stems, rounds),
      rowCapacity: own.reduce(
        (n, family) => n + Math.min(family.eligibleRows, rounds),
        0,
      ),
    }));
    const auto = [8, 10, 20].map((count) => {
      const result = balanceDifficulty(
        candidates,
        defaultRatioFor(count),
        count,
      );
      return {
        count,
        actual: result.selected.length,
        substitutions: result.substitutions.length,
      };
    });
    return {
      ...unit,
      supported: (SUPPORTED_GRADES as readonly string[]).includes(unit.grade),
      eligibleRows: candidates.length,
      families: own.length,
      engineFamilies: own.filter((family) => family.engineLinked).length,
      soloFamilies: own.filter((family) => family.namespace === "solo").length,
      distinctStems: stems.size,
      familiesUnder3: own.filter((family) => !family.stock3).length,
      familiesUnder5: own.filter((family) => !family.stock5).length,
      familiesUnder10: own.filter((family) => !family.stock10).length,
      repeated,
      auto,
      crossFamilyIdenticalStemGroups: [...stems.values()].filter(
        (links) => links.size > 1,
      ).length,
      formats: own.reduce(
        (acc, family) => {
          for (const [format, count] of Object.entries(family.formats))
            acc[format] = (acc[format] ?? 0) + count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  });
  const eligibleFamilies = details.filter((family) => family.eligibleRows);
  const gradeDetails = [...new Set(units.map((unit) => unit.grade))].map(
    (grade) => {
      const own = unitDetails.filter((unit) => unit.grade === grade);
      const fs = eligibleFamilies.filter((family) => family.grade === grade);
      const engine = fs.filter((family) => family.engineLinked);
      return {
        grade,
        units: own.length,
        eligibleRows: own.reduce((n, unit) => n + unit.eligibleRows, 0),
        families: fs.length,
        engineFamilies: engine.length,
        engineUnder3: engine.filter((family) => !family.stock3).length,
        engineUnder5: engine.filter((family) => !family.stock5).length,
        soloFamilies: fs.filter((family) => family.namespace === "solo").length,
        auto8: own.filter((unit) => unit.auto[0].actual === 8).length,
        auto10: own.filter((unit) => unit.auto[1].actual === 10).length,
        auto20: own.filter((unit) => unit.auto[2].actual === 20).length,
        distinct8x5: own.filter(
          (unit) =>
            unit.repeated.find((r) => r.rounds === 5)!.distinctStemCapacity >=
            40,
        ).length,
        zeroUnits: own.filter((unit) => !unit.eligibleRows).length,
      };
    },
  );
  const summarize = (own: typeof details) => ({
    families: own.length,
    rows: own.reduce((n, family) => n + family.eligibleRows, 0),
    under3: own.filter((family) => !family.stock3).length,
    under5: own.filter((family) => !family.stock5).length,
    under10: own.filter((family) => !family.stock10).length,
  });
  const summary = {
    ...meta,
    schema: 1,
    sourceCounts,
    storedFamilyIdentities: details.length,
    eligible: summarize(eligibleFamilies),
    engine: summarize(eligibleFamilies.filter((family) => family.engineLinked)),
    solo: summarize(
      eligibleFamilies.filter((family) => family.namespace === "solo"),
    ),
    dormantRegistry: registry.filter(
      (family) => !families.has(family.unitId + "\0" + family.familyKey),
    ).length,
    flagCounts: flags.reduce(
      (acc, flag) => {
        const key = `${flag.eligible ? "eligible" : "ineligible"}:${flag.rule}`;
        inc(acc, key);
        return acc;
      },
      {} as Record<string, number>,
    ),
    supported: gradeDetails.filter((grade) =>
      (SUPPORTED_GRADES as readonly string[]).includes(grade.grade),
    ),
    grades: gradeDetails,
    assumptions: {
      family:
        "product familyIdOf(unitId,familyKey), null/blank are per-problem solo",
      distinctStem:
        "same unit, product-parsed question with whitespace normalized + exact figureSvg and figureUrls; choices excluded",
      perTypeStock:
        "3/5/10 different stems per type are audit comparison scenarios (one new question per type per round), not an official or product minimum",
      numericSkeletons:
        "digits wildcarded, candidate retrieval only; no semantic equivalence or quality verdict",
      repeatedCapacity:
        "maximum-flow distinct-stem assignment, family capacity=rounds; unconstrained stock upper bound, no real recent history or format/tier quotas",
      auto: "actual balanceDifficulty defaultRatioFor 8/10/20, no historical exclusions; per-type family keys remain unchanged",
      quality:
        "all-row structural scan and missing-field candidates; no independent solution of all rows or measured learning effects",
    },
  };
  const save = (name: string, value: unknown) =>
    writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + "\n");
  save("capacity-summary.json", summary);
  save("type-inventory.json", details);
  save("unit-inventory.json", unitDetails);
  save("quality-flags.json", flags);
  const fields = [
    "grade",
    "chapter",
    "section",
    "unitId",
    "familyCode",
    "familyKey",
    "namespace",
    "engineLinked",
    "totalRows",
    "eligibleRows",
    "distinctStems",
    "distinctPayloads",
    "numericSkeletons",
    "stock3",
    "stock5",
    "stock10",
    "missingSolutions",
    "solutionLengthMin",
    "solutionLengthMedian",
  ] as const;
  const csv = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  writeFileSync(
    resolve(out, "type-inventory.csv"),
    "\uFEFF" +
      fields.join(",") +
      "\n" +
      details
        .map((family) => fields.map((key) => csv(family[key])).join(","))
        .join("\n") +
      "\n",
  );
  console.log(
    JSON.stringify({
      total,
      eligible,
      families: summary.eligible,
      engine: summary.engine,
      solo: summary.solo,
      supported: summary.supported,
      flags: summary.flagCounts,
    }),
  );
}
main();
