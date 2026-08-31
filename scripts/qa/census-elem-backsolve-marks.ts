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
 *
 * 🔴 **열쇠는 여기 한 곳에만 적는다.** 관문 시험(`elemTiersG4W3Deep.test.ts`)이
 *    이 상수를 `import` 해서 같은 것을 센다 — 두 벌로 적으면 한쪽만 고쳐도 아무도 모른다.
 *    그래서 훑기 본문은 **이 파일을 직접 실행했을 때만** 돈다(import 하면 안 돈다).
 */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";

/** 「되짚어야 할 미지의 대상을 말로 부르는가」 — 반증 ④ 를 손으로 대는 열쇠. */
export const BACKSOLVE_MARK =
  /어떤 수|어떤 소수|어떤 진분수|어떤 대분수|어떤 사각형|어떤 다각형|어떤 정다각형|어떤 배열|어떤 한|어떤 두|알려 주지 않습니다|\\square/;

/** 아래 갈래만 본다 — ④ 는 「연산·기본·응용 중 하나라도」를 묻는다. */
export const LOWER_TIERS = ["연산", "기본", "응용"] as const;

export function marksOfUnit(
  grade: string,
  prefixes: readonly string[],
  seeds: readonly number[],
): { key: string; hits: number; sample: string }[] {
  const units = elementaryUnits().filter(
    (u) =>
      u.grade === grade &&
      (prefixes.length === 0 || prefixes.some((p) => u.section.startsWith(p))),
  );
  const out: { key: string; hits: number; sample: string }[] = [];
  for (const unit of units) {
    for (const tier of LOWER_TIERS) {
      let hits = 0;
      let sample = "";
      for (const seed of seeds) {
        const p = generateElementaryProblem(unit, seed, tier);
        if (!BACKSOLVE_MARK.test(p.content)) continue;
        hits += 1;
        if (!sample) sample = p.content;
      }
      if (hits > 0)
        out.push({
          key: `${unit.section.split(" ")[0]}|${tier}`,
          hits,
          sample,
        });
    }
  }
  return out;
}

/** 이 파일을 **직접 실행**했을 때만 훑는다 — 시험이 import 해도 아무 일도 안 일어난다. */
function main(): void {
  const argv = process.argv.slice(2);
  const grade = argv.find((a) => a.startsWith("초")) ?? "초4";
  const prefixes = argv.filter((a) => /^\d+-\d+-?$/.test(a));
  const seeds = Array.from({ length: 16 }, (_, i) => i * 7919 + 11);
  const units = elementaryUnits().filter(
    (u) =>
      u.grade === grade &&
      (prefixes.length === 0 || prefixes.some((p) => u.section.startsWith(p))),
  );
  const rows = marksOfUnit(grade, prefixes, seeds);
  let marks = 0;
  for (const r of rows) {
    marks += r.hits;
    console.log(`${r.key} ${r.hits}/${seeds.length}`);
    console.log(`    ${r.sample}`);
  }
  console.log(
    `\n되짚기 자국 ${marks}건 · 훑은 자리 ` +
      `${units.length * LOWER_TIERS.length * seeds.length} (소단원 ${units.length})`,
  );
  if (marks === 0)
    console.log(
      "🔴 자국이 하나도 없다 — 이 열쇠가 눈이 멀었을 수 있다. 범위를 넓혀 다시 재라.",
    );
}

if (
  process.argv[1]
    ?.replace(/\\/g, "/")
    .endsWith("census-elem-backsolve-marks.ts")
)
  main();
