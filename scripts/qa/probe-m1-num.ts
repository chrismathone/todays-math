/**
 * 변이 하네스용 산출물 지문 — 38유형 × 씨앗·변형을 찍는다.
 *
 * 「파일이 바뀌었나 → **산출물이 바뀌었나** → 그제서야 시험이 빨개지나」의
 * 두 번째 칸이다. 던지는 것도 산출물로 친다(그것도 동작 변화다).
 */
import { M1_NUM } from "../../src/lib/middle/m1Num";
import { generateMiddleProblem } from "../../src/lib/middle/generate";

const lines: string[] = [];
for (const e of M1_NUM) {
  for (const seed of [20260823, 1, 7777]) {
    for (let v = 0; v < 8; v += 1) {
      try {
        const p = generateMiddleProblem(e.key, seed, v);
        lines.push(
          `${e.key}|${seed}|${v}|${p.unitSection}|${p.rpmTitle}|${p.content}|${p.answer}|${p.solution}|${JSON.stringify(p.facts)}`,
        );
      } catch (err) {
        lines.push(`${e.key}|${seed}|${v}|THREW|${(err as Error).message}`);
      }
    }
  }
}
console.log(lines.join("\n"));
