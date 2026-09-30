/**
 * 개념 백지 A4 지면 `ConceptBlankPaper` (D-150 · 26 §6 · 브리프 cb-paper «받아들임»).
 *
 * 보는 것 — 형식 다섯이 FIXTURE 에서 그려진다 · C 빈칸 수 = 핵심어 수 · 채점표에 핵심어 굵게 · E 이름표 자리 수 = tags 수 ·
 * 쪽 나누기 고정 규칙(B 10문항 → 2장 · 천장 · 고르게 나누기) · 줄맞춤 도구(번호 열 · 줄 어림 · 가지 · 카드 놓기) ·
 * 학생지에 답이 새지 않는다 · 배점 글자가 없다 · 수식은 제품 KaTeX 경로.
 *
 * ⚠️ vitest 는 CSS 를 안 읽는다(`css: false`) — 넘침(px)은 Playwright 가 인쇄 매체로 잰다(`e2e/concept-blank-paper`).
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import {
  GEOMETRY,
  keyRowCost,
  mathExtra,
  notesCost,
  numberColumnWidth,
  packBalanced,
  packKeyPages,
  packPages,
  PAGE_CAPS,
  planSheet,
  type KeyRow,
} from "@/components/concept-blank/paper/paginate";
import {
  cardGrid,
  mapColumns,
  wirePaths,
} from "@/components/concept-blank/paper/StudentBody";
import {
  BLANK_WIDTH,
  blankWidth,
  circled,
  estimateLines,
  formatSheetDate,
  mathEm,
  sentenceAtoms,
  splitSentence,
  textEm,
  wrapLines,
} from "@/components/concept-blank/paper/text";
import { parseConceptBlankView } from "@/components/concept-blank/paper/view";
import {
  blankKeywords,
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
    expect(screen.getByText("방금 쓴 뜻으로 풀어 보시오.")).toBeTruthy();
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
  it("머리 — 오늘의수학 · 영문 라벨 · 제목 · 목표 · 학습일 · 이름/반 · 단원", () => {
    render(<ConceptBlankPaper sheets={[sheetOf("term")]} view="student" />);
    const head = document.querySelector('[data-cb-head="first"]')!;
    const h = within(head as HTMLElement);
    expect(h.getByText("오늘의수학")).toBeTruthy();
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
    expect(next.textContent).toContain("오늘의수학");
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
    // 줄 간격이 넓은 글(C 문장 30.1)은 글자 수식으로 늘지 않는다
    expect(mathExtra("값 $x$ 이다", 1, 14, 30.1)).toBeLessThan(1);
    // 글의 줄 수보다 많이 세지 않는다
    expect(mathExtra("$a$ $b$ $c$ $d$", 1, 11.5, 17.83)).toBe(small);
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
