import { describe, expect, it } from "vitest";

import { generateMiddleProblem } from "@/lib/middle/generate";
import { M1_GEO2 } from "@/lib/middle/m1Geo2";
import type { MidProblem } from "@/lib/middle/types";

const KEY = "1-2|다각형|04";
function check(p: MidProblem) {
  if (!p.content.startsWith("그림과 같은")) {
    expect(p.figureSpec ?? null).toBeNull();
    const given = Number(p.content.match(/개수가 \$([0-9]+)\$/)![1]);
    expect(p.answer).toBe(`$${given + 3}$`);
    return;
  }
  const n = Number(p.content.match(/\$([0-9]+)\$각형/)![1]);
  const figure = p.figureSpec!;
  const points = figure.points as Record<string, number[]>;
  const names = Object.keys(points).sort();
  expect(names.length).toBe(n);
  expect(p.answer).toBe(`$${n - 3}$개`);
  const segments = Object.values(figure.segments as Record<string, string[]>);
  expect(segments.length).toBe(n);
  const actual = new Set<string>();
  for (const pair of segments) {
    expect(pair.length).toBe(2);
    const [a, b] = pair;
    expect(names).toContain(a);
    expect(names).toContain(b);
    const gap = Math.abs(names.indexOf(a!) - names.indexOf(b!));
    expect(gap === 1 || gap === n - 1).toBe(true);
    actual.add([...pair].sort().join(":"));
  }
  expect(actual.size).toBe(n);
  // Every provided vertex remains labelled; no extra answer or construction mark.
  expect(figure.labels).toEqual(Object.fromEntries(names.map(name => [name, name])));
  for (const field of ["angles", "dimensions", "arcs", "lines"]) {
    expect(Object.keys((figure[field] ?? {}) as object).length).toBe(0);
  }
}
describe("M31 leaves the student the possible-diagonal construction", () => {
  it("100 actual API seeds keep the outline and inverse branches distinct", () => {
    const branches = new Set<boolean>();
    for (let s = 0; s < 100; s++) {
      const p = generateMiddleProblem(KEY, 20261020 + s * 7919, 0);
      check(p);
      branches.add(p.content.startsWith("그림과 같은"));
    }
    expect(branches.size).toBe(2);
  });
  it("all eight polygon sizes and both branches", () => {
    const entry = M1_GEO2.find(e => e.key === KEY)!;
    expect(entry).toBeDefined();
    for (let n = 5; n <= 12; n++) for (let mode = 0; mode < 2; mode++) {
      // Source chooses mode first, then n; force every selectable pair.
      let used = 0;
      const draws = [(mode + .5) / 2, (n - 4.5) / 8];
      const p = entry.handler(() => {
        const draw = draws[used++];
        if (draw === undefined) throw new Error("Unexpected random draw");
        return draw;
      });
      check(p);
    }
  });
});
