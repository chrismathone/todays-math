import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";

const pattern = "print-check|AnswerPage|answerKeyLayout|WorksheetPrint|useMeasured|packMeasured|PrintOptions|Arithmetic";
const requested = execFileSync("git", ["grep", "-l", "-E", pattern, "--", "src/__tests__/**/*.test.ts*"], { encoding: "utf8" }).trim().split(/\r?\n/);
const baselineComparison = ["src/__tests__/components/JeongtongHeader.test.tsx", "src/__tests__/components/mathgenTemplates.test.tsx", "src/__tests__/unit/arithmeticV2Geometry.test.ts"];
const files = [...new Set([...requested, ...baselineComparison])];
const out = ".qa-artifacts/h2-regression-20261020";
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/selected-files.json`, JSON.stringify({ pattern, requested, additional: files.filter(file => !requested.includes(file)), all: files }, null, 2));
if (freemem() < 3 * 2 ** 30) throw Error(`Need 3GiB before Vitest: ${(freemem() / 2 ** 30).toFixed(2)}GiB`);
console.log(`Vitest gate: ${(freemem() / 2 ** 30).toFixed(2)}GiB; ${requested.length} requested + ${files.length - requested.length} comparison files`);
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", ...files, "--maxWorkers=2", "--reporter=json", `--outputFile=${out}/full.json`], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
