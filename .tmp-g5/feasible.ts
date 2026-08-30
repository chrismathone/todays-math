/** 소단원마다 후보가 몇 개나 서는가 — **비울지 채울지**를 세어서 정한다. */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../src/lib/elementary/generate";
import { G5_TIERS } from "../src/lib/elementary/g5";

const CODES = ["2-4-1", "2-4-2", "2-4-3", "2-4-4", "2-4-5", "2-4-6", "2-4-7"];
const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

void G5_TIERS;
for (const code of CODES) {
  const unit = elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(code),
  )!;
  for (const tier of ["심화중", "심화상"] as const) {
    try {
      const stems = new Set(
        SEEDS.map(
          (s) => generateElementaryProblem(unit, s, tier as never).content,
        ),
      );
      const answers = new Map<string, number>();
      for (let s = 0; s < 400; s += 1) {
        const a = generateElementaryProblem(unit, s, tier as never).answer;
        answers.set(a, (answers.get(a) ?? 0) + 1);
      }
      const top = Math.max(...answers.values());
      console.log(
        `${code} ${tier}: 발문 ${stems.size}/16 · 답 ${answers.size}가지 · 최빈 ${((top / 400) * 100).toFixed(1)}%`,
      );
    } catch (e) {
      console.log(`${code} ${tier}: ❌ ${String(e).slice(0, 120)}`);
    }
  }
}
