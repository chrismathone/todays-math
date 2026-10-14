import {
  cross,
  eq,
  radical,
  range,
  rational,
  squared,
  type Family,
  type Value,
} from "./core";
import { angle, label, line, poly, right, svg, type Point } from "./svg";

const special = (theta: number, mode: number): Value => {
  // sin, cos, tan; radicals are reduced by the shared display normalizer only.
  if (mode === 0)
    return theta === 30
      ? rational(1, 2)
      : theta === 45
        ? radical(1, 2, 2)
        : radical(1, 3, 2);
  if (mode === 1)
    return theta === 30
      ? radical(1, 3, 2)
      : theta === 45
        ? radical(1, 2, 2)
        : rational(1, 2);
  return theta === 30
    ? radical(1, 3, 3)
    : theta === 45
      ? rational(1)
      : radical(1, 3);
};
const names = ["sin", "cos", "tan"];
function triangle(
  theta: number,
  sideLabels: Record<string, string>,
  numericAngle: boolean,
) {
  const width = Math.min(134, 110 / Math.tan((theta * Math.PI) / 180)),
    height = width * Math.tan((theta * Math.PI) / 180);
  const A: Point = [47, 174],
    B: Point = [47 + width, 174],
    C: Point = [B[0], 174 - height];
  let body =
    poly([A, B, C]) +
    right(B, A, C) +
    angle(B, A, C, numericAngle ? theta : undefined, 22) +
    label([31, 194], "A", "vertex");
  if (numericAngle)
    body += label([29, 140], `${theta}°`) + line([44, 146], [67, 164]);
  if (sideLabels.opposite)
    body += label([205, (B[1] + C[1]) / 2], sideLabels.opposite);
  if (sideLabels.adjacent)
    body += label([(A[0] + B[0]) / 2, 193], sideLabels.adjacent);
  if (sideLabels.hypotenuse)
    body +=
      label([98, 31], sideLabels.hypotenuse) +
      line([98, 44], [(A[0] + C[0]) / 2 - 8, (A[1] + C[1]) / 2 - 7]);
  return svg(body);
}
const triples = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [20, 21, 29],
  [21, 20, 29],
];
const sideNames = ["opposite", "adjacent", "hypotenuse"];
const modes = [
  [2, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [1, 0],
  [0, 1],
];
const sideLabel = ["a", "b", "c"];
export const TRIG_FAMILIES: Family[] = [
  {
    id: "m3-trig-ratio",
    grade: "중3",
    title: "직각삼각형의 삼각비",
    domain: cross(range(0, triples.length - 1), range(1, 5), [0, 1, 2]),
    present: ([i, k, m]) => {
      const [a, b, c] = triples[i].map((n) => n * k),
        theta = (Math.atan2(a, b) * 180) / Math.PI;
      const given =
        m === 0
          ? `맞은편 변 a=${a}, 빗변 c=${c}`
          : m === 1
            ? `이웃한 변 b=${b}, 빗변 c=${c}`
            : `맞은편 변 a=${a}, 이웃한 변 b=${b}`;
      const labels: Record<string, string> =
        m === 0
          ? { opposite: String(a), hypotenuse: String(c) }
          : m === 1
            ? { adjacent: String(b), hypotenuse: String(c) }
            : { opposite: String(a), adjacent: String(b) };
      return {
        text: `직각삼각형에서 ∠A의 ${given} (cm)`,
        instruction: `${names[m]} A의 값을 기약분수로 구하세요.`,
        unit: "",
        svg: () => triangle(theta, labels, false),
      };
    },
    solve: ([i, , m]) =>
      rational(triples[i][m === 1 ? 1 : 0], triples[i][m === 2 ? 1 : 2]),
    check: ([i, k, m], v) =>
      eq(v, triples[i][m === 1 ? 1 : 0] * k, triples[i][m === 2 ? 1 : 2] * k),
  },
  {
    id: "m3-trig-special-value",
    grade: "중3",
    title: "특수각의 삼각비",
    domain: cross([30, 45, 60], [0, 1, 2]),
    present: ([t, m]) => ({
      text: `직각삼각형에서 ∠A=${t}°`,
      instruction: `${names[m]} A의 정확한 값을 구하세요.`,
      unit: "",
      svg: () => triangle(t, {}, true),
    }),
    solve: ([t, m]) => special(t, m),
    check: ([t, m], v) => {
      const sn = t === 30 ? 1 : t === 45 ? 2 : 3,
        cs = 4 - sn;
      return squared(v, m === 0 ? sn : m === 1 ? cs : sn, m === 2 ? cs : 4);
    },
  },
  {
    id: "m3-trig-special-length",
    grade: "중3",
    title: "특수각의 삼각비로 변의 길이",
    domain: cross([30, 45, 60], range(2, 20), range(0, 5)),
    present: ([t, k, m]) => {
      const [given, target] = modes[m],
        labels: Record<string, string> = {
          [sideNames[given]]: `${sideLabel[given]}=${k}`,
          [sideNames[target]]: sideLabel[target],
        };
      return {
        text: `직각삼각형에서 ∠A=${t}°, ${sideLabel[given]}=${k} cm (a: A의 맞은편, b: 이웃한 변, c: 빗변)`,
        instruction: `${sideLabel[target]}의 길이를 구하세요. 근호는 간단히 하세요.`,
        unit: "cm",
        svg: () => triangle(t, labels, true),
      };
    },
    solve: ([t, k, m]) => {
      const v = special(t, m < 2 ? m : m < 4 ? m - 2 : 2);
      return m === 2 || m === 3 || m === 5
        ? radical(k * v.d, v.r, v.n * v.r)
        : radical(k * v.n, v.r, v.d);
    },
    check: ([t, k, m], v) => {
      const sinN = t === 30 ? 1 : t === 45 ? 2 : 3,
        cosN = 4 - sinN;
      const [num, den] =
        m === 0
          ? [sinN, 4]
          : m === 1
            ? [cosN, 4]
            : m === 2
              ? [4, sinN]
              : m === 3
                ? [4, cosN]
                : m === 4
                  ? [sinN, cosN]
                  : [cosN, sinN];
      return squared(v, k * k * num, den);
    },
  },
  {
    id: "m3-trig-triangle-area",
    grade: "중3",
    title: "두 변과 끼인각으로 삼각형 넓이",
    domain: cross(range(2, 10, 2), range(2, 10, 2), [30, 45, 60, 90]).filter(
      ([a, b]) => a <= b,
    ),
    present: ([a, b, t]) => ({
      text: `삼각형의 두 변 ${a} cm, ${b} cm와 그 끼인각 ${t}°`,
      instruction: "삼각형의 넓이를 구하세요. 근호는 간단히 하세요.",
      unit: "cm²",
      svg: () => {
        const scale = 130 / Math.max(a, b),
          A: Point = [55, 177],
          B: Point = [55 + a * scale, 177],
          C: Point = [
            55 + b * scale * Math.cos((t * Math.PI) / 180),
            177 - b * scale * Math.sin((t * Math.PI) / 180),
          ];
        return svg(
          poly([A, B, C]) +
            (t === 90 ? right(A, B, C) : angle(B, A, C, t, 19)) +
            label([120, 215], `${a} cm`) +
            label([105, 25], `${b} cm`) +
            line([105, 39], [(A[0] + C[0]) / 2 - 6, (A[1] + C[1]) / 2 - 6]) +
            (t === 90
              ? ""
              : label([28, 140], `${t}°`) + line([42, 142], [72, 170])),
        );
      },
    }),
    solve: ([a, b, t]) =>
      t === 90
        ? rational(a * b, 2)
        : t === 30
          ? rational(a * b, 4)
          : radical(a * b, t === 45 ? 2 : 3, 4),
    check: ([a, b, t], v) =>
      squared(
        v,
        a * a * b * b * (t === 30 ? 1 : t === 45 ? 2 : t === 60 ? 3 : 4),
        16,
      ),
  },
];
