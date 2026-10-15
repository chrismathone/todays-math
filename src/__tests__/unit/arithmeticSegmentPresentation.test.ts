import { describe, expect, it, vi } from "vitest";
import { inflateSync, strFromU8 } from "fflate";
import asset from "../../lib/arithmetic-v2/presentation/segments-assets-v1.json";
import { presentArithmeticSegmentSvg as present } from "../../lib/arithmetic-v2/presentation/segments";
import { typesetArithmeticGeometrySvg as typeset } from "../../lib/arithmetic-v2/presentation/typography";
import { TRIANGLE_GEOMETRY_FIGURES } from "../../lib/arithmetic-v2/families/geometryTriangles";
import {
  segmentPlans,
  attr,
} from "../../../scripts/qa/arithmetic-segment-presentation-model";

vi.mock("fflate", async (original) => {
  const actual = await original<typeof import("fflate")>();
  return { ...actual, inflateSync: vi.fn(actual.inflateSync) };
});
const plans = segmentPlans();
const labels = (s: string) =>
  [...s.matchAll(/data-drill-label="([^"]+)"[^>]*>([^<]*)<\/text>/g)]
    .map((m) => [m[1], m[2]].join(":"))
    .sort();
const geometry = (s: string) =>
  s
    .match(/<(?:line|path|circle)\b[^>]*\/>/g)
    ?.filter((tag) => !tag.includes("data-leader")) ?? [];

describe("canonical middle geometry segment display", () => {
  it("covers exactly all 50 families / 1827 frozen SVGs, retaining every original given and mark", () => {
    expect(Object.keys(asset.families)).toHaveLength(50);
    expect(plans).toHaveLength(1827);
    for (const p of plans) {
      const before = TRIANGLE_GEOMETRY_FIGURES[p.id],
        display = present(p.id, p.source)!;
      expect(display, p.id).toContain("arithmetic-geometry-drill-segments-v1");
      expect(labels(display), p.id).toEqual(labels(p.source));
      const sourceGroup =
        /<g data-segment-source="true"[^>]*>([\s\S]*?)<\/g>/.exec(display)![1];
      // Browser XML serialization can add a space before />, not alter attributes.
      expect(
        geometry(sourceGroup).map((s) => s.replace(/\s*\/>$/, "/>")),
        p.id,
      ).toEqual(geometry(p.source).map((s) => s.replace(/\s*\/>$/, "/>")));
      expect(display).not.toMatch(
        /data-leader=|foreignObject|<script|stroke="#fff"/,
      );
      expect(p.source).toBe(before);
      expect(TRIANGLE_GEOMETRY_FIGURES[p.id]).toBe(before);
      expect(display).toContain(
        `data-endpoints="${p.given.endpoints.flat().join(" ")}"`,
      );
      expect(display).toContain(`data-segment-dimension="${p.given.key}"`);
    }
  });
  it("exact source equality, unsupported IDs and already displayed SVGs", () => {
    for (const p of plans) {
      const display = present(p.id, p.source)!;
      expect(present(p.id, p.source + " ")).toBeUndefined();
      expect(
        present(
          p.id,
          p.source.replace('stroke-width="1.6"', 'stroke-width="1.7"'),
        ),
      ).toBeUndefined();
      expect(present(p.id, display)).toBeUndefined();
      expect(present(p.id.replace("gt1-", "gt2-"), p.source)).toBeUndefined();
    }
    expect(present("gt1-unknown-1", plans[0].source)).toBeUndefined();
    expect(present(plans[0].id + "-99999", plans[0].source)).toBeUndefined();
    expect(present("__proto__", plans[0].source)).toBeUndefined();
  });
  it("plain labels become exact editor glyphs without losing metadata, endpoints or dimensions", () => {
    for (const p of plans) {
      const display = present(p.id, p.source)!,
        typed = typeset(display);
      expect(typed.match(/data-arithmetic-typeset="1"/g), p.id).toHaveLength(
        p.labels.length + 1,
      );
      expect(typed).not.toContain("<text");
      expect(typeset(typed)).toBe(typed);
      expect(typed).toContain(
        `data-endpoints="${p.given.endpoints.flat().join(" ")}"`,
      );
      expect(typed).toContain(`aria-label="${p.given.text}"`);
      expect(typed).toContain('data-line-gap="1"');
      const curve = /<path\b[^>]*data-segment-curve[^>]*\/>/.exec(typed)![0];
      expect(attr(curve, "mask")).toMatch(/^url\(#line-gap-/);
    }
  });
  it("decoded packs contain exact sources and only the supported rows", () => {
    let count = 0;
    for (const [family, packed] of Object.entries(asset.families)) {
      const decoded = JSON.parse(
        strFromU8(
          inflateSync(Uint8Array.from(atob(packed), (c) => c.charCodeAt(0))),
        ),
      ) as Record<string, [string, string]>;
      for (const [tuple, [source, display]] of Object.entries(decoded)) {
        const id = `gt1-${family}-${tuple}`;
        expect(source).toBe(TRIANGLE_GEOMETRY_FIGURES[id]);
        expect(display).toBe(present(id, source));
        count++;
      }
    }
    expect(count).toBe(1827);
  });
  it("imports lazily, reuses hits and evicts beyond four inflated families", async () => {
    vi.resetModules();
    const { presentArithmeticSegmentSvg: isolated } =
      await import("../../lib/arithmetic-v2/presentation/segments");
    const { inflateSync: inflate } = await import("fflate");
    const spy = vi.mocked(inflate);
    spy.mockClear();
    expect(spy).not.toHaveBeenCalled();
    const first = [...new Set(plans.map((p) => p.family))]
      .slice(0, 5)
      .map((f) => plans.find((p) => p.family === f)!);
    for (const p of first.slice(0, 4)) isolated(p.id, p.source);
    expect(spy).toHaveBeenCalledTimes(4);
    isolated(first[0].id, first[0].source);
    expect(spy).toHaveBeenCalledTimes(4);
    isolated(first[4].id, first[4].source);
    expect(spy).toHaveBeenCalledTimes(5);
    isolated(first[1].id, first[1].source);
    expect(spy).toHaveBeenCalledTimes(6);
  });
});
