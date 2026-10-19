import {
  render,
  type Model,
  type Point,
} from "../families/geometryTriangles/core";
import { defineFigureFirst, type FigureFirstFamily } from "./figureFirstTypes";

/** 중3 삼각비, figure-first (owner, 2026-10-16). The four text-only families
 * of trigonometryComplete.ts have no canonical figure, so a display-only right
 * triangle is drawn from the prompt's own latex; nothing is saved or verified
 * from it. Shapes are clamped for legibility: labels, not proportions, carry
 * the measurements, exactly as textbook figures do.
 */
const fraction = (n: string, d?: string) => (d ? `${n}/${d}` : n);
const clamp = (value: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, value));
const FRACTION = String.raw`(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))`;

/** Right angle at C; A on the left so that ∠A opens toward the right. */
function rightTriangleAtC(opposite: number, adjacent: number): Model {
  const ratio = clamp(opposite / adjacent, 0.42, 1.9);
  return {
    points: { A: [0, 0], C: [1, 0], B: [1, ratio] },
    edges: ["AB", "BC", "CA"],
    right: ["ACB"],
  };
}
/** ∠A at the origin with AB on the base; the included angle is drawn acute. */
function includedAngleTriangle(ab: number, ac: number, sine: number): Model {
  const theta = clamp(
    Math.asin(clamp(sine, 0, 1)),
    (28 * Math.PI) / 180,
    (72 * Math.PI) / 180,
  );
  const b = clamp(ac / ab, 0.6, 2.2);
  const C: Point = [b * Math.cos(theta), b * Math.sin(theta)];
  return {
    points: { A: [0, 0], B: [1, 0], C },
    edges: ["AB", "BC", "CA"],
    arcs: ["BAC"],
  };
}
const draw = (model: Model) =>
  render(model, {
    angleLabelsInside: true,
    givenLeaders: "far",
    tightGivens: true,
  });

const lengthGivenRatio = defineFigureFirst({
  instruction: "다음 그림의 직각삼각형 ABC에서 x의 값을 구하세요.",
  parse(prompt) {
    const m = new RegExp(
      String.raw`^\\angle C=90\^\{\\circ\},\\quad \\(sin|cos|tan) A=${FRACTION},\\quad \\mathrm\{(AB|BC|AC)\}=(\d+)\\,\\mathrm\{cm\},\\quad \\mathrm\{(AB|BC|AC)\}$`,
    ).exec(prompt.latex);
    if (!m) return undefined;
    const [, name, fn, fd, whole, given, k, target] = m;
    const n = Number(fn ?? whole),
      d = Number(fd ?? 1);
    if (given === target || !(d > 0) || !(n > 0)) return undefined;
    return { name, n, d, given, k, target };
  },
  lines: (prompt, p) => [
    `${p.name} A=${fraction(String(p.n), p.d === 1 ? undefined : String(p.d))}`,
  ],
  draw: (prompt, p) => {
    const leg = Math.sqrt(Math.abs(p.d * p.d - p.n * p.n)) || 1;
    const [opposite, adjacent] =
      p.name === "sin"
        ? [p.n, leg]
        : p.name === "cos"
          ? [leg, p.n]
          : [p.n, p.d];
    const model = rightTriangleAtC(opposite, adjacent);
    model.givens = [
      { key: p.target, text: "x", kind: "segment" },
      { key: p.given, text: p.k, kind: "segment" },
    ];
    return draw(model);
  },
});

const areaGivenSine = defineFigureFirst({
  instruction: "다음 그림의 △ABC의 넓이를 구하세요.",
  parse(prompt) {
    const m = new RegExp(
      String.raw`^\\mathrm\{AB\}=(\d+)\\,\\mathrm\{cm\},\\quad \\mathrm\{AC\}=(\d+)\\,\\mathrm\{cm\},\\quad0\^\{\\circ\}\\lt A\\lt90\^\{\\circ\},\\quad\\sin A=${FRACTION}$`,
    ).exec(prompt.latex);
    if (!m) return undefined;
    const [, a, b, fn, fd, whole] = m;
    return { a, b, n: Number(fn ?? whole), d: Number(fd ?? 1) };
  },
  lines: (prompt, p) => [
    `sin A=${fraction(String(p.n), p.d === 1 ? undefined : String(p.d))}`,
  ],
  draw: (prompt, p) => {
    const model = includedAngleTriangle(Number(p.a), Number(p.b), p.n / p.d);
    model.givens = [
      { key: "AB", text: p.a, kind: "segment" },
      { key: "AC", text: p.b, kind: "segment" },
    ];
    return draw(model);
  },
});

const sineFromArea = defineFigureFirst({
  instruction: "다음 그림의 △ABC에서 sin A의 값을 구하세요.",
  parse(prompt) {
    const m =
      /^\\mathrm\{AB\}=(\d+)\\,\\mathrm\{cm\},\\quad\\mathrm\{AC\}=(\d+)\\,\\mathrm\{cm\},\\quad S=(\d+)\\,\\mathrm\{cm\}\^\{2\},\\quad0\^\{\\circ\}\\lt A\\lt90\^\{\\circ\},\\quad\\sin A$/.exec(
        prompt.latex,
      );
    if (!m) return undefined;
    return { a: m[1], b: m[2], s: m[3] };
  },
  lines: (prompt, p) => [`△ABC의 넓이는 ${p.s} cm²`],
  draw: (prompt, p) => {
    const a = Number(p.a),
      b = Number(p.b);
    const model = includedAngleTriangle(a, b, (2 * Number(p.s)) / (a * b));
    model.givens = [
      { key: "AB", text: p.a, kind: "segment" },
      { key: "AC", text: p.b, kind: "segment" },
    ];
    return draw(model);
  },
});

const sideFromAreaSine = defineFigureFirst({
  instruction: "다음 그림의 △ABC에서 x의 값을 구하세요.",
  parse(prompt) {
    const m = new RegExp(
      String.raw`^S=(\d+)\\,\\mathrm\{cm\}\^\{2\},\\quad\\mathrm\{AB\}=(\d+)\\,\\mathrm\{cm\},\\quad0\^\{\\circ\}\\lt A\\lt90\^\{\\circ\},\\quad\\sin A=${FRACTION},\\quad\\mathrm\{AC\}$`,
    ).exec(prompt.latex);
    if (!m) return undefined;
    const [, s, a, fn, fd, whole] = m;
    return { s, a, n: Number(fn ?? whole), d: Number(fd ?? 1) };
  },
  lines: (prompt, p) => [
    `△ABC의 넓이는 ${p.s} cm², sin A=${fraction(String(p.n), p.d === 1 ? undefined : String(p.d))}`,
  ],
  draw: (prompt, p) => {
    const a = Number(p.a);
    const model = includedAngleTriangle(a, 1.3 * a, p.n / p.d);
    model.givens = [
      { key: "AC", text: "x", kind: "segment" },
      { key: "AB", text: p.a, kind: "segment" },
    ];
    return draw(model);
  },
});

// geometryMeasure/trig.ts: A left, B bottom-right (right angle), C top-right.
// a = BC (opposite A), b = AB (adjacent), c = AC (hypotenuse).
const SIDE_KEYS = ["BC", "AB", "AC"] as const;
const LENGTH_MODES = [
  [2, 0],
  [2, 1],
  [0, 2],
  [1, 2],
  [1, 0],
  [0, 1],
] as const;
const specialLength = defineFigureFirst({
  instruction:
    "다음 그림의 직각삼각형 ABC에서 x의 값을 구하세요. 근호는 간단히 하세요.",
  parse(prompt) {
    const m = /^gm-m3-trig-special-length-(30|45|60)-(\d+)-([0-5])$/.exec(
      prompt.figureId ?? "",
    );
    return m ? { t: Number(m[1]), k: m[2], mode: Number(m[3]) } : undefined;
  },
  draw: (prompt, p) => {
    const [given, target] = LENGTH_MODES[p.mode];
    const model: Model = {
      points: { A: [0, 0], B: [1, 0], C: [1, Math.tan((p.t * Math.PI) / 180)] },
      edges: ["AB", "BC", "CA"],
      right: ["ABC"],
      arcs: ["CAB"],
      givens: [
        { key: SIDE_KEYS[target], text: "x", kind: "segment" },
        { key: "CAB", text: `${p.t}°`, kind: "angle" },
        { key: SIDE_KEYS[given], text: p.k, kind: "segment" },
      ],
    };
    return draw(model);
  },
});

/** The canonical figure already carries both sides and the vertex A; only the
 * question line ("sin A") stays with the problem because it varies by mode. */
const ratio = defineFigureFirst({
  instruction:
    "다음 그림의 직각삼각형에서 다음 삼각비의 값을 기약분수로 구하세요.",
  parse: (prompt) => {
    const m = /^(sin|cos|tan) A의 값을/.exec(prompt.instruction ?? "");
    return m ? { name: m[1] } : undefined;
  },
  lines: (prompt, p) => [`${p.name} A`],
  draw: (prompt, p, laidOut) => laidOut,
});
const triangleArea = defineFigureFirst({
  instruction: "다음 그림의 삼각형의 넓이를 구하세요. 근호는 간단히 하세요.",
  parse: (prompt) =>
    /^gm-m3-trig-triangle-area-\d+-\d+-\d+$/.test(prompt.figureId ?? "")
      ? {}
      : undefined,
  draw: (prompt, p, laidOut) => laidOut,
});

export const TRIG_FIGURE_FIRST: Readonly<Record<string, FigureFirstFamily>> = {
  "m3-trig-ratio": ratio,
  "m3-trig-special-length": specialLength,
  "m3-trig-triangle-area": triangleArea,
  "m3-trig-length-given-ratio": lengthGivenRatio,
  "m3-trig-area-given-sine": areaGivenSine,
  "m3-trig-sine-from-area": sineFromArea,
  "m3-trig-side-from-area-sine": sideFromAreaSine,
};
