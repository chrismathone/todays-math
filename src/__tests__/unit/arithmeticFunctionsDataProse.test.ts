import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import katex from "katex";
import { describe, it } from "vitest";
import { FUNCTIONS_DATA_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/functionsData";
import { tokenizeMath } from "../../lib/math/segments";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
function fraction(n: number, d = 1): string {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n /= g;
  d /= g;
  return d === 1
    ? String(n || 0)
    : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`;
}
// A ±1 coefficient is never printed as a digit (owner, 2026-10-16: «y=1x»).
const coef = (n: number, variable: string) =>
  n === 1 ? variable : n === -1 ? `-${variable}` : `${n}${variable}`;
function expression(...coefficients: number[]): string {
  let s = "";
  coefficients.forEach((c, i) => {
    if (!c) return;
    const power = coefficients.length - i - 1;
    s +=
      (c < 0 ? "-" : s ? "+" : "") +
      (power && Math.abs(c) === 1 ? "" : Math.abs(c)) +
      (power === 2 ? "x^{2}" : power === 1 ? "x" : "");
  });
  return `y=${s || "0"}`;
}
const pair = (x: number, y: number) => `(${x}, ${y})`;
const list = (...xs: (number | string)[]) => xs.join(", ");
/** Independently authored expected mathematical givens for every family, not a
 * call to its view, solver, formatter, or candidate verifier. */
function expectedGivens(id: string, p: number[]): string[] {
  const [a, b, c, d, e] = p;
  if (id.startsWith("m1-fd-reflect-"))
    return [
      `P${pair(a, b)}`,
      ...(id.includes("origin") ? [] : [id.includes("reflect-x-") ? "x" : "y"]),
      "Q",
    ];
  if (id.startsWith("m1-fd-distance-")) return [`P${pair(a, b)}`];
  if (id === "m1-fd-horizontal-distance")
    return [`A${pair(a, c)}`, `B${pair(a + b, c)}`];
  if (id === "m1-fd-vertical-distance")
    return [`A${pair(c, a)}`, `B${pair(c, a + b)}`];
  if (/^m1-fd-(direct|inverse)-/.test(id)) {
    const inverse = id.includes("inverse"),
      y = inverse ? fraction(a, b * c) : fraction(a * c, b);
    if (id.endsWith("constant"))
      return [inverse ? "y=\\frac{a}{x}" : "y=ax", `x=${c}`, `y=${y}`];
    return [
      inverse
        ? `y=\\frac{${a}}{${b === 1 ? "x" : `${b}x`}}`
        : `y=${{ "1": "", "-1": "-" }[fraction(a, b)] ?? fraction(a, b)}x`,
      id.endsWith("input") ? `y=${y}` : `x=${c}`,
    ];
  }
  if (id === "m2-fd-linear-translation")
    return [expression(a, b), "x", String(c), "y", String(d)];
  if (id.startsWith("m2-fd-linear-"))
    return id.endsWith("value")
      ? [expression(a, b), `x=${c}`]
      : id.endsWith("input")
        ? [expression(a, b), `y=${a * c + b}`]
        : [
            id.endsWith("coefficient")
              ? `y=kx${b < 0 ? b : `+${b}`}`
              : `y=${coef(a, "x")}+k`,
            pair(c, a * c + b),
          ];
  if (id.startsWith("m2-fd-two-points-"))
    return [pair(a, b), pair(a + c, b + d)];
  if (id.startsWith("m2-fd-change-"))
    return id.endsWith("slope")
      ? ["x", String(b), "y", String(a * b)]
      : [
          String(a),
          id.endsWith("y-change") ? "x" : "y",
          String(id.endsWith("y-change") ? b : a * b),
        ];
  if (id === "m2-fd-x-intercept" || id === "m2-fd-y-intercept")
    return [expression(a, b)];
  if (id === "m2-fd-slope-point-equation")
    return [String(a), pair(c, a * c + b)];
  if (id === "m2-fd-intercepts-equation")
    return ["x", String(a), "y", String(b)];
  if (id === "m2-fd-parallel-coefficient")
    return [expression(a, b), `y=kx${c < 0 ? c : `+${c}`}`];
  if (id.startsWith("m2-fd-implicit-"))
    return [`${coef(a, "x")}+${coef(b, "y")}=${c}`];
  if (id.startsWith("m2-fd-intersection-"))
    return [expression(a, c), expression(b, d)];
  if (id === "m3-fd-quadratic-coefficient")
    return [pair(b, c), pair(b + d, a * d * d + c), "a"];
  if (
    id === "m3-fd-quadratic-vertex-value" ||
    id.startsWith("m3-fd-quadratic-expand-")
  )
    return [
      `y=${a}(x${b < 0 ? `+${-b}` : `-${b}`})^{2}${c < 0 ? c : `+${c}`}`,
      id.endsWith("vertex-value") ? `x=${b + d}` : "y=ax^{2}+bx+c",
    ];
  if (id.startsWith("m3-fd-quadratic-integer-root-"))
    return [expression(a, -a * (b + c), a * b * c), "x"];
  if (id.startsWith("m3-fd-quadratic-radical-root-"))
    return [expression(a, 0, -a * b), "x"];
  if (id === "m3-fd-quadratic-tangent-root")
    return [expression(a, -2 * a * b, a * b * b), "x"];
  if (id === "m3-fd-quadratic-translation")
    return [expression(a, b, c), "x", String(d), "y", String(e)];
  if (id.startsWith("m3-fd-quadratic-"))
    return [
      expression(a, b, c),
      ...(id.includes("vertex-form")
        ? ["y=a(x-p)^{2}+q"]
        : id.endsWith("value")
          ? [`x=${d}`]
          : []),
    ];
  if (id.includes("-data-")) {
    if (id.endsWith("even-median"))
      return [list(a + 2 * b + c, a, a + 3 * b + c, a + b)];
    if (id.endsWith("mode")) return [list(a + b, a, a + 2 * b, a, a)];
    if (id.endsWith("missing-mean"))
      return [
        list(a, a + b, "x", a + 3 * b, a + 4 * b),
        fraction(5 * a + 10 * b + c, 5),
      ];
    return [list(a + 3 * b, a, a + 4 * b + c, a + b, a + 2 * b)];
  }
  if (id.startsWith("m1-fd-frequency-"))
    return [
      "0, 1, 2",
      list(a, id.endsWith("missing") ? "x" : b, c),
      ...(id.endsWith("missing") ? [String(a + b + c)] : []),
    ];
  if (id.startsWith("m1-fd-relative-inverse-"))
    return [fraction(b, a), String(id.endsWith("count") ? a : b)];
  if (id === "m1-fd-class-midpoint") return [String(5 * a), String(5 * a + b)];
  if (id === "m1-fd-discrete-frequency-mean")
    return [list(a, a + b, a + 2 * b), list(c, d, e)];
  if (id === "m1-fd-stem-leaf-median") return [String(a), list(b, c, d), "10"];
  if (id === "m3-fd-missing-deviation") return [list(-b, -c, b, "x")];
  if (id.startsWith("m3-fd-transformed-"))
    return [
      "x_1, \\ldots, x_n",
      String(a),
      String(b),
      "x_i",
      `${coef(c, "x_i")}${d < 0 ? d : `+${d}`}`,
    ];
  if (
    ["m3-fd-deviation", "m3-fd-variance", "m3-fd-standard-deviation"].includes(
      id,
    )
  )
    return [list(a - b, a - c, a + b, a + c)];
  if (id === "m2-fd-count-addition" || id === "m2-fd-count-product")
    return [String(a), String(b)];
  if (id === "m2-fd-count-seating")
    return [String(a), String(b), "1", String(b), String(b)];
  if (id === "m2-fd-count-pair" || id.startsWith("m2-fd-coin-"))
    return [String(a)];
  if (id.startsWith("m2-fd-count-digits-"))
    return [
      id.endsWith("nonzero") ? "1" : "0",
      String(id.endsWith("nonzero") ? a : a - 1),
      String(a),
      String(b),
      String(b),
    ];
  if (id.includes("-die-") || id.includes("-dice-")) return ["1", "6"];
  if (id.startsWith("m2-fd-card-")) return ["1", String(a), String(a)];
  if (id.startsWith("m2-fd-balls-")) return [String(a), String(b)];
  if (id === "m2-fd-independent-different-bags")
    return ["A", String(a), String(b), "B", String(c), String(d)];
  assert.fail(`Missing prose oracle ${id}`);
}

function expectedRequestedMath(id: string, p: number[]): string[] {
  const [a, b, c] = p;
  if (id.startsWith("m1-fd-reflect-"))
    return ["Q", id.endsWith("-x") ? "x" : "y"];
  if (id.startsWith("m1-fd-distance-"))
    return ["P", id.includes("distance-x") ? "x" : "y"];
  if (/^m1-fd-(direct|inverse)-/.test(id))
    return [id.endsWith("constant") ? "a" : id.endsWith("value") ? "y" : "x"];
  if (
    id === "m2-fd-linear-translation" ||
    id === "m2-fd-two-points-equation" ||
    id === "m2-fd-slope-point-equation" ||
    id === "m2-fd-intercepts-equation"
  )
    return ["y=ax+b"];
  if (id.startsWith("m2-fd-linear-"))
    return [id.endsWith("value") ? "y" : id.endsWith("input") ? "x" : "k"];
  if (id.startsWith("m2-fd-change-") && !id.endsWith("slope"))
    return [id.endsWith("y-change") ? "y" : "x"];
  if (id === "m2-fd-x-intercept" || id === "m2-fd-y-intercept")
    return [id.includes("fd-x-") ? "x" : "y"];
  if (id === "m2-fd-parallel-coefficient") return ["k"];
  if (id.startsWith("m2-fd-implicit-") && !id.endsWith("slope"))
    return [id.endsWith("x-intercept") ? "x" : "y"];
  if (id.startsWith("m2-fd-intersection-"))
    return [id.endsWith("x") ? "x" : "y"];
  if (id === "m3-fd-quadratic-axis") return ["x=t", "t"];
  if (
    id === "m3-fd-quadratic-extreme" ||
    id.includes("quadratic-integer-root") ||
    id.includes("quadratic-radical-root") ||
    id === "m3-fd-quadratic-tangent-root"
  )
    return ["x"];
  if (id === "m3-fd-quadratic-vertex-x") return ["x"];
  if (
    [
      "m3-fd-quadratic-vertex-y",
      "m3-fd-quadratic-y-intercept",
      "m3-fd-quadratic-value",
      "m3-fd-quadratic-vertex-value",
    ].includes(id)
  )
    return ["y"];
  if (id.includes("quadratic-vertex-form-"))
    return [id.endsWith("p") ? "p" : "q"];
  if (id === "m3-fd-quadratic-coefficient") return ["a"];
  if (id === "m3-fd-quadratic-expand-b" || id === "m3-fd-quadratic-expand-c")
    return [id.endsWith("b") ? "b" : "c"];
  if (id === "m3-fd-quadratic-translation") return ["y=ax^{2}+bx+c"];
  if (
    id.endsWith("data-missing-mean") ||
    id === "m3-fd-missing-deviation" ||
    id === "m1-fd-frequency-missing"
  )
    return ["x"];
  if (id === "m3-fd-data-deviation") return [String(a + 3 * b)];
  if (id === "m3-fd-deviation") return [String(a - b)];
  if (id === "m1-fd-frequency-percent") return ["1", "\\%"];
  if (id === "m1-fd-frequency-relative" || id === "m1-fd-frequency-combined")
    return ["1"];
  if (id.startsWith("m2-fd-coin-exact-")) return [String(b)];
  if (id.includes("-die-") || id.includes("-dice-")) return [String(a)];
  if (id.startsWith("m2-fd-card-multiple-")) return [String(b)];
  if (id === "m2-fd-card-union") return [String(b), String(c)];
  if (id === "m2-fd-balls-three-exact") return [String(c)];
  return [];
}

describe("authored functions/data mathematical prose", () => {
  it("checks every given, token boundary and TeX fallback without changing numerical identity", () => {
    const fingerprint = createHash("sha256"),
      rendered = new Set<string>();
    const render = (tex: string) => {
      if (rendered.has(tex)) return;
      katex.renderToString(tex, { throwOnError: true, strict: "error" });
      rendered.add(tex);
    };
    let tasks = 0;
    for (const def of definitions) {
      fingerprint.update(
        JSON.stringify([
          def.id,
          def.grade,
          def.strand,
          def.curriculum,
          def.domainSize,
        ]) + "\n",
      );
      for (let i = 0; i < def.domainSize; i++) {
        const c = def.problemAt(i);
        assert.equal(c.prompt.layout, "math");
        if (c.prompt.layout !== "math") assert.fail();
        fingerprint.update(JSON.stringify([c.parameters, c.answer]) + "\n");
        const where = `${def.id} #${i}`;
        for (const source of [c.prompt.text, c.prompt.instruction ?? ""]) {
          const segments = tokenizeMath(source);
          assert.equal(
            segments
              .map((s) => (s.type === "text" ? s.value : `$${s.value}$`))
              .join(""),
            source,
            where,
          );
          for (const segment of segments) {
            if (segment.type === "text")
              assert.ok(
                !/[A-Za-z0-9$=²³₀-ₙᵢ×]/u.test(segment.value),
                `${where}: raw mathematics ${segment.value}`,
              );
            else {
              assert.equal(segment.type, "inline");
              assert.ok(segment.value);
              render(segment.value);
            }
          }
        }
        assert.deepEqual(
          tokenizeMath(c.prompt.text)
            .filter((s) => s.type !== "text")
            .map((s) => s.value),
          expectedGivens(def.id, c.parameters),
          where,
        );
        assert.deepEqual(
          tokenizeMath(c.prompt.instruction ?? "")
            .filter((s) => s.type !== "text")
            .map((s) => s.value),
          expectedRequestedMath(def.id, c.parameters),
          `${where} target`,
        );
        assert.ok(!c.prompt.latex.includes("$"), where);
        render(c.prompt.latex);
        render(c.answer.latex);
        assert.ok(def.verify(c), where);
        tasks++;
      }
    }
    assert.equal(tasks, 62491);
    assert.equal(
      fingerprint.digest("hex"),
      "dd9dd0ba389b57f4dc92eb361405fe4f2eaf94960e57a98d6aed305592f93568",
    );
  }, 120000);

  it("keeps independent complete prose fixtures for equations, tables, roots and sampling", () => {
    const fixtures: [string, number[], string, string][] = [
      [
        "m1-fd-reflect-x-y",
        [-3, 4],
        "점 $P(-3, 4)$를 $x$축에 대하여 대칭이동한 점을 $Q$라 한다.",
        "점 $Q$의 $y$좌표를 구하세요.",
      ],
      [
        "m1-fd-direct-constant",
        [1, 2, 3],
        "정비례 관계 $y=ax$에서 $x=3$일 때 $y=\\frac{3}{2}$이다.",
        "비례상수 $a$의 값을 구하세요.",
      ],
      [
        "m1-fd-inverse-value",
        [-5, 2, -3],
        "$y=\\frac{-5}{2x}$에서 $x=-3$이다.",
        "$y$의 값을 구하세요.",
      ],
      [
        "m2-fd-two-points-slope",
        [-1, 2, 3, -4],
        "일차함수의 그래프가 두 점 $(-1, 2)$, $(2, -2)$를 지난다.",
        "기울기를 구하세요.",
      ],
      [
        "m2-fd-linear-coefficient",
        [-2, 3, -4],
        "일차함수 $y=kx+3$의 그래프가 점 $(-4, 11)$를 지난다.",
        "$k$의 값을 구하세요.",
      ],
      [
        "m3-fd-quadratic-vertex-form-p",
        [2, 3, -1],
        "이차함수 $y=2x^{2}+3x-1$를 $y=a(x-p)^{2}+q$ 꼴로 나타낸다.",
        "$p$의 값을 구하세요.",
      ],
      [
        "m3-fd-quadratic-vertex-value",
        [-2, -1, 3, 2],
        "$y=-2(x+1)^{2}+3$에서 $x=1$이다.",
        "$y$의 값을 구하세요.",
      ],
      [
        "m3-fd-quadratic-radical-root-negative",
        [-3, 8],
        "이차함수 $y=-3x^{2}+24$의 그래프와 $x$축의 두 교점",
        "두 교점의 $x$좌표 중 음수인 값을 구하세요.",
      ],
      [
        "m1-fd-frequency-missing",
        [2, 3, 4],
        "점수(점)는 $0, 1, 2$이고 각 점수의 도수(명)는 차례로 $2, x, 4$이다. 전체 학생 수는 $9$명이다.",
        "$x$의 값을 구하세요.",
      ],
      [
        "m1-fd-data-missing-mean",
        [1, 2, 3],
        "다섯 자료 $1, 3, x, 7, 9$의 평균은 $\\frac{28}{5}$이다.",
        "$x$의 값을 구하세요.",
      ],
      [
        "m3-fd-transformed-standard-deviation",
        [2, 3, -2, 1],
        "자료 $x_1, \\ldots, x_n$의 평균은 $2$, 분산은 $3$이다. 새 자료는 각 $x_i$를 $-2x_i+1$로 바꾼 것이다.",
        "새 자료의 표준편차를 구하세요.",
      ],
      [
        "m2-fd-balls-no-replace-both-red",
        [2, 3],
        "빨간 공 $2$개와 파란 공 $3$개가 있는 주머니에서 공 한 개를 같은 가능성으로 뽑고 다시 넣지 않고 한 개를 더 뽑는다.",
        "뽑은 두 공이 모두 빨간색일 확률을 구하세요.",
      ],
      [
        "m2-fd-balls-replace-both-red",
        [2, 3],
        "빨간 공 $2$개와 파란 공 $3$개가 있는 주머니에서 공 한 개를 같은 가능성으로 뽑고 다시 넣은 뒤 충분히 섞어 한 개를 더 뽑는다.",
        "뽑은 두 공이 모두 빨간색일 확률을 구하세요.",
      ],
      [
        "m2-fd-coin-exact-probability",
        [3, 2],
        "앞면과 뒷면이 나올 가능성이 같은 동전 한 개를 서로 독립적으로 $3$번 던진다. 각 시행의 순서를 구별한다.",
        "앞면이 정확히 $2$번 나오는 확률을 구하세요.",
      ],
      [
        "m2-fd-card-union",
        [12, 2, 3],
        "$1$부터 $12$까지의 자연수가 하나씩 적힌 카드 $12$장을 잘 섞어 같은 가능성으로 한 장을 뽑는다.",
        "적힌 수가 $2$의 배수 또는 $3$의 배수일 확률을 구하세요.",
      ],
    ];
    for (const [id, parameters, text, instruction] of fixtures) {
      const def = definitions.find((d) => d.id === id)!;
      const c = Array.from({ length: def.domainSize }, (_, i) =>
        def.problemAt(i),
      ).find(
        (c) => JSON.stringify(c.parameters) === JSON.stringify(parameters),
      )!;
      assert.ok(c, id);
      assert.equal(c.prompt.layout, "math");
      if (c.prompt.layout !== "math") assert.fail();
      assert.equal(c.prompt.text, text, id);
      assert.equal(c.prompt.instruction, instruction, id);
      if (id === "m1-fd-reflect-x-y")
        assert.equal(
          c.prompt.latex,
          "\\text{점 }P(-3, 4)\\text{를 }x\\text{축에 대하여 대칭이동한 점을 }Q\\text{라 한다.}",
        );
      if (id === "m1-fd-inverse-value")
        assert.equal(
          c.prompt.latex,
          "y=\\frac{-5}{2x}\\text{에서 }x=-3\\text{이다.}",
        );
    }
  });
});
