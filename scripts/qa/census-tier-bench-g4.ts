/**
 * **초4 네 갈래가 «실제로 어떤 발문 꼴»인가** — 매쓰홀릭 벤치마킹 준비 (2026-08-30).
 *
 *   npx tsx scripts/qa/census-tier-bench-g4.ts            # 갈래별 축 요약
 *   npx tsx scripts/qa/census-tier-bench-g4.ts --frames   # 발문 «틀» 빈도순 (열쇠를 손으로 안 짓기 위한 자리)
 *   npx tsx scripts/qa/census-tier-bench-g4.ts --tails    # 물음 꼴(맺음말) 빈도순
 *   npx tsx scripts/qa/census-tier-bench-g4.ts --json     # 시안 화면이 읽을 산출물
 *   npx tsx scripts/qa/census-tier-bench-g4.ts --per-unit # 소단원×갈래의 «틀»을 다 편다 (사람이 등급 매길 몫)
 *   npx tsx scripts/qa/census-tier-bench-g4.ts --holic    # 리드 가설 ㉠~㉣ 을 반증 가능한 수로
 *
 * ⚠️ **이것은 판정기가 아니라 계량기다.** 아무것도 판정하지 않으므로 `exit 0` 이
 *    「깨끗」을 뜻하지 않는다. 이름이 `probe-` 가 아닌 것도 그래서다 — 관문 쓸기는
 *    `probe-elem-*` 만 훑는다.
 *
 * ## 왜 있나
 *
 * `probe-elem-tier-ladder.ts` 머리말 ㉡ 이 스스로 적어 두었다 — **사다리의 «높이»는
 * 안 잰다.** 「이 심화가 응용보다 어려운가」를 못 묻는다. 매쓰홀릭 벤치마킹이 재려는
 * 것이 정확히 그 축이다. 그 축을 세우려면 먼저 **우리 넷이 지금 무슨 꼴인지**를
 * 알아야 하는데, 그것을 머리로 적으면 목록에 없는 부류가 구조적으로 0이 된다
 * (CLAUDE.md 2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 *
 * 그래서 `--frames` 가 **먼저**다. 무엇이 「꼴」인지 미리 정하지 않고 전량을 빈도순으로
 * 늘어놓는다. 보고서의 D-72 축 표는 그 목록에서 **골라** 적은 것이지 지어낸 것이 아니다.
 *
 * ## 무엇을 재고, 무엇을 **안** 재나
 *
 * ㉠ **잰다 — 지면에 있는 것.** 발문 길이 · 문장 맥락 유무 · 「식이 그대로 주어졌나」 ·
 *    수의 개수 · 그림 유무 · 4단 표지 · 해설 걸음. 전부 종이에 찍혀 있는 값이다.
 *
 * ㉡ **못 잰다 — 「어느 쪽이 어려운가」.** 난이도는 지면에 없다(같은 「걸음 0」이
 *    한쪽에서는 결함이고 다른 쪽에서는 개념이다). 그 판단은 사람이 시안 화면에서 한다.
 *    여기 수치는 **그 사람이 볼 것을 좁혀 주는 용도**지 판정이 아니다.
 *
 * ㉢ **표지 규칙을 옮겨 적지 않는다.** `tier4Rules.marksOf` 를 그대로 부른다 —
 *    두 벌로 적으면 한쪽만 고쳐도 아무도 모른다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";

import { SweepTally, openFence } from "./elemProbeFence";
import { marksOf } from "./tier4Rules";

const GRADE = "초4";

/** 씨앗 — 갈래가 씨앗으로 갈라진다. 다른 초등 판정기와 **같은 열두 개**를 쓴다. */
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

/**
 * 발문의 **틀** — 값을 지우고 말투만 남긴다.
 *
 * `$…$` 는 `▦`, 맨 숫자는 `▪`. 「$3$과 $5$의 합」과 「$7$과 $9$의 합」이 한 틀이 된다.
 * 이 열쇠는 **계량기용**이지 제품 규칙이 아니다 — 그래서 여기 산다.
 */
function frameOf(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "▦")
    .replace(/\d+/g, "▪")
    .replace(/\s+/g, " ")
    .trim();
}

/** 물음 꼴 — 맺음말. 「무엇을 시키는가」가 여기 있다. */
function tailOf(content: string): string {
  const flat = content
    .replace(/\$[^$]*\$/g, "▦")
    .replace(/\s+/g, " ")
    .trim();
  const parts = flat.split(/(?<=[.?!])\s+/).filter((s) => s.length > 0);
  const last = parts[parts.length - 1] ?? flat;
  return last.length <= 22 ? last : `…${last.slice(-20)}`;
}

/** 발문이 **식을 그대로 주는가** — 연산자가 든 수식이 있으면 그렇다. */
const BARE_EXPR = /\$[^$]*(?:[+\-=<>]|\\times|\\div|\\frac|\\square)[^$]*\$/;

/** 한글 서술이 붙어 있는가 (수식과 지시어만이 아닌 «맥락»). */
function koreanChars(content: string): number {
  const stripped = content.replace(/\$[^$]*\$/g, " ");
  return (stripped.match(/[가-힣]/g) ?? []).length;
}

/** 해설의 «걸음» — 등호 개수. 참고용이다(판정 열쇠로는 이미 버려진 축이다). */
function solutionSteps(solution: string): number {
  return (solution.match(/=/g) ?? []).length;
}

type Row = {
  section: string;
  chapter: string;
  tier: string;
  seed: number;
  content: string;
  answer: string;
  solution: string;
  hasFigure: boolean;
  marks: string[];
  frame: string;
  tail: string;
};

const fence = openFence({ grades: [GRADE] });
const tally = new SweepTally();

const units = elementaryUnits().filter(
  (u) => u.grade === GRADE && supportedTiers(u).length > 0,
);

const rows: Row[] = [];
for (const unit of units) {
  for (const tier of ELEM_TIERS) {
    tally.count(unit.grade, unit.section, tier, SEEDS.length);
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, tier);
      rows.push({
        section: unit.section,
        chapter: unit.chapter,
        tier,
        seed,
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        hasFigure: p.figureSpec !== null,
        marks: marksOf(p.content),
        frame: frameOf(p.content),
        tail: tailOf(p.content),
      });
    }
  }
}

tally.assertNonEmpty();
fence.close();

const mode = process.argv.includes("--frames")
  ? "frames"
  : process.argv.includes("--tails")
    ? "tails"
    : process.argv.includes("--json")
      ? "json"
      : process.argv.includes("--per-unit")
        ? "per-unit"
        : process.argv.includes("--holic")
          ? "holic"
          : "axes";

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`;
}

if (mode === "json") {
  // 시안 화면이 읽는다. 갈래별로 씨앗 하나(첫째)만 — 사람이 한 줄씩 견주는 화면이다.
  const out = units.map((u) => ({
    chapter: u.chapter,
    section: u.section,
    tiers: ELEM_TIERS.map((t) => {
      const r = rows.find(
        (x) => x.section === u.section && x.tier === t && x.seed === SEEDS[0],
      )!;
      return {
        tier: t,
        content: r.content,
        answer: r.answer,
        solution: r.solution,
        marks: r.marks,
        hasFigure: r.hasFigure,
      };
    }),
  }));
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

if (mode === "per-unit") {
  // 사람이 등급을 매기려면 «한 씨앗»으로는 모자란다 — 갈래마다 틀이 두셋이다.
  // 그래서 12씨앗의 **서로 다른 틀을 다 펴고** 각 틀의 실물 하나를 같이 찍는다.
  for (const u of units) {
    console.log(`\n${"═".repeat(78)}\n${u.grade} ${u.section}`);
    for (const tier of ELEM_TIERS) {
      const mine = rows.filter(
        (r) => r.section === u.section && r.tier === tier,
      );
      const byFrame = new Map<string, Row[]>();
      for (const r of mine)
        byFrame.set(r.frame, [...(byFrame.get(r.frame) ?? []), r]);
      const sorted = [...byFrame].sort((a, b) => b[1].length - a[1].length);
      console.log(`  [${tier}] 틀 ${sorted.length}종`);
      for (const [, group] of sorted) {
        const r = group[0]!;
        console.log(
          `    ${String(group.length).padStart(2)}/12  ${r.content.replace(/\s+/g, " ")}`,
        );
        console.log(
          `          → ${r.answer.replace(/\s+/g, " ")}` +
            (r.hasFigure ? "   [그림]" : "") +
            (r.marks.length > 0 ? `   [표지 ${r.marks.join(",")}]` : ""),
        );
        console.log(
          `          해설: ${r.solution.replace(/\s+/g, " ").slice(0, 150)}`,
        );
      }
    }
  }
  console.log(`\n훑은 것 — ${tally.line()} · ${fence.scopeLine()}`);
  process.exit(0);
}

if (mode === "holic") {
  /* 리드가 매쓰홀릭 6단(개념·기본·실력하·실력중·심화하·심화중)을 실측해 세운 가설
   * ㉠~㉣ 을 **초4 전량**으로 되짚는다. 표본 3건으로 단정하지 않기 위한 자리다.
   *
   * ⚠️ 여기 수치는 **가설을 좁혀 줄 뿐 등급을 매기지 않는다.** 「이 문항이 저쪽
   *    심화(중)인가」는 지면에 없다 — 사람이 시안 화면에서 본다. */
  const deep = rows.filter((r) => r.tier === "심화");

  console.log("══ ㉠ 「저쪽 심화(중) 층이 우리에게 없다」 ══\n");
  // 저쪽 심화(중)의 실물 셋(복면산 · 경우의 수 · 카드 나눠 두 번째로 큰 수)이 공통으로
  // 요구하는 것은 **여러 경우를 세어 고르는 것**이다. 지면에 남는 자국이 둘 있다:
  //   ㉮ 답이 값 하나가 아니다(여럿을 «모두» 쓴다)
  //   ㉯ 발문이 「모두 몇 개/몇 가지」를 센다
  // 둘 다 `--tails` 에 실제로 나온 말이지 지어낸 것이 아니다.
  const manyAns = deep.filter((r) => /,/.test(r.answer));
  const countAll = deep.filter((r) => /모두 몇|몇 가지/.test(r.content));
  const pickAll = deep.filter((r) => /모두 (쓰|구하)/.test(r.content));
  const optimum = deep.filter((r) => /가장 (크|작|큰|작은)/.test(r.content));
  for (const [name, hit] of [
    ["답이 값 여럿 (쉼표)", manyAns],
    ["「모두 몇 개·몇 가지」를 센다", countAll],
    ["「모두 쓰시오·모두 구하시오」", pickAll],
    ["최적 고르기 (가장 큰·작은)", optimum],
  ] as const) {
    const secs = new Set(hit.map((r) => r.section.split(" ")[0]!));
    console.log(
      `  ${name.padEnd(28)} 문항 ${String(hit.length).padStart(3)}/${deep.length}  ${pct(hit.length, deep.length).padStart(6)}  · 소단원 ${secs.size}/${units.length}`,
    );
  }
  const anyEnum = deep.filter(
    (r) =>
      /,/.test(r.answer) ||
      /모두 몇|몇 가지|모두 (쓰|구하)/.test(r.content) ||
      /가장 (크|작|큰|작은)/.test(r.content),
  );
  console.log(
    `  ${"넷 중 하나라도".padEnd(28)} 문항 ${String(anyEnum.length).padStart(3)}/${deep.length}  ${pct(anyEnum.length, deep.length).padStart(6)}  · 소단원 ${new Set(anyEnum.map((r) => r.section.split(" ")[0]!)).size}/${units.length}`,
  );
  console.log(
    "\n  ⚠️ 이 넷은 **저쪽 심화(중)과 같다는 뜻이 아니다.** 「여러 경우를 센다」는\n" +
      "     심화(중)의 **필요조건**이지 충분조건이 아니다 — 깊이는 사람이 봐야 한다.",
  );

  console.log("\n══ ㉡ 「응용이 얇다」 — 같은 문형이 몇 개인가 ══\n");
  console.log(
    "  갈래   틀1종인 소단원   최빈틀이 12씨앗 중 차지하는 몫(중앙값)   소단원당 틀(중앙값)",
  );
  for (const tier of ELEM_TIERS) {
    const perUnit = units.map((u) => {
      const mine = rows.filter(
        (r) => r.section === u.section && r.tier === tier,
      );
      const c = new Map<string, number>();
      for (const r of mine) c.set(r.frame, (c.get(r.frame) ?? 0) + 1);
      const top = Math.max(...c.values());
      return { frames: c.size, topShare: top / mine.length };
    });
    const one = perUnit.filter((p) => p.frames === 1).length;
    console.log(
      `  ${tier}   ${String(one).padStart(11)}/${units.length}   ` +
        `${(median(perUnit.map((p) => Math.round(p.topShare * 100))) + "%").padStart(28)}   ` +
        `${String(median(perUnit.map((p) => p.frames))).padStart(12)}`,
    );
  }

  console.log("\n══ ㉢ 「우리 기본이 저쪽 기본보다 위」 ══\n");
  for (const tier of ELEM_TIERS) {
    const mine = rows.filter((r) => r.tier === tier);
    const marked = new Set(
      mine
        .filter((r) => r.marks.length > 0)
        .map((r) => r.section.split(" ")[0]!),
    );
    console.log(
      `  ${tier}  4단 표지가 붙은 소단원 ${String(marked.size).padStart(2)}/${units.length}` +
        `  · 「식이 그대로」 ${pct(mine.filter((r) => BARE_EXPR.test(r.content)).length, mine.length).padStart(6)}` +
        `  · 한글 맥락 중앙값 ${String(median(mine.map((r) => koreanChars(r.content)))).padStart(3)}자`,
    );
  }
  // 저쪽 기본은 계산의 «구조»를 묻는다(자릿값 분해·수 모형·계산 방법 따라가기).
  // ⚠️ 이 낱말 목록은 **손으로 지은 것**이다 — 0 이면 «없다»가 아니라 «이 열쇠로는
  //    못 셌다»로 읽어야 한다. 있으면 참이고, 없으면 사람이 봐야 한다.
  const STRUCT = /자릿값|수 모형|모형으로|계산 방법|어떻게 계산|분해/;
  console.log(
    `\n  「계산의 구조를 묻는가」 (손으로 지은 열쇠 — 0 은 «못 셈»일 수 있다)`,
  );
  for (const tier of ELEM_TIERS) {
    const mine = rows.filter((r) => r.tier === tier);
    const hit = mine.filter((r) => STRUCT.test(r.content));
    console.log(
      `    ${tier}  ${String(hit.length).padStart(3)}/${mine.length}` +
        (hit.length > 0
          ? `   예) ${hit[0]!.content.replace(/\s+/g, " ").slice(0, 70)}`
          : ""),
    );
  }

  console.log(
    "\n══ ㉣ 「잘못 계산한 사람은?」— 저쪽 실력(하)가 우리 4단 표지 ══\n",
  );
  // 심화가 **표지 하나**로 서 있으면 그 하나가 무엇인지가 곧 그 갈래의 천장이다.
  const soleMark = new Map<string, string[]>();
  for (const u of units) {
    const ms = rows
      .filter((r) => r.section === u.section && r.tier === "심화")
      .map((r) => r.marks);
    if (!ms.every((m) => m.length > 0)) continue; // 표지 0 이 하나라도 있으면 사람 몫
    const uniq = [...new Set(ms.flat())];
    if (uniq.length !== 1) continue;
    soleMark.set(uniq[0]!, [...(soleMark.get(uniq[0]!) ?? []), u.section]);
  }
  const soleTotal = [...soleMark.values()].reduce((a, b) => a + b.length, 0);
  console.log(
    `  심화가 **표지 하나**로만 서는 소단원 ${soleTotal}/${units.length} — 그 하나가 곧 천장이다`,
  );
  for (const [mark, secs] of [...soleMark].sort(
    (a, b) => b[1].length - a[1].length,
  ))
    console.log(
      `    ${String(secs.length).padStart(2)}  ${mark}\n        ${secs.map((s) => s.split(" ")[0]).join(" · ")}`,
    );
  const wrongOnly = rows.filter(
    (r) =>
      r.tier === "심화" &&
      r.marks.length === 1 &&
      r.marks[0] === "잘못 계산·바르게 (D-72 4단 예시)",
  );
  console.log(
    `\n  「잘못 계산·바르게」가 **그 문항의 유일한 표지**인 심화 문항 ${wrongOnly.length}/${deep.length}` +
      ` · 소단원 ${new Set(wrongOnly.map((r) => r.section.split(" ")[0]!)).size}/${units.length}`,
  );

  console.log(`\n훑은 것 — ${tally.line()} · ${fence.scopeLine()}`);
  console.log(
    "\n⚠️ 계량기다. 아무것도 판정하지 않으므로 exit 0 이 「깨끗」을 뜻하지 않는다.",
  );
  process.exit(0);
}

if (mode === "frames" || mode === "tails") {
  const key = mode === "frames" ? "frame" : "tail";
  for (const tier of ELEM_TIERS) {
    const mine = rows.filter((r) => r.tier === tier);
    const counts = new Map<string, { n: number; sec: Set<string> }>();
    for (const r of mine) {
      const k = r[key as "frame" | "tail"];
      const cur = counts.get(k) ?? { n: 0, sec: new Set<string>() };
      cur.n += 1;
      cur.sec.add(r.section.split(" ")[0]!);
      counts.set(k, cur);
    }
    const sorted = [...counts].sort((a, b) => b[1].n - a[1].n);
    console.log(
      `\n══ ${tier} — ${key === "frame" ? "발문 틀" : "물음 꼴"} ${counts.size}종 / 문항 ${mine.length}건 ══`,
    );
    for (const [k, v] of sorted.slice(0, mode === "tails" ? 40 : 60))
      console.log(
        `  ${String(v.n).padStart(4)}  [소단원 ${String(v.sec.size).padStart(2)}]  ${k.slice(0, 150)}`,
      );
    if (sorted.length > (mode === "tails" ? 40 : 60))
      console.log(
        `  … 그 밖 ${sorted.length - (mode === "tails" ? 40 : 60)}종`,
      );
  }
  console.log(`\n훑은 것 — ${tally.line()} · ${fence.scopeLine()}`);
  console.log(
    "\n⚠️ 계량기다. 아무것도 판정하지 않으므로 exit 0 이 「깨끗」을 뜻하지 않는다.",
  );
  process.exit(0);
}

/* ── 기본: 갈래별 축 요약 ── */
console.log(
  `══ ${GRADE} 갈래별 축 (소단원 ${units.length} · 씨앗 ${SEEDS.length}) ══\n`,
);
console.log(
  "갈래   문항  발문자수  한글자수  식그대로   수개수  그림   4단표지  해설걸음  틀종수",
);
for (const tier of ELEM_TIERS) {
  const mine = rows.filter((r) => r.tier === tier);
  const lens = mine.map((r) => r.content.replace(/\s+/g, " ").trim().length);
  const kor = mine.map((r) => koreanChars(r.content));
  const nums = mine.map((r) => (r.content.match(/\d+/g) ?? []).length);
  const steps = mine.map((r) => solutionSteps(r.solution));
  const bare = mine.filter((r) => BARE_EXPR.test(r.content)).length;
  const fig = mine.filter((r) => r.hasFigure).length;
  const mk = mine.filter((r) => r.marks.length > 0).length;
  const frames = new Set(mine.map((r) => r.frame)).size;
  console.log(
    `${tier}   ${String(mine.length).padStart(4)}  ` +
      `${String(median(lens)).padStart(6)}  ` +
      `${String(median(kor)).padStart(6)}  ` +
      `${pct(bare, mine.length).padStart(7)}  ` +
      `${String(median(nums)).padStart(6)}  ` +
      `${pct(fig, mine.length).padStart(6)}  ` +
      `${pct(mk, mine.length).padStart(7)}  ` +
      `${String(median(steps)).padStart(6)}  ` +
      `${String(frames).padStart(6)}`,
  );
}

console.log(
  "\n· 발문자수·한글자수·수개수·해설걸음은 **중앙값**이다 (평균은 긴 문항 몇 개에 끌려간다).\n" +
    "· 「식그대로」 = 발문에 연산자가 든 수식이 있다 = D-72 1단의 표지(식·값이 그대로 주어짐).\n" +
    "· 「4단표지」 = tier4Rules.marksOf — 규칙을 옮겨 적지 않고 그대로 부른다.\n" +
    "· 「틀종수」 = 값을 지운 발문의 가짓수. 갈래가 몇 가지 말투를 갖는가.",
);

/* ── 소단원별: 갈래 사이 «오르는가»를 사람이 좁혀 볼 수 있게 ── */
console.log(`\n══ 소단원별 (오름이 의심스러운 순서) ══\n`);
type Sec = {
  section: string;
  perTier: {
    tier: string;
    bare: string;
    kor: number;
    marks: number;
    len: number;
  }[];
  suspicion: number;
};
const secs: Sec[] = units.map((u) => {
  const perTier = ELEM_TIERS.map((t) => {
    const mine = rows.filter((r) => r.section === u.section && r.tier === t);
    return {
      tier: t,
      bare: pct(
        mine.filter((r) => BARE_EXPR.test(r.content)).length,
        mine.length,
      ),
      kor: median(mine.map((r) => koreanChars(r.content))),
      marks: mine.filter((r) => r.marks.length > 0).length,
      len: median(
        mine.map((r) => r.content.replace(/\s+/g, " ").trim().length),
      ),
    };
  });
  // 「의심」은 판정이 아니라 **정렬 열쇠**다 — 사람이 어디부터 볼지 정하는 데만 쓴다.
  // 한글 맥락이 갈래를 따라 줄면(= 뒤로 갈수록 문장이 짧아지면) 위로 올린다.
  let suspicion = 0;
  for (let i = 1; i < perTier.length; i += 1)
    if (perTier[i]!.kor < perTier[i - 1]!.kor)
      suspicion += perTier[i - 1]!.kor - perTier[i]!.kor;
  return { section: u.section, perTier, suspicion };
});
secs.sort((a, b) => b.suspicion - a.suspicion);
for (const s of secs.slice(0, 20))
  console.log(
    `  ${s.section.slice(0, 34).padEnd(34)} ` +
      s.perTier
        .map(
          (p) =>
            `${p.tier} 한글${String(p.kor).padStart(3)}/식${p.bare.padStart(6)}/표지${String(p.marks).padStart(2)}`,
        )
        .join(" │ "),
  );
console.log(
  `\n⚠️ 「의심」은 **정렬 열쇠**지 판정이 아니다. 한글 맥락이 주는 것이 결함인 경우도\n` +
    `   정상인 경우도 있다(4단은 역산이라 문장이 짧아지기도 한다). 시안 화면에서 눈으로 볼 것.`,
);
console.log(`\n훑은 것 — ${tally.line()} · ${fence.scopeLine()}`);
console.log(
  "\n⚠️ 계량기다. 아무것도 판정하지 않으므로 exit 0 이 「깨끗」을 뜻하지 않는다.",
);
