/**
 * 중1 **비교형** 여덟 (2026-10-08 엔진 보강 2단계) — «나머지 넷과 다른 하나» 넷 · «가장 큰/작은 것» 넷.
 *
 * 관문 자체(4+1 · 동점 · 순열)는 픽스처로 흔들어 본다(`judgeCompareRegistry.test.ts`). 여기는 **살아 있는 등록**이
 * 내는 지면을 시험 쪽에서 따로 계산한다 — 다른 읽개 + 부동소수(`helpers/texFloat.ts`).
 *
 * 🔴 «값이 같은 보기 금지»는 계산 판정의 규칙이지 4+1 의 규칙이 아니다. 그래서 문형별로 따로 잰다:
 *
 * ```
 * ㉠ 등록 — 판정키 여덟 · 문형 · 물음 · 원천 · 난이도
 * ㉡ 4+1 — 값의 묶음이 정확히 4+1(3+2 · 5+0 은 실패) · 정답이 혼자인 하나
 * ㉢ 극값 — 다섯 값이 서로 다르다(동점 없음) · 정답이 가장 큰(작은) 하나 · 극값 쪽 부호가 둘 이상
 * ㉣ 식의 중복 — 글이 겹치지 않고, 차례 · 부호 표기만 바꾼 «같은 계산»도 없다 · 겉모양이 같다 · 원천의 꼴
 * ㉤ 해설 — 넉 줄 짜임 · 순열을 따라간다 · 사슬의 걸음이 참값 · 셋째 줄(공통값 · 크기 순서)
 * ㉥ 함정 — «다른 하나»가 그 연산의 실수로 계산하면 공통값이 되는 식(절반쯤)
 * ㉦ 재시도 상한 · 역산이 틀리면 던진다 · 변이(4+1 을 3+2 로 · 최댓값 동점)
 * ```
 */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import { generateMiddleProblem } from "@/lib/middle/generate";
import {
  buildExtremeBody,
  buildOddBody,
  COMPARE_JUDGES,
  MAX_ROUNDS,
  powSignPieces,
  type Piece,
} from "@/lib/middle/judge/compare";
import type {
  CompareAsk,
  CompareJudgeDefinition,
} from "@/lib/middle/judge/contract";
import {
  assembleCompare,
  generateJudgeProblem,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";
import { MAX_PER_TEMPLATE } from "@/lib/middle/judge/valueForms";
import { m1Rational } from "@/lib/middle/m1Calc";

import { valueBySlip, valueShape } from "../helpers/judgeValueGrammar";
import {
  envOf,
  floatOf,
  literal,
  MARKS,
  mathOf,
  mathsIn,
  near,
  readPaper,
} from "../helpers/texFloat";

const { q } = m1Rational;

const SEC = {
  덧뺄: "유리수의 덧셈과 뺄셈",
  곱: "유리수의 곱셈",
  나눗: "유리수의 나눗셈",
  식: "문자의 사용과 식의 값",
} as const;
const ODD = {
  addsub: `중1|${SEC.덧뺄}|odd-addsub2`,
  pow: `중1|${SEC.곱}|odd-pow`,
  div: `중1|${SEC.나눗}|odd-div2`,
  value: `중1|${SEC.식}|odd-value`,
} as const;
const EXT = {
  addsub: `중1|${SEC.덧뺄}|max-addsub2`,
  mul: `중1|${SEC.곱}|max-mul2`,
  div: `중1|${SEC.나눗}|max-div2`,
  value: `중1|${SEC.식}|max-value`,
} as const;
const ODD_ASK: CompareAsk = "나머지 넷과 다른 하나";
const SEEDS = 300;
const SEED0 = 20261008;
const STEP = 7919;

// ── 시험 쪽 읽기 ─────────────────────────────────────────────────────────────

/** 지면 한 장 — 보기마다 식 · 시험 셈으로 계산한 값. 대입값은 발문에서 따로 읽는다. */
function paper(content: string) {
  const { lead, choices } = readPaper(content);
  const env = envOf(lead);
  const exprs = choices.map(mathOf);
  for (const e of exprs)
    if (e.includes("=")) throw new Error(`보기가 식이 아니라 등식이다: ${e}`);
  return { lead, env, exprs, values: exprs.map((e) => floatOf(e, env)) };
}

/** 값의 묶음 — 같은 값끼리 자리 목록. 큰 묶음이 앞. */
function groups(values: readonly number[]): number[][] {
  const out: number[][] = [];
  values.forEach((v, i) => {
    const g = out.find((m) => near(values[m[0]!]!, v));
    if (g) g.push(i);
    else out.push([i]);
  });
  return out.sort((a, b) => b.length - a.length);
}
const sizes = (values: readonly number[]) =>
  groups(values).map((g) => g.length);

const SIGNED = /\\left\(([+-])(?:\\dfrac\{(\d+)\}\{(\d+)\}|(\d+))\\right\)/g;
/** 부호 붙은 괄호 항들 — 찍힌 분자 · 분모 그대로. */
function operands(expr: string) {
  return [...expr.matchAll(SIGNED)].map((m) => ({
    n: (m[1] === "-" ? -1 : 1) * Number(m[2] ?? m[4]),
    d: Number(m[3] ?? 1),
  }));
}
const X = "(?:\\d+|\\\\dfrac\\{\\d+\\}\\{\\d+\\})";
const SIGNED_X = `\\\\left\\([+-]${X}\\\\right\\)`;
const TWO = (op: string) => new RegExp(`^${SIGNED_X}${op}${SIGNED_X}$`);
const SHAPE = {
  addsub: TWO("[+-]"),
  mul: TWO("\\\\times"),
  div: TWO("\\\\div"),
};
/** 원천 01 · 03 · 12 · 19 가 쓰는 분모(m1Calc `DENS`). */
const DENS = [2, 3, 4, 5, 6, 8, 10, 12];
const dividesDens = (d: number) => DENS.some((m) => m % d === 0);

type Op = { n: number; d: number };
/**
 * 수가 **원천 유형의 테두리** 안인가 — m1Calc 의 뽑기 그대로(같은 술어를 원천 문항에도 대어 본다).
 *   01 · 03  두 수의 분모가 같은 $m$ 의 약수이고, $m$ 으로 통분한 분자의 절댓값이 48 이하(답 · 첫 수가 24 이하)
 *   12       첫 수는 분수(분모는 `DENS` 의 약수 · 분자 12 이하), 둘째 수는 분자 60 · 분모 40 이하
 *   19       나누는 수는 분수(분모는 `DENS` 의 약수 · 분자 12 이하), 나누어지는 수는 분자 200 · 분모 48 이하
 */
const ENVELOPE: Record<"addsub" | "mul" | "div", (a: Op, b: Op) => boolean> = {
  addsub: (a, b) =>
    DENS.some(
      (m) =>
        m % a.d === 0 &&
        m % b.d === 0 &&
        Math.abs(a.n * (m / a.d)) <= 24 &&
        Math.abs(b.n * (m / b.d)) <= 48,
    ) &&
    (a.d !== 1 || b.d !== 1),
  mul: (a, b) =>
    a.d >= 2 &&
    dividesDens(a.d) &&
    Math.abs(a.n) <= 12 &&
    Math.abs(b.n) <= 60 &&
    b.d <= 40,
  div: (a, b) =>
    b.d >= 2 &&
    dividesDens(b.d) &&
    Math.abs(b.n) <= 12 &&
    Math.abs(a.n) <= 200 &&
    a.d <= 48,
};

const each = (
  key: string,
  n: number,
  fn: (p: ReturnType<typeof generateJudgeProblem>, s: number) => void,
) => {
  for (let s = 0; s < n; s += 1)
    fn(generateJudgeProblem(key, SEED0 + s * STEP, s % 2), s);
};

const CALC_LEAD: Record<CompareAsk, string> = {
  "나머지 넷과 다른 하나": "다음 중 계산 결과가 나머지 넷과 다른 하나는?",
  "가장 큰 것": "다음 중 계산 결과가 가장 큰 것은?",
  "가장 작은 것": "다음 중 계산 결과가 가장 작은 것은?",
};
const VALUE_LEAD: Record<CompareAsk, RegExp> = {
  "나머지 넷과 다른 하나":
    /^\$[xa]=-[234]\$일 때, 다음 중 식의 값이 나머지 넷과 다른 하나는\?$/,
  "가장 큰 것": /^\$[xa]=-[234]\$일 때, 다음 중 식의 값이 가장 큰 것은\?$/,
  "가장 작은 것": /^\$[xa]=-[234]\$일 때, 다음 중 식의 값이 가장 작은 것은\?$/,
};
function expectLead(key: string, ask: CompareAsk, lead: string) {
  if (key.includes(SEC.식)) expect(lead).toMatch(VALUE_LEAD[ask]);
  else expect(lead).toBe(CALC_LEAD[ask]);
}

describe("㉠ 등록 — 비교형 여덟", () => {
  it("판정키 · 문형 · 물음 · 원천 · 난이도 · 규칙판 (리터럴로 못 박는다)", () => {
    const byKey = new Map(judgementDefinitions().map((d) => [d.key, d]));
    const add = ["1-1|정수와 유리수의 계산|01", "1-1|정수와 유리수의 계산|03"];
    const value = [
      "1-1|문자의 사용과 식의 계산|05",
      "1-1|문자의 사용과 식의 계산|06",
    ];
    const odd = ["나머지 넷과 다른 하나"];
    const ext = ["가장 큰 것", "가장 작은 것"];
    const want: [string, readonly string[], readonly string[], string][] = [
      [ODD.addsub, odd, add, "기본"],
      [EXT.addsub, ext, add, "응용"],
      [ODD.pow, odd, ["1-1|정수와 유리수의 계산|15"], "응용"],
      [EXT.mul, ext, ["1-1|정수와 유리수의 계산|12"], "응용"],
      [ODD.div, odd, ["1-1|정수와 유리수의 계산|19"], "기본"],
      [EXT.div, ext, ["1-1|정수와 유리수의 계산|19"], "응용"],
      [ODD.value, odd, value, "응용"],
      [EXT.value, ext, value, "기본"],
    ];
    for (const [key, asks, sources, difficulty] of want)
      expect(byKey.get(key), key).toMatchObject({
        form: "compare",
        asks,
        sources,
        difficulty,
        ruleVersion: 1,
      });
    expect(
      COMPARE_JUDGES.map((d) => `${d.grade}|${d.unitSection}|${d.familyId}`),
    ).toEqual(want.map(([key]) => key));
  });
});

describe(`㉡ 4+1 — 씨앗 ${SEEDS} × 넷: 값의 묶음이 정확히 4+1 이고 정답이 혼자인 하나`, () => {
  for (const key of Object.values(ODD)) {
    it(key, () => {
      const answerAt = new Set<string>();
      each(key, SEEDS, (p) => {
        expect(p.form).toBe("compare");
        expect(p.ask).toBe(ODD_ASK);
        expect(p.truths).toEqual([]);
        const { lead, exprs, values } = paper(p.content);
        expectLead(key, ODD_ASK, lead);
        expect(exprs).toHaveLength(5);
        // 🔴 3+2 · 5+0 · 2+2+1 은 실패다 — 묶음의 크기를 글자 그대로 본다.
        const gs = groups(values);
        expect(
          gs.map((g) => g.length),
          p.content,
        ).toEqual([4, 1]);
        expect(p.answer, p.content).toBe(MARKS[gs[1]![0]!]);
        // 등록부가 다시 잰 값(기약 글)도 같은 값이다.
        p.values.forEach((text, i) => {
          const [n, d] = text.split("/").map(Number);
          expect(near(n! / (d ?? 1), values[i]!), p.content).toBe(true);
        });
        // 생성기가 적은 목표값 · 다른 값이 지면의 그것이다.
        expect(near(p.facts.tn! / p.facts.td!, values[gs[0]![0]!]!)).toBe(true);
        expect(near(p.facts.on! / p.facts.od!, values[gs[1]![0]!]!)).toBe(true);
        answerAt.add(p.answer);
      });
      // 보기 순열 — 정답이 다섯 자리에 다 선다.
      expect([...answerAt].sort()).toEqual([...MARKS].sort());
    });
  }
});

describe(`㉢ 극값 — 씨앗 ${SEEDS} × 물음 둘 × 넷: 다섯 값이 서로 다르고 정답이 가장 큰(작은) 하나`, () => {
  for (const key of Object.values(EXT)) {
    it(key, () => {
      const asks = new Map<string, number>();
      const answerAt = new Set<string>();
      each(key, SEEDS, (p) => {
        asks.set(p.ask, (asks.get(p.ask) ?? 0) + 1);
        const ask = p.ask as CompareAsk;
        const { lead, values } = paper(p.content);
        expectLead(key, ask, lead);
        // 🔴 동점이면 실패다 — 극값이 아닌 자리의 동점도.
        expect(sizes(values), p.content).toEqual([1, 1, 1, 1, 1]);
        const best =
          ask === "가장 큰 것" ? Math.max(...values) : Math.min(...values);
        expect(p.answer, p.content).toBe(MARKS[values.indexOf(best)]);
        // 극값 쪽 부호의 값이 둘 이상 — 양수(음수)가 하나뿐이면 부호만 보고 답이 나온다.
        const side = values.filter((v) =>
          ask === "가장 큰 것" ? v > 0 : v < 0,
        );
        expect(side.length, p.content).toBeGreaterThanOrEqual(2);
        answerAt.add(p.answer);
      });
      expect(asks.get("가장 큰 것")).toBe(SEEDS / 2);
      expect(asks.get("가장 작은 것")).toBe(SEEDS / 2);
      expect([...answerAt].sort()).toEqual([...MARKS].sort());
    });
  }

  it("같은 씨앗 · 같은 변형이면 글자까지 같다", () => {
    for (const key of [...Object.values(ODD), ...Object.values(EXT)])
      expect(generateJudgeProblem(key, 42, 1)).toEqual(
        generateJudgeProblem(key, 42, 1),
      );
  });
});

describe("㉣ 식의 중복 · 겉모양 · 원천의 꼴", () => {
  const cases: [string, "addsub" | "mul" | "div"][] = [
    [ODD.addsub, "addsub"],
    [EXT.addsub, "addsub"],
    [EXT.mul, "mul"],
    [ODD.div, "div"],
    [EXT.div, "div"],
  ];
  for (const [key, kind] of cases) {
    it(`${key} — 두 수의 계산 다섯`, () => {
      each(key, 200, (p) => {
        const { exprs } = paper(p.content);
        // 식이 겹치지 않는다(어느 문형이든).
        expect(new Set(exprs).size, p.content).toBe(5);
        const calc = new Set<string>();
        const looks = new Set<number>();
        for (const e of exprs) {
          expect(e, p.content).toMatch(SHAPE[kind]);
          const [a, b] = operands(e) as [Op, Op];
          expect(ENVELOPE[kind](a, b), `원천의 테두리 밖: ${e}`).toBe(true);
          looks.add([a, b].filter((o) => o.d !== 1).length);
          // «같은 계산» — 뺄셈을 덧셈으로 고친 두 수 · 곱하는 두 수가 같으면 차례 · 표기만 바꾼 식이다.
          const fa = a.n / a.d;
          const fb =
            (kind === "addsub" && /\\right\)-\\left/.test(e) ? -1 : 1) *
            (b.n / b.d);
          const pair =
            kind === "div" ? [fa, fb] : [fa, fb].sort((x, y) => x - y);
          calc.add(pair.map((v) => v.toFixed(9)).join(" & "));
        }
        expect(calc.size, p.content).toBe(5);
        // 겉모양 — 분수 항의 수가 다섯 다 같다.
        expect(looks.size, p.content).toBe(1);
        expect(p.content + p.solution).not.toMatch(/\\frac/);
      });
    });
  }

  it("테두리 술어가 원천 유형 자신에게도 맞는다 — 원천의 수 범위가 바뀌면 여기서 운다", () => {
    const sources: [string, "addsub" | "mul" | "div"][] = [
      ["1-1|정수와 유리수의 계산|01", "addsub"],
      ["1-1|정수와 유리수의 계산|03", "addsub"],
      ["1-1|정수와 유리수의 계산|12", "mul"],
      ["1-1|정수와 유리수의 계산|19", "div"],
    ];
    for (const [src, kind] of sources)
      for (let s = 0; s < 300; s += 1) {
        const p = generateMiddleProblem(src, SEED0 + s * STEP, 0);
        const math = /\$([^$]+)\$/.exec(p.content)![1]!;
        expect(math, src).toMatch(SHAPE[kind]);
        const [a, b] = operands(math) as [Op, Op];
        expect(ENVELOPE[kind](a, b), `${src}: ${math}`).toBe(true);
      }
  });

  it(`${ODD.pow} — 절댓값은 같고 부호만 갈린다(밑 · 지수가 다섯 다 같다)`, () => {
    const seen = new Set<string>();
    each(ODD.pow, 200, (p) => {
      const { exprs, values } = paper(p.content);
      expect(new Set(exprs).size, p.content).toBe(5);
      const abs = Math.abs(values[0]!);
      for (const v of values)
        expect(near(Math.abs(v), abs), p.content).toBe(true);
      // 밑 $a$ 와 지수 $n$ 을 지면에서 읽어, 다섯 식이 그 밑 · 지수의 아홉 꼴 안에 있는지 본다.
      const a = Number(/(\d+)/.exec(exprs[0]!)![1]);
      const n = Math.round(Math.log(abs) / Math.log(a));
      expect(a ** n).toBe(abs);
      const allowed = new Set(powSignPieces(a, n).map((x) => x.tex));
      expect(allowed.size).toBe(9);
      for (const e of exprs) {
        expect(allowed.has(e), `${e} ∉ 밑 ${a} · 지수 ${n} 의 아홉 꼴`).toBe(
          true,
        );
        seen.add(
          e.replace(/\d+(?=\^|\\right|$)/g, "a").replace(/\{\d\}/g, "{n}"),
        );
      }
    });
    // 아홉 꼴이 다 쓰인다(밑 · 지수를 지운 틀로 세어).
    expect(seen.size).toBeGreaterThanOrEqual(9);
  });

  it("거듭제곱의 부호 아홉 꼴 — 값을 시험 쪽 셈으로 다시 잰다(밑 2~5 · 지수 3 · 4)", () => {
    for (const [a, n] of [
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [2, 4],
      [3, 4],
    ] as const) {
      const pieces = powSignPieces(a, n);
      for (const piece of pieces) {
        const v = floatOf(piece.tex);
        expect(near(v, piece.value.n / piece.value.d), piece.tex).toBe(true);
        expect(Math.abs(v), piece.tex).toBe(a ** n);
        // 풀이의 끝 값이 그 식의 값이다.
        expect(floatOf(mathsIn(piece.work).at(-1)!.split("=").at(-1)!)).toBe(v);
      }
      // 양수 · 음수 어느 쪽을 공통값으로 잡아도 «같은 값 넷»이 찬다.
      expect(pieces.filter((x) => x.value.n > 0).length).toBeGreaterThanOrEqual(
        4,
      );
      expect(pieces.filter((x) => x.value.n < 0).length).toBeGreaterThanOrEqual(
        4,
      );
    }
  });

  for (const key of [ODD.value, EXT.value]) {
    it(`${key} — 식의 값 문형의 꼴 · 같은 틀은 둘까지 · 값은 정수`, () => {
      const templates = new Set<string>();
      each(key, 200, (p) => {
        const { lead, exprs, values } = paper(p.content);
        const letter = /^\$([xa])=/.exec(lead)![1]!;
        expect(new Set(exprs).size, p.content).toBe(5);
        const count = new Map<string, number>();
        exprs.forEach((e, i) => {
          const shape = valueShape(e, letter);
          templates.add(shape.template);
          count.set(shape.template, (count.get(shape.template) ?? 0) + 1);
          expect(near(values[i]!, Math.round(values[i]!)), p.content).toBe(
            true,
          );
          // 역산한 상수가 식답게 작다.
          const c = Number(shape.front ?? (shape.back || 0));
          expect(Math.abs(c), e).toBeLessThanOrEqual(30);
        });
        expect(Math.max(...count.values()), p.content).toBeLessThanOrEqual(
          MAX_PER_TEMPLATE,
        );
      });
      expect([...templates].sort()).toEqual(
        ["계수 제곱", "분모", "세제곱", "일차", "제곱"].sort(),
      );
    });
  }
});

describe("㉤ 해설 — 넉 줄 짜임 · 보기 차례를 따라간다", () => {
  for (const key of [...Object.values(ODD), ...Object.values(EXT)]) {
    it(key, () => {
      each(key, 200, (p) => {
        const ask = p.ask as CompareAsk;
        const { lead, values } = paper(p.content);
        const sol = p.solution.split("\n");
        expect(sol, p.solution).toHaveLength(4);
        const ai = MARKS.indexOf(p.answer);
        // ⑴ 첫 줄 — 보기 k 의 자리에 보기 k 의 값(시험 쪽 셈).
        const firsts = [...sol[0]!.matchAll(/([①②③④⑤]) \$([^$]+)\$/g)];
        expect(firsts.map((m) => m[1])).toEqual(MARKS);
        firsts.forEach((m, k) => {
          const v = literal(m[2]!);
          expect(near(v.n / v.d, values[k]!), `${sol[0]} ↔ 보기 ${k + 1}`).toBe(
            true,
          );
        });
        expect(
          sol[0]!.startsWith(key.includes(SEC.식) ? "$" : "계산하면 ① "),
          sol[0],
        ).toBe(true);
        if (key.includes(SEC.식)) expect(sol[0]).toMatch(/[을를] 대입하면 ① /);
        // ⑵ 둘째 줄 — 정답 보기의 계산. 마지막 수식의 걸음마다 그 보기의 값이다.
        expect(sol[1]!.startsWith(`${p.answer} `), sol[1]).toBe(true);
        expect(sol[1]!.endsWith("이다."), sol[1]).toBe(true);
        const last = mathsIn(sol[1]!).at(-1)!;
        for (const step of last.split("="))
          expect(near(floatOf(step), values[ai]!), `${step} ↔ ${sol[1]}`).toBe(
            true,
          );
        // ⑶ 셋째 줄 — 4+1 은 공통값, 극값은 작은 것부터 늘어놓은 다섯 값.
        if (ask === ODD_ASK) {
          const common = /^나머지 넷은 모두 \$([^$]+)\$이다\.$/.exec(sol[2]!);
          expect(common, sol[2]).not.toBeNull();
          const c = literal(common![1]!);
          expect(near(c.n / c.d, values[(ai + 1) % 5]!), sol[2]).toBe(true);
        } else {
          const order = /^크기를 비교하면 \$([^$]+)\$이다\.$/.exec(sol[2]!);
          expect(order, sol[2]).not.toBeNull();
          const listed = order![1]!.split("<").map((t) => {
            const v = literal(t);
            return v.n / v.d;
          });
          expect(listed).toHaveLength(5);
          for (let i = 1; i < 5; i += 1)
            expect(listed[i]!, sol[2]).toBeGreaterThan(listed[i - 1]!);
          const sorted = [...values].sort((x, y) => x - y);
          listed.forEach((v, i) =>
            expect(near(v, sorted[i]!), sol[2]).toBe(true),
          );
        }
        // ⑷ 끝줄 — 발문에서 «다음 중»과 물음표를 뗀 것.
        expect(sol[3]).toBe(
          `따라서 ${lead.replace("다음 중 ", "").replace(/\?$/, "")} ${p.answer}이다.`,
        );
      });
    });
  }
});

describe("㉥ 함정 — «다른 하나»가 그 연산의 실수로 계산하면 공통값이 되는 식", () => {
  /** 그 실수로 계산한 값들 — 하나라도 공통값이면 함정이다. */
  const slips: Record<string, (expr: string, lead: string) => number[]> = {
    [ODD.addsub]: (e) =>
      // 빼는 수의 부호를 안 바꾸고 더함 — 뺄셈일 때만.
      /\\right\)-\\left/.test(e)
        ? [floatOf(e.replace("\\right)-\\left", "\\right)+\\left"))]
        : [],
    [ODD.div]: (e) => [floatOf(e.replace("\\div", "\\times"))],
    [ODD.value]: (e, lead) => {
      const m = /^\$([xa])=(-\d)\$/.exec(lead)!;
      return (["bare", "dropped"] as const)
        .map((slip) => valueBySlip(e, m[1]!, Number(m[2]), slip))
        .filter((v): v is number => v !== null);
    },
  };
  /** 함정의 바닥 — 설계는 절반(나눗셈은 열에 넷). 값이 우연히 겹쳐 버려지는 몫을 뺀 바닥이다. */
  const FLOOR: Record<string, number> = {
    [ODD.addsub]: 0.3,
    [ODD.div]: 0.2,
    [ODD.value]: 0.25,
  };
  for (const key of Object.keys(slips)) {
    it(key, () => {
      let traps = 0;
      each(key, SEEDS, (p) => {
        const { lead, exprs, values } = paper(p.content);
        const ai = MARKS.indexOf(p.answer);
        const common = values[(ai + 1) % 5]!;
        if (slips[key]!(exprs[ai]!, lead).some((v) => near(v, common)))
          traps += 1;
      });
      expect(traps / SEEDS, `함정 ${traps}/${SEEDS}`).toBeGreaterThan(
        FLOOR[key]!,
      );
      // 전부 함정이면 «다른 하나 = 실수하면 같아지는 것»이라는 지름길이 생긴다.
      expect(traps / SEEDS, `함정 ${traps}/${SEEDS}`).toBeLessThan(0.8);
    });
  }
});

describe("㉦ 재시도 상한 · 역산 · 변이", () => {
  const style = { lead: CALC_LEAD[ODD_ASK], briefLead: "계산하면" };
  const piece = (tex: string, value: number): Piece => ({
    tex,
    value: q(value),
    work: `$${value}$`,
    look: "x",
    key: tex,
  });

  it("4+1 — 식을 못 지으면 목표값을 다시 뽑다가 상한에서 사유를 달고 멈춘다", () => {
    let begun = 0;
    expect(() =>
      buildOddBody(createRng(1), style, () => {
        begun += 1;
        return { target: q(3), same: () => null, other: () => null };
      }),
    ).toThrow(new RegExp(`목표값 ${MAX_ROUNDS}번 다시 뽑기 초과`));
    expect(begun).toBe(MAX_ROUNDS);
    // 같은 식만 나와도(넷이 안 찬다) 멈춘다.
    expect(() =>
      buildOddBody(createRng(1), style, () => ({
        target: q(3),
        same: () => piece("1+2", 3),
        other: () => piece("1+3", 4),
      })),
    ).toThrow(/다시 뽑기 초과/);
    // «다른 하나»가 늘 목표값과 같으면(5+0 이 될 뻔) 멈춘다 — 다섯째를 채우지 않는다.
    let i = 0;
    expect(() =>
      buildOddBody(createRng(1), style, () => ({
        target: q(3),
        same: () => piece(`${(i += 1)}+0`, 3),
        other: () => piece(`0+${(i += 1)}`, 3),
      })),
    ).toThrow(/다시 뽑기 초과/);
  });

  it("4+1 — 역산이 틀리면(값이 목표값과 다르면) 조용히 넘기지 않고 던진다", () => {
    expect(() =>
      buildOddBody(createRng(1), style, () => ({
        target: q(3),
        same: () => piece("2+2", 4),
        other: () => null,
      })),
    ).toThrow(/역산한 식의 값\(4\)이 목표값\(3\)과 다르다/);
  });

  it("극값 — 값이 늘 겹치면(동점) 상한에서 멈춘다 · 극값 쪽 부호가 하나뿐이어도 멈춘다", () => {
    const ext = { lead: CALC_LEAD["가장 큰 것"], briefLead: "계산하면" };
    let i = 0;
    expect(() =>
      buildExtremeBody(
        createRng(1),
        "가장 큰 것",
        ext,
        () => () => piece(`${(i += 1)}+0`, 7),
      ),
    ).toThrow(new RegExp(`${MAX_ROUNDS}번 다시 뽑기 초과`));
    // 양수가 하나뿐인 다섯 값 — «가장 큰 것»은 부호만 보고 나온다.
    const fixed = [5, -1, -2, -3, -4];
    let j = 0;
    expect(() =>
      buildExtremeBody(createRng(1), "가장 큰 것", ext, () => () => {
        const v = fixed[j % 5]!;
        j += 1;
        return piece(`${v}+0\\times ${j}`, v);
      }),
    ).toThrow(/다시 뽑기 초과/);
    // 같은 다섯 값이라도 «가장 작은 것»이면 음수가 넷이라 지나간다.
    j = 0;
    expect(
      buildExtremeBody(createRng(1), "가장 작은 것", ext, () => () => {
        const v = fixed[j % 5]!;
        j += 1;
        return piece(`${v}+0\\times ${j}`, v);
      }).options,
    ).toHaveLength(5);
  });

  const live = (key: string) =>
    COMPARE_JUDGES.find(
      (d) => `${d.grade}|${d.unitSection}|${d.familyId}` === key,
    ) as CompareJudgeDefinition;

  it("🔴 변이 — 4+1 을 3+2 로 바꾸면 관문이 멈춘다(씨앗 40 × 넷)", () => {
    for (const key of Object.values(ODD)) {
      const def = live(key);
      for (let s = 0; s < 40; s += 1) {
        const body = def.generate(createRng(SEED0 + s), ODD_ASK);
        const env = envOf(body.lead);
        const value = (text: string) => floatOf(mathOf(text), env);
        // 생성기 산출의 첫째가 «다른 하나»다 — 둘째 보기를 «다른 하나와 값이 같은 다른 식»으로 바꾼다.
        const odd = body.options[0]!;
        const twin = `$${mathOf(odd.text)}\\times 1$`;
        expect(twin).not.toBe(odd.text);
        // 변이가 산출물을 실제로 바꾸는지 — 시험 셈으로 4+1 → 3+2.
        expect(sizes(body.options.map((o) => value(o.text)))).toEqual([4, 1]);
        const texts = body.options.map((o, i) => (i === 1 ? twin : o.text));
        expect(sizes(texts.map(value))).toEqual([3, 2]);
        // ⑴ 주장까지 3+2 — 지면을 짓기 전에 멈춘다.
        const claimed = body.options.map((o, i) =>
          i === 1
            ? { ...o, text: twin, claimed: odd.claimed, brief: odd.brief }
            : o,
        );
        expect(() =>
          assembleCompare(
            def,
            ODD_ASK,
            { ...body, options: claimed },
            createRng(s),
          ),
        ).toThrow(/생성기가 주장한 값의 묶음이 3\+2/);
        // ⑵ 주장은 4+1 그대로인데 지면만 3+2 — 다시 재서 멈춘다.
        const printed = body.options.map((o, i) =>
          i === 1 ? { ...o, text: twin } : o,
        );
        expect(() =>
          assembleCompare(
            def,
            ODD_ASK,
            { ...body, options: printed },
            createRng(s),
          ),
        ).toThrow(/다시 재니/);
      }
    }
  });

  it("🔴 변이 — 5+0(다른 하나를 공통값으로) 도 멈춘다", () => {
    for (const key of Object.values(ODD)) {
      const def = live(key);
      for (let s = 0; s < 20; s += 1) {
        const body = def.generate(createRng(SEED0 + s), ODD_ASK);
        const same = body.options[1]!;
        const twin = `$${mathOf(same.text)}\\times 1$`;
        const options = body.options.map((o, i) =>
          i === 0
            ? { ...o, text: twin, claimed: same.claimed, brief: same.brief }
            : o,
        );
        expect(() =>
          assembleCompare(def, ODD_ASK, { ...body, options }, createRng(s)),
        ).toThrow(/5\+0/);
      }
    }
  });

  it("🔴 변이 — 최댓값(최솟값) 동점을 넣으면 관문이 멈춘다(씨앗 40 × 넷)", () => {
    for (const key of Object.values(EXT)) {
      const def = live(key);
      for (let s = 0; s < 40; s += 1) {
        const ask: CompareAsk = s % 2 === 0 ? "가장 큰 것" : "가장 작은 것";
        const body = def.generate(createRng(SEED0 + s), ask);
        const env = envOf(body.lead);
        const values = body.options.map((o) => floatOf(mathOf(o.text), env));
        expect(sizes(values)).toEqual([1, 1, 1, 1, 1]);
        const best = values.indexOf(
          ask === "가장 큰 것" ? Math.max(...values) : Math.min(...values),
        );
        const at = (best + 1) % 5;
        const top = body.options[best]!;
        const twin = `$${mathOf(top.text)}\\times 1$`;
        // 변이가 산출물을 실제로 바꾸는지 — 극값이 둘이 된다.
        const mutated = body.options.map((o, i) => (i === at ? twin : o.text));
        expect(sizes(mutated.map((t) => floatOf(mathOf(t), env)))).toEqual([
          2, 1, 1, 1,
        ]);
        const claimed = body.options.map((o, i) =>
          i === at
            ? { ...o, text: twin, claimed: top.claimed, brief: top.brief }
            : o,
        );
        expect(() =>
          assembleCompare(
            def,
            ask,
            { ...body, options: claimed },
            createRng(s),
          ),
        ).toThrow(/동점/);
        const printed = body.options.map((o, i) =>
          i === at ? { ...o, text: twin } : o,
        );
        expect(() =>
          assembleCompare(
            def,
            ask,
            { ...body, options: printed },
            createRng(s),
          ),
        ).toThrow(/다시 재니/);
      }
    }
  });
});
