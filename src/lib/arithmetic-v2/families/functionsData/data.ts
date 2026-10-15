import {
  fmt,
  m,
  nz,
  q,
  range,
  root,
  rows,
  scalar,
  type Spec,
  type Value,
} from "./core";

export const DATA_SPECS: Spec[] = [];
const put = (
  grade: "중1" | "중3",
  s: Omit<Spec, "grade" | "semester" | "unit" | "strand">,
) =>
  DATA_SPECS.push({
    ...s,
    grade,
    semester: 2,
    unit: grade === "중1" ? "자료의 정리와 해석" : "통계",
    strand: "자료·확률",
  });
const data = ([a, d, k]: number[]) => [
  a + 3 * d,
  a,
  a + 4 * d + k,
  a + d,
  a + 2 * d,
];
const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const square = (v: Value): [number, number] =>
  Array.isArray(v)
    ? [scalar(v)[0] ** 2, scalar(v)[1] ** 2]
    : [v.n * v.n * v.r, v.d * v.d];
const nonnegative = (v: Value) =>
  Array.isArray(v) ? scalar(v)[0] >= 0 : v.n >= 0;
for (const grade of ["중1", "중3"] as const) {
  const prefix = grade === "중1" ? "m1" : "m3";
  for (const target of (grade === "중1"
    ? ["mean", "median"]
    : ["mean", "median", "range"]) as ("mean" | "median" | "range")[])
    put(grade, {
      id: `${prefix}-fd-data-${target}`,
      title: {
        mean: "자료의 평균",
        median: "홀수 개 자료의 중앙값",
        range: "자료의 범위",
      }[target],
      domain: rows(range(0, 9), range(1, 4), range(0, 5)),
      view: (p) => ({
        text: `자료: ${m(data(p).join(", "))}`,
        instruction: `${{ mean: "평균을", median: "중앙값을", range: "범위를" }[target]} 구하세요.`,
      }),
      solve: (p) => {
        const xs = data(p);
        return target === "mean"
          ? q(total(xs), xs.length)
          : target === "median"
            ? q([...xs].sort((a, b) => a - b)[2])
            : q(Math.max(...xs) - Math.min(...xs));
      },
      check: (p, v) => {
        const xs = data(p),
          [n, d] = scalar(v);
        if (target === "mean")
          return xs.reduce((s, x) => s + x * d - n, 0) === 0;
        if (target === "median")
          return (
            xs.filter((x) => x * d <= n).length >= 3 &&
            xs.filter((x) => x * d >= n).length >= 3
          );
        return (
          xs.every((x) => (x - Math.min(...xs)) * d <= n) &&
          xs.some((x) => (x - Math.min(...xs)) * d === n)
        );
      },
    });
  put(grade, {
    id: `${prefix}-fd-data-even-median`,
    title: "짝수 개 자료의 중앙값",
    domain: rows(range(0, 10), range(1, 5), range(1, 6)),
    view: ([a, d, k]) => ({
      text: `자료: ${m([a + 2 * d + k, a, a + 3 * d + k, a + d].join(", "))}`,
      instruction: "중앙값을 구하세요.",
    }),
    solve: ([a, d, k]) => q(2 * a + 3 * d + k, 2),
    check: ([a, d, k], v) => {
      const xs = [a, a + d, a + 2 * d + k, a + 3 * d + k],
        [n, e] = scalar(v);
      return 2 * n === (xs[1] + xs[2]) * e;
    },
  });
  put(grade, {
    id: `${prefix}-fd-data-mode`,
    title: "자료의 최빈값",
    domain: rows(range(0, 12), range(1, 7)),
    view: ([a, d]) => ({
      text: `자료: ${m([a + d, a, a + 2 * d, a, a].join(", "))}`,
      instruction: "최빈값을 구하세요.",
    }),
    solve: ([a]) => q(a),
    check: ([a, d], v) => {
      const xs = [a + d, a, a + 2 * d, a, a],
        [n, e] = scalar(v),
        count = xs.filter((x) => x * e === n).length;
      return (
        count > 0 &&
        [...new Set(xs)].every(
          (x) => x * e === n || xs.filter((y) => y === x).length < count,
        )
      );
    },
  });
  put(grade, {
    id: `${prefix}-fd-data-missing-mean`,
    title: "평균으로 빠진 자료 구하기",
    domain: rows(range(0, 8), range(1, 4), range(0, 6)),
    view: ([a, d, k]) => ({
      text: `다섯 자료 ${m(`${a}, ${a + d}, x, ${a + 3 * d}, ${a + 4 * d}`)}의 평균은 ${m(fmt(q(5 * a + 10 * d + k, 5), true))}이다.`,
      instruction: "$x$의 값을 구하세요.",
    }),
    solve: ([a, d, k]) => q(a + 2 * d + k),
    check: ([a, d, k], v) => {
      const [n, e] = scalar(v);
      return (4 * a + 8 * d) * e + n === (5 * a + 10 * d + k) * e;
    },
  });
}
const frequencies = rows(range(1, 5), range(1, 5), range(1, 5));
for (const target of [
  "total",
  "relative",
  "percent",
  "combined",
  "missing",
] as const)
  put("중1", {
    id: `m1-fd-frequency-${target}`,
    title: {
      total: "도수의 합",
      relative: "상대도수",
      percent: "상대도수의 백분율",
      combined: "두 범주의 도수 합",
      missing: "전체 도수로 빠진 도수",
    }[target],
    domain: frequencies,
    view: ([a, b, c]) => ({
      text: `점수(점)는 ${m("0, 1, 2")}이고 각 점수의 도수(명)는 차례로 ${m(`${a}, ${target === "missing" ? "x" : b}, ${c}`)}이다.${target === "missing" ? ` 전체 학생 수는 ${m(a + b + c)}명이다.` : ""}`,
      instruction:
        target === "total"
          ? "전체 학생 수를 구하세요."
          : target === "combined"
            ? "점수가 $1$점 이상인 학생 수를 구하세요."
            : target === "missing"
              ? "$x$의 값을 구하세요."
              : `$1$점의 ${target === "percent" ? "상대도수를 백분율로 나타낼 때 $\\%$ 앞의 수" : "상대도수"}를 구하세요.`,
    }),
    solve: ([a, b, c]) =>
      target === "total"
        ? q(a + b + c)
        : target === "relative"
          ? q(b, a + b + c)
          : target === "percent"
            ? q(100 * b, a + b + c)
            : target === "combined"
              ? q(b + c)
              : q(b),
    check: ([a, b, c], v) => {
      const [n, d] = scalar(v);
      return target === "total"
        ? n - a * d - b * d - c * d === 0
        : target === "relative"
          ? (a + b + c) * n === b * d
          : target === "percent"
            ? (a + b + c) * n === 100 * b * d
            : target === "combined"
              ? n - b * d === c * d
              : a * d + n + c * d === (a + b + c) * d;
    },
  });
for (const target of ["count", "total"] as const)
  put("중1", {
    id: `m1-fd-relative-inverse-${target}`,
    title: target === "count" ? "상대도수에서 도수" : "상대도수에서 전체 도수",
    domain: rows(range(5, 30), range(1, 29)).filter(([N, n]) => n < N),
    view: ([N, n]) => ({
      text: `어떤 범주의 상대도수는 ${m(fmt(q(n, N), true))}이고, ${target === "count" ? `전체 도수는 ${m(N)}` : `그 범주의 도수는 ${m(n)}`}이다.`,
      instruction:
        target === "count"
          ? "그 범주의 도수를 구하세요."
          : "전체 도수를 구하세요.",
    }),
    solve: ([N, n]) => q(target === "count" ? n : N),
    check: ([N, n], v) => {
      const [a, d] = scalar(v);
      return target === "count" ? a * N === n * N * d : n * a === N * n * d;
    },
  });
put("중1", {
  id: "m1-fd-class-midpoint",
  title: "계급값",
  domain: rows(range(0, 16), [5, 10, 20]),
  view: ([a, w]) => ({
    text: `도수분포표의 한 계급: ${m(a * 5)} 이상 ${m(a * 5 + w)} 미만`,
    instruction: "이 계급의 계급값을 구하세요.",
  }),
  solve: ([a, w]) => q(10 * a + w, 2),
  check: ([a, w], v) => {
    const [n, d] = scalar(v);
    return n - 5 * a * d === (5 * a + w) * d - n;
  },
});
put("중1", {
  id: "m1-fd-discrete-frequency-mean",
  title: "도수표로 이산 자료의 평균",
  domain: rows(range(0, 5), range(1, 3), range(1, 4), range(1, 4), range(1, 4)),
  view: ([a, d, f, g, h]) => ({
    text: `점수(점)는 ${m(`${a}, ${a + d}, ${a + 2 * d}`)}이고 각 점수의 도수(명)는 차례로 ${m(`${f}, ${g}, ${h}`)}이다.`,
    instruction: "전체 학생의 점수 평균을 구하세요.",
  }),
  solve: ([a, d, f, g, h]) =>
    q(a * f + (a + d) * g + (a + 2 * d) * h, f + g + h),
  check: ([a, d, f, g, h], v) => {
    const xs = [
        ...Array(f).fill(a),
        ...Array(g).fill(a + d),
        ...Array(h).fill(a + 2 * d),
      ],
      [n, e] = scalar(v);
    return xs.reduce((s, x) => s + x * e - n, 0) === 0;
  },
});
put("중1", {
  id: "m1-fd-stem-leaf-median",
  title: "줄기와 잎 자료의 중앙값",
  domain: rows(range(1, 8), range(0, 3), range(4, 6), range(7, 9)),
  view: ([stem, a, b, c]) => ({
    text: `줄기와 잎 그림에서 줄기 ${m(stem)}의 잎은 ${m(`${a}, ${b}, ${c}`)}이고 다른 줄기는 없다. 자료의 값은 줄기에 ${m(10)}을 곱한 값에 잎을 더한 값이다.`,
    instruction: "자료의 중앙값을 구하세요.",
  }),
  solve: ([s, , b]) => q(10 * s + b),
  check: ([s, a, b, c], v) => {
    const [n, d] = scalar(v),
      xs = [10 * s + a, 10 * s + b, 10 * s + c];
    return (
      xs.filter((x) => x * d <= n).length >= 2 &&
      xs.filter((x) => x * d >= n).length >= 2
    );
  },
});
for (const target of ["deviation", "variance", "standard-deviation"] as const)
  put("중3", {
    id: `m3-fd-data-${target}`,
    title: `일반 자료의 ${target === "deviation" ? "편차" : target === "variance" ? "분산" : "표준편차"}`,
    domain: rows(range(0, 9), range(1, 4), range(0, 5)),
    view: (p) => ({
      text: `자료: ${m(data(p).join(", "))}`,
      instruction:
        target === "deviation"
          ? `값이 ${m(data(p)[0])}인 자료의 편차를 구하세요.`
          : `${target === "variance" ? "분산을" : "표준편차를"} 구하세요.`,
    }),
    solve: (p) => {
      const xs = data(p),
        N = xs.length,
        S = total(xs),
        ss = total(xs.map((x) => x * x)) * N - S * S;
      return target === "deviation"
        ? q(xs[0] * N - S, N)
        : target === "variance"
          ? q(ss, N * N)
          : root(1, ss, N);
    },
    check: (p, v) => {
      const xs = data(p),
        N = xs.length,
        S = total(xs);
      if (target === "deviation") {
        const [n, d] = scalar(v);
        return n * N + S * d === xs[0] * N * d;
      }
      const squared = xs.reduce((s, x) => s + (x * N - S) ** 2, 0);
      if (target === "variance") {
        const [n, d] = scalar(v);
        return n * N ** 3 === squared * d;
      }
      const [num, den] = square(v);
      return nonnegative(v) && num * N ** 3 === squared * den;
    },
  });
for (const target of [
  "deviation",
  "missing-deviation",
  "variance",
  "standard-deviation",
] as const)
  put("중3", {
    id: `m3-fd-${target}`,
    title: {
      deviation: "자료의 편차",
      "missing-deviation": "편차의 합으로 빠진 편차",
      variance: "자료의 분산",
      "standard-deviation": "자료의 표준편차",
    }[target],
    domain: rows(
      target === "missing-deviation" ? [0] : range(4, 12),
      range(0, 4),
      range(0, 5),
    ),
    view: ([a, d, k]) => ({
      text:
        target === "missing-deviation"
          ? `네 자료의 편차가 차례로 ${m(`${-d}, ${-k}, ${d}, x`)}이다.`
          : `자료: ${m([a - d, a - k, a + d, a + k].join(", "))}`,
      instruction:
        target === "deviation"
          ? `값이 ${m(a - d)}인 자료의 편차를 구하세요.`
          : target === "missing-deviation"
            ? "$x$의 값을 구하세요."
            : `${target === "variance" ? "분산을" : "표준편차를"} 구하세요.`,
    }),
    solve: ([, d, k]) =>
      target === "deviation"
        ? q(-d)
        : target === "missing-deviation"
          ? q(k)
          : target === "variance"
            ? q(d * d + k * k, 2)
            : root(1, 2 * (d * d + k * k), 2),
    check: ([a, d, k], v) => {
      const xs = [a - d, a - k, a + d, a + k];
      if (target === "missing-deviation") {
        const [n, e] = scalar(v);
        return (-d - k + d) * e + n === 0;
      }
      if (target === "deviation") {
        const [n, e] = scalar(v);
        return n * xs.length === (xs[0] * xs.length - total(xs)) * e;
      }
      const N = xs.length,
        S = total(xs),
        squared = xs.reduce((s, x) => s + (x * N - S) ** 2, 0);
      if (target === "variance") {
        const [n, e] = scalar(v);
        return n * N ** 3 === squared * e;
      }
      const [num, den] = square(v);
      return nonnegative(v) && num * N ** 3 === squared * den;
    },
  });
for (const target of ["mean", "variance", "standard-deviation"] as const)
  put("중3", {
    id: `m3-fd-transformed-${target}`,
    title: `변환한 자료의 ${target === "mean" ? "평균" : target === "variance" ? "분산" : "표준편차"}`,
    domain: rows(range(0, 8), range(0, 5), nz(-3, 3), range(-4, 4)),
    view: ([mean, v, a, b]) => ({
      text: `자료 ${m("x_1, \\ldots, x_n")}의 평균은 ${m(mean)}, 분산은 ${m(v)}이다. 새 자료는 각 ${m("x_i")}를 ${m(`${a}x_i${b < 0 ? b : `+${b}`}`)}로 바꾼 것이다.`,
      instruction: `새 자료의 ${target === "mean" ? "평균을" : target === "variance" ? "분산을" : "표준편차를"} 구하세요.`,
    }),
    solve: ([m, v, a, b]) =>
      target === "mean"
        ? q(a * m + b)
        : target === "variance"
          ? q(a * a * v)
          : root(Math.abs(a), v),
    check: ([m, v, a, b], value) => {
      if (target === "standard-deviation") {
        const [n, d] = square(value);
        return nonnegative(value) && n === a * a * v * d;
      }
      const [n, d] = scalar(value);
      return target === "mean" ? n - b * d === a * m * d : n === a * a * v * d;
    },
  });
