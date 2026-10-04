// @vitest-environment jsdom
/**
 * Memory sheets converted from an original v15 page (`semantic.source`): the source's own row
 * geometry and display-style formulas, behind a marker the measurement can select. Sheets written
 * from the bank keep their defaults. All text here is synthetic.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type {
  TextbookSemantic,
  TextbookSemanticRow,
} from "@/contracts/textbookSemantic.contract";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
import {
  RECALL_ROW_PADDING_MM,
  RECALL_SOURCE_CLASS,
  recallDisplayRows,
  v15TexToMarkdown,
  type RecallPhase,
} from "@/lib/textbook/render/blocks/recall";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import { textbookFixture } from "../helpers/textbookFixture";

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
const PAGE = { study: 18, keywords: 19, sentences: 20 } as const;

/** Hidden keys: a fraction, "기약분수" and a phrase. Row 3 has a formula and no key. */
const HIDDEN = ["기약분수", "분모의 소인수", "\\frac{3}{8}"];
const rows: TextbookSemanticRow[] = [
  {
    rowKey: "U01.C01.r1",
    label: "정의",
    rawText:
      "분수 {{[[\\frac{3}{8}]]}}은 더 약분되지 않는 {{기약분수}}이고 [[\\frac{6}{16}]]과 값이 같다.",
    textFormat: "v15-tex",
  },
  {
    rowKey: "U01.C01.r2",
    label: "판단",
    rawText: "유한소수인지는 {{분모의 소인수}}를 보고 정한다.",
    textFormat: "v15-tex",
  },
  {
    rowKey: "U01.C01.r3",
    label: "예",
    rawText: "[[\\frac{7}{20}=0.35]]는 유한소수이다.",
    textFormat: "v15-tex",
  },
];
const bankRows: TextbookSemanticRow[] = [
  {
    rowKey: "e5.x.definition",
    label: "약수",
    rawText: "어떤 수를 {나누어떨어지게} 하는 수이고 $\\frac{1}{2}$ 은 아니다.",
    textFormat: "bank-blank",
  },
];
/** The converter's compatibility Markdown: keys as `[[ ]]`, a hidden sentence as `{{ }}`. */
function compatibility(row: TextbookSemanticRow, phase: RecallPhase): string {
  const KEY = /\{\{([\s\S]*?)\}\}/g;
  const converted = v15TexToMarkdown(row.rawText);
  const plain = converted.replace(KEY, (_, key: string) => key);
  if (phase === "study") return `${row.label}: ${plain}`;
  if (phase === "sentences") return `${row.label}: {{${plain}}}`;
  return `${row.label}: ${converted.replace(KEY, (_, key: string) => `[[${key}]]`)}`;
}
const source = (phase: RecallPhase): TextbookSemantic["source"] => ({
  unit: "U01",
  page: PAGE[phase],
  kind: "fullmaster",
  path: `pages[${PAGE[phase] - 1}]`,
});

type Extra = {
  answersVisible?: boolean;
  rowHeightsMm?: Record<string, number>;
  displayRows?: ReturnType<typeof recallDisplayRows>;
};
function memory(
  phase: RecallPhase,
  origin: "source" | "bank",
  extra: Extra = {},
): RenderBlock {
  return {
    id: `${origin}.${phase}`,
    sourceBlockId: `${origin}.${phase}`,
    unitKey: "U01",
    sectionKey: `memory-${phase}`,
    kind: "recall",
    phase,
    pieces: [],
    answersVisible: false,
    repetitionChecks: phase === "study",
    semantic:
      origin === "source"
        ? {
            activity: ACTIVITY[phase],
            source: source(phase),
            title: "개념 정리",
            node: {
              kind: "concept",
              conceptId: "C01",
              title: "유한소수의 판별",
              rows,
            },
          }
        : {
            activity: ACTIVITY[phase],
            node: {
              kind: "rows",
              groupKey: "concept-x.memory-0",
              rows: bankRows,
            },
          },
    ...extra,
  } as RenderBlock;
}
/**
 * How each fraction was typeset. KaTeX shrinks the numerator of a text-style fraction
 * (`mtight`); a display-style fraction keeps it at full size.
 */
const fractions = (dom: Document | Element) =>
  Array.from(dom.querySelectorAll(".mfrac")).map((frac) =>
    frac.querySelector(".mtight") ? "text" : "display",
  );

describe("a sheet converted from an original page is marked as such", () => {
  it("marks the section and every row, and names the source page kind", () => {
    for (const phase of PHASES) {
      const dom = parse(render(memory(phase, "source")));
      const section = dom.querySelector<HTMLElement>("section.tb-memory")!;
      expect(section.classList.contains("tb-memory-source")).toBe(true);
      expect(section.dataset.memoryOrigin).toBe("source");
      expect(section.dataset.sourceKind).toBe("fullmaster");
      const marked = dom.querySelectorAll<HTMLElement>(
        '.tb-memory-row.tb-memory-row-source[data-row-origin="source"]',
      );
      expect(marked).toHaveLength(3);
      expect(dom.querySelectorAll(".tb-memory-row")).toHaveLength(3);
    }
  });

  it("leaves a sheet written from the bank without any source marker", () => {
    for (const phase of PHASES) {
      const html = render(memory(phase, "bank"));
      expect(html).not.toContain("tb-memory-source");
      expect(html).not.toContain("tb-memory-row-source");
      expect(html).not.toContain("data-memory-origin");
      expect(html).not.toContain("data-row-origin");
    }
  });
});

describe("source formulas are set in display style, at print time only", () => {
  it("typesets every source formula with \\displaystyle and leaves the bank's as written", () => {
    expect(
      fractions(
        parse(render(memory("study", "source", { answersVisible: true }))),
      ),
    ).toEqual(["display", "display", "display"]);
    expect(
      fractions(
        parse(render(memory("study", "bank", { answersVisible: true }))),
      ),
    ).toEqual(["text"]);
  });

  it("does the same for rows the model projected", () => {
    const projected = recallDisplayRows(rows, "keywords", true);
    const dom = parse(
      render(
        memory("keywords", "source", {
          answersVisible: true,
          displayRows: projected,
        }),
      ),
    );
    expect(fractions(dom)).toEqual(["display", "display", "display"]);
    // The key formula stays inside its key mark.
    expect(fractions(dom.querySelector(".tb-memory-key")!)).toEqual([
      "display",
    ]);
  });

  it("does not write the style into the rows, the projection or a formula that has it", () => {
    const before = JSON.stringify(rows);
    const projected = recallDisplayRows(rows, "study", true);
    render(memory("study", "source", { answersVisible: true }));
    expect(JSON.stringify(rows)).toBe(before);
    expect(JSON.stringify(projected)).not.toContain("displaystyle");
    const styled: TextbookSemanticRow[] = [
      { ...rows[2], rawText: "[[\\displaystyle \\frac{7}{20}]]는 분수이다." },
    ];
    const block = memory("study", "source", { answersVisible: true });
    const node = block.semantic!.node as { rows: TextbookSemanticRow[] };
    node.rows = styled;
    const again = parse(render(block));
    expect(fractions(again)).toEqual(["display"]);
    // The command is not added a second time: the page shows one formula and no stray text.
    expect(again.querySelectorAll(".katex")).toHaveLength(1);
    expect(again.body.textContent).not.toContain("displaystyle");
    node.rows = rows;
  });

  it("sets a source concept card's formulas in display style too", () => {
    const card = (withSource: boolean): RenderBlock =>
      ({
        id: "card",
        sourceBlockId: "card",
        unitKey: "U01",
        sectionKey: "lesson",
        kind: "concept",
        conceptKey: "C01",
        title: "유한소수의 판별",
        body: {
          goal: "",
          prerequisites: [],
          definition: "",
          conditions: "",
          examples: [],
          counterexamples: [],
          misconceptions: [],
          explainPrompt: "",
        },
        semantic: {
          activity: "concepts",
          ...(withSource
            ? {
                source: {
                  unit: "U01",
                  page: 10,
                  kind: "lesson",
                  path: "pages[9]",
                },
              }
            : {}),
          node: {
            kind: "concept",
            conceptId: "C01",
            title: "유한소수의 판별",
            rows,
          },
        },
      }) as RenderBlock;
    expect(fractions(parse(render(card(true))))).toEqual([
      "display",
      "display",
      "display",
    ]);
    expect(fractions(parse(render(card(false))))).toEqual([
      "text",
      "text",
      "text",
    ]);
  });
});

describe("the source sentence sheet writes on one rule, or on 7mm lines", () => {
  const lines = (block: RenderBlock) =>
    Array.from(
      parse(render(block)).querySelectorAll<HTMLElement>(".tb-memory-row"),
    ).map((row) => ({
      lines: row.querySelectorAll(".tb-write-line").length,
      rule: row
        .querySelector(".tb-blank-sentence")
        ?.classList.contains("tb-blank-rule"),
      text: row.querySelector(".tb-memory-body")?.textContent,
    }));

  it("gives an unmeasured source row one rule and no text", () => {
    expect(lines(memory("sentences", "source"))).toEqual([
      { lines: 1, rule: true, text: "" },
      { lines: 1, rule: true, text: "" },
      { lines: 1, rule: true, text: "" },
    ]);
  });

  it("counts lines above the source padding of 3mm, the bank's above 2.2mm", () => {
    // 16.5mm: (16.5 - 3) / 7 = 1.93 → one rule; (16.5 - 2.2) / 7 = 2.04 → two lines.
    const rowHeightsMm = {
      "U01.C01.r1": 9.3,
      "U01.C01.r2": 16.5,
      "U01.C01.r3": 24.2,
      "e5.x.definition": 16.5,
    };
    expect(lines(memory("sentences", "source", { rowHeightsMm }))).toEqual([
      { lines: 1, rule: true, text: "" },
      { lines: 1, rule: true, text: "" },
      { lines: 3, rule: false, text: "" },
    ]);
    expect(lines(memory("sentences", "bank", { rowHeightsMm }))).toEqual([
      { lines: 2, rule: false, text: "" },
    ]);
  });

  it("keeps the bank's unmeasured sentence rows on whole 7mm lines", () => {
    expect(lines(memory("sentences", "bank"))).toEqual([
      { lines: 1, rule: false, text: "" },
    ]);
  });
});

describe("student source sheets carry no hidden key or sentence", () => {
  const visible = (html: string) => parse(html).body.textContent ?? "";

  it("prints neither the keys nor their TeX on the keyword sheet", () => {
    for (const extra of [
      {},
      { displayRows: recallDisplayRows(rows, "keywords", false) },
      // A projection that wrongly kept the keys is cleaned for a student block.
      { displayRows: recallDisplayRows(rows, "keywords", true) },
    ]) {
      const html = render(memory("keywords", "source", extra));
      for (const key of HIDDEN) expect(html).not.toContain(key);
      expect(html).not.toContain("tb-memory-key");
      expect(parse(html).querySelectorAll(".tb-blank-keyword")).toHaveLength(3);
      // Public text and the one public formula of each fraction row remain, in display style.
      expect(visible(html)).toContain("더 약분되지 않는");
      expect(fractions(parse(html))).toEqual(["display", "display"]);
    }
  });

  it("prints no row text at all on the sentence sheet", () => {
    for (const extra of [
      {},
      { displayRows: recallDisplayRows(rows, "sentences", false) },
      { displayRows: recallDisplayRows(rows, "sentences", true) },
    ]) {
      const html = render(memory("sentences", "source", extra));
      for (const text of [...HIDDEN, "약분", "유한소수인지", "0.35", "frac"])
        expect(html).not.toContain(text);
      expect(parse(html).querySelectorAll(".katex")).toHaveLength(0);
    }
  });

  it("keeps them out of the student model as well as the page", () => {
    const exchange = textbookFixture(1, 0);
    const section = exchange.units[0].sections[0];
    section.templateKey = "reference-fullmaster";
    section.blocks = PHASES.map((phase) => ({
      blockId: `memory-${phase}`,
      kind: "concept-recall" as const,
      phase,
      markdown: rows.map((row) => compatibility(row, phase)).join("\n\n"),
      showRepetitionChecks: phase === "study",
      semantic: {
        activity: ACTIVITY[phase],
        source: source(phase),
        node: {
          kind: "concept" as const,
          conceptId: "C01",
          title: "유한소수의 판별",
          rows,
        },
      },
    }));
    const student = createTextbookRenderModel(exchange, "student");
    const answers = createTextbookRenderModel(exchange, "answers");
    const recall = (model: typeof student, phase: RecallPhase) =>
      model.sections
        .flatMap((s) => s.blocks)
        .filter((b) => b.kind === "recall" && b.phase === phase);
    for (const phase of ["keywords", "sentences"] as const) {
      const blocks = recall(student, phase);
      expect(blocks).toHaveLength(1);
      const dto = JSON.stringify(blocks);
      const html = blocks.map(render).join("");
      for (const key of HIDDEN) {
        expect(dto).not.toContain(key);
        expect(html).not.toContain(key);
      }
      expect(html).toContain("tb-memory-source");
      // The hidden fraction is not typeset: two public fractions, or none on the sentence sheet.
      expect(fractions(parse(html))).toHaveLength(phase === "keywords" ? 2 : 0);
      // The answer variant of the same block prints the keys and all three fractions.
      const shown = recall(answers, phase).map(render).join("");
      for (const key of ["기약분수", "분모의 소인수"])
        expect(shown).toContain(key);
      expect(fractions(parse(shown))).toEqual([
        "display",
        "display",
        "display",
      ]);
    }
    const sentences = JSON.stringify(recall(student, "sentences"));
    expect(sentences).not.toContain("약분되지");
    expect(sentences).not.toContain("0.35");
  });
});

describe("source geometry is a separate rule set", () => {
  const css = TEXTBOOK_CONTENT_CSS;
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector}{`);
    if (at < 0) return null;
    return css.slice(at + selector.length + 1, css.indexOf("}", at));
  };

  it("gives source rows the original padding and no body floor, and the title its leading", () => {
    expect(rule(".tb-memory-source .tb-memory-row")).toBe(
      "padding-block:1.5mm",
    );
    // The original title inherits the sheet's 1.65; its row label inherits the row's 1.9.
    expect(rule(".tb-memory-source .tb-memory-title")).toBe("line-height:1.65");
    expect(rule(".tb-memory-source .tb-memory-label")).toBeNull();
    expect(rule(".tb-memory-label")).not.toContain("line-height");
    expect(
      rule(
        ".tb-memory-source .tb-memory-body,.tb-memory-source .tb-memory-body>.tb-blank-sentence",
      ),
    ).toBe("min-height:0");
  });

  it("keeps the bank's row padding, its 7mm body floor and its title leading", () => {
    expect(rule(".tb-memory-row")).toContain("padding-block:1.1mm");
    expect(rule(".tb-memory-title")).toContain("line-height:1.5");
    expect(rule(".tb-memory-body")).toBe(
      "min-width:0;min-height:calc(var(--tb-row-lines,1)*7mm)",
    );
    expect(rule(".tb-memory-body>.tb-blank-sentence")).toBe(
      "height:100%;min-height:calc(var(--tb-row-lines,1)*7mm)",
    );
    expect(rule(".tb-write-line")).toBe(
      "display:block;flex:none;height:7mm;border-bottom:.265mm solid #bfcdbd",
    );
  });

  it("lets a single source writing line fill its row, and only there", () => {
    // Whoever writes the line — this renderer or the measurement — one line is one bottom rule.
    expect(
      rule(".tb-memory-source .tb-blank-sentence>.tb-write-line:only-child"),
    ).toBe(
      "flex:1 1 auto;height:auto;min-height:calc(var(--tb-row-lines,1)*1.9em)",
    );
    expect(
      rule(
        ".tb-memory-source .tb-memory-row-measured .tb-write-line:only-child",
      ),
    ).toBe("min-height:0");
    const single = css
      .split("}")
      .map((r) => r.slice(0, r.indexOf("{")).trim())
      .filter((selector) => selector.includes(":only-child"));
    expect(single).toHaveLength(2);
    for (const selector of single)
      for (const part of selector.split(","))
        expect(part.trim().startsWith(".tb-memory-source ")).toBe(true);
  });

  it("names the marker and the two paddings for the measurement", () => {
    expect(RECALL_SOURCE_CLASS).toBe("tb-memory-source");
    expect(RECALL_ROW_PADDING_MM).toEqual({ bank: 2.2, source: 3 });
  });
});
