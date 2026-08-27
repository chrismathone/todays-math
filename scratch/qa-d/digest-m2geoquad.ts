/**
 * `m2GeoQuad` 가 내는 **모든** 유형의 산출물 지문 — 변이 하네스의 ⑶ 단계가 쓴다.
 *
 * ⚠️ 유형 번호를 **손으로 나열하지 않는다.** 처음에 18~27 만 적어 뒀더니,
 *    02·04·06 만 건드리는 변이(`coefTex`)에서 지문이 그대로라 하네스가
 *    「⑶ 산출물이 그대로다」로 **판정을 거부**했다. 목록을 손으로 쓰면
 *    세는 쪽이 눈이 먼다 — 모듈이 등록한 것을 그대로 돈다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_GEO_QUAD } from "../../src/lib/middle/m2GeoQuad";

for (const entry of M2_GEO_QUAD) {
  for (let seed = 1; seed <= 25; seed += 1) {
    const p = generateMiddleProblem(entry.key, seed);
    console.log(
      [
        entry.key,
        seed,
        p.content,
        p.answer,
        p.solution,
        JSON.stringify(p.facts),
        JSON.stringify(p.figureSpec),
      ].join(" | "),
    );
  }
}
