/**
 * 초4 셋째 물결(`1-5`·`1-6`·`2-4`) **여섯 갈래의 지문** — 변이 하네스가
 * 「파일이 바뀌었다」와 **「동작이 바뀌었다」**를 가르는 데 쓴다.
 *
 * ⚠️ **확대 둘만 찍으면 안 된다.** 지문이 좁으면 「등록에서 핵심 갈래를 뺀다」 변이가
 *    지문을 안 바꿔 하네스가 **판정을 거부**하고, 그러면 「가드가 아니다」도
 *    「판정 못 함」도 거짓이 된다. 그래서 **등록된 갈래 목록 자체**를 지문에 넣고
 *    전 갈래를 찍는다.
 * ⚠️ **그림 스펙도 찍는다** — 1-5 는 축 맨 위(`yMax`)가 발문의 「눈금은 $M$명까지」와
 *    같아야 뜻이 서는데, 그 값은 **발문 글자에 안 나타난다.** 안 찍으면 축만 흔드는
 *    변이가 「산출물 그대로」로 거부된다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const CODES = [
  "1-5-1",
  "1-5-2",
  "1-5-3",
  "1-6-1",
  "1-6-2",
  "1-6-3",
  "1-6-4",
  "1-6-5",
  "2-4-1",
  "2-4-2",
  "2-4-3",
  "2-4-4",
  "2-4-5",
  "2-4-6",
  "2-4-7",
];

const out: string[] = [];
for (const code of CODES) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  )!;
  const tiers = supportedTiers(u);
  out.push(`${code}|갈래=${tiers.join(",")}`);
  for (const tier of tiers) {
    for (let i = 0; i < 6; i += 1) {
      let line: string;
      try {
        const p = generateElementaryProblem(u, 20260901 + i * 6421, tier);
        line = `${p.content}|${p.answer}|${p.solution}|${JSON.stringify(p.figureSpec)}`;
      } catch (e) {
        // 던지는 것도 **동작이 바뀐 것**이다 — 조용히 같은 지문을 내면 안 된다.
        line = `던짐:${String(e).slice(0, 120)}`;
      }
      out.push(`${code}|${tier}|${line}`);
    }
  }
}
console.log(out.join("\n"));
