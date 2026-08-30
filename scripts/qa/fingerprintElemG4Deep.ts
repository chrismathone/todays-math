/**
 * 초4 1-3 **여섯 갈래**의 지문 — 「파일이 바뀌었다」와 「동작이 바뀌었다」를 가른다.
 *
 * ⚠️ **확대 둘만 찍으면 안 된다.** 처음엔 `심화중`·`심화상` 만 찍었는데, 그러면
 *    「등록에서 핵심 갈래 하나를 뺀다」 변이가 **지문을 안 바꿔** 하네스가 판정을
 *    거부했다(⛔ 산출물이 그대로다). 지문이 좁으면 「가드가 아니다」도 「판정 못 함」도
 *    거짓이 된다 — 2026-08-25 에 적힌 「⑶ 의 지문이 좁으면」 그 자리다.
 *    그래서 **등록된 갈래 목록 자체**를 지문에 넣고 전 갈래를 찍는다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const CODES = ["1-3-1", "1-3-2", "1-3-3", "1-3-4", "1-3-5", "1-3-6", "1-3-7"];
const out: string[] = [];
for (const code of CODES) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  )!;
  const tiers = supportedTiers(u);
  out.push(`${code}|갈래=${tiers.join(",")}`);
  for (const tier of tiers) {
    for (let i = 0; i < 6; i += 1) {
      const p = generateElementaryProblem(u, 20260830 + i * 7919, tier);
      out.push(`${code}|${tier}|${p.content}|${p.answer}|${p.solution}`);
    }
  }
}
console.log(out.join("\n"));
