/**
 * 초4 넷째 물결(`1-1`·`1-2`·`1-4`·`2-2`·`2-5`) **지문** — 변이 하네스가
 * 「파일이 바뀌었다」와 **「동작이 바뀌었다」**를 가르는 데 쓴다(2026-08-21 규율 ⑵).
 *
 * ⚠️ **비운 대단원(1-1·1-4)도 찍는다.** 「비운 자리에 몰래 붙인다」 변이가 지문을
 *    바꾸려면 그 소단원이 지문 안에 있어야 한다. 안 넣으면 하네스가 «산출물 그대로»로
 *    **판정을 거부**하고, 그러면 「가드가 아니다」도 「판정 못 함」도 거짓이 된다.
 * ⚠️ **등록된 갈래 목록 자체**를 넣는다 — 「등록에서 핵심 갈래를 뺀다」 변이는
 *    남은 갈래의 지면을 하나도 안 바꾼다.
 * ⚠️ **그림 스펙도 찍는다** — 2-5-2 는 꺾은선 값이, 2-5-3 은 표의 지운 칸이
 *    발문 글자에 안 나타난다. 안 찍으면 그림만 흔드는 변이가 거부된다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const CODES = [
  "1-1-1",
  "1-1-2",
  "1-1-3",
  "1-1-4",
  "1-1-5",
  "1-1-6",
  "1-1-7",
  "1-2-1",
  "1-2-2",
  "1-2-3",
  "1-2-4",
  "1-2-5",
  "1-2-6",
  "1-4-1",
  "1-4-2",
  "1-4-3",
  "1-4-4",
  "2-2-1",
  "2-2-2",
  "2-2-3",
  "2-2-4",
  "2-2-5",
  "2-5-1",
  "2-5-2",
  "2-5-3",
];

const out: string[] = [];
for (const code of CODES) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(`${code} `),
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
