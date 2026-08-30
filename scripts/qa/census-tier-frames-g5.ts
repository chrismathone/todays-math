/**
 * **초5 의 D-72 축이 무슨 «발문 꼴»로 나타나나** — 손으로 짓지 않고 센다.
 *
 *   npx tsx scripts/qa/census-tier-frames-g5.ts            # 갈래(4단) 경로
 *   npx tsx scripts/qa/census-tier-frames-g5.ts --forms    # 문형 경로(적재본이 쓰는 것)
 *   npx tsx scripts/qa/census-tier-frames-g5.ts --marks    # 4단 표지가 어느 갈래에 앉나
 *   npx tsx scripts/qa/census-tier-frames-g5.ts --selftest # 이 계량기가 눈이 멀었나
 *
 * ⚠️ **이것은 판정기가 아니라 계량기다.** 아무것도 판정하지 않으므로 `exit 0` 이
 *    「깨끗」을 뜻하지 않는다. 이름이 `probe-` 가 아닌 것도 그래서다.
 *
 * ## 왜 있나
 *
 * 매쓰홀릭 벤치마킹은 「우리 심화가 시중 기준의 어디쯤인가」를 묻는다. 그 물음에
 * 답하려면 먼저 **우리 4단이 이 학년에서 실제로 어떤 문장으로 나타나는지**를 알아야
 * 한다. 그것을 머리로 적으면 목록에 없는 부류가 구조적으로 0이 된다
 * (CLAUDE.md 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 * 그래서 **엔진이 실제로 낸 발문**을 지문으로 접어 빈도순으로 늘어놓는다.
 *
 * ## 🔴 모집단이 둘이다 — 이것이 이 계량기의 핵심이다
 *
 * 초5 는 **두 경로**가 다 등록돼 있다:
 *   · **갈래**  `generateElementaryProblem(unit, seed, tier)` — 소단원당 4단 각 1개.
 *               `probe-elem-tier-ladder.ts` 가 재는 것이 이쪽이다.
 *   · **문형**  `generateElementaryForm(unit, seed, formId)` — 소단원당 10개, 각자
 *               `form.tier` 를 들고 있다. **적재기가 부르는 것은 이쪽이다**
 *               (`scripts/import/load-engine-problems.ts:183`).
 *
 * 즉 **지면에 나가는 난이도 분포는 문형이 정하고, 기존 사다리 판정기는 갈래를 잰다.**
 * 둘은 서로 다른 산출물이라 한쪽이 0이어도 다른 쪽은 아무것도 보장되지 않는다 —
 * CLAUDE.md 2026-08-27·08-30 의 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」와
 * 같은 자리다. 그래서 `--forms` 로 **양쪽을 다 센다.**
 *
 * ## 4단 표지는 «옮겨 적지» 않는다
 *
 * 표지 목록은 `tier4Rules.ts` 가 `--census` 로 골라 검증해 둔 **한 곳**이다. 여기서
 * 다시 적으면 두 벌이 되어 한쪽만 고쳐도 아무도 모른다. 그래서 `marksOf` 를 부른다.
 *
 * ⚠️ **`probe-elem-tier-ladder.ts` 에서 가져오면 안 된다.** 그 파일은 최상위에서
 *    쓸기를 돌리므로 import 하는 순간 **그 판정기가 실행된다** — 실제로 처음에 그렇게
 *    짰다가, 내 `--selftest` 가 한 줄도 안 돌고 **판정기의 눈금이 초록을 찍었다.**
 *    「✅ 눈금 14건」이 내 것처럼 보였다. 규칙 모듈(`tier4Rules.ts`)은 부작용이 없다.
 */
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import { marksOf } from "./tier4Rules";

const GRADE = "초5";
const SEEDS = 12;
const SEED0 = 20260830;
const STEP = 1009;

/**
 * 발문을 **지문**으로 접는다 — 수·수식·소재를 지우면 남는 것이 «꼴»이다.
 *
 * ⚠️ 그림 자국(`[그림]`)은 **남긴다.** 「그림 한 겹」이 D-72 의 2단을 가르는 축이라
 *    지우면 그 축이 통째로 안 보인다.
 */
export function frameOf(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "◇")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────────────── 눈금 ───────────────────────────
 *
 * 계량기도 판정자다. 「0종」이 «없다»인지 «못 셈»인지 갈리려면 이 자가 실제로
 * 무엇을 접고 무엇을 안 접는지 못 박아야 한다(CLAUDE.md 2026-08-20).
 */
const GAUGE: [string, string, string][] = [
  ["수를 지운다", "사과 3개와 배 12개", "사과 N개와 배 N개"],
  ["수식을 지운다", "$2\\times3$ 을 계산", "◇ 을 계산"],
  [
    "같은 꼴은 같은 지문으로 접힌다 (수만 다름)",
    "사과 7개와 배 5개",
    "사과 N개와 배 N개",
  ],
  [
    "그림 자국은 남긴다 (2단의 축)",
    "[그림] 을 보고 답하시오",
    "[그림] 을 보고 답하시오",
  ],
  ["공백을 접는다", "  가로   5 cm  ", "가로 N cm"],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, input, want] of GAUGE) {
    const got = frameOf(input);
    if (got !== want) bad += 1;
    console.log(`  ${got === want ? "✅" : "❌"} ${why} — 「${got}」`);
  }
  // 음성 대조 — 서로 **다른** 꼴이 같은 지문으로 접히면 이 자는 못 쓴다.
  const a = frameOf("사과 3개를 더하시오");
  const b = frameOf("사과 3개를 빼시오");
  const distinct = a !== b;
  if (!distinct) bad += 1;
  console.log(
    `  ${distinct ? "✅" : "❌"} 음성 대조 — 더하기와 빼기는 다른 꼴로 갈린다`,
  );
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length + 1}건 전부 맞다`
      : `\n❌ 눈금 ${bad}건 어긋남 — **이 계량기의 수치를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const units = elementaryUnits().filter((u) => u.grade === GRADE);
const wantForms = process.argv.includes("--forms");
const wantMarks = process.argv.includes("--marks");

/* ─────────────────────── 표지가 어느 갈래에 앉나 ─────────────────────── */
if (wantMarks) {
  // D-72 는 4단을 «역산·조건 조합»으로 정의한다. 그 표지가 정말 심화에 몰려 있나?
  // **이것이 「높이」에 가장 가까운 측정이다** — 그래도 «어려움»이 아니라 «표지»다.
  const tally: Record<
    string,
    { n: number; marked: number; marks: Map<string, number> }
  > = {};
  for (const tier of ELEM_TIERS)
    tally[tier] = { n: 0, marked: 0, marks: new Map() };

  for (const unit of units) {
    if (supportedTiers(unit).length === 0) continue;
    for (const tier of ELEM_TIERS) {
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryProblem(unit, SEED0 + i * STEP, tier);
        const found = marksOf(p.content);
        const t = tally[tier]!;
        t.n += 1;
        if (found.length > 0) t.marked += 1;
        for (const m of found) t.marks.set(m, (t.marks.get(m) ?? 0) + 1);
      }
    }
  }
  console.log(
    `${GRADE} — 4단 표지가 어느 갈래에 앉나 (갈래 경로 · 씨앗 ${SEEDS})\n`,
  );
  for (const tier of ELEM_TIERS) {
    const t = tally[tier]!;
    const pct = t.n === 0 ? 0 : (t.marked / t.n) * 100;
    console.log(
      `  ${tier.padEnd(4)} ${String(t.marked).padStart(4)}/${String(t.n).padEnd(5)}` +
        ` (${pct.toFixed(1)}%)  ${
          [...t.marks]
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ") || "—"
        }`,
    );
  }
  console.log(
    `\n⚠️ 이것은 «표지»지 «어려움»이 아니다. 표지 없이 말로 역산을 거는 심화는` +
      `\n   여기서 «표지 없음»으로 세어진다 — 낮은 %가 곧 결함이 아니다.`,
  );
  process.exit(0);
}

/* ─────────────────────────── 발문 꼴 census ─────────────────────────── */
type Bucket = { frames: Map<string, number>; n: number; units: Set<string> };
const byTier = new Map<string, Bucket>();
for (const tier of ELEM_TIERS)
  byTier.set(tier, { frames: new Map(), n: 0, units: new Set() });

let generated = 0;

for (const unit of units) {
  if (wantForms) {
    for (const form of listedForms(unit)) {
      const b = byTier.get(form.tier)!;
      b.units.add(unit.section);
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryForm(unit, SEED0 + i * STEP, form.id);
        const f = frameOf(p.content);
        b.frames.set(f, (b.frames.get(f) ?? 0) + 1);
        b.n += 1;
        generated += 1;
      }
    }
  } else {
    if (supportedTiers(unit).length === 0) continue;
    for (const tier of ELEM_TIERS) {
      const b = byTier.get(tier)!;
      b.units.add(unit.section);
      for (let i = 0; i < SEEDS; i += 1) {
        const p = generateElementaryProblem(unit, SEED0 + i * STEP, tier);
        const f = frameOf(p.content);
        b.frames.set(f, (b.frames.get(f) ?? 0) + 1);
        b.n += 1;
        generated += 1;
      }
    }
  }
}

const path = wantForms
  ? "문형 (적재기가 부르는 것)"
  : "갈래 (사다리 판정기가 재는 것)";
console.log(`${GRADE} — D-72 축의 발문 꼴 census · 경로: ${path}\n`);

for (const tier of ELEM_TIERS) {
  const b = byTier.get(tier)!;
  console.log(
    `── ${tier} — 지문 ${b.frames.size}종 / 문항 ${b.n}건 / 소단원 ${b.units.size}개 ──`,
  );
  const top = [...b.frames].sort((a, b2) => b2[1] - a[1]).slice(0, 12);
  for (const [f, c] of top)
    console.log(`   ${String(c).padStart(4)}  ${f.slice(0, 96)}`);
  if (b.frames.size > top.length)
    console.log(`   … 그 밖 ${b.frames.size - top.length}종`);
  console.log("");
}

console.log(
  `훑은 것 — 소단원 ${units.length}개 · 문항 ${generated}건 · 씨앗 ${SEEDS}\n` +
    `⚠️ 이것은 계량기다. 「N종」은 이 지문 규칙이 접은 결과이지 «서로 다른 물음»의 수가` +
    `\n   아니다 — 지문이 같아도 소재가 다르면 학생에게는 다른 문항이다.`,
);
