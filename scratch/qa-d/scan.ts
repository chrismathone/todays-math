/**
 * 지면 글자 훑개 — 값 검산이 구조적으로 못 보는 자리(조사·냄새)를 씨앗 전량으로 센다.
 *
 *   npx tsx scratch/qa-d/scan.ts 24,25,26,27 [씨앗수]
 */
import {
  josaMismatches,
  pageSmells,
} from "../../src/__tests__/helpers/midPage";
import { generateMiddleProblem } from "../../src/lib/middle/generate";

const KEYS = (process.argv[2] ?? "").split(",").filter(Boolean);
const N = Number(process.argv[3] ?? 400);
const modes = new Map<string, Set<number>>();
let bad = 0;

for (const n of KEYS) {
  modes.set(n, new Set());
  for (let seed = 1; seed <= N; seed += 1) {
    const p = generateMiddleProblem(`2-2|여러 가지 사각형|${n}`, seed);
    modes.get(n)!.add(Number(p.facts.mode ?? 0));
    for (const [what, text] of [
      ["발문", p.content],
      ["정답", p.answer],
      ["해설", p.solution],
    ] as const) {
      for (const j of josaMismatches(text)) {
        console.log(`조사 ${n} seed${seed} ${what}: ${j}`);
        bad += 1;
      }
      for (const s of pageSmells(text)) {
        console.log(
          `냄새 ${n} seed${seed} ${what}: ${s} :: ${text.slice(0, 110)}`,
        );
        bad += 1;
      }
    }
  }
}
for (const [n, s] of modes) {
  console.log(`유형 ${n} mode: ${[...s].sort().join(",")}`);
}
console.log(bad === 0 ? "깨끗" : `걸린 것 ${bad}`);
