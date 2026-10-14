import { lerp, median, near, range, rows, sides, trapezoid } from "./core";
import type { Model, Spec } from "./core";

export const PROPORTION_SPECS: Spec[] = [
  {
    key: "centroid-median-sum",
    title: "세 중선과 꼭짓점 쪽 선분의 합",
    topic: "무게중심",
    unit: "cm",
    rows: rows(range(4, 30)),
    task: ([n]) => {
      const m = median();
      m.points.E = lerp(m.points.A, m.points.C, 0.5);
      m.points.F = lerp(m.points.A, m.points.B, 0.5);
      m.edges.push("BE", "CF");
      return {
        text: `G는 삼각형 ABC의 무게중심이다. D, E, F는 각각 BC, CA, AB의 중점이고 AD+BE+CF=${3 * n} cm이다.`,
        target: "AG+BG+CG",
        value: { n: 2 * n },
        model: m,
      };
    },
    relation: ([n], x) => 3 * x === 2 * 3 * n,
  },
  {
    key: "triangle-median-area",
    title: "중선으로 나뉜 삼각형의 넓이",
    topic: "중선과 넓이",
    unit: "cm²",
    rows: rows(range(2, 30)),
    task: ([n]) => {
      const m = sides(13, 15, 14);
      m.points.D = lerp(m.points.B, m.points.C, 0.5);
      m.edges.push("AD");
      m.equal = [["BD", "DC"]];
      return {
        text: `삼각형 ABC에서 D는 BC의 중점이다. 삼각형 ABC의 넓이는 ${2 * n} cm²이다.`,
        target: "삼각형 ABD의 넓이",
        value: { n },
        model: m,
      };
    },
    relation: ([n], x) => 2 * x === 2 * n,
  },
  {
    key: "same-height-area-ratio",
    title: "같은 높이를 가진 삼각형의 넓이",
    topic: "평행선과 넓이",
    unit: "cm²",
    rows: rows(range(2, 5), range(2, 5), range(2, 4)).filter(
      ([a, b]) => a !== b,
    ),
    task: ([a, b, k]) => {
      const m: Model = {
        points: { A: [(a + b) / 2, 2 * k], B: [0, 0], C: [a + b, 0] },
        edges: ["AB", "BC", "CA"],
      };
      m.points.D = lerp(m.points.B, m.points.C, a / (a + b));
      m.edges.push("AD");
      return {
        text: `삼각형 ABC에서 D는 BC 위에 있다. BD=${a} cm, DC=${b} cm이고 삼각형 ABD의 넓이는 ${a * k} cm²이다.`,
        target: "삼각형 ADC의 넓이",
        value: { n: b * k },
        model: m,
      };
    },
    relation: ([a, b, k], x) => x * a === a * k * b,
  },
  {
    key: "three-parallel-segments",
    title: "세 평행선 사이의 선분비",
    topic: "평행선과 선분비",
    unit: "cm",
    rows: rows(range(3, 6), range(3, 6), [2, 3]),
    task: ([a, b, k]) => {
      const dx = Math.sqrt(k * k - 1),
        offset = (a + b) / 2;
      const m: Model = {
        points: {
          A: [0, a + b],
          B: [0, b],
          C: [0, 0],
          D: [offset, a + b],
          E: [offset + a * dx, b],
          F: [offset + (a + b) * dx, 0],
        },
        edges: ["AC", "DF", "AD", "BE", "CF"],
        parallel: [["AD", "BE", "CF"]],
      };
      return {
        text: `세 평행선 AD, BE, CF가 두 직선과 만난다. A, B, C와 D, E, F는 각각 이 순서로 한 직선 위에 있다. AB=${a} cm, BC=${b} cm, DE=${a * k} cm이다.`,
        target: "EF의 길이",
        value: { n: b * k },
        model: m,
      };
    },
    relation: ([a, b, k], x) => a * x === b * a * k,
  },
  {
    key: "trapezoid-parallel-section",
    title: "사다리꼴의 평행한 단면 선분",
    topic: "평행선과 선분비",
    unit: "cm",
    rows: rows(range(3, 6), range(2, 5), [1, 2], [2, 3]),
    task: ([a, delta, p, q]) => {
      const b = a + delta;
      return {
        text: `사다리꼴 ABCD에서 E는 AB 위, F는 DC 위에 있고 AD∥EF∥BC이다. AD=${a} cm, BC=${b} cm, AE:EB=${p}:${q}이다.`,
        target: "EF의 길이",
        value: { n: q * a + p * b, d: p + q },
        model: trapezoid(a, b, p / (p + q)),
      };
    },
    relation: ([a, delta, p, q], x) => near((x - a) * (p + q), delta * p),
  },
];
// These acute triangles have a well-defined external angle bisector. The
// extension AX is drawn, and D is genuinely outside BC (beyond C).
for (const inverse of [false, true])
  PROPORTION_SPECS.push({
    key: `external-bisector-${inverse ? "base" : "part"}`,
    title: inverse ? "외각 이등분선에서 밑변" : "외각 이등분선의 바깥 선분",
    topic: "각의 이등분선",
    unit: "cm",
    rows: rows([0, 1, 2], range(1, 6)).map(([i, k]) => [
      i,
      inverse ? k * [3, 3, 4][i] : k,
    ]),
    task: ([i, k]) => {
      const [a, b, c] = [
        [8, 5, 7],
        [7, 4, 6],
        [9, 5, 8],
      ][i].map((v) => v * k);
      const m = sides(a, b, c),
        { A, B } = m.points;
      m.points.D = [(c * a) / (a - b), 0];
      m.points.X = [2 * A[0] - B[0], 2 * A[1] - B[1]];
      m.edges.push("AD", "CD", "AX");
      m.arcs = ["XAD", "DAC"];
      return {
        text: `BC를 C 쪽으로 연장한 직선 위의 점 D에 대하여 AD는 외각 ∠XAC의 이등분선이다. X는 BA를 A 쪽으로 연장한 직선 위에 있다. AB=${a} cm, AC=${b} cm, ${inverse ? `BD=${(c * a) / (a - b)}` : `BC=${c}`} cm이다.`,
        target: `${inverse ? "BC" : "CD"}의 길이`,
        value: inverse ? { n: c } : { n: c * b, d: a - b },
        model: m,
      };
    },
    relation: ([i, k], x) => {
      const [a, b, c] = [
        [8, 5, 7],
        [7, 4, 6],
        [9, 5, 8],
      ][i];
      return inverse
        ? near(((c * k * a) / (a - b) - x) * a, (c * k * a * b) / (a - b))
        : near(x * a, (c * k + x) * b);
    },
  });

for (const inverse of [false, true])
  PROPORTION_SPECS.push({
    key: `midpoint-triangle-perimeter-${inverse ? "whole" : "part"}`,
    title: inverse
      ? "중점 삼각형에서 원래 둘레"
      : "세 중점으로 만든 삼각형의 둘레",
    topic: "중점 연결",
    unit: "cm",
    rows: rows(range(3, 30)),
    task: ([n]) => {
      const m = sides(13, 15, 14);
      m.points.D = lerp(m.points.A, m.points.B, 0.5);
      m.points.E = lerp(m.points.A, m.points.C, 0.5);
      m.points.F = lerp(m.points.B, m.points.C, 0.5);
      m.edges.push("DE", "EF", "FD");
      m.equal = [
        ["AD", "DB"],
        ["AE", "EC"],
        ["BF", "FC"],
      ];
      return {
        text: `삼각형 ABC에서 D, E, F는 각각 AB, AC, BC의 중점이다. 삼각형 ${inverse ? "DEF" : "ABC"}의 둘레는 ${n} cm이다.`,
        target: `삼각형 ${inverse ? "ABC" : "DEF"}의 둘레`,
        value: { n: inverse ? 2 * n : n, d: inverse ? 1 : 2 },
        model: m,
      };
    },
    relation: ([n], x) => (inverse ? x === 2 * n : 2 * x === n),
  });
