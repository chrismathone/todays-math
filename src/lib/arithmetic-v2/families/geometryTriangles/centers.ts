import {
  center,
  lerp,
  median,
  near,
  range,
  rightTriangle,
  rows,
  sides,
  triangle,
} from "./core";
import type { Model, Spec } from "./core";

const angles = rows(range(40, 80, 4));
const acutePairs = rows(range(45, 75, 10), range(45, 75, 10)).filter(
  ([a, b]) => 180 - a - b >= 40 && 180 - a - b <= 80,
);
const halfPairs = rows(range(20, 35, 5), range(20, 35, 5)).filter(
  ([a, b]) => 90 - a - b >= 20 && 90 - a - b <= 40,
);
const lengths = rows(range(2, 20));
const circleModel = (a: number, b?: number) => center(triangle(a, b), "O");
const inModel = (a: number, b?: number) => center(triangle(a, b), "I");
const arc = (m: Model, ...keys: string[]) => {
  m.arcs = keys;
  return m;
};
const basic = { topic: "외심", unit: "°", rows: angles };

export const CENTER_SPECS: Spec[] = [
  {
    ...basic,
    key: "obtuse-circum-central-angle",
    title: "둔각삼각형 외심의 작은 중심각",
    rows: rows(range(100, 150, 5)),
    task: ([a]) => ({
      text: `둔각삼각형 ABC의 외심은 O, ∠BAC=${a}°이다. O는 BC의 바깥쪽에 있고 ∠BOC는 180°보다 작은 각을 뜻한다.`,
      target: "∠BOC",
      value: { n: 360 - 2 * a },
      model: arc(circleModel(a), "BAC", "BOC"),
    }),
    relation: ([a], x) => near((360 - x) / 2, a),
  },
  {
    ...basic,
    key: "obtuse-circum-vertex-angle",
    title: "둔각삼각형의 작은 중심각에서 꼭짓각",
    rows: rows(range(100, 150, 5)),
    task: ([a]) => ({
      text: `∠BAC가 둔각인 삼각형 ABC의 외심은 O이다. O는 BC의 바깥쪽에 있고 180°보다 작은 ∠BOC=${360 - 2 * a}°이다.`,
      target: "∠BAC",
      value: { n: a },
      model: arc(circleModel(a), "BAC", "BOC"),
    }),
    relation: ([a], x) => near(2 * x + (360 - 2 * a), 360),
  },
  {
    ...basic,
    key: "obtuse-circum-base-angle",
    title: "둔각삼각형 외심과 두 반지름의 밑각",
    rows: rows(range(100, 150, 5)),
    task: ([a]) => ({
      text: `둔각삼각형 ABC의 외심은 O, ∠BAC=${a}°이다. O는 BC의 바깥쪽에 있다.`,
      target: "∠OBC",
      value: { n: a - 90 },
      model: arc(circleModel(a), "BAC", "OBC"),
    }),
    relation: ([a], x) => near(2 * x + 360 - 2 * a, 180),
  },
  {
    ...basic,
    key: "circum-central-angle",
    title: "외심의 중심각",
    task: ([a]) => ({
      text: `예각삼각형 ABC의 외심은 O, ∠BAC=${a}°이다.`,
      target: "∠BOC",
      value: { n: 2 * a },
      model: arc(circleModel(a), "BAC", "BOC"),
    }),
    relation: ([a], x) => near(x / 2, a),
  },
  {
    ...basic,
    key: "circum-vertex-angle",
    title: "외심의 중심각에서 꼭짓각",
    task: ([a]) => ({
      text: `예각삼각형 ABC의 외심은 O, ∠BOC=${2 * a}°이다.`,
      target: "∠BAC",
      value: { n: a },
      model: arc(circleModel(a), "BAC", "BOC"),
    }),
    relation: ([a], x) => near(2 * x, 2 * a),
  },
  {
    ...basic,
    key: "circum-radius-base-angle",
    title: "두 반지름이 만든 삼각형의 밑각",
    task: ([a]) => ({
      text: `예각삼각형 ABC의 외심은 O, ∠BOC=${2 * a}°이다.`,
      target: "∠OBC",
      value: { n: 90 - a },
      model: arc(circleModel(a), "BOC", "OBC"),
    }),
    relation: ([a], x) => near(2 * x + 2 * a, 180),
  },
  {
    ...basic,
    key: "circum-base-central-angle",
    title: "두 반지름의 밑각에서 중심각",
    task: ([a]) => ({
      text: `예각삼각형 ABC의 외심은 O, ∠OBC=${90 - a}°이다.`,
      target: "∠BOC",
      value: { n: 2 * a },
      model: arc(circleModel(a), "BOC", "OBC"),
    }),
    relation: ([a], x) => near(x + 2 * (90 - a), 180),
  },
  {
    ...basic,
    key: "circum-three-base-angles",
    title: "외심에서 나뉜 세 밑각",
    rows: acutePairs,
    task: ([a, b]) => ({
      text: `예각삼각형 ABC의 외심은 O, ∠OAB=${a + b - 90}°, ∠OBC=${90 - a}°이다.`,
      target: "∠OCA",
      value: { n: 90 - b },
      model: arc(circleModel(a, b), "OAB", "OBC", "OCA"),
    }),
    relation: ([a, b], x) => near(a + b - 90 + 90 - a + x, 90),
  },
  {
    ...basic,
    key: "circum-equal-radii",
    title: "외심에서 꼭짓점까지의 거리",
    unit: "cm",
    rows: lengths,
    task: ([r]) => ({
      text: `삼각형 ABC의 외심은 O, OA=${r} cm이다.`,
      target: "OB의 길이",
      value: { n: r },
      model: circleModel(64, 54),
    }),
    relation: ([r], x) => x === r,
  },
  {
    ...basic,
    key: "right-circumradius",
    title: "빗변에서 외접원 반지름",
    unit: "cm",
    rows: lengths,
    task: ([r]) => {
      const m = rightTriangle(4, 3);
      m.points.O = lerp(m.points.A, m.points.C, 0.5);
      m.edges.push("BO");
      m.equal = [["OA", "OB", "OC"]];
      return {
        text: `∠ABC=90°인 삼각형 ABC의 외심은 O, AC=${2 * r} cm이다.`,
        target: "OB의 길이",
        value: { n: r },
        model: m,
      };
    },
    relation: ([r], x) => 2 * x === 2 * r,
  },
  {
    ...basic,
    key: "right-circum-diameter",
    title: "외접원 반지름에서 빗변",
    unit: "cm",
    rows: lengths,
    task: ([r]) => {
      const m = rightTriangle(4, 3);
      m.points.O = lerp(m.points.A, m.points.C, 0.5);
      m.edges.push("BO");
      m.equal = [["OA", "OB", "OC"]];
      return {
        text: `∠ABC=90°인 삼각형 ABC의 외심은 O, OB=${r} cm이다.`,
        target: "AC의 길이",
        value: { n: 2 * r },
        model: m,
      };
    },
    relation: ([r], x) => x / 2 === r,
  },
  {
    ...basic,
    topic: "내심",
    key: "incenter-half-angle",
    title: "내심의 각 이등분",
    task: ([a]) => ({
      text: `삼각형 ABC의 내심은 I, ∠BAC=${a}°이다.`,
      target: "∠BAI",
      value: { n: a / 2 },
      model: arc(inModel(a), "BAI", "IAC"),
    }),
    relation: ([a], x) => 2 * x === a,
  },
  {
    ...basic,
    topic: "내심",
    key: "incenter-whole-angle",
    title: "내심의 반각에서 전체 각",
    task: ([a]) => ({
      text: `삼각형 ABC의 내심은 I, ∠BAI=${a / 2}°이다.`,
      target: "∠BAC",
      value: { n: a },
      model: arc(inModel(a), "BAI", "IAC"),
    }),
    relation: ([a], x) => x / 2 === a / 2,
  },
  {
    ...basic,
    topic: "내심",
    key: "incenter-central-angle",
    title: "내심에서 두 꼭짓점을 잇는 각",
    task: ([a]) => ({
      text: `삼각형 ABC의 내심은 I, ∠BAC=${a}°이다.`,
      target: "∠BIC",
      value: { n: 90 + a / 2 },
      model: arc(inModel(a), "BAC", "BIC"),
    }),
    relation: ([a], x) => 2 * (180 - x) + a === 180,
  },
  {
    ...basic,
    topic: "내심",
    key: "incenter-inverse-angle",
    title: "내심의 각에서 꼭짓각",
    task: ([a]) => ({
      text: `삼각형 ABC의 내심은 I, ∠BIC=${90 + a / 2}°이다.`,
      target: "∠BAC",
      value: { n: a },
      model: arc(inModel(a), "BAC", "BIC"),
    }),
    relation: ([a], x) => 2 * (180 - (90 + a / 2)) + x === 180,
  },
  {
    ...basic,
    topic: "내심",
    key: "incenter-three-half-angles",
    title: "내심에서 나뉜 세 반각",
    rows: halfPairs,
    task: ([p, q]) => ({
      text: `삼각형 ABC의 내심은 I, ∠BAI=${p}°, ∠IBC=${q}°이다.`,
      target: "∠ICA",
      value: { n: 90 - p - q },
      model: arc(inModel(2 * p, 2 * q), "BAI", "IBC", "ICA"),
    }),
    relation: ([p, q], x) => 2 * p + 2 * q + 2 * x === 180,
  },
  {
    ...basic,
    topic: "내심",
    key: "iso-incenter-base-half",
    title: "이등변삼각형의 내심과 밑각",
    task: ([a]) => {
      const m = inModel(a);
      m.equal = [["AB", "AC"]];
      return {
        text: `AB=AC인 삼각형 ABC의 내심은 I, ∠BAC=${a}°이다.`,
        target: "∠IBC",
        value: { n: 180 - a, d: 4 },
        model: arc(m, "BAC", "IBC"),
      };
    },
    relation: ([a], x) => 4 * x + a === 180,
  },
];

// 3-4-5 and 5-12-13 triangles guarantee mutually consistent r, area and perimeter.
const inDimensions = rows([0, 1], range(1, 10));
function dimensions(p: readonly number[]) {
  const [kind, k] = p;
  const a = (kind ? 5 : 3) * k,
    b = (kind ? 12 : 4) * k,
    c = (kind ? 13 : 5) * k;
  return {
    a,
    b,
    c,
    r: (a + b - c) / 2,
    area: (a * b) / 2,
    perimeter: a + b + c,
  };
}
function incircle(p: readonly number[]): Model {
  const { a, b, c, r } = dimensions(p),
    m = center(sides(c, a, b), "I");
  m.points.D = [m.points.I[0], 0];
  m.edges.push("ID");
  m.right = ["IDC", "ACB"];
  m.circles = [{ center: "I", radius: r }];
  return m;
}
for (const mode of [
  "area",
  "radius",
  "perimeter",
  "part-area",
  "right-radius",
] as const) {
  const names = {
    area: "내접원 반지름과 둘레에서 넓이",
    radius: "넓이와 둘레에서 내접원 반지름",
    perimeter: "넓이와 내접원 반지름에서 둘레",
    "part-area": "내심으로 나뉜 삼각형의 넓이",
    "right-radius": "직각삼각형의 내접원 반지름",
  };
  CENTER_SPECS.push({
    key: `incenter-${mode}`,
    title: names[mode],
    topic: "내심",
    unit: mode.includes("area") ? "cm²" : "cm",
    rows: inDimensions,
    task: (p) => {
      const { a, b, c, r, area, perimeter } = dimensions(p);
      return {
        text: `삼각형 ABC의 내심은 I, ID⊥BC이다. ${mode === "area" ? `내접원 반지름=${r} cm, 둘레=${perimeter} cm` : mode === "radius" ? `넓이=${area} cm², 둘레=${perimeter} cm` : mode === "perimeter" ? `넓이=${area} cm², 내접원 반지름=${r} cm` : mode === "part-area" ? `BC=${b} cm, ID=${r} cm` : `∠ACB=90°, AC=${a} cm, BC=${b} cm, AB=${c} cm`}이다.`,
        target:
          mode === "area"
            ? "삼각형 ABC의 넓이"
            : mode === "perimeter"
              ? "삼각형 ABC의 둘레"
              : mode === "part-area"
                ? "삼각형 IBC의 넓이"
                : "내접원 반지름",
        value: {
          n:
            mode === "area"
              ? area
              : mode === "perimeter"
                ? perimeter
                : mode === "part-area"
                  ? (b * r) / 2
                  : r,
        },
        model: incircle(p),
      };
    },
    relation: (p, x) => {
      const [kind, k] = p,
        a = (kind ? 5 : 3) * k,
        b = (kind ? 12 : 4) * k,
        c = (kind ? 13 : 5) * k;
      return mode === "area"
        ? near(2 * x, ((a + b - c) / 2) * (a + b + c))
        : mode === "radius" || mode === "right-radius"
          ? near(x * (a + b + c), a * b)
          : mode === "perimeter"
            ? near(x * ((a + b - c) / 2), a * b)
            : near(2 * x, b * ((a + b - c) / 2));
    },
  });
}
for (const [key, title, given, target, numerator, denominator] of [
  ["vertex-from-short", "무게중심에서 꼭짓점 쪽 선분", "GD", "AG", 2, 1],
  ["short-from-vertex", "무게중심에서 중점 쪽 선분", "AG", "GD", 1, 2],
  ["vertex-from-median", "중선에서 꼭짓점 쪽 선분", "AD", "AG", 2, 3],
  ["short-from-median", "중선에서 중점 쪽 선분", "AD", "GD", 1, 3],
  ["median-from-vertex", "꼭짓점 쪽 선분에서 중선", "AG", "AD", 3, 2],
  ["median-from-short", "중점 쪽 선분에서 중선", "GD", "AD", 3, 1],
] as const)
  CENTER_SPECS.push({
    key: `centroid-${key}`,
    title,
    topic: "무게중심",
    unit: "cm",
    rows: lengths,
    task: ([n]) => ({
      text: `G는 삼각형 ABC의 무게중심, D는 BC의 중점이다. ${given}=${n} cm이다.`,
      target: `${target}의 길이`,
      value: { n: n * numerator, d: denominator },
      model: median(),
    }),
    relation: ([n], x) => near(x * denominator, n * numerator),
  });
for (const parts of [3, 6])
  CENTER_SPECS.push({
    key: `centroid-area-${parts}`,
    title:
      parts === 3
        ? "무게중심과 한 변이 만드는 넓이"
        : "무게중심과 반 밑변이 만드는 넓이",
    topic: "무게중심",
    unit: "cm²",
    rows: rows(range(1, 20)),
    task: ([n]) => ({
      text: `G는 삼각형 ABC의 무게중심, D는 BC의 중점이다. 삼각형 ABC의 넓이는 ${6 * n} cm²이다.`,
      target: `삼각형 ${parts === 3 ? "GBC" : "GBD"}의 넓이`,
      value: { n: (6 * n) / parts },
      model: median(),
    }),
    relation: ([n], x) => parts * x === 6 * n,
  });

// A vertex bisector in an isosceles triangle is also its median and altitude.
for (const mode of ["angle", "base", "half-base"])
  CENTER_SPECS.push({
    key: `iso-bisector-${mode}`,
    title:
      mode === "angle"
        ? "이등변삼각형의 이등분선과 밑각"
        : mode === "base"
          ? "꼭지각 이등분선과 밑변"
          : "꼭지각 이등분선과 반 밑변",
    topic: "이등변삼각형",
    unit: mode === "angle" ? "°" : "cm",
    rows: mode === "angle" ? rows(range(20, 40, 2)) : lengths,
    task: ([n]) => {
      const m = triangle(mode === "angle" ? 2 * n : 64);
      m.points.D = lerp(m.points.B, m.points.C, 0.5);
      m.edges.push("AD");
      m.equal = [["AB", "AC"]];
      m.right = ["ADB"];
      m.arcs = ["BAD", "DAC", "ABD"];
      return {
        text: `AB=AC인 삼각형 ABC에서 AD는 꼭지각의 이등분선이다. ${mode === "angle" ? `∠BAD=${n}°` : mode === "base" ? `BD=${n} cm` : `BC=${2 * n} cm`}이다.`,
        target:
          mode === "angle"
            ? "∠ABD"
            : mode === "base"
              ? "BC의 길이"
              : "BD의 길이",
        value: { n: mode === "angle" ? 90 - n : mode === "base" ? 2 * n : n },
        model: m,
      };
    },
    relation: ([n], x) =>
      mode === "angle"
        ? x + n === 90
        : mode === "base"
          ? x === 2 * n
          : 2 * x === 2 * n,
  });
