import assert from "node:assert/strict";
import { svgLabels, stripLabels } from "../../src/lib/figure/svgLabels";
import { angleMarkCorner } from "../../src/components/unified/figure-editor/figureAngleMark";
import {
  createAnglePresentationSpec,
  type Entry,
  type Point,
} from "./arithmetic-angle-presentation-specs";

const values = (s: string) =>
  (s.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
const attr = (s: string, k: string) =>
  new RegExp(`\\b${k}="([^"]*)"`).exec(s)?.[1] ?? "";
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const direction = (o: Point, p: Point) =>
  ((Math.atan2(o[1] - p[1], p[0] - o[0]) * 180) / Math.PI + 360) % 360;
const angle = (o: Point, a: Point, b: Point) =>
  (Math.atan2(
    Math.abs((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])),
    (a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]),
  ) *
    180) /
  Math.PI;
const close = (a: number, b: number, tolerance: number, context: string) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${context}: ${a} != ${b}`);

/** Independent checks on the DELIVERED SVG, not just its generation recipe.
 * Source coordinates are compared after one uniform scale/translation. Every
 * given and target is measured again; annotation boxes must stay in their own
 * sector/vertex region. Editor angle parsing additionally verifies engine marks.
 */
export function checkAnglePresentation(entry: Entry, svg: string) {
  const { vertices, scale } = createAnglePresentationSpec(entry);
  const geometry = stripLabels(svg),
    lines = [...geometry.matchAll(/<line\b([^>]+)>/g)].map((m) => m[1]);
  const polygon =
    entry.family.includes("isosceles") ||
    entry.family.includes("quadrilateral");
  const count = polygon ? vertices.length : vertices.length - 1;
  assert.ok(lines.length >= count, entry.id);
  const endpoints = lines.slice(0, count).map(
    (tag) =>
      [
        [Number(attr(tag, "x1")), Number(attr(tag, "y1"))],
        [Number(attr(tag, "x2")), Number(attr(tag, "y2"))],
      ] as [Point, Point],
  );
  const offset = endpoints[0][0];
  const moved = vertices.map(
    (p) => [p[0] + offset[0], p[1] + offset[1]] as Point,
  );
  assert.equal(
    lines.length,
    count + (entry.family.includes("isosceles") ? 2 : 0),
    entry.id + " sides/ticks",
  );
  const insidePolygon = (p: Point) => {
    const signs = moved.map((v, i) => {
      const next = moved[(i + 1) % moved.length];
      return (
        (next[0] - v[0]) * (p[1] - v[1]) - (next[1] - v[1]) * (p[0] - v[0])
      );
    });
    return signs.every((s) => s >= 0) || signs.every((s) => s <= 0);
  };
  for (let i = 0; i < count; i++) {
    close(
      distance(endpoints[i][0], polygon ? moved[i] : moved[0]),
      0,
      0.002,
      `${entry.id} start ${i}`,
    );
    close(
      distance(
        endpoints[i][1],
        polygon ? moved[(i + 1) % count] : moved[i + 1],
      ),
      0,
      0.002,
      `${entry.id} end ${i}`,
    );
  }
  const labels = svgLabels(svg);
  const givens = [...entry.original.matchAll(/data-degrees="([^"]+)"/g)].map(
    (m) => Number(m[1]),
  );
  assert.deepEqual(
    labels.map((l) => l.text).sort(),
    givens.map((v) => `${v}°`).sort(),
    entry.id,
  );
  for (const label of labels) {
    assert.ok(label.typeset);
    close(label.fontSize, 16, 0.001, entry.id);
  }
  assert.ok(!svg.includes("?") && svg.includes("arithmetic-geometry-drill"));
  const boxes = labels.map((l) => {
    const pad = l.halo / 2;
    return [
      [l.x - l.width! / 2 - pad, l.baseline - l.ascent! - pad],
      [l.x + l.width! / 2 + pad, l.baseline - l.ascent! - pad],
      [l.x + l.width! / 2 + pad, l.baseline + l.descent! + pad],
      [l.x - l.width! / 2 - pad, l.baseline + l.descent! + pad],
    ] as Point[];
  });
  const paths = [...geometry.matchAll(/<path\b[^>]*d="([^"]+)"[^>]*>/g)].map(
    (m) => m[1],
  );
  const arcs = paths.filter((d) => / A /.test(d)),
    leaders = paths.filter((d) => / Q /.test(d));
  const minor = arcs.map((d) =>
    angleMarkCorner({ type: "path", attrs: { d } }, [1, 0, 0, 1, 0, 0]),
  );
  assert.ok(
    minor.every(Boolean),
    `${entry.id}: editor must recognize engine arcs`,
  );
  const measureArc = (d: string, owner: Point) => {
    const n = values(d),
      from = direction(owner, [n[0], n[1]]),
      to = direction(owner, [n[7], n[8]]);
    const sweep =
      n[6] === 0 ? (to - from + 360) % 360 : (from - to + 360) % 360;
    close(
      distance(owner, [n[0], n[1]]),
      n[2],
      0.1,
      entry.id + " arc start radius",
    );
    close(
      distance(owner, [n[7], n[8]]),
      n[2],
      0.1,
      entry.id + " arc end radius",
    );
    return sweep;
  };
  const within = (box: Point[], from: number, to: number) =>
    box.every((p) => {
      const d = direction(moved[0], p);
      return d >= from - 0.1 && d <= to + 0.1;
    });
  const [a, b] = entry.params;
  let expectedArcs: number[];
  if (entry.family.includes("quadrilateral")) {
    const actual = moved.map((v, i) =>
      angle(v, moved[(i + 3) % 4], moved[(i + 1) % 4]),
    );
    actual.slice(0, 3).forEach((v, i) => close(v, givens[i], 0.001, entry.id));
    close(actual[3], entry.target, 0.001, entry.id);
    expectedArcs = actual;
    assert.equal(leaders.length, 0, entry.id + " quad labels internal");
    labels.forEach((l, i) => {
      assert.ok(
        boxes[i].every(insidePolygon),
        entry.id + " polygon label outside",
      );
      const own = moved
        .map((v, j) => ({
          j,
          d: distance(v, [l.x, l.baseline - l.ascent! / 2]),
        }))
        .sort((p, q) => p.d - q.d)[0].j;
      assert.ok(own < 3, entry.id + " label belongs to target");
      assert.equal(l.text, `${givens[own]}°`, entry.id);
      for (const p of boxes[i])
        for (let j = 0; j < 4; j++)
          if (j !== own)
            assert.ok(
              distance(p, moved[own]) < distance(p, moved[j]),
              entry.id + " ambiguous polygon label",
            );
    });
  } else if (entry.family.includes("isosceles")) {
    const toBase = entry.family.includes("-base-"),
      own = toBase ? 0 : 1,
      target = toBase ? 1 : 0;
    close(
      angle(moved[own], moved[(own + 1) % 3], moved[(own + 2) % 3]),
      givens[0],
      0.001,
      entry.id,
    );
    close(
      angle(moved[target], moved[(target + 1) % 3], moved[(target + 2) % 3]),
      entry.target,
      0.001,
      entry.id,
    );
    expectedArcs = [givens[0], entry.target];
    if (leaders.length) {
      assert.equal(leaders.length, 1);
      const n = values(leaders[0]),
        anchor: Point = [n[0], n[1]],
        end: Point = [n[4], n[5]];
      close(
        distance(anchor, moved[own]),
        20,
        0.01,
        entry.id + " leader owns given arc",
      );
      assert.ok(distance(anchor, end) < 55, entry.id + " distant leader");
      assert.ok(
        distance(anchor, moved[own]) < distance(anchor, moved[target]),
        entry.id + " leader points to target",
      );
    } else {
      assert.ok(
        boxes[0].every(insidePolygon),
        entry.id + " triangle label outside without leader",
      );
      for (const p of boxes[0])
        for (let j = 0; j < 3; j++)
          if (j !== own)
            assert.ok(
              distance(p, moved[own]) < distance(p, moved[j]),
              entry.id + " ambiguous triangle label",
            );
    }
  } else {
    assert.equal(
      leaders.length,
      0,
      entry.id + " elementary sectors have room inside",
    );
    if (entry.family.endsWith("sum")) {
      expectedArcs = [a, b, a + b];
      close(angle(moved[0], moved[1], moved[2]), a, 0.001, entry.id);
      close(angle(moved[0], moved[2], moved[3]), b, 0.001, entry.id);
      assert.ok(
        within(boxes[0], 0, a) && within(boxes[1], a, a + b),
        entry.id + " wrong sum sector",
      );
    } else if (entry.family.endsWith("difference")) {
      expectedArcs = [b, a, a - b];
      close(angle(moved[0], moved[1], moved[3]), a, 0.001, entry.id);
      close(angle(moved[0], moved[2], moved[3]), entry.target, 0.001, entry.id);
      const part = labels.findIndex((l) => l.text === `${b}°`),
        whole = 1 - part,
        radius = Math.max(Math.hypot(...vertices[1]) * 0.78, 110);
      assert.ok(within(boxes[part], 0, b), entry.id + " part labels target");
      assert.ok(within(boxes[whole], 0, a), entry.id + " whole outside sector");
      assert.ok(
        boxes[whole].every((p) => distance(moved[0], p) > radius + 1),
        entry.id + " whole confused with part/target",
      );
      assert.ok(
        boxes[part].every((p) => distance(moved[0], p) < radius - 1),
        entry.id + " part confused with whole",
      );
    } else {
      expectedArcs = [a, entry.target];
      const actual = direction(moved[0], moved[2]);
      close(actual, a, 0.001, entry.id);
      assert.ok(
        within(boxes[0], 0, a),
        entry.id + " given labels target sector",
      );
    }
  }
  assert.equal(
    arcs.length,
    expectedArcs.length,
    entry.id + " angle mark count",
  );
  arcs.forEach((d, i) => {
    const owner = polygon
      ? entry.family.includes("quadrilateral")
        ? moved[i]
        : moved[
            entry.family.includes("-base-")
              ? i === 0
                ? 0
                : 1
              : i === 0
                ? 1
                : 0
          ]
      : moved[0];
    close(
      measureArc(d, owner),
      expectedArcs[i],
      0.4,
      entry.id + " marked angle",
    );
  });
  // Whole-angle square remains a square only for a right-angle remainder.
  assert.equal(
    paths.filter((d) => / L .* L /.test(d)).length,
    entry.family.includes("right-remainder") ? 1 : 0,
    entry.id,
  );
  return {
    id: entry.id,
    scale,
    labels: labels.length,
    leaders: leaders.length,
    coordinatesChecked: count * 2,
    arcsChecked: arcs.length,
  };
}
