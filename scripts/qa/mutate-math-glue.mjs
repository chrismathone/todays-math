/** Restore each old rule, prove changed behavior and failing guards, then restore. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const out = path.join(root, ".qa-artifacts/math-glue");
mkdirSync(out, { recursive: true });
const branch = spawnSync("git", ["branch", "--show-current"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(branch.status, 0);
assert.ok(
  branch.stdout.trim() && !/^(main|master)$/.test(branch.stdout.trim()),
  "Use an isolated task branch.",
);
const sourcePath = path.join(root, "src/lib/math/normalizeMathgenText.ts");
const original = readFileSync(sourcePath);
const source = original.toString("utf8").replace(/\r\n/g, "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const run = (args) => {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    timeout: 120000,
  });
  if (result.error) throw result.error;
  return result;
};
const probe = () => {
  const result = run([
    "node_modules/tsx/dist/cli.mjs",
    "scripts/qa/check-math-glue.ts",
    "--observe",
  ]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
const baseline = probe();
assert.ok(baseline.every((row) => row.asExpected && row.idempotent));
const baselineTests = run([
  "node_modules/vitest/vitest.mjs",
  "run",
  "src/__tests__/unit/normalizeMathgenText.glue.test.ts",
  "--reporter=json",
  `--outputFile=${path.join(out, "mutation-baseline.json")}`,
]);
assert.equal(
  baselineTests.status,
  0,
  baselineTests.stdout + baselineTests.stderr,
);
const mutations = [
  {
    name: "skip-adjacent-inline-closer",
    from: "while (end >= 0 && escaped(text, end)) {",
    to: 'while (end >= 0 && (escaped(text, end) || (open === "$" && text[end + 1] === "$"))) {',
  },
  {
    // 닫히지 않은 `$$` 를 예전처럼 날 글로 남긴다(2026-09-26 후보정 전 동작).
    // ⚠️ `replace` 의 치환 문자열에서 `$$` 는 `$` 가 된다 — 그래서 `open[1]` 로 쓴다.
    name: "keep-unclosed-display-literal",
    from: "    let runStart = bodyStart;",
    to: '    if (open[1] === "$")\n      return out + prose(text.slice(plainStart, i)) + text.slice(i);\n    let runStart = bodyStart;',
  },
];
const results = [];
try {
  for (const mutation of mutations) {
    assert.equal(
      source.split(mutation.from).length,
      2,
      `Exact mutation site: ${mutation.name}`,
    );
    const mutated = source.replace(mutation.from, mutation.to);
    assert.notEqual(hash(mutated), hash(original));
    writeFileSync(sourcePath, mutated);
    const observed = probe();
    assert.notDeepEqual(
      observed,
      baseline,
      `Mutation must change output: ${mutation.name}`,
    );
    const reportFile = path.join(out, `${mutation.name}.json`);
    const tested = run([
      "node_modules/vitest/vitest.mjs",
      "run",
      "src/__tests__/unit/normalizeMathgenText.glue.test.ts",
      "--reporter=json",
      `--outputFile=${reportFile}`,
    ]);
    writeFileSync(
      path.join(out, `${mutation.name}.log`),
      tested.stdout + tested.stderr,
    );
    const testReport = JSON.parse(readFileSync(reportFile, "utf8"));
    assert.equal(
      tested.status,
      1,
      "Expect test assertion failure, not process/setup failure",
    );
    assert.ok(testReport.numFailedTests > 0);
    results.push({
      name: mutation.name,
      sha256: hash(mutated),
      changedBehavior: true,
      failedTests: testReport.numFailedTests,
      totalTests: testReport.numTotalTests,
      observed,
    });
    writeFileSync(sourcePath, original);
  }
} finally {
  writeFileSync(sourcePath, original);
  assert.equal(hash(readFileSync(sourcePath)), hash(original));
}
writeFileSync(
  path.join(out, "mutation-summary.json"),
  JSON.stringify(
    { originalSha256: hash(original), restored: true, baseline, results },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    results.map(({ name, failedTests, totalTests }) => ({
      name,
      failedTests,
      totalTests,
    })),
    null,
    2,
  ),
);
