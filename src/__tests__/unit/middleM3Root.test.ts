/**
 * 물결 4B — 중3 3-1 앞 세 중단원 48유형(`m3Root.ts`)의 검산.
 *
 * ## 이 시험이 무엇을 «참»으로 삼는가
 *
 * 생성기의 식을 옮겨 적지 않는다. 근호 유형의 답은 거의 다 **부동소수로 다시
 * 유도**해 대조한다 — 답 문자열을 `evalRadical` 로 **읽어서** 수로 만들고,
 * `facts` 의 원 수치로 세운 **다른 식**의 값과 견준다. 세는 유형(개수·최솟값)은
 * **전수 탐색**으로 다시 센다. 둘 다 생성기가 쓴 경로가 아니다.
 *
 * `evalRadical` 자체가 죽으면 그 대조가 통째로 「0 은 깨끗」이 된다. 그래서
 * **제품을 거치지 않고** 손으로 적은 값으로 파서를 먼저 시험한다(아래 첫 describe).
 * 이 저장소가 여러 번 데인 자리다 — 「살아 있나」를 제품으로 물으면 못 잰다.
 *
 * ## 이 단원의 계약 셋 (48유형 전량 · 씨앗마다)
 *
 * ㉠ **정답의 근호 안에 제곱인수가 없다.** 예외는 「근호 안으로 넣기」 한 유형뿐이고
 *    그 목록이 **정확히 하나**임을 따로 못 박는다(늘면 빨개진다).
 *    ⚠️ 한계를 적어 둔다 — 이 가드는 **정답에만** 댄다. 발문에는 정리되지 않은
 *    근호가 일부러 들어간다(「$a\sqrt b$ 꼴로 나타내시오」가 그런 유형이다).
 * ㉡ **정답의 분모에 근호가 없고, 분수는 기약이다.**
 * ㉢ **$\sqrt{a^2}=|a|$ 유형은 부호 표본을 넣어 절댓값으로 다시 계산한다.**
 *    절댓값을 빼먹으면 그 자리에서 빨개진다.
 *
 * 그리고 유형 번호·제목·중단원명은 `scripts/rpm/rpm-type-catalog.json`(색인 정본)과
 * **직접 대조**한다 — 지어낸 유형 금지.
 *
 * ## 모집단은 내 배열이다
 *
 * `registeredTypes()` 를 중단원 이름으로 거르지 않는다. 같은 중단원에 남의 유형이
 * 들어오면 내 검산표에 남의 것이 들이대져 빨개진다(물결 2 에서 실제로 났다).
 * 여기서는 `M3_ROOT` 를 직접 훑는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers, runawayDecimals } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M3_ROOT } from "../../lib/middle/m3Root";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991];
const REPO = path.resolve(__dirname, "../../..");
const OWNED = M3_ROOT;

/** RPM 색인 정본의 중단원명 — 날 문자로 적는다(커버리지 가드가 문자열로 센다). */
const MINOR_SQRT = "제곱근의 뜻과 성질";
const MINOR_IRR = "무리수와 실수";
const MINOR_CALC = "근호를 포함한 식의 계산";

const S = (t: string) => `3-1|${MINOR_SQRT}|${t}`;
const I = (t: string) => `3-1|${MINOR_IRR}|${t}`;
const C = (t: string) => `3-1|${MINOR_CALC}|${t}`;

/**
 * 「근호 안에 제곱인수가 없다」의 **단 하나뿐인 예외**.
 *
 * 근호를 포함한 식의 계산 04 는 $a\sqrt{b}=\sqrt{a^2b}$ 로 **넣는** 유형이라
 * 답의 근호 안이 정리되지 않은 것이 정답이다. 이 집합이 늘면 아래 `it` 이 빨개진다 —
 * 예외를 조용히 늘리지 못하게 하는 것이 목적이다.
 */
const RADICAL_EXEMPT = new Set([C("04")]);

// ── 답 문자열을 수로 읽는 파서 (검산의 «참» 이 여기서 온다) ─────────────

/** 답에서 첫 `$...$` 를 꺼내고 단위(`\,\mathrm{cm}^2`)를 뗀다. */
function mathOf(text: string): string {
  const m = /\$([^$]*)\$/.exec(text);
  if (!m) throw new Error(`수식이 없습니다: ${text}`);
  return m[1]!.replace(/\\,\\mathrm\{[a-z]+\}(?:\^\{?\d\}?)?/g, "").trim();
}

/**
 * `2\sqrt{3}` · `\dfrac{\sqrt{6}}{3}` · `6-\sqrt{11}` 같은 답을 수로 읽는다.
 * 모르는 글자가 남으면 **던진다** — 조용히 0 을 돌려주면 대조가 눈이 먼다.
 */
function evalRadical(src: string): number {
  const s = src.replace(/\s+/g, "");
  let i = 0;

  function group(): string {
    if (s[i] !== "{") throw new Error(`중괄호가 아닙니다: ${s.slice(i)}`);
    let depth = 0;
    const start = i;
    for (; i < s.length; i += 1) {
      if (s[i] === "{") depth += 1;
      else if (s[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          return s.slice(start + 1, i - 1);
        }
      }
    }
    throw new Error(`중괄호가 안 닫혔습니다: ${src}`);
  }

  function term(): number {
    if (s.startsWith("\\dfrac", i) || s.startsWith("\\frac", i)) {
      i += s.startsWith("\\dfrac", i) ? 6 : 5;
      const num = group();
      const den = group();
      return evalRadical(num) / evalRadical(den);
    }
    let coef = 1;
    let hadDigits = false;
    const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (m) {
      coef = Number(m[0]);
      i += m[0].length;
      hadDigits = true;
    }
    if (s.startsWith("\\sqrt", i)) {
      i += 5;
      return coef * Math.sqrt(evalRadical(group()));
    }
    if (!hadDigits) throw new Error(`읽을 수 없는 항: ${s.slice(i)} (${src})`);
    return coef;
  }

  function signed(): number {
    if (s[i] === "-") {
      i += 1;
      return -term();
    }
    if (s[i] === "+") i += 1;
    return term();
  }

  let v = signed();
  while (i < s.length && (s[i] === "+" || s[i] === "-")) {
    const op = s[i];
    i += 1;
    const t = term();
    v = op === "+" ? v + t : v - t;
  }
  if (i < s.length) throw new Error(`남은 글자: ${s.slice(i)} (${src})`);
  return v;
}

/** `$x=\pm 7$` · `$\pm\sqrt{19}$` 의 절댓값. */
function pmMagnitude(answer: string): number {
  return evalRadical(
    mathOf(answer)
      .replace(/^x=/, "")
      .replace(/^\\pm\s*/, ""),
  );
}

/** `-3a-2b` 에서 문자 하나의 계수. 없으면 0. */
function letterCoef(expr: string, letter: string): number {
  const m = new RegExp(`(^|[+-])(\\d*)${letter}`).exec(expr);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2]));
}

// ── 전량 가드가 쓰는 도구 ───────────────────────────────────────────

/** 답에 쓰인 `\sqrt{정수}` 를 전부. */
function radicands(latex: string): number[] {
  return [...latex.matchAll(/\\sqrt\{(\d+)\}/g)].map((m) => Number(m[1]));
}

/** `\dfrac{A}{B}` / `\frac{A}{B}` 를 중괄호 짝을 맞춰 뜯는다. */
function fractions(latex: string): { num: string; den: string }[] {
  const out: { num: string; den: string }[] = [];
  for (let i = 0; i < latex.length; i += 1) {
    const isD = latex.startsWith("\\dfrac{", i);
    if (!isD && !latex.startsWith("\\frac{", i)) continue;
    let j = i + (isD ? 6 : 5);
    const read = (): string => {
      let depth = 0;
      const start = j;
      for (; j < latex.length; j += 1) {
        if (latex[j] === "{") depth += 1;
        else if (latex[j] === "}") {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            return latex.slice(start + 1, j - 1);
          }
        }
      }
      throw new Error(`분수의 중괄호가 안 닫혔습니다: ${latex}`);
    };
    const num = read();
    const den = read();
    out.push({ num, den });
  }
  return out;
}

/** 중괄호 밖의 `+`/`-` 로 항을 가른다. */
function topLevelTerms(expr: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i]!;
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0 && (ch === "+" || ch === "-") && i > 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.filter((t) => t.trim() !== "");
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

/**
 * 제곱인수가 없는가 — **시험이 따로 센다.**
 *
 * 제품의 `isSquareFree` 를 불러 쓰면, 그 뿌리인 `simplifySqrt` 를 망가뜨리는
 * 변이에서 **세는 쪽과 고치는 쪽이 같이 눈이 먼다** — 답은 정리되지 않았는데
 * 가드는 「정리됐다」고 한다. 이 저장소가 여러 번 데인 자리라 여기서 다시 센다.
 */
function squareFree(n: number): boolean {
  for (let d = 2; d * d <= n; d += 1) if (n % (d * d) === 0) return false;
  return true;
}

function isSquareInt(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

// ── 목록 유형(무리수와 실수 01·03)이 쓰는 분류기 ────────────────────

/** 발문 둘째 줄의 「$…$, $…$, …」 를 항목으로 가른다 — 기대값은 **본문에서** 온다. */
function listItems(content: string): string[] {
  const line = content.split("\n")[1];
  if (!line) throw new Error(`목록 줄이 없습니다: ${content}`);
  return line.split(",").map((t) => t.trim().replace(/^\$|\$$/g, ""));
}

/** 시험이 **스스로** 유리수·무리수를 가른다(생성기의 판정을 안 믿는다). */
function isIrrational(tok: string): boolean {
  if (tok === "\\pi") return true;
  if (/^\\dfrac\{\d+\}\{\d+\}$/.test(tok)) return false;
  if (/^-?\d+(?:\.\d+)?$/.test(tok)) return false;
  const m = /^-?\\sqrt\{(\d+(?:\.\d+)?)\}$/.exec(tok);
  if (!m) throw new Error(`분류할 수 없는 항목: ${tok}`);
  const scaled = Math.round(Number(m[1]) * 100);
  return !isSquareInt(scaled);
}

// ── 유형별 독립 검산 ────────────────────────────────────────────────

type Check = (p: MidProblem) => void;

const near = (got: number, want: number, tol = 1e-9): void => {
  expect(Math.abs(got - want), `${got} vs ${want}`).toBeLessThan(tol);
};

/** 세는 유형은 **전수 탐색**으로 다시 센다 — 생성기의 공식을 안 쓴다. */
function smallest(limit: number, ok: (x: number) => boolean): number {
  for (let x = 1; x <= limit; x += 1) if (ok(x)) return x;
  throw new Error("전수 탐색에서 못 찾았습니다");
}

const CHECK: Record<string, Check> = {
  [S("01")]: (p) => {
    const { n, k, branch } = p.facts;
    near(pmMagnitude(p.answer), Math.sqrt(n!));
    if (branch === 0) {
      expect(isSquareInt(n!)).toBe(true);
      expect(Math.round(Math.sqrt(n!))).toBe(k);
    } else {
      expect(isSquareInt(n!)).toBe(false);
    }
  },
  [S("02")]: (p) => {
    const { n, branch } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      (branch === 1 ? -1 : 1) * Math.sqrt(n!),
    );
    expect(p.content.includes("음의 제곱근")).toBe(branch === 1);
  },
  [S("03")]: (p) => {
    const { branch, k, p: pp, q } = p.facts;
    const got = evalRadical(mathOf(p.answer));
    if (branch === 3) {
      near(got, Math.sqrt((pp! * pp!) / (q! * q!)));
      expect(gcd(pp!, q!)).toBe(1);
    } else {
      near(got, (branch === 1 ? -1 : 1) * Math.sqrt(k! * k!));
    }
  },
  [S("04")]: (p) => {
    const { a, k, branch } = p.facts;
    near(Math.sqrt(Math.sqrt(a!)), k!);
    near(
      branch === 0 ? pmMagnitude(p.answer) : evalRadical(mathOf(p.answer)),
      k!,
    );
  },
  [S("05")]: (p) => {
    const { branch, area, out, inner, p: pp, q } = p.facts;
    expect(squareFree(inner!)).toBe(true);
    const got = evalRadical(mathOf(p.answer));
    if (branch === 0) {
      expect(out! * out! * inner!).toBe(area);
      near(got, Math.sqrt(area!));
    } else {
      expect(out! * out! * inner!).toBe(pp! * pp! + q! * q!);
      near(got, Math.hypot(pp!, q!), 1e-9);
    }
  },
  [S("06")]: (p) => {
    const { a, b, c, value } = p.facts;
    near(
      Math.sqrt(a! * a!) + Math.sqrt((-b!) ** 2) - (-Math.sqrt(c!)) ** 2,
      value!,
      1e-9,
    );
    near(evalRadical(mathOf(p.answer)), value!);
  },
  [S("07")]: (p) => {
    const { a, b, c, value } = p.facts;
    near(
      (Math.sqrt(a! * a!) * Math.sqrt((-b!) ** 2)) / Math.sqrt(c!) ** 2,
      value!,
      1e-9,
    );
    near(evalRadical(mathOf(p.answer)), value!);
  },
  // ㉢ 부호 표본을 넣어 **절댓값으로** 다시 계산한다.
  [S("08")]: (p) => {
    const { p: pp, q, sign, coef } = p.facts;
    for (const mag of [2, 7.5]) {
      const a = sign! * mag;
      near(Math.abs(pp! * a) - Math.abs(-q! * a), coef! * a, 1e-9);
    }
    expect(letterCoef(mathOf(p.answer), "a")).toBe(coef);
    expect(p.content.includes(sign! > 0 ? "$a>0$" : "$a<0$")).toBe(true);
  },
  [S("09")]: (p) => {
    const { a, b, branch } = p.facts;
    const math = mathOf(p.answer);
    for (const t of [0.17, 0.5, 0.83]) {
      const x = a! + (b! - a!) * t;
      const lhs = Math.abs(x - a!);
      const rhs = Math.abs(x - b!);
      if (branch === 0) near(lhs + rhs, evalRadical(math), 1e-9);
      else {
        const cst = Number(/^2x-(\d+)$/.exec(math)?.[1] ?? NaN);
        near(lhs - rhs, 2 * x - cst, 1e-9);
      }
    }
  },
  [S("10")]: (p) => {
    const { p: pp, q, r, sa, sb, ca, cb } = p.facts;
    for (const [ma, mb] of [
      [2, 3],
      [5.5, 1.25],
    ]) {
      const a = sa! * ma!;
      const b = sb! * mb!;
      near(
        Math.abs(pp! * a) + Math.abs(q! * b) - Math.abs(-r! * a),
        ca! * a + cb! * b,
        1e-9,
      );
    }
    const math = mathOf(p.answer);
    expect(letterCoef(math, "a")).toBe(ca);
    expect(letterCoef(math, "b")).toBe(cb);
  },
  [S("11")]: (p) => {
    const { a, x } = p.facts;
    expect(smallest(2000, (t) => isSquareInt(a! * t))).toBe(x);
    near(evalRadical(mathOf(p.answer)), x!);
  },
  [S("12")]: (p) => {
    const { a, x } = p.facts;
    expect(smallest(2000, (t) => a! % t === 0 && isSquareInt(a! / t))).toBe(x);
    near(evalRadical(mathOf(p.answer)), x!);
  },
  [S("13")]: (p) => {
    const { a, x } = p.facts;
    expect(smallest(2000, (t) => isSquareInt(a! + t))).toBe(x);
    near(evalRadical(mathOf(p.answer)), x!);
  },
  [S("14")]: (p) => {
    const { a, count } = p.facts;
    let n = 0;
    for (let x = 1; x <= a!; x += 1) if (isSquareInt(a! - x)) n += 1;
    expect(n).toBe(count);
    near(evalRadical(mathOf(p.answer)), count!);
  },
  [S("15")]: (p) => {
    const { p: pp, q, r } = p.facts;
    const parts = mathOf(p.answer).split("<").map(evalRadical);
    expect(parts.length).toBe(3);
    for (let i = 1; i < parts.length; i += 1) {
      expect(parts[i]! > parts[i - 1]!).toBe(true);
    }
    const want = [Math.sqrt(pp!), q!, Math.sqrt(r!)].sort((x, y) => x - y);
    parts.forEach((v, i) => near(v, want[i]!, 1e-9));
  },
  [S("16")]: (p) => {
    const { a, b } = p.facts;
    near(evalRadical(mathOf(p.answer)), Math.abs(a! - Math.sqrt(b!)), 1e-9);
    expect(mathOf(p.answer).startsWith("-")).toBe(false);
  },
  [S("17")]: (p) => {
    const { a, b, branch, count } = p.facts;
    let n = 0;
    for (let x = 1; x <= b! * b! + 5; x += 1) {
      const s = Math.sqrt(x);
      if (s > a! && (branch === 0 ? s < b! : s <= b!)) n += 1;
    }
    expect(n).toBe(count);
    near(evalRadical(mathOf(p.answer)), count!);
  },
  [S("18")]: (p) => {
    const { n, total } = p.facts;
    let sum = 0;
    for (let x = 1; x <= n!; x += 1) {
      let f = 0;
      for (let k = 1; k * k <= x; k += 1) f += 1;
      sum += f;
    }
    expect(sum).toBe(total);
    near(evalRadical(mathOf(p.answer)), total!);
  },

  [I("01")]: (p) => {
    const want = listItems(p.content).filter(isIrrational).length;
    expect(want).toBe(p.facts.count);
    near(evalRadical(mathOf(p.answer)), want);
  },
  [I("02")]: (p) => {
    const { n, count } = p.facts;
    let c = 0;
    for (let k = 1; k <= n!; k += 1) if (!isSquareInt(k)) c += 1;
    expect(c).toBe(count);
    near(evalRadical(mathOf(p.answer)), count!);
  },
  [I("03")]: (p) => {
    const items = listItems(p.content);
    const irr = items.filter(isIrrational).length;
    const value = items.length - irr - irr;
    expect(value).toBe(p.facts.value);
    near(evalRadical(mathOf(p.answer)), value);
  },
  [I("04")]: (p) => {
    const { c, p: pp, q, out, inner, branch } = p.facts;
    expect(out! * out! * inner!).toBe(pp! * pp! + q! * q!);
    expect(squareFree(inner!)).toBe(true);
    const d = Math.hypot(pp!, q!);
    near(evalRadical(mathOf(p.answer)), c! + (branch === 0 ? d : -d), 1e-9);
  },
  [I("05")]: (p) => {
    const { n, k } = p.facts;
    expect(k! * k! < n! && n! < (k! + 1) * (k! + 1)).toBe(true);
    const ns = [...p.answer.matchAll(/\$(-?\d+)\$/g)].map((m) => Number(m[1]));
    expect(ns).toEqual([k, k! + 1]);
  },
  [I("06")]: (p) => {
    const { m, n, shift } = p.facts;
    const v = m! + Math.sqrt(n!);
    const coords = [...p.content.matchAll(/\$(-?\d+)\$/g)]
      .map((x) => Number(x[1]))
      .slice(0, 4);
    expect(coords.length).toBe(4);
    const names = ["A", "B", "C", "D"];
    expect(p.answer).toBe(`점 ${names[shift!]}와 점 ${names[shift! + 1]}`);
    expect(coords[shift!]! < v && v < coords[shift! + 1]!).toBe(true);
  },
  [I("07")]: (p) => {
    const { k, m, n, gt } = p.facts;
    const A = k! + Math.sqrt(m!);
    const B = Math.sqrt(m!) + Math.sqrt(n!);
    expect(A > B).toBe(gt === 1);
    expect(mathOf(p.answer)).toBe(`A${gt === 1 ? ">" : "<"}B`);
  },
  [I("08")]: (p) => {
    const f = p.facts;
    const want = [
      f.k0! + (f.r0! === 0 ? 0 : Math.sqrt(f.r0!)),
      f.k1! + (f.r1! === 0 ? 0 : Math.sqrt(f.r1!)),
      f.k2! + (f.r2! === 0 ? 0 : Math.sqrt(f.r2!)),
    ].sort((x, y) => y - x);
    const parts = mathOf(p.answer).split(">").map(evalRadical);
    expect(parts.length).toBe(3);
    for (let i = 1; i < parts.length; i += 1) {
      expect(parts[i]! < parts[i - 1]!).toBe(true);
    }
    parts.forEach((v, i) => near(v, want[i]!, 1e-9));
  },
  [I("09")]: (p) => {
    const { a2, v3, mult } = p.facts;
    near(v3! / 1000, Math.sqrt(a2! / 100), 0.0005);
    expect(p.content).toContain("표의 근삿값을 그대로 이용하여");
    expect(p.content).toContain("\\approx");
    const b = Number(/\$\\sqrt\{(\d+)\}\$의 근삿값/.exec(p.content)![1]);
    expect(b).toBe(mult === 10 ? a2 : a2! * 100);
    near(Number(mathOf(p.answer)), Math.sqrt(b), mult! * 0.0006);
  },
  [I("10")]: (p) => {
    const { a, b, count } = p.facts;
    let n = 0;
    for (let x = 1; x <= b!; x += 1) {
      if (x > Math.sqrt(a!) && x < Math.sqrt(b!)) n += 1;
    }
    expect(n).toBe(count);
    near(evalRadical(mathOf(p.answer)), count!);
  },

  [C("01")]: (p) => {
    const { p: pp, q, m, n } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      pp! * Math.sqrt(m!) * q! * Math.sqrt(n!),
      1e-9,
    );
  },
  [C("02")]: (p) => {
    const { p: pp, m, q, n } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      (pp! * Math.sqrt(m!)) / (q! * Math.sqrt(n!)),
      1e-9,
    );
  },
  [C("03")]: (p) => {
    near(evalRadical(mathOf(p.answer)), Math.sqrt(p.facts.n!), 1e-9);
  },
  [C("04")]: (p) => {
    const { k, m, n } = p.facts;
    expect(k! * k! * m!).toBe(n);
    near(evalRadical(mathOf(p.answer)), k! * Math.sqrt(m!), 1e-9);
    expect(mathOf(p.answer)).toBe(`\\sqrt{${n}}`);
  },
  [C("05")]: (p) => {
    const { a, v3, mult, b } = p.facts;
    near(v3! / 1000, Math.sqrt(a!), 0.0005);
    expect(mult! * mult! * a!).toBe(b);
    near(Number(mathOf(p.answer)), Math.sqrt(b!), mult! * 0.0006);
  },
  [C("06")]: (p) => {
    const { n, coef, e1, e2 } = p.facts;
    const rad = 2 ** e1! * 3 ** e2!;
    expect(coef! * coef! * rad).toBe(n);
    near(
      coef! * Math.sqrt(2) ** e1! * Math.sqrt(3) ** e2!,
      Math.sqrt(n!),
      1e-9,
    );
    const math = mathOf(p.answer);
    expect(math.includes("a")).toBe(e1 === 1);
    expect(math.includes("b")).toBe(e2 === 1);
  },
  [C("07")]: (p) => {
    const { p: pp, q, m } = p.facts;
    near(evalRadical(mathOf(p.answer)), pp! / (q! * Math.sqrt(m!)), 1e-9);
  },
  [C("08")]: (p) => {
    const { p: pp, a, q, b, r, c } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      (pp! * Math.sqrt(a!) * q! * Math.sqrt(b!)) / (r! * Math.sqrt(c!)),
      1e-9,
    );
  },
  [C("09")]: (p) => {
    const { p: pp, a, q, b, branch } = p.facts;
    const area = pp! * Math.sqrt(a!) * q! * Math.sqrt(b!);
    near(evalRadical(mathOf(p.answer)), branch === 0 ? area : area / 2, 1e-9);
    expect(p.answer.includes("\\mathrm{cm}^2")).toBe(true);
  },
  [C("10")]: (p) => {
    const { p: pp, q, r, m, n } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      pp! * Math.sqrt(m!) + q! * Math.sqrt(n!) - r! * Math.sqrt(m!),
      1e-9,
    );
  },
  [C("11")]: (p) => {
    const { A, B, C: cc } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      Math.sqrt(A!) + Math.sqrt(B!) - Math.sqrt(cc!),
      1e-9,
    );
  },
  [C("12")]: (p) => {
    const { p: pp, q, m, branch } = p.facts;
    const want =
      pp! / Math.sqrt(m!) + (branch === 0 ? 1 : -1) * q! * Math.sqrt(m!);
    near(evalRadical(mathOf(p.answer)), want, 1e-9);
  },
  [C("13")]: (p) => {
    const { c, A, B } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      c! + Math.sqrt(A!) - Math.sqrt(B!),
      1e-9,
    );
  },
  [C("14")]: (p) => {
    const { a, b, c, p: pp } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      Math.sqrt(a!) * (Math.sqrt(b!) + pp! * Math.sqrt(c!)),
      1e-9,
    );
  },
  [C("15")]: (p) => {
    const { a, b, c } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      (Math.sqrt(a!) + Math.sqrt(b!)) / Math.sqrt(c!),
      1e-9,
    );
  },
  [C("16")]: (p) => {
    const { p: pp, a, b, q, c } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      pp! * Math.sqrt(a!) * Math.sqrt(b!) - q! / Math.sqrt(c!),
      1e-9,
    );
  },
  // 답이 조건이므로 **넣어 보고** 유리수가 되는지 본다 — 그리고 옆값은 안 된다.
  [C("17")]: (p) => {
    const { k, p: pp, q, r, a } = p.facts;
    const value = (t: number) =>
      k! * Math.sqrt(pp!) * (q! - Math.sqrt(pp!)) + t * (Math.sqrt(pp!) + r!);
    expect(Number(mathOf(p.answer))).toBe(a);
    near(value(a!), Math.round(value(a!)), 1e-9);
    expect(Math.abs(value(a! + 1) - Math.round(value(a! + 1)))).toBeGreaterThan(
      1e-6,
    );
  },
  [C("18")]: (p) => {
    const { A, B } = p.facts;
    near(
      evalRadical(mathOf(p.answer)),
      2 * (Math.sqrt(A!) + Math.sqrt(B!)),
      1e-9,
    );
    expect(p.answer.includes("\\mathrm{cm}")).toBe(true);
  },
  [C("19")]: (p) => {
    const { p: pp, m, q, n, lt } = p.facts;
    const left = pp! * Math.sqrt(m!);
    const right = q! * Math.sqrt(n!);
    expect(left < right).toBe(lt === 1);
    const parts = mathOf(p.answer)
      .split(lt === 1 ? "<" : ">")
      .map(evalRadical);
    expect(parts.length).toBe(2);
    near(parts[0]!, left, 1e-9);
    near(parts[1]!, right, 1e-9);
  },
  [C("20")]: (p) => {
    const { n, k, m, branch } = p.facts;
    expect(Math.floor(Math.sqrt(n!))).toBe(k);
    const got = evalRadical(mathOf(p.answer));
    if (branch === 0) {
      near(got, Math.sqrt(n!) - Math.floor(Math.sqrt(n!)), 1e-9);
      expect(got > 0 && got < 1).toBe(true);
    } else {
      expect(got).toBe(Math.floor(m! + Math.sqrt(n!)));
    }
  },
};

// ══════════════════════════════════════════════════════════════════

describe("검산 도구가 살아 있다 (제품을 거치지 않고 잰다)", () => {
  // 「살아 있나」를 제품 산출물로 물으면, 제품이 그 결함을 안 내는 순간
  // 구조적으로 0 이 되어 자를 못 잰다(물결 3 에서 두 번 났다). 손으로 적는다.
  it("evalRadical 이 근호·계수·분수·합을 읽는다", () => {
    near(evalRadical("2\\sqrt{3}"), 2 * Math.sqrt(3), 1e-12);
    near(evalRadical("-\\sqrt{5}"), -Math.sqrt(5), 1e-12);
    near(evalRadical("\\dfrac{\\sqrt{6}}{3}"), Math.sqrt(6) / 3, 1e-12);
    near(evalRadical("6-\\sqrt{11}"), 6 - Math.sqrt(11), 1e-12);
    near(
      evalRadical("\\dfrac{20\\sqrt{3}}{3}"),
      (20 * Math.sqrt(3)) / 3,
      1e-12,
    );
    near(evalRadical("-3"), -3, 1e-12);
    near(evalRadical("15.3"), 15.3, 1e-12);
  });

  it("evalRadical 은 모르는 글자를 만나면 던진다 (조용히 0 금지)", () => {
    expect(() => evalRadical("2\\sqrt{3}x")).toThrow();
    expect(() => evalRadical("\\pi")).toThrow();
    expect(() => evalRadical("\\sqrt{3")).toThrow();
  });

  it("근호 정리·유리화 판정기가 일부러 걸리는 입력에서 빨개진다", () => {
    expect(radicands("2\\sqrt{8}+\\sqrt{3}")).toEqual([8, 3]);
    expect(squareFree(8)).toBe(false);
    expect(squareFree(15)).toBe(true);
    expect(fractions("\\dfrac{1}{\\sqrt{3}}")).toEqual([
      { num: "1", den: "\\sqrt{3}" },
    ]);
    expect(fractions("\\dfrac{2\\sqrt{3}}{4}")).toEqual([
      { num: "2\\sqrt{3}", den: "4" },
    ]);
    expect(topLevelTerms("2\\sqrt{3}+5\\sqrt{7}")).toEqual([
      "2\\sqrt{3}",
      "5\\sqrt{7}",
    ]);
  });

  it("유리수·무리수 분류기가 양쪽 대조군에서 갈린다", () => {
    expect(isIrrational("\\sqrt{5}")).toBe(true);
    expect(isIrrational("\\sqrt{16}")).toBe(false);
    expect(isIrrational("-\\sqrt{7}")).toBe(true);
    expect(isIrrational("\\sqrt{0.36}")).toBe(false);
    expect(isIrrational("\\sqrt{0.02}")).toBe(true);
    expect(isIrrational("\\dfrac{3}{4}")).toBe(false);
    expect(isIrrational("\\pi")).toBe(true);
    expect(() => isIrrational("\\log 2")).toThrow();
  });
});

describe("물결 4B — 중3 3-1 앞 세 중단원 48유형", () => {
  it("48유형이 등록돼 있다 (18 · 10 · 20)", () => {
    expect(OWNED.length).toBe(48);
    const byMinor = new Map<string, number>();
    for (const e of OWNED) {
      byMinor.set(e.rpmMinor, (byMinor.get(e.rpmMinor) ?? 0) + 1);
    }
    expect(byMinor).toEqual(
      new Map([
        [MINOR_SQRT, 18],
        [MINOR_IRR, 10],
        [MINOR_CALC, 20],
      ]),
    );
    // 번호가 01..N 으로 빠짐없이 있다 — 「N유형 등록」이 개수만 맞는 것을 막는다.
    for (const [minor, n] of byMinor) {
      const nums = OWNED.filter((e) => e.rpmMinor === minor)
        .map((e) => e.rpmType)
        .sort();
      expect(nums).toEqual(
        Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, "0")),
      );
    }
  });

  it("48유형 전부가 generate.ts 합본에 실려 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of OWNED) {
      expect(keys.has(e.key), `합본에 없는 유형: ${e.key}`).toBe(true);
    }
    const all = registeredTypes().map((e) => e.key);
    expect(new Set(all).size, "key 겹침").toBe(all.length);
  });

  it("RPM 유형 번호·제목·중단원명이 색인 정본과 글자 그대로 같다", () => {
    const catalog = JSON.parse(
      readFileSync(
        path.join(REPO, "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    for (const e of OWNED) {
      const book = catalog[e.rpmBook];
      expect(book, `색인에 없는 책: ${e.rpmBook}`).toBeDefined();
      const hit = book!.types.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `색인에 없는 유형: ${e.key}`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("우리 단원에 실측 이름으로 붙는다 (units.ts 실측 2026-08-24)", () => {
    const count = new Map<string, number>();
    for (const e of OWNED) {
      expect(e.grade).toBe("중3");
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    expect(count).toEqual(
      new Map([
        ["제곱근의 뜻과 성질", 18],
        ["무리수와 실수", 10],
        ["근호를 포함한 식의 계산", 20],
      ]),
    );
  });

  it("근호 정리의 예외는 «근호 안으로 넣기» 한 유형뿐이다", () => {
    // 예외가 늘면 여기서 빨개진다 — 조용히 늘리지 못하게 하는 것이 목적이다.
    expect([...RADICAL_EXEMPT]).toEqual([C("04")]);
    expect(OWNED.some((e) => e.key === C("04"))).toBe(true);
  });

  it("모든 유형에 독립 검산이 붙어 있다 (검산 없는 유형 금지)", () => {
    const missing = OWNED.filter((e) => !CHECK[e.key]).map((e) => e.key);
    expect(missing, `검산식 누락 ${missing.length}개`).toEqual([]);
    expect(Object.keys(CHECK).length).toBe(48);
  });

  for (const e of OWNED) {
    describe(`${e.key} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260824)).toEqual(
          generateMiddleProblem(e.key, 20260824),
        );
      });

      it("씨앗별 독립 검산 — 부동소수·전수 세기로 답을 다시 유도한다", () => {
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 3)) {
            CHECK[e.key]!(p);
          }
        }
      });

      // ㉠ 근호 안이 정리돼 있다
      it("정답의 근호 안에 제곱인수가 없다", () => {
        if (RADICAL_EXEMPT.has(e.key)) return;
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 3)) {
            for (const n of radicands(p.answer)) {
              expect(
                squareFree(n),
                `${e.key} seed ${seed}: 정답 ${p.answer} 의 근호 안 ${n} 에 제곱인수가 있다`,
              ).toBe(true);
              expect(
                n,
                `${e.key}: 근호 안이 1 이면 근호를 쓰면 안 된다`,
              ).toBeGreaterThan(1);
            }
          }
        }
      });

      // ㉡ 분모에 근호가 없고 분수는 기약이다
      it("정답의 분모가 유리화돼 있고 분수가 기약이다", () => {
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 3)) {
            // 날 문자열을 훑는다 — 답이 「점 C와 점 D」처럼 수식이 아닐 수도 있고,
            // 그때도 「분모에 근호」는 없어야 한다(있으면 그것대로 결함이다).
            const math = p.answer;
            expect(
              /\/\s*\\sqrt/.test(math),
              `${e.key}: 나눗셈 기호 뒤에 근호가 남았다 — ${p.answer}`,
            ).toBe(false);
            for (const { num, den } of fractions(math)) {
              expect(
                den.includes("\\sqrt"),
                `${e.key} seed ${seed}: 분모에 근호가 남았다 — ${p.answer}`,
              ).toBe(false);
              const d = Number(den);
              expect(
                Number.isInteger(d) && d > 1,
                `${e.key}: 분모가 정수가 아니거나 1 이다 — ${p.answer}`,
              ).toBe(true);
              const coefs = topLevelTerms(num).map((t) => {
                const m = /^(\d+)/.exec(t.replace(/^[+-]/, ""));
                return m ? Number(m[1]) : 1;
              });
              const g = coefs.reduce((acc, c) => gcd(acc, c), d);
              expect(
                g,
                `${e.key} seed ${seed}: 기약이 아니다 — ${p.answer}`,
              ).toBe(1);
            }
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 3)) {
            expect(bareNumbers(p.content), p.content).toEqual([]);
            expect(bareNumbers(p.answer), p.answer).toEqual([]);
            expect(bareNumbers(p.solution), p.solution).toEqual([]);
            expect(runawayDecimals(p.content), p.content).toEqual([]);
            expect(runawayDecimals(p.answer), p.answer).toEqual([]);
            expect(runawayDecimals(p.solution), p.solution).toEqual([]);
          }
        }
      });

      // D-73: 제품이 가분수를 대분수로 바꾸지 않는다. 우리가 **직접** 대분수를
      // 쓰지도 않는지 본다 — 숫자 바로 뒤에 분수가 붙으면 대분수 모양이다.
      it("대분수 모양(숫자 뒤에 바로 분수)이 없다", () => {
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 3)) {
            for (const s of [p.content, p.answer, p.solution]) {
              expect(
                [...s.matchAll(/\d\\d?frac/g)].map((m) => m[0]),
                s,
              ).toEqual([]);
            }
          }
        }
      });

      it("3문항을 뽑으면 발문이 전부 다르다", () => {
        const set = generateMiddleSet(e.key, 20260824, 3);
        expect(new Set(set.map((p) => p.content)).size).toBe(3);
      });

      it("그림은 싣지 않는다 (numberLine 이 못 그리는 것은 발문으로 냈다)", () => {
        // 보류 사유는 `m3Root.ts` 머리 주석에 적혀 있다. 여기서 «없음»을 못 박아
        // 나중에 그림을 붙일 때 그 주석을 반드시 다시 읽게 한다.
        expect(generateMiddleProblem(e.key, 20260824).figureSpec).toBe(null);
      });
    });
  }

  it("변형 공간을 넘겨 달라고 하면 조용히 모자란 세트를 내지 않고 던진다", () => {
    // 제곱근의 성질 04 는 $k=2..7$ × 두 갈래 = 12 가 상한이다.
    expect(() => generateMiddleSet(S("04"), 20260824, 60)).toThrow(/변형 공간/);
  });

  it("등록되지 않은 유형을 부르면 던진다", () => {
    expect(() => generateMiddleProblem(S("99"), 1)).toThrow(/등록되지 않은/);
  });
});
