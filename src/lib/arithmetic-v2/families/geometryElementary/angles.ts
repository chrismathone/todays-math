import { product, range, type Spec } from "./core";
import {
  arc,
  label,
  line,
  polar,
  poly,
  right,
  svg,
  tick,
  type Point,
} from "./svg";

export const angleSpecs: Spec[] = [];
const chapter = "1-2 각도";
function leader(
  o: Point,
  radius: number,
  middle: number,
  x: number,
  y: number,
) {
  return line(polar(o, radius, middle), [x, y + (y < o[1] ? 16 : -16)], true);
}
for (const difference of [false, true]) {
  angleSpecs.push({
    id: `e4-angle-${difference ? "difference" : "sum"}`,
    grade: "초4",
    chapter,
    title: difference ? "각도의 차" : "각도의 합",
    domain: difference
      ? product(range(80, 160, 5), range(20, 70, 5)).filter(
          ([whole, part]) => whole - part >= 25,
        )
      : product(range(20, 70, 5), range(20, 70, 5)),
    present: ([a, b]) => ({
      givens: difference
        ? `전체 각 ${a}°, 작은 각 ${b}°`
        : `이웃한 두 각 ${a}°, ${b}°`,
      instruction: difference
        ? "큰 각 안에서 숫자가 없는 각의 크기를 구하세요."
        : "바깥쪽 큰 호로 표시한 전체 각의 크기를 구하세요.",
      unit: "°",
      svg: () => {
        const o: Point = [120, 170],
          split = difference ? b : a,
          end = difference ? a : a + b;
        const rays = [0, split, end]
          .map((angle) => line(o, polar(o, 85, angle)))
          .join("");
        if (difference)
          return svg(
            rays +
              arc(o, 28, 0, b, b) +
              arc(o, 43, b, a) +
              arc(o, 66, 0, a, a) +
              label(185, 30, `${b}°`) +
              leader(o, 28, b / 2, 185, 30) +
              label(55, 30, `${a}°`) +
              leader(o, 66, a / 2, 55, 30),
          );
        return svg(
          rays +
            arc(o, 28, 0, a, a) +
            arc(o, 43, a, a + b, b) +
            arc(o, 66, 0, a + b) +
            label(185, 30, `${a}°`) +
            leader(o, 28, a / 2, 185, 30) +
            label(55, 30, `${b}°`) +
            leader(o, 43, a + b / 2, 55, 30),
        );
      },
    }),
    solve: ([a, b]) => [difference ? a - b : a + b, 1],
    holds: ([a, b], n, d) =>
      difference ? n + b * d === a * d : n - a * d === b * d,
  });
}
for (const whole of [90, 180, 360]) {
  const name = whole === 90 ? "직각" : whole === 180 ? "평각" : "한 바퀴";
  angleSpecs.push({
    id: `e4-angle-${whole === 90 ? "right" : whole === 180 ? "straight" : "turn"}-remainder`,
    grade: "초4",
    chapter,
    title: `${name}에서 남은 각`,
    domain: range(
      whole === 360 ? 40 : 20,
      whole === 360 ? 320 : whole - 20,
      whole === 90 ? 1 : whole === 180 ? 2 : 5,
    ).map((a) => [a]),
    present: ([a]) => ({
      givens: `${name} ${whole}°, 주어진 각 ${a}°`,
      instruction: `${name}에서 숫자가 없는 호의 각도를 구하세요.`,
      unit: "°",
      svg: () => {
        const o: Point = whole === 360 ? [120, 120] : [120, 160],
          r = whole === 360 ? 68 : 82;
        const rays = [0, a, ...(whole === 360 ? [] : [whole])]
          .map((t) => line(o, polar(o, r, t)))
          .join("");
        const y = whole === 360 && a > 180 ? 220 : 25;
        return svg(
          rays +
            arc(o, 30, 0, a, a) +
            arc(o, 47, a, whole) +
            (whole === 90 ? right(...o) : "") +
            label(120, y, `${a}°`) +
            leader(o, 30, a / 2, 120, y),
        );
      },
    }),
    solve: ([a]) => [whole - a, 1],
    holds: ([a], n, d) => n + a * d === whole * d,
  });
}

function corner(
  points: Point[],
  i: number,
  known?: number,
): { body: string; middle: number } {
  const v = points[i],
    prev = points[(i + points.length - 1) % points.length],
    next = points[(i + 1) % points.length];
  const direction = (p: Point) =>
    ((Math.atan2(v[1] - p[1], p[0] - v[0]) * 180) / Math.PI + 360) % 360;
  let from = direction(prev),
    to = direction(next);
  if ((to - from + 360) % 360 > 180) [from, to] = [to, from];
  if (to < from) to += 360;
  return { body: arc(v, 14, from, to, known), middle: (from + to) / 2 };
}
// Fix one arc: four cyclic angles have only two independent givens. Varying
// all arcs would inflate capacity with different pictures of the same task.
const quadDomain = product([90], range(70, 110, 2), range(70, 110, 2)).filter(
  ([a, b, c]) => 360 - a - b - c >= 70 && 360 - a - b - c <= 110,
);
angleSpecs.push({
  id: "e4-quadrilateral-missing-angle",
  grade: "초4",
  chapter,
  title: "사각형의 빈 각",
  domain: quadDomain,
  present: ([a, b, c]) => {
    const d = 360 - a - b - c;
    const angles = [(b + c) / 2, (c + d) / 2, (d + a) / 2];
    return {
      givens: `세 각 ${angles.map((v) => `${v}°`).join(", ")}`,
      instruction: "사각형에서 숫자가 없는 각의 크기를 구하세요.",
      unit: "°",
      svg: () => {
        const center: Point = [120, 120];
        // Four cyclic vertices occupy successive quadrants. Actual chord angles
        // follow the inscribed-angle relation; no arbitrary rectangle silhouette.
        const points = [225, 225 + a, 225 + a + b, 225 + a + b + c].map((t) =>
          polar(center, 65, -t),
        );
        const places = [
          [45, 25],
          [195, 25],
          [195, 220],
        ];
        return svg(
          poly(points) +
            points
              .map((_, i) => {
                const k = corner(points, i, angles[i]);
                return (
                  k.body +
                  (i === 3
                    ? ""
                    : label(places[i][0], places[i][1], `${angles[i]}°`) +
                      leader(
                        points[i],
                        14,
                        k.middle,
                        places[i][0],
                        places[i][1],
                      ))
                );
              })
              .join(""),
        );
      },
    };
  },
  solve: ([a, b]) => [a + b, 2],
  holds: ([a, b, c], n, den) => {
    const d = 360 - a - b - c;
    return 2 * n + (b + c + (c + d) + (d + a)) * den === 720 * den;
  },
});
for (const target of ["base", "apex"] as const) {
  const toBase = target === "base";
  angleSpecs.push({
    id: `e4-isosceles-${target}-angle`,
    grade: "초4",
    chapter: "2-2 삼각형",
    title: `이등변삼각형의 ${toBase ? "밑각" : "꼭지각"}`,
    domain: range(25, 75)
      .filter((b) => b !== 60)
      .map((b) => [b]),
    present: ([b]) => ({
      givens: `${toBase ? `꼭지각 ${180 - 2 * b}` : `밑각 ${b}`}°`,
      instruction: `같은 표시가 있는 두 변의 길이는 같습니다. 숫자가 없는 ${toBase ? "밑각" : "꼭지각"}을 구하세요.`,
      unit: "°",
      svg: () => {
        const rawHeight = Math.tan((b * Math.PI) / 180),
          scale = Math.min(65, 120 / rawHeight),
          h = rawHeight * scale;
        const points: Point[] = [
          [120, 175 - h],
          [120 - scale, 175],
          [120 + scale, 175],
        ];
        const knownIndex = toBase ? 0 : 1,
          targetIndex = toBase ? 1 : 0,
          value = toBase ? 180 - 2 * b : b;
        const known = corner(points, knownIndex, value),
          blank = corner(points, targetIndex);
        const x = toBase ? 120 : 55,
          y = toBase ? 25 : 215;
        return svg(
          poly(points) +
            tick(points[0], points[1]) +
            tick(points[0], points[2]) +
            known.body +
            blank.body +
            label(x, y, `${value}°`) +
            leader(points[knownIndex], 14, known.middle, x, y),
        );
      },
    }),
    solve: ([b]) => [toBase ? b : 180 - 2 * b, 1],
    holds: ([b], n, d) =>
      toBase
        ? 2 * n + (180 - 2 * b) * d === 180 * d
        : n + 2 * b * d === 180 * d,
  });
}
