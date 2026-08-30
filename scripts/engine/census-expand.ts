/**
 * 360 소단원 분모에서 변형 3 · 객관식 파생이 몇 갈래나 서는가.
 * DB 없음. 엔진 + expandFamily.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { expandFamily } from "../../src/lib/engine/expandEngine";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const SEED = 20260826;

type Bucket = {
  families: number;
  variantOk: number;
  mcqAll3: number;
  mcqSome: number;
  mcqNone: number;
  variantFail: number;
};

function empty(): Bucket {
  return {
    families: 0,
    variantOk: 0,
    mcqAll3: 0,
    mcqSome: 0,
    mcqNone: 0,
    variantFail: 0,
  };
}

function tally(b: Bucket, skippedMcq: number, variantOk: boolean): void {
  b.families += 1;
  if (!variantOk) {
    b.variantFail += 1;
    return;
  }
  b.variantOk += 1;
  if (skippedMcq === 0) b.mcqAll3 += 1;
  else if (skippedMcq === 3) b.mcqNone += 1;
  else b.mcqSome += 1;
}

const elem = empty();
const elemSections = new Set<string>();
for (const unit of elementaryUnits()) {
  const tiers = supportedTiers(unit);
  if (tiers.length === 0) continue;
  elemSections.add(`${unit.grade}|${unit.section}`);
  // 축 전체가 아니라 **등록된 갈래**만 — `심화중`·`심화상` 은 채우는 중이다(D-113).
  for (const tier of tiers) {
    const familyKey = `elem:${unit.grade}|${unit.section}|${tier}`;
    const problemType =
      tier === "연산" ? "계산" : tier === "기본" ? "개념" : "활용";
    try {
      const got = expandFamily((v) => {
        const p = generateElementaryProblem(unit, SEED + v * 1009, tier);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey,
          problemType,
        };
      }, 3);
      tally(elem, got.skippedMcq, true);
    } catch {
      tally(elem, 3, false);
    }
  }
}

const mid = empty();
const midSections = new Set<string>();
for (const entry of registeredTypes()) {
  midSections.add(`${entry.grade}|${entry.unitSection}`);
  const familyKey = `mid:${entry.key}`;
  try {
    const got = expandFamily((v) => {
      const p = generateMiddleProblem(entry.key, SEED, v);
      return {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey,
        problemType:
          p.difficulty === "연산" || p.difficulty === "기본" ? "계산" : "활용",
      };
    }, 3);
    tally(mid, got.skippedMcq, true);
  } catch {
    tally(mid, 3, false);
  }
}

console.log(
  JSON.stringify(
    {
      denominatorSections: elemSections.size + midSections.size,
      elemSections: elemSections.size,
      midSections: midSections.size,
      elem,
      mid,
    },
    null,
    2,
  ),
);
