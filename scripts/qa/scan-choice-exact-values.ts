/**
 * 엔진(중등 · 결합형 · 초등)의 객관식 보기를 **정확값**으로 훑는다 — 읽기만 한다(DB · 엔진 출력 무변경).
 *
 * 적재기(`buildMiddleRows` · `buildComboRows` · `buildElemRows`)와 같은 길(생성기 → `expandFamily`)로 보기를 만들고,
 * `exactChoiceValue` 로 보기 다섯을 읽어 둘을 센다.
 *   · 같은 값 — 글자는 달라도 값이 같은 보기 짝(`$\sqrt{8}$` 과 `$2\sqrt{2}$`)
 *   · 덜 정리된 보기 — 근호 안 제곱 인수 · 계수 1 · 약분 안 된 분수 · 분모의 근호 · 분모 1
 * 정답 보기가 덜 정리된 것과 오답만 덜 정리된 것을 가른다(오답만 그러면 학생이 계산 없이 지워 낸다).
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/qa/scan-choice-exact-values.ts [--engines middle,combo,elem]
 *     [--seeds 1,2,3] [--variants 3] [--out <json>] [--dump <행마다 지문 json — 고치기 전후 견주기>]
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import { expandFamily } from "../../src/lib/engine/expandEngine";
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";
import { newOutputPath } from "../import/exam-twin/candidatePack.mjs";
import {
  exactChoiceValue,
  sameValueChoicePairs,
} from "../../src/lib/math/exactChoiceValue";
import { elementaryUnits } from "../../src/lib/elementary/generate";
import {
  generateElementaryForm,
  listedForms,
} from "../../src/lib/elementary/forms";
import {
  generateMiddleComboProblem,
  middleComboDefinitions,
} from "../../src/lib/middle/combo";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1]! : fallback;
};
const seeds = arg("--seeds", "1,2,3,4,5").split(",").map(Number);
const variants = Number(arg("--variants", "3"));
const out = arg("--out", "");
// 고치기 전후의 엔진 출력을 견주려고 행마다 지문을 떠 둔다(형식 · 발문 · 정답).
const dump = arg("--dump", "");
const engines = new Set(arg("--engines", "middle").split(","));
if (
  !seeds.length ||
  seeds.some((s) => !Number.isSafeInteger(s) || s < 0) ||
  !Number.isSafeInteger(variants) ||
  variants < 1 ||
  !engines.size ||
  [...engines].some((e) => !["middle", "combo", "elem"].includes(e))
)
  throw new Error("Invalid engines, seeds or variant count");
const outFile = out ? newOutputPath(out) : null;
const dumpFile = dump ? newOutputPath(dump) : null;
if (outFile && outFile === dumpFile)
  throw new Error("Reports require separate new output paths");
const fingerprints: Record<string, string> = {};
let skippedMcq = 0;
const MARKS = "①②③④⑤";

function choiceTexts(content: string): string[] | null {
  // Read the same choice bodies as bank/print and native engine validation.
  const lines = parseProblemContent(content).choices;
  return lines.length === 5 ? lines : null;
}

type Hit = {
  key: string;
  seed: number;
  variant: number;
  answer: string;
  choices: string[];
  detail: string;
};
const sameValue: Hit[] = [];
const unsimplifiedWrongOnly: Hit[] = [];
const unsimplifiedCorrect: Hit[] = [];
let mcRows = 0;
let fullyReadable = 0;
let failedTypes = 0;
const failedTypeSeedDetails: { key: string; seed: number; error: string }[] =
  [];
const typesTouched = new Set<string>();

type StemOut = {
  content: string;
  answer: string;
  solution: string;
  distractors?: readonly string[];
};

/** 한 문항류 · 한 씨앗 — 적재기와 같은 `expandFamily` 로 형식을 파생해 센다. */
function scanFamily(
  key: string,
  seed: number,
  make: (v: number) => StemOut,
  opts: { allowShort?: boolean } = {},
): void {
  let got;
  try {
    got = expandFamily(
      (v) => {
        const p = make(v);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          ...(p.distractors === undefined
            ? {}
            : { distractors: p.distractors }),
          familyKey: key,
          problemType: "계산",
          variant: v,
        };
      },
      variants,
      opts,
    );
  } catch (error) {
    failedTypes += 1;
    failedTypeSeedDetails.push({
      key,
      seed,
      error: (error instanceof Error ? error.message : String(error)).slice(
        0,
        500,
      ),
    });
    return;
  }
  skippedMcq += got.skippedMcq;
  for (const item of got.items) {
    const variant = (item as { variant?: number }).variant ?? -1;
    fingerprints[`${key}|s${seed}|v${variant}|${item.questionType}`] =
      createHash("sha256")
        .update(`${item.content}::${item.answer}`)
        .digest("hex")
        .slice(0, 16);
    if (item.questionType !== "객관식") continue;
    const choices = choiceTexts(item.content);
    if (!choices) continue;
    mcRows += 1;
    const values = choices.map((c) => exactChoiceValue(c));
    if (values.every((v) => v !== null)) fullyReadable += 1;
    const correctIndex = MARKS.indexOf(item.answer.trim());
    const base = { key, seed, variant, answer: item.answer, choices };
    for (const [i, j] of sameValueChoicePairs(choices)) {
      typesTouched.add(key);
      sameValue.push({ ...base, detail: `${MARKS[i]}=${MARKS[j]}` });
    }
    const flagged = values
      .map((v, i) => ({ i, issues: v?.unsimplified ?? [] }))
      .filter((x) => x.issues.length > 0);
    if (flagged.length === 0) continue;
    typesTouched.add(key);
    const detail = flagged
      .map((x) => `${MARKS[x.i]}:${x.issues.join("+")}`)
      .join(" ");
    if (flagged.some((x) => x.i === correctIndex))
      unsimplifiedCorrect.push({ ...base, detail });
    else unsimplifiedWrongOnly.push({ ...base, detail });
  }
}

if (engines.has("middle"))
  for (const entry of registeredTypes())
    for (const seed of seeds)
      scanFamily(`mid:${entry.key}`, seed, (v) =>
        generateMiddleProblem(entry.key, seed, v),
      );
if (engines.has("combo"))
  for (const def of middleComboDefinitions())
    for (const seed of seeds)
      scanFamily(`combo:${def.id}`, seed, (v) =>
        generateMiddleComboProblem(def.id, seed, v),
      );
if (engines.has("elem"))
  for (const unit of elementaryUnits())
    for (const form of listedForms(unit))
      for (const seed of seeds)
        scanFamily(
          `elem:${unit.grade}|${unit.section}|${form.id}`,
          seed,
          (v) => generateElementaryForm(unit, seed + v * 1009, form.id),
          { allowShort: true },
        );

const byType = (hits: Hit[]) => {
  const m = new Map<string, number>();
  for (const h of hits) m.set(h.key, (m.get(h.key) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const summary = {
  kind: "middle-engine-choice-exact-scan/v1",
  engines: [...engines],
  seeds,
  variants,
  registeredTypes: registeredTypes().length,
  failedTypeSeeds: failedTypes,
  failedTypeSeedDetails,
  skippedMcq,
  mcRows,
  mcRowsAllChoicesReadable: fullyReadable,
  sameValueRows: sameValue.length,
  unsimplifiedWrongOnlyRows: unsimplifiedWrongOnly.length,
  unsimplifiedCorrectRows: unsimplifiedCorrect.length,
  typesTouched: typesTouched.size,
  sameValueByType: byType(sameValue),
  unsimplifiedWrongOnlyByType: byType(unsimplifiedWrongOnly),
  unsimplifiedCorrectByType: byType(unsimplifiedCorrect),
  hits: { sameValue, unsimplifiedWrongOnly, unsimplifiedCorrect },
  engineOutputChanged: false,
  dbReads: 0,
  dbWrites: 0,
};
if (outFile)
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2) + "\n", {
    flag: "wx",
  });
if (dumpFile)
  fs.writeFileSync(dumpFile, JSON.stringify(fingerprints) + "\n", {
    flag: "wx",
  });
console.log(
  JSON.stringify({
    mcRows,
    readable: fullyReadable,
    sameValueRows: sameValue.length,
    unsimplifiedWrongOnlyRows: unsimplifiedWrongOnly.length,
    unsimplifiedCorrectRows: unsimplifiedCorrect.length,
    typesTouched: typesTouched.size,
    failedTypeSeeds: failedTypes,
    skippedMcq,
  }),
);
