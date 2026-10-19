import { decimal, product, range, type Spec } from "./core";
import { circle, solid } from "./svg";

export const solidCircleSpecs: Spec[] = [];
const dimensions = product(range(3, 10), range(3, 8), range(3, 10)).filter(
  ([w, d]) => w >= d,
);
for (const quantity of ["edges", "surface", "volume"] as const) {
  const grade = quantity === "edges" ? "초5" : "초6",
    chapter =
      quantity === "edges" ? "2-5 직육면체" : "1-6 직육면체의 겉넓이와 부피";
  const name = {
    edges: "모든 모서리 길이의 합",
    surface: "겉넓이",
    volume: "부피",
  }[quantity];
  const unit = { edges: "cm", surface: "cm²", volume: "cm³" }[quantity];
  const short = { edges: "모서리 합", surface: "겉넓이", volume: "부피" }[
    quantity
  ];
  for (const inverse of [false, true]) {
    solidCircleSpecs.push({
      id: `e${grade === "초5" ? 5 : 6}-cuboid-${quantity}${inverse ? "-height" : ""}`,
      grade,
      chapter,
      title: inverse ? `직육면체의 ${name}에서 높이` : `직육면체의 ${name}`,
      domain: dimensions,
      present: ([w, d, h]) => {
        const value =
          quantity === "edges"
            ? 4 * (w + d + h)
            : quantity === "surface"
              ? 2 * (w * d + d * h + h * w)
              : w * d * h;
        return {
          givens: `가로 ${w} cm, 세로 ${d} cm, ${inverse ? `${name} ${value} ${unit}` : `높이 ${h} cm`}`,
          instruction: `직육면체의 ${inverse ? "높이" : name}${!inverse && quantity === "edges" ? "을" : "를"} 구하세요. (겨냥도)`,
          unit: inverse ? "cm" : unit,
          svg: () =>
            solid(
              w,
              d,
              h,
              `${w} cm`,
              `${d} cm`,
              inverse ? "높이" : `${h} cm`,
              inverse ? `${short} ${value} ${unit}` : "",
            ),
        };
      },
      solve: ([w, d, h]) => [
        inverse
          ? h
          : quantity === "edges"
            ? 4 * (w + d + h)
            : quantity === "surface"
              ? 2 * (w * d + d * h + h * w)
              : w * d * h,
        1,
      ],
      holds: ([w, depth, h], n, den) => {
        if (inverse) {
          if (quantity === "edges")
            return (
              4 * (w * den + depth * den + n) === 4 * (w + depth + h) * den
            );
          if (quantity === "surface")
            return (
              2 * (w * depth * den + (w + depth) * n) ===
              2 * (w * depth + depth * h + h * w) * den
            );
          return w * depth * n === w * depth * h * den;
        }
        if (quantity === "edges") return n / 4 - (w + depth) * den === h * den;
        if (quantity === "surface")
          return n / 2 - w * depth * den === h * (w + depth) * den;
        return n / (w * depth) === h * den;
      },
    });
    solidCircleSpecs.push({
      id: `e${grade === "초5" ? 5 : 6}-cube-${quantity}${inverse ? "-side" : ""}`,
      grade,
      chapter,
      title: inverse ? `정육면체의 ${name}에서 모서리` : `정육면체의 ${name}`,
      domain: range(2, 25).map((a) => [a]),
      present: ([a]) => {
        const value =
          quantity === "edges"
            ? 12 * a
            : quantity === "surface"
              ? 6 * a * a
              : a * a * a;
        return {
          givens: inverse ? `${name} ${value} ${unit}` : `한 모서리 ${a} cm`,
          instruction: `정육면체의 ${inverse ? "한 모서리의 길이" : name}${!inverse && quantity === "edges" ? "을" : "를"} 구하세요. (겨냥도)`,
          unit: inverse ? "cm" : unit,
          svg: () =>
            solid(
              a,
              a,
              a,
              inverse ? "한 모서리" : `${a} cm`,
              "",
              "",
              inverse ? `${short} ${value} ${unit}` : "정육면체",
            ),
        };
      },
      solve: ([a]) => [
        inverse
          ? a
          : quantity === "edges"
            ? 12 * a
            : quantity === "surface"
              ? 6 * a * a
              : a * a * a,
        1,
      ],
      holds: ([a], n, d) =>
        inverse
          ? quantity === "edges"
            ? 12 * n === 12 * a * d
            : quantity === "surface"
              ? 6 * n * n === 6 * a * a * d * d
              : n ** 3 === a ** 3 * d ** 3
          : quantity === "edges"
            ? n === 12 * a * d
            : quantity === "surface"
              ? n / 6 === a * a * d
              : n / a === a * a * d,
    });
  }
}
for (const inverse of [false, true]) {
  solidCircleSpecs.push({
    id: `e6-cuboid-base-${inverse ? "height" : "volume"}`,
    grade: "초6",
    chapter: "1-6 직육면체의 겉넓이와 부피",
    title: inverse
      ? "직육면체의 부피와 밑넓이에서 높이"
      : "밑넓이와 높이로 직육면체의 부피",
    domain: product(range(12, 48, 3), range(3, 12)),
    present: ([A, h]) => ({
      givens: `밑넓이 ${A} cm², ${inverse ? `부피 ${A * h} cm³` : `높이 ${h} cm`}`,
      instruction: `직육면체의 ${inverse ? "높이" : "부피"}를 구하세요. (겨냥도)`,
      unit: inverse ? "cm" : "cm³",
      svg: () =>
        solid(
          A / 4,
          4,
          h,
          `밑넓이 ${A} cm²`,
          "",
          inverse ? "높이" : `${h} cm`,
          inverse ? `부피 ${A * h} cm³` : "",
        ),
    }),
    solve: ([A, h]) => [inverse ? h : A * h, 1],
    holds: ([A, h], n, d) => (inverse ? A * n === A * h * d : n / A === h * d),
  });
}

// Elementary circle answers use the stated classroom convention exactly.
// No binary floating multiplication and no implicit symbolic-pi convention.
const circleDomain = product(range(2, 30), [300, 314]);
function cents(n: number): string {
  return n % 100 === 0
    ? String(n / 100)
    : n % 10 === 0
      ? decimal(n / 10, 1)
      : decimal(n, 2);
}
for (const target of [
  "circumference-radius",
  "circumference-diameter",
  "area-radius",
  "area-diameter",
  "radius-circumference",
  "diameter-circumference",
  "radius-area",
  "diameter-area",
] as const) {
  const fromRadius = target.endsWith("-radius"),
    fromDiameter = target.endsWith("-diameter");
  const forward = fromRadius || fromDiameter,
    area = target.startsWith("area-") || target.endsWith("-area");
  const radiusTarget = target.startsWith("radius-");
  const givenName = forward
    ? fromRadius
      ? "반지름"
      : "지름"
    : area
      ? "넓이"
      : "원주";
  const targetName = forward
    ? area
      ? "넓이"
      : "원주"
    : radiusTarget
      ? "반지름"
      : "지름";
  solidCircleSpecs.push({
    id: `e6-circle-${target}`,
    grade: "초6",
    chapter: "2-5 원의 둘레와 넓이",
    title: `원의 ${givenName}에서 ${targetName}`,
    domain: circleDomain,
    present: ([r, pi]) => {
      const shown = forward
        ? `${fromRadius ? r : 2 * r} cm`
        : `${cents((area ? r * r : 2 * r) * pi)} ${area ? "cm²" : "cm"}`;
      return {
        givens: `${givenName} ${shown}, 원주율 ${cents(pi)}`,
        instruction: `원의 ${targetName}${targetName === "반지름" || targetName === "지름" ? "을" : "를"} 구하세요. (원주율: ${cents(pi)})`,
        unit: forward && area ? "cm²" : "cm",
        svg: () =>
          circle(
            forward ? (fromRadius ? "radius" : "diameter") : "none",
            `${givenName} ${shown}`,
            `원주율 ${cents(pi)}`,
          ),
      };
    },
    solve: ([r, pi]) =>
      forward
        ? [(area ? r * r : 2 * r) * pi, 100]
        : [radiusTarget ? r : 2 * r, 1],
    holds: ([r, pi], n, d) => {
      if (forward)
        return area ? 100 * n === r * r * pi * d : 100 * n === 2 * r * pi * d;
      const multiplier = radiusTarget ? 1 : 2;
      return area
        ? n * n * pi === r * r * pi * multiplier * multiplier * d * d
        : 2 * n * pi === 2 * r * pi * multiplier * d;
    },
  });
}
