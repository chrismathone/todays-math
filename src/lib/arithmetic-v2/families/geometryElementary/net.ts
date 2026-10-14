import { decimal, product, range, type Spec } from "./core";
import { fmt, label, line, poly, right, svg } from "./svg";

const cents = (n: number) =>
  n % 100 === 0
    ? String(n / 100)
    : n % 10 === 0
      ? decimal(n / 10, 1)
      : decimal(n, 2);
// g6.ts:1447 explicitly computes the rectangle obtained by unfolding the
// cylindrical lateral face. Direct inverses do not introduce solid volume.
const sizes = range(2, 10).flatMap((r) =>
  product([r], range(2 * r, 4 * r), [300, 314]),
);
export const netSpecs: Spec[] = (
  ["area", "height", "radius", "diameter"] as const
).map((target) => {
  const lengthTarget = target === "radius" || target === "diameter";
  const targetName = {
    area: "옆면의 넓이",
    height: "높이",
    radius: "밑면의 반지름",
    diameter: "밑면의 지름",
  }[target];
  return {
    id: `e6-cylinder-net-${target === "area" ? "area" : `area-${target}`}`,
    grade: "초6",
    chapter: "2-6 원기둥, 원뿔, 구",
    title:
      target === "area"
        ? "원기둥의 옆면을 펼친 직사각형의 넓이"
        : `원기둥의 옆면 넓이에서 ${targetName}`,
    // Radius and diameter are distinct public givens for area/height tasks.
    // No irrelevant mode is retained for radius/diameter inverse tasks.
    domain: lengthTarget
      ? sizes
      : sizes.flatMap((p) => [0, 1].map((mode) => [...p, mode])),
    present: ([r, h, pi, mode]) => {
      const diameter = lengthTarget ? target === "diameter" : mode === 1;
      const baseName = diameter ? "밑면 지름" : "밑면 반지름";
      const A = cents(2 * r * h * pi),
        piText = cents(pi);
      const givens = [
        target === "area" ? "" : `옆면 넓이 ${A} cm²`,
        lengthTarget ? "" : `${baseName} ${diameter ? 2 * r : r} cm`,
        target === "height" ? "" : `높이 ${h} cm`,
        `원주율 ${piText}`,
      ]
        .filter(Boolean)
        .join(", ");
      return {
        givens,
        instruction:
          target === "area"
            ? `원기둥의 옆면을 펼친 직사각형의 넓이를 구하세요. (원주율: ${piText})`
            : `가운데 직사각형이 원기둥의 옆면입니다. ${targetName}${target === "height" ? "를" : "을"} 구하세요. (원주율: ${piText})`,
        unit: target === "area" ? "cm²" : "cm",
        svg: () => {
          // Real geometric net: W=2*pi*r. The explicitly stated 3 or 3.14
          // is the arithmetic approximation, not a distorted circular base.
          const scale = Math.min(140 / (2 * Math.PI * r), 140 / (h + 4 * r));
          const R = r * scale,
            W = 2 * Math.PI * R,
            H = h * scale;
          const x = 120 - W / 2,
            y = 125 - H / 2,
            centerY = y - R;
          return svg(
            poly([
              [x, y],
              [x + W, y],
              [x + W, y + H],
              [x, y + H],
            ]) +
              right(x, y, 1, 1) +
              `<circle data-drill-net-base="true" cx="120" cy="${fmt(centerY)}" r="${fmt(R)}"/><circle data-drill-net-base="true" cx="120" cy="${fmt(y + H + R)}" r="${fmt(R)}"/>` +
              line([diameter ? 120 - R : 120, centerY], [120 + R, centerY]) +
              `<circle cx="120" cy="${fmt(centerY)}" r="2.3" fill="#000"/>` +
              label(
                120,
                215,
                lengthTarget
                  ? baseName
                  : `${baseName} ${diameter ? 2 * r : r} cm`,
              ) +
              label(
                220,
                125,
                target === "height" ? "높이" : `높이 ${h} cm`,
                -90,
              ) +
              label(
                120,
                22,
                target === "area" ? `원주율 ${piText}` : `옆면 ${A} cm²`,
              ),
          );
        },
      };
    },
    solve: ([r, h, pi]) =>
      target === "area"
        ? [2 * r * h * pi, 100]
        : [target === "height" ? h : target === "radius" ? r : 2 * r, 1],
    holds: ([r, h, pi], n, d) => {
      if (target === "area") return 100 * n === 2 * r * h * pi * d;
      if (target === "height") return 2 * r * pi * n === 2 * r * h * pi * d;
      return (target === "radius" ? 2 : 1) * n * h * pi === 2 * r * h * pi * d;
    },
  } satisfies Spec;
});
