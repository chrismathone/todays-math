import {
  CONCEPT_BLANK_LEVELS,
  type ConceptBlankBank,
  type ConceptBlankSelection,
  type ConceptBlankSheet,
  type ConceptEntry,
  type LevelCounts,
  type SheetHeader,
} from "@/contracts/conceptBlank.contract";
import { sectionStock } from "./bank/stock";
import { getBlankSection, sectionTitleTex } from "./sections";
import { composeExactSheets, type ResolvedBlankSection } from "./exactPick";
import {
  conceptSupportsForm,
  mapQuestionMode,
  MAP_NODES_PER_PAGE,
  QUESTION_MAP_NODES_PER_PAGE,
} from "./questions";

/**
 * 고르기 → 지면(D-150). 🔴 고정이다: 무작위 없이 «소단원 순서(교육과정) → 은행 파일 순서»로 세우고,
 * 난이도 블록은 하 → 중 → 상. 같은 고르기면 언제나 같은 지면.
 */
const LEVEL_ORDER = CONCEPT_BLANK_LEVELS; // 하, 중, 상

/**
 * 난이도별 n 개씩 — 하 블록, 중 블록, 상 블록 순서. 고른 소단원이 여럿이면 **소단원 차례로 하나씩 돌려** 뽑는다
 * (은행 3차 · 26 §9 — 소단원마다 10개씩이라 «앞에서부터 n 개»면 첫 소단원만 찍힌다). 다 쓴 소단원은 건너뛰고
 * 남은 소단원이 마저 채운다. 마지막 바퀴에서 수가 모자라면 범위 전체에 고르게 편다(앞 소단원만 채우지 않는다). 뽑은 것은 들어온 차례(소단원 → 은행) 그대로 놓는다 — 무작위 없음(고정).
 */
export function takeByLevel<
  T extends { level: (typeof LEVEL_ORDER)[number]; section?: string },
>(items: readonly T[], counts: LevelCounts): T[] {
  return LEVEL_ORDER.flatMap((level, levelIndex) => {
    const queues = new Map<string, T[]>();
    for (const x of items)
      if (x.level === level) {
        const key = x.section ?? "";
        queues.set(key, [...(queues.get(key) ?? []), x]);
      }
    const taken = new Set<T>();
    let left = counts[level];
    for (let round = 0; left > 0; round++) {
      const candidates = [...queues.values()]
        .map((queue) => queue[round])
        .filter((x): x is T => x !== undefined);
      if (candidates.length === 0) break;
      if (left >= candidates.length) {
        for (const x of candidates) taken.add(x);
        left -= candidates.length;
        continue;
      }
      // 남은 수가 이 바퀴의 소단원 수보다 적다 — 앞에서부터 채우면 뒤 소단원이 영영 빠진다
      // (인재원 2026-11-12). 범위 전체에 고르게 펴고, 난이도마다 자리를 비켜 하 · 중 · 상이 서로 다른 소단원을 짚게 한다.
      const m = candidates.length;
      const shift = (levelIndex + 0.5) / LEVEL_ORDER.length;
      for (let j = 0; j < left; j++)
        taken.add(candidates[Math.floor(((j + shift) * m) / left)]!);
      left = 0;
    }
    return items.filter((x) => taken.has(x));
  });
}

/** A(완전 백지) 채점표에 실을 수 있는 개념 — 사례 문항(`givenCase`)이 아닌 것. */
export const recallable = (concept: ConceptEntry) => !concept.givenCase;

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

export { MAP_NODES_PER_PAGE } from "./questions";

export function composeSheets(
  selection: ConceptBlankSelection,
  bank: ConceptBlankBank,
  resolvedSections?: readonly ResolvedBlankSection[],
): ConceptBlankSheet[] {
  if (selection.pick !== undefined)
    return composeExactSheets(selection, bank, resolvedSections);
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
          // 사례 문항은 A 채점표에 싣지 않는다 — 소단원 이름만 보고는 그 수를 떠올릴 수도, 줄과 맞춰 볼 수도 없다(26 §10).
          const recallables = all("concepts").filter(recallable);
          const key = takeByLevel(recallables, counts);
          return [
            {
              form,
              header: header(form),
              omittedCases: all("concepts").length - recallables.length,
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
              terms: takeByLevel(
                all("concepts").filter((c) => conceptSupportsForm(c, "term")),
                counts,
              ),
              ox: takeByLevel(all("ox"), extras),
            },
          ];
        case "cloze":
          return [
            {
              form,
              header: header(form),
              sentences: takeByLevel(
                all("concepts").filter((c) => conceptSupportsForm(c, "cloze")),
                counts,
              ),
              apply: takeByLevel(all("apply"), extras),
            },
          ];
        case "map": {
          // 대단원마다 지도 한 장, 가지는 여섯까지 — 넘치면 같은 대단원의 다음 지도로.
          const chosen = new Set(
            takeByLevel(
              all("concepts").filter((c) => conceptSupportsForm(c, "map")),
              counts,
            ).map((c) => c.id),
          );
          const byChapter = new Map<string, ConceptEntry[]>();
          for (const s of stock) {
            const ch = getBlankSection(s.key)!.chapter;
            byChapter.set(ch, [
              ...(byChapter.get(ch) ?? []),
              ...s.concepts.filter((c) => chosen.has(c.id)),
            ]);
          }
          const questionMode = mapQuestionMode([...byChapter.values()].flat());
          const limit = questionMode
            ? QUESTION_MAP_NODES_PER_PAGE
            : MAP_NODES_PER_PAGE;
          const maps = [...byChapter].flatMap(([ch, nodes]) => {
            const pages: { hub: string; nodes: ConceptEntry[] }[] = [];
            for (let i = 0; i < nodes.length; i += limit)
              pages.push({
                hub:
                  stripCode(ch) +
                  (nodes.length > limit ? ` (${i / limit + 1})` : ""),
                nodes: nodes.slice(i, i + limit),
              });
            return pages;
          });
          return maps.length
            ? [
                {
                  form,
                  header: header(form),
                  maps,
                  ...(questionMode ? { questionMode: true as const } : {}),
                },
              ]
            : [];
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

/** 지면 한 벌에 찍히는 문항 수 — 화면의 합계 · 내 시험지의 «문항 수»(26 §9 ⑾). */
export function sheetItemCount(sheet: ConceptBlankSheet): number {
  switch (sheet.form) {
    case "recall":
      return sheet.key.length;
    case "term":
      return sheet.terms.length + sheet.ox.length;
    case "cloze":
      return sheet.sentences.length + sheet.apply.length;
    case "map":
      return sheet.maps.reduce((n, m) => n + m.nodes.length, 0);
    case "figure":
      return sheet.figures.length;
  }
}

export type StockCounts = ReturnType<typeof stockCounts>;

/**
 * 은행 전체의 재고표 — 소단원 열쇠 → `stockCounts` 와 같은 꼴. 은행을 한 번만 훑는다
 * (은행 3차로 문항이 열 배 — 나무의 소단원 360개마다 은행 전체를 훑으면 화면을 열 때 느리다).
 * 문항이 없는 소단원은 표에 없다.
 */
export function stockTable(bank: ConceptBlankBank): Map<string, StockCounts> {
  const table = new Map<string, StockCounts>();
  const row = (section: string) => {
    let r = table.get(section);
    if (!r) {
      const zero = () => ({ 하: 0, 중: 0, 상: 0 });
      r = {
        concepts: zero(),
        term: zero(),
        cloze: zero(),
        map: zero(),
        recall: zero(),
        ox: zero(),
        apply: zero(),
        figures: zero(),
        total: 0,
      };
      table.set(section, r);
    }
    return r;
  };
  for (const kind of ["concepts", "ox", "apply", "figures"] as const)
    for (const item of bank[kind]) {
      const r = row(item.section);
      r[kind][item.level] += 1;
      r.total += 1;
    }
  for (const concept of bank.concepts) {
    const r = row(concept.section);
    if (recallable(concept)) r.recall[concept.level] += 1;
    if (conceptSupportsForm(concept, "term")) r.term[concept.level] += 1;
    if (conceptSupportsForm(concept, "cloze")) r.cloze[concept.level] += 1;
    if (conceptSupportsForm(concept, "map")) r.map[concept.level] += 1;
  }
  return table;
}

/** 소단원 하나의 재고 — 화면 나무의 숫자 칸. */
export function stockCounts(key: string, bank: ConceptBlankBank) {
  const s = sectionStock(key, bank);
  const byLevel = <T extends { level: string }>(xs: T[]) =>
    Object.fromEntries(
      LEVEL_ORDER.map((l) => [l, xs.filter((x) => x.level === l).length]),
    ) as LevelCounts;
  return {
    concepts: byLevel(s.concepts),
    map: byLevel(
      s.concepts.filter((entry) => conceptSupportsForm(entry, "map")),
    ),
    term: byLevel(
      s.concepts.filter((entry) => conceptSupportsForm(entry, "term")),
    ),
    cloze: byLevel(
      s.concepts.filter((entry) => conceptSupportsForm(entry, "cloze")),
    ),
    /** A(완전 백지)에 실을 수 있는 개념 — 사례 문항을 뺀 수(`total` 에는 더하지 않는다). */
    recall: byLevel(s.concepts.filter(recallable)),
    ox: byLevel(s.ox),
    apply: byLevel(s.apply),
    figures: byLevel(s.figures),
    total: s.concepts.length + s.ox.length + s.apply.length + s.figures.length,
  };
}
