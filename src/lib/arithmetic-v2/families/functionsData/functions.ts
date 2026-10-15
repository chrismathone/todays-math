import {
  add,
  coefficients,
  eq,
  fmt,
  gcd,
  m,
  mul,
  nz,
  polynomial,
  q,
  range,
  rows,
  scalar,
  type Spec,
} from "./core";

export const FUNCTION_SPECS: Spec[] = [];
const put = (
  grade: "중1" | "중2",
  unit: string,
  spec: Omit<Spec, "grade" | "semester" | "unit" | "strand">,
) => FUNCTION_SPECS.push({ ...spec, grade, unit, semester: 1, strand: "함수" });
const pointDomain = rows(nz(-8, 8), nz(-8, 8));
for (const axis of ["x", "y", "origin"] as const)
  for (const coordinate of [0, 1] as const) {
    const negative =
      axis === "origin" || (axis === "x" ? coordinate === 1 : coordinate === 0);
    put("중1", "그래프와 비례관계", {
      id: `m1-fd-reflect-${axis}-${coordinate === 0 ? "x" : "y"}`,
      title: `${axis === "origin" ? "원점" : `${axis}축`} 대칭점의 ${coordinate === 0 ? "x" : "y"}좌표`,
      domain: pointDomain,
      view: ([x, y]) => ({
        text: `점 ${m(`P(${x}, ${y})`)}를 ${axis === "origin" ? "원점" : `${m(axis)}축`}에 대하여 대칭이동한 점을 ${m("Q")}라 한다.`,
        instruction: `점 ${m("Q")}의 ${m(coordinate === 0 ? "x" : "y")}좌표를 구하세요.`,
      }),
      solve: (p) => q((negative ? -1 : 1) * p[coordinate]),
      check: (p, v) => {
        const [n, d] = scalar(v);
        return negative
          ? n + p[coordinate] * d === 0
          : n - p[coordinate] * d === 0;
      },
    });
  }
for (const axis of ["x", "y"] as const)
  put("중1", "그래프와 비례관계", {
    id: `m1-fd-distance-${axis}-axis`,
    title: `점과 ${axis}축 사이의 거리`,
    domain: pointDomain,
    view: ([x, y]) => ({
      text: `점 ${m(`P(${x}, ${y})`)}`,
      instruction: `점 ${m("P")}와 ${m(axis)}축 사이의 거리를 구하세요.`,
    }),
    solve: (p) => q(Math.abs(p[axis === "x" ? 1 : 0])),
    check: (p, v) => {
      const [n, d] = scalar(v),
        a = p[axis === "x" ? 1 : 0];
      return n >= 0 && n * n === a * a * d * d;
    },
  });
for (const axis of ["horizontal", "vertical"] as const)
  put("중1", "그래프와 비례관계", {
    id: `m1-fd-${axis}-distance`,
    title:
      axis === "horizontal"
        ? "수평선 위 두 점 사이의 거리"
        : "수직선 위 두 점 사이의 거리",
    domain: rows(range(-6, 6), range(1, 9), range(-4, 4)),
    view: ([a, d, k]) => ({
      text:
        axis === "horizontal"
          ? `두 점 ${m(`A(${a}, ${k})`)}, ${m(`B(${a + d}, ${k})`)}`
          : `두 점 ${m(`A(${k}, ${a})`)}, ${m(`B(${k}, ${a + d})`)}`,
      instruction: "두 점 사이의 거리를 구하세요.",
    }),
    solve: ([, d]) => q(d),
    check: ([a, d], v) => {
      const [n, e] = scalar(v);
      return n >= 0 && (a + d - a) * e === n;
    },
  });
const proportionalDomain = rows(nz(-6, 6), range(1, 3), nz(-6, 6)).filter(
  ([a, d]) => gcd(a, d) === 1,
);
for (const inverse of [false, true])
  for (const target of ["value", "constant", "input"] as const) {
    const type = inverse ? "반비례" : "정비례";
    put("중1", "그래프와 비례관계", {
      id: `m1-fd-${inverse ? "inverse" : "direct"}-${target}`,
      title: `${type}의 ${target === "value" ? "함숫값" : target === "constant" ? "비례상수" : "x의 값"}`,
      domain: proportionalDomain,
      view: ([a, d, x]) => {
        const A = fmt(q(a, d), true),
          y = fmt(inverse ? q(a, d * x) : q(a * x, d), true);
        const formula = m(
          inverse ? `y=\\frac{${a}}{${d === 1 ? "x" : `${d}x`}}` : `y=${A}x`,
        );
        return {
          text:
            target === "constant"
              ? `${type} 관계 ${m(inverse ? "y=\\frac{a}{x}" : "y=ax")}에서 ${m(`x=${x}`)}일 때 ${m(`y=${y}`)}이다.`
              : target === "value"
                ? `${formula}에서 ${m(`x=${x}`)}이다.`
                : `${formula}에서 ${m(`y=${y}`)}이다.`,
          instruction: `${target === "constant" ? `비례상수 ${m("a")}` : m(target === "value" ? "y" : "x")}의 값을 구하세요.`,
        };
      },
      solve: ([a, d, x]) =>
        target === "constant"
          ? q(a, d)
          : target === "input"
            ? q(x)
            : inverse
              ? q(a, d * x)
              : q(a * x, d),
      check: ([a, d, x], v) => {
        const [n, e] = scalar(v);
        if (target === "constant")
          return inverse ? n * d * x === a * x * e : n * x * d === a * x * e;
        if (target === "input")
          return inverse
            ? n * a * d === x * e * a * d
            : n * a * d === a * x * d * e;
        return inverse ? n * d * x === a * e : n * d === a * x * e;
      },
    });
  }

const linear = rows(nz(-4, 4), range(-6, 6), range(-5, 5));
const lineText = (a: number, b: number) =>
  m(`y=${polynomial([q(a), q(b)], true)}`);
const lineUnit = "일차함수의 그래프";
for (const target of ["value", "input", "coefficient", "constant"] as const)
  put("중2", lineUnit, {
    id: `m2-fd-linear-${target}`,
    title: {
      value: "일차함수의 함숫값",
      input: "함숫값에서 x",
      coefficient: "한 점에서 x의 계수",
      constant: "한 점에서 상수항",
    }[target],
    domain: linear.filter(([, , x]) => target !== "coefficient" || x !== 0),
    view: ([a, b, x]) => ({
      text:
        target === "value"
          ? `${lineText(a, b)}에서 ${m(`x=${x}`)}이다.`
          : target === "input"
            ? `${lineText(a, b)}에서 ${m(`y=${a * x + b}`)}이다.`
            : target === "coefficient"
              ? `일차함수 ${m(`y=kx${b < 0 ? b : `+${b}`}`)}의 그래프가 점 ${m(`(${x}, ${a * x + b})`)}를 지난다.`
              : `일차함수 ${m(`y=${a}x+k`)}의 그래프가 점 ${m(`(${x}, ${a * x + b})`)}를 지난다.`,
      instruction: `${m(target === "value" ? "y" : target === "input" ? "x" : "k")}의 값을 구하세요.`,
    }),
    solve: ([a, b, x]) =>
      q(
        target === "value"
          ? a * x + b
          : target === "input"
            ? x
            : target === "coefficient"
              ? a
              : b,
      ),
    check: ([a, b, x], v) => {
      const [n, d] = scalar(v);
      return target === "value"
        ? n - b * d === a * x * d
        : target === "input"
          ? a * n + b * d === (a * x + b) * d
          : target === "coefficient"
            ? n * x + b * d === (a * x + b) * d
            : a * x * d + n === (a * x + b) * d;
    },
  });
const pairDomain = rows(range(-3, 3), range(-4, 4), range(1, 5), nz(-5, 5));
for (const target of ["slope", "equation"] as const)
  put("중2", lineUnit, {
    id: `m2-fd-two-points-${target}`,
    title: target === "slope" ? "두 점에서 기울기" : "두 점에서 일차함수의 식",
    domain: pairDomain,
    shape: target === "equation" ? "line" : "scalar",
    view: ([x, y, dx, dy]) => ({
      text: `일차함수의 그래프가 두 점 ${m(`(${x}, ${y})`)}, ${m(`(${x + dx}, ${y + dy})`)}를 지난다.`,
      instruction:
        target === "slope"
          ? "기울기를 구하세요."
          : "일차함수의 식을 $y=ax+b$ 꼴로 나타내세요.",
    }),
    solve: ([x, y, dx, dy]) =>
      target === "slope" ? q(dy, dx) : [q(dy, dx), q(y * dx - dy * x, dx)],
    check: ([x, y, dx, dy], v) =>
      target === "slope"
        ? scalar(v)[0] * dx === dy * scalar(v)[1]
        : eq(add(mul(coefficients(v)[0], q(x)), coefficients(v)[1]), q(y)) &&
          eq(
            add(mul(coefficients(v)[0], q(x + dx)), coefficients(v)[1]),
            q(y + dy),
          ),
  });
for (const target of ["slope", "y-change", "x-change"] as const)
  put("중2", lineUnit, {
    id: `m2-fd-change-${target}`,
    title: {
      slope: "변화량에서 기울기",
      "y-change": "x의 변화량에서 y의 변화량",
      "x-change": "y의 변화량에서 x의 변화량",
    }[target],
    domain: rows(nz(-5, 5), nz(-6, 6)),
    view: ([a, dx]) => ({
      text:
        target === "slope"
          ? `일차함수에서 ${m("x")}가 ${m(dx)}만큼 변할 때 ${m("y")}는 ${m(a * dx)}만큼 변한다.`
          : `기울기가 ${m(a)}인 일차함수에서 ${target === "y-change" ? `${m("x")}가 ${m(dx)}` : `${m("y")}가 ${m(a * dx)}`}만큼 변한다.`,
      instruction:
        target === "slope"
          ? "기울기를 구하세요."
          : `${m(target === "y-change" ? "y" : "x")}의 변화량을 구하세요.`,
    }),
    solve: ([a, dx]) =>
      q(target === "slope" ? a : target === "y-change" ? a * dx : dx),
    check: ([a, dx], v) => {
      const [n, d] = scalar(v);
      return target === "slope"
        ? n * dx === a * dx * d
        : target === "y-change"
          ? n === a * dx * d
          : a * n === a * dx * d;
    },
  });
for (const axis of ["x", "y"] as const)
  put("중2", lineUnit, {
    id: `m2-fd-${axis}-intercept`,
    title: `일차함수의 ${axis}절편`,
    domain: rows(nz(-6, 6), range(-9, 9)),
    view: ([a, b]) => ({
      text: lineText(a, b),
      instruction: `${m(axis)}절편을 구하세요.`,
    }),
    solve: ([a, b]) => (axis === "x" ? q(-b, a) : q(b)),
    check: ([a, b], v) => {
      const [n, d] = scalar(v);
      return axis === "x" ? a * n + b * d === 0 : n - b * d === 0;
    },
  });
put("중2", lineUnit, {
  id: "m2-fd-slope-point-equation",
  title: "기울기와 한 점에서 일차함수의 식",
  domain: linear,
  shape: "line",
  view: ([a, b, x]) => ({
    text: `기울기가 ${m(a)}이고 점 ${m(`(${x}, ${a * x + b})`)}를 지나는 일차함수`,
    instruction: "식을 $y=ax+b$ 꼴로 나타내세요.",
  }),
  solve: ([a, b]) => [q(a), q(b)],
  check: ([a, b, x], v) =>
    eq(coefficients(v)[0], q(a)) &&
    eq(add(mul(coefficients(v)[0], q(x)), coefficients(v)[1]), q(a * x + b)),
});
put("중2", lineUnit, {
  id: "m2-fd-intercepts-equation",
  title: "두 절편에서 일차함수의 식",
  domain: rows(nz(-8, 8), nz(-8, 8)),
  shape: "line",
  view: ([x, y]) => ({
    text: `${m("x")}절편이 ${m(x)}, ${m("y")}절편이 ${m(y)}인 일차함수`,
    instruction: "식을 $y=ax+b$ 꼴로 나타내세요.",
  }),
  solve: ([x, y]) => [q(-y, x), q(y)],
  check: ([x, y], v) =>
    eq(coefficients(v)[1], q(y)) &&
    eq(add(mul(coefficients(v)[0], q(x)), coefficients(v)[1]), q(0)),
});
put("중2", lineUnit, {
  id: "m2-fd-parallel-coefficient",
  title: "평행한 두 그래프의 계수",
  domain: rows(nz(-6, 6), range(-5, 5), range(-5, 5)).filter(
    ([, b, c]) => b !== c,
  ),
  view: ([a, b, c]) => ({
    text: `${lineText(a, b)}와 ${m(`y=kx${c < 0 ? c : `+${c}`}`)}의 그래프가 평행하다.`,
    instruction: "$k$의 값을 구하세요.",
  }),
  solve: ([a]) => q(a),
  check: ([a], v) => {
    const [n, d] = scalar(v);
    return n - a * d === 0;
  },
});
put("중2", lineUnit, {
  id: "m2-fd-linear-translation",
  title: "일차함수 그래프를 평행이동한 식",
  domain: rows(nz(-3, 3), range(-4, 4), range(-3, 3), range(-3, 3)).filter(
    ([, , h, k]) => h !== 0 || k !== 0,
  ),
  shape: "line",
  view: ([a, b, h, k]) => ({
    text: `${lineText(a, b)}의 그래프를 ${m("x")}축 방향으로 ${m(h)}, ${m("y")}축 방향으로 ${m(k)}만큼 평행이동한다.`,
    instruction: "이동한 그래프의 식을 $y=ax+b$ 꼴로 나타내세요.",
  }),
  solve: ([a, b, h, k]) => [q(a), q(b - a * h + k)],
  check: ([a, b, h, k], v) =>
    eq(coefficients(v)[0], q(a)) &&
    eq(add(mul(coefficients(v)[0], q(h)), coefficients(v)[1]), q(b + k)),
});
for (const target of ["slope", "x-intercept", "y-intercept"] as const)
  put("중2", "일차함수와 일차방정식의 관계", {
    id: `m2-fd-implicit-${target}`,
    title: `일차방정식의 그래프에서 ${target === "slope" ? "기울기" : target === "x-intercept" ? "x절편" : "y절편"}`,
    domain: rows(nz(-4, 4), range(1, 5), range(-8, 8)).filter(
      ([a, b, c]) => gcd(gcd(a, b), c) === 1,
    ),
    view: ([a, b, c]) => ({
      text: m(`${a}x+${b}y=${c}`),
      instruction: `그래프의 ${target === "slope" ? "기울기" : target === "x-intercept" ? `${m("x")}절편` : `${m("y")}절편`}을 구하세요.`,
    }),
    solve: ([a, b, c]) =>
      target === "slope"
        ? q(-a, b)
        : target === "x-intercept"
          ? q(c, a)
          : q(c, b),
    check: ([a, b, c], v) => {
      const [n, d] = scalar(v);
      return target === "slope"
        ? b * n + a * d === 0
        : target === "x-intercept"
          ? a * n === c * d
          : b * n === c * d;
    },
  });
for (const axis of ["x", "y"] as const)
  put("중2", "일차함수와 일차방정식의 관계", {
    id: `m2-fd-intersection-${axis}`,
    title: `두 일차함수 그래프의 교점의 ${axis}좌표`,
    domain: rows(nz(-3, 3), nz(-3, 3), range(-4, 4), range(-4, 4)).filter(
      ([a, c]) => a < c,
    ),
    view: ([a, c, b, d]) => ({
      text: `두 일차함수 ${lineText(a, b)}, ${lineText(c, d)}`,
      instruction: `두 그래프의 교점의 ${m(axis)}좌표를 구하세요.`,
    }),
    solve: ([a, c, b, d]) =>
      axis === "x" ? q(d - b, a - c) : q(a * d - b * c, a - c),
    check: ([a, c, b, d], v) => {
      const [n, e] = scalar(v);
      return axis === "x"
        ? a * n + b * e === c * n + d * e
        : c * (n - b * e) === a * (n - d * e);
    },
  });
