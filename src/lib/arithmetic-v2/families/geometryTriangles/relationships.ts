import {
  gcd,
  lerp,
  midpoint,
  midline,
  near,
  rad,
  range,
  rows,
  sides,
  trapezoid,
} from "./core";
import type { Model, Spec } from "./core";

const lengths = rows(range(2, 20));
const ratios = rows(range(1, 4), range(2, 5)).filter(
  ([p, q]) => p < q && gcd(p, q) === 1 && q <= 3 * p,
);
function similar(p: number, q: number): Model {
  return {
    points: {
      A: [0, 3 * p],
      B: [0, 0],
      C: [4 * p, 0],
      D: [4 * p + 2 * q, 3 * q],
      E: [4 * p + 2 * q, 0],
      F: [4 * p + 6 * q, 0],
    },
    edges: ["AB", "BC", "CA", "DE", "EF", "FD"],
    right: ["ABC", "DEF"],
  };
}
function parallelogram(a = 60, width = 1.4): Model {
  const dx = Math.cos(rad(a)),
    dy = Math.sin(rad(a));
  return {
    points: { A: [0, 0], B: [width, 0], C: [width + dx, dy], D: [dx, dy] },
    edges: ["AB", "BC", "CD", "DA"],
    parallel: [
      ["AB", "DC"],
      ["AD", "BC"],
    ],
  };
}
function quadDiagonals(m: Model): Model {
  m.points.O = midpoint(m.points.A, m.points.C);
  m.edges.push("AC", "BD");
  return m;
}
export const RELATIONSHIP_SPECS: Spec[] = [];
for (const inverse of [false, true])
  RELATIONSHIP_SPECS.push({
    key: inverse ? "midsegment-to-base" : "triangle-midsegment",
    title: inverse ? "중점 연결 선분에서 밑변" : "삼각형의 중점 연결 선분",
    topic: "중점 연결",
    unit: "cm",
    rows: lengths,
    task: ([n]) => ({
      text: `삼각형 ABC에서 D, E는 각각 AB, AC의 중점이다. ${inverse ? "DE" : "BC"}=${n} cm이다.`,
      target: `${inverse ? "BC" : "DE"}의 길이`,
      value: { n: inverse ? 2 * n : n, d: inverse ? 1 : 2 },
      model: midline(),
    }),
    relation: ([n], x) => (inverse ? x === 2 * n : x * 2 === n),
  });
for (const mode of ["small", "remainder"])
  RELATIONSHIP_SPECS.push({
    key: `midsegment-area-${mode}`,
    title:
      mode === "small"
        ? "중점 연결로 생긴 작은 삼각형의 넓이"
        : "중점 연결로 남은 사다리꼴의 넓이",
    topic: "중점 연결",
    unit: "cm²",
    rows: lengths,
    task: ([n]) => ({
      text: `삼각형 ABC에서 D, E는 각각 AB, AC의 중점이다. 삼각형 ABC의 넓이는 ${4 * n} cm²이다.`,
      target: mode === "small" ? "삼각형 ADE의 넓이" : "사각형 DBCE의 넓이",
      value: { n: mode === "small" ? n : 3 * n },
      model: midline(),
    }),
    relation: ([n], x) =>
      mode === "small" ? 4 * x === 4 * n : near(4 * n - x, n),
  });
const trapRows = rows(range(2, 10, 2), range(2, 8, 2));
for (const mode of ["midline", "base", "diagonal-midpoints"])
  RELATIONSHIP_SPECS.push({
    key: `trapezoid-${mode}`,
    title:
      mode === "midline"
        ? "사다리꼴의 중점 연결 선분"
        : mode === "base"
          ? "중점 연결 선분에서 사다리꼴 밑변"
          : "사다리꼴의 대각선 중점 사이",
    topic: "중점 연결",
    unit: "cm",
    rows: trapRows,
    task: ([a, delta]) => {
      const b = a + delta,
        m = trapezoid(a, b);
      if (mode === "diagonal-midpoints") {
        delete m.points.E;
        delete m.points.F;
        m.points.P = midpoint(m.points.A, m.points.C);
        m.points.Q = midpoint(m.points.B, m.points.D);
        m.edges = ["AB", "BC", "CD", "DA", "AC", "BD", "PQ"];
        m.parallel = [["AD", "BC"]];
      }
      return {
        text: `AD∥BC인 사다리꼴 ABCD에서 ${mode === "diagonal-midpoints" ? "P, Q는 각각 AC, BD의 중점" : "E, F는 각각 AB, DC의 중점"}이다. AD=${a} cm, ${mode === "base" ? `EF=${(a + b) / 2}` : `BC=${b}`} cm이다.`,
        target: `${mode === "base" ? "BC" : mode === "midline" ? "EF" : "PQ"}의 길이`,
        value: {
          n: mode === "base" ? b : mode === "midline" ? a + b : b - a,
          d: mode === "base" ? 1 : 2,
        },
        model: m,
      };
    },
    relation: ([a, d], x) =>
      mode === "base"
        ? x + a === 2 * a + d
        : mode === "midline"
          ? 2 * x === 2 * a + d
          : 2 * x + a === a + d,
  });

for (const power of [1, 2, 3]) {
  const quantity = power === 1 ? "길이" : power === 2 ? "넓이" : "부피";
  RELATIONSHIP_SPECS.push({
    key: `similarity-ratio-power-${power}`,
    title: `닮음비에서 ${quantity}비`,
    topic: "닮음",
    unit: "",
    rows: ratios,
    task: ([p, q]) => ({
      text: `${power === 3 ? "닮은 두 삼각기둥의 대응하는 밑면은 ABC, DEF이다." : "삼각형 ABC와 DEF는 이 순서로 서로 닮았다."} 대응변의 비 AB:DE=${p}:${q}이다.`,
      target: `${power === 3 ? "둘째 삼각기둥 부피 ÷ 첫째 삼각기둥 부피" : power === 2 ? "삼각형 DEF 넓이 ÷ 삼각형 ABC 넓이" : "DE ÷ AB"} (분수 또는 정수)`,
      value: { n: q ** power, d: p ** power },
      model: similar(p, q),
    }),
    relation: ([p, q], x) => near(x * p ** power, q ** power),
  });
  if (power > 1)
    RELATIONSHIP_SPECS.push({
      key: `similarity-length-from-power-${power}`,
      title: `${quantity}비에서 대응변의 비`,
      topic: "닮음",
      unit: "",
      rows: ratios,
      task: ([p, q]) => ({
        text: `${power === 3 ? "닮은 두 삼각기둥의 대응하는 밑면은 ABC, DEF이고 첫째:둘째 부피의 비" : "삼각형 ABC와 DEF는 이 순서로 서로 닮았고 ABC:DEF 넓이의 비"}는 ${p ** power}:${q ** power}이다.`,
        target: "DE ÷ AB (분수 또는 정수)",
        value: { n: q, d: p },
        model: similar(p, q),
      }),
      relation: ([p, q], x) => near(x ** power * p ** power, q ** power),
    });
  for (const reverse of [false, true])
    RELATIONSHIP_SPECS.push({
      key: `similarity-${quantity === "길이" ? "length" : quantity === "넓이" ? "area" : "volume"}-${reverse ? "reduce" : "enlarge"}`,
      title: `닮은 도형의 ${quantity} ${reverse ? "축소" : "확대"}`,
      topic: "닮음",
      unit: power === 1 ? "cm" : power === 2 ? "cm²" : "cm³",
      rows: ratios.flatMap((p) => range(1, 5).map((k) => [...p, k])),
      task: ([p, q, k]) => ({
        text: `${power === 3 ? "닮은 두 삼각기둥의 대응하는 밑면은 ABC, DEF이다." : "삼각형 ABC와 DEF는 이 순서로 서로 닮았다."} AB:DE=${p}:${q}, ${power === 1 ? (reverse ? "DE" : "AB") : `${reverse ? "둘째" : "첫째"} 도형의 ${quantity}`}=${k * (reverse ? q : p) ** power} ${power === 1 ? "cm" : power === 2 ? "cm²" : "cm³"}이다.`,
        target:
          power === 1
            ? `${reverse ? "AB" : "DE"}의 길이`
            : `${reverse ? "첫째" : "둘째"} 도형의 ${quantity}`,
        value: { n: k * (reverse ? p : q) ** power },
        model: similar(p, q),
      }),
      relation: ([p, q, k], x) =>
        near(x * (reverse ? q : p) ** power, k * p ** power * q ** power),
    });
}
RELATIONSHIP_SPECS.push({
  key: "similarity-perimeter",
  title: "닮은 삼각형의 둘레",
  topic: "닮음",
  unit: "cm",
  rows: ratios.flatMap((p) => range(1, 5).map((k) => [...p, k])),
  task: ([p, q, k]) => ({
    text: `삼각형 ABC와 DEF는 이 순서로 닮았고 AB:DE=${p}:${q}이다. 삼각형 ABC의 둘레는 ${12 * p * k} cm이다.`,
    target: "삼각형 DEF의 둘레",
    value: { n: 12 * q * k },
    model: similar(p, q),
  }),
  relation: ([p, q, k], x) => x * p === 12 * p * k * q,
});

// Explicit side coordinates keep all three given segment lengths in one metric.
const parallelRows = rows(range(3, 6), range(4, 7), range(1, 3)).filter(
  ([a, b]) => Math.abs(a - b) < 4,
);
for (const mode of ["side-part", "base", "whole-side"])
  RELATIONSHIP_SPECS.push({
    key: `parallel-triangle-${mode}`,
    title:
      mode === "side-part"
        ? "삼각형 평행선의 나머지 선분"
        : mode === "base"
          ? "삼각형 평행선의 밑변"
          : "삼각형 평행선의 전체 변",
    topic: "평행선과 선분비",
    unit: "cm",
    rows:
      mode === "base" ? parallelRows.filter(([, b]) => b === 5) : parallelRows,
    task: ([a, b, k]) => {
      const t = 1 / (k + 1),
        m = sides(a * (k + 1), b * (k + 1), 4 * (k + 1));
      m.points.D = lerp(m.points.A, m.points.B, t);
      m.points.E = lerp(m.points.A, m.points.C, t);
      m.edges.push("DE");
      m.parallel = [["DE", "BC"]];
      return {
        text: `삼각형 ABC에서 D는 AB 위, E는 AC 위에 있고 DE∥BC이다. AD=${a} cm, DB=${a * k} cm, ${mode === "base" ? "DE=4" : `AE=${b}`} cm이다.`,
        target: `${mode === "side-part" ? "EC" : mode === "base" ? "BC" : "AC"}의 길이`,
        value: {
          n:
            mode === "side-part"
              ? b * k
              : mode === "base"
                ? 4 * (k + 1)
                : b * (k + 1),
        },
        model: m,
      };
    },
    relation: ([a, b, k], x) =>
      mode === "side-part"
        ? x * a === b * a * k
        : mode === "base"
          ? x * a === 4 * a * (k + 1)
          : x * a === b * a * (k + 1),
  });
RELATIONSHIP_SPECS.push({
  key: "triangle-bisector-segment",
  title: "내각 이등분선의 선분비",
  topic: "각의 이등분선",
  unit: "cm",
  rows: rows(range(4, 7), range(5, 8), range(1, 3)).filter(
    ([a, b]) => a < b && b - a < 4,
  ),
  task: ([a, b, k]) => {
    const m = sides(a * k, b * k, 6 * k);
    m.points.D = lerp(m.points.B, m.points.C, a / (a + b));
    m.edges.push("AD");
    m.arcs = ["BAD", "DAC"];
    return {
      text: `삼각형 ABC에서 AD는 ∠BAC의 이등분선이고 D는 BC 위에 있다. AB=${a * k} cm, AC=${b * k} cm, BC=${6 * k} cm이다.`,
      target: "BD의 길이",
      value: { n: 6 * k * a, d: a + b },
      model: m,
    };
  },
  relation: ([a, b, k], x) => near(x * b, (6 * k - x) * a),
});
for (const mode of [
  "adjacent",
  "diagonal-half",
  "diagonal-whole",
  "area-quarter",
])
  RELATIONSHIP_SPECS.push({
    key: `parallelogram-${mode}`,
    title:
      mode === "adjacent"
        ? "평행사변형의 이웃한 각"
        : mode === "diagonal-half"
          ? "평행사변형의 반 대각선"
          : mode === "diagonal-whole"
            ? "평행사변형의 전체 대각선"
            : "평행사변형의 대각선과 넓이",
    topic: "평행사변형",
    unit: mode === "adjacent" ? "°" : mode === "area-quarter" ? "cm²" : "cm",
    rows: mode === "adjacent" ? rows(range(45, 80, 5)) : lengths,
    task: ([n]) => {
      const m =
        mode === "adjacent" ? parallelogram(n) : quadDiagonals(parallelogram());
      if (mode === "adjacent") m.arcs = ["DAB", "ABC"];
      else
        m.equal = [
          ["AO", "OC"],
          ["BO", "OD"],
        ];
      return {
        text: `평행사변형 ABCD${mode === "adjacent" ? `에서 ∠DAB=${n}°` : `의 두 대각선의 교점은 O이고, ${mode === "diagonal-half" ? `AC=${n} cm` : mode === "diagonal-whole" ? `AO=${n} cm` : `넓이는 ${4 * n} cm²`}`}이다.`,
        target:
          mode === "adjacent"
            ? "∠ABC"
            : mode === "diagonal-half"
              ? "AO의 길이"
              : mode === "diagonal-whole"
                ? "AC의 길이"
                : "삼각형 AOB의 넓이",
        value: {
          n:
            mode === "adjacent"
              ? 180 - n
              : mode === "diagonal-whole"
                ? 2 * n
                : n,
          d: mode === "diagonal-half" ? 2 : 1,
        },
        model: m,
      };
    },
    relation: ([n], x) =>
      mode === "adjacent"
        ? x + n === 180
        : mode === "diagonal-half"
          ? 2 * x === n
          : mode === "diagonal-whole"
            ? x === 2 * n
            : 4 * x === 4 * n,
  });
RELATIONSHIP_SPECS.push({
  key: "rectangle-diagonal-half",
  title: "직사각형의 두 대각선",
  topic: "직사각형",
  unit: "cm",
  rows: lengths,
  task: ([n]) => {
    const m = quadDiagonals(parallelogram(90));
    m.right = ["DAB", "ABC"];
    m.equal = [["AO", "BO", "CO", "DO"]];
    return {
      text: `직사각형 ABCD의 대각선의 교점은 O, AC=${n} cm이다.`,
      target: "BO의 길이",
      value: { n, d: 2 },
      model: m,
    };
  },
  relation: ([n], x) => 2 * x === n,
});
RELATIONSHIP_SPECS.push({
  key: "rhombus-diagonal-angle",
  title: "마름모의 대각선과 반각",
  topic: "마름모",
  unit: "°",
  rows: rows(range(40, 80, 4)),
  task: ([a]) => {
    const m = quadDiagonals(parallelogram(a, 1));
    m.equal = [["AB", "BC", "CD", "DA"]];
    m.right = ["AOB"];
    m.arcs = ["DAC", "CAB"];
    return {
      text: `마름모 ABCD의 두 대각선의 교점은 O, ∠DAB=${a}°이다.`,
      target: "∠CAB",
      value: { n: a / 2 },
      model: m,
    };
  },
  relation: ([a], x) => 2 * x === a,
});
RELATIONSHIP_SPECS.push({
  key: "isosceles-trapezoid-angle",
  title: "등변사다리꼴의 이웃한 각",
  topic: "등변사다리꼴",
  unit: "°",
  rows: rows(range(45, 75, 5)),
  task: ([a]) => {
    const h = Math.tan(rad(a));
    const m: Model = {
      points: { A: [-1, h], D: [1, h], B: [-2, 0], C: [2, 0] },
      edges: ["AB", "BC", "CD", "DA"],
      parallel: [["AD", "BC"]],
      equal: [["AB", "CD"]],
      arcs: ["ABC", "BAD"],
    };
    return {
      text: `AD∥BC, AB=CD인 등변사다리꼴 ABCD에서 ∠ABC=${a}°이다.`,
      target: "∠BAD",
      value: { n: 180 - a },
      model: m,
    };
  },
  relation: ([a], x) => x + a === 180,
});
