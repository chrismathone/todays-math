import { decimal, product, range, type Spec } from "./core";
import {
  circle,
  label,
  line,
  polar,
  poly,
  svg,
  unitFigure,
  type Point,
} from "./svg";

export const measurementSpecs: Spec[] = [];
function conversion(
  id: string,
  grade: Spec["grade"],
  chapter: string,
  large: string,
  small: string,
  factor: number,
) {
  measurementSpecs.push({
    id,
    grade,
    chapter,
    title: `${large}와 ${small} 단위 바꾸기`,
    domain: product([0, 1], range(2, 50)),
    present: ([reverse, n]) => {
      const from = reverse ? `${n * factor} ${small}` : `${n} ${large}`,
        unit = reverse ? large : small;
      return {
        givens: from,
        instruction: `${unit} 단위로 나타내세요.`,
        unit,
        svg: () => unitFigure(from, `${unit}로 나타내기`),
      };
    },
    solve: ([reverse, n]) => [reverse ? n : n * factor, 1],
    holds: ([reverse, n], a, d) =>
      reverse ? a * factor === n * factor * d : a === n * factor * d,
  });
}
conversion("e2-length-m-cm", "초2", "2-3 길이 재기", "m", "cm", 100);
conversion("e3-length-cm-mm", "초3", "1-5 길이와 시간", "cm", "mm", 10);
conversion("e3-length-km-m", "초3", "1-5 길이와 시간", "km", "m", 1000);
conversion("e3-capacity-l-ml", "초3", "2-5 들이와 무게", "L", "mL", 1000);
conversion(
  "e5-area-m2-cm2",
  "초5",
  "1-6 다각형의 둘레와 넓이",
  "m²",
  "cm²",
  10000,
);
conversion(
  "e5-area-km2-m2",
  "초5",
  "1-6 다각형의 둘레와 넓이",
  "km²",
  "m²",
  1000000,
);
conversion(
  "e6-volume-m3-cm3",
  "초6",
  "1-6 직육면체의 겉넓이와 부피",
  "m³",
  "cm³",
  1000000,
);
for (const [id, grade, chapter, large, small, factor, remainders] of [
  ["e2-length-mixed-cm", "초2", "2-3 길이 재기", "m", "cm", 100, range(1, 99)],
  ["e3-length-mixed-mm", "초3", "1-5 길이와 시간", "cm", "mm", 10, range(1, 9)],
  [
    "e3-length-mixed-m",
    "초3",
    "1-5 길이와 시간",
    "km",
    "m",
    1000,
    range(50, 950, 50),
  ],
  [
    "e3-capacity-mixed-ml",
    "초3",
    "2-5 들이와 무게",
    "L",
    "mL",
    1000,
    range(50, 950, 50),
  ],
] as const) {
  measurementSpecs.push({
    id,
    grade,
    chapter,
    title: `복합 단위를 ${small}로 바꾸기`,
    domain: product(range(1, 9), [...remainders]),
    present: ([a, b]) => ({
      givens: `${a} ${large} ${b} ${small}`,
      instruction: `${small} 단위로 나타내세요.`,
      unit: small,
      svg: () =>
        unitFigure(`${a} ${large} ${b} ${small}`, `${small}로 나타내기`),
    }),
    solve: ([a, b]) => [a * factor + b, 1],
    holds: ([a, b], n, d) => n - b * d === a * factor * d,
  });
}
measurementSpecs.push({
  id: "e6-volume-decimal-units",
  grade: "초6",
  chapter: "1-6 직육면체의 겉넓이와 부피",
  title: "소수인 부피 단위 바꾸기",
  domain: product(
    [0, 1],
    range(1, 99).filter((n) => n % 10 !== 0),
  ),
  present: ([reverse, n]) => {
    const from = reverse ? `${n * 100000} cm³` : `${decimal(n, 1)} m³`,
      unit = reverse ? "m³" : "cm³";
    return {
      givens: from,
      instruction: `${unit} 단위로 나타내세요.`,
      unit,
      svg: () => unitFigure(from, `${unit}로 나타내기`),
    };
  },
  solve: ([reverse, n]) => (reverse ? [n, 10] : [n * 100000, 1]),
  holds: ([reverse, n], a, d) =>
    reverse ? 10 * a === n * d : a === n * 100000 * d,
});

for (const operation of ["sum", "difference", "broken"] as const) {
  const title =
    operation === "sum"
      ? "두 길이의 합"
      : operation === "difference"
        ? "두 길이의 차"
        : "꺾인 선의 길이";
  measurementSpecs.push({
    id: `e2-length-${operation}`,
    grade: "초2",
    chapter: "2-3 길이 재기",
    title,
    domain: product(range(3, 24), range(3, 24)).filter(([a, b]) =>
      operation === "difference" ? a > b : a >= b,
    ),
    present: ([a, b]) => ({
      givens: `${a} cm, ${b} cm`,
      instruction: `${title}${operation === "sum" ? "을" : "를"} 구하세요.`,
      unit: "cm",
      svg: () => {
        const s = 130 / Math.max(a, b);
        return operation === "broken"
          ? svg(
              poly(
                [
                  [55, 70],
                  [55 + a * s, 70],
                  [55 + a * s, 70 + b * s],
                ],
                false,
              ) +
                label(120, 30, `${a} cm`) +
                label(220, 140, `${b} cm`, -90),
            )
          : svg(
              line([55, 85], [55 + a * s, 85]) +
                line([55, 165], [55 + b * s, 165]) +
                label(120, 55, `${a} cm`) +
                label(120, 200, `${b} cm`),
            );
      },
    }),
    solve: ([a, b]) => [operation === "difference" ? a - b : a + b, 1],
    holds: ([a, b], n, d) =>
      operation === "difference" ? n + b * d === a * d : n - a * d === b * d,
  });
}

// Multiple separated polygons give a small, meaningful addition/counting task.
// A single polygon has only four answers and is better kept as recognition.
const groups: number[][] = [];
for (const count of [2, 3, 4]) {
  for (const row of product(
    ...Array.from({ length: count }, () => range(3, 6)),
  ))
    if (row.every((n, i) => !i || row[i - 1] <= n)) groups.push(row);
}
for (const what of ["sides", "vertices"] as const) {
  const name = what === "sides" ? "변" : "꼭짓점";
  measurementSpecs.push({
    id: `e2-polygon-${what}-total`,
    grade: "초2",
    chapter: "1-2 여러 가지 도형",
    title: `여러 도형의 ${name} 수`,
    domain: groups,
    present: (p) => ({
      givens: p.map((n) => `${n}각형`).join(", "),
      instruction: `그림에 있는 모든 ${name}의 수를 구하세요.`,
      unit: "개",
      svg: () =>
        svg(
          p
            .map((n, i) => {
              const center: Point =
                p.length === 2
                  ? [65 + 110 * i, 120]
                  : [65 + 110 * (i % 2), 65 + 110 * Math.floor(i / 2)];
              const points = Array.from({ length: n }, (_, k) =>
                polar(center, 37, 90 + (k * 360) / n),
              );
              return (
                poly(points) +
                (what === "vertices"
                  ? points
                      .map(
                        ([x, y]) =>
                          `<circle cx="${x}" cy="${y}" r="2.5" fill="#000"/>`,
                      )
                      .join("")
                  : "")
              );
            })
            .join(""),
        ),
    }),
    solve: (p) => [p.reduce((sum, n) => sum + n, 0), 1],
    holds: (p, n, d) =>
      p.reduce((remaining, sides) => remaining - sides * d, n) === 0,
  });
}

for (const target of ["radius", "diameter"] as const) {
  const toRadius = target === "radius",
    title = toRadius ? "지름에서 반지름" : "반지름에서 지름";
  measurementSpecs.push({
    id: `e3-circle-${target}`,
    grade: "초3",
    chapter: "2-3 원",
    title,
    domain: range(2, 50).map((r) => [r]),
    present: ([r]) => ({
      givens: `${toRadius ? "지름" : "반지름"} ${toRadius ? 2 * r : r} cm`,
      instruction: `원의 ${toRadius ? "반지름" : "지름"}을 구하세요.`,
      unit: "cm",
      svg: () =>
        circle(
          toRadius ? "diameter" : "radius",
          `${toRadius ? "지름" : "반지름"} ${toRadius ? 2 * r : r} cm`,
        ),
    }),
    solve: ([r]) => [toRadius ? r : 2 * r, 1],
    holds: ([r], n, d) => (toRadius ? n * 2 === 2 * r * d : n === 2 * r * d),
  });
}

// Non-formula area counting: the actual unit squares are visible and equal-area.
measurementSpecs.push({
  id: "e5-unit-square-area",
  grade: "초5",
  chapter: "1-6 다각형의 둘레와 넓이",
  title: "단위 정사각형으로 넓이 구하기",
  domain: product(range(2, 8), range(2, 8)).filter(([w, h]) => w >= h),
  present: ([w, h]) => ({
    givens: `가로 ${w}칸, 세로 ${h}칸, 한 칸 1 cm²`,
    instruction: "정사각형 한 칸의 넓이는 1 cm²입니다. 전체 넓이를 구하세요.",
    unit: "cm²",
    svg: () => {
      const s = 128 / w,
        x = 56,
        y = 125 - (h * s) / 2;
      return svg(
        poly([
          [x, y],
          [x + w * s, y],
          [x + w * s, y + h * s],
          [x, y + h * s],
        ]) +
          range(1, w - 1)
            .map((i) => line([x + i * s, y], [x + i * s, y + h * s]))
            .join("") +
          range(1, h - 1)
            .map((i) => line([x, y + i * s], [x + w * s, y + i * s]))
            .join("") +
          label(120, 25, "한 칸 1 cm²"),
      );
    },
  }),
  solve: ([w, h]) => [w * h, 1],
  holds: ([w, h], n, d) => n / w === h * d,
});
