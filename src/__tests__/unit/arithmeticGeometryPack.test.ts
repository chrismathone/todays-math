import { describe, expect, it, vi } from "vitest";
import { inflateSync, strFromU8 } from "fflate";
import { createArithmeticGeometryPackStore } from "@/lib/arithmetic-v2/geometryPack";

const svgs: Record<string, string> = {
  "test-rectangle-1":
    '<svg viewBox="0 0 240 240"><rect x="30" y="60" width="180" height="120"/></svg>',
  "test-circle-1":
    '<svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="80"/></svg>',
  "test-triangle-1":
    '<svg viewBox="0 0 240 240"><path d="M30 210L210 210L30 30Z"/></svg>',
};

describe("checked arithmetic geometry subset snapshots", () => {
  it("stores exact SVG once per distinct used figure in deterministic order", () => {
    const store = createArithmeticGeometryPackStore((id) => svgs[id]);
    const pack = store.create([
      "test-circle-1",
      "test-rectangle-1",
      "test-circle-1",
    ]);
    expect(pack.ids).toEqual(["test-circle-1", "test-rectangle-1"]);
    const bytes = Uint8Array.from(atob(pack.svgPack), (c) => c.charCodeAt(0));
    expect(JSON.parse(strFromU8(inflateSync(bytes)))).toEqual({
      "test-circle-1": svgs["test-circle-1"],
      "test-rectangle-1": svgs["test-rectangle-1"],
    });
    expect(store.create([...pack.ids].reverse())).toEqual(pack);
    expect(store.valid(JSON.parse(JSON.stringify(pack)))).toBe(true);
    expect(store.read("test-circle-1", pack)).toBe(svgs["test-circle-1"]);
  });

  it("rejects altered bytes, unknown IDs, duplicate and unordered manifests", () => {
    const store = createArithmeticGeometryPackStore((id) => svgs[id]);
    const pack = store.create(Object.keys(svgs));
    expect(
      store.valid({ ...pack, svgPack: pack.svgPack.slice(0, -4) + "AAAA" }),
    ).toBe(false);
    expect(store.valid({ ...pack, ids: [...pack.ids, "unknown"] })).toBe(false);
    expect(store.valid({ ...pack, ids: [...pack.ids, pack.ids[0]] })).toBe(
      false,
    );
    expect(store.valid({ ...pack, ids: [...pack.ids].reverse() })).toBe(false);
    expect(() => store.create(["unknown"])).toThrow();
    expect(() => store.create([])).toThrow();
    expect(() => store.create(["__proto__"])).toThrow();
  });

  it("rejects a catalog figure that is absent from the saved subset", () => {
    const store = createArithmeticGeometryPackStore((id) => svgs[id]);
    const pack = store.create(["test-circle-1"]);
    expect(() => store.read("test-rectangle-1", pack)).toThrow();
  });

  it("preserves retained SVG bytes when selected figures are replaced", () => {
    const store = createArithmeticGeometryPackStore((id) => svgs[id]);
    const before = store.create(["test-rectangle-1", "test-circle-1"]);
    const after = store.create(["test-rectangle-1", "test-triangle-1"]);
    expect(store.read("test-rectangle-1", after)).toBe(
      store.read("test-rectangle-1", before),
    );
    expect(after.ids).not.toContain("test-circle-1");
    expect(before.ids).toContain("test-circle-1");
  });

  it("does not reload trusted SVGs for each item and does not expose cached manifests", () => {
    const lookup = vi.fn((id: string) => svgs[id]);
    const store = createArithmeticGeometryPackStore(lookup);
    const pack = store.create(Object.keys(svgs));
    for (let i = 0; i < 200; i++) store.read(pack.ids[i % 3], pack);
    expect(lookup).toHaveBeenCalledTimes(3);
    pack.ids.reverse();
    expect(store.valid(pack)).toBe(false);
    expect(store.create(Object.keys(svgs)).ids).toEqual(
      Object.keys(svgs).sort(),
    );
  });

  it("bounds the number of saved assets before invoking the lookup", () => {
    const lookup = vi.fn(() => svgs["test-circle-1"]);
    const store = createArithmeticGeometryPackStore(lookup);
    expect(() =>
      store.create(Array.from({ length: 201 }, (_, n) => `shape-${n}`)),
    ).toThrow();
    expect(lookup).not.toHaveBeenCalled();
    expect(
      store.create(Array.from({ length: 200 }, (_, n) => `shape-${n}`)).ids,
    ).toHaveLength(200);
  });
});
