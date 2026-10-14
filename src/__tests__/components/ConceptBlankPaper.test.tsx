/**
 * 개념 백지 A4 지면 `ConceptBlankPaper` (D-150 · 26 §6 · 브리프 cb-paper «받아들임»).
 *
 * 보는 것 — 형식 다섯이 FIXTURE 에서 그려진다 · C 빈칸 수 = 핵심어 수 · 채점표에 핵심어 굵게 · E 이름표 자리 수 = tags 수 ·
 * 쪽 나누기 고정 규칙(B 10문항 → 2장 · 천장 · 고르게 나누기) · 줄맞춤 도구(번호 열 · 줄 어림 · 가지 · 카드 놓기) ·
 * 학생지에 답이 새지 않는다 · 배점 글자가 없다 · 수식은 제품 KaTeX 경로.
 *
 * 이어서(2026-10-01) — 핵심어 안 수식 · 글이 나오는 모든 칸이 수식 경로(`$` · 역슬래시가 새지 않는다) · 빈칸 폭은 보이는 폭 ·
 * 수식 줄 나눔(도막) · 굵은 글 안 수식 폭.
 *
 * ⚠️ vitest 는 CSS 를 안 읽는다(`css: false`) — 넘침(px)은 Playwright 가 인쇄 매체로 잰다(`e2e/concept-blank-paper`).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import {
  clozeCost,
  GEOMETRY,
  hasNestedFraction,
  keyRowCost,
  mathExtra,
  mathKind,
  notesCost,
  numberColumnWidth,
  packBalanced,
  packKeyPages,
  packPages,
  PAGE_CAPS,
  planSheet,
  termRuledLines,
  type KeyRow,
} from "@/components/concept-blank/paper/paginate";
import {
  cardGrid,
  mapColumns,
  wirePaths,
} from "@/components/concept-blank/paper/StudentBody";
import {
  BLANK_WIDTH,
  blankTail,
  blankWidth,
  BOLD_MATH,
  circled,
  estimateLines,
  formatSheetDate,
  inkEm,
  mathCharEm,
  mathChunks,
  mathEm,
  mathInkEm,
  plainText,
  sentenceAtoms,
  sentenceKeywords,
  splitSentence,
  textAtoms,
  textEm,
  wrapLines,
} from "@/components/concept-blank/paper/text";
import { parseConceptBlankView } from "@/components/concept-blank/paper/view";
import {
  blankKeywords,
  conceptBlankBankSchema,
  splitBlankSentence,
  type ConceptBlankBank,
  type ConceptBlankSelection,
  type ConceptBlankSheet,
  type ConceptEntry,
  type SheetHeader,
} from "@/contracts/conceptBlank.contract";
import { composeSheets } from "@/lib/concept-blank/compose";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";

const ALL = { 하: 40, 중: 40, 상: 40 };
const NONE = { 하: 0, 중: 0, 상: 0 };
const SECTIONS = [
  ...new Set(
    [
      ...FIXTURE_BANK.concepts,
      ...FIXTURE_BANK.ox,
      ...FIXTURE_BANK.apply,
      ...FIXTURE_BANK.figures,
    ].map((x) => x.section),
  ),
];

const SELECTION: ConceptBlankSelection = {
  sections: SECTIONS,
  forms: [
    { form: "recall", counts: ALL, extras: NONE },
    { form: "term", counts: ALL, extras: ALL },
    { form: "cloze", counts: ALL, extras: ALL },
    { form: "map", counts: ALL, extras: NONE },
    { form: "figure", counts: ALL, extras: NONE },
  ],
  title: "합동과 대칭",
  date: "2026-10-01",
};
const SHEETS = composeSheets(SELECTION, FIXTURE_BANK);
const sheetOf = <F extends ConceptBlankSheet["form"]>(form: F) =>
  SHEETS.find((s) => s.form === form) as Extract<
    ConceptBlankSheet,
    { form: F }
  >;

const header = (form: SheetHeader["form"]): SheetHeader => ({
  title: "시험 제목",
  unitLabel: "초5 · 2-3 합동과 대칭",
  date: "2026-10-01",
  form,
});
const entry = (i: number, definition?: string): ConceptEntry => ({
  id: `t-${i}`,
  section: "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
  term: `용어 ${i}`,
  kind: "정의",
  level: "하",
  definition: definition ?? `짧은 뜻 문장 ${i}번에는 {핵심어}가 있다.`,
});

/**
 * 종이에 찍히는 글 — KaTeX 가 접근성용으로 같이 넣는 MathML(그 안 `annotation` 에 TeX 원문이 있다)을 뺀 글 조각들.
 * 그림 속 이름표(`[data-cb-tag]` — SVG 글자)는 수식 경로를 안 지나는 예외라 `skipTags` 로 뺄 수 있다.
 */
function visibleTexts(root: Element, skipTags = false): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (parent?.closest(".katex-mathml")) continue;
    if (skipTags && parent?.closest("[data-cb-tag]")) continue;
    texts.push(walker.currentNode.textContent ?? "");
  }
  return texts;
}
const visibleText = (root: Element) => visibleTexts(root).join("");

const studentPages = (form: string) =>
  document.querySelectorAll(
    `[data-cb-part="student"][data-cb-sheet="${form}"]`,
  );
const keyPages = (form: string) =>
  document.querySelectorAll(`[data-cb-part="key"][data-cb-sheet="${form}"]`);

describe("ConceptBlankPaper — 형식 다섯", () => {
  it("FIXTURE 로 다섯 형식의 학생지 · 채점표가 다 그려진다", () => {
    expect(SHEETS.map((s) => s.form)).toEqual([
      "recall",
      "term",
      "cloze",
      "map",
      "figure",
    ]);
    render(<ConceptBlankPaper sheets={SHEETS} view="both" />);
    for (const form of ["recall", "term", "cloze", "map", "figure"]) {
      expect(studentPages(form).length, form).toBeGreaterThan(0);
      expect(keyPages(form).length, form).toBeGreaterThan(0);
    }
    // A 는 소단원 칸, B 는 용어 · ○×, D 는 가지, E 는 카드
    expect(document.querySelectorAll("[data-cb-zone]")).toHaveLength(
      sheetOf("recall").zones.length,
    );
    expect(document.querySelectorAll('[data-cb-item="term"]')).toHaveLength(
      sheetOf("term").terms.length,
    );
    expect(document.querySelectorAll('[data-cb-item="ox"]')).toHaveLength(
      sheetOf("term").ox.length,
    );
    expect(document.querySelectorAll("[data-cb-node]")).toHaveLength(
      sheetOf("map").maps.reduce((s, m) => s + m.nodes.length, 0),
    );
    expect(document.querySelectorAll("[data-cb-card]")).toHaveLength(
      sheetOf("figure").figures.length,
    );
  });

  it("A 옆 칸은 side 대로 — 그림 소단원은 모눈, 아니면 예 칸", () => {
    render(<ConceptBlankPaper sheets={[sheetOf("recall")]} view="student" />);
    const zones = [...document.querySelectorAll("[data-cb-zone]")];
    expect(zones.map((z) => z.getAttribute("data-cb-zone"))).toEqual(
      sheetOf("recall").zones.map((z) => z.side),
    );
    expect(zones.some((z) => z.textContent?.includes("그림"))).toBe(true);
    expect(zones.some((z) => z.textContent?.includes("예"))).toBe(true);
  });

  it("C 빈칸 수 = 핵심어 수 — 학생지에 핵심어 글자가 없다", () => {
    const cloze = sheetOf("cloze");
    render(<ConceptBlankPaper sheets={[cloze]} view="student" />);
    const expected = cloze.sentences.reduce(
      (sum, s) => sum + blankKeywords(s.definition).length,
      0,
    );
    expect(expected).toBeGreaterThan(0);
    const sentences = [
      ...document.querySelectorAll('[data-cb-item="sentence"]'),
    ];
    expect(sentences).toHaveLength(cloze.sentences.length);
    expect(
      sentences.reduce(
        (sum, li) => sum + li.querySelectorAll("[data-cb-blank]").length,
        0,
      ),
    ).toBe(expected);
    // 빈칸 자리의 핵심어는 학생지에 없다(«대칭의 중심» 은 문장 밖 글에 없는 핵심어)
    expect(document.body.textContent).not.toContain("대칭의 중심");
    // 적용은 문장 뒤 «나»에
    expect(document.querySelectorAll('[data-cb-item="apply"]')).toHaveLength(
      cloze.apply.length,
    );
    // 적용은 값을 구하는 칸이 아니라 설명하는 칸이다(26 §11 — «풀어 보시오»는 계산하라는 말로 읽힌다)
    expect(screen.getByText("방금 쓴 뜻으로 답하고, 까닭을 쓰시오.")).toBeTruthy();
  });

  it("빈칸 길이는 핵심어 글자 수에 비례한다", () => {
    expect(blankWidth("합동")).toBeLessThan(blankWidth("대칭의 중심"));
    expect(blankWidth("대칭의 중심")).toBeLessThan(
      blankWidth("꼭 맞게 겹치면 됩니다"),
    );
    expect(blankWidth("●")).toBeGreaterThanOrEqual(36);
  });

  it("채점표에 핵심어가 굵게 — B · C 의 뜻 문장마다 핵심어 전부", () => {
    for (const form of ["term", "cloze"] as const) {
      const sheet = sheetOf(form);
      const { unmount } = render(
        <ConceptBlankPaper sheets={[sheet]} view="key" />,
      );
      const bold = [...document.querySelectorAll("[data-cb-keyword]")].map(
        (b) => b.textContent,
      );
      const entries: ConceptEntry[] =
        sheet.form === "term" ? sheet.terms : sheet.sentences;
      const expected = entries.flatMap((e) => blankKeywords(e.definition));
      expect(bold, form).toEqual(expected);
      for (const b of document.querySelectorAll("[data-cb-keyword]"))
        expect(b.tagName).toBe("B");
      unmount();
    }
  });

  it("채점표 — ○× 답과 까닭 · 적용 답 · D 예 답 · E 이름표 답과 줄 답", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="key" />);
    const text = document.body.textContent ?? "";
    for (const ox of FIXTURE_BANK.ox) expect(text).toContain(ox.why);
    expect(
      [...document.querySelectorAll("[data-cb-ox-answer]")].map(
        (b) => b.textContent,
      ),
    ).toEqual(sheetOf("term").ox.map((o) => (o.answer ? "○" : "×")));
    for (const ap of FIXTURE_BANK.apply) expect(text).toContain(ap.answer);
    for (const node of sheetOf("map").maps.flatMap((m) => m.nodes))
      if (node.example) expect(text).toContain(node.example.answer);
    for (const f of FIXTURE_BANK.figures) {
      for (const t of f.tags) expect(text).toContain(t.answer);
      for (const l of f.lines) expect(text).toContain(l.answer);
    }
  });

  it("E 이름표 자리 수 = tags 수, 줄 수 = lines 수", () => {
    const figure = sheetOf("figure");
    render(<ConceptBlankPaper sheets={[figure]} view="student" />);
    expect(document.querySelectorAll("[data-cb-tag]")).toHaveLength(
      figure.figures.reduce((s, f) => s + f.tags.length, 0),
    );
    for (const f of figure.figures) {
      const svg = document.querySelector(`[data-cb-figure="${f.id}"]`);
      expect(svg?.getAttribute("viewBox")).toBe(f.viewBox);
      expect(svg?.querySelectorAll("rect[stroke-dasharray]").length).toBe(
        f.tags.length,
      );
    }
    // 학생지 이름표 자리는 비어 있다 — 답 글자가 없다
    for (const f of figure.figures)
      for (const t of f.tags)
        expect(document.body.textContent).not.toContain(t.answer);
  });

  it("학생지에 답이 새지 않는다 — ○× 답 · 까닭 · 적용 답 · 예 답", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="student" />);
    const text = document.body.textContent ?? "";
    for (const ox of FIXTURE_BANK.ox) expect(text).not.toContain(ox.why);
    for (const ap of FIXTURE_BANK.apply) expect(text).not.toContain(ap.answer);
    expect(text).not.toContain("ANSWER KEY");
  });
});

describe("ConceptBlankPaper — 머리 · 발 · 보기", () => {
  it("머리 — 오늘 수학 · 영문 라벨 · 제목 · 목표 · 학습일 · 이름/반 · 단원", () => {
    render(<ConceptBlankPaper sheets={[sheetOf("term")]} view="student" />);
    const head = document.querySelector('[data-cb-head="first"]')!;
    const h = within(head as HTMLElement);
    expect(h.getByText("오늘 수학")).toBeTruthy();
    expect(h.getByText("CONCEPT RECALL")).toBeTruthy();
    expect(h.getByText("개념 백지 · 합동과 대칭")).toBeTruthy();
    expect(h.getByText("2026. 10. 1 (목)")).toBeTruthy();
    expect(h.getByText("이름")).toBeTruthy();
    expect(h.getByText("반")).toBeTruthy();
    expect(head.textContent).toContain(sheetOf("term").header.unitLabel);
    const foot = document.querySelector("[data-cb-foot]")!;
    expect(foot.textContent).toContain("맞은 개수 ____ / ");
    expect(foot.textContent).toContain("오늘의 메모");
    expect(foot.textContent).toContain("p. 1");
  });

  it("형식마다 영문 라벨이 다르다 — 지도 · 그림", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="student" />);
    expect(screen.getByText("CONCEPT MAP")).toBeTruthy();
    expect(screen.getByText("FIGURE RECALL")).toBeTruthy();
    expect(screen.getByText("개념 지도 · 합동과 대칭")).toBeTruthy();
    expect(screen.getByText("그림 보고 쓰기 · 합동과 대칭")).toBeTruthy();
  });

  it("배점이 없다 — 점수 글자가 한 곳도 없다", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="both" />);
    // 글 조각마다 본다 — 이어 붙인 textContent 는 «5» + «대응점» 을 «5대응점»으로 읽는다
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    const texts: string[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode.textContent ?? "");
    expect(texts.length).toBeGreaterThan(100);
    for (const t of texts)
      expect(t).not.toMatch(/^\s*\[?\d+(\.\d+)?\s*점\]?\s*$|배점|\(\d+점\)/);
  });

  it("보기 — 학생지만 · 채점표만 · 둘 다(학생지를 모두 먼저)", () => {
    const { unmount } = render(
      <ConceptBlankPaper sheets={SHEETS} view="student" />,
    );
    expect(document.querySelectorAll('[data-cb-part="key"]')).toHaveLength(0);
    unmount();
    const k = render(<ConceptBlankPaper sheets={SHEETS} view="key" />);
    expect(document.querySelectorAll('[data-cb-part="student"]')).toHaveLength(
      0,
    );
    k.unmount();
    render(<ConceptBlankPaper sheets={SHEETS} view="both" />);
    const parts = [...document.querySelectorAll("[data-cb-part]")].map((p) =>
      p.getAttribute("data-cb-part"),
    );
    const firstKey = parts.indexOf("key");
    expect(firstKey).toBeGreaterThan(0);
    expect(parts.slice(firstKey).every((p) => p === "key")).toBe(true);
  });

  it("장마다 제품 A4 경계(A4Page) 안에 그린다", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="both" />);
    const pages = document.querySelectorAll("[data-cb-page]");
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages)
      expect(p.closest('[data-print-page="true"]')).not.toBeNull();
  });

  it("담을 문항이 없으면 한 줄", () => {
    render(<ConceptBlankPaper sheets={[]} view="both" />);
    expect(screen.getByRole("status").textContent).toBe(
      "담을 문항이 없습니다.",
    );
  });

  // 리뷰(2026-10-01) — 손으로 만든 `?s=` 에서 A 의 개념 수가 전부 0 이면 칸(소단원)은 있는데 채점 줄이 0 이었다:
  // 채점표만은 빈 화면 · 둘 다는 학생지 발에 «떠올린 개념 ____ / 0» 에 채점 안내도 없었다. 다른 형식처럼 뽑지 않는다.
  it("A 채점 줄이 0 이면 다른 형식처럼 «담을 문항이 없습니다» — 학생지만 · 채점표만 · 둘 다", () => {
    const zero = composeSheets(
      {
        sections: SECTIONS,
        forms: [{ form: "recall", counts: NONE, extras: NONE }],
      },
      FIXTURE_BANK,
    );
    expect(zero[0]).toMatchObject({ form: "recall", key: [] });
    expect(zero[0]!.form === "recall" && zero[0]!.zones.length).toBeGreaterThan(
      0,
    );
    for (const view of ["student", "key", "both"] as const) {
      const r = render(<ConceptBlankPaper sheets={zero} view={view} />);
      expect(screen.getByRole("status").textContent, view).toBe(
        "담을 문항이 없습니다.",
      );
      expect(document.querySelector("[data-cb-page]"), view).toBeNull();
      r.unmount();
    }
    // 다른 형식과 같이 고르면 A 만 빠진다 — «/ 0» 발이 어디에도 없다
    const mixed = composeSheets(
      {
        sections: SECTIONS,
        forms: [
          { form: "recall", counts: NONE, extras: NONE },
          { form: "term", counts: ALL, extras: NONE },
        ],
      },
      FIXTURE_BANK,
    );
    render(<ConceptBlankPaper sheets={mixed} view="both" />);
    const forms = new Set(
      [...document.querySelectorAll("[data-cb-sheet]")].map((p) =>
        p.getAttribute("data-cb-sheet"),
      ),
    );
    expect([...forms]).toEqual(["term"]);
    expect(document.body.textContent).not.toMatch(/\/\s*0(?!\d)/);
  });

  it("인쇄 주소 view — 모르는 값은 둘 다", () => {
    expect(parseConceptBlankView("student")).toBe("student");
    expect(parseConceptBlankView("key")).toBe("key");
    expect(parseConceptBlankView(["key", "student"])).toBe("key");
    expect(parseConceptBlankView(undefined)).toBe("both");
    expect(parseConceptBlankView("teacher")).toBe("both");
  });
});

describe("쪽 나누기 — 고정 규칙(DOM 재기 없음)", () => {
  const termSheet = (terms: number, ox: number): ConceptBlankSheet => ({
    form: "term",
    header: header("term"),
    terms: Array.from({ length: terms }, (_, i) => entry(i)),
    ox: Array.from({ length: ox }, (_, i) => ({
      id: `o-${i}`,
      section: entry(0).section,
      level: "하" as const,
      statement: `짧은 ○× 문장 ${i}번이다.`,
      answer: i % 2 === 0,
      why: "까닭 한 줄이다.",
    })),
  });
  const cloze = (n: number, apply: number): ConceptBlankSheet => ({
    form: "cloze",
    header: header("cloze"),
    sentences: Array.from({ length: n }, (_, i) => entry(i)),
    apply: Array.from({ length: apply }, (_, i) => ({
      id: `a-${i}`,
      section: entry(0).section,
      level: "하" as const,
      prompt: `짧은 적용 물음 ${i}`,
      answer: "답",
    })),
  });
  const recall = (zones: number, key: number): ConceptBlankSheet => ({
    form: "recall",
    header: header("recall"),
    zones: Array.from({ length: zones }, (_, i) => ({
      section: `s${i}`,
      title: `소단원 ${i}`,
      hint: "뜻 · 예",
      side: "예" as const,
    })),
    key: Array.from({ length: key }, (_, i) => entry(i)),
  });
  const sizes = (sheet: ConceptBlankSheet) =>
    planSheet(sheet).student.map((p) =>
      p.form === "recall"
        ? p.zones.length
        : p.form === "figure"
          ? p.cards.length
          : p.form === "map"
            ? p.map.nodes.length
            : p.blocks.length,
    );

  it("B 10문항(용어 8 + ○× 2) → 2장, 9문항 → 1장", () => {
    expect(planSheet(termSheet(8, 2)).student).toHaveLength(2);
    expect(planSheet(termSheet(7, 2)).student).toHaveLength(1);
    render(<ConceptBlankPaper sheets={[termSheet(8, 2)]} view="student" />);
    expect(studentPages("term")).toHaveLength(2);
    // 이어지는 장 — 간소 머리 «오늘의수학 · 제목» + p. 2, 번호는 이어진다
    const next = document.querySelector('[data-cb-head="next"]')!;
    expect(next.textContent).toContain("오늘 수학");
    expect(next.textContent).toContain("개념 백지 · 시험 제목");
    expect(next.textContent).toContain("p. 2");
    expect(studentPages("term")[1]!.textContent).toContain("문 10");
    // 맞은 개수 칸은 첫 장에만
    expect(
      document.querySelectorAll("[data-cb-foot]")[1]!.textContent,
    ).not.toContain("맞은 개수");
  });

  it("천장 — A 네 칸 · B 아홉 · C 문장 여덟(적용이 붙는 장) / 열넷(문장만) · D 지도 하나 · E 여섯 · 채점표 스물넷", () => {
    expect(PAGE_CAPS).toEqual({
      recall: 4,
      term: 9,
      cloze: 8,
      clozeOnly: 14,
      map: 1,
      figure: 6,
      key: 24,
    });
    // 채점표 — 짧은 줄은 스물넷까지 한 장(열두 줄에서 끊으면 장의 절반이 빈다)
    expect(planSheet(recall(4, 24)).key.map((rows) => rows.length)).toEqual([
      24,
    ]);
    expect(planSheet(recall(4, 26)).key.map((rows) => rows.length)).toEqual([
      24, 2,
    ]);

    // C — 시안처럼 짧은 문장 여덟 + 적용 둘은 한 장
    expect(sizes(cloze(8, 2))).toEqual([10]);
    // 문장만 있는 장은 열넷까지
    expect(sizes(cloze(14, 0))).toEqual([14]);
    expect(sizes(cloze(15, 0))).toEqual([14, 1]);
    // 문장이 여덟을 넘은 장에는 적용이 붙지 않는다 — 적용만 다음 장으로
    const nine = planSheet(cloze(9, 2)).student;
    expect(
      nine.map((p) => p.form === "cloze" && p.blocks.map((b) => b.kind)),
    ).toEqual([Array(9).fill("sentence"), ["apply", "apply"]]);

    const figure = sheetOf("figure").figures[0]!;
    const e: ConceptBlankSheet = {
      form: "figure",
      header: header("figure"),
      figures: Array.from({ length: 7 }, (_, i) => ({
        ...figure,
        id: `f-${i}`,
      })),
    };
    expect(planSheet(e).student).toHaveLength(2);

    const map: ConceptBlankSheet = {
      form: "map",
      header: header("map"),
      maps: [
        { hub: "지도 (1)", nodes: [entry(1), entry(2)] },
        { hub: "지도 (2)", nodes: [entry(3)] },
      ],
    };
    expect(planSheet(map).student).toHaveLength(2);
  });

  it("칸이 늘어나 채우는 형식(A · B · E)은 마지막 두 장을 고르게 나눈다 — 장 수는 그대로", () => {
    // A 다섯 칸: 4 + 1 이 아니라 3 + 2
    expect(sizes(recall(5, 1))).toEqual([3, 2]);
    expect(sizes(recall(9, 1))).toEqual([3, 3, 3]);
    // B 열한 문항: 9 + 2 가 아니라 6 + 5
    expect(sizes(termSheet(9, 2))).toEqual([6, 5]);
    // E 일곱: 6 + 1 이 아니라 4 + 3
    const figure = sheetOf("figure").figures[0]!;
    expect(
      sizes({
        form: "figure",
        header: header("figure"),
        figures: Array.from({ length: 7 }, (_, i) => ({
          ...figure,
          id: `f-${i}`,
        })),
      }),
    ).toEqual([4, 3]);
    // 고르게 나눠도 장 수는 앞에서부터 채운 것과 같다(늘지 않는다)
    for (const n of [1, 5, 9, 10, 17, 18, 19, 27, 28]) {
      const items = Array.from({ length: n }, (_, i) => i);
      const greedy = packPages(
        items,
        9,
        () => 100,
        () => 900,
      );
      const even = packBalanced(
        items,
        9,
        () => 100,
        () => 900,
      );
      expect(even.length, `${n}`).toBe(greedy.length);
      expect(even.flat()).toEqual(items);
      // 가장 많이 든 장도 «문항 수 ÷ 장 수»(올림)를 넘지 않는다
      expect(Math.max(...even.map((p) => p.length)), `${n}`).toBe(
        Math.ceil(n / even.length),
      );
    }
    // 높이 때문에 고르게 나눈 것이 장을 늘리면 앞에서부터 채운 것을 그대로 쓴다
    const tall = [300, 300, 300, 100, 100, 100, 100];
    const cost = (i: number) => tall[i]!;
    expect(packBalanced([0, 1, 2, 3, 4, 5, 6], 9, cost, () => 900).length).toBe(
      packPages([0, 1, 2, 3, 4, 5, 6], 9, cost, () => 900).length,
    );
  });

  it("긴 뜻 문장은 천장보다 먼저 다음 장으로 — 계약 상한 160자 여덟 + 긴 적용", () => {
    const long =
      `${"아주 긴 뜻 문장이 이어지고 ".repeat(9)}{핵심어 하나} 그리고 {핵심어 둘}.`.slice(
        0,
        160,
      );
    const sheet: ConceptBlankSheet = {
      form: "cloze",
      header: header("cloze"),
      sentences: Array.from({ length: 8 }, (_, i) => entry(i, long)),
      apply: [
        {
          id: "a-long",
          section: entry(0).section,
          level: "상",
          prompt: "긴 적용 물음이 이어진다 ".repeat(9).slice(0, 120),
          answer: "답",
        },
      ],
    };
    const pages = planSheet(sheet).student;
    expect(pages.length).toBeGreaterThanOrEqual(2);
    // 문장 순서 · 번호는 그대로
    const numbers = pages.flatMap((p) =>
      p.form === "cloze" ? p.blocks.map((b) => b.n) : [],
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("채점 안내 상자가 마지막 장에 안 들어가면 마지막 줄 하나만 같이 넘긴다 — 앞 장은 꽉 찬 채", () => {
    const rows: KeyRow[] = Array.from({ length: 24 }, (_, i) => ({
      kind: "concept",
      n: String(i + 1),
      entry: entry(i),
    }));
    const one = keyRowCost(rows[0]!);
    // 안내 글을 길게 — 스물네 줄 뒤에 상자가 안 들어간다
    const room = GEOMETRY.keyFirst - one * 24;
    const notes = Array.from(
      { length: Math.ceil(room / 17) + 2 },
      () => "안내 한 줄",
    );
    expect(notesCost(notes)).toBeGreaterThan(room);
    expect(packKeyPages(rows, notes).map((p) => p.length)).toEqual([23, 1]);
    // 들어가면 그대로 한 장
    expect(packKeyPages(rows, []).map((p) => p.length)).toEqual([24]);
  });

  it("학생지와 채점표의 문항 번호 · 순서가 같다(쪽 나눔은 달라도)", () => {
    for (const sheet of [termSheet(19, 7), cloze(31, 5)]) {
      const plan = planSheet(sheet);
      const student = plan.student.flatMap((p) =>
        p.form === "term" || p.form === "cloze"
          ? p.blocks.map((b) => String(b.n))
          : [],
      );
      expect(plan.key.flat().map((r) => r.n)).toEqual(student);
      expect(student).toEqual(
        Array.from({ length: student.length }, (_, i) => String(i + 1)),
      );
    }
    // 그려진 번호도 같다
    render(<ConceptBlankPaper sheets={[termSheet(19, 7)]} view="both" />);
    const drawn = [...document.querySelectorAll("[data-cb-qn]")].map((q) =>
      q.textContent!.replace("문 ", ""),
    );
    const keyed = [...document.querySelectorAll("tr[data-cb-key-row] td")]
      .filter((td) => td.parentElement!.firstElementChild === td)
      .map((td) => td.textContent);
    expect(keyed).toEqual(drawn);
  });

  it("같은 지면 모델이면 언제나 같은 장 나눔(고정)", () => {
    const a = SHEETS.map((s) => JSON.stringify(planSheet(s)));
    const b = composeSheets(SELECTION, FIXTURE_BANK).map((s) =>
      JSON.stringify(planSheet(s)),
    );
    expect(a).toEqual(b);
  });
});

describe("줄맞춤 · 채우기 — 번호 열 · 줄 어림 · 가지 · 카드 놓기", () => {
  it("문항 번호 열 — 지면 하나 안에서 한 값(두 자리까지 44 · 세 자리 52)", () => {
    const term = (n: number): ConceptBlankSheet => ({
      form: "term",
      header: header("term"),
      terms: Array.from({ length: n }, (_, i) => entry(i)),
      ox: [],
    });
    expect(numberColumnWidth(term(99))).toBe(44);
    expect(numberColumnWidth(term(100))).toBe(52);
    render(<ConceptBlankPaper sheets={[term(3)]} view="student" />);
    const sheet = document.querySelector<HTMLElement>("[data-cb-page]")!;
    expect(sheet.style.getPropertyValue("--cb-num")).toBe("44px");
    expect(document.querySelectorAll("[data-cb-qn]")).toHaveLength(3);
  });

  it("빈칸 길이 — 글자 수에 비례하고 최소 · 최대 폭 안", () => {
    expect(blankWidth("가")).toBe(BLANK_WIDTH.min);
    expect(blankWidth("가나다")).toBe(3 * 14 + 24);
    expect(blankWidth("가".repeat(40))).toBe(BLANK_WIDTH.max);
    const widths = ["가", "가나", "가나다라", "가나다라마바사아"].map(
      blankWidth,
    );
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    // 그려진 빈칸의 폭이 그 값이다
    render(
      <ConceptBlankPaper
        sheets={[
          {
            form: "cloze",
            header: header("cloze"),
            sentences: [entry(1, "짧은 {답} 과 {조금 더 긴 답} 을 쓴다.")],
            apply: [],
          },
        ]}
        view="student"
      />,
    );
    expect(
      [...document.querySelectorAll<HTMLElement>("[data-cb-blank]")].map(
        (b) => b.style.width,
      ),
    ).toEqual([`${blankWidth("답")}px`, `${blankWidth("조금 더 긴 답")}px`]);
  });

  it("줄 수 어림 — 낱말 사이에서만 줄을 바꾼다(한 줄보다 긴 덩이만 글자에서)", () => {
    const atom = (px: number, glue = 5) => ({ px, glue });
    expect(wrapLines([atom(40), atom(40), atom(40)], 100)).toBe(2);
    expect(wrapLines([atom(40), atom(40), atom(40)], 130)).toBe(1);
    // 줄 끝에 안 들어가는 덩이는 통째로 다음 줄
    expect(wrapLines([atom(60), atom(60)], 100)).toBe(2);
    // 한 줄보다 긴 덩이
    expect(wrapLines([atom(250)], 100)).toBe(3);
    expect(wrapLines([], 100)).toBe(1);
    // 글자 폭 — 한글 1em, 숫자 · 라틴은 좁다, 띄어쓰기
    expect(textEm("가나다")).toBe(3);
    expect(textEm("12")).toBeCloseTo(1.22);
    expect(textEm("가 나")).toBeCloseTo(2.36);
    // 같은 글이면 좁은 칸에서 줄이 늘어난다
    const text =
      "두 도형을 겹쳐 놓았을 때 남는 곳 없이 꼭 맞게 겹치면 합동이다.";
    expect(estimateLines(text, 14, 600)).toBe(1);
    expect(estimateLines(text, 14, 200)).toBeGreaterThan(2);
    // 빈칸은 끊기지 않는 조각 — 빈칸이 끼면 글만 있을 때보다 줄이 줄지 않는다
    expect(
      wrapLines(sentenceAtoms("짧은 {아주 긴 핵심어가 여기에} 문장", 14), 200),
    ).toBeGreaterThanOrEqual(2);
  });

  it("수식 어림 — 그려지는 폭으로 세고, 줄 높이를 넘는 만큼만 더한다", () => {
    // TeX 원문 길이가 아니라 그려지는 것 — 분수는 명령어 하나 + 글자 둘
    expect(mathEm("$\\frac{a}{b}$")).toBeLessThan(textEm("\\frac{a}{b}"));
    expect(mathEm("$x$")).toBeGreaterThan(textEm("x"));
    // 수식이 없으면 0, 분수는 글자 수식보다 높다
    expect(mathExtra("수식 없음", 2, 11.5, 17.83)).toBe(0);
    const small = mathExtra("값 $x$ 이다", 1, 11.5, 17.83);
    const tall = mathExtra("값 $\\frac{a}{b}$ 이다", 1, 11.5, 17.83);
    expect(small).toBeGreaterThan(0);
    expect(tall).toBeGreaterThan(small);
    // 줄 간격이 넓은 글(C 문장 30.1)은 글자 수식으로 거의 늘지 않는다 — 줄마다 최소 여유만
    expect(mathExtra("값 $x$ 이다", 1, 14, 30.1)).toBeLessThanOrEqual(3);
    // 글의 줄 수보다 많이 세지 않는다 · 높은 것부터 센다
    expect(mathExtra("$a$ $b$ $c$ $d$", 1, 11.5, 17.83)).toBe(small);
    expect(mathExtra("$a$ $\\frac{a}{b}$", 1, 11.5, 17.83)).toBe(tall);
  });

  it("수식 줄 나눔 — 맨 바깥 연산자 · 관계 기호 뒤에서만 끊긴다(좁은 칸의 긴 식)", () => {
    expect(mathChunks("$acx^2+(ad+bc)x+bd$")).toEqual([
      "acx^2+",
      "(ad+bc)x+",
      "bd",
    ]);
    expect(mathChunks(String.raw`$3\times4=12$`)).toEqual([
      String.raw`3\times`,
      "4=",
      "12",
    ]);
    // 묶음 · 괄호 안과 식 머리의 부호에서는 안 끊긴다(맨 괄호도 — 제품 경로가 키 큰 속의 괄호를 늘인 괄호로 바꾼다)
    expect(mathChunks(String.raw`$\frac{a+b}{2}$`)).toHaveLength(1);
    expect(mathChunks(String.raw`$\left(a+b\right)c$`)).toHaveLength(1);
    expect(
      mathChunks(String.raw`$\sqrt 2(\sqrt 3+1)=\sqrt 6+\sqrt 2$`),
    ).toEqual([
      String.raw`\sqrt 2(\sqrt 3+1)=`,
      String.raw`\sqrt 6+`,
      String.raw`\sqrt 2`,
    ]);
    // 짝이 안 맞는 괄호(구간 `(a, b]`)에도 깊이가 음수로 가지 않는다
    expect(mathChunks("$)a+b$")).toEqual([")a+", "b"]);
    expect(mathChunks("$-3$")).toEqual(["-3"]);
    expect(mathChunks("$x=-2$")).toEqual(["x=", "-2"]);
    expect(mathChunks("$(-2, +3)$")).toHaveLength(1);
    expect(mathChunks("$x+$")).toEqual(["x+"]);
    // 도막으로 나눠도 폭의 합은 그대로다
    const long = "$acx^2+(ad+bc)x+bd$";
    expect(
      mathChunks(long).reduce((em, chunk) => em + mathEm(chunk), 0),
    ).toBeCloseTo(mathEm(long), 5);
    // 채점표 개념 열(118px · 굵은 11.5px) — «폭 ÷ 칸 폭»은 두 줄이지만 도막으로 채우면 세 줄이다(중3 은행에서 잰 것)
    const term = `${long}의 인수분해`;
    expect(estimateLines(term, 11.5, 118, BOLD_MATH)).toBe(3);
    // 굵은 글의 수식은 넓게 센다
    expect(textAtoms("$abc$", 10, BOLD_MATH)[0]!.px).toBeCloseTo(
      textAtoms("$abc$", 10)[0]!.px * BOLD_MATH,
      5,
    );
  });

  it("수식 글자 폭 — 어림 표는 KaTeX 글꼴의 보통 벌 · 굵은 벌보다 좁지 않다", () => {
    // KaTeX 가 배치에 쓰는 글꼴 폭 표(글자마다 [깊이, 높이, 기울임, 비낌, 폭])
    const require = createRequire(import.meta.url);
    const file = path.join(
      path.dirname(require.resolve("katex/package.json")),
      "src",
      "fontMetricsData.js",
    );
    const metrics = new Function(
      readFileSync(file, "utf8").replace("export default", "return"),
    )() as Record<string, Record<number, number[]>>;
    const width = (font: string, ch: string) =>
      metrics[font]?.[ch.codePointAt(0)!]?.[4] ?? 0;
    // 수식의 `-` · `*` 는 뺄셈표 · 별표 연산자로 그려진다
    const glyph = (ch: string) => (ch === "-" ? "−" : ch === "*" ? "∗" : ch);
    const chars = [
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
      ..."0123456789+-=<>()[]/.,:|!*",
    ];
    const regular: string[] = [];
    const bold: string[] = [];
    for (const ch of chars) {
      const g = glyph(ch);
      const thin = Math.max(width("Math-Italic", g), width("Main-Regular", g));
      const thick = Math.max(
        width("Math-BoldItalic", g),
        width("Main-Bold", g),
      );
      expect(thin, ch).toBeGreaterThan(0);
      if (mathCharEm(ch) < thin)
        regular.push(`${ch} ${mathCharEm(ch)}<${thin}`);
      if (mathCharEm(ch) * BOLD_MATH < thick)
        bold.push(`${ch} ${mathCharEm(ch)}×${BOLD_MATH}<${thick}`);
    }
    expect(regular).toEqual([]);
    expect(bold).toEqual([]);
  });

  it("수식 갈래 — 잰 줄 높이대로 나눈다(글자 · 얹는 것 · 분수 · 분수 + 첨자 · 겹친 것)", () => {
    const kinds = (list: string[]) => list.map((s) => mathKind(`$${s}$`));
    expect(
      kinds([
        "x^2",
        "\\sqrt{b^2-4ac}",
        "\\overline{\\mathrm{AB}}",
        "\\sin 30^\\circ",
        "(a+b)^2",
      ]),
    ).toEqual(Array(5).fill("small"));
    expect(
      kinds([
        "\\overset{\\frown}{AB}",
        "\\overleftrightarrow{AB}",
        "\\sqrt 2(\\sqrt 3+1)=\\sqrt 6+\\sqrt 2",
        "\\left(\\sqrt 2+1\\right)-3",
      ]),
    ).toEqual(Array(4).fill("raised"));
    expect(kinds(["\\frac{1}{2}", "-\\frac{b}{a}", "(-\\sqrt 5)^2"])).toEqual(
      Array(3).fill("tall"),
    );
    expect(
      kinds([
        "\\frac{a^2}{b}",
        "\\sqrt{\\frac{1}{2}}",
        "\\left(-\\frac{2}{3}\\right)^2",
        "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}",
      ]),
    ).toEqual(Array(4).fill("tallPlus"));
    expect(
      kinds([
        "\\frac{\\frac{1}{2}}{3}",
        "\\frac{1}{1+\\frac{1}{2}}",
        "\\sum_{i=1}^{n} i",
        "\\begin{cases} a \\\\ b \\end{cases}",
      ]),
    ).toEqual(Array(4).fill("huge"));
    // 나란히 놓인 분수 둘은 겹친 것이 아니다
    expect(
      hasNestedFraction(
        "\\left(-\\frac{2}{3}\\right)\\times\\left(+\\frac{9}{4}\\right)",
      ),
    ).toBe(false);
    expect(hasNestedFraction("\\frac{1}{1+\\frac{1}{2}}")).toBe(true);
    // `\overline` 은 분수 명령어(`\over`)가 아니다
    expect(mathKind("$\\overline{AB}$")).toBe("small");
  });

  it("채점표 줄 — 옆 칸의 첫 줄 수식이 높으면 그만큼 내려온다(수식이 든 칸 자신은 두 번 세지 않는다)", () => {
    const row = (term: string, definition: string): KeyRow => ({
      kind: "concept",
      n: "1",
      entry: { ...entry(1, definition), term },
    });
    const plain = keyRowCost(row("용어", "짧은 뜻에는 {핵심어}가 있다."));
    const mathText = keyRowCost(
      row("용어", "값 $\\frac{1}{2}$ 에는 {핵심어}가 있다."),
    );
    const grow = mathExtra("$\\frac{1}{2}$", 1, 11.5, 17.83);
    // 뜻 칸의 한 줄이 분수만큼 높아진다 — 한 번만
    expect(mathText - plain).toBeCloseTo(grow);
    // 용어 칸이 세 줄로 더 높으면, 뜻 칸 첫 줄의 분수가 용어 칸을 그만큼 내린다
    const longTerm = "아주 긴 용어 이름이 좁은 칸에서 세 줄로 접힌다 이렇게";
    expect(
      keyRowCost(row(longTerm, "값 $\\frac{1}{2}$ 에는 {핵심어}가 있다.")) -
        keyRowCost(row(longTerm, "짧은 뜻에는 {핵심어}가 있다.")),
    ).toBeCloseTo(grow);
  });

  // 소단원 이름이 수식으로 찍힌 뒤(«반비례 관계 $y=\dfrac{a}{x}$의 그래프» — 2026-10-01) 개념 칸의 자리 줄이 분수만큼 높아졌는데
  // 어림은 글줄 높이만 셌다 — 인쇄 매체에서 중1 채점표 세 줄이 어림보다 2.5~4.6px 높았다(`estimate.spec` real-m1).
  it("채점표 줄 — 개념 칸 아래 자리 줄(소단원 이름)의 수식도 줄을 높인다", () => {
    const row = (place: string): KeyRow => ({
      kind: "concept",
      n: "1",
      // 개념 칸이 더 높아야 자리 줄이 줄 높이를 정한다 — 용어를 세 줄로
      entry: {
        ...entry(1, "짧은 뜻에는 {핵심어}가 있다."),
        term: "아주 긴 용어 이름이 좁은 칸에서 세 줄로 접힌다 이렇게",
      },
      place,
    });
    // 줄 수가 같은 두 글(한 줄) — 접힌 줄 수가 아니라 분수의 높이가 차이를 낸다
    const plain = keyRowCost(row("⑤ 그래프"));
    const fraction = keyRowCost(row("⑤ $y=\\dfrac{a}{x}$"));
    expect(fraction - plain).toBeCloseTo(
      mathExtra("$y=\\dfrac{a}{x}$", 1, 9, GEOMETRY.key.place),
    );
    expect(fraction - plain).toBeGreaterThan(4.6);
    // 수식이 낮으면(첨자 · 분수 없음) 그대로다
    expect(keyRowCost(row("⑤ $y=ax$")) - plain).toBeLessThan(4);
  });

  it("빈칸 뒤에 붙은 조사 · 마침표는 빈칸과 한 줄에 묶는다 — 어림도 같은 묶음으로 센다", () => {
    expect(blankTail("이다.")).toBe("이다.");
    expect(blankTail(", 다음 글")).toBe(",");
    expect(blankTail(".")).toBe(".");
    // 띄어 쓴 글 · 수식으로 시작하는 글 · 여덟 글자를 넘는 덩이는 묶지 않는다
    expect(blankTail(" 이다.")).toBe("");
    expect(blankTail("$x$ 이다")).toBe("");
    expect(blankTail("아홉글자가넘는덩이")).toBe("");
    expect(blankTail(undefined)).toBe("");

    render(
      <ConceptBlankPaper
        sheets={[
          {
            form: "cloze",
            header: header("cloze"),
            sentences: [entry(1, "값은 {답}이다. 그리고 {다른 답} 을 쓴다.")],
            apply: [],
          },
        ]}
        view="student"
      />,
    );
    const keeps = [...document.querySelectorAll("[data-cb-keep]")];
    // 첫 빈칸은 «이다.» 와 묶이고, 둘째 빈칸은 뒤가 띄어쓰기라 묶이지 않는다
    expect(keeps).toHaveLength(1);
    expect(keeps[0]!.querySelectorAll("[data-cb-blank]")).toHaveLength(1);
    expect(keeps[0]!.textContent).toBe("이다.");
    expect(document.querySelectorAll("[data-cb-blank]")).toHaveLength(2);
    // 글은 그대로 이어진다(묶어도 글자가 늘거나 빠지지 않는다)
    expect(
      document.querySelector('[data-cb-item="sentence"]')!.textContent,
    ).toBe("문 1값은 이다. 그리고  을 쓴다.");

    // 어림 — 빈칸 조각이 뒤 덩이의 폭까지 품는다
    const atoms = sentenceAtoms("값은 {답}이다. 끝", 14);
    expect(atoms.map((a) => Math.round(a.px))).toEqual([
      Math.round(textEm("값은") * 14),
      blankWidth("답") + 6 + Math.round(textEm("이다.") * 14),
      Math.round(textEm("끝") * 14),
    ]);
  });

  it("D 가지 놓기 — 왼쪽 · 오른쪽을 번갈아, 하나면 오른쪽 기둥이 없다", () => {
    expect(mapColumns([1, 2, 3, 4, 5])).toEqual({
      left: [1, 3, 5],
      right: [2, 4],
    });
    expect(wirePaths(1, 0)).toHaveLength(1);
    expect(wirePaths(3, 2)).toHaveLength(5);
    const map = (n: number): ConceptBlankSheet => ({
      form: "map",
      header: header("map"),
      maps: [
        { hub: "지도", nodes: Array.from({ length: n }, (_, i) => entry(i)) },
      ],
    });
    const one = render(<ConceptBlankPaper sheets={[map(1)]} view="student" />);
    expect(document.querySelectorAll("[data-cb-side]")).toHaveLength(1);
    expect(document.querySelectorAll("svg path")).toHaveLength(1);
    one.unmount();
    render(<ConceptBlankPaper sheets={[map(5)]} view="student" />);
    expect(
      document.querySelectorAll('[data-cb-side="left"] [data-cb-node]'),
    ).toHaveLength(3);
    expect(
      document.querySelectorAll('[data-cb-side="right"] [data-cb-node]'),
    ).toHaveLength(2);
  });

  it("E 카드 놓기 — 넷부터 두 줄기, 셋까지는 넓은 카드, 다섯의 마지막은 넓게", () => {
    const shape = (n: number) => {
      const g = cardGrid(n);
      return [
        g.columns,
        g.rows,
        Array.from({ length: n }, (_, i) => g.wide(i)),
      ];
    };
    expect(shape(1)).toEqual([1, 1, [true]]);
    expect(shape(3)).toEqual([1, 3, [true, true, true]]);
    expect(shape(4)).toEqual([2, 2, [false, false, false, false]]);
    expect(shape(5)).toEqual([2, 3, [false, false, false, false, true]]);
    expect(shape(6)).toEqual([2, 3, Array(6).fill(false)]);
    const figure = sheetOf("figure").figures[0]!;
    render(
      <ConceptBlankPaper
        sheets={[
          {
            form: "figure",
            header: header("figure"),
            figures: Array.from({ length: 5 }, (_, i) => ({
              ...figure,
              id: `f-${i}`,
            })),
          },
        ]}
        view="student"
      />,
    );
    expect(
      [...document.querySelectorAll("[data-cb-card]")].map((c) =>
        c.getAttribute("data-cb-card"),
      ),
    ).toEqual(["narrow", "narrow", "narrow", "narrow", "wide"]);
  });

  it("채점표 — 열 폭을 고정하는 세 열", () => {
    render(<ConceptBlankPaper sheets={[sheetOf("term")]} view="key" />);
    expect(document.querySelectorAll("table colgroup col")).toHaveLength(3);
    expect(document.querySelectorAll("table thead th")).toHaveLength(3);
  });

  it("C — 적용이 없는 장은 문장 칸이 늘어나 채운다(표지)", () => {
    const only: ConceptBlankSheet = {
      form: "cloze",
      header: header("cloze"),
      sentences: [entry(1), entry(2)],
      apply: [],
    };
    const a = render(<ConceptBlankPaper sheets={[only]} view="student" />);
    expect(document.querySelector("ol")!.hasAttribute("data-cb-fill")).toBe(
      true,
    );
    a.unmount();
    render(<ConceptBlankPaper sheets={[sheetOf("cloze")]} view="student" />);
    // FIXTURE 는 문장 아홉 + 적용 둘 — 문장만 있는 첫 장은 채우고, 적용이 붙은 장은 적용 칸이 채운다
    const lists = [...document.querySelectorAll("ol")];
    for (const ol of lists) {
      const page = ol.closest("[data-cb-page]")!;
      expect(ol.hasAttribute("data-cb-fill")).toBe(
        page.querySelector('[data-cb-item="apply"]') === null,
      );
    }
  });
});

describe("지면 글 — 수식 · 핵심어 · 날짜", () => {
  it("수식 `$...$` 은 제품 KaTeX 경로로 — 학생지 · 채점표 둘 다", () => {
    const math: ConceptBlankSheet = {
      form: "cloze",
      header: header("cloze"),
      sentences: [
        entry(
          1,
          "식 $x+1=3$ 을 참이 되게 하는 $x$ 의 값을 그 식의 {해}라고 한다.",
        ),
      ],
      apply: [],
    };
    render(<ConceptBlankPaper sheets={[math]} view="both" />);
    const student = studentPages("cloze")[0]!;
    const key = keyPages("cloze")[0]!;
    expect(student.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(key.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(student.querySelectorAll("[data-cb-blank]")).toHaveLength(1);
  });

  it("`$...$` 안의 { } 는 핵심어가 아니다(TeX 묶음)", () => {
    expect(
      splitSentence("분수 $\\frac{1}{2}$ 에서 2 를 {분모}라 한다."),
    ).toEqual([
      { kind: "text", text: "분수 $\\frac{1}{2}$ 에서 2 를 " },
      { kind: "key", text: "분모" },
      { kind: "text", text: "라 한다." },
    ]);
  });

  it("핵심어 가르기는 계약 한 자리 — 지면은 그 함수를 그대로 쓴다", () => {
    expect(splitSentence).toBe(splitBlankSentence);
    expect(sentenceKeywords).toBe(blankKeywords);
    const s = "해는 $x=\\frac{-b}{2a}$ 이고 이를 {근의 공식}이라 한다.";
    expect(sentenceKeywords(s)).toEqual(["근의 공식"]);
  });

  it("예의 답 · 그림 줄 이름도 수식 경로로 — 글자만 오면 그대로", () => {
    const figure = sheetOf("figure").figures[0]!;
    const withMath: ConceptBlankSheet[] = [
      {
        form: "map",
        header: header("map"),
        maps: [
          {
            hub: "지도",
            nodes: [
              {
                ...entry(1),
                example: {
                  prompt: "값을 간단히 하면?",
                  answer: "$3\\sqrt{2}$",
                },
              },
              {
                ...entry(2),
                example: { prompt: "합동인가?", answer: "아니다" },
              },
            ],
          },
        ],
      },
      {
        form: "figure",
        header: header("figure"),
        figures: [
          {
            ...figure,
            id: "f-math",
            lines: [{ label: "$\\angle A$ 의 크기", answer: "$60^\\circ$" }],
          },
          { ...figure, id: "f-plain" },
        ],
      },
    ];
    const student = render(
      <ConceptBlankPaper sheets={withMath} view="student" />,
    );
    // 학생지 — 그림 줄 이름의 수식이 KaTeX 로, 글자 이름은 글자 그대로
    const lines = [...document.querySelectorAll("[data-cb-line]")];
    expect(lines[0]!.querySelectorAll(".katex")).toHaveLength(1);
    expect(lines[0]!.textContent).toContain("의 크기");
    expect(lines.at(-1)!.querySelector(".katex")).toBeNull();
    expect(lines.at(-1)!.textContent).toBe(figure.lines.at(-1)!.label);
    // 학생지에는 예의 답이 없다 — 빈칸 폭은 그려지는 답의 폭(TeX 원문 길이가 아니다)
    expect(document.body.textContent).not.toContain("sqrt");
    const blanks = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-cb-node] [data-cb-blank]",
      ),
    ];
    expect(blanks.map((b) => b.style.width)).toEqual([
      `${blankWidth("$3\\sqrt{2}$")}px`,
      `${blankWidth("아니다")}px`,
    ]);
    expect(blankWidth("$3\\sqrt{2}$")).toBeLessThan(blankWidth("3sqrt{2}가"));
    student.unmount();

    render(<ConceptBlankPaper sheets={withMath} view="key" />);
    const rows = [
      ...document.querySelectorAll('tr[data-cb-key-row="concept"]'),
    ];
    // 채점표 — 수식 답은 KaTeX, 글자 답은 굵은 글자 그대로
    expect(rows[0]!.querySelector("b .katex")).not.toBeNull();
    expect(rows[1]!.querySelector("b .katex")).toBeNull();
    expect(
      [...rows[1]!.querySelectorAll("b")].some(
        (b) => b.textContent === "아니다",
      ),
    ).toBe(true);
    const figureRows = [
      ...document.querySelectorAll('tr[data-cb-key-row="figure"]'),
    ];
    expect(
      figureRows[0]!.querySelectorAll(".katex").length,
    ).toBeGreaterThanOrEqual(2);
    expect(figureRows[1]!.querySelector(".katex")).toBeNull();
    expect(figureRows[1]!.textContent).toContain(
      `${figure.lines[0]!.label}: ${figure.lines[0]!.answer}`,
    );
    // 그림 속 이름표 답은 글자 그대로(SVG 글)
    for (const t of figure.tags)
      expect(
        [...figureRows[1]!.querySelectorAll("svg text")].map(
          (x) => x.textContent,
        ),
      ).toContain(t.answer);
  });

  it("핵심어 안 수식 — 채점표는 굵은 글 안 KaTeX, 학생지는 보이는 폭만큼의 빈칸", () => {
    const definition = String.raw`{$1000\,\mathrm{m}$}를 $1\,\mathrm{km}$라 쓰고, $\sin 60^\circ$의 값은 {$\frac{\sqrt{3}}{2}$}이며 {윗자리의 $1$개}를 {올림}한다.`;
    const keys = blankKeywords(definition);
    expect(keys).toEqual([
      String.raw`$1000\,\mathrm{m}$`,
      String.raw`$\frac{\sqrt{3}}{2}$`,
      "윗자리의 $1$개",
      "올림",
    ]);
    const sheet: ConceptBlankSheet = {
      form: "cloze",
      header: header("cloze"),
      sentences: [entry(1, definition)],
      apply: [],
    };

    const key = render(<ConceptBlankPaper sheets={[sheet]} view="key" />);
    const bold = [
      ...document.querySelectorAll<HTMLElement>("[data-cb-keyword]"),
    ];
    expect(bold).toHaveLength(4);
    // 수식 핵심어는 굵은 글 안에서 KaTeX 로 — 마크업 글자가 그대로 찍히지 않는다
    expect(bold.map((b) => b.querySelectorAll(".katex").length)).toEqual([
      1, 1, 1, 0,
    ]);
    for (const b of bold) {
      expect(b.tagName).toBe("B");
      expect(visibleText(b)).not.toMatch(/[$\\{}]/);
    }
    expect(visibleText(bold[2]!)).toContain("윗자리의");
    expect(bold[3]!.textContent).toBe("올림");
    key.unmount();

    render(<ConceptBlankPaper sheets={[sheet]} view="student" />);
    const sentence = document.querySelector('[data-cb-item="sentence"]')!;
    // 학생지 — 핵심어의 수식은 그려지지 않는다(글 조각의 수식 둘만)
    expect(sentence.querySelectorAll(".katex")).toHaveLength(2);
    expect(visibleText(sentence)).not.toMatch(/[$\\{}]/);
    expect(
      [...sentence.querySelectorAll<HTMLElement>("[data-cb-blank]")].map(
        (b) => b.style.width,
      ),
    ).toEqual(keys.map((k) => `${blankWidth(k)}px`));
  });

  it("빈칸 폭 — 수식 핵심어는 `$` 마크업 글자 수가 아니라 보이는 폭으로", () => {
    const frac = String.raw`$\frac{\sqrt{3}}{2}$`;
    // 마크업 글자 수(19자)로 세면 최대 폭까지 간다 — 분수 하나는 한글 세 글자보다 좁다
    expect([...frac].length * 14 + 24).toBeGreaterThan(BLANK_WIDTH.max);
    expect(blankWidth(frac)).toBeLessThan(blankWidth("가나다"));
    expect(blankWidth(String.raw`$\frac{7}{7}$`)).toBe(BLANK_WIDTH.min);
    // 단위 — «1000 mL» 은 한글 세 글자보다 길고 여섯 글자보다 짧다
    const mL = blankWidth(String.raw`$1000\,\mathrm{mL}$`);
    expect(mL).toBeGreaterThan(blankWidth("가나다"));
    expect(mL).toBeLessThan(blankWidth("가나다라마바"));
    // 보이는 글자가 늘면 빈칸도 는다
    const widths = ["$10$", "$1000$", "$100000000$"].map(blankWidth);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
    expect(new Set(widths).size).toBe(3);
    // 글꼴 · 윗줄 · 묶음처럼 글자를 그리지 않는 마크업은 폭을 늘리지 않는다
    expect(mathInkEm(String.raw`$\overline{\mathrm{AB}}$`)).toBeCloseTo(
      mathInkEm("$AB$"),
      5,
    );
    expect(mathInkEm(String.raw`$\displaystyle \frac{1}{2}$`)).toBeCloseTo(
      mathInkEm(String.raw`$\frac{1}{2}$`),
      5,
    );
    // 기호 — 식 사이에서는 좌우 띄움이 붙고, 혼자 서면 글자 폭뿐이다 · 식 머리의 `-` 는 부호
    expect(mathInkEm(String.raw`$3\times4$`)).toBeGreaterThan(
      mathInkEm("$3$") + mathInkEm(String.raw`$\times$`) + mathInkEm("$4$"),
    );
    expect(mathInkEm("$-2$")).toBeLessThan(
      mathInkEm("$1-2$") - mathInkEm("$1$"),
    );
    // 여러 줄 수식은 가장 넓은 줄의 폭
    expect(
      mathInkEm(String.raw`$\begin{cases} x+y=1 \\ x=3 \end{cases}$`),
    ).toBeLessThan(mathInkEm("$x+y=1$") + mathInkEm("$x=3$"));
    // 분수는 분자 · 분모 가운데 넓은 쪽, 첨자는 작게
    expect(mathInkEm(String.raw`$\frac{1}{100}$`)).toBeLessThan(
      mathInkEm("$1100$"),
    );
    expect(mathInkEm(String.raw`$\frac{1}{100}$`)).toBeGreaterThanOrEqual(
      mathInkEm("$100$"),
    );
    expect(mathInkEm("$x^2$")).toBeLessThan(mathInkEm("$x2$"));
    // 글과 수식이 섞인 핵심어 — 글은 글자 폭, 수식은 보이는 폭
    expect(inkEm("윗자리의 $1$개")).toBeCloseTo(
      textEm("윗자리의 ") + mathInkEm("$1$") + textEm("개"),
      5,
    );
    expect(inkEm("글자만")).toBe(textEm("글자만"));
    // 어림(줄 채우기)도 같은 폭으로 센다 — 빈칸 조각 = 빈칸 폭 + 좌우 여백
    expect(sentenceAtoms(`값은 {${frac}} 이다`, 14)[1]!.px).toBe(
      blankWidth(frac) + 6,
    );
  });

  it("B 쓰기 줄 수 — 뜻 문장의 보이는 글자 수로(수식 마크업은 세지 않는다)", () => {
    // 보이는 글은 «1000 m를 1 km라고 한다.» 열세 글자 — 마크업까지 세면 마흔 자가 넘는다
    const short = entry(
      1,
      String.raw`{$1000\,\mathrm{m}$}를 {$1\,\mathrm{km}$}라고 한다.`,
    );
    expect(short.definition.replace(/\s+/g, "").length).toBeGreaterThan(18);
    expect(termRuledLines(short)).toBe(1);
    expect(termRuledLines(entry(2, "짧은 {뜻}이다."))).toBe(1);
    expect(
      termRuledLines(
        entry(3, "두 도형을 겹쳐 놓았을 때 남는 곳 없이 {꼭 맞게} 겹친다."),
      ),
    ).toBe(2);
  });

  it("학생지 문장 높이 어림 — 빈칸이 된 핵심어의 수식은 줄을 높이지 않는다", () => {
    const sheetOfOne = (definition: string): ConceptBlankSheet => ({
      form: "cloze",
      header: header("cloze"),
      sentences: [entry(1, definition)],
      apply: [],
    });
    const block = (definition: string) => {
      const page = planSheet(sheetOfOne(definition)).student[0]!;
      return page.form === "cloze" ? page.blocks[0]! : null;
    };
    const plain = clozeCost(block("값은 {절반}이다.")!, undefined);
    // 핵심어가 분수여도 학생지에는 밑줄뿐이다
    expect(
      clozeCost(block(String.raw`값은 {$\frac{1}{2}$}이다.`)!, undefined),
    ).toBe(plain);
    // 글 조각의 분수는 줄을 높인다
    expect(
      clozeCost(block(String.raw`값 $\frac{1}{2}$ 은 {절반}이다.`)!, undefined),
    ).toBeGreaterThan(plain);
  });

  it("보이는 글(plainText) — 수식 마크업 · 핵심어 괄호를 걷고 기호는 글자로(그림 읽기 이름에 쓴다)", () => {
    const cases: [string, string][] = [
      [String.raw`각 $\angle A$ 읽기`, "각 ∠A 읽기"],
      [String.raw`넓이 $1\,\mathrm{cm}^2$ 알아보기`, "넓이 1 cm² 알아보기"],
      [String.raw`전체 $100\%$ 띠그래프`, "전체 100% 띠그래프"],
      [String.raw`선분 $\overline{AB}$와 $\triangle ABC$`, "선분 AB와 △ABC"],
      [String.raw`$\angle B=60^{\circ}$`, "∠B=60°"],
      [String.raw`$\angle C = 90^\circ$`, "∠C = 90°"],
      [String.raw`$\frac{1}{2}$과 $2\frac{1}{3}$`, "1/2과 2 1/3"],
      [String.raw`$\frac{\sqrt{3}}{2}$`, "√3/2"],
      [String.raw`$\sqrt{2}\times\sqrt{3}$`, "√2×√3"],
      [
        String.raw`$l\parallel m$ · $\triangle ABC\backsim\triangle DEF$`,
        "l∥m · △ABC∽△DEF",
      ],
      [
        String.raw`$0.\dot{3}$ · $\pi$ · $a_1$ · $x\le 3$`,
        "0.3 · π · a₁ · x≤3",
      ],
      [String.raw`$\sin 30^\circ$`, "sin 30°"],
      [String.raw`$\left(-\frac{2}{3}\right)^2$`, "(-2/3)²"],
      ["{핵심어}가 있는 글", "핵심어가 있는 글"],
      ["글자만", "글자만"],
    ];
    for (const [tex, shown] of cases) {
      expect(plainText(tex), tex).toBe(shown);
      expect(plainText(tex), tex).not.toMatch(/[$\\{}]/);
    }
  });

  it("날짜 · 동그라미 번호", () => {
    expect(formatSheetDate("2026-10-01")).toBe("2026. 10. 1 (목)");
    expect(formatSheetDate("2026-02-30")).toBeNull();
    expect(formatSheetDate(null)).toBeNull();
    expect(circled(1)).toBe("①");
    expect(circled(20)).toBe("⑳");
    expect(circled(21)).toBe("㉑");
    expect(circled(50)).toBe("㊿");
    expect(circled(51)).toBe("(51)");
  });
});

/**
 * 글이 나오는 모든 칸이 제품 수식 경로(`PaperText` → `MathText`)를 지난다(원장님 2026-09-30 «카텍스 사용할 것»).
 * 은행 2차부터 모든 숫자 · 단위 · 분수 · 각이 `$...$` 다 — 한 칸이라도 글자 그대로 찍으면 `$` · 역슬래시가 종이에 샌다.
 * 수식이 든 작은 은행(계약이 받아들이는 꼴)을 제품 `composeSheets` 로 합쳐 다섯 형식 × 학생지 · 채점표에서 본다.
 */
describe("모든 칸 수식 경로 — `$` · 역슬래시가 종이에 새지 않는다", () => {
  const MS = {
    a: "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
    b: "초5::2-3 합동과 대칭::2-3-2 합동인 도형의 성질 알아보기",
  } as const;
  const MATH_BANK: ConceptBlankBank = conceptBlankBankSchema.parse({
    concepts: [
      {
        id: "mx-km",
        section: MS.a,
        term: String.raw`$1\,\mathrm{km}$`,
        kind: "단위",
        level: "하",
        definition: String.raw`{$1000\,\mathrm{m}$}를 $1\,\mathrm{km}$라 쓰고 {$1$ 킬로미터}라고 읽는다.`,
        example: {
          prompt: String.raw`$2350\,\mathrm{m}$는 몇 $\mathrm{km}$ 몇 $\mathrm{m}$인가?`,
          answer: String.raw`$2\,\mathrm{km}$ $350\,\mathrm{m}$`,
        },
      },
      {
        id: "mx-frac",
        section: MS.a,
        term: String.raw`진분수 $\frac{2}{3}$`,
        kind: "정의",
        level: "중",
        definition: String.raw`분자가 분모보다 작은 $\frac{2}{3}$ 같은 분수를 {진분수}라 하고, $\sin 60^\circ$의 값은 {$\frac{\sqrt{3}}{2}$}이다.`,
      },
      {
        id: "mx-mixed",
        section: MS.b,
        term: String.raw`대분수 $2\frac{1}{3}$`,
        kind: "정의",
        level: "상",
        definition: String.raw`$2\frac{1}{3}$처럼 {자연수}와 {진분수}로 이루어진 분수를 대분수라 한다.`,
        example: {
          prompt: String.raw`$\frac{7}{3}$을 대분수로 나타내면?`,
          answer: String.raw`$2\frac{1}{3}$`,
        },
      },
    ],
    ox: [
      {
        id: "mx-o1",
        section: MS.a,
        level: "하",
        statement: String.raw`$\frac{3}{3}$은 진분수이다.`,
        answer: false,
        why: String.raw`분자와 분모가 같은 $\frac{3}{3}$은 가분수이다.`,
      },
      {
        id: "mx-o2",
        section: MS.b,
        level: "중",
        statement: String.raw`$1\,\mathrm{km}$는 $1000\,\mathrm{m}$이다.`,
        answer: true,
        why: String.raw`$1000\,\mathrm{m}$를 $1\,\mathrm{km}$라 한다.`,
      },
    ],
    apply: [
      {
        id: "mx-a1",
        section: MS.a,
        level: "하",
        prompt: String.raw`$1\,\mathrm{km}$ $200\,\mathrm{m}$는 몇 $\mathrm{m}$인가?`,
        answer: String.raw`$1200\,\mathrm{m}$`,
      },
      {
        id: "mx-a2",
        section: MS.b,
        level: "중",
        prompt: String.raw`기온이 오른 때와 내린 때를 $1$시간 단위로 쓰시오.`,
        // 물결표 둘 — 마크다운이 지운 글(취소선)로 읽지 않는다
        answer: String.raw`$9$~$10$시 상승, $10$~$11$시 하강`,
      },
    ],
    figures: [
      {
        id: "mx-f1",
        section: MS.a,
        level: "하",
        prompt: String.raw`각 $\angle A$ 읽기`,
        viewBox: "0 0 200 110",
        svg: `<polygon points="40,90 160,90 100,20" fill="#F7F3E6" stroke="#1F1F23" stroke-width="1.6"/>`,
        tags: [{ x: 70, y: 2, w: 60, answer: "꼭짓점" }],
        lines: [
          {
            label: String.raw`$\angle A$의 크기`,
            answer: String.raw`세 각이 같으므로 $60^\circ$이다.`,
          },
        ],
      },
    ],
  });
  const MATH_SHEETS = composeSheets(
    {
      sections: [MS.a, MS.b],
      forms: [
        { form: "recall", counts: ALL, extras: NONE },
        { form: "term", counts: ALL, extras: ALL },
        { form: "cloze", counts: ALL, extras: ALL },
        { form: "map", counts: ALL, extras: NONE },
        { form: "figure", counts: ALL, extras: NONE },
      ],
      title: "수식 은행",
      date: "2026-10-01",
    },
    MATH_BANK,
  );
  const FORMS = ["recall", "term", "cloze", "map", "figure"] as const;
  const leaks = (root: Element) =>
    visibleTexts(root, true).filter((t) => /[$\\]/.test(t));

  it("수식 은행이 다섯 형식으로 합쳐진다", () => {
    expect(MATH_SHEETS.map((s) => s.form)).toEqual([...FORMS]);
  });

  for (const view of ["student", "key"] as const)
    it(`${view === "student" ? "학생지" : "채점표"} — 어느 형식에서도 \`$\` · 역슬래시 글자가 없다`, () => {
      render(<ConceptBlankPaper sheets={MATH_SHEETS} view={view} />);
      for (const form of FORMS) {
        const pages = [
          ...(view === "student" ? studentPages(form) : keyPages(form)),
        ];
        expect(pages.length, form).toBeGreaterThan(0);
        for (const page of pages) expect(leaks(page), form).toEqual([]);
        // A 학생지는 소단원 이름뿐이다 — 그 밖의 면은 수식이 KaTeX 로 그려져 있다
        if (!(view === "student" && form === "recall"))
          expect(
            pages.reduce((n, p) => n + p.querySelectorAll(".katex").length, 0),
            form,
          ).toBeGreaterThan(0);
      }
      // 수식 오류(붉은 글) · 지운 글이 없다
      expect(document.querySelector(".katex-error")).toBeNull();
      expect(document.querySelector("del")).toBeNull();
      expect(document.querySelector('[style*="color:#cc0000"]')).toBeNull();
    });

  it("학생지 — 칸마다 수식이 KaTeX 로: 용어 · ○× 문장 · 뜻 글 · 적용 물음 · 가지 이름 · 예 물음 · 그림 물음 · 줄 이름", () => {
    render(<ConceptBlankPaper sheets={MATH_SHEETS} view="student" />);
    const katex = (selector: string) =>
      [...document.querySelectorAll(selector)].map(
        (el) => el.querySelectorAll(".katex").length,
      );
    // B — 용어 셋 모두 수식이 있다 · ○× 문장 둘
    expect(katex('[data-cb-item="term"]')).toEqual([1, 1, 1]);
    expect(katex('[data-cb-item="ox"]')).toEqual([1, 2]);
    // C — 글 조각의 수식만(핵심어의 수식은 빈칸이다): 1 · 2 · 1
    expect(katex('[data-cb-item="sentence"]')).toEqual([1, 2, 1]);
    expect(katex('[data-cb-item="apply"]')).toEqual([3, 1]);
    // D — 가지 이름 + 예 물음(답은 빈칸). 왼쪽 기둥(첫째 · 셋째 가지)이 먼저 그려진다
    expect(katex("[data-cb-node]")).toEqual([1 + 3, 1 + 1, 1]);
    // E — 물음 + 줄 이름
    expect(katex("[data-cb-card]")).toEqual([2]);
    expect(katex("[data-cb-line]")).toEqual([1]);
    // 답은 한 글자도 없다 — 예의 답 · 적용 답 · 핵심어의 보이는 글
    const text = visibleText(document.body);
    expect(text).not.toContain("킬로미터");
    expect(text).not.toContain("1200");
    expect(text).not.toContain("가분수");
  });

  it("채점표 — 칸마다 수식이 KaTeX 로: 용어 · 핵심어 · 예 물음/답 · ○× 까닭/문장 · 적용 물음/답 · 그림 물음 · 줄 이름/답", () => {
    render(<ConceptBlankPaper sheets={MATH_SHEETS} view="key" />);
    const rows = (form: string, kind: string) =>
      [...keyPages(form)].flatMap((p) => [
        ...p.querySelectorAll<HTMLElement>(`tr[data-cb-key-row="${kind}"]`),
      ]);
    const cells = (row: HTMLElement) =>
      [...row.querySelectorAll("td")].map(
        (td) => td.querySelectorAll(".katex").length,
      );
    // B — 번호 · 개념(용어) · 채점 기준(뜻: 글 + 핵심어)
    expect(rows("term", "concept").map(cells)).toEqual([
      [0, 1, 3],
      [0, 1, 3],
      [0, 1, 1],
    ]);
    // 핵심어 — 수식이 든 것은 굵은 글 안 KaTeX
    expect(
      [...keyPages("cloze")]
        .flatMap((p) => [...p.querySelectorAll("[data-cb-keyword]")])
        .map((b) => b.querySelectorAll(".katex").length),
    ).toEqual([1, 1, 0, 1, 0, 0]);
    // ○× — 까닭 + 문장
    expect(rows("term", "ox").map(cells)).toEqual([
      [0, 0, 2],
      [0, 0, 4],
    ]);
    // 적용 — 물음 + 굵은 답
    expect(rows("cloze", "apply").map(cells)).toEqual([
      [0, 0, 3 + 1],
      [0, 0, 1 + 4],
    ]);
    expect(
      rows("cloze", "apply").map((r) => r.querySelectorAll("b .katex").length),
    ).toEqual([1, 4]);
    // D — 뜻 + 예 물음 → 굵은 답(예가 없는 가지는 «학생이 든 예»)
    expect(rows("map", "concept").map(cells)).toEqual([
      [0, 1, 3 + 3 + 2],
      [0, 1, 3],
      [0, 1, 1 + 1 + 1],
    ]);
    // A — 뜻 + 참고 예
    expect(rows("recall", "concept").map(cells)).toEqual([
      [0, 1, 3 + 3 + 2],
      [0, 1, 3],
      [0, 1, 1 + 1 + 1],
    ]);
    // E — 물음 · 줄 이름 + 줄 답
    expect(rows("figure", "figure").map(cells)).toEqual([[0, 1, 2]]);
    // 물결표 둘은 글자 그대로 — 지운 글이 아니다
    expect(visibleText(rows("cloze", "apply")[1]!)).toMatch(/9~10시.*10~11시/);
  });

  it("지도의 가운데 · A 소단원 이름 · 채점표 자리 글 · 이름표 목록과 SVG 답도 수식 조판", () => {
    const figure = MATH_BANK.figures[0]!;
    const hub = String.raw`분수 $\frac{1}{2}$ 알아보기`;
    const sheets: ConceptBlankSheet[] = [
      {
        form: "recall",
        header: header("recall"),
        zones: [
          {
            section: MS.a,
            title: String.raw`$1\,\mathrm{km}$ 알아보기`,
            hint: "뜻 · 예",
            side: "예",
          },
        ],
        key: [MATH_BANK.concepts[0]!],
      },
      {
        form: "map",
        header: header("map"),
        maps: [{ hub, nodes: [MATH_BANK.concepts[1]!] }],
      },
      {
        form: "figure",
        header: header("figure"),
        figures: [
          {
            ...figure,
            tags: [{ x: 70, y: 2, w: 60, answer: String.raw`$\angle A$` }],
          },
        ],
      },
    ];
    render(<ConceptBlankPaper sheets={sheets} view="both" />);
    for (const page of document.querySelectorAll("[data-cb-page]"))
      expect(leaks(page)).toEqual([]);
    expect(
      document.querySelector("[data-cb-zone] [data-cb-zone-title] .katex"),
    ).not.toBeNull();
    expect(document.querySelector("[data-cb-hub] .katex")).not.toBeNull();
    // 채점표 — 자리 글(A 의 소단원 · D 의 지도 이름)
    const places = [...document.querySelectorAll("[data-cb-place]")];
    expect(places).toHaveLength(2);
    for (const place of places)
      expect(place.querySelector(".katex")).not.toBeNull();
    // 이름표 — 채점표의 목록은 KaTeX, 그림 속 네모 안 답은 MathJax SVG 경로.
    const figureRow = document.querySelector('tr[data-cb-key-row="figure"]')!;
    expect(figureRow.querySelector("[data-cb-tag-list] .katex")).not.toBeNull();
    expect(
      figureRow
        .querySelector("[data-cb-tag] [data-label]")
        ?.getAttribute("data-label"),
    ).toBe(String.raw`$\angle A$`);
    expect(figureRow.querySelector("[data-cb-tag] path")).not.toBeNull();
    expect(figureRow.querySelector("[data-cb-tag] text")).toBeNull();
    expect(figureRow.querySelector("[data-cb-tag] title")?.textContent).toBe(
      "∠A",
    );
  });

  // 리뷰(2026-10-01 · 보고서 §11.8 ⑤) — 그림의 `aria-label` 이 물음 글 그대로라 화면 읽기 프로그램이 TeX 원문을 읽었다.
  it("그림의 읽기 이름(aria-label)은 보이는 글 — 수식 마크업을 걷는다(학생지 · 채점표)", () => {
    render(<ConceptBlankPaper sheets={MATH_SHEETS} view="both" />);
    const labels = [...document.querySelectorAll("svg[data-cb-figure]")].map(
      (svg) => svg.getAttribute("aria-label"),
    );
    // 학생지 카드 하나 + 채점표 작은 그림 하나
    expect(labels).toEqual(["각 ∠A 읽기", "각 ∠A 읽기"]);
  });

  it("글자만 있는 은행은 전과 같다 — 수식 경로를 지나도 글이 바뀌지 않는다", () => {
    render(<ConceptBlankPaper sheets={SHEETS} view="both" />);
    expect(document.querySelector(".katex")).toBeNull();
    const text = document.body.textContent ?? "";
    for (const c of FIXTURE_BANK.concepts) {
      expect(text).toContain(c.term);
      for (const k of blankKeywords(c.definition)) expect(text).toContain(k);
    }
  });
});
