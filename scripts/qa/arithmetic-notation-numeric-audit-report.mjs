import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
const prefix = "scripts/qa/arithmetic-notation-numeric-audit-";
const read = (name) =>
  JSON.parse(readFileSync(`${prefix}${name}.json`, "utf8"));
const census = JSON.parse(
  gunzipSync(readFileSync(`${prefix}inventory.json.gz`)),
);
const baseline = read("baseline"),
  verified = read("verification"),
  smoke = read("smoke"),
  fixtures = read("fixtures-result");
const titlesBefore = read("titles-baseline"),
  titlesAfter = read("titles-verification");
assert.ok(census.complete);
assert.equal(census.visitedCandidates, 152884093);
assert.equal(verified.checkedPatterns, 16473);
assert.equal(
  verified.findings.length +
    verified.texErrors.length +
    fixtures.failures.length +
    titlesAfter.findings.length,
  0,
);
const strandCounts = new Map();
for (const family of census.families) {
  const previous = strandCounts.get(family.strand) ?? [0, 0];
  previous[0]++;
  previous[1] += family.domainSize;
  strandCounts.set(family.strand, previous);
}
const rawInstructions = baseline.findings.filter(
  (f) => f.path === "output-instruction" && f.issue === "raw-math-after-render",
);
const byFamily = new Map();
for (const finding of rawInstructions) {
  const previous = byFamily.get(finding.family) ?? new Set();
  previous.add(finding.example.source);
  byFamily.set(finding.family, previous);
}
const lines = [
  "Arithmetic notation numeric audit — 2026-10-15",
  `Baseline commit: ${census.source}`,
  "Scope: independently authored QA only; no canonical content, IDs, answers, metadata, SVG, packs, renderer, UI or contracts modified by this worker.",
  "Result: all final production pattern checks, v1 projections, independent semantic fixtures and catalog title checks pass. Geometry prompt semantics are owned by the geometry worker.",
  `Final notation.ts SHA-256: ${titlesAfter.build.sha256["src/lib/arithmetic-v2/presentation/notation.ts"]}`,
  `Final text.ts SHA-256: ${titlesAfter.build.sha256["src/lib/arithmetic-v2/presentation/text.ts"]}`,
  "",
  "EXACT COVERAGE",
  `Registry: ${census.registryFamilies} families; excluded all ${census.excludedGeometryFamilies} strand=도형 families, including text-only trigonometry. Included all ${census.selectedFamilies} other families and all 33 측정 families.`,
  `Executed every problemAt(index), index=0..domainSize-1: ${census.visitedCandidates.toLocaleString("en-US")} v2 candidates. Census UTC ${census.started} through ${census.finished}. No candidate sampling.`,
  "All candidate prompt text/latex, optional instruction and answer text/latex were classified into grammar patterns; numeric parameters and canonical exact values were not re-derived.",
  "Patterns: 14,291 prompt; 370 instruction; 1,812 answer = 16,473. Only ASCII digit runs are replaced in keys; signs, punctuation, decimal points, TeX commands, powers, units, variables, Korean and delimiters remain distinct.",
  "Bounded retained evidence: count and first/last original witness for each pattern, gzip-compressed. There is no retained 152-million-string corpus.",
  `Actual final production verification: ${verified.checkedWitnesses.toLocaleString("en-US")} prompt endpoint witnesses, ${verified.componentRenderCalls.toLocaleString("en-US")} component SSR calls, ${verified.markdownRenderCalls} direct MarkdownRenderer SSR calls, ${verified.strictKatexChecks.toLocaleString("en-US")} distinct strict KaTeX checks.`,
  "The 152,884,093 count is generation/census execution, NOT 152,884,093 separate KaTeX renders. KaTeX/DOM checks cover all grammar patterns and their first/last witnesses. Numeric-only substitution equivalence is explicitly the rendering partition.",
  "The DOM oracle removes actual .katex subtrees and inspects remaining visible text; it checks explicit input boundaries independently, so heuristic recovery cannot make a missing boundary pass. No production tokenizer or formatter is used to derive expectations.",
  "",
  "Strand | families | candidates",
  ...[...strandCounts].map(
    ([strand, [families, candidates]]) =>
      `${strand} | ${families} | ${candidates}`,
  ),
  "",
  "ACTUAL DISPLAY ROUTES",
  ...Object.entries(verified.routeCounts).map(
    ([route, count]) => `${route}: ${count} candidates`,
  ),
  "Saved review/output: arithmeticToStudioProblems -> NativeProblem -> MarkdownRenderer; answers -> MathText. Both screen and print modes are exercised over every prompt grammar (first/last finite endpoints).",
  "All v2 answer.latex values are already explicitly delimited on the saved-output path. Plain alternate prompt.text for formula families is NOT the displayed formula and is not misreported as a live raw-math failure.",
  "Functions/data authored prose uses existing explicit math spans. Natural Korean explanation remains prose. Counts in prose instructions are math quantities; words such as 자연수, 기약분수, 첫째, 두 명 are natural Korean and are not treated as TeX commands.",
  "AdminDocumentPreview and dev grade-print previously called the latex-only GradeArithmeticPaper route; root now passes saved-sheet projected problems and NativeProblem. Five semantic fixtures also render real gradeArithmeticPaperPages question/answer pages with those projections.",
  "GradeArithmeticPrompt has no production importer in this snapshot. Its separate helper findings are disclosed as helper findings, not NativeProblem failures. Compatibility helpers were rechecked in the final all-family smoke run.",
  "",
  "BASELINE FINDINGS AND RESOLUTION",
  `Saved NativeProblem output had raw instruction math in ${byFamily.size} distinct nongeometry families (60 instruction/prose variants). No strict KaTeX parse failures: valid formulas alone did not guarantee explicit rendering of surrounding instructions.`,
  "Typical exact cases: x≠0 and □; x≠0, y≠0; (단, x ≠ 0); 주어진 x ... k; x, y lists; % 앞의 수; A/C 항목; 2를 곱하고 0을 더하는 규칙; 지정한 소수 자리의 0. Root arithmeticProseNotation now supplies explicit boundaries; existing authored spans remain unchanged.",
  "Baseline admin GradeArithmeticPaper raw-text findings affected 149 families, including authored $...$ instruction strings and raw vertical arithmetic. Its saved-sheet caller now uses the production projection; numeric compatibility helpers also use math spans.",
  "Baseline unreferenced catalog helper findings affected 157 families. Final residual percent-unit issue was exactly ec-g6-fraction-to-percent-v1, ec-g6-decimal-to-percent-v1, ec-g6-percent-rate-v1, ec-g6-chart-percent-v1, ec-g6-chart-missing-percent-v1; arithmeticGeometryUnitText now explicitly escapes %. This was not a saved NativeProblem failure.",
  `Final compatibility/helper smoke findings: ${smoke.findings.length}; final production findings: ${verified.findings.length}; final strict KaTeX errors: ${verified.texErrors.length}.`,
  "",
  "Exact baseline saved-output instruction cases (family | authored text):",
  ...[...byFamily]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, texts]) => `${id} | ${[...texts].join(" / ")}`),
  "",
  "V1 FINITE DOMAINS AND PATHS",
  "All legal full operand ranges, all carry/borrow partitions and all 1..9 multiplication tables were enumerated; narrower user constraint ranges select subsets. 13,495 distinct skill/operand candidates, seven skills.",
  ...verified.v1.map(
    (entry) =>
      `${entry.skill} | ${entry.candidates} | final raw prompt/answer/legacy-expression = ${entry.outputPromptRaw}/${entry.outputAnswerRaw}/${entry.legacyPromptRaw}`,
  ),
  "Baseline all 13,495 saved answers were raw digits; saved prompts were already explicit display TeX. Legacy ArithmeticPaper rendered all expressions/answer cells as raw React text. Root now explicitly wraps these; the horizontal equality and vertical subtraction operator are included, not left beside partial math.",
  "",
  "ALL 649 CATALOG TITLES (ADDITIONAL OWNER REQUEST)",
  `Actual arithmeticTypeTitle -> MarkdownRenderer check: ${titlesAfter.titles} titles. Baseline ${titlesBefore.findings.length} affected family titles; final ${titlesAfter.findings.length} findings.`,
  "26 baseline titles had standalone arithmetic operators between Korean operand descriptions. Two had literal fraction lists. Textual counts, grade references, Korean colon headings and middle-dot list separators are not assumed mathematical expressions.",
  "Independent semantic check: 큰 수의 1/10·1/100·1/1000배 contains three alternative fractions; 소수의 1/10·1/100배 contains two. The middle dots must not turn into multiplication; actual MathML fraction counts and TeX annotations are checked.",
  ...titlesBefore.findings.map((entry) => `${entry.family} | ${entry.title}`),
  "",
  "INDEPENDENT FIXTURES / VALIDATION",
  `${fixtures.fixtures} independent fixtures pass: contiguous nonzero restrictions, variables, escaped percent, upright units, category symbols, natural Korean preservation, authored fraction/root byte preservation, actual radical/fraction/ratio/exponent/function output and saved-sheet admin projection.`,
  `Additional ${fixtures.singletonPrintChecks} singleton-grammar print checks pass; together with the full first/last run, every prompt grammar has both screen and print coverage.`,
  "Focused TypeScript and ESLint/Prettier validate the audit scripts. Commit uses the normal hook via git -c core.hooksPath=C:/Creative/testautocreator/.husky/_. Dependencies resolve only in the process from existing C:/Creative/testautocreator/node_modules; no installs, links, env files, DB operations or lockfile changes.",
  "This is semantic/DOM and KaTeX validation, not a claim of browser geometry, clipping, fonts, print-page screenshots, official curriculum completeness or learning effectiveness. Root owns browser/layout verification.",
  "",
  "EVIDENCE / REPRODUCTION",
  `${prefix}inventory.json.gz: every family's domain count plus all grammar patterns, counts and exact first/last candidates.`,
  `${prefix}baseline.json: original output and helper failure evidence; counts in findings are weighted endpoint observations, not unique affected candidates.`,
  `${prefix}verification.json: final full production run, exact execution counts, source SHA-256 hashes and per-family output routing.`,
  `${prefix}smoke.json, fixtures-result.json, titles-{baseline,verification}.json: final helper/semantic/title evidence.`,
  "From this worktree (PowerShell; replace source checkout with . after merge):",
  "node --import ./scripts/qa/arithmetic-angle-presentation-deps.mjs --import file:///C:/Creative/testautocreator/node_modules/tsx/dist/loader.mjs scripts/qa/arithmetic-notation-numeric-audit-inventory.ts",
  "node scripts/qa/arithmetic-notation-numeric-audit-build.mjs C:/Creative/testautocreator",
  "node --import ./scripts/qa/arithmetic-angle-presentation-deps.mjs scripts/qa/arithmetic-notation-numeric-audit-runtime.mjs",
  "Repeat runtime with --smoke for every family's helper/instruction checks.",
  "Build with --fixtures or --titles and run corresponding runtime-fixtures.mjs / runtime-titles.mjs using the same --import dependency loader.",
  "node scripts/qa/arithmetic-notation-numeric-audit-typecheck.mjs C:/Creative/testautocreator",
  "node scripts/qa/arithmetic-notation-numeric-audit-report.mjs",
  "Runtime bundles are disposable local build products, deliberately not committed. The original baseline source is commit 955b58866ba6abd18e308b527a5ff25839cfbb9a.",
  "No push or merge performed by this worker. Preserve this branch/worktree until root merges it.",
];
writeFileSync(
  "docs/reports/arithmetic-notation-numeric-20261015.txt",
  `${lines.join("\n")}\n`,
);
console.log(`Wrote focused report: ${lines.length} lines`);
