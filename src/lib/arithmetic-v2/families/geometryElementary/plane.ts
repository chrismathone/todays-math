import { product, range, type Spec } from "./core";
import {
  baseHeight,
  label,
  line,
  poly,
  rectangle,
  regularPolygon,
  rhombus,
  svg,
  tick,
  type Point,
} from "./svg";

const chapter = "1-6 다각형의 둘레와 넓이";
export const planeSpecs: Spec[] = [];
const pairs = product(range(4, 16), range(3, 14)).filter(
  ([a, b]) => a >= b && a <= 3 * b,
);
const bases = product(range(4, 18), range(4, 16)).filter(
  ([b, h]) => b <= 3 * h && h <= 2 * b,
);
const polygonName = (n: number) =>
  `정${({ 3: "삼", 5: "오", 6: "육", 7: "칠", 8: "팔" } as Record<number, string>)[n]}각형`;
function parallelogram(
  a: number,
  b: number,
  first: string,
  second: string,
  top = "",
) {
  const s = 130 / (a + b / 2),
    h = (Math.sqrt(3) * b * s) / 2;
  const x = 55,
    y = 175,
    shift = (b * s) / 2;
  const points: Point[] = [
    [x, y],
    [x + a * s, y],
    [x + a * s + shift, y - h],
    [x + shift, y - h],
  ];
  return svg(
    poly(points) +
      label(120, 215, first) +
      label(220, 125, second, -90) +
      line([205, 125], [x + a * s + shift / 2, y - h / 2], true) +
      (top ? label(120, 25, top) : ""),
  );
}

for (const shape of ["rectangle", "parallelogram"] as const) {
  const name = shape === "rectangle" ? "직사각형" : "평행사변형",
    draw = shape === "rectangle" ? rectangle : parallelogram;
  for (const inverse of [false, true]) {
    planeSpecs.push({
      id: `e5-${shape}-${inverse ? "perimeter-side" : "perimeter"}`,
      grade: "초5",
      chapter,
      title: inverse ? `${name}의 둘레에서 한 변` : `${name}의 둘레`,
      domain: pairs,
      present: ([a, b]) => ({
        givens: inverse
          ? `둘레 ${2 * (a + b)} cm, ${shape === "rectangle" ? "세로" : "옆변"} ${b} cm`
          : `이웃한 두 변 ${a} cm, ${b} cm`,
        instruction: inverse
          ? `${name}의 ${shape === "rectangle" ? "가로" : "밑변"}를 구하세요.`
          : `${name}의 둘레를 구하세요.`,
        unit: "cm",
        svg: () =>
          draw(
            a,
            b,
            inverse ? (shape === "rectangle" ? "가로" : "밑변") : `${a} cm`,
            `${b} cm`,
            inverse ? `둘레 ${2 * (a + b)} cm` : "",
          ),
      }),
      solve: ([a, b]) => [inverse ? a : 2 * (a + b), 1],
      holds: ([a, b], n, d) =>
        inverse ? 2 * (n + b * d) === 2 * (a + b) * d : n / 2 - a * d === b * d,
    });
  }
}
for (const shape of ["square", "rhombus"] as const) {
  const name = shape === "square" ? "정사각형" : "마름모";
  for (const inverse of [false, true]) {
    planeSpecs.push({
      id: `e5-${shape}-${inverse ? "perimeter-side" : "perimeter"}`,
      grade: "초5",
      chapter,
      title: inverse ? `${name}의 둘레에서 한 변` : `${name}의 둘레`,
      domain: range(2, 40).map((a) => [a]),
      present: ([a]) => ({
        givens: inverse ? `둘레 ${4 * a} cm` : `한 변 ${a} cm`,
        instruction: `${name}의 ${inverse ? "한 변의 길이" : "둘레"}를 구하세요.`,
        unit: "cm",
        svg: () => {
          const points: Point[] = [
            [55, 125],
            [120, 75],
            [185, 125],
            [120, 175],
          ];
          return shape === "square"
            ? rectangle(
                a,
                a,
                inverse ? "한 변" : `${a} cm`,
                "",
                inverse ? `둘레 ${4 * a} cm` : "",
                true,
              )
            : svg(
                poly(points) +
                  points.map((p, i) => tick(p, points[(i + 1) % 4])).join("") +
                  label(120, 215, inverse ? "한 변" : `한 변 ${a} cm`) +
                  (inverse ? label(120, 25, `둘레 ${4 * a} cm`) : ""),
              );
        },
      }),
      solve: ([a]) => [inverse ? a : 4 * a, 1],
      holds: ([a], n, d) => (inverse ? 4 * n === 4 * a * d : n === a * d * 4),
    });
  }
}
for (const inverse of [false, true]) {
  planeSpecs.push({
    id: `e5-regular-polygon-${inverse ? "perimeter-side" : "perimeter"}`,
    grade: "초5",
    chapter,
    title: inverse ? "정다각형의 둘레에서 한 변" : "정다각형의 둘레",
    domain: product([3, 5, 6, 7, 8], range(2, 25)),
    present: ([k, a]) => ({
      givens: `${polygonName(k)}, ${inverse ? `둘레 ${k * a}` : `한 변 ${a}`} cm`,
      instruction: `정다각형의 ${inverse ? "한 변의 길이" : "둘레"}를 구하세요.`,
      unit: "cm",
      svg: () =>
        regularPolygon(
          k,
          inverse ? "한 변" : `한 변 ${a} cm`,
          inverse ? `둘레 ${k * a} cm` : polygonName(k),
        ),
    }),
    solve: ([k, a]) => [inverse ? a : k * a, 1],
    holds: ([k, a], n, d) => (inverse ? k * n === k * a * d : n === k * a * d),
  });
}

// Three explicitly measured sides: ordinary perimeter addition, no theorem.
const triangleSides = product(range(4, 15), range(4, 15), range(4, 15)).filter(
  ([a, b, c]) =>
    a >= b &&
    b >= c &&
    b + c > a &&
    (b * b + c * c - a * a) / (2 * b * c) > -0.8,
);
for (const inverse of [false, true]) {
  planeSpecs.push({
    id: `e5-triangle-perimeter${inverse ? "-side" : ""}`,
    grade: "초5",
    chapter,
    title: inverse ? "삼각형의 둘레에서 한 변" : "삼각형의 둘레",
    domain: triangleSides,
    present: ([a, b, c]) => ({
      givens: inverse
        ? `둘레 ${a + b + c} cm, 두 변 ${b} cm, ${c} cm`
        : `세 변 ${a} cm, ${b} cm, ${c} cm`,
      instruction: inverse
        ? "밑변으로 표시한 변의 길이를 구하세요."
        : "삼각형의 둘레를 구하세요.",
      unit: "cm",
      svg: () => {
        const x = (a * a + c * c - b * b) / (2 * a),
          y = Math.sqrt(c * c - x * x),
          s = Math.min(130 / a, 112 / y);
        const left = 120 - (a * s) / 2,
          top: Point = [left + x * s, 180 - y * s],
          L: Point = [left, 180],
          R: Point = [left + a * s, 180];
        return svg(
          poly([L, R, top]) +
            label(120, 215, inverse ? "밑변" : `${a} cm`) +
            label(23, 125, `${c} cm`, -90) +
            line([38, 125], [(L[0] + top[0]) / 2, (L[1] + top[1]) / 2], true) +
            label(220, 125, `${b} cm`, -90) +
            line([205, 125], [(R[0] + top[0]) / 2, (R[1] + top[1]) / 2], true) +
            (inverse ? label(120, 25, `둘레 ${a + b + c} cm`) : ""),
        );
      },
    }),
    solve: ([a, b, c]) => [inverse ? a : a + b + c, 1],
    holds: ([a, b, c], n, d) =>
      inverse ? n + (b + c) * d === (a + b + c) * d : n - (b + c) * d === a * d,
  });
}

for (const inverse of [false, true]) {
  planeSpecs.push({
    id: `e5-rectangle-${inverse ? "area-side" : "area"}`,
    grade: "초5",
    chapter,
    title: inverse ? "직사각형의 넓이에서 가로" : "직사각형의 넓이",
    domain: pairs,
    present: ([a, b]) => ({
      givens: inverse
        ? `넓이 ${a * b} cm², 세로 ${b} cm`
        : `가로 ${a} cm, 세로 ${b} cm`,
      instruction: `직사각형의 ${inverse ? "가로" : "넓이"}를 구하세요.`,
      unit: inverse ? "cm" : "cm²",
      svg: () =>
        rectangle(
          a,
          b,
          inverse ? "가로" : `${a} cm`,
          `${b} cm`,
          inverse ? `넓이 ${a * b} cm²` : "",
        ),
    }),
    solve: ([a, b]) => [inverse ? a : a * b, 1],
    holds: ([a, b], n, d) => (inverse ? b * n === a * b * d : n / b === a * d),
  });
}
for (const inverse of [false, true]) {
  planeSpecs.push({
    id: `e5-square-${inverse ? "area-side" : "area"}`,
    grade: "초5",
    chapter,
    title: inverse ? "정사각형의 넓이에서 한 변" : "정사각형의 넓이",
    domain: range(2, 25).map((a) => [a]),
    present: ([a]) => ({
      givens: inverse ? `넓이 ${a * a} cm²` : `한 변 ${a} cm`,
      instruction: `정사각형의 ${inverse ? "한 변의 길이" : "넓이"}를 구하세요.`,
      unit: inverse ? "cm" : "cm²",
      svg: () =>
        rectangle(
          a,
          a,
          inverse ? "한 변" : `${a} cm`,
          "",
          inverse ? `넓이 ${a * a} cm²` : "",
          true,
        ),
    }),
    solve: ([a]) => [inverse ? a : a * a, 1],
    holds: ([a], n, d) =>
      inverse ? n > 0 && n * n === a * a * d * d : n === a * a * d,
  });
}
for (const shape of ["triangle", "parallelogram"] as const) {
  const name = shape === "triangle" ? "삼각형" : "평행사변형",
    divisor = shape === "triangle" ? 2 : 1;
  for (const target of ["area", "base", "height"] as const) {
    const title =
      target === "area"
        ? `${name}의 넓이`
        : `${name}의 넓이에서 ${target === "base" ? "밑변" : "높이"}`;
    planeSpecs.push({
      id: `e5-${shape}-area${target === "area" ? "" : `-${target}`}`,
      grade: "초5",
      chapter,
      title,
      domain: bases,
      present: ([b, h]) => {
        const A = (b * h) / divisor;
        return {
          givens:
            target === "area"
              ? `밑변 ${b} cm, 높이 ${h} cm`
              : `넓이 ${A} cm², ${target === "base" ? `높이 ${h}` : `밑변 ${b}`} cm`,
          instruction: `${name}의 ${target === "area" ? "넓이" : target === "base" ? "밑변의 길이" : "높이"}를 구하세요.`,
          unit: target === "area" ? "cm²" : "cm",
          svg: () =>
            baseHeight(
              shape,
              b,
              h,
              target === "base" ? "밑변" : `${b} cm`,
              target === "height" ? "높이" : `${h} cm`,
              0,
              "",
              target === "area" ? "" : `넓이 ${A} cm²`,
            ),
        };
      },
      solve: ([b, h]) =>
        target === "area" ? [b * h, divisor] : [target === "base" ? b : h, 1],
      holds: ([b, h], n, d) =>
        target === "area"
          ? divisor * n === b * h * d
          : target === "base"
            ? n * h === b * h * d
            : b * n === b * h * d,
    });
  }
}
for (const inverse of [false, true]) {
  planeSpecs.push({
    id: `e5-rhombus-area${inverse ? "-diagonal" : ""}`,
    grade: "초5",
    chapter,
    title: inverse ? "마름모의 넓이에서 대각선" : "마름모의 넓이",
    domain: pairs,
    present: ([a, b]) => ({
      givens: inverse
        ? `넓이 ${(a * b) / 2} cm², 세로 대각선 ${b} cm`
        : `두 대각선 ${a} cm, ${b} cm`,
      instruction: inverse
        ? "가로 대각선의 길이를 구하세요."
        : "마름모의 넓이를 구하세요.",
      unit: inverse ? "cm" : "cm²",
      svg: () =>
        rhombus(
          a,
          b,
          inverse ? "가로 대각선" : `${a} cm`,
          `${b} cm`,
          inverse ? `넓이 ${(a * b) / 2} cm²` : "",
        ),
    }),
    solve: ([a, b]) => (inverse ? [a, 1] : [a * b, 2]),
    holds: ([a, b], n, d) =>
      inverse ? n * b === a * b * d : 2 * n === a * b * d,
  });
}
const trapezoids = product(range(4, 10), range(10, 18), range(4, 12, 2)).filter(
  ([a, b]) => b >= a + 4,
);
for (const target of ["area", "height", "top", "bottom"] as const) {
  const targetName = {
    area: "넓이",
    height: "높이",
    top: "윗변",
    bottom: "아랫변",
  }[target];
  planeSpecs.push({
    id: `e5-trapezoid-area${target === "area" ? "" : `-${target}`}`,
    grade: "초5",
    chapter,
    title:
      target === "area"
        ? "사다리꼴의 넓이"
        : `사다리꼴의 넓이에서 ${targetName}`,
    domain: trapezoids,
    present: ([a, b, h]) => {
      const A = ((a + b) * h) / 2;
      const givens = [
        target === "area" ? "" : `넓이 ${A} cm²`,
        target === "top" ? "" : `윗변 ${a} cm`,
        target === "bottom" ? "" : `아랫변 ${b} cm`,
        target === "height" ? "" : `높이 ${h} cm`,
      ]
        .filter(Boolean)
        .join(", ");
      return {
        givens,
        instruction: `사다리꼴의 ${targetName}${target === "height" || target === "area" ? "를" : "의 길이를"} 구하세요.`,
        unit: target === "area" ? "cm²" : "cm",
        svg: () =>
          baseHeight(
            "trapezoid",
            b,
            h,
            target === "bottom" ? "아랫변" : `${b} cm`,
            target === "height" ? "높이" : `${h} cm`,
            a,
            target === "top" ? "윗변" : `${a} cm`,
            target === "area" ? "" : `넓이 ${A} cm²`,
          ),
      };
    },
    solve: ([a, b, h]) =>
      target === "area"
        ? [(a + b) * h, 2]
        : [target === "height" ? h : target === "top" ? a : b, 1],
    holds: ([a, b, h], n, d) =>
      target === "area"
        ? 2 * n === (a + b) * h * d
        : target === "height"
          ? (a + b) * n === (a + b) * h * d
          : (n + (target === "top" ? b : a) * d) * h === (a + b) * h * d,
  });
}
