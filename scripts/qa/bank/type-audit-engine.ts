/** Read-only registration/output audit; no database client or writes to product data.
 * Run: node_modules/.bin/tsx scripts/qa/bank/type-audit-engine.ts [output-directory]
 * Output contains hashes and heuristic candidates, never a claim of solved-all coverage.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
  listedForms,
  generateElementaryForm,
  elementaryComboDefinitions,
  generateElementaryComboProblem,
} from "../../../src/lib/elementary/generate";
import {
  registeredTypes,
  generateMiddleProblem,
} from "../../../src/lib/middle/generate";
import {
  registeredHighTypes,
  registeredHighHolds,
  generateHighProblem,
} from "../../../src/lib/high/generate";
import {
  middleComboDefinitions,
  generateMiddleComboProblem,
} from "../../../src/lib/middle/combo";
import {
  judgementDefinitions,
  generateJudgeProblem,
} from "../../../src/lib/middle/judge/registry";
import {
  nativeDescriptiveDefinitions,
  generateNativeDescriptive,
} from "../../../src/lib/engine/nativeDescriptive20261018";
import { asMultipleChoice } from "../../../src/lib/engine/deriveFormats";
import { distinctKey } from "../../../src/lib/engine/variants";
import { createRng } from "../../../src/lib/elementary/rng";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import { HIGH_TITLE_CORRECTIONS } from "../../../src/__tests__/helpers/highTitles";
import { listArithmeticSkills } from "../../../src/lib/arithmetic/catalog";
import { arithmeticV2Definitions } from "../../../src/lib/arithmetic-v2/registry";

type Problem = {
  content: string;
  answer: string;
  solution: string;
  figureSpec?: unknown;
  distractors?: readonly string[];
  difficulty?: string;
  familyId?: string;
};
type CatalogRow = {
  minor: string;
  number: string;
  title: string;
  page: number;
};
type Catalog = Record<string, { file: string; types: CatalogRow[] }>;
type Spec = {
  scope: string;
  key: string;
  grade: string;
  section: string;
  title?: string;
  map?: object | null;
  generate: (seed: number, variant: number) => Problem;
};
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const normalized = (value: string) => value.replace(/\s+/g, " ").trim();
// A candidate detector only: masking numbers can erase mathematically material differences.
const skeleton = (value: string) =>
  normalized(value.replace(/\d+(?:\.\d+)?/g, "#"));
const outDir = path.resolve(
  process.argv[2] ?? ".qa-artifacts/math-type-audit-20261018/engine",
);
mkdirSync(outDir, { recursive: true });
const middleCatalog = JSON.parse(
  readFileSync("scripts/rpm/rpm-type-catalog.json", "utf8"),
) as Catalog;
const highCatalog = JSON.parse(
  readFileSync("scripts/rpm/rpm-high-type-catalog.json", "utf8"),
) as Catalog;
const catalogMap = (catalog: Catalog) =>
  new Map(
    Object.entries(catalog).flatMap(([book, value]) =>
      value.types.map((row) => [
        `${book}|${row.minor}|${row.number}`,
        { ...row, file: value.file },
      ]),
    ),
  );
const middleMap = catalogMap(middleCatalog),
  highMap = catalogMap(highCatalog);
const specs: Spec[] = [];
for (const unit of elementaryUnits()) {
  const key = `${unit.grade}|${unit.section.split(" ")[0]}`;
  specs.push({
    scope: "elementary-base",
    key,
    grade: unit.grade,
    section: unit.section,
    generate: (s, v) => generateElementaryProblem(unit, s + v * 1009),
  });
  for (const tier of supportedTiers(unit))
    specs.push({
      scope: "elementary-tier",
      key: `${key}|${tier}`,
      grade: unit.grade,
      section: unit.section,
      generate: (s, v) => generateElementaryProblem(unit, s + v * 1009, tier),
    });
  for (const form of listedForms(unit))
    specs.push({
      scope: "elementary-form",
      key: `${key}|${form.id}`,
      grade: unit.grade,
      section: unit.section,
      map: { tier: form.tier },
      generate: (s, v) => generateElementaryForm(unit, s + v * 1009, form.id),
    });
}
for (const e of registeredTypes())
  specs.push({
    scope: "middle",
    key: e.key,
    grade: e.grade,
    section: e.unitSection,
    title: e.rpmTitle,
    map: middleMap.get(e.key) ?? null,
    generate: (s, v) => generateMiddleProblem(e.key, s, v),
  });
for (const e of registeredHighTypes())
  specs.push({
    scope: "high",
    key: e.key,
    grade: e.grade,
    section: e.unitSection,
    title: e.rpmTitle,
    map: highMap.get(e.key),
    generate: (s, v) => generateHighProblem(e.key, s, v),
  });
for (const e of elementaryComboDefinitions())
  specs.push({
    scope: "elementary-combo",
    key: e.id,
    grade: e.anchorKey.split("|")[0]!,
    section: e.anchorKey,
    map: e,
    generate: (s, v) => generateElementaryComboProblem(e.id, s + v * 1009),
  });
for (const e of middleComboDefinitions())
  specs.push({
    scope: "middle-combo",
    key: e.id,
    grade: e.anchorGrade,
    section: e.anchorSection,
    map: e,
    generate: (s, v) => generateMiddleComboProblem(e.id, s, v),
  });
for (const e of judgementDefinitions())
  specs.push({
    scope: "judge",
    key: e.key,
    grade: e.grade,
    section: e.unitSection,
    title: e.title,
    map: e,
    generate: (s, v) => generateJudgeProblem(e.key, s, v),
  });
for (const e of nativeDescriptiveDefinitions())
  specs.push({
    scope: "native-descriptive",
    key: e.definitionId,
    grade: e.grade,
    section: e.unitSection,
    title: e.title,
    map: e,
    generate: (s, v) => generateNativeDescriptive(e.definitionId, s, v),
  });

const inputs = [
  { seed: 0, variant: 0 },
  { seed: 1, variant: 1 },
  { seed: 20261018, variant: 2 },
];
const samples: object[] = [];
const errors: object[] = [];
const records: object[] = [];
const totals: Record<
  string,
  {
    registrations: number;
    generated: number;
    exceptions: number;
    withFigure: number;
    mcqGenerated: number;
    mcqSkipped: number;
    heuristicThin: number;
  }
> = {};
const shapeGroups = new Map<string, string[]>();
const wrapperGroups = new Map<string, string[]>();
for (const e of [...registeredTypes(), ...registeredHighTypes()]) {
  const hash = sha(e.handler.toString());
  wrapperGroups.set(hash, [...(wrapperGroups.get(hash) ?? []), e.key]);
}
for (const spec of specs) {
  const total = (totals[spec.scope] ??= {
    registrations: 0,
    generated: 0,
    exceptions: 0,
    withFigure: 0,
    mcqGenerated: 0,
    mcqSkipped: 0,
    heuristicThin: 0,
  });
  total.registrations++;
  const outputs: Problem[] = [];
  const summaries: object[] = [];
  for (const input of inputs) {
    try {
      const p = spec.generate(input.seed, input.variant);
      outputs.push(p);
      total.generated++;
      total.withFigure += p.figureSpec ? 1 : 0;
      const issues: string[] = [];
      for (const field of ["content", "answer", "solution"] as const) {
        if (!p[field]?.trim()) issues.push(`empty-${field}`);
        if (/\b(?:NaN|Infinity|undefined)\b/.test(p[field]))
          issues.push(`invalid-token-${field}`);
      }
      const skip =
        /(풀면|세면|정리하면|구하면|계산하면|대입하면|나열하면|표로 정리|따져 보면|살펴보면)/.exec(
          p.solution,
        );
      const mathCount = (s: string) => (s.match(/\$[^$]+\$/g) ?? []).length;
      const thin =
        (!!skip &&
          mathCount(p.solution.slice(skip.index + skip[0].length)) <= 2) ||
        (/(방법의 수|경우의 수|몇 가지|가짓수|모두 몇)/.test(p.content) &&
          mathCount(p.solution) <= 3);
      if (thin) total.heuristicThin++;
      const summary = {
        ...input,
        contentSha256: sha(p.content),
        answerSha256: sha(p.answer),
        solutionSha256: sha(p.solution),
        skeletonSha256: sha(skeleton(p.content)),
        solutionLength: p.solution.length,
        withFigure: !!p.figureSpec,
        difficulty: p.difficulty,
        familyId: p.familyId,
        heuristicThin: thin,
        issues,
      };
      summaries.push(summary);
      samples.push({ scope: spec.scope, key: spec.key, ...input, ...p });
      if (issues.length)
        errors.push({ scope: spec.scope, key: spec.key, ...input, issues });
    } catch (error) {
      total.exceptions++;
      errors.push({
        scope: spec.scope,
        key: spec.key,
        ...input,
        error: String(error),
      });
    }
  }
  let deterministic: boolean | null = null;
  if (outputs.length) {
    deterministic =
      JSON.stringify(spec.generate(inputs[0]!.seed, inputs[0]!.variant)) ===
      JSON.stringify(outputs[0]);
    if (!deterministic)
      errors.push({
        scope: spec.scope,
        key: spec.key,
        error: "nondeterministic",
      });
    if (!["judge", "native-descriptive"].includes(spec.scope)) {
      try {
        const p = outputs[0]!;
        const parsed = parseProblemContent(p.content);
        if (parsed.choices.length === 5 && /^[①-⑤]$/.test(p.answer.trim()))
          total.mcqGenerated++;
        else {
          const mc = asMultipleChoice(
            {
              ...p,
              familyKey: `audit:${spec.scope}:${spec.key}`,
              problemType: "audit",
            },
            createRng(20261018),
          );
          const choices = parseProblemContent(mc.content).choices;
          total.mcqGenerated++;
          if (
            choices.length !== 5 ||
            new Set(choices.map(normalized)).size !== 5
          )
            errors.push({
              scope: spec.scope,
              key: spec.key,
              error: "mcq-structure",
              choices,
            });
          samples.push({
            scope: `mcq:${spec.scope}`,
            key: spec.key,
            seed: 0,
            variant: 0,
            ...mc,
          });
        }
      } catch {
        total.mcqSkipped++;
      }
    }
  }
  const shapeKey = outputs.map((p) => sha(skeleton(p.content))).join("|");
  if (
    ["middle", "high"].includes(spec.scope) &&
    outputs.length === inputs.length
  )
    shapeGroups.set(shapeKey, [...(shapeGroups.get(shapeKey) ?? []), spec.key]);
  const map = spec.map as { title?: string } | undefined;
  const correctedTitle =
    spec.scope === "high" ? HIGH_TITLE_CORRECTIONS[spec.key] : undefined;
  records.push({
    scope: spec.scope,
    key: spec.key,
    grade: spec.grade,
    section: spec.section,
    title: spec.title,
    sourceMap: spec.map ?? null,
    titleMatchesCatalog: map?.title
      ? (correctedTitle ?? map.title) === spec.title
      : null,
    deterministic,
    distinctSampleCount: new Set(outputs.map(distinctKey)).size,
    observations: summaries,
  });
}
const result = {
  version: 1,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  generatedAt: new Date().toISOString(),
  inputs,
  method:
    "Registration census; 3 generated observations per path; deterministic rerun of first; one MCQ attempt per eligible path. No independent solving in this sweep. Normalized numeric-masked stems and handler.toString groups are heuristic candidates only, not proven duplicated mathematics.",
  totals,
  errors,
  catalogs: {
    middle: Object.fromEntries(
      Object.entries(middleCatalog).map(([k, v]) => [k, v.types.length]),
    ),
    high: Object.fromEntries(
      Object.entries(highCatalog).map(([k, v]) => [k, v.types.length]),
    ),
  },
  catalogMissing: {
    middle: [...middleMap.keys()].filter(
      (k) => !registeredTypes().some((e) => e.key === k),
    ),
    high: [...highMap.keys()].filter(
      (k) => !registeredHighTypes().some((e) => e.key === k),
    ),
  },
  highHolds: registeredHighHolds(),
  duplicateSkeletonCandidates: [...shapeGroups.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([hash, keys]) => ({ sha256: sha(hash), keys })),
  sharedHandlerSourceCandidates: [...wrapperGroups.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([hash, keys]) => ({ sha256: hash, keys })),
  registrations: records,
  separateArithmetic: {
    method:
      "Separate worksheet engine, not stored problem-bank stock. V2 first/middle/last indexes use the definition-owned verifier; this is not independent solving or full-domain enumeration. V1 inventory only.",
    v1Skills: listArithmeticSkills().map((s) => ({
      id: s.skillId,
      title: s.label,
    })),
    v2Definitions: arithmeticV2Definitions().map((d) => {
      const indexes = [
        ...new Set([0, Math.floor(d.domainSize / 2), d.domainSize - 1]),
      ];
      return {
        id: d.id,
        grade: d.grade,
        domainSize: d.domainSize,
        observations: indexes.map((index) => ({
          index,
          verifiedByDefinition: d.verify(d.problemAt(index)),
        })),
      };
    }),
  },
};
writeFileSync(
  path.join(outDir, "registration-sweep.json"),
  JSON.stringify(result, null, 2) + "\n",
);
writeFileSync(
  path.join(outDir, "generated-samples.jsonl"),
  samples.map((s) => JSON.stringify(s)).join("\n") + "\n",
);
console.log(
  JSON.stringify(
    {
      head: result.head,
      totals,
      errors: errors.length,
      skeletonGroups: result.duplicateSkeletonCandidates.length,
      sharedHandlerSourceGroups: result.sharedHandlerSourceCandidates.length,
      outDir,
    },
    null,
    2,
  ),
);

// Optional follow-up for root's stored-stock candidates. Inputs are local exports,
// never database connections. Retain choices only where they carry the conditions.
const familyFlag = process.argv.indexOf("--thin-families");
const rowFlag = process.argv.indexOf("--thin-rows");
if (familyFlag !== -1 && rowFlag !== -1) {
  type StoredFamily = {
    unitId: string;
    familyKey: string;
    eligibleRows: number;
    distinctStems: number;
  };
  type StoredRow = {
    id: string;
    unitId: string;
    familyKey: string;
    eligible: boolean;
    content: string;
    figureSvg: string | null;
    figureUrls: string[];
  };
  const families = JSON.parse(
    readFileSync(process.argv[familyFlag + 1]!, "utf8"),
  ) as StoredFamily[];
  const stored = readFileSync(process.argv[rowFlag + 1]!, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as StoredRow);
  // Manually read ALL 65 candidates; these 13 ordinary types, plus judge, put
  // candidate expressions/relations in the option list. Derived numeric MCQ
  // distractors are deliberately excluded from distinct-question capacity.
  const conditionLists = new Set([
    "1-2|작도와 합동|10",
    "2-1|일차함수와 그 그래프\u2009 ⑴|01",
    "2-1|일차함수와 그 그래프\u2009 ⑴|03",
    "2-1|일차부등식|01",
    "2-1|일차부등식|04",
    "2-1|일차부등식|06",
    "2-1|유리수와 순환소수|01",
    "2-1|유리수와 순환소수|06",
    "2-1|유리수와 순환소수|17",
    "2-1|유리수와 순환소수|18",
    "2-1|연립일차방정식|01",
    "3-1|이차함수의 그래프 ⑴|01",
    "3-1|이차함수의 그래프 ⑴|04",
  ]);
  const rechecks = families.map((family) => {
    const scope = family.familyKey.startsWith("mid:judge:")
      ? "judge"
      : family.familyKey.startsWith("mid:")
        ? "middle"
        : "native-descriptive";
    const key = family.familyKey.slice(
      scope === "judge"
        ? "mid:judge:".length
        : scope === "middle"
          ? "mid:".length
          : "native-desc:".length,
    );
    const spec = specs.find((s) => s.scope === scope && s.key === key);
    if (!spec)
      throw new Error(`No registered generator for ${family.familyKey}`);
    const choicesCarryConditions = scope === "judge" || conditionLists.has(key);
    const rows = stored.filter(
      (r) =>
        r.eligible &&
        r.unitId === family.unitId &&
        r.familyKey === family.familyKey,
    );
    const storedKeys = rows.map((r) => {
      const p = parseProblemContent(r.content);
      return sha(
        JSON.stringify([
          normalized(p.question),
          choicesCarryConditions ? p.choices.map(normalized).sort() : null,
          r.figureSvg,
          r.figureUrls,
        ]),
      );
    });
    const generated = Array.from({ length: 300 }, (_, variant) =>
      spec.generate(20261018, variant),
    );
    const generatedKeys = generated.map((r) => {
      const p = parseProblemContent(r.content);
      return sha(
        JSON.stringify([
          normalized(p.question),
          choicesCarryConditions ? p.choices.map(normalized).sort() : null,
          r.figureSpec ?? null,
        ]),
      );
    });
    return {
      ...family,
      scope,
      generatorKey: key,
      choicesCarryConditions,
      eligibleRowsRead: rows.length,
      examples: rows.slice(0, 3).map((r) => r.id),
      storedDistinctWithConditions: new Set(storedKeys).size,
      observedGeneratedQuestionVariants: new Set(generatedKeys).size,
      generatedObservations: 300,
      generatedSeed: 20261018,
      variantRange: [0, 299],
      interpretation:
        choicesCarryConditions && new Set(storedKeys).size >= 5
          ? "stem-only-stock-false-positive"
          : "stored-under-five; generator sample is a lower bound, not a proven domain maximum",
    };
  });
  writeFileSync(
    path.join(outDir, "thin-family-rechecks.json"),
    JSON.stringify(
      {
        head: result.head,
        families: rechecks.length,
        generatedObservations: rechecks.length * 300,
        method:
          "All candidate texts read; sorted choices retained for 24 condition-list families. Choice order alone is not variation. Derived distractor differences are excluded. Generator observations do not prove domain exhaustion.",
        rechecks,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      thinFamilies: rechecks.length,
      choicesCarryConditions: rechecks.filter((r) => r.choicesCarryConditions)
        .length,
      noLongerUnderFive: rechecks.filter(
        (r) => r.storedDistinctWithConditions >= 5,
      ).length,
    }),
  );
}
