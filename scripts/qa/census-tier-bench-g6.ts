/**
 * **초6 네 갈래가 «무슨 발문 꼴»로 나타나는가** — 매쓰홀릭 벤치마킹의 밑자료.
 *
 *   npx tsx scripts/qa/census-tier-bench-g6.ts            # 표 전부
 *   npx tsx scripts/qa/census-tier-bench-g6.ts --heads    # 갈래별 첫머리 분포(길다)
 *   npx tsx scripts/qa/census-tier-bench-g6.ts --tails    # 갈래별 어미 분포
 *   npx tsx scripts/qa/census-tier-bench-g6.ts --selftest # 이 계량기가 눈이 멀었나
 *
 * ⚠️ **이것은 판정기가 아니라 계량기다.** 아무것도 판정하지 않으므로 `exit 0` 이
 *    「깨끗」을 뜻하지 않는다. 이름이 `probe-` 가 아닌 것도 그래서다 — 관문 쓸기는
 *    `probe-elem-*` 만 훑으므로 여기 걸리지 않는다.
 *
 * ## 왜 있나
 *
 * D-72 의 축(1단 절차 한 번 · 2단 식을 스스로 세움 · 3단 두 단계 · 4단 역산·조건 조합)이
 * **초6 에서 실제로 어떤 발문 꼴로 나타나는가**를 적으려면 두 길이 있다. 하나는 내가
 * 머리로 목록을 짓는 것이고, 하나는 **엔진이 실제로 낸 것을 세는 것**이다. 앞엣것은
 * 목록에 없는 부류를 구조적으로 0으로 만든다(CLAUDE.md 2026-08-18 「목록을 손으로
 * 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」). 그래서 **센다.**
 *
 * `probe-elem-tier-ladder.ts --census` 가 그 방식의 본보기인데, 그것은 **심화 한 갈래**만
 * 본다. 벤치마킹이 물으려는 것은 **네 갈래가 서로 어떻게 다른가**라 네 갈래를 다 센다.
 *
 * ## 무엇을 재고, 무엇을 **안** 재나
 *
 * ㉠ **잰다 — 발문의 «꼴»**: 첫머리·어미·한글 글자 수·수식 덩어리 수·그림 유무·해설 줄.
 *    전부 **지면에 있는 것**이라 셀 수 있다.
 *
 * ㉡ **안 잰다 — 난이도.** 「이 심화가 응용보다 어려운가」는 지면에 없다. 한글이 길다고
 *    어려운 것이 아니고, 해설 줄이 많다고 어려운 것도 아니다(초5 실측에서 「기본의
 *    걸음이 적다」는 **정상의 정의**였다 — 2단의 어려움은 계산 걸음이 아니라 번역이다).
 *    아래 표의 수치는 **「갈래가 서로 다른 꼴을 내고 있다」는 증거**일 뿐,
 *    **사다리가 오른다는 증거가 아니다.** 높이는 사람이 눈으로 본다
 *    (`/dev/tier-bench/g6` · `scripts/qa/dump-elem-tiers.ts`).
 *
 * ㉢ **4단 표지는 옮겨 적지 않았다.** `tier4Rules.ts` 의 `marksOf` 를 **그대로 import**
 *    한다. 규칙을 두 벌 두면 한쪽만 고쳐도 아무도 모른다. 그 모듈은 부작용이 없어
 *    (판정기와 달리) import 해도 쓸기가 돌지 않는다 — 그 파일 머리말이 적어 둔 그대로다.
 *
 *    ⚠️ 그 목록의 한계를 **그대로 물려받는다**: 표지가 있어도 한 걸음이면 4단이 아니고,
 *    표지가 없어도 **말로 건** 역산·조건이면 4단이다. 그래서 표의 「표지없음」 칸이
 *    높다고 「4단이 아니다」로 읽으면 안 된다 — 그 칸은 **사람이 볼 몫**을 뜻한다.
 *    누가 사람 판정을 받았는지는 `probe-elem-tier-4dan.ts --list` 와 원장
 *    (`scripts/qa/reports/tier4-review.json`)이 안다.
 */
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import type { ElemTier } from "../../src/lib/elementary/types";

import { SweepTally, openFence } from "./elemProbeFence";
import { marksOf } from "./tier4Rules";

const GRADE = "초6";

/** 씨앗 — 갈래가 씨앗으로 갈라지는 경우가 있어 하나로는 못 본다. 판정기와 같은 값. */
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

/* ─────────────────────────── 재는 자 ───────────────────────────
 *
 * ⚠️ 아래 넷은 전부 **지면 글자를 세는 자**다. 난이도를 재지 않는다.
 */

/** 한글 글자 수 — 「식이 그대로 주어짐」과 「문장으로 주어짐」을 가르는 대리 지표. */
export function hangulCount(text: string): number {
  return (text.match(/[가-힣]/g) ?? []).length;
}

/** `$…$` 수식 덩어리 수. */
export function mathRunCount(text: string): number {
  return (text.match(/\$[^$]+\$/g) ?? []).length;
}

/**
 * 해설 걸음 — 빈 줄이 아닌 줄 수.
 *
 * ⚠️ 이것은 **걸음의 대리 지표이지 걸음이 아니다.** 해설이 한 줄에 두 걸음을 적으면
 *    적게 세고, 값을 여러 줄로 늘어놓으면 많이 센다.
 */
export function solutionLines(text: string): number {
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

/** 발문 어미 — 마지막 문장부호 앞 12자. 「무엇을 시키는가」가 여기 있다. */
export function tailOf(content: string): string {
  const flat = content.trim().replace(/\s+/g, " ");
  const noTrail = flat.replace(/[.?!\s]+$/, "");
  return noTrail.slice(-12);
}

/** 발문 첫머리 — 앞 12자. */
export function headOf(content: string): string {
  return content.trim().replace(/\s+/g, " ").slice(0, 12);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/* ─────────────────────────── 눈금 ───────────────────────────
 *
 * ⚠️ **살아 있는 엔진에서 뽑지 않는다.** 엔진이 고쳐지면 양성이 사라져 「자가 도는가」를
 *    영영 못 잰다(CLAUDE.md 2026-08-20). 손으로 만든 글로 «자가 값에 따라 변하는가»만 본다.
 *    음성 대조 — **답이 진실에 따라 안 변하면 그 자는 아무것도 재지 못한다.**
 */
const GAUGE: [string, () => number, number][] = [
  ["한글 0 — 맨 식", () => hangulCount("$3\\div4$"), 0],
  ["한글 셈 — 문장형", () => hangulCount("사과 3개의 무게는 몇 kg입니까?"), 11],
  ["수식 0 — 글만", () => mathRunCount("몇 개입니까?"), 0],
  ["수식 2 — 두 덩어리", () => mathRunCount("$3$과 $4$의 비"), 2],
  [
    "수식 1 — 달러 안의 것은 한 덩어리",
    () => mathRunCount("$3\\div4=\\square$"),
    1,
  ],
  ["해설 걸음 — 빈 줄은 안 센다", () => solutionLines("가\n\n나\n\n다"), 3],
  ["해설 걸음 1", () => solutionLines("한 줄"), 1],
];

const TAIL_GAUGE: [string, string, string][] = [
  ["어미 — 물음표를 뗀다", "상자는 몇 개입니까?", "상자는 몇 개입니까"],
  ["어미 — 마침표를 뗀다", "계산하시오.", "계산하시오"],
  [
    "첫머리 — 줄바꿈을 한 칸으로",
    "계산하시오.\n\n$3\\div4$",
    "계산하시오. $3\\di",
  ],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, fn, want] of GAUGE) {
    const got = fn();
    if (got !== want) bad += 1;
    console.log(
      `  ${got === want ? "✅" : "❌"} ${why} — 기대 ${want} / 실제 ${got}`,
    );
  }
  for (const [why, input, want] of TAIL_GAUGE) {
    const got = why.startsWith("첫머리") ? headOf(input) : tailOf(input);
    if (got !== want) bad += 1;
    console.log(
      `  ${got === want ? "✅" : "❌"} ${why} — 기대 «${want}» / 실제 «${got}»`,
    );
  }
  // 배선 — `marksOf` 를 정말 부르고 있나. 옮겨 적었으면 이 줄이 갈라진다.
  // 양성(표지 있음)과 음성(표지 없음)을 **둘 다** 댄다 — 양성만 대면
  // 「늘 표지가 있다고 답하는 자」도 만점이다(CLAUDE.md 2026-08-20).
  const marksOk =
    marksOf("계산하시오. $\\square+5=12$").length > 0 &&
    marksOf("어떤 수에 $3$을 곱하면 $12$입니다.").length > 0 &&
    marksOf("$3+5$ 를 계산하시오.").length === 0;
  if (!marksOk) bad += 1;
  console.log(
    `  ${marksOk ? "✅" : "❌"} 배선 — 4단 표지는 tier4Rules 의 marksOf 가 판정한다 (양성 2 · 음성 1)`,
  );
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length + TAIL_GAUGE.length + 1}건 전부 맞다 — 자가 값에 따라 변한다`
      : `\n❌ 눈금 ${bad}건 어긋남 — **이 계량기의 수치를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/* ─────────────────────────── 전량 ─────────────────────────── */

const showHeads = process.argv.includes("--heads");
const showTails = process.argv.includes("--tails");

const fence = openFence({ grades: [GRADE] });
const tally = new SweepTally();

const units = elementaryUnits().filter(
  (u) => u.grade === GRADE && supportedTiers(u).length > 0,
);

type Row = {
  hangul: number[];
  math: number[];
  steps: number[];
  figures: number;
  marks: Map<string, number>;
  /** 4단 표지가 **하나도 없는** 문항 수. «4단이 아니다»가 아니라 «사람이 볼 몫»이다. */
  bare: number;
  heads: Map<string, number>;
  tails: Map<string, number>;
  total: number;
};

const rows = new Map<ElemTier, Row>();
for (const t of ELEM_TIERS) {
  rows.set(t, {
    hangul: [],
    math: [],
    steps: [],
    figures: 0,
    marks: new Map(),
    bare: 0,
    heads: new Map(),
    tails: new Map(),
    total: 0,
  });
}

const bump = (m: Map<string, number>, k: string) =>
  m.set(k, (m.get(k) ?? 0) + 1);

for (const unit of units) {
  for (const tier of ELEM_TIERS) {
    tally.count(unit.grade, unit.section, tier, SEEDS.length);
    const row = rows.get(tier)!;
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, tier);
      row.total += 1;
      row.hangul.push(hangulCount(p.content));
      row.math.push(mathRunCount(p.content));
      row.steps.push(solutionLines(p.solution));
      if (p.figureSpec) row.figures += 1;
      const marks = marksOf(p.content);
      if (marks.length === 0) row.bare += 1;
      for (const m of marks) bump(row.marks, m);
      bump(row.heads, headOf(p.content));
      bump(row.tails, tailOf(p.content));
    }
  }
}

tally.assertNonEmpty();
fence.close();

console.log(`훑은 것 — ${tally.line()} · ${fence.scopeLine()}\n`);

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;

console.log("갈래별 발문 꼴 (중앙값)");
console.log(
  "  갈래   문항   한글자   수식덩어리   해설줄   그림   표지없음   표지수/문항   첫머리종수",
);
for (const tier of ELEM_TIERS) {
  const r = rows.get(tier)!;
  const markHits = [...r.marks.values()].reduce((a, b) => a + b, 0);
  console.log(
    `  ${tier}  ${String(r.total).padStart(5)}` +
      `${String(median(r.hangul)).padStart(8)}` +
      `${String(median(r.math)).padStart(13)}` +
      `${String(median(r.steps)).padStart(9)}` +
      `${pct(r.figures, r.total).padStart(8)}` +
      `${pct(r.bare, r.total).padStart(10)}` +
      `${pct(markHits, r.total).padStart(10)}` +
      `${String(r.heads.size).padStart(12)}`,
  );
}

console.log(
  "\n갈래별 4단 표지 내역 (readLadder — 좁은 손 목록, 말로 된 역산은 못 본다)",
);
for (const tier of ELEM_TIERS) {
  const r = rows.get(tier)!;
  const list = [...r.marks].sort((a, b) => b[1] - a[1]);
  console.log(
    `  ${tier}: ${list.length === 0 ? "(없음)" : list.map(([k, v]) => `${k} ${v}`).join(" · ")}`,
  );
}

if (showHeads) {
  for (const tier of ELEM_TIERS) {
    const r = rows.get(tier)!;
    console.log(`\n── ${tier} 발문 첫머리 ${r.heads.size}종 ──`);
    for (const [h, c] of [...r.heads].sort((a, b) => b[1] - a[1]))
      console.log(`  ${String(c).padStart(4)}  ${h}`);
  }
}

if (showTails) {
  for (const tier of ELEM_TIERS) {
    const r = rows.get(tier)!;
    console.log(`\n── ${tier} 발문 어미 ${r.tails.size}종 (상위 25) ──`);
    for (const [h, c] of [...r.tails].sort((a, b) => b[1] - a[1]).slice(0, 25))
      console.log(`  ${String(c).padStart(4)}  ${h}`);
  }
}

console.log(
  "\n⚠️ 위 수치는 **꼴이 다르다는 증거이지 사다리가 오른다는 증거가 아니다.**" +
    "\n   높이는 사람이 본다 — `/dev/tier-bench/g6` 또는 `dump-elem-tiers.ts`.",
);
