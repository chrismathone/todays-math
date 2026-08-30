/**
 * **「답이 여러 값의 나열인가」가 갈래를 가르나** — 리드 물음(2026-08-30, D-113).
 *
 *     npx tsx scripts/qa/census-elem-list-answers.ts 초4
 *
 * ## 왜 세나
 *
 * 심화상의 잣대에 「**모두 구하시오**」가 들어 있다. 그것을 **표지**로 삼으면 그 축이
 * 갈래를 가른다고 믿게 되는데, 리드 실측은 그 반대다 — 네 갈래 **전부**에 나열형 답이
 * 0.9~2.8% 씩 있고, 초4 2-1-4 의 **심화하**가 이미 「$\square$ 안에 들어갈 수 있는
 * 수를 모두 구하시오」다. 그러면 그 표지는 심화하와 심화상을 **구분하지 못한다.**
 *
 * 이 자는 그 겹침을 **학년 전량에서 세어** 숫자로 남긴다. 「없다」가 아니라 「이만큼
 * 겹친다」를 적어야 다음 사람이 그 표지를 가드로 쓰지 않는다.
 *
 * ⚠️ **이 자는 «있나»만 센다.** 「그 나열이 진짜 탐색에서 나왔나」는 못 본다 —
 *    후보가 셋뿐인 나열과 스물넷을 훑은 나열이 지면에서 똑같이 보인다(g4 벤치 §4 ㉠).
 *    그 물음은 `elemTiersG4MulDivDeep.test.ts` 가 **훑어서** 답한다.
 */
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = Array.from({ length: 12 }, (_, i) => 20260830 + i * 7919);

/** 값 여럿을 쉼표로 늘어놓은 답 — `$15$, $18$, $20$`. */
export function isListAnswer(answer: string): boolean {
  return /^\$[^$]+\$(?:, \$[^$]+\$)+$/.test(answer.trim());
}

/** 발문이 「모두 구하시오·모두 쓰시오」로 여럿을 요구하는가. */
export function asksForAll(content: string): boolean {
  return /모두 (구하|쓰|찾)/.test(content);
}

type Row = {
  grade: string;
  section: string;
  tier: string;
  list: number;
  asks: number;
  tried: number;
  sample: string;
};

export function scan(gradeFilter?: string): Row[] {
  const out: Row[] = [];
  for (const unit of elementaryUnits()) {
    if (gradeFilter && unit.grade !== gradeFilter) continue;
    for (const tier of supportedTiers(unit)) {
      let list = 0;
      let asks = 0;
      let sample = "";
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        if (isListAnswer(p.answer)) {
          list += 1;
          if (!sample)
            sample = `${p.content.replace(/\n/g, " ").slice(0, 64)} → ${p.answer}`;
        }
        if (asksForAll(p.content)) asks += 1;
      }
      out.push({
        grade: unit.grade,
        section: unit.section,
        tier,
        list,
        asks,
        tried: SEEDS.length,
        sample,
      });
    }
  }
  return out;
}

function main() {
  const grade = process.argv.slice(2).find((a) => a.startsWith("초"));
  const rows = scan(grade);

  // 눈금 — 이 자가 «아니오»를 낼 수 있나. 양성·음성 둘 다 댄다.
  const gauges: [string, boolean][] = [
    ["양성 — 값 셋의 나열을 잡는다", isListAnswer("$15$, $18$, $20$")],
    ["음성 — 값 하나는 안 잡는다", !isListAnswer("$351$")],
    [
      "음성 — 「몫 $16$, 나머지 $5$」는 나열이 아니다",
      !isListAnswer("몫 $16$, 나머지 $5$"),
    ],
    ["음성 — 「$4$개」는 나열이 아니다", !isListAnswer("$4$개")],
    [
      "양성 — 「모두 구하시오」를 잡는다",
      asksForAll("어떤 수를 모두 구하시오."),
    ],
    [
      "음성 — 「모두 몇 개인가」는 «모두 구하라»가 아니다",
      !asksForAll("모두 몇 개인가?"),
    ],
  ];
  let bad = 0;
  for (const [label, ok] of gauges) {
    if (!ok) bad += 1;
    console.log(`${ok ? "✅" : "❌"} ${label}`);
  }
  console.log(`\n눈금 ${gauges.length}건 — 실패 ${bad}건\n`);
  if (bad > 0) {
    console.log("🛑 눈금이 틀렸다 — 아래 수치를 읽지 마라.");
    process.exit(1);
  }

  console.log(`갈래별 «답이 나열» · «모두 구하라» — ${grade ?? "전 학년"}\n`);
  console.log("  갈래     갈래수   답이 나열      모두 구하라");
  for (const tier of ELEM_TIERS) {
    const mine = rows.filter((r) => r.tier === tier);
    if (mine.length === 0) continue;
    const tried = mine.reduce((a, r) => a + r.tried, 0);
    const list = mine.reduce((a, r) => a + r.list, 0);
    const asks = mine.reduce((a, r) => a + r.asks, 0);
    const units = mine.filter((r) => r.list > 0).length;
    console.log(
      `  ${tier.padEnd(6)} ${String(mine.length).padStart(6)}  ` +
        `${String(list).padStart(5)}/${tried} (${((list / tried) * 100).toFixed(1)}%) · 소단원 ${units}` +
        `   ${String(asks).padStart(5)}/${tried} (${((asks / tried) * 100).toFixed(1)}%)`,
    );
  }

  console.log(
    "\n🔴 **심화상 아래 갈래에도 나열형 답이 있으면 그 표지는 갈래를 못 가른다.**",
  );
  for (const tier of ELEM_TIERS) {
    if (tier === "심화상") continue;
    const hit = rows
      .filter((r) => r.tier === tier && r.list > 0)
      .sort((a, b) => b.list - a.list)
      .slice(0, 3);
    for (const r of hit) {
      console.log(`  · ${r.grade} ${r.section} «${tier}» ${r.list}/${r.tried}`);
      console.log(`      ${r.sample}`);
    }
  }
}

if (isDirectScript(import.meta.url)) main();
