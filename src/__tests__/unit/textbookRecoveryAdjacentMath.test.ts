// @vitest-environment jsdom
/**
 * A key that is a formula may touch the formula after it: `{$50$}$\%$`. When the pieces of such
 * a row are joined for printing, the two `$` must not be read as one display delimiter. The
 * stored text stays as written; only the joining for display knows about the seam.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { conceptMemoryRows } from "@/lib/textbook/conceptRows";
import { TEXTBOOK_CORE_BANK } from "@/lib/textbook/coreConceptBank";
import {
  recallDisplayRows,
  type RecallPhase,
} from "@/lib/textbook/render/blocks/recall";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
const render = (block: RenderBlock) => renderBlockHtml(block, resources);
const PHASES: RecallPhase[] = ["study", "keywords", "sentences"];
const ACTIVITY = {
  study: "conceptStudy",
  keywords: "clozeRecall",
  sentences: "sentenceRecall",
} as const;
/** The private-use markers the renderer works with; none may reach the page. */
const MARKERS = new RegExp(
  `[${String.fromCharCode(0xe000)}-${String.fromCharCode(0xe0ff)}]`,
);

/** Two rows shaped like the bank's: a key formula touching "%", once and twice in a row. */
const rows: TextbookSemanticRow[] = [
  {
    rowKey: "m9-01-01-c3.definition",
    label: "첫 구간",
    rawText:
      "전체 자료의 약 {$25$}$\\%$ 가 첫 구간에 있고 그 구간은 {가장 짧다}.",
    textFormat: "bank-blank",
  },
  {
    rowKey: "m9-01-01-c10.definition",
    label: "통과 기준",
    rawText: "{$75$}$\\%$ 이상이면 통과이고 나머지 {$25$}$\\%$ 는 다시 본다.",
    textFormat: "bank-blank",
  },
];
type Variant = "student" | "answers";
function memory(
  phase: RecallPhase,
  variant: Variant,
  source: readonly TextbookSemanticRow[],
  options: { projected?: boolean; origin?: boolean } = {},
): RenderBlock {
  const reveal = variant === "answers";
  const hidden = !reveal && phase !== "study";
  return {
    id: "b1",
    sourceBlockId: "b1",
    unitKey: "U09",
    sectionKey: "s1",
    kind: "recall",
    phase,
    pieces: [],
    answersVisible: reveal,
    repetitionChecks: phase === "study",
    ...(options.projected
      ? { displayRows: recallDisplayRows(source, phase, reveal) }
      : {}),
    semantic: {
      activity: ACTIVITY[phase],
      ...(options.origin
        ? {
            source: {
              unit: "U09",
              page: 18,
              kind: "fullmaster",
              path: "pages[17]",
            },
          }
        : {}),
      node: {
        kind: "rows",
        groupKey: "concept-x.memory-0",
        // As the model does: a student's hidden phases carry no row text.
        rows:
          options.projected && hidden
            ? source.map((row) => ({ ...row, rawText: "" }))
            : [...source],
      },
    },
  } as RenderBlock;
}
/** Each formula of a row body, and what stands directly after it. */
const formulas = (row: Element) =>
  Array.from(row.querySelectorAll("[data-textbook-math]")).map((math) => {
    // A key formula sits inside its mark: what follows the mark follows the formula.
    const holder = math.parentElement?.classList.contains("tb-memory-key")
      ? math.parentElement
      : math;
    const next = holder.nextSibling;
    return {
      text: math.querySelector(".katex-html")?.textContent ?? "",
      touchesFormula:
        next instanceof Element && next.hasAttribute("data-textbook-math"),
    };
  });
function sound(html: string) {
  expect(html).not.toMatch(MARKERS);
  expect(html).not.toContain("katex-error");
  const dom = parse(html);
  expect(dom.querySelector(".katex-display")).toBeNull();
  return dom;
}

describe("a key formula that touches the next formula", () => {
  it("prints both as inline formulas, side by side, where the row is shown", () => {
    const shown: Array<[RecallPhase, Variant]> = [
      ["study", "student"],
      ["study", "answers"],
      ["keywords", "answers"],
      ["sentences", "answers"],
    ];
    for (const [phase, variant] of shown)
      for (const projected of [false, true]) {
        const dom = sound(render(memory(phase, variant, rows, { projected })));
        const [first, second] = Array.from(
          dom.querySelectorAll(".tb-memory-row"),
        ).map(formulas);
        expect(first, `${phase} ${variant}`).toEqual([
          { text: "25", touchesFormula: true },
          { text: "%", touchesFormula: false },
        ]);
        expect(second, `${phase} ${variant}`).toEqual([
          { text: "75", touchesFormula: true },
          { text: "%", touchesFormula: false },
          { text: "25", touchesFormula: true },
          { text: "%", touchesFormula: false },
        ]);
        // The sentence reads as written around the formulas.
        expect(dom.querySelector(".tb-memory-body")?.textContent).toContain(
          "가 첫 구간에 있고 그 구간은 가장 짧다.",
        );
      }
  });

  it("hides the key and keeps the public formula on the student keyword sheet", () => {
    for (const projected of [false, true]) {
      const dom = sound(
        render(memory("keywords", "student", rows, { projected })),
      );
      const [first, second] = Array.from(
        dom.querySelectorAll(".tb-memory-row"),
      );
      expect(formulas(first).map((f) => f.text)).toEqual(["%"]);
      expect(formulas(second).map((f) => f.text)).toEqual(["%", "%"]);
      expect(first.querySelectorAll(".tb-blank-keyword")).toHaveLength(2);
      expect(second.querySelectorAll(".tb-blank-keyword")).toHaveLength(2);
      // Each blank that hides a number is followed directly by its percent sign.
      const blank = second.querySelector(".tb-blank-keyword")!;
      expect(
        blank.nextSibling instanceof Element &&
          blank.nextSibling.hasAttribute("data-textbook-math"),
      ).toBe(true);
      const text = dom.querySelector(".tb-memory-rows")!.textContent ?? "";
      for (const hidden of ["25", "75", "가장 짧다"])
        expect(text).not.toContain(hidden);
      expect(dom.querySelector(".tb-memory-key")).toBeNull();
    }
  });

  it("prints nothing of the row on the student sentence sheet", () => {
    for (const projected of [false, true]) {
      const dom = sound(
        render(memory("sentences", "student", rows, { projected })),
      );
      expect(dom.querySelectorAll("[data-textbook-math]")).toHaveLength(0);
      for (const body of dom.querySelectorAll(".tb-memory-body"))
        expect(body.textContent).toBe("");
    }
  });

  it("leaves the stored rows and their projection as written", () => {
    const before = JSON.stringify(rows);
    const projection = JSON.stringify(recallDisplayRows(rows, "study", true));
    for (const phase of PHASES) render(memory(phase, "answers", rows));
    expect(JSON.stringify(rows)).toBe(before);
    expect(JSON.stringify(recallDisplayRows(rows, "study", true))).toBe(
      projection,
    );
    expect(projection).not.toMatch(MARKERS);
    expect(rows[0].rawText).toContain("{$25$}$\\%$");
  });

  it("does the same for an original v15 row, in display style", () => {
    const original: TextbookSemanticRow[] = [
      {
        rowKey: "U09.C01.r1",
        label: "백분율",
        rawText:
          "{{[[\\frac{1}{4}]]}}[[\\times 100]]을 계산하면 {{[[25]]}}[[\\%]]이다.",
        textFormat: "v15-tex",
      },
    ];
    for (const phase of PHASES) {
      const dom = sound(
        render(memory(phase, "answers", original, { origin: true })),
      );
      const found = formulas(dom.querySelector(".tb-memory-row")!);
      expect(found.map((f) => f.touchesFormula)).toEqual([
        true,
        false,
        true,
        false,
      ]);
      // The fraction keeps its display size: no shrunken numerator.
      expect(dom.querySelector(".mfrac .mtight")).toBeNull();
      expect(dom.querySelector(".mfrac")).not.toBeNull();
    }
    const student = sound(
      render(memory("keywords", "student", original, { origin: true })),
    );
    expect(student.querySelector(".mfrac")).toBeNull();
    expect(student.querySelectorAll(".tb-blank-keyword")).toHaveLength(2);
  });

  it("prints a concept card built from the same rows", () => {
    const card = {
      id: "card",
      sourceBlockId: "card",
      unitKey: "U09",
      sectionKey: "lesson",
      kind: "concept",
      conceptKey: "C01",
      title: "상자 안의 자료",
      qr: null,
      body: {
        goal: "",
        prerequisites: [],
        definition: "",
        conditions: null,
        examples: [],
        counterexamples: [],
        misconceptions: [],
        explainPrompt: null,
      },
      semantic: {
        activity: "concepts",
        node: {
          kind: "concept",
          conceptId: "C01",
          title: "상자 안의 자료",
          rows,
        },
      },
    } as RenderBlock;
    const dom = sound(render(card));
    const found = Array.from(dom.querySelectorAll(".tb-concept-row")).map(
      (row) => formulas(row).map((f) => f.text),
    );
    expect(found).toEqual([
      ["25", "%"],
      ["75", "%", "25", "%"],
    ]);
  });
});

describe("every bank row with touching formulas prints", () => {
  /** Rows of the automatic book's bank where one piece ends a formula and the next begins one. */
  const seamed = conceptMemoryRows(TEXTBOOK_CORE_BANK.concepts).filter(
    (row) => {
      const pieces = splitBlankSentence(row.rawText);
      return pieces.some(
        (piece, at) =>
          at > 0 &&
          pieces[at - 1].text.endsWith("$") &&
          piece.text.startsWith("$"),
      );
    },
  );

  it("finds the rows the scan reported", () => {
    const keys = seamed.map((row) => row.rowKey);
    expect(keys).toContain("m3-07-03-c3.definition");
    expect(keys).toContain("m3-07-03-c10.definition");
  });

  it("prints each of them in all three phases, for students and with answers", () => {
    expect(seamed.length).toBeGreaterThanOrEqual(2);
    for (const row of seamed)
      for (const phase of PHASES)
        for (const variant of ["student", "answers"] as const)
          for (const projected of [false, true]) {
            const dom = sound(
              render(memory(phase, variant, [row], { projected })),
            );
            expect(
              dom.querySelectorAll(".tb-memory-row"),
              `${row.rowKey} ${phase} ${variant}`,
            ).toHaveLength(1);
          }
  });
});
