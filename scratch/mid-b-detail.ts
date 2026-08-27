/** 갈래 B 전용 진단 — 소단원마다 유형 키·난이도·pool 기여를 늘어놓는다. (내 파일) */
import { defaultRatioFor } from "../src/contracts/difficulty";
import { expandFamily } from "../src/lib/engine/expandEngine";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";
import { classifyFormat } from "../src/lib/problem/provenance";

const SEED = 20260827;
const want = process.argv.slice(2);
type E = { key: string; grade: string; unitSection: string };
const by = new Map<string, E[]>();
for (const e of registeredTypes() as unknown as E[]) {
  const k = `${e.grade}|${e.unitSection}`;
  if (!by.has(k)) by.set(k, []);
  by.get(k)!.push(e);
}
for (const [k, es] of by) {
  if (want.length && !want.some((w) => k.includes(w))) continue;
  const poolTally: Record<string, number> = {};
  const lines: string[] = [];
  for (const e of es) {
    const familyKey = `mid:${e.key}`;
    let d = "?";
    let shortRows = 0;
    let note = "";
    try {
      const got = expandFamily((v) => {
        const p = generateMiddleProblem(e.key, SEED, v);
        d = p.difficulty;
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey,
          problemType: p.difficulty === "연산" ? "계산" : "활용",
          difficulty: p.difficulty,
        };
      }, 3);
      for (const it of got.items) {
        const fmt = classifyFormat({
          content: it.content,
          answer: it.answer,
          familyKey: it.familyKey,
          questionType: it.questionType,
          problemType: it.problemType,
        });
        if (fmt === "unknown") note += " [unknown형식]";
        if (it.questionType === "단답형") shortRows += 1;
      }
      if (got.skippedMcq) note += ` [mcq건너뜀 ${got.skippedMcq}]`;
    } catch (err) {
      note = " ERR:" + (err instanceof Error ? err.message : String(err));
    }
    if (shortRows > 0) poolTally[d] = (poolTally[d] ?? 0) + 1;
    lines.push(`   ${e.key}  ${d}  단답행 ${shortRows}${note}`);
  }
  console.log(
    `\n=== ${k}  (유형 ${es.length})  목표 ${JSON.stringify(defaultRatioFor(10))}`,
  );
  console.log(`   pool 갈래수 ${JSON.stringify(poolTally)}`);
  for (const l of lines) console.log(l);
}
