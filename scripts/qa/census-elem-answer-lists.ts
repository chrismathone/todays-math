/**
 * **「정답이 여러 값의 나열」과 「모두 구하시오」가 갈래를 가르는가** — 전 학년 계량기.
 *
 *     npx tsx scripts/qa/census-elem-answer-lists.ts
 *     npx tsx scripts/qa/census-elem-answer-lists.ts --selftest
 *
 * ## 왜 있나 (D-113 파일럿, 2026-08-30)
 *
 * 확대 갈래(`심화중`·`심화상`)의 잣대를 정할 때 「**모두** 구하시오」·「답이 여럿」을
 * 표지로 삼고 싶어진다. 그런데 리드가 실측으로 짚었다 — **초4 2-1-4 의 «심화하»가
 * 이미 「□ 안에 들어갈 수 있는 수를 모두 쓰시오」다.** 표지가 이미 아래 칸에 있으면
 * 그것으로는 사다리가 안 갈린다.
 *
 * 그래서 「있나/없나」가 아니라 **갈래별 비율**을 센다. 손 목록이 아니라 산출물을 훑는다.
 *
 * ## 🔴 열쇠가 **둘**이고, 서로의 사각지대를 덮는다
 *
 * ```
 * 덩어리 «안» 쉼표   $6,\ 7,\ 8$        ← `nums()` 가 만드는 꼴
 * 덩어리 «밖» 쉼표   $6$, $7$           ← 손으로 이어 붙인 꼴 (초4 2-1-4 가 이렇다)
 * ```
 *
 * **한쪽만 세면 다른 쪽이 통째로 0이 된다.** 실제로 그래서 같은 것을 재던 두 사람의
 * 수치가 갈렸다(0.9~2.8% vs 5.7%) — 어느 쪽이 틀린 게 아니라 **열쇠가 달랐다.**
 * 그러니 둘을 **따로** 찍고 합집합도 찍는다.
 *
 * ⚠️ **이 자는 «갈래가 옳은가»를 판정하지 않는다.** 난이도는 지면에 없다
 * (`probe-elem-tier-ladder.ts` ㉡-b). 여기서 나오는 것은 「지면에서 같은 꼴로 보이는
 * 것이 아래 칸에도 있나」라는 **모양**뿐이다. 그 값으로 잣대를 정하는 것은 원장님이다.
 * 이름을 `probe-` 로 안 붙인 것도 그래서다 — 관문 쓸기(`probe-elem-*`)에 안 걸린다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242];

/** `$6,\ 7,\ 8$` — **한 KaTeX 덩어리 안**에 쉼표로 값이 둘 이상. */
export function listedInside(answer: string): boolean {
  return [...answer.matchAll(/\$([^$]*)\$/g)].some(
    (m) =>
      (m[1] ?? "")
        // 좌표 `(5, 8)`·중괄호 안 쉼표는 나열이 아니다.
        .replace(/\([^()]*\)/g, "#")
        .replace(/\{[^{}]*\}/g, "#")
        .split(",")
        .filter((s) => s.trim().length > 0).length > 1,
  );
}

/** `$6$, $7$` — 덩어리 **밖** 쉼표. 초4 2-1-4 심화하의 답이 이 꼴이다. */
export function listedOutside(answer: string): boolean {
  return (
    answer
      .replace(/\$[^$]*\$/g, "#")
      .split(/[,、]/)
      .filter((s) => s.trim().length > 0).length > 1
  );
}

/** 발문이 「… 모두 구하시오/쓰시오」인가. */
export function asksAll(content: string): boolean {
  return /모두\s*(구하시오|쓰시오)/.test(content);
}

export type Row = {
  tier: string;
  n: number;
  inside: number;
  outside: number;
  either: number;
  all: number;
};

export function census(
  rows: readonly { tier: string; content: string; answer: string }[],
): Row[] {
  const by = new Map<string, Row>();
  for (const r of rows) {
    const row = by.get(r.tier) ?? {
      tier: r.tier,
      n: 0,
      inside: 0,
      outside: 0,
      either: 0,
      all: 0,
    };
    row.n += 1;
    const i = listedInside(r.answer);
    const o = listedOutside(r.answer);
    if (i) row.inside += 1;
    if (o) row.outside += 1;
    if (i || o) row.either += 1;
    if (asksAll(r.content)) row.all += 1;
    by.set(r.tier, row);
  }
  return [...by.values()];
}

function gauges(): { label: string; ok: () => boolean }[] {
  return [
    // 두 열쇠가 **서로 다른 것**을 본다 — 하나로 뭉치면 한쪽이 구조적으로 0이 된다.
    { label: "안쪽 양성 — `$6,\\ 7$`", ok: () => listedInside("$6,\\ 7$") },
    { label: "안쪽 음성 — `$6$, $7$`", ok: () => !listedInside("$6$, $7$") },
    { label: "바깥 양성 — `$6$, $7$`", ok: () => listedOutside("$6$, $7$") },
    { label: "바깥 음성 — `$6,\\ 7$`", ok: () => !listedOutside("$6,\\ 7$") },
    {
      label: "음성 — 좌표 `$(5, 8)$` 은 나열이 아니다",
      ok: () => !listedInside("$(5, 8)$"),
    },
    { label: "음성 — 단일 값 `$42$`", ok: () => !listedInside("$42$") },
    { label: "「모두」 양성", ok: () => asksAll("… 을 모두 구하시오.") },
    {
      label: "「모두」 음성 — 「모두 몇 개입니까」는 답이 하나다",
      ok: () => !asksAll("… 은 모두 몇 개입니까?"),
    },
    {
      label: "셈 — 갈래별로 따로 센다",
      ok: () => {
        const r = census([
          { tier: "기본", content: "모두 구하시오.", answer: "$1,\\ 2$" },
          { tier: "기본", content: "값은?", answer: "$3$" },
          { tier: "심화하", content: "값은?", answer: "$4$, $5$" },
        ]);
        const basic = r.find((x) => x.tier === "기본")!;
        const deep = r.find((x) => x.tier === "심화하")!;
        return (
          basic.n === 2 &&
          basic.inside === 1 &&
          basic.all === 1 &&
          deep.outside === 1 &&
          deep.inside === 0
        );
      },
    },
  ];
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    let bad = 0;
    for (const g of gauges()) {
      const ok = g.ok();
      if (!ok) bad += 1;
      console.log(`${ok ? "✅" : "❌"} ${g.label}`);
    }
    console.log(`\n눈금 ${gauges().length}건 — 실패 ${bad}건`);
    process.exit(bad === 0 ? 0 : 1);
  }

  const grade = process.argv.slice(2).find((a) => a.startsWith("초"));
  const made: { tier: string; content: string; answer: string }[] = [];
  /** 「모두 …」인 «심화하» — 확대 갈래가 그 표지를 쓰면 아래 칸과 안 갈린다. */
  const clash = new Set<string>();
  for (const u of elementaryUnits()) {
    if (grade && u.grade !== grade) continue;
    for (const tier of supportedTiers(u)) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(u, seed, tier);
        made.push({ tier, content: p.content, answer: p.answer });
        if (tier === "심화하" && asksAll(p.content))
          clash.add(`${u.grade} ${u.section.split(" ")[0]}`);
      }
    }
  }

  const rows = census(made);
  console.log(
    `초등 «정답이 나열»·«모두 구하시오» — ${grade ?? "전 학년"} · 훑은 문항 ${made.length}건 (씨앗 ${SEEDS.length})\n`,
  );
  console.log(
    "  갈래     n      덩어리 안   덩어리 밖   둘 중 하나   「모두 …」",
  );
  const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}%`;
  for (const r of rows) {
    console.log(
      `  ${r.tier.padEnd(6)} ${String(r.n).padStart(5)}` +
        `   ${pct(r.inside, r.n).padStart(7)}   ${pct(r.outside, r.n).padStart(7)}` +
        `   ${pct(r.either, r.n).padStart(9)}   ${pct(r.all, r.n).padStart(8)}`,
    );
  }
  console.log(
    `\n🔴 «심화하»인데 발문이 「모두 …」인 소단원 ${clash.size}개` +
      (clash.size ? `\n   ${[...clash].sort().join(" · ")}` : ""),
  );
  console.log(
    "\n⚠️ 이 자는 **모양**만 센다 — 「그 갈래가 옳은가」는 판정하지 않는다.\n" +
      "   위 소단원이 있으면 「모두 구하시오」는 그 아래 칸과 **안 갈린다**는 뜻이고,\n" +
      "   그때 잣대를 어떻게 할지는 원장님이 정한다(D-71 절차).",
  );
  // 종료 코드로 막지 않는다 — 이것은 계량기이지 관문이 아니다.
}

if (isDirectScript(import.meta.url)) main();
