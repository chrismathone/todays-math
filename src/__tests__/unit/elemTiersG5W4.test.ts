/**
 * 초5 물결 4 확대 갈래(`심화중`·`심화상`) — **1-1 · 1-3 · 1-4 · 2-2 · 2-5** (D-113 · D-115).
 *
 * ## 이 시험이 잠그는 것 — 반증 가능한 형태로
 *
 * ```
 * ⑴ 마디가 «굳는다»       심화중: 시험이 **지면의 글에서 후보를 직접 만들어**,
 *                          그 소단원의 성질을 만족하는 것이 **정확히 하나**임을 센다.
 *                          그리고 후보가 **둘 이상**임도 같이 센다 —
 *                          하나뿐이면 마디가 애초에 안 열린 것이라 심화하다
 * ⑵ 마디가 «안 굳는다»    심화상: 성질만으로는 후보가 둘 이상 남고, 후보마다
 *                          **실제로 계산해야** 하나가 남는다
 * ⑶ 값 검산               참은 **찍힌 발문**에서 온다 — 생성기를 되부르지 않는다.
 *                          1-1 은 지면의 LaTeX 식을 시험이 **스스로 파싱해 계산**한다
 * ⑷ 반증 ⑥               제품 모듈 `forwardReach` 하나를 쓴다. **음성 대조**로
 *                          이 자가 «닿는다»를 낼 수 있음을 같은 회차에 못 박는다
 * ⑸ 비운 자리             확대 갈래를 **안 돌려주고**, 만들려 하면 **던진다**
 * ⑹ 한쪽으로 안 몰린다     「늘 곱셈」·「늘 뒤쪽 괄호」처럼 **구조가 답을 대신하면**
 *                          그 문항은 되짚기가 아니다. 씨앗을 넓혀 분포를 센다
 * ```
 *
 * ## 못 보는 것
 *
 * · **「어려운가」 자체.** 난이도는 지면에 없다 — 원장님이 화면에서 보신다.
 * · **해설이 무엇을 시키는지**는 `probe-elem-tier-enumeration` 이 따로 센다.
 * · **비운 자리가 «정말 못 서는가».** 시험은 「안 돌려준다」만 잠근다 —
 *   근거는 `scripts/qa/census-g5w4-empty.ts` 가 센다.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  forwardReachable,
  pageNumbers,
  rat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { tiersOf } from "../helpers/elemTiers";

const SEEDS = [
  20260901, 7, 1234, 99991, 20260902, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];
/** 분포를 볼 때만 쓰는 넓은 씨앗 — 「구조가 답을 대신하나」는 몇 개로는 안 보인다. */
const WIDE = Array.from({ length: 200 }, (_, i) => 1009 + i * 13);

/** 이 회차가 맡은 스물한 소단원 — 손으로 적되 `supportedTiers` 와 **맞대어** 잠근다(⑸). */
const FILLED: Record<string, readonly ElemTier[]> = {
  "1-1-1": [],
  "1-1-2": ["심화중"],
  "1-1-3": ["심화중", "심화상"],
  "1-3-1": ["심화중"],
  "1-3-2": ["심화중", "심화상"],
  "1-3-3": [],
  "1-4-1": [],
  "1-4-2": ["심화중"],
  "1-4-3": ["심화중", "심화상"],
  "1-4-4": [],
  "1-4-5": [],
  "2-2-1": ["심화중"],
  "2-2-2": ["심화중"],
  "2-2-3": ["심화중", "심화상"],
  "2-2-4": ["심화중"],
  "2-5-1": [],
  "2-5-2": [],
  "2-5-3": ["심화중"],
  "2-5-4": ["심화중"],
  "2-5-5": [],
  "2-5-6": ["심화상"],
};

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(`${code} `),
  )!;

const problem = (code: string, tier: ElemTier, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier);

/** 정답 한 값 — `$…$` 하나 안의 정수. */
function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer.trim());
  expect(m, `정답을 못 읽었다: ${answer}`).not.toBeNull();
  return Number(m![1]);
}

/* ── 지면의 식을 **시험이 스스로** 읽고 계산한다(⑶) ────────────────────────────
 *
 * 규칙은 교과서 그대로다 — ×÷ 를 앞에서부터, 그다음 +− 를 앞에서부터, 그리고
 * **나오는 값이 모두 자연수**($1$ 이상, 나눗셈은 나누어떨어진다). 제품의 함수를
 * 안 부르는 것이 여기서는 값어치가 있다 — 지면에 찍힌 글자가 참인지를 묻기 때문이다.
 */
type Tok = string;

/** `$…$` 안의 식 한 덩어리를 토큰으로. 수 · `+` · `-` · `\times` · `\div` · `\bigcirc`. */
function lexExpr(text: string): Tok[] {
  const m = [...text.matchAll(/\$([^$]*)\$/g)]
    .map((x) => x[1]!)
    .filter((s) => /\d/.test(s) && /[+\-]|\\times|\\div|\\bigcirc/.test(s));
  expect(m.length, `식을 못 찾았다: ${text}`).toBe(1);
  const out: Tok[] = [];
  const src = m[0]!.replace(/\s+/g, "");
  let i = 0;
  while (i < src.length) {
    if (/\d/.test(src[i]!)) {
      let j = i;
      while (j < src.length && /\d/.test(src[j]!)) j += 1;
      out.push(src.slice(i, j));
      i = j;
    } else if (src.startsWith("\\times", i)) {
      out.push("*");
      i += 6;
    } else if (src.startsWith("\\div", i)) {
      out.push("/");
      i += 4;
    } else if (src.startsWith("\\bigcirc", i)) {
      out.push("?");
      i += 8;
    } else if (src[i] === "+" || src[i] === "-") {
      out.push(src[i]!);
      i += 1;
    } else if (src[i] === "(" || src[i] === ")") {
      out.push(src[i]!);
      i += 1;
    } else {
      throw new Error(`읽을 수 없는 글자 «${src[i]}» — ${src}`);
    }
  }
  return out;
}

/** 괄호 없는 토큰 줄을 계산한다. 나오는 값이 모두 자연수가 아니면 `null`. */
function evalFlat(toks: readonly Tok[]): number | null {
  const vals: number[] = [Number(toks[0])];
  const ops: string[] = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i]!;
    const v = Number(toks[i + 1]);
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

/** 수 자리 `i`~`j` 를 괄호로 묶어 계산한다. */
function evalGrouped(
  toks: readonly Tok[],
  i: number,
  j: number,
): number | null {
  const inner = evalFlat(toks.slice(2 * i, 2 * j + 1));
  if (inner === null) return null;
  return evalFlat([
    ...toks.slice(0, 2 * i),
    String(inner),
    ...toks.slice(2 * j + 1),
  ]);
}

/* ── 1-3 대응 관계 — 시험이 **스스로** 정본 관계 꼴 셋을 편다 ─────────────────
 *
 * `△=□×k`(k ∈ [2,8]) · `△=□+c` · `△=□-c`(c ∈ [2,15]). 규칙을 옮겨 적은 것이
 * 아니라 이 소단원의 유일한 성질(「어느 칸에서나 같아야 한다」)의 정의다.
 */
type Rel = { kind: "mul" | "add" | "sub"; v: number };

const relAt = (r: Rel, x: number): number =>
  r.kind === "mul" ? x * r.v : r.kind === "add" ? x + r.v : x - r.v;

function relsFitting(pairs: readonly (readonly [number, number])[]): Rel[] {
  const out: Rel[] = [];
  for (let k = 2; k <= 8; k += 1)
    if (pairs.every(([x, y]) => y === x * k)) out.push({ kind: "mul", v: k });
  for (let c = 2; c <= 15; c += 1) {
    if (pairs.every(([x, y]) => y === x + c)) out.push({ kind: "add", v: c });
    if (pairs.every(([x, y]) => y === x - c && y >= 1))
      out.push({ kind: "sub", v: c });
  }
  return out;
}

/**
 * 대응표를 읽는다 — `figureSpec` 이 참이다(지면에 그려지는 것이 그것이다).
 * 수가 아닌 칸(빈칸·㉠)은 `null` 로 돌려준다 — 「비어 있음」도 지면의 사실이다.
 */
function readTable(spec: unknown): [number, number | null][] {
  const s = spec as { headers?: string[]; rows?: string[][] } | null;
  expect(s?.headers, "표가 없다").toBeTruthy();
  const xs = s!.headers!.slice(1).map(Number);
  const ys = s!
    .rows![0]!.slice(1)
    .map((v) => (/^\d+$/.test(v) ? Number(v) : null));
  expect(xs.length, "표의 줄 길이가 다르다").toBe(ys.length);
  return xs.map((x, i) => [x, ys[i]!]);
}

/** 수가 다 찬 표만 — 「한 칸이 안 맞는다」류가 쓴다. */
function readFullTable(spec: unknown): [number, number][] {
  const cells = readTable(spec);
  for (const [, y] of cells) expect(y, "표에 빈칸이 있다").not.toBeNull();
  return cells as [number, number][];
}

/** 「한 칸만 안 맞는다」를 시험이 직접 푼다 — 답이 하나로 서는지까지 본다. */
function solveOdd(cells: readonly (readonly [number, number])[]): {
  bad: number;
  rel: Rel;
} {
  const hits: { bad: number; rel: Rel }[] = [];
  for (let i = 0; i < cells.length; i += 1) {
    const fits = relsFitting(cells.filter((_, j) => j !== i));
    if (fits.length === 1) hits.push({ bad: i, rel: fits[0]! });
  }
  expect(
    hits.length,
    `한 칸만 안 맞는 것이 아니다: ${JSON.stringify(cells)}`,
  ).toBe(1);
  return hits[0]!;
}

describe("[초5 물결 4] 확대 갈래 — 1-1 · 1-3 · 1-4 · 2-2 · 2-5", () => {
  /* ── ⑸ 채운 자리와 비운 자리 ── */

  it("채운 자리와 비운 자리가 등록과 정확히 맞는다", () => {
    for (const [code, want] of Object.entries(FILLED)) {
      const got = supportedTiers(unitOf(code)).filter(
        (t) => t === "심화중" || t === "심화상",
      );
      expect(got, `${code}`).toEqual(want);
    }
  });

  it("비운 자리는 확대 갈래를 만들려 하면 던진다 — 「냈다」가 거짓말이 되지 않는다", () => {
    for (const [code, want] of Object.entries(FILLED)) {
      for (const tier of ["심화중", "심화상"] as const) {
        if (want.includes(tier)) continue;
        expect(() => problem(code, tier, 11), `${code} ${tier}`).toThrow();
      }
    }
  });

  /* ── 공통 위생 ── */

  it("같은 씨앗·같은 갈래면 같은 문항이고, 씨앗에 반응한다 (R9)", () => {
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        expect(problem(code, tier, 11).content).toBe(
          problem(code, tier, 11).content,
        );
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThan(2);
      }
    }
  });

  it("한 소단원 안에서 갈래끼리 발문이 갈린다 (D-66 ⑸)", () => {
    for (const code of Object.keys(FILLED)) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} @${seed}\n${rows.join("\n")}`).toBe(
          rows.length,
        );
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1) · 지면에 마크다운 강조가 없다", () => {
    const bad: string[] = [];
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution ?? ""],
          ] as const) {
            const loose = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (loose) bad.push(`${code} ${tier} @${seed} ${where}: ${loose}`);
            // 🔴 지면은 마크다운을 안 그린다 — `**…**` 는 별표 그대로 나간다.
            //    첫 판에서 실제로 났다(1-1-3 심화중 발문).
            if (text.includes("**"))
              bad.push(`${code} ${tier} @${seed} ${where}: 마크다운 강조`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  /* ── ⑷ 반증 ⑥ — 제품 모듈 하나로, **음성 대조**를 같이 ── */

  it("확대 갈래는 순방향으로 안 닿는다 (음성 대조 — 이 자가 «닿는다»를 낼 수 있다)", () => {
    const stuck: string[] = [];
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          if (
            forwardReachable(pageNumbers(p.content), rat(answerInt(p.answer)))
          )
            stuck.push(`${code} ${tier} @${seed}\n${p.content}`);
        }
      }
    }
    expect(stuck).toEqual([]);
    // 🔴 음성 대조 — 같은 대단원의 **연산 갈래**에서 실제로 «닿는다»가 나온다.
    //    안 나오면 위의 `[]` 가 «깨끗»인지 «못 셈»인지 갈리지 않는다.
    const hits = WIDE.filter((s) => {
      const p = problem("1-1-3", "연산", s);
      const m = /^\$(\d+)\$$/.exec(p.answer.trim());
      return m
        ? forwardReachable(pageNumbers(p.content), rat(Number(m[1])))
        : false;
    });
    expect(
      hits.length,
      "음성 대조가 하나도 안 닿는다 — 자가 죽었다",
    ).toBeGreaterThan(0);
  });

  /* ══ 1-1 자연수의 혼합 계산 ══════════════════════════════════════════════ */

  /* ── ⑴ 1-1-2 심화중 — 기호 후보 둘 중 «모두 자연수»가 하나뿐이다 ── */

  it("1-1-2 심화중 — $\\times$·$\\div$ 두 후보 중 값이 모두 자연수인 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-2", "심화중", seed);
      const toks = lexExpr(p.content);
      expect(
        toks.filter((t) => t === "?"),
        p.content,
      ).toHaveLength(1);
      const at = toks.indexOf("?");
      const live: number[] = [];
      for (const op of ["*", "/"]) {
        const v = evalFlat(toks.map((t, i) => (i === at ? op : t)));
        if (v !== null) live.push(v);
      }
      // 마디가 실제로 열린다(후보 둘) — 그리고 성질이 하나만 남긴다.
      expect(live.length, `${p.content}\n산 것 ${live}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(live[0]);
      // 🔴 이 소단원은 곱셈(나눗셈)이 **하나**뿐이다 — 둘이 되면 1-1-3 침범이다.
      expect(toks.filter((t) => t === "*" || t === "/").length, p.content).toBe(
        0,
      );
    }
  });

  it("1-1-2 심화중 — 답이 «늘 곱셈»도 «늘 나눗셈»도 아니다 (⑹)", () => {
    let mul = 0;
    for (const seed of WIDE) {
      const toks = lexExpr(problem("1-1-2", "심화중", seed).content);
      const at = toks.indexOf("?");
      if (evalFlat(toks.map((t, i) => (i === at ? "*" : t))) !== null) mul += 1;
    }
    // 한쪽으로 몰리면 구조가 답을 대신한다 — 처음 판이 171 : 29 였다.
    expect(mul, `× 가 답인 씨앗 ${mul}/${WIDE.length}`).toBeGreaterThan(
      WIDE.length * 0.3,
    );
    expect(mul).toBeLessThan(WIDE.length * 0.7);
  });

  /* ── ⑴ 1-1-3 심화중 — 괄호 자리 둘 중 «모두 자연수»가 하나뿐이다 ── */

  it("1-1-3 심화중 — 덧셈·뺄셈으로 이어진 두 자리 중 하나만 값이 모두 자연수다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-3", "심화중", seed);
      const toks = lexExpr(p.content);
      expect(toks, p.content).toHaveLength(9); // 수 다섯 · 기호 넷
      // 발문이 말한 자리 — «덧셈이나 뺄셈으로 이어진 이웃한 두 수».
      const spots: number[] = [];
      for (let k = 1; k < toks.length; k += 2)
        if (toks[k] === "+" || toks[k] === "-") spots.push((k - 1) / 2);
      expect(spots.length, p.content).toBe(2);
      const live = spots
        .map((i) => evalGrouped(toks, i, i + 1))
        .filter((v): v is number => v !== null);
      expect(live.length, `${p.content}\n산 것 ${live}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(live[0]);
      // 🔴 되짚기가 장식이 아니다 — 괄호를 안 넣은 값과 달라야 문항이 선다.
      expect(evalFlat(toks), p.content).not.toBe(live[0]);
    }
  });

  it("1-1-3 심화중 — 사는 자리가 «늘 뒤쪽»이 아니다 (⑹)", () => {
    let front = 0;
    for (const seed of WIDE) {
      const toks = lexExpr(problem("1-1-3", "심화중", seed).content);
      const spots: number[] = [];
      for (let k = 1; k < toks.length; k += 2)
        if (toks[k] === "+" || toks[k] === "-") spots.push((k - 1) / 2);
      if (evalGrouped(toks, spots[0]!, spots[0]! + 1) !== null) front += 1;
    }
    // 처음 판이 20 : 180 이었다 — 그러면 「뒤쪽을 묶는다」가 답을 대신한다.
    expect(front, `앞 자리가 산 씨앗 ${front}/${WIDE.length}`).toBeGreaterThan(
      WIDE.length * 0.3,
    );
    expect(front).toBeLessThan(WIDE.length * 0.7);
  });

  /* ── ⑵ 1-1-3 심화상 — 성질로는 안 갈리고 둘 다 계산해 견줘야 한다 ── */

  it("1-1-3 심화상 — 두 배치가 **모두** 자연수이고, 답은 그중 큰 값이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-1-3", "심화상", seed);
      const toks = lexExpr(p.content);
      const at = toks.map((t, i) => (t === "?" ? i : -1)).filter((i) => i >= 0);
      expect(at.length, p.content).toBe(2);
      const fill = (a: string, b: string) =>
        evalFlat(toks.map((t, i) => (i === at[0] ? a : i === at[1] ? b : t)));
      const x = fill("*", "/");
      const y = fill("/", "*");
      // 🔴 심화중과 갈리는 유일한 문장 — 성질이 **하나도 안 지운다**.
      expect(x, p.content).not.toBeNull();
      expect(y, p.content).not.toBeNull();
      expect(x, p.content).not.toBe(y);
      expect(answerInt(p.answer), p.content).toBe(Math.max(x!, y!));
    }
  });

  it("1-1-3 심화상 — 큰 쪽이 «늘 같은 배치»가 아니다 (⑹)", () => {
    let firstBigger = 0;
    for (const seed of WIDE) {
      const toks = lexExpr(problem("1-1-3", "심화상", seed).content);
      const at = toks.map((t, i) => (t === "?" ? i : -1)).filter((i) => i >= 0);
      const fill = (a: string, b: string) =>
        evalFlat(toks.map((t, i) => (i === at[0] ? a : i === at[1] ? b : t)))!;
      if (fill("*", "/") > fill("/", "*")) firstBigger += 1;
    }
    expect(
      firstBigger,
      `앞이 큰 씨앗 ${firstBigger}/${WIDE.length}`,
    ).toBeGreaterThan(WIDE.length * 0.2);
    expect(firstBigger).toBeLessThan(WIDE.length * 0.8);
  });

  it("1-1-3 확대 갈래는 규모로 어렵게 하지 않는다 — 답이 세 자리를 안 넘는다", () => {
    for (const tier of ["심화중", "심화상"] as const)
      for (const seed of WIDE)
        expect(
          answerInt(problem("1-1-3", tier, seed).answer),
          `${tier} @${seed}`,
        ).toBeLessThanOrEqual(150);
  });

  /* ══ 1-3 대응 관계 ═══════════════════════════════════════════════════════ */

  /* ── ⑴ 1-3-1 심화중 — 네 칸 중 «나머지가 다 같은» 칸이 하나뿐이다 ── */

  it("1-3-1 심화중 — 표 네 칸 중 한 칸만 안 맞고, 답이 그 칸의 바른 값이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-3-1", "심화중", seed);
      const cells = readFullTable(p.figureSpec);
      expect(cells.length, p.content).toBe(4);
      // 마디가 열린다 — 후보가 넷이다. 그리고 성질이 하나만 남긴다(solveOdd 가 센다).
      const { bad, rel } = solveOdd(cells);
      expect(answerInt(p.answer), p.content).toBe(relAt(rel, cells[bad]![0]));
      // 🔴 어긋난 칸이 실제로 어긋나 있다 — 안 그러면 문항이 안 선다.
      expect(cells[bad]![1], p.content).not.toBe(relAt(rel, cells[bad]![0]));
      // 🔴 1-3-1 은 「식으로 나타내」를 안 쓴다(이웃 낱말 규약).
      expect(p.content.includes("식으로"), p.content).toBe(false);
      expect(p.solution!.includes("triangle="), p.solution!).toBe(false);
    }
  });

  it("1-3-1 심화중 — 관계 꼴이 «늘 더하기»가 아니다 (⑹)", () => {
    const kinds = new Set(
      WIDE.map((s) => {
        const cells = readFullTable(problem("1-3-1", "심화중", s).figureSpec);
        return solveOdd(cells).rel.kind;
      }),
    );
    expect(kinds.size, `나온 관계 꼴 ${[...kinds]}`).toBeGreaterThan(1);
  });

  /* ── ⑴ 1-3-2 심화중 — 짝 하나로 후보 둘, «□가 자연수»가 하나를 지운다 ── */

  it("1-3-2 심화중 — 관계 후보가 둘이고 그중 하나만 조건을 지킨다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-3-2", "심화중", seed);
      // 참은 **지면**이다 — 짝 하나와 빈칸은 표에 있고, 조건 `T` 만 발문에 있다.
      const cells = readTable(p.figureSpec);
      expect(cells.length, p.content).toBe(4);
      const known = cells.filter(([, y]) => y !== null) as [number, number][];
      expect(known.length, `짝이 하나여야 마디가 열린다\n${p.content}`).toBe(1);
      const [a, b] = known[0]!;
      const x = cells[cells.length - 1]![0];
      const T = Number(/△가 \$(\d+)\$일 때/.exec(p.content)![1]);
      // 마디가 열린다 — 짝이 하나뿐이라 정본 꼴 둘이 **모두** 선다.
      const fits = relsFitting([[a, b]]);
      expect(fits.length, `${p.content}\n${JSON.stringify(fits)}`).toBe(2);
      // 굳힘 — △가 `T` 일 때 □가 자연수인 관계가 하나뿐이다.
      const live = fits.filter((r) =>
        r.kind === "mul" ? T % r.v === 0 && T / r.v >= 1 : T - r.v >= 1,
      );
      expect(live.length, `${p.content}\n산 것 ${JSON.stringify(live)}`).toBe(
        1,
      );
      expect(answerInt(p.answer), p.content).toBe(relAt(live[0]!, x));
      // 🔴 후보 둘이 같은 답을 내면 마디가 뜻이 없다.
      const dead = fits.find((r) => r !== live[0]!)!;
      expect(relAt(dead, x), p.content).not.toBe(relAt(live[0]!, x));
    }
  });

  it("1-3-2 심화중 — 살아남는 관계가 «늘 같은 꼴»이 아니다 (⑹)", () => {
    let mul = 0;
    for (const seed of WIDE) {
      const sol = problem("1-3-2", "심화중", seed).solution!;
      if (sol.slice(sol.indexOf("그러므로")).includes("times")) mul += 1;
    }
    expect(mul, `곱이 답인 씨앗 ${mul}/${WIDE.length}`).toBeGreaterThan(
      WIDE.length * 0.25,
    );
    expect(mul).toBeLessThan(WIDE.length * 0.75);
  });

  /* ── ⑵ 1-3-2 심화상 — 세 칸이라 «짝마다 관계를 세워 봐야» 갈린다 ── */

  it("1-3-2 심화상 — 여섯 짝 중 관계가 서는 짝이 하나뿐이고, 답은 먼 항이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-3-2", "심화상", seed);
      const cells = readFullTable(p.figureSpec);
      expect(cells.length, p.content).toBe(4);
      // 🔴 심화중과 갈리는 문장 — 어긋난 칸이 **둘**이라 «나머지가 다 같다»로 못 고른다.
      //    두 칸씩 짝지은 **여섯** 짝을 세워 봐야 하나가 남는다.
      const pairs: [number, number][] = [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3],
      ];
      const standing = pairs.filter(
        ([i, j]) => relsFitting([cells[i]!, cells[j]!]).length === 1,
      );
      expect(
        standing.length,
        `${JSON.stringify(cells)}\n서는 짝 ${JSON.stringify(standing)}`,
      ).toBe(1);
      const [ka, kb] = standing[0]!;
      const rel = relsFitting([cells[ka]!, cells[kb]!])[0]!;
      const far = Number(/□가 \$(\d+)\$일 때/.exec(p.content)![1]);
      expect(answerInt(p.answer), p.content).toBe(relAt(rel, far));
      // 남은 두 칸이 실제로 둘 다 어긋나 있다.
      for (const i of [0, 1, 2, 3])
        if (i !== ka && i !== kb)
          expect(cells[i]![1], p.content).not.toBe(relAt(rel, cells[i]![0]));
      // 먼 항은 표에 없다 — 있으면 읽기만 하면 된다.
      expect(cells.map((c) => c[0]).includes(far), p.content).toBe(false);
      // 🔴 해설이 「차가 다르고 배도 같지 않다」고 적는다 — 그 문장이 **참이어야** 한다.
      for (const [i, j] of pairs) {
        if (i === ka && j === kb) continue;
        const di = cells[i]![1] - cells[i]![0];
        const dj = cells[j]![1] - cells[j]![0];
        expect(di, p.content).toBeGreaterThan(0);
        expect(di, `${p.content}\n${i}·${j} 차가 같다`).not.toBe(dj);
        expect(
          cells[i]![1] * cells[j]![0],
          `${p.content}\n${i}·${j} 배가 같다`,
        ).not.toBe(cells[j]![1] * cells[i]![0]);
      }
    }
  });

  /* ══ 1-4 약분과 통분 ═════════════════════════════════════════════════════ */

  /** 발문의 `\frac{a}{b}` 덩어리들. */
  const fracsIn = (text: string): [number, number][] =>
    [...text.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);

  const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));
  const lcm2 = (a: number, b: number): number => (a / gcd2(a, b)) * b;

  /* ── ⑴ 1-4-2 심화중 — 「몇으로 약분했나」를 차가 굳힌다 ── */

  it("1-4-2 심화중 — 기약분수의 차가 배수를 하나로 남기고 답이 그 분모다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-4-2", "심화중", seed);
      const [[a, b]] = fracsIn(p.content) as [[number, number]];
      const D = Number(/차가 \$(\d+)\$/.exec(p.content)![1]);
      expect(gcd2(a, b), `기약이 아니다: ${p.content}`).toBe(1);
      // 마디가 열린다 — 곱한 수가 무엇인지 발문이 안 말한다.
      expect(D % (b - a), p.content).toBe(0);
      const k = D / (b - a);
      expect(
        k,
        `배수가 $1$ 이면 약분한 적이 없다: ${p.content}`,
      ).toBeGreaterThan(1);
      expect(answerInt(p.answer), p.content).toBe(b * k);
      // 🔴 규모를 키우는 것은 축이 아니다(토대 17 §3 「발문 분모 ≤ 48」).
      expect(b * k, p.content).toBeLessThanOrEqual(48);
    }
  });

  /* ── ⑴ 1-4-3 심화중 — 「어느 분수의 분자인가」를 공배수가 굳힌다 ── */

  it("1-4-3 심화중 — 두 읽기 중 «공배수»가 되는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-4-3", "심화중", seed);
      const [[a, b], [c, d]] = fracsIn(p.content) as [
        [number, number],
        [number, number],
      ];
      const N = Number(/분자가 \$(\d+)\$/.exec(p.content)![1]);
      const reading = (num: number, den: number): number | null => {
        if (N % num !== 0) return null;
        const m = den * (N / num);
        return m % b === 0 && m % d === 0 ? m : null;
      };
      const live = [reading(a, b), reading(c, d)].filter(
        (v): v is number => v !== null,
      );
      // 마디가 열린다(후보 둘) — 그리고 공배수 조건이 하나만 남긴다.
      expect(new Set(live).size, `${p.content}\n산 것 ${live}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(live[0]);
      // 통분이 **두 분수 다** 바뀌어야 이 소단원이다(한쪽이 약수면 한 분수가 그대로다).
      expect(b % d === 0 || d % b === 0, p.content).toBe(false);
      expect(answerInt(p.answer) % lcm2(b, d), p.content).toBe(0);
    }
  });

  /* ── ⑵ 1-4-3 심화상 — 분모 후보를 만들어 «진분수가 되는가»를 다 따져야 한다 ── */

  it("1-4-3 심화상 — 분모 후보가 셋 이상이고 진분수가 되는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-4-3", "심화상", seed);
      const [b, M, S] = [...p.content.matchAll(/\$(\d+)\$/g)].map((m) =>
        Number(m[1]),
      ) as [number, number, number];
      // 되짚기가 만드는 줄 — 시험이 직접 만든다.
      const cands: number[] = [];
      for (let e = 2; e <= M; e += 1) if (lcm2(b, e) === M) cands.push(e);
      expect(
        cands.length,
        `${p.content}\n후보 ${cands}`,
      ).toBeGreaterThanOrEqual(3);
      // 🔴 성질 하나로는 안 갈린다 — 후보마다 분자를 **만들어 봐야** 한다.
      const hit = cands.filter((e) => S - e > 0 && S - e < e);
      expect(hit.length, `${p.content}\n산 것 ${hit}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(hit[0]);
      // 해설이 뺄셈을 두 번 이상 적을 수 있어야 한다(음수는 안 적는다).
      expect(
        cands.filter((e) => S - e > 0).length,
        p.content,
      ).toBeGreaterThanOrEqual(2);
      expect(p.solution, "음수가 지면에 나갔다").not.toMatch(/=-\d/);
    }
  });

  /* ══ 2-2 분수의 곱셈 ═════════════════════════════════════════════════════ */

  /** 곱이 `P` 인 짝 — 시험이 직접 만든다(제품의 목록을 안 부른다). */
  const pairsOf = (P: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let d = 1; d <= P; d += 1) if (P % d === 0) out.push([d, P / d]);
    return out;
  };

  /** 발문에 찍힌 곱한 값을 «분모 `b` 짜리 분자»로 되돌린다 — 참은 지면이다. */
  function numeratorOnPage(text: string, b: number): number {
    const mixed = /(\d+)\\frac\{(\d+)\}\{(\d+)\}/.exec(text);
    if (mixed) {
      const [w, p, q] = [1, 2, 3].map((i) => Number(mixed[i]));
      expect(b % q!, `${text}: 분모 ${q} 가 ${b} 의 약수가 아니다`).toBe(0);
      return (w! * q! + p!) * (b / q!);
    }
    const plain = /\\frac\{(\d+)\}\{(\d+)\}/.exec(text)!;
    const [p, q] = [1, 2].map((i) => Number(plain[i]));
    expect(b % q!, text).toBe(0);
    return p! * (b / q!);
  }

  /* ── ⑴ 2-2-1 · 2-2-2 심화중 — 「진분수다」가 짝을 하나로 남긴다 ── */

  it("2-2-1·2-2-2 심화중 — 한 자리 자연수 짝이 여럿이고 진분수가 하나만 남긴다", () => {
    for (const code of ["2-2-1", "2-2-2"] as const)
      for (const seed of SEEDS) {
        const p = problem(code, "심화중", seed);
        const b = Number(/분모가 \$(\d+)\$인/.exec(p.content)![1]);
        const P = numeratorOnPage(p.content, b);
        // 마디가 열린다 — 「한 자리 자연수」만으로는 짝이 여럿이다.
        const oneDigit = pairsOf(P).filter(([, e]) => e >= 2 && e <= 9);
        expect(
          oneDigit.length,
          `${code} @${seed}\n${p.content}\n한 자리 짝 ${JSON.stringify(oneDigit)}`,
        ).toBeGreaterThan(1);
        // 굳힘 — 「분자 < 분모」가 정확히 하나를 남긴다.
        const live = oneDigit.filter(([d]) => d < b);
        expect(live.length, `${code} @${seed}\n${p.content}`).toBe(1);
        const [a, k] = live[0]!;
        expect(answerInt(p.answer), `${code} @${seed}\n${p.content}`).toBe(
          code === "2-2-1" ? a : k,
        );
      }
  });

  /* ── ⑴ 2-2-3 심화중 — 두 진분수 조건이 짝을 하나로 남긴다 ── */

  it("2-2-3 심화중 — 곱 짝이 여럿이고 두 진분수 조건이 하나만 남긴다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-2-3", "심화중", seed);
      const [d1, d2] = [...p.content.matchAll(/분모가 \$(\d+)\$인/g)].map((m) =>
        Number(m[1]),
      ) as [number, number];
      const P = numeratorOnPage(p.content, d1 * d2);
      const all = pairsOf(P);
      expect(
        all.length,
        `${p.content}\n짝 ${JSON.stringify(all)}`,
      ).toBeGreaterThan(2);
      const live = all.filter(([x, y]) => x < d1 && y < d2);
      expect(live.length, `${p.content}\n산 것 ${JSON.stringify(live)}`).toBe(
        1,
      );
      expect(answerInt(p.answer), p.content).toBe(live[0]![0] + live[0]![1]);
    }
  });

  /* ── ⑵ 2-2-3 심화상 — 진분수만으로는 안 갈리고 «곱해서 간단히 해 봐야» 갈린다 ── */

  it("2-2-3 심화상 — 진분수 짝이 여럿이고, 간단히 한 분모가 맞는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-2-3", "심화상", seed);
      const d1 = Number(/분모가 \$(\d+)\$인 진분수와/.exec(p.content)![1]);
      const [b, d2] = fracsIn(p.content)[0]!;
      const D = Number(/분모가 \$(\d+)\$입니다/.exec(p.content)![1]);
      // 이 소단원은 이름이 「진분수의 곱셈」이라 **발문에 진분수가 있어야** 한다
      // (`probe-elem-section-conditions` 가 첫 판을 그것으로 잡았다).
      expect(b, p.content).toBeLessThan(d2);
      // 🔴 심화중과 갈리는 문장 — 맞대어 볼 분자 후보가 **여럿** 남는다.
      const cands: number[] = [];
      for (let x = 2; x < d1; x += 1) cands.push(x);
      expect(cands.length, p.content).toBeGreaterThanOrEqual(4);
      // 그리고 **실제로 곱해서 간단히 해 봐야** 하나가 남는다.
      const hit = cands.filter((x) => (d1 * d2) / gcd2(x * b, d1 * d2) === D);
      expect(hit.length, `${p.content}\n산 것 ${JSON.stringify(hit)}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(hit[0]);
    }
  });

  /* ── ⑴ 2-2-4 심화중 — 「대분수다」가 짝을 하나로 남긴다 ── */

  it("2-2-4 심화중 — 한 자리 자연수 짝이 여럿이고 «분자 > 분모»가 하나만 남긴다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-2-4", "심화중", seed);
      const b = Number(/분모가 \$(\d+)\$인/.exec(p.content)![1]);
      const P = numeratorOnPage(p.content, b);
      const oneDigit = pairsOf(P).filter(([, e]) => e >= 2 && e <= 9);
      expect(oneDigit.length, p.content).toBeGreaterThan(1);
      const live = oneDigit.filter(([d]) => d > b);
      expect(live.length, `${p.content}\n산 것 ${JSON.stringify(live)}`).toBe(
        1,
      );
      expect(answerInt(p.answer), p.content).toBe(live[0]![0]);
      // 처음 수도 곱한 결과도 **대분수**여야 이 소단원이다.
      expect(live[0]![0] % b, p.content).not.toBe(0);
      expect(P % b, p.content).not.toBe(0);
    }
  });

  it("2-2 확대 갈래는 발문에서 «기약»을 요구하지 않는다", () => {
    for (const code of ["2-2-1", "2-2-2", "2-2-3", "2-2-4"] as const)
      for (const tier of FILLED[code]!)
        for (const seed of SEEDS)
          expect(
            /기약|약분하여 나타/.test(problem(code, tier, seed).content),
            `${code} ${tier} @${seed}`,
          ).toBe(false);
  });

  /* ══ 2-5 직육면체 ════════════════════════════════════════════════════════ */

  /* ── ⑴ 2-5-3 심화중 — 「평행한 면은 합동」이 인수 짝을 하나로 남긴다 ── */

  it("2-5-3 심화중 — 넓이 짝이 여럿이고 «나머지 두 면이 정사각형»이 하나만 남긴다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-5-3", "심화중", seed);
      const [A, B] = [...p.content.matchAll(/\$(\d+)\$ cm²/g)].map((m) =>
        Number(m[1]),
      ) as [number, number];
      // 마디가 열린다 — 넓이 `A` 의 인수 짝이 여럿이다.
      const pairs: [number, number][] = [];
      for (let d = 1; d <= A; d += 1) if (A % d === 0) pairs.push([d, A / d]);
      expect(pairs.length, p.content).toBeGreaterThan(2);
      // 굳힘 — 같은 두 모서리는 「두 번 곱해 `B` 가 되는 수」다.
      const x = Math.round(Math.sqrt(B));
      expect(x * x, `${p.content}: 나머지 두 면이 정사각형이 아니다`).toBe(B);
      expect(A % x, `${p.content}: 넓이 ${A} 가 ${x} 로 안 나뉜다`).toBe(0);
      const w = A / x;
      expect(w, `${p.content}: 정육면체면 「네 개」가 거짓이다`).not.toBe(x);
      expect(answerInt(p.answer), p.content).toBe((w + 2 * x) * 4);
      // ㉢ 개수는 한글로 — 「$4$개」의 `4` 가 지면 수가 되면 반증 ⑥ 이 오작동한다.
      expect(/\$\d+\$\s*개/.test(p.content), p.content).toBe(false);
    }
  });

  /* ── ⑴ 2-5-4 심화중 — 「$3$배인가 $4$배인가」를 나누어떨어짐이 굳힌다 ── */

  it("2-5-4 심화중 — 두 읽기 중 나누어떨어지는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-5-4", "심화중", seed);
      const S = Number(/하나가 \$(\d+)\$ cm/.exec(p.content)![1]);
      const live = [3, 4].filter((k) => S % k === 0);
      expect(live.length, `${p.content}\n산 것 ${live}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(S / live[0]!);
      // 세 모서리가 자연수 하나씩 나올 만큼은 커야 한다.
      expect(S / live[0]!, p.content).toBeGreaterThanOrEqual(3);
    }
  });

  it("2-5-4 심화중 — 「늘 $3$배」도 「늘 $4$배」도 아니다 (⑹)", () => {
    let nine = 0;
    for (const seed of WIDE) {
      const S = Number(
        /하나가 \$(\d+)\$ cm/.exec(
          problem("2-5-4", "심화중", seed).content,
        )![1],
      );
      if (S % 3 === 0) nine += 1;
    }
    expect(
      nine,
      `보이는 아홉 쪽인 씨앗 ${nine}/${WIDE.length}`,
    ).toBeGreaterThan(WIDE.length * 0.3);
    expect(nine).toBeLessThan(WIDE.length * 0.7);
  });

  /* ── ⑵ 2-5-6 심화상 — 세 넓이가 얽혀 «만들어 견주어야» 갈린다 ── */

  it("2-5-6 심화상 — 첫 넓이의 인수 짝이 여럿이고 세 넓이를 다 만드는 짝이 하나다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-5-6", "심화상", seed);
      const [A, B, C] = [...p.content.matchAll(/\$?(\d+)\$?/g)]
        .map((m) => Number(m[1]))
        .filter((v) => v > 1)
        .slice(0, 3) as [number, number, number];
      // 되짚기가 만드는 줄 — 시험이 직접 만든다.
      const pairs: [number, number][] = [];
      for (let w = 1; w * w < A; w += 1)
        if (A % w === 0) pairs.push([w, A / w]);
      // 🔴 심화중과 갈리는 문장 — 성질 하나로는 안 갈리고 짝마다 곱해 봐야 한다.
      expect(
        pairs.length,
        `${p.content}\n짝 ${JSON.stringify(pairs)}`,
      ).toBeGreaterThan(1);
      const hit = pairs.filter(([w, d]) => B % w === 0 && d * (B / w) === C);
      expect(hit.length, `${p.content}\n산 것 ${JSON.stringify(hit)}`).toBe(1);
      const [w, d] = hit[0]!;
      const h = B / w;
      expect(answerInt(p.answer), p.content).toBe((w + d + h) * 4);
      // 규모는 축이 아니다 — 모서리 합이 세 자리를 크게 안 넘는다.
      expect(answerInt(p.answer), p.content).toBeLessThanOrEqual(140);
    }
  });

  it("2-5 확대 갈래는 겉넓이·부피를 쓰지 않는다 (초6 내용)", () => {
    for (const code of ["2-5-3", "2-5-4", "2-5-6"] as const)
      for (const tier of FILLED[code]!)
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const word of ["겉넓이", "부피", "cm³"])
            expect(
              `${p.content} ${p.solution}`.includes(word),
              `${code} ${tier} @${seed} 에 «${word}»`,
            ).toBe(false);
        }
  });

  it("1-4 확대 갈래에서 이웃 낱말을 안 쓴다 (D-66 ⑸)", () => {
    const owner: [RegExp, string][] = [
      [/크기가 같은/, "1-4-1"],
      [/약분|기약/, "1-4-2"],
      [/통분|공통분모/, "1-4-3"],
      [/소수/, "1-4-5"],
    ];
    for (const code of ["1-4-2", "1-4-3"] as const)
      for (const tier of FILLED[code]!)
        for (const seed of SEEDS) {
          const c = problem(code, tier, seed).content;
          for (const [re, own] of owner)
            if (code !== own)
              expect(re.test(c), `${code} ${tier} @${seed}\n${c}`).toBe(false);
        }
  });
});
