/**
 * **물결 4 가 비운 자리를 «세어서» 비웠다는 근거** — 초5 1-1 · 1-3 · 1-4 · 2-2 · 2-5.
 *
 *     npx tsx scripts/qa/census-g5w4-empty.ts
 *     npx tsx scripts/qa/census-g5w4-empty.ts --selftest   # 이 자가 «아니오»를 낼 수 있나
 *
 * ── 왜 있나 ─────────────────────────────────────────────────────────────────
 * D-115 ⑹ 은 「비우는 단위는 학년이 아니라 소단원이고, 못 서는 소단원마다 «왜 못
 * 서는지» 한 줄을 남긴다」고 못 박았다. 그런데 그 한 줄이 **읽고 적은 것**이면
 * 다음 사람이 검산할 수 없다. 그래서 비움 근거 중 **셀 수 있는 것**만 여기서 센다.
 *
 * ⚠️ **이 자는 판정기가 아니다.** 관문 쓸기(`probe-elem-*`)에 안 걸린다 —
 *    「비어야 한다」를 강제하면 다음 회차가 재료를 찾아 채울 때 늘 빨갛다.
 *    여기서 세는 것은 **보고서의 수치가 지금도 참인가**뿐이다.
 *
 * ── 「0 은 «깨끗»과 «못 셈»을 안 가른다」 ──────────────────────────────────
 * 그래서 세는 함수마다 **양성·음성 대조**를 `--selftest` 에 같이 뒀다. 세는 쪽이
 * 눈이 멀면 셋 다 통과해 버리는 것을 막는다(2026-08-20 · 08-21).
 */
import { isDirectScript } from "../import/isDirectScript";

/* ── 혼합 계산 한 줄 — 이 자가 **스스로** 계산한다(제품을 안 부른다) ────────── */

type Tok = number | "+" | "-" | "*" | "/";

/** ×÷ 를 앞에서부터, 그다음 +− 를 앞에서부터. 나오는 값이 모두 자연수가 아니면 `null`. */
export function evalRow(toks: readonly Tok[]): number | null {
  const vals: number[] = [toks[0] as number];
  const ops: string[] = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i] as string;
    const v = toks[i + 1] as number;
    if (op === "*" || op === "/") {
      const prev = vals[vals.length - 1]!;
      if (op === "*") vals[vals.length - 1] = prev * v;
      else {
        if (v === 0 || prev % v !== 0) return null;
        vals[vals.length - 1] = prev / v;
      }
    } else {
      ops.push(op);
      vals.push(v);
    }
  }
  let acc = vals[0]!;
  if (acc < 1) return null;
  for (let i = 0; i < ops.length; i += 1) {
    acc = ops[i] === "+" ? acc + vals[i + 1]! : acc - vals[i + 1]!;
    if (acc < 1) return null;
  }
  return acc;
}

function grouped(toks: readonly Tok[], i: number, j: number): number | null {
  const inner = evalRow(toks.slice(2 * i, 2 * j + 1));
  if (inner === null) return null;
  return evalRow([...toks.slice(0, 2 * i), inner, ...toks.slice(2 * j + 1)]);
}

/**
 * 「이웃한 두 수를 괄호로 묶었을 때 **값이 달라지면서 모두 자연수**가 되는 자리」의 수.
 *
 * 이 값이 **1 이하**면 심화중이 설 수 없다 — 마디가 애초에 안 열린다(후보가 둘이어야
 * «안 굳는 마디»가 있는 것이다). 이 값이 **2 이상**이면 마디가 열린 것이다.
 */
export function openSpots(toks: readonly Tok[]): number {
  const base = evalRow(toks);
  if (base === null) return 0;
  let k = 0;
  for (let i = 0; 2 * i + 2 < toks.length; i += 1) {
    const v = grouped(toks, i, i + 1);
    if (v !== null && v !== base) k += 1;
  }
  return k;
}

/* ── ㉠ 1-1-1 — 「한 층 · 수 셋」에서 마디가 열리는가 ────────────────────────── */

const PLUS_MINUS: ("+" | "-")[] = ["+", "-"];
const MUL_DIV: ("*" | "/")[] = ["*", "/"];

export function census111(): { rows: number; max: number; two: number } {
  let rows = 0;
  let max = 0;
  let two = 0;
  for (let a = 2; a <= 60; a += 1)
    for (let b = 2; b <= 30; b += 1)
      for (let c = 2; c <= 30; c += 1)
        for (const layer of [PLUS_MINUS, MUL_DIV])
          for (const o1 of layer)
            for (const o2 of layer) {
              const toks: Tok[] = [a, o1, b, o2, c];
              if (evalRow(toks) === null) continue;
              rows += 1;
              const k = openSpots(toks);
              if (k > max) max = k;
              if (k >= 2) two += 1;
            }
  return { rows, max, two };
}

/* ── ㉡ 1-1-2 심화상 — 괄호 후보 둘의 대소가 «구조로» 정해지는가 ─────────────── */

/**
 * `a+b○c-d`(○ 는 × 또는 ÷)에서 괄호 자리 둘의 값과 괄호 없는 값의 **차례**를 센다.
 * 늘 같은 차례면 「후보를 실제로 다 계산해 견주어야 하나가 남는다」가 성립하지
 * 않는다 — 계산하지 않고도 어느 쪽이 큰지 안다(→ 심화상이 아니다).
 */
export function censusOrder112(op: "*" | "/"): {
  rows: number;
  sameOrder: number;
} {
  let rows = 0;
  let sameOrder = 0;
  for (let a = 2; a <= 60; a += 1)
    for (let b = 2; b <= 40; b += 1)
      for (let c = 2; c <= 12; c += 1)
        for (let d = 2; d <= 30; d += 1) {
          const toks: Tok[] = [a, "+", b, op, c, "-", d];
          const base = evalRow(toks);
          const g0 = grouped(toks, 0, 1); // (a+b)○c−d
          const g2 = grouped(toks, 2, 3); // a+b○(c−d)
          if (base === null || g0 === null || g2 === null) continue;
          if (g0 === base || g2 === base) continue;
          rows += 1;
          // 「기대하는 차례」 — × 는 `(a+b)×c-d` 가 가장 크고, ÷ 는 가장 작다.
          const asExpected =
            op === "*" ? g0 > base && base > g2 : g0 < base && base < g2;
          if (asExpected) sameOrder += 1;
        }
  return { rows, sameOrder };
}

/**
 * 대조 — 수가 **다섯**인 1-1-3 꼴 `a÷b+c×d-e` 에서는 같은 차례가 안 지켜진다.
 * (이 함수가 «지켜진다 100%» 를 내면 세는 쪽이 눈먼 것이다.)
 */
export function censusOrder113(): { rows: number; frontBigger: number } {
  let rows = 0;
  let frontBigger = 0;
  for (let b = 2; b <= 9; b += 1)
    for (let ka = 2; ka <= 12; ka += 1)
      for (let d = 2; d <= 9; d += 1)
        for (let kc = 2; kc <= 12; kc += 1)
          for (let e = 2; e <= 30; e += 1) {
            const a = b * ka;
            const c = d * kc;
            if (a > 60 || c > 60) continue;
            const x = evalRow([a, "*", b, "+", c, "/", d, "-", e]);
            const y = evalRow([a, "/", b, "+", c, "*", d, "-", e]);
            if (x === null || y === null || x === y) continue;
            rows += 1;
            if (x > y) frontBigger += 1;
          }
  return { rows, frontBigger };
}

/* ── 눈금 — 이 자가 «아니오»를 낼 수 있나 ──────────────────────────────────── */

type Gauge = { label: string; ok: () => boolean };

function gauges(): Gauge[] {
  return [
    {
      // 양성 — 자리를 **셀 수 있다**. 수가 넷이면 실제로 둘이 나온다.
      label: "양성 — `34+24×6-5` 꼴에서 열린 자리가 둘이다",
      ok: () => openSpots([34, "+", 24, "*", 6, "-", 5]) === 2,
    },
    {
      // 음성 — 값이 안 달라지는 자리는 안 센다.
      label: "음성 — `12+8-5` 는 열린 자리가 0이다",
      ok: () => openSpots([12, "+", 8, "-", 5]) === 0,
    },
    {
      label: "양성 — `20-8+3` 은 열린 자리가 하나다",
      ok: () => openSpots([20, "-", 8, "+", 3]) === 1,
    },
    {
      label: "음성 — 나누어떨어지지 않으면 계산이 `null` 이다",
      ok: () => evalRow([7, "/", 2]) === null,
    },
    {
      label: "음성 — 중간값이 `0` 이면 자연수가 아니라 `null` 이다",
      ok: () => evalRow([9, "-", 9, "+", 4]) === null,
    },
    {
      label: "양성 — 차례가 뒤집히는 꼴이 있으면 그것을 본다(1-1-3)",
      ok: () => {
        const c = censusOrder113();
        return c.rows > 100 && c.frontBigger > 0 && c.frontBigger < c.rows;
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
      console.log(`${ok ? "✅" : "🔴"} ${g.label}`);
    }
    console.log(bad === 0 ? "\n눈금 전부 통과" : `\n🔴 눈금 ${bad}개 실패`);
    process.exitCode = bad === 0 ? 0 : 1;
    return;
  }

  console.log("물결 4 비움 근거 — 세어서 나온 값\n");

  const a = census111();
  console.log("㉠ 1-1-1 (한 층 · 수 셋) — 괄호로 «마디가 열리는가»");
  console.log(
    `   훑은 식 ${a.rows}개 · 열린 자리 최대 **${a.max}** · 자리가 둘 이상인 식 ${a.two}개`,
  );
  console.log(
    `   → 후보가 하나뿐이면 «안 굳는 마디»가 없다. 심화중·심화상 둘 다 비운다.\n`,
  );

  for (const op of ["*", "/"] as const) {
    const c = censusOrder112(op);
    const pct = c.rows === 0 ? 0 : (c.sameOrder / c.rows) * 100;
    console.log(
      `㉡ 1-1-2 심화상 — \`a+b${op === "*" ? "×" : "÷"}c-d\` 괄호 두 자리의 대소가 늘 같은 차례인가`,
    );
    console.log(
      `   훑은 식 ${c.rows}개 · 같은 차례 ${c.sameOrder}개 (${pct.toFixed(2)}%)`,
    );
  }
  const d = censusOrder113();
  console.log(
    `   대조(1-1-3 꼴, 수 다섯) — 훑은 식 ${d.rows}개 중 앞이 큰 것 ${d.frontBigger}개 ` +
      `(${((d.frontBigger / d.rows) * 100).toFixed(2)}%) → **여기서는 안 정해진다**`,
  );
  console.log(
    `   → 1-1-2 는 계산 없이 어느 쪽이 큰지 안다. 「다 계산해 견주어야」가 성립하지 않아 심화상을 비운다.`,
  );
}

if (isDirectScript(import.meta.url)) main();
