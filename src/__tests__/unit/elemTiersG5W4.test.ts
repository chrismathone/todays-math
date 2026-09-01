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
});
