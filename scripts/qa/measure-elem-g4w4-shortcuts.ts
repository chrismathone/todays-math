/**
 * **초4 물결 4 의 새 갈래에 «지름길»이 있나** — 전수로 세어 %를 낸다.
 *
 *     npx tsx scripts/qa/measure-elem-g4w4-shortcuts.ts
 *     npx tsx scripts/qa/measure-elem-g4w4-shortcuts.ts --selftest
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────────────
 *
 * 2026-08-31 적대 검토가 물결 3 의 갈래 아홉 중 **넷**을 이 자리에서 잡았다. 뿌리는
 * 하나였다 — 「밭이 후보를 하나만 남긴다」를 「마디가 열렸다」로 읽은 것이다.
 * 그 규율은 «답이 하나로 정해지는가»는 지켜 주지만 **«죽는 쪽이 늘 같은가»는 안 묻는다.**
 * 늘 같으면 학생은 굳힘을 한 번도 안 대고 그 쪽을 바로 고른다 — 굳힘이 **장식**이 된다.
 *
 * 그 회차가 남긴 규율이 이것이다:
 *
 * > **지름길은 «적어 두는 것»이 아니라 전수로 세어 %를 내는 것이다.
 * > 100% 면 결함이고, 낮으면 (선언된) 사각지대다. 그 선이 둘을 가른다.**
 *
 * ── 🔴 이것은 «판정기»가 아니라 «자»다 ────────────────────────────────────────
 *
 * 이름을 `probe-` 로 안 지은 까닭이 그것이다. `sweep-elem-probes.mjs` 는
 * `probe-elem-*` 를 훑어 **관문에서** 돌리는데, 이 자가 재는 것은 「결함이 있나」가
 * 아니라 **「어느 규칙이 몇 % 맞나」**라서 문턱을 관문에 걸면 곧 늘 우는 가드가 된다.
 * 대신 **`elemTiersG4W4Deep.test.ts` 가 이 모듈을 `import` 해서** 「100% 인 지름길이
 * 없다」를 잠근다 — 규칙을 두 벌로 적지 않는다.
 *
 * ── 이 자가 못 보는 것 ────────────────────────────────────────────────────────
 *
 * ㉠ **지름길 목록은 손으로 적은 것이다.** 여기 없는 규칙은 구조적으로 0 이다.
 *    「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」(2026-08-18) —
 *    그래서 갈래마다 **적어도 둘**(양쪽 가지)을 재고, 「우연 확률」을 같이 찍는다.
 * ㉡ **「어렵나」는 못 잰다.** 난이도는 지면에 없다(`dump-elem-tiers` 머리말).
 * ㉢ 씨앗을 훑는 갈래(2-5-2·2-5-3)는 **전수가 아니라 표본**이다. 그 사실을 찍는다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

/** 한 지름길의 성적. `hit / n` 이 1 이면 **결함**이다. */
export type Shortcut = {
  /** 사람이 읽을 이름 — 「이 규칙만으로 찍으면」 */
  name: string;
  hit: number;
  n: number;
  /** 찍어서 맞을 확률(후보가 둘이면 0.5). 성적을 이것과 견준다. */
  chance: number;
};

export type TierReport = {
  code: string;
  tier: string;
  /** 표본 수(씨앗). 전수 밭을 도는 갈래도 여기서는 씨앗으로 훑는다. */
  n: number;
  /** 마디가 열려 있나 — 굳힘을 걸기 **전에** 후보가 여럿인 자리의 수. */
  open: number;
  shortcuts: Shortcut[];
};

const SEEDS = (count: number) =>
  Array.from({ length: count }, (_, i) => 20260901 + i * 7);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(`${code} `),
  );
  if (!u) throw new Error(`초4 ${code} 소단원을 못 찾았다`);
  return u;
}

const DEG = new RegExp("\\$(\\d+)\\^\\\\circ\\$", "g");
const CM = new RegExp("\\$(\\d+)\\\\,\\\\mathrm\\{cm\\}\\$", "g");
const PLAIN = new RegExp("\\$(\\d+)\\$", "g");

function nums(text: string, re: RegExp): number[] {
  return [...text.matchAll(new RegExp(re.source, "g"))].map((m) =>
    Number(m[1]),
  );
}

/* ── 1-2-3 심화중 — 「$6$시보다 이르다/늦다」가 시각 후보 둘 중 하나를 죽인다 ── */

function clockKind(hour: number): string {
  const cells = Math.min(hour, 12 - hour);
  const d = 30 * cells;
  return d < 90 ? "예각" : d === 90 ? "직각" : "둔각";
}

export function measureClock(count: number): TierReport {
  const unit = unitOf("1-2-3");
  const seeds = SEEDS(count);
  let open = 0;
  let early = 0;
  let late = 0;
  let asGiven = 0;
  for (const seed of seeds) {
    const p = generateElementaryProblem(unit, seed, "심화중");
    const angle = nums(p.content, DEG)[0]!;
    const after = nums(p.content, PLAIN)[1]!; // [$6$시, $t$시간]
    const isEarly = p.content.includes("이릅니다");
    const wrap = (h: number) => ((h + after - 1) % 12) + 1;
    const kE = clockKind(wrap(angle / 30));
    const kL = clockKind(wrap(12 - angle / 30));
    // 마디가 열렸다 = 두 시각이 **다른 답**을 낸다(그래야 굳힘이 일을 한다).
    if (kE !== kL) open += 1;
    if (kE === p.answer) early += 1;
    if (kL === p.answer) late += 1;
    if ((angle < 90 ? "예각" : angle === 90 ? "직각" : "둔각") === p.answer) {
      asGiven += 1;
    }
    if (isEarly !== (kE === p.answer)) {
      throw new Error(`1-2-3 s${seed}: 발문의 조건과 답이 어긋난다`);
    }
  }
  const n = seeds.length;
  return {
    code: "1-2-3",
    tier: "심화중",
    n,
    open,
    shortcuts: [
      {
        name: "조건을 안 읽고 늘 «이른 쪽» 시각으로",
        hit: early,
        n,
        chance: 0.5,
      },
      {
        name: "조건을 안 읽고 늘 «늦은 쪽» 시각으로",
        hit: late,
        n,
        chance: 0.5,
      },
      { name: "주어진 각을 그대로 분류", hit: asGiven, n, chance: 1 / 3 },
    ],
  };
}

/* ── 2-2-1 심화중 — 「가장 짧은 변」 조건이 두 삼각형 중 하나를 죽인다 ── */

export function measureIsoSide(count: number): TierReport {
  const unit = unitOf("2-2-1");
  const seeds = SEEDS(count);
  let open = 0;
  let asPair = 0;
  let asOdd = 0;
  let byWord = 0;
  for (const seed of seeds) {
    const p = generateElementaryProblem(unit, seed, "심화중");
    const [total, side, bar] = nums(p.content, CM) as [number, number, number];
    const answer = nums(p.answer, CM)[0]!;
    const oddA = total - 2 * side;
    const pairB = (total - side) / 2;
    // 마디가 열렸다 = 두 가지가 **둘 다 삼각형이고** «나머지 한 변»이 서로 다르다.
    const standsA = oddA > 0 && side + side > oddA && side + oddA > side;
    const standsB =
      Number.isInteger(pairB) && pairB > 0 && pairB + pairB > side;
    if (standsA && standsB && oddA !== side) open += 1;
    const takeA = 2 * side === answer;
    if (takeA) asPair += 1;
    if (total - side === answer) asOdd += 1;
    if (bar <= 0) throw new Error(`2-2-1 s${seed}: 문턱을 못 읽었다`);
    /*
     * 🔴 **견주지 않고 «조건 문구»만 보고 갈래를 고른다.**
     * 처음 판(견주는 값이 «가장 짧은 변»)에서는 이 규칙이 **100%** 였다 — 밭이 늘
     * $S<3a$ 라 최단 변의 순서가 구조적으로 고정이었기 때문이다. 견주는 값을
     * «나머지 한 변»으로 바꾸면 순서가 $S=3a$ 에서 뒤집혀 이 규칙이 무너진다.
     */
    if (p.content.includes("보다 깁니다") ? !takeA : takeA) byWord += 1;
  }
  const n = seeds.length;
  return {
    code: "2-2-1",
    tier: "심화중",
    n,
    open,
    shortcuts: [
      {
        name: "늘 «주어진 변이 같은 두 변 중 하나»로",
        hit: asPair,
        n,
        chance: 0.5,
      },
      { name: "늘 «주어진 변이 나머지 한 변»으로", hit: asOdd, n, chance: 0.5 },
      {
        name: "🔴 견주지 않고 문구만 — 「깁니다→나머지 한 변 · 짧습니다→같은 두 변」",
        hit: byWord,
        n,
        chance: 0.5,
      },
    ],
  };
}

/* ── 2-2-2 심화중 — 「같은 두 각의 합」 조건이 두 갈래 중 하나를 죽인다 ── */

export function measureIsoAngle(count: number): TierReport {
  const unit = unitOf("2-2-2");
  const seeds = SEEDS(count);
  let open = 0;
  let asApex = 0;
  let asBase = 0;
  let byWord = 0;
  for (const seed of seeds) {
    const p = generateElementaryProblem(unit, seed, "심화중");
    const [given, bar] = nums(p.content, DEG) as [number, number];
    const answer = nums(p.answer, DEG)[0]!;
    const sumApex = 180 - given;
    const sumBase = 2 * given;
    // 마디가 열렸다 = 두 갈래의 «같은 두 각의 합»이 문턱을 **사이에 두고** 갈린다.
    // ⚠️ $a>60$ 이면 두 합의 순서가 뒤집히므로 min/max 로 봐야 한다.
    if (Math.min(sumApex, sumBase) < bar && bar < Math.max(sumApex, sumBase)) {
      open += 1;
    }
    // 답은 「가장 큰 각 − 가장 작은 각」이다 — ㉮ 는 $|3a-180|\div2$, ㉯ 는 $|3a-180|$.
    const takeA = Math.abs(3 * given - 180) / 2 === answer;
    if (takeA) asApex += 1;
    if (Math.abs(3 * given - 180) === answer) asBase += 1;
    /*
     * 🔴 **견주지 않고 «조건 문구»만 보고 갈래를 고른다.**
     * 처음 판($a<60$ 만 담았다)에서는 이 규칙이 **100%** 였다. $a>60$ 무리를 넣으면
     * 두 합의 순서가 뒤집혀 무너진다 — 2-2-1 이 물린 그 자리와 같은 부류다.
     */
    if (p.content.includes("보다 큽니다") ? takeA : !takeA) byWord += 1;
  }
  const n = seeds.length;
  return {
    code: "2-2-2",
    tier: "심화중",
    n,
    open,
    shortcuts: [
      {
        name: "늘 «주어진 각이 나머지 한 각»으로",
        hit: asApex,
        n,
        chance: 0.5,
      },
      {
        name: "늘 «주어진 각이 같은 두 각 중 하나»로",
        hit: asBase,
        n,
        chance: 0.5,
      },
      {
        name: "🔴 견주지 않고 문구만 — 「큽니다→나머지 한 각 · 작습니다→같은 두 각」",
        hit: byWord,
        n,
        chance: 0.5,
      },
    ],
  };
}

/* ── 2-5-2 심화중 — 「처음으로 넘은 때」 앞쪽의 최댓값이 답이다 ── */

type LineSpec = { values?: { label: string; value: number }[] };

export function measureThreshold(count: number): TierReport {
  const unit = unitOf("2-5-2");
  const seeds = SEEDS(count);
  let open = 0;
  let prev = 0;
  let first = 0;
  let asBiggest = 0;
  for (const seed of seeds) {
    const p = generateElementaryProblem(unit, seed, "심화중");
    const spec = p.figureSpec as LineSpec | null;
    const vs = (spec?.values ?? []).map((v) => v.value);
    const grew = Number(
      new RegExp("값은 \\$(\\d+)\\$\\S* 늘었습니다").exec(p.content)![1],
    );
    const answer = nums(p.answer, PLAIN)[0]!;
    const startValue = vs[vs.length - 1]! - grew;
    const at = vs.indexOf(startValue);
    if (at < 1) throw new Error(`2-5-2 s${seed}: 시작 때를 못 찾았다`);
    const before = vs.slice(0, at);
    const peak = Math.max(...before);
    // 마디가 열렸다 = $T$ 가 하나로 안 굳는다(창의 폭이 $1$ 보다 크다).
    if (startValue - peak > 1) open += 1;
    if (before[before.length - 1] === answer) prev += 1;
    if (vs[0] === answer) first += 1;
    if (startValue === answer) asBiggest += 1;
  }
  const n = seeds.length;
  return {
    code: "2-5-2",
    tier: "심화중",
    n,
    open,
    shortcuts: [
      { name: "«바로 앞 때»의 값을 그대로", hit: prev, n, chance: 0.5 },
      { name: "«첫 때»의 값을 그대로", hit: first, n, chance: 0.5 },
      {
        name: "«가장 큰 수»로 잘못 읽어 (마지막 값 − 늘어난 양)",
        hit: asBiggest,
        n,
        chance: 0,
      },
    ],
  };
}

/* ── 2-5-3 심화상 — 지워진 두 값의 짝을 만들어 견준다 ── */

type TableSpec = { rows?: string[][] };

export function measureTableHide(count: number): TierReport {
  const unit = unitOf("2-5-3");
  const seeds = SEEDS(count);
  let open = 0;
  let firstPick = 0;
  let midPick = 0;
  let lastPick = 0;
  for (const seed of seeds) {
    const p = generateElementaryProblem(unit, seed, "심화상");
    const spec = p.figureSpec as TableSpec | null;
    const cells = (spec?.rows ?? []).map((r) => r[1]!);
    const step = Number(new RegExp("한 칸이 \\$(\\d+)\\$").exec(p.content)![1]);
    const sum = Number(new RegExp("합은 \\$(\\d+)\\$").exec(p.content)![1]);
    const v0 = Number(cells[0]);
    const v2 = Number(cells[2]);
    const v3 = Number(cells[3]);
    const answer = nums(p.answer, PLAIN);
    // 학생이 만드는 후보 — 「값이 갈수록 커진다」 + 「눈금 한 칸으로 나누어떨어진다」.
    const cand: number[] = [];
    for (let x = v0 + step; x <= v2 - step; x += step) {
      if (sum - x > v3) cand.push(x);
    }
    if (cand.length >= 3) open += 1;
    const idx = cand.indexOf(answer[0]!);
    if (idx < 0) throw new Error(`2-5-3 s${seed}: 답이 후보 목록에 없다`);
    if (idx === 0) firstPick += 1;
    else if (idx === cand.length - 1) lastPick += 1;
    else midPick += 1;
  }
  const n = seeds.length;
  return {
    code: "2-5-3",
    tier: "심화상",
    n,
    open,
    shortcuts: [
      { name: "후보 목록의 «첫째»를 집는다", hit: firstPick, n, chance: 1 / 3 },
      { name: "후보 목록의 «끝»을 집는다", hit: lastPick, n, chance: 1 / 3 },
      { name: "후보 목록의 «가운데»를 집는다", hit: midPick, n, chance: 1 / 3 },
    ],
  };
}

export function measureG4W4(count = 400): TierReport[] {
  return [
    measureClock(count),
    measureIsoSide(count),
    measureIsoAngle(count),
    measureThreshold(count),
    measureTableHide(count),
  ];
}

/**
 * **판정 — 100% 인 지름길이 하나라도 있으면 그 갈래는 결함이다.**
 *
 * 문턱을 100% 로 둔 까닭: 물결 3 적대 검토가 그 선을 그었다. 그보다 낮으면
 * D-115 ⑽② 가 스스로 선언한 사각지대이고(「지름길을 아는 아이에게는 한 걸음이다」),
 * 100% 면 굳힘이 **한 번도** 일을 안 한 것이라 사각지대가 아니라 결함이다.
 * 그리고 「마디가 열린 자리」가 전량이 아니어도 결함이다 — 안 열리면 굳힐 것이 없다.
 */
export function faults(reports: readonly TierReport[]): string[] {
  const bad: string[] = [];
  for (const r of reports) {
    if (r.open !== r.n) {
      bad.push(
        `${r.code} «${r.tier}» — 마디가 안 열린 자리 ${r.n - r.open}/${r.n}`,
      );
    }
    for (const s of r.shortcuts) {
      if (s.n > 0 && s.hit === s.n) {
        bad.push(
          `${r.code} «${r.tier}» — 「${s.name}」가 ${s.hit}/${s.n} = 100% (우연 ${(s.chance * 100).toFixed(1)}%)`,
        );
      }
    }
  }
  return bad;
}

function pct(hit: number, n: number): string {
  return n === 0 ? "—" : `${((hit / n) * 100).toFixed(1)}%`;
}

function main(): void {
  if (process.argv.includes("--selftest")) {
    // 🔴 **이 자가 «아니오»를 낼 수 있는가** — 양성 2 · 음성 3.
    const mk = (hit: number, n: number, open = n): TierReport => ({
      code: "가",
      tier: "심화중",
      n,
      open,
      shortcuts: [{ name: "늘 한쪽", hit, n, chance: 0.5 }],
    });
    const cases: [string, TierReport, boolean][] = [
      ["양성 — 지름길 100%", mk(50, 50), true],
      ["양성 — 마디가 안 열린다", mk(25, 50, 40), true],
      ["음성 — 절반", mk(25, 50), false],
      ["음성 — 우연보다 조금 낫다", mk(34, 50), false],
      ["음성 — 하나도 안 맞는다", mk(0, 50), false],
    ];
    let bad = 0;
    for (const [label, rep, want] of cases) {
      const got = faults([rep]).length > 0;
      if (got !== want) {
        console.log(`🔴 눈금 실패 — ${label}: 기대 ${want} · 실제 ${got}`);
        bad += 1;
      } else {
        console.log(`  ✅ ${label}`);
      }
    }
    console.log(`눈금 ${cases.length}건 · 실패 ${bad}`);
    process.exit(bad === 0 ? 0 : 1);
  }

  const count = Number(
    process.argv.find((a) => a.startsWith("--seeds="))?.slice(8) ?? 400,
  );
  const reports = measureG4W4(count);
  console.log(`\n초4 물결 4 — 새 갈래의 지름길 (씨앗 ${count}개 표본)\n`);
  for (const r of reports) {
    console.log(`  ${r.code} «${r.tier}» — 마디가 열린 자리 ${r.open}/${r.n}`);
    for (const s of r.shortcuts) {
      console.log(
        `      ${pct(s.hit, s.n).padStart(6)}  (우연 ${(s.chance * 100).toFixed(1)}%)  ${s.name}`,
      );
    }
  }
  const bad = faults(reports);
  console.log("");
  if (bad.length === 0) {
    console.log("✅ 100% 인 지름길 0 · 마디가 안 열린 자리 0");
    console.log(
      "\n⚠️ 이것은 판정기가 아니라 «자»다 — 여기 안 적은 규칙은 구조적으로 0 이다.\n" +
        "   그리고 씨앗 표본이지 전수가 아니다(밭 자체는 g4.ts 안에서 전수로 만든다).",
    );
    return;
  }
  for (const b of bad) console.log(`🔴 ${b}`);
  process.exitCode = 1;
}

if (isDirectScript(import.meta.url)) main();
