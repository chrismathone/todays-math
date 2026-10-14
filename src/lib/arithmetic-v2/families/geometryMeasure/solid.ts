import {
  answer,
  cross,
  eq,
  eqPi,
  piValue,
  rational,
  range,
  squared,
  type Family,
} from "./core";
import {
  circle,
  dash,
  ellipse,
  label,
  line,
  poly,
  svg,
  type Point,
} from "./svg";

/** These are explicitly schematic projections. h (perpendicular height),
 * s (face slant height), l (cone generator), a (base edge) and r are distinct. */
function solid(
  kind: "prism" | "pyramid" | "cylinder" | "cone" | "sphere",
  top: string,
  bottom: string,
  dimension: string,
  slant = false,
) {
  let body = "";
  if (kind === "prism") {
    const base: Point[] = [
        [42, 165],
        [116, 165],
        [153, 141],
        [79, 141],
      ],
      upper = base.map(([x, y]): Point => [x, y - 90]);
    body =
      poly(base) +
      poly(upper) +
      base.map((p, i) => line(p, upper[i], i === 3 ? dash : "")).join("");
  } else if (kind === "pyramid") {
    const ps: Point[] = [
        [38, 161],
        [118, 179],
        [165, 146],
        [85, 128],
      ],
      apex: Point = [100, 54];
    body = poly(ps) + ps.map((p) => line(apex, p)).join("");
    if (slant)
      body +=
        line(apex, [78, 170], 'stroke-width="3"') +
        label([24, 105], "s", "dimension") +
        line([36, 107], [89, 112]);
    else
      body +=
        line(apex, [100, 151], dash) +
        label([196, 100], "h", "dimension") +
        line([184, 100], [104, 116]);
  } else if (kind === "cylinder") {
    body =
      ellipse([98, 69], 56, 17) +
      ellipse([98, 163], 56, 17) +
      line([42, 69], [42, 163]) +
      line([154, 69], [154, 163]) +
      line([98, 69], [154, 69]) +
      label([200, 57], "r", "dimension") +
      line([187, 62], [131, 69]);
  } else if (kind === "cone") {
    body =
      ellipse([99, 164], 61, 18) +
      line([99, 54], [38, 164]) +
      line([99, 54], [160, 164]) +
      line([99, 164], [160, 164]) +
      label([195, 176], "r", "dimension") +
      line([182, 170], [132, 164]);
    body += slant
      ? label([146, 106], "l", "dimension")
      : line([99, 54], [99, 164], dash) + label([112, 115], "h", "dimension");
  } else {
    body =
      circle([120, 118], 65) +
      ellipse([120, 118], 65, 17) +
      line([120, 118], [185, 118]) +
      label([207, 92], "r", "dimension") +
      line([195, 102], [155, 116]);
  }
  if ((kind === "prism" || kind === "cylinder") && dimension)
    body +=
      line([176, 70], [176, 164]) +
      line([171, 70], [181, 70]) +
      line([171, 164], [181, 164]) +
      label([203, 117], "h", "dimension");
  body += label([120, 23], top) + label([120, 213], bottom);
  // All numeric lengths are also in the prompt. Text avoids crowding 3-D edges.
  return svg(body);
}
const dims = cross(range(2, 10), range(2, 12, 2));

/** Direct inversions of the same grade-1 formulas. No quadratic solving:
 * a radius from cylinder/cone TOTAL surface area and height/generator is
 * deliberately excluded. Square/cube inverse domains have exact integer roots.
 * m1Solid.ts explicitly includes pyramid height, face height and cone generator
 * inversions; m1Stat.ts sphere volume/area conversions already recover r.
 */
export const SOLID_INVERSE_FAMILIES: Family[] = [
  ...(["prism", "pyramid"] as const).flatMap((kind) =>
    (["base-area", "height"] as const).map((target): Family => {
      const divisor = kind === "prism" ? 1 : 3,
        name = kind === "prism" ? "각기둥" : "각뿔";
      return {
        id: `m1-${kind}-${target}-volume`,
        grade: "중1",
        title: `${name}의 부피에서 ${target === "height" ? "높이" : "밑넓이"}`,
        domain:
          kind === "prism"
            ? cross(range(6, 60, 3), range(2, 12, 2))
            : cross(range(5, 50, 3), range(2, 11, 3)),
        present: ([b, h]) => {
          const volume = answer(rational(b * h, divisor)).text;
          const given =
            target === "height" ? `밑넓이 ${b} cm²` : `높이 h=${h} cm`;
          return {
            text: `${name}의 부피 ${volume} cm³, ${given}`,
            instruction: `${target === "height" ? "수직 높이 h" : "밑넓이"}를 구하세요. 그림은 겨냥도입니다.`,
            unit: target === "height" ? "cm" : "cm²",
            svg: () => solid(kind, `부피 ${volume} cm³`, given, "h"),
          };
        },
        solve: ([b, h]) => rational(target === "height" ? h : b),
        check: ([b, h], v) => eq(v, b * h, target === "height" ? b : h),
      };
    }),
  ),
  ...(["base-area", "height"] as const).map((target): Family => ({
    id: `m1-prism-${target}-surface`,
    grade: "중1",
    title: `직각기둥의 겉넓이에서 ${target === "height" ? "높이" : "밑넓이"}`,
    domain: cross(range(2, 6), range(2, 8), [3, 5, 7]).filter(
      ([a, b]) => a <= b,
    ),
    present: ([a, b, h]) => {
      const area = 2 * a * b + 2 * (a + b) * h,
        perimeter = 2 * (a + b);
      const other =
        target === "height" ? `밑넓이 ${a * b} cm²` : `높이 h=${h} cm`;
      return {
        text: `직각기둥의 겉넓이 ${area} cm², 밑면 둘레 ${perimeter} cm, ${other}`,
        instruction: `${target === "height" ? "수직 높이 h" : "밑넓이"}를 구하세요. 옆면은 모두 직사각형이며 그림은 겨냥도입니다.`,
        unit: target === "height" ? "cm" : "cm²",
        svg: () =>
          solid("prism", `겉넓이 ${area} cm²`, `밑둘레 ${perimeter} cm`, "h"),
      };
    },
    solve: ([a, b, h]) => rational(target === "height" ? h : a * b),
    check: ([a, b, h], v) => {
      const total = 2 * (a * b + a * h + b * h),
        perimeter = 2 * (a + b);
      return target === "height"
        ? eq(v, total - 2 * a * b, perimeter)
        : eq(v, total - perimeter * h, 2);
    },
  })),
  {
    id: "m1-pyramid-slant-surface",
    grade: "중1",
    title: "정사각뿔의 겉넓이에서 옆면 높이",
    domain: cross(range(2, 12, 2), range(3, 12)).filter(([a, s]) => s > a / 2),
    present: ([a, s]) => ({
      text: `정사각뿔의 겉넓이 ${a * a + 2 * a * s} cm², 밑면 한 변 a=${a} cm`,
      instruction: "옆면 삼각형의 높이 s를 구하세요. 그림은 겨냥도입니다.",
      unit: "cm",
      svg: () =>
        solid(
          "pyramid",
          `겉넓이 ${a * a + 2 * a * s} cm²`,
          `밑변 a = ${a} cm`,
          "s",
          true,
        ),
    }),
    solve: ([, s]) => rational(s),
    check: ([a, s], v) => eq(v, a * a + (4 * a * s) / 2 - a * a, 2 * a),
  },
  ...(["cylinder", "cone"] as const).flatMap((kind) =>
    (["height", "radius"] as const).map((target): Family => ({
      id: `m1-${kind}-${target}-volume`,
      grade: "중1",
      title: `${kind === "cylinder" ? "원기둥" : "원뿔"}의 부피에서 ${target === "height" ? "높이" : "반지름"}`,
      domain: dims,
      present: ([r, h]) => {
        const volume = answer(piValue(r * r * h, kind === "cone" ? 3 : 1)).text;
        const given =
          target === "height" ? `반지름 r=${r} cm` : `수직 높이 h=${h} cm`;
        return {
          text: `${kind === "cylinder" ? "원기둥" : "원뿔"}의 부피 ${volume} cm³, ${given}`,
          instruction: `${target === "height" ? "수직 높이 h" : "반지름 r"}를 구하세요. 그림은 겨냥도입니다.`,
          unit: "cm",
          svg: () =>
            solid(
              kind,
              `부피 ${volume} cm³`,
              target === "height" ? `r = ${r} cm` : `h = ${h} cm`,
              "h",
            ),
        };
      },
      solve: ([r, h]) => rational(target === "height" ? h : r),
      check: ([r, h], v) =>
        target === "height"
          ? eq(v, r * r * h, r * r)
          : squared(v, r * r * h, h),
    })),
  ),
  ...(["height", "radius"] as const).map((target): Family => ({
    id: `m1-cylinder-${target}-lateral`,
    grade: "중1",
    title: `원기둥의 옆넓이에서 ${target === "height" ? "높이" : "반지름"}`,
    domain: dims,
    present: ([r, h]) => ({
      text: `원기둥의 옆넓이 ${2 * r * h}π cm², ${target === "height" ? `반지름 r=${r}` : `수직 높이 h=${h}`} cm`,
      instruction: `${target === "height" ? "수직 높이 h" : "반지름 r"}를 구하세요. 그림은 겨냥도입니다.`,
      unit: "cm",
      svg: () =>
        solid(
          "cylinder",
          `옆넓이 ${2 * r * h}π cm²`,
          target === "height" ? `r = ${r} cm` : `h = ${h} cm`,
          "h",
        ),
    }),
    solve: ([r, h]) => rational(target === "height" ? h : r),
    check: ([r, h], v) => eq(v, 2 * r * h, 2 * (target === "height" ? r : h)),
  })),
  {
    id: "m1-cylinder-height-surface",
    grade: "중1",
    title: "원기둥의 겉넓이에서 높이",
    domain: dims,
    present: ([r, h]) => ({
      text: `원기둥의 겉넓이 ${2 * r * (r + h)}π cm², 반지름 r=${r} cm`,
      instruction: "수직 높이 h를 구하세요. 그림은 겨냥도입니다.",
      unit: "cm",
      svg: () =>
        solid("cylinder", `겉넓이 ${2 * r * (r + h)}π cm²`, `r = ${r} cm`, "h"),
    }),
    solve: ([, h]) => rational(h),
    check: ([r, h], v) => eq(v, 2 * r * (r + h) - 2 * r * r, 2 * r),
  },
  ...(
    ["radius-lateral", "generator-lateral", "generator-surface"] as const
  ).map((mode): Family => ({
    id: `m1-cone-${mode}`,
    grade: "중1",
    title: `원뿔의 ${mode.endsWith("surface") ? "겉넓이" : "옆넓이"}에서 ${mode.startsWith("radius") ? "반지름" : "모선"}`,
    domain: cross(range(2, 10), range(3, 14)).filter(([r, l]) => l > r),
    present: ([r, l]) => {
      const isRadius = mode.startsWith("radius"),
        isSurface = mode.endsWith("surface"),
        area = r * l + (isSurface ? r * r : 0);
      const measure = isSurface ? "겉넓이" : "옆넓이";
      return {
        text: `원뿔의 ${measure} ${area}π cm², ${isRadius ? `모선 l=${l}` : `반지름 r=${r}`} cm`,
        instruction: `${isRadius ? "반지름 r" : "모선 l"}의 길이를 구하세요. 그림은 겨냥도입니다.`,
        unit: "cm",
        svg: () =>
          solid(
            "cone",
            `${measure} ${area}π cm²`,
            isRadius ? `l = ${l} cm` : `r = ${r} cm`,
            "l",
            true,
          ),
      };
    },
    solve: ([r, l]) => rational(mode.startsWith("radius") ? r : l),
    check: ([r, l], v) =>
      mode.startsWith("radius")
        ? eq(v, r * l, l)
        : mode.endsWith("surface")
          ? eq(v, r * r + r * l - r * r, r)
          : eq(v, r * l, r),
  })),
  ...(["surface", "volume"] as const).map((mode): Family => ({
    id: `m1-sphere-radius-${mode}`,
    grade: "중1",
    title: `구의 ${mode === "surface" ? "겉넓이" : "부피"}에서 반지름`,
    domain: range(1, 15).map((r) => [r]),
    present: ([r]) => {
      const measure = mode === "surface" ? "겉넓이" : "부피",
        unit = mode === "surface" ? "cm²" : "cm³";
      const amount = answer(
        mode === "surface" ? piValue(4 * r * r) : piValue(4 * r * r * r, 3),
      ).text;
      return {
        text: `구의 ${measure} ${amount} ${unit}`,
        instruction: "반지름 r의 길이를 구하세요. 그림은 겨냥도입니다.",
        unit: "cm",
        svg: () =>
          solid("sphere", `${measure} ${amount} ${unit}`, "반지름 r", "r"),
      };
    },
    solve: ([r]) => rational(r),
    check: ([r], v) =>
      mode === "surface"
        ? squared(v, 4 * r * r, 4)
        : !v.pi && !v.a && v.r === 1 && v.n ** 3 === r ** 3 * v.d ** 3,
  })),
];
export const SOLID_FAMILIES: Family[] = [
  {
    id: "m1-prism-volume",
    grade: "중1",
    title: "각기둥의 부피",
    domain: cross(range(6, 60, 3), range(2, 12, 2)),
    present: ([b, h]) => ({
      text: `각기둥의 밑넓이 B=${b} cm², 수직 높이 h=${h} cm`,
      instruction: "각기둥의 부피를 구하세요. 그림은 겨냥도입니다.",
      unit: "cm³",
      svg: () => solid("prism", `밑넓이 ${b} cm²`, `h = ${h} cm`, "h"),
    }),
    solve: ([b, h]) => rational(b * h),
    check: ([b, h], v) => eq(v, b * h),
  },
  {
    id: "m1-prism-surface",
    grade: "중1",
    title: "직각기둥의 겉넓이",
    domain: cross(range(2, 6), range(2, 8), [3, 5, 7]).filter(
      ([a, b]) => a <= b,
    ),
    present: ([a, b, h]) => ({
      text: `직각기둥의 밑넓이 ${a * b} cm², 밑면 둘레 ${2 * (a + b)} cm, 수직 높이 h=${h} cm`,
      instruction:
        "모든 옆면이 직사각형인 기둥의 겉넓이를 구하세요. 그림은 겨냥도입니다.",
      unit: "cm²",
      svg: () =>
        solid("prism", `밑넓이 ${a * b} cm²`, `밑둘레 ${2 * (a + b)} cm`, "h"),
    }),
    solve: ([a, b, h]) => rational(2 * a * b + 2 * (a + b) * h),
    check: ([a, b, h], v) => eq(v, 2 * (a * b + a * h + b * h)),
  },
  ...(["volume", "surface", "lateral"] as const).map((mode): Family => ({
    id: `m1-cylinder-${mode}`,
    grade: "중1",
    title:
      mode === "volume"
        ? "원기둥의 부피"
        : mode === "surface"
          ? "원기둥의 겉넓이"
          : "원기둥의 옆넓이",
    domain: dims,
    present: ([r, h]) => ({
      text: `원기둥의 반지름 r=${r} cm, 수직 높이 h=${h} cm`,
      instruction: `${mode === "volume" ? "부피" : mode === "surface" ? "겉넓이" : "옆넓이"}를 구하세요. π는 그대로 쓰세요. 그림은 겨냥도입니다.`,
      unit: mode === "volume" ? "cm³" : "cm²",
      svg: () => solid("cylinder", `r = ${r} cm`, `h = ${h} cm`, "h"),
    }),
    solve: ([r, h]) =>
      piValue(
        mode === "volume"
          ? r * r * h
          : mode === "surface"
            ? 2 * r * (r + h)
            : 2 * r * h,
      ),
    check: ([r, h], v) =>
      eqPi(
        v,
        mode === "volume"
          ? r * r * h
          : mode === "surface"
            ? r * r + r * r + r * h + r * h
            : 2 * r * h,
      ),
  })),
  {
    id: "m1-pyramid-volume",
    grade: "중1",
    title: "각뿔의 부피",
    domain: cross(range(5, 50, 3), range(2, 11, 3)),
    present: ([b, h]) => ({
      text: `각뿔의 밑넓이 B=${b} cm², 수직 높이 h=${h} cm`,
      instruction: "각뿔의 부피를 구하세요. 그림은 겨냥도입니다.",
      unit: "cm³",
      svg: () => solid("pyramid", `밑넓이 ${b} cm²`, `h = ${h} cm`, "h"),
    }),
    solve: ([b, h]) => rational(b * h, 3),
    check: ([b, h], v) => eq(v, b * h, 3),
  },
  {
    id: "m1-pyramid-surface",
    grade: "중1",
    title: "정사각뿔의 겉넓이",
    domain: cross(range(2, 12, 2), range(3, 12)).filter(([a, s]) => s > a / 2),
    present: ([a, s]) => ({
      text: `정사각뿔의 밑면 한 변 a=${a} cm, 옆면 삼각형의 높이 s=${s} cm`,
      instruction:
        "겉넓이를 구하세요. s는 옆면의 높이입니다. 그림은 겨냥도입니다.",
      unit: "cm²",
      svg: () =>
        solid("pyramid", `밑변 a = ${a} cm`, `옆면 높이 s = ${s}`, "s", true),
    }),
    solve: ([a, s]) => rational(a * a + 2 * a * s),
    check: ([a, s], v) => eq(v, a * a + (4 * a * s) / 2),
  },
  ...(["volume", "surface", "lateral"] as const).map((mode): Family => ({
    id: `m1-cone-${mode}`,
    grade: "중1",
    title:
      mode === "volume"
        ? "원뿔의 부피"
        : mode === "surface"
          ? "원뿔의 겉넓이"
          : "원뿔의 옆넓이",
    domain:
      mode === "volume"
        ? dims
        : cross(range(2, 10), range(3, 14)).filter(([r, l]) => l > r),
    present: ([r, k]) => ({
      text: `원뿔의 반지름 r=${r} cm, ${mode === "volume" ? "수직 높이 h" : "모선 l"}=${k} cm`,
      instruction: `${mode === "volume" ? "부피" : mode === "surface" ? "겉넓이" : "옆넓이"}를 구하세요. π는 그대로 쓰세요. 그림은 겨냥도입니다.`,
      unit: mode === "volume" ? "cm³" : "cm²",
      svg: () =>
        solid(
          "cone",
          `r = ${r} cm`,
          `${mode === "volume" ? "h" : "l"} = ${k} cm`,
          "h",
          mode !== "volume",
        ),
    }),
    solve: ([r, k]) =>
      mode === "volume"
        ? piValue(r * r * k, 3)
        : piValue(r * k + (mode === "surface" ? r * r : 0)),
    check: ([r, k], v) =>
      mode === "volume"
        ? eqPi(v, r * r * k, 3)
        : eqPi(v, r * (k + (mode === "surface" ? r : 0))),
  })),
  ...(["surface", "volume"] as const).map((mode): Family => ({
    id: `m1-sphere-${mode}`,
    grade: "중1",
    title: mode === "surface" ? "구의 겉넓이" : "구의 부피",
    domain: range(1, 15).map((r) => [r]),
    present: ([r]) => ({
      text: `반지름 r=${r} cm인 구`,
      instruction: `${mode === "surface" ? "겉넓이" : "부피"}를 구하세요. π는 그대로 쓰세요. 그림은 겨냥도입니다.`,
      unit: mode === "surface" ? "cm²" : "cm³",
      svg: () => solid("sphere", `반지름 ${r} cm`, "", "r"),
    }),
    solve: ([r]) =>
      mode === "surface" ? piValue(4 * r * r) : piValue(4 * r * r * r, 3),
    check: ([r], v) =>
      mode === "surface" ? eqPi(v, 4 * r * r) : eqPi(v, 4 * r * r * r, 3),
  })),
];
