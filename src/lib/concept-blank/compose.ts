import {
  CONCEPT_BLANK_LEVELS,
  type ConceptBlankBank,
  type ConceptBlankSelection,
  type ConceptBlankSheet,
  type ConceptEntry,
  type LevelCounts,
  type SheetHeader,
} from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK, sectionStock } from "./bank";
import { getBlankSection, sectionTitleTex } from "./sections";

/**
 * 고르기 → 지면(D-150). 🔴 고정이다: 무작위 없이 «소단원 순서(교육과정) → 은행 파일 순서»로 세우고,
 * 난이도 블록은 하 → 중 → 상. 같은 고르기면 언제나 같은 지면.
 */
const LEVEL_ORDER = CONCEPT_BLANK_LEVELS; // 하, 중, 상

/**
 * 난이도별 n 개씩 — 하 블록, 중 블록, 상 블록 순서. 고른 소단원이 여럿이면 **소단원 차례로 하나씩 돌려** 뽑는다
 * (은행 3차 · 26 §9 — 소단원마다 10개씩이라 «앞에서부터 n 개»면 첫 소단원만 찍힌다). 다 쓴 소단원은 건너뛰고
 * 남은 소단원이 마저 채운다. 뽑은 것은 들어온 차례(소단원 → 은행) 그대로 놓는다 — 무작위 없음(고정).
 */
export function takeByLevel<
  T extends { level: (typeof LEVEL_ORDER)[number]; section?: string },
>(items: readonly T[], counts: LevelCounts): T[] {
  return LEVEL_ORDER.flatMap((level) => {
    const queues = new Map<string, T[]>();
    for (const x of items)
      if (x.level === level) {
        const key = x.section ?? "";
        queues.set(key, [...(queues.get(key) ?? []), x]);
      }
    const taken = new Set<T>();
    let left = counts[level];
    for (let round = 0; left > 0; round++) {
      const before = left;
      for (const queue of queues.values()) {
        if (left === 0) break;
        const x = queue[round];
        if (x) {
          taken.add(x);
          left--;
        }
      }
      if (left === before) break;
    }
    return items.filter((x) => taken.has(x));
  });
}

/** 소단원 열쇠를 교육과정 순서로(모르는 열쇠는 버린다). */
export function orderedSections(keys: readonly string[]): string[] {
  return [...new Set(keys)]
    .filter((k) => getBlankSection(k))
    .sort((a, b) => getBlankSection(a)!.order - getBlankSection(b)!.order);
}

const stripCode = (title: string) =>
  title.replace(/^[12]-\d+(-\d+)?\s+/, "").replace(/^\d+\.\s*/, "");

function unitLabel(sections: string[]): string {
  const first = getBlankSection(sections[0]!)!;
  const chapters = new Set(
    sections.map(
      (k) => `${getBlankSection(k)!.grade}::${getBlankSection(k)!.chapter}`,
    ),
  );
  const base = `${first.grade} · ${first.chapter}`;
  return chapters.size > 1 ? `${base} 외 ${chapters.size - 1}단원` : base;
}

function defaultTitle(sections: string[]): string {
  const chapters = [
    ...new Set(sections.map((k) => getBlankSection(k)!.chapter)),
  ];
  return chapters.length === 1
    ? stripCode(chapters[0]!)
    : `${stripCode(chapters[0]!)} 외 ${chapters.length - 1}단원`;
}

export const MAP_NODES_PER_PAGE = 6;

export function composeSheets(
  selection: ConceptBlankSelection,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
): ConceptBlankSheet[] {
  const sections = orderedSections(selection.sections);
  if (sections.length === 0) return [];
  const stock = sections.map((k) => ({ key: k, ...sectionStock(k, bank) }));
  const pool = {
    concepts: stock.flatMap((s) => s.concepts),
    ox: stock.flatMap((s) => s.ox),
    apply: stock.flatMap((s) => s.apply),
    figures: stock.flatMap((s) => s.figures),
  };
  const all = <K extends keyof typeof pool>(k: K) => pool[k];
  const header = (form: SheetHeader["form"]): SheetHeader => ({
    title: selection.title?.trim() || defaultTitle(sections),
    unitLabel: unitLabel(sections),
    date: selection.date ?? null,
    form,
  });

  return selection.forms.flatMap(
    ({ form, counts, extras }): ConceptBlankSheet[] => {
      switch (form) {
        case "recall": {
          const key = takeByLevel(all("concepts"), counts);
          return [
            {
              form,
              header: header(form),
              zones: stock.map((s) => {
                const kinds = [...new Set(s.concepts.map((c) => c.kind))];
                return {
                  section: s.key,
                  title: stripCode(
                    sectionTitleTex(getBlankSection(s.key)!.title),
                  ),
                  hint: kinds.length ? kinds.join(" · ") : "뜻 · 예",
                  side: s.figures.length ? ("그림" as const) : ("예" as const),
                };
              }),
              key: key.sort(
                (a, b) =>
                  sections.indexOf(a.section) - sections.indexOf(b.section),
              ),
            },
          ];
        }
        case "term":
          return [
            {
              form,
              header: header(form),
              terms: takeByLevel(all("concepts"), counts),
              ox: takeByLevel(all("ox"), extras),
            },
          ];
        case "cloze":
          return [
            {
              form,
              header: header(form),
              sentences: takeByLevel(all("concepts"), counts),
              apply: takeByLevel(all("apply"), extras),
            },
          ];
        case "map": {
          // 대단원마다 지도 한 장, 가지는 여섯까지 — 넘치면 같은 대단원의 다음 지도로.
          const chosen = new Set(
            takeByLevel(all("concepts"), counts).map((c) => c.id),
          );
          const byChapter = new Map<string, ConceptEntry[]>();
          for (const s of stock) {
            const ch = getBlankSection(s.key)!.chapter;
            byChapter.set(ch, [
              ...(byChapter.get(ch) ?? []),
              ...s.concepts.filter((c) => chosen.has(c.id)),
            ]);
          }
          const maps = [...byChapter].flatMap(([ch, nodes]) => {
            const pages: { hub: string; nodes: ConceptEntry[] }[] = [];
            for (let i = 0; i < nodes.length; i += MAP_NODES_PER_PAGE)
              pages.push({
                hub:
                  stripCode(ch) +
                  (nodes.length > MAP_NODES_PER_PAGE
                    ? ` (${i / MAP_NODES_PER_PAGE + 1})`
                    : ""),
                nodes: nodes.slice(i, i + MAP_NODES_PER_PAGE),
              });
            return pages;
          });
          return maps.length ? [{ form, header: header(form), maps }] : [];
        }
        case "figure": {
          const figures = takeByLevel(all("figures"), counts);
          return figures.length
            ? [{ form, header: header(form), figures }]
            : [];
        }
      }
    },
  );
}

/** 소단원 하나의 재고 — 화면 나무의 숫자 칸. */
export function stockCounts(
  key: string,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
) {
  const s = sectionStock(key, bank);
  const byLevel = <T extends { level: string }>(xs: T[]) =>
    Object.fromEntries(
      LEVEL_ORDER.map((l) => [l, xs.filter((x) => x.level === l).length]),
    ) as LevelCounts;
  return {
    concepts: byLevel(s.concepts),
    ox: byLevel(s.ox),
    apply: byLevel(s.apply),
    figures: byLevel(s.figures),
    total: s.concepts.length + s.ox.length + s.apply.length + s.figures.length,
  };
}
