import type {
  ApplyItem,
  ConceptBlankSheet,
  ConceptEntry,
  FigureItem,
  OxItem,
} from "@/contracts/conceptBlank.contract";

import {
  blankWidth,
  circled,
  estimateLines,
  plainSentence,
  sentenceKeywords,
  splitSentence,
} from "./text";

/**
 * 개념 백지 쪽 나누기(D-150 · 브리프 cb-paper) — 🔴 **DOM 을 재지 않는 고정 규칙**이다. 같은 지면 모델이면
 * 서버 · 화면 · 시험 어디서나 같은 장 수가 나온다.
 *
 * 장마다 **정원**(A 네 칸 · B 아홉 문항 · C 문장 여덟 + 적용 · D 지도 하나 · E 여섯 · 채점표 열두 줄)을 넘지 않는다.
 * 정원만으로는 긴 뜻 문장(계약 상한 160자)에서 넘친다 — B · C · 채점표는 **글 길이로 어림한 높이**가 장의 몸 높이를
 * 넘어도 다음 장으로 넘긴다(`GEOMETRY` — `paper.module.css` 의 치수를 그대로 옮긴 값. CSS 를 바꾸면 여기도 바꾼다).
 * 넘침 0 은 Playwright 가 인쇄 매체로 잰다(`e2e/concept-blank-paper`).
 * A · D · E 는 칸이 늘고 줄어드는(flex) 틀이라 정원만 본다.
 */
export const PAGE_CAPS = {
  recall: 4,
  term: 9,
  cloze: 8,
  map: 1,
  figure: 6,
  key: 12,
} as const;

/**
 * 어림에 쓰는 치수(px, 96dpi A4 794×1123) — `paper.module.css` 와 짝. 몸 높이 · 한 덩이 높이는 Playwright 인쇄 매체에서
 * 잰 값이다(2026-09-30 · `e2e/concept-blank-paper`). 몸 높이는 제목이 두 줄로 접힌 머리를 기준으로 여유를 조금 뺐다.
 */
export const GEOMETRY = {
  /**
   * 학생지 첫 장 · 이어지는 장의 몸 높이(머리 · 발 사이). 잰 값 911.6(제목 두 줄) · 1009.5 에서
   * 어림이 한 줄쯤 모자랄 때를 위해 16~20px 을 남긴다.
   */
  bodyFirst: 895,
  bodyNext: 990,
  /** 채점표 첫 장 · 이어지는 장의 줄 칸 높이(머리 · 표 머리 사이, 채점 안내 상자 뺌). 잰 값 946.3 · 1011.3 에서 한 줄(18)을 남긴다. */
  keyFirst: 928,
  keyNext: 993,
  /** 채점 안내 상자 — 위 여백 12 + 테두리 · 안쪽 22 + «채점» 19.2, 줄마다 17.6(11px · 1.6). */
  notes: { fixed: 53.2, line: 17.6, font: 11, width: 666 },
  contentWidth: 694,
  /** «문 n» 자리. */
  numberWidth: 56,
  /** B 용어 — 잰 값 95.5(한 줄 + 쓰기 두 줄). */
  term: { font: 15, line: 22.5, ruledLine: 30, fixed: 13 },
  /** B ○× — 잰 값 71.5(한 줄) · 90.5(두 줄), 첫 ○× 앞 안내 줄 28. */
  ox: { font: 13.5, line: 20.25, fixed: 51.3, part: 28 },
  /** C 문장 — 잰 값 45.1 · 75.2 · 105.3(+ 사이 4), 수식 줄은 4 까지 높다. «가» 머리 34 + 목록 아래 14. */
  sentence: { font: 14, line: 30.1, fixed: 19.1, math: 4, part: 48 },
  /** C 적용 — 테두리 · 안쪽 26 + 답 줄 36, 물음 줄 21, 사이 12. «나» 머리 34. */
  apply: { font: 14, line: 21, fixed: 62, gap: 12, part: 34, width: 566 },
  key: {
    font: 11.5,
    /** 11.5px · 1.55 */
    line: 17.83,
    /** 예 · 물음 줄 — 10px · 1.55 + 위 여백 2 */
    sub: 15.5,
    subGap: 2,
    /** 소단원 이름 — 9px · 1.55 + 위 여백 2 */
    place: 13.95,
    /** 칸 위아래 7 + 밑줄 1 */
    fixed: 15,
    conceptWidth: 118,
    textWidth: 508,
    /** 그림 줄 — 작은 그림(폭 150) 옆 글 칸 */
    figureTextWidth: 348,
  },
} as const;

/* ───────── 학생지 한 장 ───────── */

export type RecallZone = Extract<
  ConceptBlankSheet,
  { form: "recall" }
>["zones"][number];
export type TermBlock =
  | { kind: "term"; n: number; entry: ConceptEntry }
  | { kind: "ox"; n: number; item: OxItem };
export type ClozeBlock =
  | { kind: "sentence"; n: number; entry: ConceptEntry }
  | { kind: "apply"; n: number; item: ApplyItem };
export type MapPlan = Extract<
  ConceptBlankSheet,
  { form: "map" }
>["maps"][number];

export type StudentPage =
  | { form: "recall"; zones: { n: number; zone: RecallZone }[] }
  | { form: "term"; blocks: TermBlock[] }
  | { form: "cloze"; blocks: ClozeBlock[] }
  | { form: "map"; n: number; map: MapPlan }
  | { form: "figure"; cards: { n: number; figure: FigureItem }[] };

/* ───────── 채점표 한 줄 ───────── */

export type KeyRow =
  | {
      kind: "concept";
      n: string;
      entry: ConceptEntry;
      /** 채점 칸 아래 작은 글(A 의 소단원 · D 의 지도 이름). */
      place?: string;
      /** 예 줄 — D 는 예 칸의 답(예가 없으면 «뜻에 맞는 예»), A 는 참고로 은행의 예. */
      example?: "answer" | "reference" | "free";
    }
  | { kind: "ox"; n: string; item: OxItem }
  | { kind: "apply"; n: string; item: ApplyItem }
  | { kind: "figure"; n: string; item: FigureItem };

export type SheetPlan = {
  sheet: ConceptBlankSheet;
  student: StudentPage[];
  key: KeyRow[][];
  /** 학생지 첫 장 발의 «맞은 개수» 칸. */
  tally: string;
};

/** 정원 · 높이 어림으로 앞에서부터 채운다. 한 덩이가 몸보다 커도 빈 장을 만들지 않고 그 장에 혼자 둔다. */
export function packPages<T>(
  items: readonly T[],
  cap: number,
  cost: (item: T, prev: T | undefined) => number,
  body: (pageIndex: number) => number,
): T[][] {
  const pages: T[][] = [];
  let page: T[] = [];
  let used = 0;
  for (const item of items) {
    const c = cost(item, page[page.length - 1]);
    if (
      page.length > 0 &&
      (page.length >= cap || used + c > body(pages.length))
    ) {
      pages.push(page);
      page = [];
      used = 0;
    }
    used += cost(item, page[page.length - 1]);
    page.push(item);
  }
  if (page.length) pages.push(page);
  return pages;
}

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

const G = GEOMETRY;
const studentBody = (i: number) => (i === 0 ? G.bodyFirst : G.bodyNext);
const keyBody = (i: number) => (i === 0 ? G.keyFirst : G.keyNext);
const qWidth = G.contentWidth - G.numberWidth;

/** B 용어 칸의 쓰기 줄 수 — 뜻 문장이 짧으면 한 줄, 아니면 두 줄(시안 «이상» 한 줄 · 나머지 두 줄). */
export const termRuledLines = (entry: ConceptEntry): 1 | 2 =>
  plainSentence(entry.definition).replace(/s+/g, "").length <= 18 ? 1 : 2;

/** 수식 줄은 KaTeX 분수 · 첨자로 조금 높다. */
const mathExtra = (text: string, lines: number, perLine: number) =>
  text.includes("$") ? lines * perLine : 0;

export function termCost(
  block: TermBlock,
  prev: TermBlock | undefined,
): number {
  if (block.kind === "term") {
    const lines = estimateLines(block.entry.term, G.term.font, qWidth);
    return (
      G.term.fixed +
      lines * G.term.line +
      termRuledLines(block.entry) * G.term.ruledLine
    );
  }
  const text = block.item.statement;
  const lines = estimateLines(text, G.ox.font, qWidth);
  return (
    G.ox.fixed +
    lines * G.ox.line +
    mathExtra(text, lines, 4) +
    (prev?.kind === "ox" ? 0 : G.ox.part)
  );
}

/** C 빈칸 문장 — 빈칸을 뺀 글과 빈칸 폭 합(좌우 여백 6px 씩). */
const blanksPx = (entry: ConceptEntry) =>
  sentenceKeywords(entry.definition).reduce(
    (sum, k) => sum + blankWidth(k) + 6,
    0,
  );
const textOutsideBlanks = (entry: ConceptEntry) =>
  splitSentence(entry.definition)
    .filter((p) => p.kind === "text")
    .map((p) => p.text)
    .join("");

export function clozeCost(
  block: ClozeBlock,
  prev: ClozeBlock | undefined,
): number {
  if (block.kind === "sentence") {
    const text = textOutsideBlanks(block.entry);
    const blanks = blanksPx(block.entry);
    // 빈칸은 끊기지 않아 줄 끝에 안 들어가면 통째로 다음 줄로 간다 — 줄 바뀜마다 가장 긴 빈칸의 절반쯤을 버린다고 본다.
    const widest = Math.max(
      0,
      ...sentenceKeywords(block.entry.definition).map(blankWidth),
    );
    const first = estimateLines(text, G.sentence.font, qWidth, blanks);
    const lines = estimateLines(
      text,
      G.sentence.font,
      qWidth,
      blanks + (first - 1) * widest * 0.5,
    );
    return (
      G.sentence.fixed +
      lines * G.sentence.line +
      mathExtra(text, lines, G.sentence.math) +
      (prev?.kind === "sentence" ? 0 : G.sentence.part)
    );
  }
  const text = block.item.prompt;
  const lines = estimateLines(text, G.apply.font, G.apply.width);
  return (
    G.apply.fixed +
    lines * G.apply.line +
    mathExtra(text, lines, 4) +
    G.apply.gap +
    (prev?.kind === "apply" ? 0 : G.apply.part)
  );
}

/** 뜻 문장 글 — 채점표는 핵심어를 굵게 그대로 쓴다. */
const keyText = (entry: ConceptEntry) => entry.definition.replace(/[{}]/g, "");

export function keyRowCost(row: KeyRow): number {
  const k = G.key;
  const main = (text: string, width: number = k.textWidth) => {
    const lines = estimateLines(text, k.font, width);
    return lines * k.line + mathExtra(text, lines, 4);
  };
  const sub = (text: string) => {
    const lines = estimateLines(text, 10, k.textWidth - 10);
    return k.subGap + lines * k.sub + mathExtra(text, lines, 3);
  };
  const concept = (label: string, place?: string) =>
    main(label, k.conceptWidth) +
    (place ? k.subGap + estimateLines(place, 9, k.conceptWidth) * k.place : 0);
  switch (row.kind) {
    case "concept": {
      const ex = row.entry.example;
      const exLine =
        row.example && ex
          ? sub(`예(참고) ${ex.prompt} → ${ex.answer}`)
          : row.example === "free"
            ? sub("예 — 학생이 든 예가 뜻에 맞으면 ○")
            : 0;
      return (
        k.fixed +
        Math.max(
          concept(row.entry.term, row.place),
          main(keyText(row.entry)) + exLine,
        )
      );
    }
    case "ox":
      return (
        k.fixed +
        Math.max(
          main("○×", k.conceptWidth),
          main(`${row.item.answer ? "○" : "×"} · ${row.item.why}`) +
            sub(row.item.statement),
        )
      );
    case "apply":
      return k.fixed + sub(row.item.prompt) - k.subGap + main(row.item.answer);
    case "figure": {
      const [, , w, h] = row.item.viewBox.split(" ").map(Number);
      const svg = Math.min(96, (150 * h!) / w!) + 2;
      const text =
        (row.item.tags.length
          ? main(
              `이름표: ${row.item.tags.map((t) => t.answer).join(" · ")}`,
              k.figureTextWidth,
            )
          : 0) +
        row.item.lines.reduce(
          (sum, l) => sum + main(`${l.label}: ${l.answer}`, k.figureTextWidth),
          0,
        );
      return (
        k.fixed + Math.max(main(row.item.prompt, k.conceptWidth), svg, text)
      );
    }
  }
}

/** 채점 안내(채점표 마지막 장 아래) — 우리 말. */
export function keyNotes(sheet: ConceptBlankSheet): string[] {
  switch (sheet.form) {
    case "recall":
      return [
        `칸에 적힌 것을 아래 ${sheet.key.length}개와 맞춰 본다. 굵은 핵심어가 다 있으면 ○, 하나 빠지면 △, 없으면 ×.`,
        "«떠올린 개념»에는 ○ 개수를 적는다. 그림 · 예 칸은 채점하지 않고 뜻이 모자랄 때 보탬으로 본다.",
      ];
    case "term":
      return [
        "문항 하나가 한 개. 뜻은 굵은 핵심어가 다 들어가야 ○.",
        ...(sheet.ox.length ? ["○× 는 표시와 까닭이 둘 다 맞아야 한 개."] : []),
      ];
    case "cloze": {
      const blanks = sheet.sentences.reduce(
        (sum, s) => sum + sentenceKeywords(s.definition).length,
        0,
      );
      return [
        ...(sheet.sentences.length
          ? [`가 — 빈칸 하나가 한 개(${blanks}개). 굵은 글이 빈칸의 답이다.`]
          : []),
        ...(sheet.apply.length
          ? [`나 — 문항 하나가 한 개(${sheet.apply.length}개).`]
          : []),
      ];
    }
    case "map": {
      const nodes = sheet.maps.reduce((s, m) => s + m.nodes.length, 0);
      return [
        `가지마다 «뜻» 한 칸 + «예» 한 칸 — 모두 ${nodes * 2}칸.`,
        "예 칸이 비어 있던 가지는 학생이 든 예가 뜻에 맞으면 ○.",
      ];
    }
    case "figure": {
      const cells = sheet.figures.reduce(
        (s, f) => s + f.tags.length + f.lines.length,
        0,
      );
      return [
        `이름표 한 칸 · 줄 한 칸이 각각 한 개 — 모두 ${cells}칸.`,
        "이름표는 작은 그림 속 네모에 적힌 답과 맞춰 본다.",
      ];
    }
  }
}

/** 채점 안내 상자 높이 — 채점표 마지막 장 아래. */
export function notesCost(notes: readonly string[]): number {
  const n = G.notes;
  return (
    n.fixed +
    notes.reduce(
      (sum, note) => sum + estimateLines(`· ${note}`, n.font, n.width) * n.line,
      0,
    )
  );
}

/**
 * 채점표 쪽 나누기 — 줄을 정원 · 높이로 채운 뒤, 마지막 장에 채점 안내 상자가 안 들어가면 마지막 줄을 다음 장으로 넘긴다.
 */
export function packKeyPages(
  rows: readonly KeyRow[],
  notes: readonly string[],
): KeyRow[][] {
  const pages = packPages(rows, PAGE_CAPS.key, keyRowCost, keyBody);
  const box = notesCost(notes);
  for (;;) {
    const last = pages[pages.length - 1];
    if (!last || last.length < 2) break;
    const used = last.reduce((sum, r) => sum + keyRowCost(r), 0);
    if (used + box <= keyBody(pages.length - 1)) break;
    const moved: KeyRow[] = [];
    while (
      last.length > 1 &&
      last.reduce((sum, r) => sum + keyRowCost(r), 0) + box >
        keyBody(pages.length - 1)
    )
      moved.unshift(last.pop()!);
    pages.push(moved);
  }
  return pages;
}

/** 형식마다 채점표 줄 — 학생지와 같은 번호. */
function keyRows(sheet: ConceptBlankSheet, student: StudentPage[]): KeyRow[] {
  switch (sheet.form) {
    case "recall": {
      const zoneOf = new Map(
        sheet.zones.map((z, i) => [z.section, { i, title: z.title }]),
      );
      return sheet.key.map((entry, i) => {
        const zone = zoneOf.get(entry.section);
        return {
          kind: "concept",
          n: String(i + 1),
          entry,
          place: zone ? `${circled(zone.i + 1)} ${zone.title}` : undefined,
          example: entry.example ? "reference" : undefined,
        };
      });
    }
    case "term":
    case "cloze":
      return student.flatMap((page) =>
        page.form === "term" || page.form === "cloze"
          ? page.blocks.map((b): KeyRow => {
              const n = String(b.n);
              if (b.kind === "term" || b.kind === "sentence")
                return { kind: "concept", n, entry: b.entry };
              return b.kind === "ox"
                ? { kind: "ox", n, item: b.item }
                : { kind: "apply", n, item: b.item };
            })
          : [],
      );
    case "map": {
      let n = 0;
      return sheet.maps.flatMap((map) =>
        map.nodes.map((entry): KeyRow => ({
          kind: "concept",
          n: String(++n),
          entry,
          place: map.hub,
          example: entry.example ? "answer" : "free",
        })),
      );
    }
    case "figure":
      return sheet.figures.map((item, i) => ({
        kind: "figure",
        n: String(i + 1),
        item,
      }));
  }
}

function studentPages(sheet: ConceptBlankSheet): StudentPage[] {
  switch (sheet.form) {
    case "recall":
      return chunk(
        sheet.zones.map((zone, i) => ({ n: i + 1, zone })),
        PAGE_CAPS.recall,
      ).map((zones) => ({ form: "recall", zones }));
    case "term": {
      const blocks: TermBlock[] = [
        ...sheet.terms.map((entry, i) => ({
          kind: "term" as const,
          n: i + 1,
          entry,
        })),
        ...sheet.ox.map((item, i) => ({
          kind: "ox" as const,
          n: sheet.terms.length + i + 1,
          item,
        })),
      ];
      return packPages(blocks, PAGE_CAPS.term, termCost, studentBody).map(
        (page) => ({ form: "term", blocks: page }),
      );
    }
    case "cloze": {
      const blocks: ClozeBlock[] = [
        ...sheet.sentences.map((entry, i) => ({
          kind: "sentence" as const,
          n: i + 1,
          entry,
        })),
        ...sheet.apply.map((item, i) => ({
          kind: "apply" as const,
          n: sheet.sentences.length + i + 1,
          item,
        })),
      ];
      // 정원 «문장 여덟»은 문장만 센다 — 적용은 높이 어림으로만 막는다.
      const pages: ClozeBlock[][] = [];
      let page: ClozeBlock[] = [];
      let used = 0;
      for (const block of blocks) {
        const cost = clozeCost(block, page[page.length - 1]);
        const sentences = page.filter((b) => b.kind === "sentence").length;
        const full =
          (block.kind === "sentence" && sentences >= PAGE_CAPS.cloze) ||
          used + cost > studentBody(pages.length);
        if (page.length > 0 && full) {
          pages.push(page);
          page = [];
          used = 0;
        }
        used += clozeCost(block, page[page.length - 1]);
        page.push(block);
      }
      if (page.length) pages.push(page);
      return pages.map((b) => ({ form: "cloze", blocks: b }));
    }
    case "map":
      return sheet.maps.map((map, i) => ({ form: "map", n: i + 1, map }));
    case "figure":
      return chunk(
        sheet.figures.map((figure, i) => ({ n: i + 1, figure })),
        PAGE_CAPS.figure,
      ).map((cards) => ({ form: "figure", cards }));
  }
}

function tallyOf(sheet: ConceptBlankSheet): string {
  switch (sheet.form) {
    case "recall":
      return `떠올린 개념 ____ / ${sheet.key.length}`;
    case "term":
      return `맞은 개수 ____ / ${sheet.terms.length + sheet.ox.length}`;
    case "cloze": {
      const blanks = sheet.sentences.reduce(
        (sum, s) => sum + sentenceKeywords(s.definition).length,
        0,
      );
      const parts = [];
      if (sheet.sentences.length) parts.push(`빈칸 ____ / ${blanks}`);
      if (sheet.apply.length) parts.push(`적용 ____ / ${sheet.apply.length}`);
      return parts.join(" · ");
    }
    case "map":
      return `채운 칸 ____ / ${sheet.maps.reduce((s, m) => s + m.nodes.length * 2, 0)}`;
    case "figure":
      return `맞은 칸 ____ / ${sheet.figures.reduce((s, f) => s + f.tags.length + f.lines.length, 0)}`;
  }
}

/** 담을 것이 없는 지면(B · C 문항 0 · D 지도 0 · E 그림 0)은 뽑지 않는다. A 는 칸만으로도 뽑는다. */
export function sheetHasContent(sheet: ConceptBlankSheet): boolean {
  switch (sheet.form) {
    case "recall":
      return sheet.zones.length > 0;
    case "term":
      return sheet.terms.length + sheet.ox.length > 0;
    case "cloze":
      return sheet.sentences.length + sheet.apply.length > 0;
    case "map":
      return sheet.maps.some((m) => m.nodes.length > 0);
    case "figure":
      return sheet.figures.length > 0;
  }
}

/** 지면 하나 → 학생지 장들 · 채점표 장들 · 맞은 개수 칸. */
export function planSheet(sheet: ConceptBlankSheet): SheetPlan {
  const student = studentPages(sheet);
  const rows = keyRows(sheet, student);
  return {
    sheet,
    student,
    key: packKeyPages(rows, keyNotes(sheet)),
    tally: tallyOf(sheet),
  };
}
