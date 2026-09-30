import type {
  ConceptBlankBank,
  ConceptBlankSelection,
  ConceptBlankSheet,
  SheetHeader,
} from "../../src/contracts/conceptBlank.contract";
import { BANK_PARTS } from "../../src/lib/concept-blank/bank";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import { FIXTURE_BANK } from "../../src/lib/concept-blank/fixture";
import {
  BLANK_TREE,
  getBlankSection,
} from "../../src/lib/concept-blank/sections";

/**
 * 실제 은행으로 세운 지면 — 손으로 고른 채움 글(`stress.ts` · `fuzz.ts`)이 아니라 main 의 은행(`bank/e4 · e5 · e6`)을
 * 제품 함수(`composeSheets`)로 그대로 합친다(교훈 2026-09-27 «장면과 표본은 제품 함수 · 실제 목록 전부로»).
 *
 *  · `realSheets("e5")` — 그 학년의 **모든 대단원**을 하나씩 골라 형식 다섯을 문항 수 최대로. 은행의 모든 항목이
 *    한 번은 지면에 오른다(한 번에 다 고르면 난이도별 40 상한에 잘린다).
 *  · `worstSheets()` — 초4 · 5 · 6 은행에서 **가장 긴 것끼리** 모은 최악 조합(리드 조건 ⑷): 가장 긴 뜻 문장 · 가장 긴
 *    용어 · 가장 긴 소단원 이름 · 가장 긴 ○× · 가장 긴 적용 · 이름표 · 줄이 가장 많은 그림.
 *  · `countSheets()` — 문항 수 1~정원 + 1 을 하나씩(칸이 적은 장이 비지 않는가 — A 칸 · B 문항 · D 가지 · E 카드).
 *  · `showSheets()` — 보고서 본보기(실제 은행 한 대단원 · 흔한 문항 수).
 */
const ALL = { 하: 40, 중: 40, 상: 40 };
const NONE = { 하: 0, 중: 0, 상: 0 };
const FORMS: ConceptBlankSelection["forms"] = [
  { form: "recall", counts: ALL, extras: NONE },
  { form: "term", counts: ALL, extras: ALL },
  { form: "cloze", counts: ALL, extras: ALL },
  { form: "map", counts: ALL, extras: NONE },
  { form: "figure", counts: ALL, extras: NONE },
];

export const REAL_GRADES = { e4: "초4", e5: "초5", e6: "초6" } as const;
export type RealGrade = keyof typeof REAL_GRADES;

export function realSheets(part: RealGrade): ConceptBlankSheet[] {
  const bank = BANK_PARTS[part]!;
  const stocked = new Set(
    [...bank.concepts, ...bank.ox, ...bank.apply, ...bank.figures].map(
      (x) => x.section,
    ),
  );
  const grade = BLANK_TREE.find((g) => g.grade === REAL_GRADES[part]);
  return (grade?.chapters ?? []).flatMap((chapter) => {
    const sections = chapter.sections
      .map((s) => s.key)
      .filter((k) => stocked.has(k));
    return sections.length
      ? composeSheets({ sections, forms: FORMS, date: "2026-10-01" }, bank)
      : [];
  });
}

/**
 * 보고서에 싣는 본보기 — 실제 은행의 한 대단원(초5 · 2-3 합동과 대칭, 그림 소단원이 있다)을 원장님이 흔히 고를 만한
 * 문항 수로: A 전부 · B 용어 9 + ○× · C 문장 8 + 적용(○× · 적용은 하 · 중 하나씩 — 은행에 있는 만큼) · D 가지 전부 · E 그림 전부.
 */
export function showSheets(): ConceptBlankSheet[] {
  const chapter = BLANK_TREE.find((g) => g.grade === "초5")?.chapters.find(
    (c) => c.title.includes("합동과 대칭"),
  );
  if (!chapter) return [];
  const three = { 하: 3, 중: 3, 상: 3 };
  return composeSheets(
    {
      sections: chapter.sections.map((s) => s.key),
      forms: [
        { form: "recall", counts: ALL, extras: NONE },
        { form: "term", counts: three, extras: { 하: 1, 중: 1, 상: 0 } },
        {
          form: "cloze",
          counts: { 하: 3, 중: 3, 상: 2 },
          extras: { 하: 1, 중: 1, 상: 0 },
        },
        { form: "map", counts: ALL, extras: NONE },
        { form: "figure", counts: ALL, extras: NONE },
      ],
      date: "2026-10-01",
    },
    BANK_PARTS.e5!,
  );
}

const REAL: ConceptBlankBank = {
  concepts: (["e4", "e5", "e6"] as const).flatMap(
    (p) => BANK_PARTS[p]!.concepts,
  ),
  ox: (["e4", "e5", "e6"] as const).flatMap((p) => BANK_PARTS[p]!.ox),
  apply: (["e4", "e5", "e6"] as const).flatMap((p) => BANK_PARTS[p]!.apply),
  figures: (["e4", "e5", "e6"] as const).flatMap((p) => BANK_PARTS[p]!.figures),
};

/** 긴 것부터 n 개(길이가 같으면 은행 순서). */
const longest = <T>(items: readonly T[], text: (x: T) => string, n: number) =>
  items
    .map((x, i) => ({ x, i, len: [...text(x)].length }))
    .sort((a, b) => b.len - a.len || a.i - b.i)
    .slice(0, n)
    .map((e) => e.x);

const stripCode = (title: string) =>
  title.replace(/^[12]-\d+(-\d+)?\s+/, "").replace(/^\d+\.\s*/, "");

/** 최악 조합에 쓴 글 — 보고서 표에 그대로 옮긴다. */
export function worstPicks() {
  const sections = [
    ...new Set(
      [...REAL.concepts, ...REAL.ox, ...REAL.apply, ...REAL.figures].map(
        (x) => x.section,
      ),
    ),
  ];
  const chapters = [
    ...new Set(sections.map((k) => getBlankSection(k)?.chapter ?? "")),
  ];
  return {
    definitions: longest(REAL.concepts, (c) => c.definition, 28),
    terms: longest(REAL.concepts, (c) => c.term, 18),
    sections: longest(sections, (k) => getBlankSection(k)?.title ?? k, 8),
    chapter: longest(chapters, (c) => c, 1)[0] ?? "",
    ox: longest(REAL.ox, (o) => o.statement, 9),
    oxWhy: longest(REAL.ox, (o) => o.why, 9),
    apply: longest(REAL.apply, (a) => a.prompt, 6),
    applyAnswer: longest(REAL.apply, (a) => a.answer, 6),
    figures: longest(
      REAL.figures,
      (f) =>
        "x".repeat(f.tags.length * 40 + f.lines.length * 40) +
        f.prompt +
        f.lines.map((l) => l.label + l.answer).join(""),
      12,
    ),
  };
}

export function worstSheets(): ConceptBlankSheet[] {
  const w = worstPicks();
  const first = getBlankSection(w.sections[0]!)!;
  const header = (form: SheetHeader["form"]): SheetHeader => ({
    // 제목은 고르기 상한(40자)까지 — 가장 긴 대단원 이름을 이어 붙인다
    title: `${stripCode(w.chapter)} · ${stripCode(first.title)}`.slice(0, 40),
    unitLabel: `${first.grade} · ${w.chapter} 외 11단원`,
    date: "2026-10-01",
    form,
  });
  const byLongTerm = [...w.terms];
  return [
    {
      form: "recall",
      header: header("recall"),
      zones: w.sections.map((key, i) => ({
        section: key,
        title: stripCode(getBlankSection(key)!.title),
        hint: "정의 · 성질 · 공식 · 방법 · 법칙 · 정리 · 단위",
        side: i % 2 ? ("그림" as const) : ("예" as const),
      })),
      key: [...w.definitions, ...byLongTerm],
    },
    {
      form: "term",
      header: header("term"),
      terms: [...byLongTerm, ...w.definitions.slice(0, 9)],
      ox: [...w.ox, ...w.oxWhy.filter((o) => !w.ox.includes(o))],
    },
    {
      form: "cloze",
      header: header("cloze"),
      sentences: w.definitions,
      apply: [...w.apply, ...w.applyAnswer.filter((a) => !w.apply.includes(a))],
    },
    {
      form: "map",
      header: header("map"),
      maps: [
        { hub: `${stripCode(w.chapter)} (1)`, nodes: byLongTerm.slice(0, 6) },
        {
          hub: `${stripCode(w.chapter)} (2)`,
          nodes: w.definitions.slice(0, 6),
        },
      ],
    },
    { form: "figure", header: header("figure"), figures: w.figures },
  ];
}

/** 문항 수 1 ~ 정원 + 1 — 칸이 적은 장도 아래가 비지 않는가. FIXTURE 와 실제 은행의 앞 항목을 돌려 쓴다. */
export function countSheets(): ConceptBlankSheet[] {
  const base = composeSheets(
    {
      sections: [
        ...new Set(
          [
            ...FIXTURE_BANK.concepts,
            ...FIXTURE_BANK.ox,
            ...FIXTURE_BANK.apply,
            ...FIXTURE_BANK.figures,
          ].map((x) => x.section),
        ),
      ],
      forms: FORMS,
      date: "2026-10-01",
    },
    FIXTURE_BANK,
  );
  const of = <F extends ConceptBlankSheet["form"]>(form: F) =>
    base.find((s) => s.form === form) as Extract<
      ConceptBlankSheet,
      { form: F }
    >;
  const cycle = <T>(
    items: readonly T[],
    n: number,
    id: (x: T, i: number) => T,
  ) => Array.from({ length: n }, (_, i) => id(items[i % items.length]!, i));
  const recall = of("recall");
  const term = of("term");
  const cloze = of("cloze");
  const map = of("map");
  const figure = of("figure");
  const title = (n: number) => ({ title: `${n}개`, date: "2026-10-01" });
  return [
    ...[1, 2, 3, 4, 5].map((n): ConceptBlankSheet => ({
      ...recall,
      header: { ...recall.header, ...title(n) },
      zones: cycle(recall.zones, n, (z, i) => ({
        ...z,
        section: `${z.section}#${i}`,
      })),
      key: recall.key.slice(0, n),
    })),
    ...[1, 2, 3, 5, 10].map((n): ConceptBlankSheet => ({
      ...term,
      header: { ...term.header, ...title(n) },
      terms: cycle(term.terms, n, (t, i) => ({ ...t, id: `${t.id}-${i}` })),
      ox: n % 2 ? term.ox.slice(0, 1) : [],
    })),
    ...[1, 3, 6, 14, 15].map((n): ConceptBlankSheet => ({
      ...cloze,
      header: { ...cloze.header, ...title(n) },
      sentences: cycle(cloze.sentences, n, (t, i) => ({
        ...t,
        id: `${t.id}-${i}`,
      })),
      apply: n === 3 ? cloze.apply.slice(0, 1) : [],
    })),
    {
      ...map,
      header: { ...map.header, title: "가지 1~6" },
      maps: [1, 2, 3, 4, 5, 6].map((n) => ({
        hub: `가지 ${n}`,
        nodes: cycle(term.terms, n, (t, i) => ({
          ...t,
          id: `${t.id}-m${n}-${i}`,
        })),
      })),
    },
    ...[1, 2, 3, 4, 5, 6, 7].map((n): ConceptBlankSheet => ({
      ...figure,
      header: { ...figure.header, ...title(n) },
      figures: cycle(figure.figures, n, (f, i) => ({
        ...f,
        id: `${f.id}-${n}-${i}`,
      })),
    })),
  ];
}
