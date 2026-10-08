/**
 * ① 중1 «유리수의 곱셈» · «유리수의 나눗셈» 계산 판정 (2026-10-08 엔진 보강 2단계) — 보기 다섯의 진위를 **시험 쪽에서 따로** 잰다.
 *
 * 값을 재는 길이 셋이다(`helpers/texFloat.ts` 머리말). 생성기는 `m1Calc` 의 기약 분수 셈, 등록부의 관문은
 * `texArith.ts`(BigInt 분수 · 교차곱), 이 시험은 **다른 읽개 + 부동소수**다. 까닭 문장도 그 실수를 시험 쪽에서
 * 다시 계산해 «그 값에 대해 참인가»를 본다 — 글을 바꿔 끼우거나(`\div` → `\times`) 찍힌 수를 읽어 따로 센다.
 *
 * ```
 * ㉠ 등록 — 판정키 넷 · 원천 · 난이도는 리터럴로 못 박는다
 * ㉡ 진위 — 씨앗 300 × 물음 둘: «다른 하나»가 정확히 하나 · 정답 번호가 그것 · 등록부의 truths 와 같다
 * ㉢ 꼴 — 왼쪽 식 · 오른쪽 값이 겹치지 않는다 · 분수 인수의 수 · 결과 종류가 같다 · 자릿수가 비슷하다 · 기약
 * ㉣ 같은 유형 — 어댑터가 세운 식이 원천 발문의 식과 글자까지 같다 · 보기의 왼쪽이 그 유형의 꼴이다
 * ㉤ 해설 — 넉 줄 짜임 · 순열을 따라간다 · 풀이 사슬의 걸음이 전부 참값이다 · 까닭이 그 값에 대해 참이다
 * ㉥ 재시도 상한 · 변이(틀린 보기를 참으로)
 * ```
 */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import { generateMiddleProblem } from "@/lib/middle/generate";
import {
  buildTruthBody,
  CALC_STYLE,
  MAX_DRAWS,
  type Material,
} from "@/lib/middle/judge/calcJudge";
import type { JudgeAsk, JudgeDefinition } from "@/lib/middle/judge/contract";
import {
  div2Material,
  drawMul2,
  MUL_DIV_JUDGES,
  mul2Material,
  mulDivMaterial,
  powMaterial,
} from "@/lib/middle/judge/mulDiv";
import {
  assembleJudge,
  createJudgeRegistry,
  generateJudgeProblem,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";
import { m1Rational } from "@/lib/middle/m1Calc";

import {
  floatOf,
  literal,
  MARKS,
  mathOf,
  near,
  readPaper,
} from "../helpers/texFloat";

const { q } = m1Rational;

const KEYS = {
  mul2: "중1|유리수의 곱셈|calc-mul2",
  pow: "중1|유리수의 곱셈|calc-pow",
  div2: "중1|유리수의 나눗셈|calc-div2",
  muldiv: "중1|유리수의 나눗셈|calc-muldiv",
} as const;
type Family = keyof typeof KEYS;
const FAMILIES = Object.keys(KEYS) as Family[];
const SRC: Record<Family, string> = {
  mul2: "1-1|정수와 유리수의 계산|12",
  pow: "1-1|정수와 유리수의 계산|15",
  div2: "1-1|정수와 유리수의 계산|19",
  muldiv: "1-1|정수와 유리수의 계산|20",
};
const SEEDS = 300;
const SEED0 = 20261008;
const STEP = 7919;

// ── 시험 쪽 읽기 ─────────────────────────────────────────────────────────────

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);
const isOdd = (ask: JudgeAsk, t: boolean) => (ask === "옳지 않은 것" ? !t : t);
const val = (v: { n: number; d: number }) => v.n / v.d;

/** 보기 하나 — 왼쪽 식 · 오른쪽에 찍힌 값 · 왼쪽을 시험 셈으로 계산한 값. */
function side(choice: string) {
  const parts = mathOf(choice).split("=");
  if (parts.length !== 2) throw new Error(`등식 하나가 아니다: ${choice}`);
  const right = literal(parts[1]!);
  return {
    left: parts[0]!,
    right,
    shown: val(right),
    value: floatOf(parts[0]!),
  };
}
const truthBy3rdPath = (choice: string) => {
  const s = side(choice);
  return near(s.value, s.shown);
};

/** 부호 붙은 괄호 항 `\left(+\dfrac{2}{3}\right)` 들 — 찍힌 분자 · 분모 그대로. */
const SIGNED = /\\left\(([+-])(?:\\dfrac\{(\d+)\}\{(\d+)\}|(\d+))\\right\)/g;
function signedOperands(left: string) {
  return [...left.matchAll(SIGNED)].map((m) => ({
    n: (m[1] === "-" ? -1 : 1) * Number(m[2] ?? m[4]),
    d: Number(m[3] ?? 1),
  }));
}
/** 거듭제곱의 밑이 분수인 머리 `\left(-\dfrac{2}{3}\right)^{2}`. */
const HEAD = /\\left\((-?)\\dfrac\{(\d+)\}\{(\d+)\}\\right\)\^\{(\d)\}/;
/** 거듭제곱의 밑이 정수인 꼬리 `\left(-3\right)^{3}` · `4^{2}`(식의 끝). */
const TAIL = /\\times(?:\\left\((-\d+)\\right\)|(\d+))\^\{(\d)\}$/;
/** 음수인 밑 — 괄호 안이 `-` 로 시작하는 거듭제곱. */
const NEGATIVE_BASE = /\\left\(-[^()]*\\right\)\^\{/;

const X = "(?:\\d+|\\\\dfrac\\{\\d+\\}\\{\\d+\\})";
const SIGNED_X = `\\\\left\\([+-]${X}\\\\right\\)`;
const FRAC_BASE =
  "\\\\left\\(-?\\\\dfrac\\{\\d+\\}\\{\\d+\\}\\\\right\\)\\^\\{[23]\\}";
/** 원천 유형이 찍는 식의 꼴 — m1Calc 12 · 15 · 19 · 20. */
const SHAPE: Record<Family, RegExp> = {
  mul2: new RegExp(`^${SIGNED_X}\\\\times${SIGNED_X}$`),
  div2: new RegExp(`^${SIGNED_X}\\\\div${SIGNED_X}$`),
  pow: new RegExp(
    `^-?${FRAC_BASE}\\\\times(?:\\\\left\\(-\\d+\\\\right\\)|\\d+)\\^\\{[23]\\}$`,
  ),
  muldiv: new RegExp(
    `^${FRAC_BASE}\\\\times\\\\left\\([+-]\\d+\\\\right\\)\\\\div${SIGNED_X}$`,
  ),
};

/** 같은 꼴의 기준 — 시험 쪽에서 글로 읽는다(분수 인수의 수 · 나누는 수의 종류 · 결과의 종류). */
function shapeOf(family: Family, s: ReturnType<typeof side>): string {
  const kind = s.right.d === 1 ? "정수" : "분수";
  const ops = signedOperands(s.left);
  if (family === "mul2" || family === "div2")
    return `${ops.filter((o) => o.d !== 1).length}/2|${kind}`;
  if (family === "muldiv") return `${ops.at(-1)!.d === 1}|${kind}`;
  return kind;
}

/** 공용 후보의 분모가 나눠야 하는 수 — 그 식에서 «나올 수 있는 분모». 시험 쪽에서 글로 읽어 다시 센다. */
function denominatorBound(family: Family, left: string): number {
  const ops = signedOperands(left);
  if (family === "mul2") return ops[0]!.d * ops[1]!.d;
  if (family === "div2") return ops[0]!.d * Math.abs(ops[1]!.n);
  const head = HEAD.exec(left)!;
  const pow = Number(head[3]) ** Number(head[4]);
  return family === "pow" ? pow : pow * Math.abs(ops.at(-1)!.n);
}

type Kind = "실수" | "부호" | "공용";

/**
 * 까닭 문장이 그 보기의 오른쪽 값에 대해 참인가 — 그 실수를 **시험 쪽에서 다시 계산**한다. 갈래를 돌려준다.
 */
function checkReason(family: Family, choice: string, reason: string): Kind {
  const s = side(choice);
  const at = `${reason} ↔ ${choice}`;
  expect(near(s.value, s.shown), `거짓이라는데 참: ${choice}`).toBe(false);
  const ops = signedOperands(s.left);
  switch (reason) {
    case "결과의 부호를 반대로 씀":
      expect(near(s.shown, -s.value), at).toBe(true);
      // 부호를 틀릴 자리가 있는 식이어야 한다 — 음수가 하나도 없는 식의 결과를 음수로 적은 보기는 빈 보기다.
      expect(
        signedOperands(s.left).some((o) => o.n < 0),
        at,
      ).toBe(true);
      return "부호";
    case "음수의 거듭제곱의 부호를 반대로 정함":
      // 음수인 밑이 있어야 이 까닭이 선다 — 그 거듭제곱 하나의 부호를 뒤집으면 결과의 부호가 뒤집힌다.
      expect(s.left, at).toMatch(NEGATIVE_BASE);
      expect(near(s.shown, -s.value), at).toBe(true);
      return "부호";
    case "거듭제곱 앞의 부호를 빠뜨림":
      // 밑이 모두 양수이고 맨 앞에 `-` 가 있다 — 그것을 떼고 계산한 값이다.
      expect(s.left.startsWith("-"), at).toBe(true);
      expect(s.left, at).not.toMatch(NEGATIVE_BASE);
      expect(near(s.shown, floatOf(s.left.slice(1))), at).toBe(true);
      return "부호";
    case "나누는 수를 역수로 바꾸지 않고 곱함":
      expect(s.left, at).toContain("\\div");
      expect(
        near(s.shown, floatOf(s.left.replace("\\div", "\\times"))),
        at,
      ).toBe(true);
      return "실수";
    case "나누어지는 수의 역수를 곱함": {
      const [a, b] = s.left.split("\\div");
      expect(near(s.shown, floatOf(b!) / floatOf(a!)), at).toBe(true);
      return "실수";
    }
    case "분수의 분자만 거듭제곱함": {
      const head = HEAD.exec(s.left);
      expect(head, at).not.toBeNull();
      const [whole, sign, n, d, e] = head!;
      const wrong = `\\dfrac{\\left(${sign}${n}\\right)^{${e}}}{${d}}`;
      expect(near(s.shown, floatOf(s.left.replace(whole!, wrong))), at).toBe(
        true,
      );
      return "실수";
    }
    case "밑과 지수를 곱함": {
      const tail = TAIL.exec(s.left);
      expect(tail, at).not.toBeNull();
      const base = Number(tail![1] ?? tail![2]);
      const wrong = `\\times\\left(${base * Number(tail![3])}\\right)`;
      expect(near(s.shown, floatOf(s.left.replace(TAIL, wrong))), at).toBe(
        true,
      );
      return "실수";
    }
    case "약분할 때 분자와 분모 가운데 한쪽만 나눔": {
      // 한 수의 분자와 다른 수의 분모의 공약수 g — 한쪽만 나누면 값이 g 배이거나 g 분의 1 이다.
      const [a, b] = ops as [(typeof ops)[0], (typeof ops)[0]];
      const gs = [gcd(a.n, b.d), gcd(b.n, a.d)].filter((g) => g >= 2);
      expect(gs.length, at).toBeGreaterThan(0);
      expect(
        gs.some(
          (g) => near(s.shown, s.value * g) || near(s.shown, s.value / g),
        ),
        at,
      ).toBe(true);
      return "실수";
    }
    case "정수를 분자와 분모에 모두 곱함": {
      // 정수 × 분수 — 값이 그 분수의 절댓값 그대로다(부호는 바르게 정했다).
      const ints = ops.filter((o) => o.d === 1);
      const fracs = ops.filter((o) => o.d !== 1);
      expect([ints.length, fracs.length], at).toEqual([1, 1]);
      expect(Math.abs(ints[0]!.n), at).toBeGreaterThanOrEqual(2);
      expect(
        near(s.shown, Math.sign(s.value) * Math.abs(val(fracs[0]!))),
        at,
      ).toBe(true);
      return "실수";
    }
    case "분모는 곱하지 않고 분자끼리만 곱함": {
      const [a, b] = ops as [(typeof ops)[0], (typeof ops)[0]];
      expect(a.d, at).toBe(b.d);
      expect(a.d, at).toBeGreaterThan(1);
      expect(near(s.shown, (a.n * b.n) / a.d), at).toBe(true);
      return "실수";
    }
    case "계산 결과와 다름":
      // 공용 후보는 실제 실수가 아니다 — 적힌 값의 분모가 그 식에서 «나올 수 있는 분모»의 약수여야 한다.
      expect(
        denominatorBound(family, s.left) % s.right.d,
        `나올 수 없는 분모 ${s.right.d} — ${choice}`,
      ).toBe(0);
      return "공용";
    default:
      throw new Error(`모르는 까닭: ${reason}`);
  }
}

/** 해설을 넉 줄 짜임으로 읽는다(`JudgeBody` 머리말). */
function readSolution(solution: string) {
  const sol = solution.split("\n");
  const values = [...sol[0]!.matchAll(/([①②③④⑤]) \$([^$]+)\$/g)];
  const whyGroups =
    sol.length === 4
      ? sol[2]!
          .replace(/^옳지 않은 까닭: /, "")
          .replace(/\.$/, "")
          .split(", ")
          .map((g) => {
            const [marks, ...rest] = g.split(" ");
            return { marks: marks!.split("·"), why: rest.join(" ") };
          })
      : [];
  return { sol, values, whyGroups };
}

const HOW: Record<Family, string> = {
  mul2: "부호를 정하고 절댓값을 곱하면",
  pow: "거듭제곱을 먼저 계산하면",
  div2: "나누는 수의 역수를 곱하면",
  muldiv: "거듭제곱을 계산하고 역수의 곱셈으로 고치면",
};

const each = (
  family: Family,
  n: number,
  fn: (p: ReturnType<typeof generateJudgeProblem>, s: number) => void,
) => {
  for (let s = 0; s < n; s += 1)
    fn(generateJudgeProblem(KEYS[family], SEED0 + s * STEP, s % 2), s);
};

describe("㉠ 등록 — 곱셈 · 나눗셈 계산 판정 넷", () => {
  it("판정키 · 원천 · 난이도 · 규칙판 (리터럴로 못 박는다)", () => {
    const byKey = new Map(judgementDefinitions().map((d) => [d.key, d]));
    const want: Record<Family, string> = {
      mul2: "기본",
      pow: "응용",
      div2: "기본",
      muldiv: "응용",
    };
    for (const f of FAMILIES)
      expect(byKey.get(KEYS[f]), KEYS[f]).toMatchObject({
        form: "truth",
        asks: ["옳지 않은 것", "옳은 것"],
        difficulty: want[f],
        ruleVersion: 1,
        sources: [SRC[f]],
      });
    expect(MUL_DIV_JUDGES).toHaveLength(4);
  });
});

describe(`㉡ 진위 — 씨앗 ${SEEDS} × 물음 둘 × 판정형 넷, 시험 쪽 셈으로 다시 잰다`, () => {
  for (const f of FAMILIES) {
    it(KEYS[f], () => {
      const asks = new Map<string, number>();
      const answerAt = new Set<string>();
      each(f, SEEDS, (p) => {
        asks.set(p.ask, (asks.get(p.ask) ?? 0) + 1);
        const { lead, choices } = readPaper(p.content);
        expect(choices).toHaveLength(5);
        const truths = choices.map(truthBy3rdPath);
        const odd = truths
          .map((t, i) => (isOdd(p.ask, t) ? i : -1))
          .filter((i) => i >= 0);
        expect(odd, p.content).toHaveLength(1);
        expect(p.answer).toBe(MARKS[odd[0]!]);
        expect(p.truths).toEqual(truths);
        expect(p.form).toBe("truth");
        expect(lead).toBe(
          p.ask === "옳지 않은 것"
            ? "다음 중 계산이 옳지 않은 것은?"
            : "다음 중 계산이 옳은 것은?",
        );
        answerAt.add(p.answer);
      });
      expect(asks.get("옳지 않은 것")).toBe(SEEDS / 2);
      expect(asks.get("옳은 것")).toBe(SEEDS / 2);
      // 보기 순열 — 정답이 다섯 자리에 다 선다.
      expect([...answerAt].sort()).toEqual([...MARKS].sort());
    });
  }

  it("같은 씨앗 · 같은 변형이면 글자까지 같다", () => {
    for (const f of FAMILIES)
      expect(generateJudgeProblem(KEYS[f], 42, 1)).toEqual(
        generateJudgeProblem(KEYS[f], 42, 1),
      );
  });
});

describe("㉢ 꼴 — 모양 단서가 없다", () => {
  for (const f of FAMILIES) {
    it(KEYS[f], () => {
      each(f, 150, (p) => {
        const { choices } = readPaper(p.content);
        const sides = choices.map(side);
        expect(new Set(sides.map((x) => x.left)).size, p.content).toBe(5);
        // 오른쪽 값이 겹치지 않는다 — 계산 판정의 규칙이다(4+1 의 규칙이 아니다).
        expect(
          new Set(sides.map((x) => `${x.right.n}/${x.right.d}`)).size,
          p.content,
        ).toBe(5);
        expect(new Set(sides.map((x) => shapeOf(f, x))).size, p.content).toBe(
          1,
        );
        // 오른쪽 값은 기약이다 — 약분 안 된 값이 «틀린 보기»의 단서가 되지 않게.
        for (const x of sides)
          expect(gcd(x.right.n, x.right.d), p.content).toBe(1);
        // 틀린 값의 자릿수가 참값(해설 첫 줄에 찍힌 기약 값)과 한 자리 넘게 다르지 않다.
        const trues = readSolution(p.solution).values.map((m) =>
          literal(m[2]!),
        );
        const len = (r: { n: number; d: number }) =>
          `${Math.abs(r.n)}${r.d === 1 ? "" : r.d}`.length;
        sides.forEach((x, k) =>
          expect(
            Math.abs(len(trues[k]!) - len(x.right)),
            p.content,
          ).toBeLessThanOrEqual(1),
        );
        // `numericMistakes` 의 `\frac` 이 그대로 새지 않는다 — 다섯 다 `\dfrac` 로 찍힌다.
        expect(p.content + p.solution).not.toMatch(/\\frac/);
      });
    });
  }
});

describe("㉣ 같은 유형 — 어댑터가 세운 식이 원천 유형 발문의 식 그대로다", () => {
  const fromFacts: Record<Family, (f: Record<string, number>) => Material> = {
    mul2: (f) => mul2Material(q(f.an!, f.ad!), q(f.bn!, f.bd!)),
    div2: (f) => div2Material(q(f.an!, f.ad!), q(f.bn!, f.bd!)),
    pow: (f) =>
      powMaterial(
        q(f.b1n!, f.b1d!),
        f.e1!,
        q(f.b2n!, f.b2d!),
        f.e2!,
        f.outerMinus === 1,
      ),
    muldiv: (f) =>
      mulDivMaterial(
        q(f.basen!, f.based!),
        f.e!,
        q(f.mn!, f.md!),
        q(f.vn!, f.vd!),
      ),
  };

  for (const f of FAMILIES) {
    it(`${KEYS[f]} ← ${SRC[f]}`, () => {
      // ⑴ 원천 발문의 식 ↔ 판정형이 그 facts 로 세운 왼쪽 식 — 인수 차례 · 부호 · 지수가 같은가.
      for (let s = 0; s < 150; s += 1) {
        const p = generateMiddleProblem(SRC[f], SEED0 + s * STEP, 0);
        const math = /\$([^$]+)\$/.exec(p.content)![1]!;
        const m = fromFacts[f](p.facts);
        expect(m.left, `원천 ${SRC[f]} 의 발문 식과 다르다`).toBe(math);
        expect(math).toMatch(SHAPE[f]);
        // 세운 식의 값 = 원천의 정답(지면에 찍힌 그것) = 시험 셈.
        const answer = val(literal(mathOf(p.answer)));
        expect(near(val(m.value), answer), math).toBe(true);
        expect(near(floatOf(m.left), answer), math).toBe(true);
      }
      // ⑵ 판정형 문항의 보기 다섯 — 왼쪽 식이 전부 그 유형의 꼴이다.
      each(f, 150, (p) => {
        for (const c of readPaper(p.content).choices)
          expect(side(c).left, p.content).toMatch(SHAPE[f]);
        expect(p.facts.draws).toBeGreaterThanOrEqual(5);
        expect(p.facts.draws).toBeLessThanOrEqual(MAX_DRAWS);
      });
    });
  }
});

describe("㉤ 해설 — 넉 줄 짜임 · 보기 차례를 따라간다 · 까닭이 참이다", () => {
  for (const f of FAMILIES) {
    it(KEYS[f], () => {
      each(f, 200, (p) => {
        const { choices } = readPaper(p.content);
        const { sol, values, whyGroups } = readSolution(p.solution);
        const ai = MARKS.indexOf(p.answer);
        expect(sol).toHaveLength(p.ask === "옳은 것" ? 4 : 3);
        // ⑴ 첫 줄 — 보기 k 의 자리에 보기 k 의 왼쪽을 계산한 값(시험 쪽 셈).
        expect(sol[0]!.startsWith("계산하면 ① "), sol[0]).toBe(true);
        expect(values.map((m) => m[1])).toEqual(MARKS);
        values.forEach((m, k) =>
          expect(
            near(val(literal(m[2]!)), side(choices[k]!).value),
            `${sol[0]} ↔ ${choices[k]}`,
          ).toBe(true),
        );
        // ⑵ 둘째 줄 — 정답 보기의 풀이. 사슬의 걸음마다 그 보기의 참값이다(등호가 거짓이 아니다).
        const answer = side(choices[ai]!);
        expect(sol[1]!.startsWith(`${p.answer} ${HOW[f]} $`), sol[1]).toBe(
          true,
        );
        const chain = /\$([^$]+)\$이므로/.exec(sol[1]!)![1]!.split("=");
        expect(chain.length, sol[1]).toBeGreaterThanOrEqual(2);
        for (const step of chain)
          expect(near(floatOf(step), answer.value), `${step} ↔ ${sol[1]}`).toBe(
            true,
          );
        if (near(answer.value, answer.shown))
          expect(sol[1]!.endsWith("이므로 옳다."), sol[1]).toBe(true);
        else {
          const why = /이므로 옳지 않다\((.+)\)\.$/.exec(sol[1]!)?.[1];
          expect(why, sol[1]).toBeDefined();
          checkReason(f, choices[ai]!, why!);
        }
        // ⑶ «옳은 것» 물음 — 나머지 넷이 전부 «옳지 않은 까닭»에 한 번씩, 까닭은 그 보기에 대해 참이다.
        const listed = whyGroups.flatMap((g) => g.marks).sort();
        const falses = MARKS.filter((_, k) => k !== ai).sort();
        expect(listed, sol.join(" / ")).toEqual(
          p.ask === "옳은 것" ? falses : [],
        );
        for (const g of whyGroups)
          for (const mark of g.marks)
            checkReason(f, choices[MARKS.indexOf(mark)]!, g.why);
        expect(sol.at(-1)).toBe(
          `따라서 계산이 ${p.ask === "옳지 않은 것" ? "옳지 않은" : "옳은"} 것은 ${p.answer}이다.`,
        );
      });
    });
  }

  it("거짓 보기마다 «어디가 틀렸나»가 있고, 부호 반대는 한 문항에 하나까지 · 그 연산의 실수가 다 쓰인다", () => {
    const seen = new Map<Family, Set<string>>();
    for (const f of FAMILIES) {
      const reasons = new Set<string>();
      seen.set(f, reasons);
      each(f, 300, (p) => {
        const { choices } = readPaper(p.content);
        const { sol, whyGroups } = readSolution(p.solution);
        const kinds: Kind[] = [];
        const note = (mark: string, why: string) => {
          reasons.add(why);
          kinds.push(checkReason(f, choices[MARKS.indexOf(mark)]!, why));
        };
        const own = /이므로 옳지 않다\((.+)\)\.$/.exec(sol[1]!)?.[1];
        if (own) note(p.answer, own);
        for (const g of whyGroups)
          for (const mark of g.marks) note(mark, g.why);
        // 거짓 보기 수만큼 까닭이 있다 — «옳지 않은 것» 1 · «옳은 것» 4.
        expect(kinds, p.solution).toHaveLength(
          p.ask === "옳지 않은 것" ? 1 : 4,
        );
        expect(
          kinds.filter((k) => k === "부호").length,
          p.solution,
        ).toBeLessThanOrEqual(1);
      });
    }
    const sorted = (f: Family) => [...seen.get(f)!].sort();
    expect(sorted("mul2")).toEqual(
      [
        "결과의 부호를 반대로 씀",
        "계산 결과와 다름",
        "분모는 곱하지 않고 분자끼리만 곱함",
        "약분할 때 분자와 분모 가운데 한쪽만 나눔",
      ].sort(),
    );
    expect(sorted("div2")).toEqual(
      [
        "결과의 부호를 반대로 씀",
        "계산 결과와 다름",
        "나누는 수를 역수로 바꾸지 않고 곱함",
        "나누어지는 수의 역수를 곱함",
      ].sort(),
    );
    expect(sorted("pow")).toEqual(
      [
        "거듭제곱 앞의 부호를 빠뜨림",
        "계산 결과와 다름",
        "밑과 지수를 곱함",
        "분수의 분자만 거듭제곱함",
        "음수의 거듭제곱의 부호를 반대로 정함",
      ].sort(),
    );
    expect(sorted("muldiv")).toEqual(
      [
        "결과의 부호를 반대로 씀",
        "계산 결과와 다름",
        "나누는 수를 역수로 바꾸지 않고 곱함",
        "분수의 분자만 거듭제곱함",
        "음수의 거듭제곱의 부호를 반대로 정함",
      ].sort(),
    );
  });
});

describe("㉥ 재시도 상한 · 변이", () => {
  it("재료가 늘 같으면 상한에서 사유를 달고 멈춘다", () => {
    const one = drawMul2(createRng(1));
    expect(() =>
      buildTruthBody(createRng(2), "옳지 않은 것", () => one, CALC_STYLE),
    ).toThrow(
      new RegExp(
        `재료 ${MAX_DRAWS}번 뽑기 초과\\(가장 많이 찬 꼴이 1개까지\\)`,
      ),
    );
  });

  it("등록부가 그 사유에 판정키 · 씨앗 · 변형 · 물음을 실어 다시 던진다 — 모자란 문항을 조용히 내지 않는다", () => {
    const one = drawMul2(createRng(1));
    const stuck: JudgeDefinition = {
      ...MUL_DIV_JUDGES[0]!,
      generate: (rng, ask) => buildTruthBody(rng, ask, () => one, CALC_STYLE),
    };
    expect(() =>
      createJudgeRegistry([stuck]).generate(KEYS.mul2, 7, 1),
    ).toThrow(
      /calc-mul2 \(씨앗 7 · v1 · 옳은 것\) 를 못 만들었다 — .*재료 120번 뽑기 초과/,
    );
  });

  it("🔴 변이 — 틀린 보기의 오른쪽을 참값으로 바꾸면 관문이 멈춘다(씨앗 60 × 판정형 넷)", () => {
    for (const def of MUL_DIV_JUDGES) {
      for (let s = 0; s < 60; s += 1) {
        const ask: JudgeAsk = s % 2 === 0 ? "옳지 않은 것" : "옳은 것";
        const body = def.generate(createRng(SEED0 + s), ask);
        const wrong = body.options.findIndex((o) => !o.claimedTrue);
        const o = body.options[wrong]!;
        // 변이가 산출물을 실제로 바꾸는지부터 — 바뀐 글이 원래 글과 다르고, 시험 셈으로 «참»이어야 뜻이 있다.
        const mutated = o.text.replace(/=[^=]+\$$/, `=${mathOf(o.brief)}$`);
        expect(mutated).not.toBe(o.text);
        expect(truthBy3rdPath(o.text)).toBe(false);
        expect(truthBy3rdPath(mutated)).toBe(true);
        const options = body.options.map((x, i) =>
          i === wrong ? { ...x, text: mutated } : x,
        );
        expect(() =>
          assembleJudge(def, ask, { ...body, options }, createRng(s)),
        ).toThrow(/다시 재니/);
      }
    }
  });
});
