/** Newly analyzed pages may only be automatically excluded as rendered blanks. */
export type StudioAutoOut = "빈 쪽";

/** Read-only provenance from older saved work; never generate these reasons. */
type LegacyStudioAutoOut = "표지" | "정답표";

/** Original page identity never changes when pages move or are excluded. */
export interface StudioOrderedPage {
  sourceId: string;
  page: number;
  out: boolean;
  /** Preserve legacy exclusions on restore without classifying those pages again. */
  autoOut?: StudioAutoOut | LegacyStudioAutoOut;
}

export interface StudioPageSource {
  id: string;
  pages: number;
}

export interface StudioPageOrderHistory {
  present: StudioOrderedPage[];
  past: StudioOrderedPage[][];
}

export type StudioPageMove =
  "first" | "previous" | "next" | "last" | { before: string | null };

export function studioPageKey(page: {
  sourceId: string;
  page: number;
}): string {
  return JSON.stringify([page.sourceId, page.page]);
}

export function initialPageOrder(
  sources: readonly StudioPageSource[],
): StudioOrderedPage[] {
  const seen = new Set<string>();
  return sources.flatMap((source) => {
    if (seen.has(source.id)) return [];
    seen.add(source.id);
    if (!Number.isSafeInteger(source.pages) || source.pages < 1) return [];
    return Array.from({ length: source.pages }, (_, index) => ({
      sourceId: source.id,
      page: index + 1,
      out: false,
    }));
  });
}

function readSavedPage(value: unknown): StudioOrderedPage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const row = value as Record<string, unknown>;
  if (
    typeof row.sourceId !== "string" ||
    typeof row.page !== "number" ||
    !Number.isSafeInteger(row.page) ||
    row.page < 1
  )
    return undefined;
  // A damaged truthy value must never silently remove a question-bearing page.
  const page: StudioOrderedPage = {
    sourceId: row.sourceId,
    page: row.page,
    out: row.out === true,
  };
  if (
    row.autoOut === "표지" ||
    row.autoOut === "정답표" ||
    row.autoOut === "빈 쪽"
  ) {
    page.autoOut = row.autoOut;
  }
  return page;
}

/** Normalize persisted fields, keep first known identities, then append missing pages. */
export function reconcilePageOrder(
  saved: readonly StudioOrderedPage[] | undefined,
  sources: readonly StudioPageSource[],
): StudioOrderedPage[] {
  const initial = initialPageOrder(sources);
  const available = new Set(initial.map(studioPageKey));
  const reconciled: StudioOrderedPage[] = [];
  const entries: readonly unknown[] = Array.isArray(saved) ? saved : [];
  for (const entry of entries) {
    const page = readSavedPage(entry);
    if (!page) continue;
    const key = studioPageKey(page);
    if (!available.delete(key)) continue;
    reconciled.push(page);
  }
  return [
    ...reconciled,
    ...initial.filter((page) => available.has(studioPageKey(page))),
  ];
}

/**
 * Relative controls cross one live page; first/last use the live endpoints.
 * Excluded pages are retained in the sequence, never filtered out by a move.
 * A drop targets the physical sequence (including excluded pages); null appends.
 */
export function movePage(
  order: readonly StudioOrderedPage[],
  key: string,
  direction: StudioPageMove,
): StudioOrderedPage[] {
  const from = order.findIndex((page) => studioPageKey(page) === key);
  if (from < 0) return [...order];
  let boundary: number;
  if (typeof direction === "object") {
    if (direction.before === key) return [...order];
    boundary =
      direction.before === null
        ? order.length
        : order.findIndex((page) => studioPageKey(page) === direction.before);
    if (boundary < 0) return [...order];
  } else {
    const live = order
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => !page.out);
    const target =
      direction === "first"
        ? live[0]
        : direction === "last"
          ? live[live.length - 1]
          : direction === "previous"
            ? live.filter(({ index }) => index < from).pop()
            : live.find(({ index }) => index > from);
    if (!target || target.index === from) return [...order];
    boundary =
      target.index + (direction === "next" || direction === "last" ? 1 : 0);
  }
  const next = [...order];
  const [moving] = next.splice(from, 1);
  next.splice(boundary - (from < boundary ? 1 : 0), 0, moving);
  return next;
}

/** Restoring an automatically excluded page keeps the reason as provenance. */
export function togglePageOut(
  order: readonly StudioOrderedPage[],
  key: string,
): StudioOrderedPage[] {
  return order.map((page) =>
    studioPageKey(page) === key ? { ...page, out: !page.out } : page,
  );
}

export function activePageOrder(
  order: readonly StudioOrderedPage[],
): StudioOrderedPage[] {
  return order.filter((page) => !page.out);
}

/** New page numbers are global, one-based, and exclude removed pages. */
export function pageNumber(
  order: readonly StudioOrderedPage[],
  key: string,
): number | null {
  let number = 0;
  for (const page of order) {
    if (page.out) continue;
    number += 1;
    if (studioPageKey(page) === key) return number;
  }
  return null;
}

function snapshot(order: readonly StudioOrderedPage[]): StudioOrderedPage[] {
  return order.map((page) => ({ ...page }));
}

export function createPageOrderHistory(
  order: readonly StudioOrderedPage[],
): StudioPageOrderHistory {
  return { present: snapshot(order), past: [] };
}

export function commitPageOrder(
  history: StudioPageOrderHistory,
  next: readonly StudioOrderedPage[],
): StudioPageOrderHistory {
  const same =
    history.present.length === next.length &&
    history.present.every((page, index) => {
      const other = next[index];
      return (
        page.sourceId === other.sourceId &&
        page.page === other.page &&
        page.out === other.out &&
        page.autoOut === other.autoOut
      );
    });
  if (same) return history;
  return {
    present: snapshot(next),
    past: [...history.past.map(snapshot), snapshot(history.present)],
  };
}

export function undoPageOrder(
  history: StudioPageOrderHistory,
): StudioPageOrderHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    present: snapshot(previous),
    past: history.past.slice(0, -1).map(snapshot),
  };
}
