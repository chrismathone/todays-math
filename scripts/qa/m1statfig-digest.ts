/**
 * 산출물 지문 — 변이가 «동작»을 바꿨는지 보는 자. 파일 변경만으로는 모자란다.
 *
 * `figureSpec` 을 **지문에 함께 넣는다** — 그림만 어긋나게 하는 변이(계급 밀기·
 * 도수 뒤집기)는 발문·정답·해설을 하나도 안 바꾸므로, 그림을 안 세면 그 변이가
 * 「산출물이 그대로」로 찍혀 판정 불가가 된다.
 */
import { createHash } from "node:crypto";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_STAT_FIG } from "../../src/lib/middle/m1StatFig";

const h = createHash("sha256");
for (const e of M1_STAT_FIG) {
  h.update(`${e.key}|${e.unitSection}|${e.rpmTitle}\n`);
  for (let s = 0; s < 60; s += 1) {
    try {
      const p = generateMiddleProblem(e.key, s * 7919 + 13);
      h.update(
        `${p.content} ${p.answer} ${p.solution} ${JSON.stringify(p.facts)} ${JSON.stringify(p.figureSpec)}\n`,
      );
    } catch (err) {
      h.update(`THROW:${(err as Error).message}\n`);
    }
  }
}
console.log(h.digest("hex"));
