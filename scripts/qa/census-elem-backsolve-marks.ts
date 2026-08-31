/**
 * **반증 ④ 를 «손으로» 대기 위한 계량기** — 되짚기 자국을 센다.
 *
 *   npx tsx scripts/qa/census-elem-backsolve-marks.ts 초4 1-5- 1-6- 2-4-
 *
 * ## 왜 있나 — `probe-elem-tier-backsolve` 의 ④ 가 내 대단원에서 못 재기 때문이다
 *
 * 그 자의 ④ 는 `forwardReachable`(허용 꼴이 전부 `a×b…`)을 쓴다. 순수 덧뺄셈·나눗셈·
 * 자료형 소단원에서는 연산 갈래조차 «안 닿는다»가 되어 **자격 검사에서 「못 잼」**으로
 * 빠진다(초4 52소단원). 그래서 물결 2 가 쓴 열쇠를 그대로 쓴다 —
 * **「되짚어야 할 미지의 대상을 말로 부르는가」**. 자국이 있는 자리만 사람이 읽어
 * 「그 마디가 굳는가」를 판정한다.
 *
 * ⚠️ **이 자는 판정하지 않는다** — 세어서 사람 앞에 놓을 뿐이다. 그래서 이름이
 *    `probe-` 가 아니다(관문 쓸기는 `probe-elem-*` 만 훑는다).
 * ⚠️ **한계는 물결 2 가 적은 그대로다** — 말을 안 쓰고 마디를 여는 발문은 못 본다.
 *    그래서 「자국 0」은 «마디가 없다»가 아니라 «이 열쇠로는 못 봤다»이다.
 *    합계가 0이면 열쇠가 눈이 먼 것이므로 **끝에서 분모와 함께 찍는다.**
 */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";

const MARK =
  /어떤 수|어떤 소수|어떤 진분수|어떤 대분수|어떤 사각형|어떤 다각형|어떤 정다각형|어떤 배열|어떤 한|어떤 두|알려 주지 않습니다|\square/;
const SEEDS = Array.from({ length: 16 }, (_, i) => i * 7919 + 11);
const TIERS = ["연산", "기본", "응용"] as const;

const argv = process.argv.slice(2);
const grade = argv.find((a) => a.startsWith("초")) ?? "초4";
const prefixes = argv.filter((a) => /^\d+-\d+-/.test(a));

const units = elementaryUnits().filter(
  (u) =>
    u.grade === grade &&
    (prefixes.length === 0 || prefixes.some((p) => u.section.startsWith(p))),
);

let marks = 0;
for (const unit of units) {
  for (const tier of TIERS) {
    let hit = 0;
    let sample = "";
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, tier);
      if (!MARK.test(p.content)) continue;
      hit += 1;
      if (!sample) sample = p.content;
    }
    marks += hit;
    if (hit > 0) {
      console.log(`${unit.section} «${tier}» ${hit}/${SEEDS.length}`);
      console.log(`    ${sample}`);
    }
  }
}
console.log(
  `\n되짚기 자국 ${marks}건 · 훑은 자리 ${units.length * TIERS.length * SEEDS.length} ` +
    `(소단원 ${units.length})`,
);
if (marks === 0) {
  console.log(
    "🔴 자국이 하나도 없다 — 이 열쇠가 눈이 멀었을 수 있다. 범위를 넓혀 다시 재라.",
  );
}
