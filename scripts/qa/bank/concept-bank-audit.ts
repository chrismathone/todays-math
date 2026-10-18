/** Code-backed concept-bank census; writes IDs, counts and digests, never prose. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { conceptBlankBankSchema } from "../../../src/contracts/conceptBlank.contract";
import {
  blankClashes,
  danglingExamples,
} from "../../../src/lib/concept-blank/audit";
import {
  BANK_PARTS,
  CONCEPT_BLANK_BANK,
} from "../../../src/lib/concept-blank/bank";
import { bankNotationFaults } from "../../../src/lib/concept-blank/notation";
import { BLANK_SECTIONS } from "../../../src/lib/concept-blank/sections";

const outAt = process.argv.indexOf("--out");
const out = resolve(
  outAt < 0
    ? ".qa-artifacts/problem-bank-audit-20261018/concepts"
    : process.argv[outAt + 1]!,
);
const kinds = ["concepts", "ox", "apply", "figures"] as const;
const stable = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([, value]) => value !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, stable(value)]),
        )
      : value;
const stringify = (value: unknown) => JSON.stringify(stable(value));
const sha = (value: unknown) =>
  createHash("sha256").update(stringify(value)).digest("hex");
const seen = new Set<string>();
const duplicateIds: string[] = [];
const assessmentMismatches: { part: string; id: string; rule: string }[] = [];
const byPart = Object.entries(BANK_PARTS).map(([part, bank]) => {
  const stem = part.replace(/plus$/, "-plus");
  const raw = JSON.parse(
    readFileSync(
      resolve(`src/lib/concept-blank/bank/assessments/${stem}.json`),
      "utf8",
    ),
  );
  const conceptIds = new Set(bank.concepts.map((concept) => concept.id));
  for (const [id] of Object.entries(raw))
    if (!conceptIds.has(id))
      assessmentMismatches.push({ part, id, rule: "orphanAssessment" });
  for (const concept of bank.concepts) {
    const loaded = {
      bQuestion: concept.bQuestion,
      clozeQuestion: concept.clozeQuestion,
      questionExclusions: concept.questionExclusions,
    };
    if (!raw[concept.id])
      assessmentMismatches.push({
        part,
        id: concept.id,
        rule: "missingAssessment",
      });
    else if (stringify(loaded) !== stringify(raw[concept.id]))
      assessmentMismatches.push({
        part,
        id: concept.id,
        rule: "runtimeJsonMismatch",
      });
  }
  for (const kind of kinds)
    for (const item of bank[kind]) {
      if (seen.has(item.id)) duplicateIds.push(item.id);
      seen.add(item.id);
    }
  const parsed = conceptBlankBankSchema.safeParse(bank);
  return {
    part,
    counts: Object.fromEntries(kinds.map((kind) => [kind, bank[kind].length])),
    assessmentKeys: Object.keys(raw).length,
    schemaValid: parsed.success,
    schemaIssues: parsed.success
      ? []
      : parsed.error.issues.map(({ path, code }) => ({ path, code })),
    digest: sha(bank),
  };
});
const report = {
  measuredAt: new Date().toISOString(),
  counts: Object.fromEntries(
    kinds.map((kind) => [kind, CONCEPT_BLANK_BANK[kind].length]),
  ),
  byPart,
  duplicateIds,
  assessmentMismatches,
  notationFaults: bankNotationFaults(CONCEPT_BLANK_BANK).map(
    ({ id, field, rule }) => ({ id, field, rule }),
  ),
  blankClashes: blankClashes(CONCEPT_BLANK_BANK).map((group) =>
    group.map(({ id }) => id),
  ),
  danglingExamples: danglingExamples(CONCEPT_BLANK_BANK).map(({ id }) => id),
  exclusions: {
    term: CONCEPT_BLANK_BANK.concepts
      .filter((concept) => concept.bQuestion === null)
      .map(({ id, questionExclusions }) => ({
        id,
        hasReason: Boolean(questionExclusions?.term),
      })),
    cloze: CONCEPT_BLANK_BANK.concepts
      .filter((concept) => concept.clozeQuestion === null)
      .map(({ id, questionExclusions }) => ({
        id,
        hasReason: Boolean(questionExclusions?.cloze),
      })),
  },
  sections: BLANK_SECTIONS.map((section) => ({
    key: section.key,
    grade: section.grade,
    counts: Object.fromEntries(
      kinds.map((kind) => [
        kind,
        CONCEPT_BLANK_BANK[kind].filter((item) => item.section === section.key)
          .length,
      ]),
    ),
  })),
  digest: sha(CONCEPT_BLANK_BANK),
};
mkdirSync(out, { recursive: true });
writeFileSync(
  resolve(out, "census.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      output: resolve(out, "census.json"),
      counts: report.counts,
      duplicateIds: report.duplicateIds.length,
      assessmentMismatches: report.assessmentMismatches.length,
      notationFaults: report.notationFaults.length,
      blankClashes: report.blankClashes.length,
      danglingExamples: report.danglingExamples.length,
      parts: report.byPart.length,
      sections: report.sections.length,
    },
    null,
    2,
  ),
);
