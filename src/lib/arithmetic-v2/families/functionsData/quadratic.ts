import {
  add,
  coefficients,
  eq,
  mul,
  nz,
  polynomial,
  q,
  range,
  root,
  rows,
  scalar,
  type Spec,
} from "./core";

export const QUADRATIC_SPECS: Spec[] = [];
const put = (s: Omit<Spec, "grade" | "semester" | "unit" | "strand">) =>
  QUADRATIC_SPECS.push({
    ...s,
    grade: "중3",
    semester: 1,
    unit: "이차함수와 그래프",
    strand: "함수",
  });
const expression = (a: number, b: number, c: number) =>
  `y=${polynomial([q(a), q(b), q(c)])}`;
const vertex = (a: number, h: number, k: number) =>
  `y=${a}(x${h < 0 ? `+${-h}` : `−${h}`})²${k < 0 ? k : `+${k}`}`;
const general = rows(nz(-3, 3), range(-6, 6), range(-5, 5));
for (const target of [
  "vertex-x",
  "vertex-y",
  "axis",
  "vertex-form-p",
  "vertex-form-q",
  "extreme",
  "y-intercept",
] as const)
  put({
    id: `m3-fd-quadratic-${target}`,
    title: {
      "vertex-x": "꼭짓점의 x좌표",
      "vertex-y": "꼭짓점의 y좌표",
      axis: "대칭축의 x좌표",
      "vertex-form-p": "꼭짓점 꼴의 p",
      "vertex-form-q": "꼭짓점 꼴의 q",
      extreme: "꼭짓점에서 최댓값·최솟값",
      "y-intercept": "이차함수의 y절편",
    }[target],
    domain: general,
    view: ([a, b, c]) => ({
      text: `이차함수 ${expression(a, b, c)}${target.startsWith("vertex-form") ? "를 y=a(x−p)²+q 꼴로 나타낸다." : ""}`,
      instruction:
        target === "extreme"
          ? `x가 모든 실수일 때 ${a > 0 ? "최솟값" : "최댓값"}을 구하세요.`
          : target === "axis"
            ? "대칭축이 x=t일 때 t의 값을 구하세요."
            : target === "vertex-x" || target === "vertex-y"
              ? `꼭짓점의 ${target.endsWith("x") ? "x" : "y"}좌표를 구하세요.`
              : target === "y-intercept"
                ? "y절편을 구하세요."
                : `${target.endsWith("p") ? "p" : "q"}의 값을 구하세요.`,
    }),
    solve: ([a, b, c]) =>
      target === "vertex-x" || target === "axis" || target === "vertex-form-p"
        ? q(-b, 2 * a)
        : target === "y-intercept"
          ? q(c)
          : q(4 * a * c - b * b, 4 * a),
    check: ([a, b, c], v) => {
      const [n, d] = scalar(v);
      return target === "vertex-x" ||
        target === "axis" ||
        target === "vertex-form-p"
        ? 2 * a * n + b * d === 0
        : target === "y-intercept"
          ? n === c * d
          : 4 * a * (c * d - n) === b * b * d;
    },
  });
put({
  id: "m3-fd-quadratic-value",
  title: "이차함수의 함숫값",
  domain: rows(nz(-3, 3), range(-3, 3), range(-4, 4), range(-3, 3)),
  view: ([a, b, c, x]) => ({
    text: `${expression(a, b, c)}에서 x=${x}이다.`,
    instruction: "y의 값을 구하세요.",
  }),
  solve: ([a, b, c, x]) => q(a * x * x + b * x + c),
  check: ([a, b, c, x], v) => {
    const [n, d] = scalar(v);
    return n - c * d === x * (a * x + b) * d;
  },
});
for (const target of ["coefficient", "vertex-value"] as const)
  put({
    id: `m3-fd-quadratic-${target}`,
    title:
      target === "coefficient"
        ? "꼭짓점과 한 점에서 이차항의 계수"
        : "꼭짓점 꼴의 함숫값",
    domain: rows(nz(-3, 3), range(-3, 3), range(-4, 4), nz(-3, 3)),
    view: ([a, h, k, t]) => ({
      text:
        target === "coefficient"
          ? `꼭짓점이 (${h}, ${k})이고 점 (${h + t}, ${a * t * t + k})를 지나는 이차함수의 이차항의 계수를 a라 한다.`
          : `${vertex(a, h, k)}에서 x=${h + t}이다.`,
      instruction:
        target === "coefficient" ? "a의 값을 구하세요." : "y의 값을 구하세요.",
    }),
    solve: ([a, , k, t]) => q(target === "coefficient" ? a : a * t * t + k),
    check: ([a, , k, t], v) => {
      const [n, d] = scalar(v);
      return target === "coefficient"
        ? n * t * t + k * d === (a * t * t + k) * d
        : n - k * d === a * t * t * d;
    },
  });
for (const target of ["b", "c", "equation"] as const)
  put({
    id: `m3-fd-quadratic-expand-${target}`,
    title:
      target === "equation"
        ? "꼭짓점 꼴을 일반형으로 전개"
        : `일반형의 ${target} 계수`,
    domain: rows(nz(-3, 3), range(-4, 4), range(-5, 5)),
    shape: target === "equation" ? "quadratic" : "scalar",
    view: ([a, h, k]) => ({
      text: `${vertex(a, h, k)}를 y=ax²+bx+c 꼴로 나타낸다.`,
      instruction:
        target === "equation"
          ? "전개한 이차함수의 식을 구하세요."
          : `${target}의 값을 구하세요.`,
    }),
    solve: ([a, h, k]) =>
      target === "b"
        ? q(-2 * a * h)
        : target === "c"
          ? q(a * h * h + k)
          : [q(a), q(-2 * a * h), q(a * h * h + k)],
    check: ([a, h, k], v) => {
      if (target !== "equation") {
        const [n, d] = scalar(v);
        return target === "b"
          ? n + 2 * a * h * d === 0
          : n - k * d === a * h * h * d;
      }
      const [A, B, C] = coefficients(v);
      return [-1, 0, 1].every((x) =>
        eq(
          add(add(mul(A, q(x * x)), mul(B, q(x))), C),
          q(a * (x - h) ** 2 + k),
        ),
      );
    },
  });
put({
  id: "m3-fd-quadratic-translation",
  title: "이차함수 그래프를 평행이동한 식",
  domain: rows(
    nz(-2, 2),
    range(-2, 2),
    range(-2, 2),
    range(-2, 2),
    range(-2, 2),
  ).filter(([, , , h, k]) => h !== 0 || k !== 0),
  shape: "quadratic",
  view: ([a, b, c, h, k]) => ({
    text: `${expression(a, b, c)}의 그래프를 x축 방향으로 ${h}, y축 방향으로 ${k}만큼 평행이동한다.`,
    instruction: "이동한 그래프의 식을 y=ax²+bx+c 꼴로 나타내세요.",
  }),
  solve: ([a, b, c, h, k]) => [
    q(a),
    q(b - 2 * a * h),
    q(a * h * h - b * h + c + k),
  ],
  check: ([a, b, c, h, k], v) => {
    const [A, B, C] = coefficients(v);
    return [-1, 0, 1].every((t) =>
      eq(
        add(add(mul(A, q((t + h) ** 2)), mul(B, q(t + h))), C),
        q(a * t * t + b * t + c + k),
      ),
    );
  },
});
for (const sign of [-1, 1]) {
  put({
    id: `m3-fd-quadratic-integer-root-${sign < 0 ? "smaller" : "larger"}`,
    title: `x축 교점 중 ${sign < 0 ? "작은" : "큰"} x좌표`,
    domain: rows(nz(-3, 3), range(-5, 4), range(-4, 5)).filter(
      ([, u, v]) => u < v,
    ),
    view: ([a, u, v]) => ({
      text: `이차함수 ${expression(a, -a * (u + v), a * u * v)}의 그래프와 x축의 두 교점`,
      instruction: `두 교점의 x좌표 중 ${sign < 0 ? "작은" : "큰"} 값을 구하세요.`,
    }),
    solve: ([, u, v]) => q(sign < 0 ? u : v),
    check: ([a, u, v], value) => {
      const [n, d] = scalar(value);
      return (
        a * (n - u * d) * (n - v * d) === 0 &&
        (sign < 0 ? 2 * n < (u + v) * d : 2 * n > (u + v) * d)
      );
    },
  });
  put({
    id: `m3-fd-quadratic-radical-root-${sign < 0 ? "negative" : "positive"}`,
    title: `x축 교점의 ${sign < 0 ? "음" : "양"}의 x좌표`,
    domain: rows(nz(-3, 3), [2, 3, 5, 6, 7, 8, 10, 12, 18, 20, 27]),
    view: ([a, r]) => ({
      text: `이차함수 ${expression(a, 0, -a * r)}의 그래프와 x축의 두 교점`,
      instruction: `두 교점의 x좌표 중 ${sign < 0 ? "음수" : "양수"}인 값을 구하세요.`,
    }),
    solve: ([, r]) => root(sign, r),
    check: ([, r], v) => {
      if (Array.isArray(v)) return false;
      return v.n * sign > 0 && v.n * v.n * v.r === r * v.d * v.d;
    },
  });
}
put({
  id: "m3-fd-quadratic-tangent-root",
  title: "x축과 한 점에서 만나는 x좌표",
  domain: rows(nz(-3, 3), range(-6, 6)),
  view: ([a, h]) => ({
    text: `이차함수 ${expression(a, -2 * a * h, a * h * h)}의 그래프가 x축과 한 점에서 만난다.`,
    instruction: "그 점의 x좌표를 구하세요.",
  }),
  solve: ([, h]) => q(h),
  check: ([a, h], v) => {
    const [n, d] = scalar(v);
    return a * (n - h * d) ** 2 === 0;
  },
});
