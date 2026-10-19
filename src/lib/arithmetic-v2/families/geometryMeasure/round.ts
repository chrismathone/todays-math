import {
  answer,
  cross,
  eq,
  eqPi,
  piValue,
  radical,
  rational,
  range,
  squared,
  type Family,
} from "./core";
import {
  angle,
  arc,
  circle,
  dash,
  label,
  line,
  polar,
  right,
  svg,
  type Point,
} from "./svg";

const rs = range(2, 15),
  angles = [30, 45, 60, 90, 120, 135, 150, 180, 240, 270];
function roundFigure(
  r: number,
  theta: number | undefined,
  caption: string,
  radiusLabel: string,
  targetRadius = false,
) {
  const O: Point = [120, 117],
    A: Point = [190, 117];
  const B = polar(O, 70, theta ?? 0);
  return svg(
    (theta === undefined ? circle(O, 70) : arc(O, 70, 0, theta) + line(O, B)) +
      line(
        O,
        A,
        targetRadius ? 'stroke-width="3" data-drill-segment="target"' : "",
      ) +
      (theta === undefined ? "" : arc(O, 20, 0, theta)) +
      label([120, 25], caption) +
      label([120, 214], radiusLabel) +
      (radiusLabel.startsWith("r =") || radiusLabel === "반지름 r"
        ? line([158, 198], [158, 121])
        : ""),
  );
}
export const ROUND_FAMILIES: Family[] = [
  ...(
    ["circumference", "area", "radius-circumference", "radius-area"] as const
  ).map((mode): Family => ({
    id: `m1-circle-${mode}`,
    grade: "중1",
    title: {
      circumference: "원의 둘레",
      area: "원의 넓이",
      "radius-circumference": "원주에서 반지름",
      "radius-area": "원의 넓이에서 반지름",
    }[mode],
    domain: rs.map((r) => [r]),
    present: ([r]) => {
      const inverse = mode.startsWith("radius"),
        given =
          mode === "radius-area"
            ? `넓이 ${r * r}π cm²`
            : mode === "radius-circumference"
              ? `원주 ${2 * r}π cm`
              : `반지름 ${r} cm`;
      return {
        text: `${given}인 원`,
        instruction: `${inverse ? "반지름" : mode === "area" ? "넓이" : "둘레"}를 구하세요. π는 기호 그대로 쓰세요.`,
        unit: mode === "area" ? "cm²" : "cm",
        svg: () =>
          roundFigure(
            r,
            undefined,
            inverse ? given : "",
            inverse ? "반지름 r" : `r = ${r} cm`,
            inverse,
          ),
      };
    },
    solve: ([r]) =>
      mode.startsWith("radius")
        ? rational(r)
        : piValue(mode === "area" ? r * r : 2 * r),
    check: ([r], v) =>
      mode === "radius-area"
        ? squared(v, r * r)
        : mode === "radius-circumference"
          ? eq(v, 2 * r, 2)
          : mode === "area"
            ? eqPi(v, r * r)
            : eqPi(v, 2 * r),
  })),
  ...(
    [
      "arc",
      "area",
      "perimeter",
      "angle-arc",
      "angle-area",
      "radius-arc",
      "radius-area",
      "area-arc",
    ] as const
  ).map((mode): Family => ({
    id: `m1-sector-${mode}`,
    grade: "중1",
    title: {
      arc: "부채꼴의 호의 길이",
      area: "부채꼴의 넓이",
      perimeter: "부채꼴의 둘레",
      "angle-arc": "호의 길이에서 중심각",
      "angle-area": "부채꼴의 넓이에서 중심각",
      "radius-arc": "호의 길이에서 반지름",
      "radius-area": "부채꼴의 넓이에서 반지름",
      "area-arc": "호와 반지름에서 부채꼴 넓이",
    }[mode],
    domain: cross(range(2, 10, 2), angles),
    present: ([r, t]) => {
      const arcText = answer(piValue(r * t, 180)).text,
        areaText = answer(piValue(r * r * t, 360)).text;
      const findAngle = mode.startsWith("angle"),
        findRadius = mode.startsWith("radius"),
        byArea = mode.endsWith("-area");
      const knownMeasure = byArea ? `넓이 ${areaText} cm²` : `호 ${arcText} cm`;
      const top =
        findAngle || mode === "area-arc" ? knownMeasure : `중심각 ${t}°`;
      const bottom = findRadius ? knownMeasure : `r = ${r} cm`;
      const target = findAngle
        ? "중심각"
        : findRadius
          ? "반지름"
          : mode === "arc"
            ? "호의 길이"
            : mode === "perimeter"
              ? "둘레"
              : "넓이";
      return {
        text: `부채꼴: ${top}, ${bottom}`,
        instruction: `${target}를 구하세요. π는 기호 그대로 쓰세요.`,
        unit: findAngle
          ? "°"
          : mode === "area" || mode === "area-arc"
            ? "cm²"
            : "cm",
        svg: () => roundFigure(r, t, top, bottom, findRadius),
      };
    },
    solve: ([r, t]) =>
      mode.startsWith("angle")
        ? rational(t)
        : mode.startsWith("radius")
          ? rational(r)
          : mode === "arc"
            ? piValue(r * t, 180)
            : mode === "perimeter"
              ? piValue(r * t, 180, 2 * r)
              : piValue(r * r * t, 360),
    check: ([r, t], v) =>
      mode === "angle-arc"
        ? eq(v, r * t, r)
        : mode === "angle-area"
          ? eq(v, r * r * t, r * r)
          : mode === "radius-arc"
            ? eq(v, r * t, t)
            : mode === "radius-area"
              ? squared(v, r * r * t, t)
              : mode === "arc"
                ? eqPi(v, 2 * r * t, 360)
                : mode === "perimeter"
                  ? eqPi(v, 2 * r * t, 360, 2 * r)
                  : eqPi(v, r * r * t, 360),
  })),
];

function chord(r: number, h: number, inverse: boolean) {
  const half = inverse ? h : Math.sqrt(r * r - h * h),
    dist = inverse ? Math.sqrt(r * r - h * h) : h;
  const O: Point = [120, 108],
    scale = 70 / r,
    H: Point = [120, 108 + dist * scale],
    A: Point = [120 - half * scale, H[1]],
    B: Point = [120 + half * scale, H[1]];
  return svg(
    circle(O, 70) +
      line(
        A,
        B,
        inverse ? "" : 'stroke-width="3" data-drill-segment="target"',
      ) +
      line(
        O,
        H,
        `${dash} ${inverse ? 'stroke-width="3" data-drill-segment="target"' : ""}`,
      ) +
      line(O, B) +
      right(H, O, B) +
      label([108, 91], "O", "vertex") +
      label([A[0] - 14, A[1] + 10], "A", "vertex") +
      label([B[0] + 14, B[1] + 10], "B", "vertex") +
      label([104, H[1] - 14], "M", "vertex") +
      label([120, 23], `반지름 ${r} cm`) +
      label([120, 218], inverse ? `AB = ${2 * h} cm` : `OM = ${h} cm`),
  );
}
export const CHORD_FAMILIES: Family[] = [
  ...([false, true] as const).map((inverse): Family => ({
    id: inverse ? "m3-circle-chord-distance" : "m3-circle-chord-length",
    grade: "중3",
    title: inverse ? "현과 중심 사이의 거리" : "중심에서의 거리로 현의 길이",
    domain: cross(range(5, 13), range(2, 9)).filter(
      ([r, h]) => h / r >= 0.35 && h / r <= 0.75,
    ),
    present: ([r, h]) => ({
      text: `원 O의 반지름 ${r} cm, OM⊥AB, ${inverse ? `AB=${2 * h}` : `OM=${h}`} cm`,
      instruction: `${inverse ? "중심에서 현까지의 거리 OM" : "현 AB의 길이"}을 구하세요. 근호는 간단히 하세요.`,
      unit: "cm",
      svg: () => chord(r, h, inverse),
    }),
    solve: ([r, h]) => radical(inverse ? 1 : 2, r * r - h * h),
    check: ([r, h], v) => squared(v, (inverse ? 1 : 4) * (r * r - h * h)),
  })),
  {
    id: "m3-circle-tangent-angle",
    grade: "중3",
    title: "접선과 반지름의 직각에서 빈 각",
    domain: range(25, 65, 5).map((a) => [a]),
    present: ([a]) => ({
      text: `T는 접점, OT는 반지름이다. 접선 TP와 PO가 이루는 ∠TPO=${a}°일 때 ∠POT`,
      instruction: "표시된 ∠POT의 크기를 구하세요.",
      unit: "°",
      svg: () => {
        const O: Point = [82, 112],
          T: Point = [82, 172],
          P: Point = [82 + 60 / Math.tan((a * Math.PI) / 180), 172];
        return svg(
          circle(O, 60) +
            line([15, 172], [222, 172]) +
            line(O, T) +
            line(O, P) +
            right(T, O, P) +
            angle(T, P, O, a) +
            angle(P, O, T) +
            label([67, 103], "O", "vertex") +
            label([78, 197], "T", "vertex") +
            label([P[0] + 2, 196], "P", "vertex") +
            label([175, 25], `${a}°`) +
            line([175, 40], polar(P, 23, 180 - a / 2)),
        );
      },
    }),
    solve: ([a]) => rational(90 - a),
    check: ([a], v) => eq(v, 180 - 90 - a),
  },
];

/** m3Tangent.ts: same-point tangent lengths; tangent/chord angle uses the
 * circle-angle curriculum's directly specified intercepted arc. */
export const TANGENT_FAMILIES: Family[] = [
  {
    id: "m3-circle-tangent-chord",
    grade: "중3",
    title: "접선과 현이 이루는 각",
    domain: cross([0, 1], range(30, 65, 5)),
    present: ([mode, a]) => ({
      text:
        mode === 0
          ? `O는 원의 중심, T에서 접하는 직선과 현 TP가 있다. 중심각 ∠TOP=${2 * a}°`
          : `T에서 접하는 직선과 현 TP가 있다. 같은 호 TP에 대한 원주각 ∠TCP=${a}°`,
      instruction: "접선과 현 TP가 이루는 표시된 예각을 구하세요.",
      unit: "°",
      svg: () => {
        const O: Point = [120, 110],
          T: Point = [120, 180],
          P = polar(O, 70, 270 + 2 * a),
          C: Point = [50, 110],
          E: Point = [219, 180];
        let body =
          circle(O, 70) +
          line([21, 180], E) +
          line(T, P) +
          angle(E, T, P) +
          label([120, 204], "T", "vertex") +
          label(polar(O, 89, 270 + 2 * a), "P", "vertex");
        if (mode === 0)
          body +=
            line(O, T) +
            line(O, P) +
            angle(T, O, P, 2 * a) +
            label([103, 120], "O", "vertex");
        else
          body +=
            line(C, T) +
            line(C, P) +
            angle(T, C, P, a) +
            label([29, 110], "C", "vertex");
        body +=
          label([35, 25], `${mode === 0 ? 2 * a : a}°`) +
          line(
            [47, 39],
            mode === 0 ? polar(O, 19, 270 + a) : polar(C, 19, a / 2 - 45),
          );
        return svg(body);
      },
    }),
    solve: ([, a]) => rational(a),
    check: ([mode, a], v) => eq(v, mode === 0 ? 2 * a : a, mode === 0 ? 2 : 1),
  },
  {
    id: "m3-circle-equal-tangents",
    grade: "중3",
    title: "한 점에서 그은 두 접선의 길이",
    domain: range(2, 20).map((k) => [k]),
    present: ([k]) => ({
      text: `원 밖의 점 P에서 그은 두 접선의 접점이 A, B이다. PA=${k} cm`,
      instruction: "접선 PB의 길이를 구하세요.",
      unit: "cm",
      svg: () => {
        const O: Point = [84, 118],
          P: Point = [206, 118],
          theta = (Math.acos(56 / 122) * 180) / Math.PI,
          A = polar(O, 56, theta),
          B = polar(O, 56, -theta);
        return svg(
          circle(O, 56) +
            line(O, A, dash) +
            line(O, B, dash) +
            line(P, A) +
            line(P, B, 'stroke-width="3" data-drill-segment="target"') +
            right(A, O, P) +
            right(B, O, P) +
            label([66, 118], "O", "vertex") +
            label([224, 118], "P", "vertex") +
            label(polar(O, 74, theta), "A", "vertex") +
            label(polar(O, 74, -theta), "B", "vertex") +
            label([179, 39], `${k} cm`) +
            line([179, 54], [(P[0] + A[0]) / 2, (P[1] + A[1]) / 2]),
        );
      },
    }),
    solve: ([k]) => rational(k),
    check: ([k], v) => eq(v, k),
  },
];
