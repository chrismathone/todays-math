/**
 * Textbook T1 calculation extensions, not RPM provenance. A dedicated source
 * (textbook-20261125) uses the historical rpm* fields for interface compatibility.
 * The namespace preserves every pre-T1 key's
 * RNG stream. Eight mathematical families share exact expressions; the seed
 * selects numbers, notation, signs, shape and one to six ordered subquestions.
 * No source sentences/numbers are used as generation inputs.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { attempt, defType } from "./m1Shared";
import { evaluate, q, render, texQ, type Expr } from "./textbookArithmetic";
import type { TypeEntry } from "./types";

const val = (n: number, d = 1): Expr => ({ kind: "value", value: q(n, d) });
const bin = (
  kind: "add" | "sub" | "mul" | "div",
  left: Expr,
  right: Expr,
): Expr => ({ kind, left, right });
const pow = (base: Expr, exponent: number): Expr => ({
  kind: "pow",
  base,
  exponent,
});
const nz = (rng: Rng, bound = 9) =>
  pick(rng, [-1, 1]) * intBetween(rng, 1, bound);
function number(rng: Rng, allowZero = false): Expr {
  const mode = intBetween(rng, 0, 3);
  const d =
    mode === 0
      ? 1
      : mode === 1
        ? pick(rng, [2, 4, 5, 8, 10])
        : pick(rng, [2, 3, 4, 5, 6, 8, 12]);
  const v = q(allowZero && rng() < 0.1 ? 0 : nz(rng, 12), d);
  return {
    kind: "value",
    value: v,
    notation: mode === 1 ? "decimal" : mode === 3 ? "mixed" : "fraction",
    signed: rng() < 0.35,
  };
}
function chain(rng: Rng, kind: "add" | "mul" | "div"): Expr {
  const count = intBetween(rng, 2, kind === "add" ? 5 : kind === "mul" ? 4 : 3);
  let e = number(rng, kind === "mul" || kind === "div");
  let hasDivision = false;
  for (let i = 1; i < count; i++) {
    const op: "add" | "sub" | "mul" | "div" =
      kind === "add"
        ? pick(rng, ["add", "sub"] as const)
        : kind === "div"
          ? i === count - 1 && !hasDivision
            ? "div"
            : pick(rng, ["mul", "div"] as const)
          : kind;
    hasDivision ||= op === "div";
    e = bin(op, e, number(rng, kind === "mul"));
  }
  return e;
}
function powered(rng: Rng): Expr {
  const base = rng() < 0.2 ? val(-1) : number(rng);
  const e = pow(
    base,
    base.kind === "value" && base.value.n === -1 && base.value.d === 1
      ? pick(rng, [2, 3, 4, 5, 6, 7, 8, 21, 50, 99, 100])
      : intBetween(rng, 2, 4),
  );
  return rng() < 0.2 ? { kind: "neg", child: e } : e;
}
function powerProduct(rng: Rng): Expr {
  let e = powered(rng);
  const count = intBetween(rng, 1, 3);
  for (let i = 1; i < count; i++)
    e = bin("mul", e, rng() < 0.35 ? powered(rng) : number(rng));
  return e;
}
function distributive(rng: Rng): Expr {
  const coefficient = rng() < 0.25 ? powered(rng) : number(rng);
  const a = number(rng),
    b = number(rng),
    op = pick(rng, ["add", "sub"] as const);
  return rng() < 0.5
    ? bin("mul", coefficient, bin(op, a, b))
    : bin(op, bin("mul", coefficient, a), bin("mul", coefficient, b));
}
function mixed(rng: Rng): Expr {
  const a = number(rng),
    b = number(rng),
    c = number(rng),
    d = number(rng);
  switch (intBetween(rng, 0, 5)) {
    case 0:
      return bin("add", bin("div", bin("add", a, b), c), d);
    case 1:
      return bin("sub", a, bin("mul", bin("div", b, c), powered(rng)));
    case 2:
      return bin(
        "add",
        bin("mul", bin("sub", a, b), c),
        bin("div", number(rng), d),
      );
    case 3:
      return bin(
        "add",
        bin("sub", a, bin("mul", b, c)),
        bin("div", d, number(rng)),
      );
    case 4:
      return bin(
        "sub",
        bin("mul", a, bin("add", b, c)),
        bin("div", d, number(rng)),
      );
    default:
      return bin(
        "sub",
        bin("mul", bin("div", a, b), c),
        bin("mul", d, number(rng)),
      );
  }
}
function paritySum(rng: Rng): Expr {
  const count = intBetween(rng, 2, 6),
    start = intBetween(rng, 1, 3);
  const weighted = rng() < 0.5;
  const scale = intBetween(rng, 1, 9);
  const term = (i: number) => {
    const e = pow(val(-1), weighted ? start + i : intBetween(rng, 2, 120));
    return weighted ? bin("mul", e, val(scale * (start + i))) : e;
  };
  let e = term(0);
  for (let i = 1; i < count; i++)
    e = bin(weighted ? "add" : pick(rng, ["add", "sub"] as const), e, term(i));
  return e;
}
const families = [
  {
    id: "C01",
    title: "부호·소수·분수를 섞은 덧셈과 뺄셈",
    section: "유리수의 덧셈과 뺄셈",
    level: "기본",
    build: (rng: Rng) => chain(rng, "add"),
    rule: "뺄셈은 빼는 수의 부호를 바꾸어 더한다. 분수는 통분하여 계산한다.",
  },
  {
    id: "C02",
    title: "부호·소수·분수를 섞은 곱셈",
    section: "유리수의 곱셈",
    level: "기본",
    build: (rng: Rng) => chain(rng, "mul"),
    rule: "소수와 대분수는 분수로 바꾼다. 곱셈의 교환법칙과 결합법칙으로 부호와 분자·분모를 모아 약분하여 계산한다.",
  },
  {
    id: "C03",
    title: "부호와 괄호를 구별하는 거듭제곱 계산",
    section: "유리수의 곱셈",
    level: "응용",
    build: powerProduct,
    rule: "거듭제곱을 먼저 계산한다. 괄호 밖의 음의 부호는 거듭제곱 뒤에 적용한다.",
  },
  {
    id: "C04",
    title: "분배법칙으로 묶거나 펼치는 유리수 계산",
    section: "유리수의 곱셈",
    level: "응용",
    build: distributive,
    rule: "거듭제곱과 괄호 안을 먼저 계산하거나, 분배법칙으로 공통인 수를 묶어 계산한다.",
  },
  {
    id: "C05",
    title: "소수·분수의 나눗셈과 곱셈",
    section: "유리수의 나눗셈",
    level: "기본",
    build: (rng: Rng) => chain(rng, "div"),
    rule: "나누는 수의 역수를 곱한다. 곱셈과 나눗셈만 있으면 왼쪽부터 계산한다.",
  },
  {
    id: "C06",
    title: "거듭제곱을 포함한 곱셈과 나눗셈",
    section: "유리수의 나눗셈",
    level: "응용",
    build: (rng: Rng) =>
      bin(
        "div",
        bin("mul", number(rng), powered(rng)),
        rng() < 0.5 ? powered(rng) : number(rng),
      ),
    rule: "거듭제곱을 먼저 계산하고, 나눗셈을 역수의 곱셈으로 바꾸어 왼쪽부터 계산한다.",
  },
  {
    id: "C07",
    title: "괄호와 계산 순서를 따르는 유리수 혼합 계산",
    section: "유리수의 나눗셈",
    level: "응용",
    build: mixed,
    rule: "괄호와 거듭제곱을 먼저 계산하고, 곱셈·나눗셈 뒤에 덧셈·뺄셈을 한다.",
  },
  {
    id: "C08",
    title: "음의 일의 거듭제곱을 포함한 합과 차",
    section: "유리수의 곱셈",
    level: "응용",
    build: paritySum,
    rule: "$(-1)$의 거듭제곱은 지수가 짝수이면 $1$, 홀수이면 $-1$이다. 각 항의 값을 구하여 더하거나 뺀다.",
  },
] as const;

export const M1_TEXTBOOK_CALC: TypeEntry[] = families.map((f) =>
  defType(
    "textbook-20261125",
    "교과서 수와 연산",
    f.id,
    f.title,
    f.section,
    f.level,
    (rng) => {
      const count = pick(rng, [1, 1, 2, 3, 4, 6]);
      const expressions = Array.from({ length: count }, () =>
        attempt(600, () => {
          const e = f.build(rng);
          const v = evaluate(e);
          return Math.abs(v.n) <= 2000 && v.d <= 240 ? e : null;
        }),
      );
      const prefix = (i: number) => (count === 1 ? "" : `(${i + 1}) `);
      const facts: Record<string, number> = { count };
      const solution = expressions.map((e, i) => {
        const answer = evaluate(e);
        facts[`n${i}`] = answer.n;
        facts[`d${i}`] = answer.d;
        // Keep steps short enough for the existing text-only problem layout.
        const step =
          e.kind === "value"
            ? e
            : e.kind === "neg"
              ? ({
                  ...e,
                  child: val(evaluate(e.child).n, evaluate(e.child).d),
                } as Expr)
              : e.kind === "pow"
                ? ({
                    ...e,
                    base: val(evaluate(e.base).n, evaluate(e.base).d),
                  } as Expr)
                : ({
                    ...e,
                    left: { kind: "value", value: evaluate(e.left) },
                    right: { kind: "value", value: evaluate(e.right) },
                  } as Expr);
        const simple = render(step),
          original = render(e),
          final = texQ(answer);
        return `${prefix(i)}$${original}${simple !== original && simple !== final ? `=${simple}` : ""}=${final}$`;
      });
      return {
        content: `다음을 계산하시오.\n${expressions.map((e, i) => `${prefix(i)}$${render(e)}$`).join("\n")}`,
        answer: expressions
          .map((e, i) => `${prefix(i)}$${texQ(evaluate(e))}$`)
          .join("\n"),
        solution: `${f.rule}\n${solution.join("\n")}`,
        facts,
      };
    },
  ),
);
