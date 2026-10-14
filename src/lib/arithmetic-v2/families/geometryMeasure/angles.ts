import { cross, eq, rational, range, type Family } from "./core";
import {
  angle,
  circle,
  label,
  line,
  polar,
  poly,
  svg,
  type Point,
} from "./svg";

function triangle(a: number, c: number, inverse: boolean) {
  const b = 180 - a - c,
    rad = Math.PI / 180;
  const raw: Point = [
    (Math.sin(b * rad) * Math.cos(a * rad)) / Math.sin(c * rad),
    (Math.sin(b * rad) * Math.sin(a * rad)) / Math.sin(c * rad),
  ];
  const scale = Math.min(128, 110 / raw[1]);
  const A: Point = [45, 174],
    B: Point = [45 + scale, 174],
    C: Point = [45 + raw[0] * scale, 174 - raw[1] * scale],
    E: Point = [222, 174];
  return svg(
    poly([A, B, C]) +
      line(B, E) +
      angle(B, A, C, a) +
      angle(A, C, B, inverse ? undefined : c) +
      angle(C, B, E, inverse ? a + c : undefined) +
      label([35, 205], `${a}°`) +
      line([37, 193], polar(A, 21, a / 2)) +
      label(
        [C[0], C[1] - 25],
        inverse ? "C" : `${c}°`,
        inverse ? "vertex" : "given",
      ) +
      (inverse
        ? label([199, 126], `${a + c}°`) +
          line([198, 140], polar(B, 22, (a + c) / 2))
        : ""),
  );
}
function parallel(mode: number, a: number) {
  // Both horizontal lines are explicitly parallel; all modes require a supplement.
  const alpha = (a * Math.PI) / 180,
    dx = 70 / Math.tan(alpha);
  const O: Point = [120 - dx / 2, 155],
    P: Point = [120 + dx / 2, 85];
  const U = polar(P, 38, a),
    D = polar(O, 38, a + 180);
  const givenAt = mode === 0 ? P : O;
  const targetAt = mode === 0 ? O : P;
  return svg(
    line([22, 85], [218, 85]) +
      line([22, 155], [218, 155]) +
      line(D, U) +
      angle([givenAt[0] + 40, givenAt[1]], givenAt, polar(givenAt, 40, a), a) +
      angle(polar(targetAt, 40, a), targetAt, [targetAt[0] - 40, targetAt[1]]) +
      label([120, 25], "ℓ ∥ m", "relation") +
      label([22, 64], "ℓ", "vertex") +
      label([22, 177], "m", "vertex") +
      label([mode === 0 ? 205 : 190, mode === 0 ? 25 : 202], `${a}°`) +
      line(
        [mode === 0 ? 205 : 180, mode === 0 ? 39 : 187],
        polar(givenAt, 24, a / 2),
      ),
  );
}
function polygon(
  n: number,
  caption: string,
  mark: "interior" | "exterior" | "none",
) {
  const ps = range(0, n - 1).map((i) =>
    polar([120, 110], 70, 270 + (i * 360) / n),
  );
  const [v, next] = ps,
    prev = ps[n - 1];
  const edgeLength = Math.hypot(v[0] - prev[0], v[1] - prev[1]);
  const ext: Point = [
    v[0] + ((v[0] - prev[0]) * 24) / edgeLength,
    v[1] + ((v[1] - prev[1]) * 24) / edgeLength,
  ];
  return svg(
    poly(ps) +
      (mark === "interior"
        ? angle(prev, v, next)
        : mark === "exterior"
          ? line(v, ext) + angle(next, v, ext)
          : "") +
      label([120, 215], caption),
  );
}
const triDomain = cross(range(30, 80, 10), range(30, 80, 10)).filter(
  ([a, c]) => a + c >= 80 && a + c <= 130,
);
const ns = range(3, 12);
export const ANGLE_FAMILIES: Family[] = [
  {
    id: "m1-parallel-angle",
    grade: "중1",
    title: "평행선과 엇갈린 각의 계산",
    domain: cross([0, 1], range(45, 75, 5)),
    present: ([m, a]) => ({
      text: `ℓ∥m이고 표시된 각은 ${a}°이다. ${m === 0 ? "아래" : "위"} 직선의 표시된 빈 각`,
      instruction: "평행선에서 표시된 빈 각의 크기를 구하세요.",
      unit: "°",
      svg: () => parallel(m, a),
    }),
    solve: ([, a]) => rational(180 - a),
    check: ([, a], v) => eq(v, 180 - a),
  },
  {
    id: "m1-triangle-exterior",
    grade: "중1",
    title: "삼각형의 외각",
    domain: triDomain,
    present: ([a, c]) => ({
      text: `삼각형의 떨어진 두 내각이 ${a}°, ${c}°일 때 표시된 외각`,
      instruction: "한 변을 연장하여 생긴 표시된 외각의 크기를 구하세요.",
      unit: "°",
      svg: () => triangle(a, c, false),
    }),
    solve: ([a, c]) => rational(a + c),
    check: ([a, c], v) => eq(v, 180 - (180 - a - c)),
  },
  {
    id: "m1-triangle-interior-exterior",
    grade: "중1",
    title: "외각에서 삼각형의 내각",
    domain: triDomain,
    present: ([a, c]) => ({
      text: `삼각형의 외각이 ${a + c}°, 떨어진 한 내각이 ${a}°일 때 ∠C`,
      instruction: "C로 표시된 내각의 크기를 구하세요.",
      unit: "°",
      svg: () => triangle(a, c, true),
    }),
    solve: ([, c]) => rational(c),
    check: ([a, c], v) => eq(v, a + c - a),
  },
  ...(
    [
      "sum",
      "interior",
      "exterior",
      "sides-interior",
      "sides-exterior",
      "diagonals",
      "sides-diagonals",
    ] as const
  ).map((mode): Family => ({
    id: `m1-polygon-${mode}`,
    grade: "중1",
    title: {
      sum: "다각형의 내각의 합",
      interior: "정다각형의 한 내각",
      exterior: "정다각형의 한 외각",
      "sides-interior": "한 내각에서 정다각형의 변의 수",
      "sides-exterior": "한 외각에서 정다각형의 변의 수",
      diagonals: "다각형의 대각선 수",
      "sides-diagonals": "대각선 수에서 다각형의 변의 수",
    }[mode],
    domain: (mode.includes("sides")
      ? ns.filter((n) => (mode === "sides-diagonals" ? n >= 4 : 360 % n === 0))
      : ns
    ).map((n) => [n]),
    present: ([n]) => {
      const known =
        mode === "sides-interior"
          ? `한 내각 ${180 - 360 / n}°`
          : mode === "sides-exterior"
            ? `한 외각 ${360 / n}°`
            : mode === "sides-diagonals"
              ? `대각선 ${(n * (n - 3)) / 2}개`
              : `${n}각형`;
      const regular =
        mode !== "sum" && mode !== "diagonals" && mode !== "sides-diagonals";
      return {
        text: `${regular ? "정다각형" : "다각형"}: ${known}`,
        instruction: mode.includes("sides")
          ? "변의 수를 구하세요."
          : mode === "sum"
            ? "내각의 크기의 합을 구하세요."
            : mode === "diagonals"
              ? "대각선의 개수를 구하세요."
              : `표시된 한 ${mode === "interior" ? "내각" : "외각"}의 크기를 구하세요.`,
        unit: mode.includes("sides") || mode === "diagonals" ? "개" : "°",
        // A full n-gon leaks the requested side count (m1Geo2.ts inverse policy).
        svg: mode.includes("sides")
          ? undefined
          : () =>
              polygon(
                n,
                known,
                mode === "interior"
                  ? "interior"
                  : mode === "exterior"
                    ? "exterior"
                    : "none",
              ),
      };
    },
    solve: ([n]) =>
      rational(
        mode.includes("sides")
          ? n
          : mode === "sum"
            ? 180 * (n - 2)
            : mode === "interior"
              ? 180 * (n - 2)
              : mode === "exterior"
                ? 360
                : n * (n - 3),
        mode === "interior" || mode === "exterior"
          ? n
          : mode === "diagonals"
            ? 2
            : 1,
      ),
    check: ([n], v) =>
      mode.includes("sides")
        ? eq(v, n)
        : mode === "sum"
          ? eq(v, 180 * n - 360)
          : mode === "interior"
            ? eq(v, 180 * n - 360, n)
            : mode === "exterior"
              ? eq(v, 360, n)
              : eq(v, n * (n - 1) - 2 * n, 2),
  })),
];

function circleAngles(mode: number, a: number) {
  const O: Point = [120, 116],
    r = 72;
  const A = polar(O, r, 270 - a),
    B = polar(O, r, 270 + a),
    C = polar(O, r, 90),
    D = polar(O, r, 270);
  const central = mode < 2,
    cyclic = mode === 3;
  const other = cyclic ? D : polar(O, r, 130);
  let body =
    circle(O, r) +
    line(A, C) +
    line(B, C) +
    angle(A, C, B, mode === 0 ? undefined : a) +
    label([120, 24], "C", "vertex") +
    label(polar(O, 91, 270 - a), "A", "vertex") +
    label(polar(O, 91, 270 + a), "B", "vertex");
  if (central)
    body +=
      line(O, A) +
      line(O, B) +
      angle(A, O, B, mode === 0 ? 2 * a : undefined) +
      label([120, 101], "O", "vertex");
  else
    body +=
      line(A, other) +
      line(B, other) +
      angle(A, other, B) +
      label(cyclic ? [120, 213] : [57, 48], "D", "vertex");
  const given = mode === 0 ? 2 * a : a;
  body +=
    label([207, 68], `${given}°`) +
    line([193, 79], mode === 0 ? [120, 132] : [120, 60]);
  return svg(body);
}
export const CIRCLE_ANGLE_FAMILIES: Family[] = [
  ...(["inscribed", "central", "same-arc", "cyclic-opposite"] as const).map(
    (mode, i): Family => ({
      id: `m3-circle-${mode}`,
      grade: "중3",
      title: [
        "중심각에서 원주각",
        "원주각에서 중심각",
        "같은 호의 원주각",
        "원에 내접하는 사각형의 대각",
      ][i],
      domain: range(30, 70, 5).map((a) => [a]),
      present: ([a]) => ({
        text:
          i === 0
            ? `O는 원의 중심, 중심각 ${2 * a}°에 대한 원주각 ∠C`
            : i === 1
              ? `O는 원의 중심, 원주각 ∠C=${a}°에 대한 중심각`
              : i === 2
                ? `같은 호 AB에 대한 원주각 ∠C=${a}°, ∠D`
                : `원에 내접하는 사각형에서 마주 보는 ∠C=${a}°, ∠D`,
        instruction:
          i === 0
            ? "표시된 ∠C의 크기를 구하세요."
            : i === 1
              ? "표시된 중심각의 크기를 구하세요."
              : "표시된 ∠D의 크기를 구하세요.",
        unit: "°",
        svg: () => circleAngles(i, a),
      }),
      solve: ([a]) => rational(i === 1 ? 2 * a : i === 3 ? 180 - a : a),
      check: ([a], v) =>
        i === 0
          ? eq(v, 2 * a, 2)
          : i === 1
            ? eq(v, a * 2)
            : i === 2
              ? eq(v, a)
              : eq(v, 180 - a),
    }),
  ),
];
