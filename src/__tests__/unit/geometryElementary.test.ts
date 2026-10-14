// @vitest-environment node
import assert from "node:assert/strict";
import { test } from "vitest";
import {
  ELEMENTARY_GEOMETRY_DEFINITIONS as definitions,
  ELEMENTARY_GEOMETRY_FIGURES as figures,
} from "../../lib/arithmetic-v2/families/geometryElementary";
import type { ArithmeticV2Candidate } from "../../lib/arithmetic-v2/types";

/** Independent test oracle; does not import production spec/solve/holds helpers. */
function expected(id: string, p: number[]): number {
  const [a, b, c] = p;
  const factors: Record<string, number> = {
    "e2-length-m-cm": 100,
    "e3-length-cm-mm": 10,
    "e3-length-km-m": 1000,
    "e3-capacity-l-ml": 1000,
    "e5-area-m2-cm2": 10000,
    "e5-area-km2-m2": 1000000,
    "e6-volume-m3-cm3": 1000000,
  };
  if (id in factors) return a ? b : b * factors[id];
  if (id === "e6-volume-decimal-units") return a ? b / 10 : b * 100000;
  if (id.includes("mixed-"))
    return a * (id.endsWith("-cm") ? 100 : id.endsWith("-mm") ? 10 : 1000) + b;
  if (id.startsWith("e2-length-"))
    return id.endsWith("difference") ? a - b : a + b;
  if (id.startsWith("e2-polygon-")) return p.reduce((s, v) => s + v, 0);
  if (id.startsWith("e3-circle-")) return id.endsWith("radius") ? a : 2 * a;
  if (id === "e5-unit-square-area") return a * b;
  if (id === "e4-angle-sum") return a + b;
  if (id === "e4-angle-difference") return a - b;
  if (id.includes("-remainder"))
    return (
      (id.includes("-right-") ? 90 : id.includes("-straight-") ? 180 : 360) - a
    );
  if (id === "e4-quadrilateral-missing-angle") return (a + b) / 2;
  if (id.includes("isosceles")) return id.includes("-base-") ? a : 180 - a * 2;
  if (id.startsWith("e6-circle-")) {
    const kind = id.slice("e6-circle-".length);
    if (kind.startsWith("radius-")) return a;
    if (kind.startsWith("diameter-")) return 2 * a;
    return ((kind.startsWith("area-") ? a * a : 2 * a) * b) / 100;
  }
  if (id.includes("cuboid-base-")) return id.endsWith("height") ? b : a * b;
  if (id.includes("cuboid-")) {
    if (id.endsWith("height")) return c;
    if (id.endsWith("edges")) return 4 * (a + b + c);
    if (id.endsWith("surface")) return 2 * (a * b + b * c + a * c);
    return a * b * c;
  }
  if (id.includes("cube-")) {
    if (id.endsWith("side")) return a;
    return id.endsWith("edges")
      ? 12 * a
      : id.endsWith("surface")
        ? 6 * a * a
        : a ** 3;
  }
  if (id.includes("perimeter")) {
    if (id.endsWith("side")) return id.includes("regular-polygon") ? b : a;
    if (id.includes("triangle")) return a + b + c;
    if (id.includes("regular-polygon")) return a * b;
    return id.includes("rectangle") || id.includes("parallelogram")
      ? 2 * (a + b)
      : 4 * a;
  }
  if (id.startsWith("e5-trapezoid-"))
    return id.endsWith("height")
      ? c
      : id.endsWith("top")
        ? a
        : id.endsWith("bottom")
          ? b
          : ((a + b) * c) / 2;
  if (
    id.includes("-area-side") ||
    id.includes("-area-base") ||
    id.includes("-area-diagonal")
  )
    return a;
  if (id.includes("-area-height")) return b;
  if (id === "e5-square-area") return a * a;
  if (id === "e5-rectangle-area" || id === "e5-parallelogram-area")
    return a * b;
  if (id === "e5-triangle-area" || id === "e5-rhombus-area") return (a * b) / 2;
  throw new Error(`Missing oracle: ${id}`);
}
function answerValue(c: ArithmeticV2Candidate) {
  return (
    Number(c.answer.exact[0]) /
    (c.answer.kind === "decimal" ? 10 ** Number(c.answer.exact[1]) : 1)
  );
}
test("all elementary finite tasks have correct canonical answers, genuine unique identities and immutable SVG keys", () => {
  const allKeys = new Set<string>();
  assert.ok(!definitions.some((d) => d.grade === "초1"));
  for (const def of definitions) {
    const identities = new Set<string>();
    assert.ok(def.domainSize >= 20, def.id);
    for (let index = 0; index < def.domainSize; index++) {
      const c = def.problemAt(index);
      assert.ok(
        Math.abs(answerValue(c) - expected(def.id, c.parameters)) < 1e-9,
        `${def.id} ${index}`,
      );
      assert.equal(def.verify(c), true, `${def.id} ${index}`);
      assert.equal(c.prompt.layout, "math");
      if (c.prompt.layout !== "math") throw new Error("math prompt expected");
      const id = c.prompt.figureId!;
      assert.ok(c.prompt.answerUnit?.length);
      assert.ok(id.length <= 64);
      assert.ok(!allKeys.has(id));
      allKeys.add(id);
      assert.ok(
        !identities.has(c.prompt.latex),
        `${def.id}: repeated public givens ${c.prompt.latex}`,
      );
      identities.add(c.prompt.latex);
      assert.equal(
        typeof Object.getOwnPropertyDescriptor(figures, id)?.get,
        "function",
      );
      const markup = figures[id];
      assert.equal(markup, figures[id]);
      assert.ok(markup.includes("<desc>arithmetic-geometry-drill-v1</desc>"));
      assert.ok(
        !/\?|NaN|Infinity|<script|<foreignObject|href=|data-answer/.test(
          markup,
        ),
        id,
      );
      if (c.prompt.answerUnit === "°")
        assert.equal(
          (markup.match(/data-drill-angle="target"/g) ?? []).length,
          1,
          id,
        );
      const changed = structuredClone(c);
      changed.answer.exact[0] = String(Number(changed.answer.exact[0]) + 1);
      assert.equal(def.verify(changed), false, id);
    }
    assert.equal(identities.size, def.domainSize);
  }
  assert.equal(Object.keys(figures).length, allKeys.size);
});
test("verification accepts parsed/reordered properties but rejects changed units, figures, content and operands", () => {
  for (const def of definitions) {
    const c = def.problemAt(Math.floor(def.domainSize / 2));
    const reordered = {
      ...c,
      prompt: Object.fromEntries(Object.entries(c.prompt).reverse()),
      answer: Object.fromEntries(Object.entries(c.answer).reverse()),
    } as ArithmeticV2Candidate;
    assert.equal(def.verify(reordered), true, def.id);
    for (const key of [
      "text",
      "latex",
      "instruction",
      "figureId",
      "answerUnit",
    ] as const) {
      const changed = structuredClone(c);
      if (changed.prompt.layout !== "math") throw new Error("math expected");
      changed.prompt[key] += " altered";
      assert.equal(def.verify(changed), false, `${def.id} ${key}`);
    }
    for (const index of [
      -1,
      def.domainSize,
      0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ])
      assert.throws(() => def.problemAt(index), RangeError);
    assert.equal(def.verify({ ...c, parameters: [...c.parameters, 1] }), false);
    assert.equal(
      def.verify({ ...c, parameters: c.parameters.map((n) => n + 0.1) }),
      false,
    );
    const before = def.problemAt(0);
    before.parameters[0] = -1;
    assert.equal(def.verify(def.problemAt(0)), true);
    // prove verifier does not call problemAt
    const original = def.problemAt;
    def.problemAt = () => {
      throw new Error("forward path forbidden");
    };
    try {
      assert.equal(def.verify(c), true);
    } finally {
      def.problemAt = original;
    }
  }
});
test("rendered planar measurements and all labelled/target arcs agree with numeric parameters", () => {
  for (const def of definitions)
    for (let i = 0; i < def.domainSize; i++) {
      const c = def.problemAt(i);
      if (c.prompt.layout !== "math") throw new Error("math expected");
      const markup = figures[c.prompt.figureId!];
      const polygon = markup.match(/data-drill-shape="polygon" d="([^"]+)"/);
      const points = polygon
        ? [...polygon[1].matchAll(/(?:M|L)([-.\d]+),([-.\d]+)/g)].map((m) => [
            Number(m[1]),
            Number(m[2]),
          ])
        : [];
      const distance = (a: number[], b: number[]) =>
        Math.hypot(a[0] - b[0], a[1] - b[1]);
      const [a, b] = c.parameters;
      if (def.id.includes("rectangle") && points.length)
        assert.ok(
          Math.abs(
            distance(points[0], points[1]) / distance(points[1], points[2]) -
              a / b,
          ) < 1e-5,
        );
      if (def.id.includes("parallelogram-perimeter"))
        assert.ok(
          Math.abs(
            distance(points[0], points[1]) / distance(points[1], points[2]) -
              a / b,
          ) < 1e-5,
        );
      if (def.id.includes("isosceles"))
        assert.ok(
          Math.abs(
            distance(points[0], points[1]) - distance(points[0], points[2]),
          ) < 1e-5,
        );
      if (def.id.includes("triangle-perimeter")) {
        assert.ok(
          Math.abs(
            distance(points[0], points[1]) / distance(points[1], points[2]) -
              a / b,
          ) < 1e-5,
        );
        assert.ok(
          Math.abs(
            distance(points[2], points[0]) / distance(points[1], points[2]) -
              c.parameters[2] / b,
          ) < 1e-5,
        );
      }
      if (/e5-(triangle|parallelogram)-area/.test(def.id)) {
        const base = distance(points[0], points[1]),
          height = points[0][1] - points[points.length - 1][1];
        assert.ok(Math.abs(base / height - a / b) < 1e-5);
      }
      if (def.id.includes("trapezoid-area")) {
        const bottom = distance(points[0], points[1]),
          top = distance(points[2], points[3]),
          height = points[0][1] - points[3][1];
        assert.ok(Math.abs(top / bottom - a / b) < 1e-5);
        assert.ok(Math.abs(bottom / height - b / c.parameters[2]) < 1e-5);
      }
      if (def.id.includes("rhombus-area"))
        assert.ok(
          Math.abs(
            distance(points[0], points[2]) / distance(points[1], points[3]) -
              a / b,
          ) < 1e-5,
        );
      if (def.id.includes("cuboid-") && !def.id.includes("cuboid-base-"))
        assert.ok(
          Math.abs(
            distance(points[0], points[1]) / distance(points[1], points[2]) -
              a / c.parameters[2],
          ) < 1e-5,
        );
      if (def.id.includes("quadrilateral") || def.id.includes("isosceles")) {
        const actual = points.map((v, k) => {
          const prev = points[(k + points.length - 1) % points.length],
            next = points[(k + 1) % points.length];
          return (
            (Math.acos(
              ((prev[0] - v[0]) * (next[0] - v[0]) +
                (prev[1] - v[1]) * (next[1] - v[1])) /
                (distance(prev, v) * distance(next, v)),
            ) *
              180) /
            Math.PI
          );
        });
        const expectedAngles = def.id.includes("isosceles")
          ? [180 - 2 * a, a, a]
          : [
              (b + c.parameters[2]) / 2,
              (360 - a - b) / 2,
              (360 - b - c.parameters[2]) / 2,
              (a + b) / 2,
            ];
        actual.forEach((angle, k) =>
          assert.ok(Math.abs(angle - expectedAngles[k]) < 0.005),
        );
      }
      for (const match of markup.matchAll(
        /data-drill-angle="(given|target)"(?: data-degrees="([\d.]+)")? d="M([-.\d]+),([-.\d]+) A([\d.]+) [\d.]+ 0 ([01]) 0 ([-.\d]+),([-.\d]+)"/g,
      )) {
        const chord = Math.hypot(
          Number(match[3]) - Number(match[7]),
          Number(match[4]) - Number(match[8]),
        );
        let angle =
          (2 * Math.asin(Math.min(1, chord / (2 * Number(match[5])))) * 180) /
          Math.PI;
        if (match[6] === "1") angle = 360 - angle;
        const stated =
          match[1] === "target" ? answerValue(c) : Number(match[2]);
        assert.ok(
          Math.abs(angle - stated) < 0.005,
          `${def.id} ${i}: ${angle} != ${stated}`,
        );
      }
    }
});
