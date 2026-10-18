/** Registered-generator variation probe for the thin elementary stored families. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateElementaryForm,
  listedForms,
} from "../../../src/lib/elementary/forms";
import type { ElemProblem } from "../../../src/lib/elementary/types";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";

const root = resolve("docs/reports/math-type-audit-20261018");
const privateOut = resolve(".qa-artifacts/math-type-audit-20261018");
mkdirSync(privateOut, { recursive: true });
type Family = {
  unitId: string;
  grade: string;
  section: string;
  chapter: string;
  familyKey: string;
  namespace: string;
  eligibleRows: number;
  distinctStems: number;
};
const inventory = JSON.parse(
  readFileSync(resolve(root, "type-inventory.json"), "utf8"),
) as Family[];
const targets = inventory.filter(
  (family) =>
    family.namespace === "elem" &&
    family.eligibleRows > 0 &&
    family.distinctStems < 5,
);
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const samples: (ElemProblem & {
  familyKey: string;
  seed: number;
  handler: string;
})[] = [];
const results = targets.map((family) => {
  const unit = CURRICULUM_UNITS.find(
    (unit) => unit.grade === family.grade && unit.section === family.section,
  );
  const formId = family.familyKey.split("|").at(-1)!;
  const form = unit && listedForms(unit).find((form) => form.id === formId);
  if (!unit || !form)
    return { ...family, status: "unregistered_at_audit_head", observations: 0 };
  const stems = new Set<string>();
  const payloads = new Set<string>();
  const answers = new Set<string>();
  for (let seed = 0; seed < 512; seed++) {
    const problem = generateElementaryForm(unit, seed, formId);
    const parsed = parseProblemContent(problem.content);
    const stem = digest([
      parsed.question.replace(/\s+/g, " ").trim(),
      problem.figureSpec,
    ]);
    const payload = digest([problem.content, problem.figureSpec]);
    if (!stems.has(stem) && stems.size < 3)
      samples.push({
        familyKey: family.familyKey,
        seed,
        handler: form.generate.name,
        ...problem,
      });
    stems.add(stem);
    payloads.add(payload);
    answers.add(problem.answer);
  }
  return {
    ...family,
    status:
      stems.size >= 5
        ? "stored_variants_below_observed_generator_capacity"
        : "observed_small_domain_requires_semantic_review",
    handler: form.generate.name,
    tier: form.tier,
    observations: 512,
    generatedDistinctStems: stems.size,
    generatedDistinctPayloads: payloads.size,
    generatedDistinctAnswers: answers.size,
  };
});
writeFileSync(
  resolve(privateOut, "elementary-thin-samples.json"),
  JSON.stringify(samples, null, 2) + "\n",
  { mode: 0o600 },
);
writeFileSync(
  resolve(root, "elementary-variation.json"),
  JSON.stringify(
    {
      seeds: "0..511 inclusive",
      note: "512 probes per registered type; observed variation is not a full-domain proof or independent mathematical verification. The stored metric excludes choices; generated figures use exact figureSpec rather than stored SVG.",
      targets: targets.length,
      registered: results.filter((row) => row.observations).length,
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    targets: targets.length,
    observations: results.reduce((n, row) => n + row.observations, 0),
    outcomes: results.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  }),
);
