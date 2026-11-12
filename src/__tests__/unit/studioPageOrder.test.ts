import { describe, expect, it } from "vitest";
import {
  activePageOrder,
  commitPageOrder,
  createPageOrderHistory,
  initialPageOrder,
  movePage,
  pageNumber,
  reconcilePageOrder,
  studioPageKey,
  togglePageOut,
  undoPageOrder,
  type StudioOrderedPage,
} from "@/components/unified/studioPageOrder";

const sources = [
  { id: "a", pages: 3 },
  { id: "b", pages: 2 },
];
const page = (
  sourceId: string,
  number: number,
  out = false,
): StudioOrderedPage => ({ sourceId, page: number, out });
const keys = (order: readonly StudioOrderedPage[]) => order.map(studioPageKey);
const key = (sourceId: string, number: number) =>
  studioPageKey({ sourceId, page: number });

describe("studio page identity and reconciliation", () => {
  it("keeps original page identity separate from its new position", () => {
    expect(studioPageKey(page("a", 1))).toBe(studioPageKey(page("a", 1, true)));
    expect(studioPageKey(page("a", 1))).not.toBe(studioPageKey(page("a", 2)));
    expect(studioPageKey(page("a:1", 2))).not.toBe(
      studioPageKey(page("a", 12)),
    );
  });

  it("starts in file order then one-based original page order", () => {
    expect(initialPageOrder(sources)).toEqual([
      page("a", 1),
      page("a", 2),
      page("a", 3),
      page("b", 1),
      page("b", 2),
    ]);
    expect(initialPageOrder([])).toEqual([]);
  });

  it("does not invent pages for invalid counts or duplicate sources", () => {
    expect(
      initialPageOrder([
        { id: "a", pages: 2 },
        { id: "a", pages: 2 },
        { id: "zero", pages: 0 },
        { id: "negative", pages: -1 },
        { id: "fraction", pages: 1.5 },
        { id: "infinite", pages: Infinity },
        { id: "nan", pages: NaN },
      ]),
    ).toEqual([page("a", 1), page("a", 2)]);
  });

  it("restores old sessions and appends new files without resetting exclusions", () => {
    expect(reconcilePageOrder(undefined, sources)).toEqual(
      initialPageOrder(sources),
    );
    const saved: StudioOrderedPage[] = [
      { ...page("b", 2, true), autoOut: "표지" },
      page("a", 2),
    ];
    expect(
      reconcilePageOrder(saved, [...sources, { id: "c", pages: 1 }]),
    ).toEqual([
      saved[0],
      saved[1],
      page("a", 1),
      page("a", 3),
      page("b", 1),
      page("c", 1),
    ]);
  });

  it("discards unknown, out-of-range and duplicate saved pages; first occurrence wins", () => {
    const saved = [
      page("missing", 1),
      page("a", 0),
      page("a", 4),
      page("a", 1.5),
      page("b", 2, true),
      page("b", 2),
      page("a", 1),
    ];
    expect(reconcilePageOrder(saved, sources)).toEqual([
      page("b", 2, true),
      page("a", 1),
      page("a", 2),
      page("a", 3),
      page("b", 1),
    ]);
    expect(reconcilePageOrder(saved, [])).toEqual([]);
  });

  // Exercise damaged persisted JSON despite the compile-time contract.
  const restoreRuntime = (saved: unknown) =>
    reconcilePageOrder(saved as readonly StudioOrderedPage[], sources);

  it.each([null, false, 42, "damaged", { length: 2, 0: page("a", 1) }])(
    "uses initial order when the saved array is corrupt: %j",
    (saved) => {
      expect(restoreRuntime(saved)).toEqual(initialPageOrder(sources));
    },
  );

  it("skips null, primitive, nested-array and malformed-identity entries", () => {
    const saved = [
      null,
      undefined,
      1,
      "a",
      false,
      [],
      {},
      { sourceId: "a", page: "1", out: true },
      { sourceId: 1, page: 1, out: true },
      { sourceId: "a", page: NaN, out: true },
      { sourceId: "a", page: Infinity, out: true },
      { sourceId: "a", page: 1.5, out: true },
      page("b", 2, true),
    ];
    expect(restoreRuntime(saved)).toEqual([
      page("b", 2, true),
      page("a", 1),
      page("a", 2),
      page("a", 3),
      page("b", 1),
    ]);
  });

  it.each([1, 0, "true", "false", null, undefined, {}, []].map((out) => [out]))(
    "does not exclude a page for a nonboolean out value: %j",
    (out) => {
      const restored = restoreRuntime([{ sourceId: "a", page: 2, out }]);
      expect(restored).toEqual([
        page("a", 2),
        page("a", 1),
        page("a", 3),
        page("b", 1),
        page("b", 2),
      ]);
      expect(activePageOrder(restored)).toHaveLength(5);
    },
  );

  it.each(["cover", "", null, 1, {}, ["표지"]].map((autoOut) => [autoOut]))(
    "drops an invalid automatic reason while preserving a boolean manual exclusion: %j",
    (autoOut) => {
      const saved = [{ sourceId: "a", page: 2, out: true, autoOut }];
      const restored = restoreRuntime(saved);
      expect(restored[0]).toEqual(page("a", 2, true));
      expect(restored[0]).not.toHaveProperty("autoOut");
      expect(saved[0].autoOut).toBe(autoOut);
    },
  );

  it.each(["표지", "정답표", "빈 쪽"] as const)(
    "keeps a valid automatic reason without letting it imply exclusion: %s",
    (autoOut) => {
      expect(
        restoreRuntime([{ sourceId: "a", page: 2, out: "true", autoOut }])[0],
      ).toEqual({ ...page("a", 2), autoOut });
      const valid = [{ ...page("a", 2, true), autoOut }, page("b", 1)];
      expect(reconcilePageOrder(valid, sources).slice(0, 2)).toEqual(valid);
    },
  );

  it("keeps the first known identity and only carries recognized page fields", () => {
    const restored = restoreRuntime([
      {
        sourceId: "b",
        page: 2,
        out: "false",
        autoOut: "unknown",
        extra: "damaged",
      },
      { sourceId: "b", page: 2, out: true, autoOut: "表紙" },
    ]);
    expect(restored).toEqual([
      page("b", 2),
      page("a", 1),
      page("a", 2),
      page("a", 3),
      page("b", 1),
    ]);
  });
});

describe("studio page movement", () => {
  it.each([
    ["first", ["b2", "a1", "a2", "a3", "b1"]],
    ["previous", ["a1", "a2", "a3", "b2", "b1"]],
  ] as const)("moves across files with %s", (direction, expected) => {
    const order = initialPageOrder(sources);
    expect(
      movePage(order, key("b", 2), direction).map(
        (p) => `${p.sourceId}${p.page}`,
      ),
    ).toEqual(expected);
    expect(order).toEqual(initialPageOrder(sources));
  });

  it.each([
    ["next", ["a2", "a1", "a3", "b1", "b2"]],
    ["last", ["a2", "a3", "b1", "b2", "a1"]],
  ] as const)("moves forward with %s", (direction, expected) => {
    expect(
      movePage(initialPageOrder(sources), key("a", 1), direction).map(
        (p) => `${p.sourceId}${p.page}`,
      ),
    ).toEqual(expected);
  });

  it("counts previous/next by active pages while retaining removed placeholders", () => {
    const order = [
      page("a", 1),
      page("a", 2, true),
      page("a", 3),
      page("b", 1),
    ];
    expect(movePage(order, key("a", 1), "next")).toEqual([
      page("a", 2, true),
      page("a", 3),
      page("a", 1),
      page("b", 1),
    ]);
    expect(movePage(order, key("a", 3), "previous")).toEqual([
      page("a", 3),
      page("a", 1),
      page("a", 2, true),
      page("b", 1),
    ]);
  });

  it("first and last target the active sequence; leading/trailing exclusions stay", () => {
    const order = [
      page("a", 1, true),
      page("a", 2),
      page("a", 3),
      page("b", 1, true),
    ];
    expect(movePage(order, key("a", 3), "first")).toEqual([
      order[0],
      order[2],
      order[1],
      order[3],
    ]);
    expect(movePage(order, key("a", 2), "last")).toEqual([
      order[0],
      order[2],
      order[1],
      order[3],
    ]);
    expect(movePage(order, key("a", 2), "first")).toEqual(order);
    expect(movePage(order, key("a", 3), "last")).toEqual(order);
  });

  it("drops before any page, including an excluded page, or at the physical end", () => {
    const order = [
      page("a", 1),
      page("a", 2, true),
      page("a", 3),
      page("b", 1),
    ];
    expect(movePage(order, key("b", 1), { before: key("a", 2) })).toEqual([
      order[0],
      order[3],
      order[1],
      order[2],
    ]);
    expect(movePage(order, key("a", 1), { before: null })).toEqual([
      order[1],
      order[2],
      order[3],
      order[0],
    ]);
    expect(movePage(order, key("a", 2), { before: key("b", 1) })).toEqual([
      order[0],
      order[2],
      order[1],
      order[3],
    ]);
  });

  it("treats unknown, self, adjacent and boundary moves as no-ops", () => {
    const order = initialPageOrder(sources);
    expect(movePage(order, "missing", "next")).toEqual(order);
    expect(movePage(order, key("a", 1), "previous")).toEqual(order);
    expect(movePage(order, key("b", 2), "next")).toEqual(order);
    expect(movePage(order, key("a", 1), { before: "missing" })).toEqual(order);
    expect(movePage(order, key("a", 1), { before: key("a", 1) })).toEqual(
      order,
    );
    expect(movePage(order, key("a", 1), { before: key("a", 2) })).toEqual(
      order,
    );
    expect(movePage(order, key("b", 2), { before: null })).toEqual(order);
    expect(movePage([], "missing", "first")).toEqual([]);
  });
});

describe("studio page exclusions and numbering", () => {
  it("excludes without deleting or changing identity and restores in place", () => {
    const order: StudioOrderedPage[] = [
      page("b", 2),
      { ...page("a", 1, true), autoOut: "표지" },
      page("a", 2),
    ];
    const restored = togglePageOut(order, key("a", 1));
    expect(restored).toEqual([order[0], { ...order[1], out: false }, order[2]]);
    expect(togglePageOut(restored, key("a", 1))).toEqual(order);
    expect(togglePageOut(order, "missing")).toEqual(order);
    expect(keys(restored)).toEqual(keys(order));
    expect(order[1].out).toBe(true);
  });

  it("numbers active pages globally from one, never numbering removed/unknown pages", () => {
    const order = [page("b", 2), page("a", 1, true), page("a", 2)];
    expect(activePageOrder(order)).toEqual([order[0], order[2]]);
    expect(pageNumber(order, key("b", 2))).toBe(1);
    expect(pageNumber(order, key("a", 1))).toBeNull();
    expect(pageNumber(order, key("a", 2))).toBe(2);
    expect(pageNumber(order, "missing")).toBeNull();
    expect(activePageOrder([page("a", 1, true)])).toEqual([]);
    expect(pageNumber([], "missing")).toBeNull();
  });
});

describe("studio page undo history", () => {
  it("undoes each actual move and exclusion one at a time", () => {
    const order = initialPageOrder(sources);
    const start = createPageOrderHistory(order);
    const moved = commitPageOrder(
      start,
      movePage(start.present, key("b", 2), "first"),
    );
    const excluded = commitPageOrder(
      moved,
      togglePageOut(moved.present, key("a", 1)),
    );
    expect(start.past).toEqual([]);
    expect(excluded.past).toEqual([order, moved.present]);
    expect(undoPageOrder(excluded)).toEqual(moved);
    expect(undoPageOrder(undoPageOrder(excluded))).toEqual(start);
    expect(undoPageOrder(start)).toBe(start);
  });

  it("does not record no-op mutations or equal arrays as undo entries", () => {
    const start = createPageOrderHistory(initialPageOrder(sources));
    expect(commitPageOrder(start, start.present)).toBe(start);
    expect(
      commitPageOrder(
        start,
        start.present.map((entry) => ({ ...entry })),
      ),
    ).toBe(start);
    expect(
      commitPageOrder(start, movePage(start.present, key("a", 1), "first")),
    ).toBe(start);
    expect(
      commitPageOrder(start, togglePageOut(start.present, "missing")),
    ).toBe(start);
    const changedReason = start.present.map((entry, index) =>
      index ? entry : { ...entry, autoOut: "표지" as const },
    );
    expect(commitPageOrder(start, changedReason).past).toHaveLength(1);
  });

  it("takes snapshots so caller mutations cannot corrupt past or present", () => {
    const input = initialPageOrder(sources);
    const start = createPageOrderHistory(input);
    input[0].out = true;
    input.pop();
    expect(start.present).toEqual(initialPageOrder(sources));
    const next = togglePageOut(start.present, key("a", 1));
    const changed = commitPageOrder(start, next);
    next[0].out = false;
    start.present[0].out = true;
    expect(changed.present[0].out).toBe(true);
    expect(changed.past[0][0].out).toBe(false);
  });
});
