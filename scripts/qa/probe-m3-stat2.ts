/**
 * 변이 하네스용 산출물 지문 — 6E 산포도·상자그림과 산점도 17유형 × 씨앗·변형을 전부 찍는다.
 *
 * 「파일이 바뀌었나 → **산출물이 바뀌었나** → 그제서야 시험이 빨개지나」의
 * 두 번째 칸이다(물결 계약 §8). 던지는 것도 산출물로 친다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_STAT2 } from "../../src/lib/middle/m3Stat2";

const lines: string[] = [];
for (const e of M3_STAT2) {
  for (const seed of [20260824, 1, 7777]) {
    for (let v = 0; v < 8; v += 1) {
      try {
        const p = generateMiddleProblem(e.key, seed, v);
        lines.push(
          `${e.key}|${seed}|${v}|${p.unitSection}|${p.rpmTitle}|${p.content}|${p.answer}|${p.solution}|${JSON.stringify(p.facts)}|${JSON.stringify(p.figureSpec ?? null)}`,
        );
      } catch (err) {
        lines.push(`${e.key}|${seed}|${v}|THREW|${(err as Error).message}`);
      }
    }
  }
}
console.log(lines.join("\n"));
