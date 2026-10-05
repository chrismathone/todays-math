// @vitest-environment node
/**
 * Native source question rows, without a browser: the authored heading as a safe tree, the row
 * plan, how measured sizes reach the markup, the fixed page note's place in the tree, the
 * renderer's bounds and the untouched manuscript.
 *
 * jsdom has no layout. Sizes here are stated values: these tests prove what is paired and what
 * is written into the markup. That the two columns really come out the same physical height is
 * measured in Chromium by `textbookRecoverySourceQuestionRows.integration.test.ts`.
 *
 * 🔴 All content is synthetic (see `helpers/textbookSourceRows.ts`). Nothing here compares a page
 * with the original source PDF.
 */
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { Browser } from "puppeteer-core";
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import {
  textbookSemanticSchema,
  type TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";
import { canonicalJson } from "@/lib/textbook/canonical";
import {
  blockWidthMm,
  paginateTextbookSections,
  TextbookLayoutError,
} from "@/lib/textbook/layout/paginate";
import { renderBlockHtml, renderPageHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type TextbookRenderModel,
} from "@/lib/textbook/render/model";
import { RECOVERY_FRAME_CSS } from "@/lib/textbook/render/recoveryFrameCss";
import {
  applyRecoveryMeasurements,
  assertRecoveryMeasurementBudget,
  recoveryMeasurePlan,
  type RecoveryMeasureResult,
} from "@/lib/textbook/render/recoveryMeasurement";
import { renderTextbookChunk } from "@/lib/textbook/render/server";
import { sourceQuestionRowPlan } from "@/lib/textbook/render/sourceQuestionRows";
import { SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";
import {
  judgeSourceRows,
  linkedGroupExpectation,
  linkedGroupSections,
  LONG_HEADER,
  LONG_PROMPT,
  SHORT_PROMPT,
  SOURCE_PAGE,
  SOURCE_ROW_PROBE,
  sourceRowsExchange,
  standardExpectation,
  standardSections,
  syntheticHeader,
  type CapturedSourcePage,
  type MeasuredSizes,
  type SourceRowFailure,
  type SourceSectionSpec,
} from "../helpers/textbookSourceRows";

const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
const parse = (html: string) =>
  new JSDOM(`<body>${html}</body>`).window.document;
const probe = new Function(`return ${SOURCE_ROW_PROBE}`)() as (
  document: Document,
) => CapturedSourcePage[];
const resources = {
  assetUrl: (): string => {
    throw new Error("The synthetic pages hold no stored asset");
  },
  qrDataUrl: (): string => "data:image/png;base64,AA==",
};
const rules = (failures: SourceRowFailure[]) =>
  [...new Set(failures.map((failure) => failure.rule))].sort();
const allBlocks = (model: TextbookRenderModel) =>
  model.sections.flatMap((section) => section.blocks);
const problem = (model: TextbookRenderModel, id: string) => {
  const block = allBlocks(model).find((candidate) => candidate.id === id);
  if (block?.kind !== "problem") throw new Error(`No problem ${id}`);
  return block;
};
/** Stated sizes in the shape the Chromium measurement returns. */
const STATED: MeasuredSizes = {
  "q-a1": { head: 9.7, prompt: 17.34 },
  "q-a2": { head: 9.7, prompt: 17.34 },
  "q-b1": { head: 5.69, prompt: 34.68 },
  "q-b2": { head: 5.69, prompt: 34.68 },
};
const result = (sizes: MeasuredSizes): RecoveryMeasureResult => ({
  sourceQuestionSizesMm: sizes,
  rowHeightsMm: {},
  blockMinHeightsMm: {},
  dialogueSizesPt: {},
  dialogueGapsMm: {},
  dialogueTopMm: 63.42,
});
/** The production projection, paginator and page markup over stated block heights. */
function pages(
  model: TextbookRenderModel,
  options: { maxPages?: number } = {},
): { html: string; captured: CapturedSourcePage[] } {
  const layout = paginateTextbookSections(
    model.sections,
    allBlocks(model).map((block) => ({
      blockId: block.id,
      widthMm: blockWidthMm(model.config, block),
      heightMm: block.kind === "heading" ? 30 : 40,
    })),
    model.config,
    { firstPhysicalPageIndex: SOURCE_PAGE, ...options },
  );
  const html = layout.pages
    .map((page) => renderPageHtml(page, model, resources))
    .join("");
  return { html, captured: probe(parse(html)) };
}
const standardModel = () =>
  createTextbookRenderModel(sourceRowsExchange(standardSections()), "student");

describe("native question heading is a safe tree", () => {
  const semantic = (header: unknown) => ({
    activity: "dialogueCheck",
    source: { unit: "U01", page: 17, kind: "scriptcheck", path: "synthetic" },
    sourceQuestionHeader: header,
  });

  it("accepts a number, a label and a tag", () => {
    expect(
      textbookSemanticSchema.safeParse(semantic(LONG_HEADER)).success,
    ).toBe(true);
  });

  it.each([
    ["a script element", [{ tag: "script", rawText: "x" }]],
    ["a link element", [{ tag: "a", rawText: "x" }]],
    ["an iframe", [{ tag: "iframe" }]],
    ["a style element", [{ tag: "style", rawText: "x" }]],
    ["an href", [{ tag: "span", attributes: { href: "https://e" } }]],
    ["an inline style", [{ tag: "span", attributes: { style: "top:0" } }]],
    ["an event handler", [{ tag: "span", attributes: { onclick: "x()" } }]],
    [
      "a class that closes the attribute",
      [{ tag: "span", attributes: { className: 'a" onload="x' } }],
    ],
    ["an image without a frozen asset", [{ tag: "img" }]],
    [
      "an asset on a text node",
      [{ tag: "span", attributes: { assetId: "a" } }],
    ],
    ["an unknown key", [{ tag: "span", rawText: "x", html: "<b>" }]],
    ["an empty heading", []],
    [
      "more than thirty children",
      Array.from({ length: 31 }, () => ({ tag: "span", rawText: "x" })),
    ],
  ])("rejects %s", (_name, header) => {
    expect(textbookSemanticSchema.safeParse(semantic(header)).success).toBe(
      false,
    );
  });

  it("rejects a tree deeper than 20 levels or larger than 3,000 nodes", () => {
    let deep: TextbookSourceFragment = { tag: "span", rawText: "x" };
    for (let level = 0; level < 21; level++)
      deep = { tag: "div", children: [deep] };
    expect(textbookSemanticSchema.safeParse(semantic([deep])).success).toBe(
      false,
    );
    const many = Array.from({ length: 30 }, () => ({
      tag: "div",
      children: Array.from({ length: 101 }, () => ({
        tag: "span",
        rawText: "x",
      })),
    }));
    expect(textbookSemanticSchema.safeParse(semantic(many)).success).toBe(
      false,
    );
  });

  it("prints hostile heading text as text: no element, URL or handler is created from it", () => {
    const hostile = [
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "<a href='https://evil.example'>x</a>",
      "[합성 링크](javascript:alert(1))",
    ];
    const exchange = sourceRowsExchange([
      {
        sectionKey: "sc",
        title: "합성",
        kind: "scriptcheck",
        activity: "dialogueCheck",
        blocks: hostile.map((rawText, index) => ({
          id: `h${index}`,
          content: SHORT_PROMPT,
          header: [{ tag: "span" as const, rawText }],
        })),
      },
    ]);
    // The contract accepts them: they are text.
    textbookExchangeSchema.parse(exchange);
    const model = createTextbookRenderModel(exchange, "student");
    hostile.forEach((rawText, index) => {
      const html = renderBlockHtml(problem(model, `q-h${index}`), resources);
      const head = parse(html).querySelector(".tb-problem-head")!;
      expect(head.querySelectorAll("script,img,a,iframe,style")).toHaveLength(
        0,
      );
      for (const element of head.querySelectorAll("*"))
        for (const attribute of element.getAttributeNames())
          expect(["class", "data-textbook-math"]).toContain(attribute);
      // Angle brackets reach the page escaped: the markup holds no tag made from the text.
      expect(head.innerHTML).not.toMatch(/<(?!\/?(?:span|strong|em)\b)/);
      // The link syntax keeps its label and loses its target; the rest is printed as written.
      expect(head.textContent).toBe(index === 3 ? "합성 링크" : rawText);
    });
  });

  it("refuses an image written as Markdown in a heading", () => {
    const model = createTextbookRenderModel(
      sourceRowsExchange([
        {
          sectionKey: "sc",
          title: "합성",
          kind: "scriptcheck",
          activity: "dialogueCheck",
          blocks: [
            {
              id: "m1",
              content: SHORT_PROMPT,
              header: [
                { tag: "span", rawText: "![합성](https://evil.example/x.png)" },
              ],
            },
          ],
        },
      ]),
      "student",
    );
    expect(() => renderBlockHtml(problem(model, "q-m1"), resources)).toThrow(
      "Markdown 이미지는 고정 이미지 블록·자산으로 옮겨 주세요.",
    );
  });

  it("replaces the heading's children only: the prompt and the default heading are as before", () => {
    const withHeader = createTextbookRenderModel(
      sourceRowsExchange(standardSections()),
      "student",
    );
    const plain = standardSections();
    for (const block of plain[0].blocks)
      if (!("group" in block)) delete block.header;
    const withoutHeader = createTextbookRenderModel(
      sourceRowsExchange(plain),
      "student",
    );
    const html = (model: TextbookRenderModel) =>
      parse(renderBlockHtml(problem(model, "q-a1"), resources));
    const authored = html(withHeader);
    const standard = html(withoutHeader);
    expect(
      [...authored.querySelector(".tb-problem-head")!.children].map(
        (child) => `${child.tagName}.${child.className}`,
      ),
    ).toEqual(["STRONG.", "SPAN.qlabel", "SPAN.tag"]);
    expect(standard.querySelector(".tb-problem-head")!.innerHTML).toBe(
      "<strong>001</strong>",
    );
    // Everything outside the heading is byte-identical.
    for (const document of [authored, standard])
      document.querySelector(".tb-problem-head")!.innerHTML = "";
    expect(authored.body.innerHTML).toBe(standard.body.innerHTML);
    expect(authored.querySelector(".tb-prose")!.textContent).toBe(SHORT_PROMPT);
  });

  it("ignores an authored heading on a problem without source metadata", () => {
    const exchange = sourceRowsExchange(standardSections());
    const saved = exchange.units[0].sections[1].blocks[0];
    const before = renderBlockHtml(
      problem(createTextbookRenderModel(exchange, "student"), "q-s1"),
      resources,
    );
    saved.semantic = {
      activity: "practice",
      sourceQuestionHeader: syntheticHeader("99", "합성 가짜 머리"),
    };
    textbookExchangeSchema.parse(exchange);
    const after = renderBlockHtml(
      problem(createTextbookRenderModel(exchange, "student"), "q-s1"),
      resources,
    );
    expect(after).not.toContain("합성 가짜 머리");
    expect(parse(after).querySelector(".tb-problem-head")!.innerHTML).toBe(
      parse(before).querySelector(".tb-problem-head")!.innerHTML,
    );
  });
});

describe("row plan", () => {
  const spreadModel = () => {
    const exchange = sourceRowsExchange(
      [0, 1].map((side) => ({
        sectionKey: `spread-${side}`,
        title: "합성 단원 마무리",
        kind: "exercise",
        activity: "assessment" as const,
        blocks: Array.from({ length: 4 }, (_, index) => ({
          id: `spread-${side}-${index}`,
          content: SHORT_PROMPT,
        })),
      })),
      42,
    );
    exchange.units[0].sections.forEach((section, side) => {
      section.blocks.forEach((block) => {
        block.semantic!.source!.page = 42 + side;
        block.semantic!.source!.sectionName = "단원 마무리";
      });
    });
    return createTextbookRenderModel(exchange, "student");
  };
  it("measures a native even/odd first grid as four questions per row, without changing the model", () => {
    const model = spreadModel(),
      before = JSON.stringify(model);
    expect(sourceQuestionRowPlan(model, 42)).toEqual([
      {
        ids: ["q-spread-0-0", "q-spread-0-1", "q-spread-1-0", "q-spread-1-1"],
        alignPrompt: true,
      },
      {
        ids: ["q-spread-0-2", "q-spread-0-3", "q-spread-1-2", "q-spread-1-3"],
        alignPrompt: true,
      },
    ]);
    expect(recoveryMeasurePlan(model, 42).sourceQuestionGroups).toEqual(
      sourceQuestionRowPlan(model, 42),
    );
    expect(JSON.stringify(model)).toBe(before);
  });
  it.each([
    "unplaced",
    "relocated",
    "odd",
    "different unit",
    "different section",
    "different kind",
    "unequal count",
    "daily mismatch",
    "answers",
  ])("keeps local source pairs for %s", (condition) => {
    const model = spreadModel();
    let first: number | undefined = 42;
    const right = model.sections[1];
    if (condition === "unplaced") first = undefined;
    if (condition === "relocated") first = 2;
    if (condition === "odd") {
      first = 43;
      model.sections.forEach((section) =>
        section.blocks.forEach((block) => {
          if (block.semantic?.source) block.semantic.source.page++;
        }),
      );
    }
    if (condition === "different unit")
      right.blocks.forEach((block) => {
        if (block.semantic?.source) block.semantic.source.unit = "U02";
      });
    if (condition === "different section")
      right.blocks.forEach((block) => {
        if (block.semantic?.source)
          block.semantic.source.sectionName = "다른 활동";
      });
    if (condition === "different kind")
      right.blocks.forEach((block) => {
        if (block.semantic?.source) block.semantic.source.kind = "practice";
      });
    if (condition === "unequal count") right.blocks.pop();
    if (condition === "daily mismatch")
      right.blocks.unshift({
        ...right.blocks[0],
        id: "daily",
        kind: "text",
        markdown: "합성 하루",
        semantic: {
          activity: "assessment",
          source: right.blocks[0].semantic!.source,
          node: {
            kind: "fragments",
            fragments: [
              {
                tag: "div",
                attributes: { className: "daily-banner" },
                rawText: "합성 하루",
              },
            ],
          },
        },
      });
    if (condition === "answers") model.variant = "answers";
    expect(
      sourceQuestionRowPlan(model, first).every(
        (group) => group.ids.length === 2,
      ),
    ).toBe(true);
  });
  it("pairs consecutive column problems of a source page and nothing else", () => {
    const model = standardModel();
    expect(sourceQuestionRowPlan(model)).toEqual([
      { ids: ["q-a1", "q-a2"], alignPrompt: true },
      { ids: ["q-b1", "q-b2"], alignPrompt: true },
    ]);
    // The same plan is what the measurement is told to equalize.
    expect(recoveryMeasurePlan(model).sourceQuestionGroups).toEqual(
      sourceQuestionRowPlan(model),
    );
  });

  it("lets a wide problem or a saved problem end the row, and never pairs across them", () => {
    const column = (id: string, extra: object = {}) => ({
      id,
      content: SHORT_PROMPT,
      ...extra,
    });
    const plan = (blocks: SourceSectionSpec["blocks"]) =>
      sourceQuestionRowPlan(
        createTextbookRenderModel(
          sourceRowsExchange([
            {
              sectionKey: "sc",
              title: "합성",
              kind: "scriptcheck",
              activity: "dialogueCheck",
              blocks,
            },
          ]),
          "student",
        ),
      ).map((group) => group.ids.join("+"));
    expect(
      plan([
        column("p1"),
        column("w", { columnSpan: 2 }),
        column("p2"),
        column("p3"),
      ]),
    ).toEqual(["q-p2+q-p3"]);
    expect(
      plan([column("p1"), column("s", { source: false }), column("p2")]),
    ).toEqual([]);
    expect(
      plan([
        column("p1"),
        column("p2"),
        column("p3"),
        column("p4"),
        column("p5"),
      ]),
    ).toEqual(["q-p1+q-p2", "q-p3+q-p4"]);
    expect(
      plan([column("s1", { source: false }), column("s2", { source: false })]),
    ).toEqual([]);
  });

  it("names a linked source group by its example and first confirmation, headings only", () => {
    const model = createTextbookRenderModel(
      sourceRowsExchange(linkedGroupSections()),
      "student",
    );
    expect(sourceQuestionRowPlan(model)).toEqual([
      { ids: ["q-e1", "q-f1"], alignPrompt: false },
    ]);
  });
});

describe("measured sizes in the markup", () => {
  it("sets one heading height and one prompt height on both members of a native row", () => {
    const model = standardModel();
    applyRecoveryMeasurements(model, result(STATED));
    for (const id of ["q-a1", "q-a2", "q-b1", "q-b2"]) {
      const block = problem(model, id);
      expect(block.sourceQuestionHeadHeightMm).toBe(STATED[id].head);
      expect(block.sourceQuestionPromptMinHeightMm).toBe(STATED[id].prompt);
      const document = parse(renderBlockHtml(block, resources));
      expect(
        document.querySelector(".tb-problem-head")!.getAttribute("style"),
      ).toBe(`height:${STATED[id].head}mm`);
      expect(
        document
          .querySelector(".tb-problem-question > .tb-prose")!
          .getAttribute("style"),
      ).toBe(`min-height:${STATED[id].prompt}mm`);
    }
    const { captured } = pages(model);
    expect(
      judgeSourceRows(captured, standardExpectation(STATED), {
        geometry: false,
      }),
    ).toEqual([]);
  });

  it("reserves the whole prompt row on both members where the result carries its height", () => {
    // The renderer measures this only for a row with a QR or a figure beside or below the prose.
    const reserved: MeasuredSizes = {
      ...STATED,
      "q-a1": { ...STATED["q-a1"], main: 29.5 },
      "q-a2": { ...STATED["q-a2"], main: 29.5 },
    };
    const model = standardModel();
    applyRecoveryMeasurements(model, result(reserved));
    for (const id of ["q-a1", "q-a2"])
      expect(
        parse(renderBlockHtml(problem(model, id), resources))
          .querySelector(".tb-problem-main")!
          .getAttribute("style"),
      ).toBe("min-height:29.5mm");
    // A row without such a height keeps its prompt row unstyled.
    for (const id of ["q-b1", "q-b2", "q-c1", "q-w1", "q-s1"])
      expect(
        parse(renderBlockHtml(problem(model, id), resources))
          .querySelector(".tb-problem-main")!
          .getAttribute("style"),
      ).toBeNull();
    const judge = (sizes: MeasuredSizes) => {
      const fresh = standardModel();
      applyRecoveryMeasurements(fresh, result(sizes));
      return rules(
        judgeSourceRows(pages(fresh).captured, standardExpectation(reserved), {
          geometry: false,
        }),
      );
    };
    expect(judge(reserved)).toEqual([]);
    // Reserved on one side only, or at another height than measured.
    expect(judge({ ...reserved, "q-a2": { ...STATED["q-a2"] } })).toEqual([
      "pair-main-height",
    ]);
    expect(
      judge({
        ...reserved,
        "q-a1": { ...STATED["q-a1"], main: 20 },
        "q-a2": { ...STATED["q-a2"], main: 20 },
      }),
    ).toEqual(["pair-main-height"]);
  });

  it("leaves an unpaired, a wide and a saved problem exactly as they were, even when a size names them", () => {
    const before = standardModel();
    const after = standardModel();
    applyRecoveryMeasurements(
      after,
      result({
        ...STATED,
        // A result that wrongly names problems outside any pair.
        "q-s1": { head: 12, prompt: 30 },
        "q-s2": { head: 12, prompt: 30 },
      }),
    );
    // Saved problems carry no source metadata: a size for them is not applied.
    for (const id of ["q-s1", "q-s2"]) {
      expect(problem(after, id).sourceQuestionHeadHeightMm).toBeUndefined();
      expect(renderBlockHtml(problem(after, id), resources)).toBe(
        renderBlockHtml(problem(before, id), resources),
      );
    }
    // The unpaired and the wide source problem are in no plan and get no size.
    for (const id of ["q-c1", "q-w1"]) {
      expect(problem(after, id).sourceQuestionHeadHeightMm).toBeUndefined();
      expect(renderBlockHtml(problem(after, id), resources)).toBe(
        renderBlockHtml(problem(before, id), resources),
      );
    }
  });

  it("gives a linked group one heading height and no prompt height", () => {
    const model = createTextbookRenderModel(
      sourceRowsExchange(linkedGroupSections()),
      "student",
    );
    const sizes: MeasuredSizes = {
      "q-e1": { head: 6 },
      "q-f1": { head: 6 },
    };
    applyRecoveryMeasurements(model, result(sizes));
    for (const id of ["q-e1", "q-f1"]) {
      expect(problem(model, id).sourceQuestionHeadHeightMm).toBe(6);
      expect(
        problem(model, id).sourceQuestionPromptMinHeightMm,
      ).toBeUndefined();
    }
    expect(problem(model, "q-f2").sourceQuestionHeadHeightMm).toBeUndefined();
    const { captured } = pages(model);
    expect(
      judgeSourceRows(captured, linkedGroupExpectation(sizes), {
        geometry: false,
      }),
    ).toEqual([]);
  });

  it("changes neither the exchange nor its parsed form", () => {
    const exchange = sourceRowsExchange(standardSections());
    const before = canonicalJson(exchange);
    const model = createTextbookRenderModel(exchange, "student");
    applyRecoveryMeasurements(model, result(STATED));
    pages(model);
    createTextbookRenderModel(exchange, "answers");
    expect(canonicalJson(exchange)).toBe(before);
    // Parsing adds no default: a block without an authored heading still has no such key.
    expect(canonicalJson(textbookExchangeSchema.parse(exchange))).toBe(before);
    expect(before).toContain('"sourceQuestionHeader"');
    const plain = sourceRowsExchange([
      {
        sectionKey: "sc",
        title: "합성",
        kind: "scriptcheck",
        activity: "dialogueCheck",
        blocks: [{ id: "n1", content: SHORT_PROMPT }],
      },
    ]);
    expect(canonicalJson(textbookExchangeSchema.parse(plain))).not.toContain(
      "sourceQuestionHeader",
    );
  });
});

describe("mutation controls: the judge fails what it must (no layout)", () => {
  const judged = (
    sizes: MeasuredSizes,
    mutateHtml: (html: string) => string = (html) => html,
    mutateModel: (model: TextbookRenderModel) => void = () => {},
  ) => {
    const model = standardModel();
    applyRecoveryMeasurements(model, result(sizes));
    mutateModel(model);
    const html = mutateHtml(pages(model).html);
    return rules(
      judgeSourceRows(probe(parse(html)), standardExpectation(STATED), {
        geometry: false,
      }),
    );
  };

  it("passes the unmutated pages", () => {
    expect(judged(STATED)).toEqual([]);
  });

  it("fails a wrong heading height on one member", () => {
    expect(
      judged({ ...STATED, "q-a1": { head: 12.7, prompt: 17.34 } }),
    ).toEqual(["pair-head-height"]);
    // Both members wrong together: equal to each other, not to what was measured.
    expect(
      judged({
        ...STATED,
        "q-a1": { head: 4, prompt: 17.34 },
        "q-a2": { head: 4, prompt: 17.34 },
      }),
    ).toEqual(["pair-head-height"]);
  });

  it("fails a wrong or missing prompt height on one member", () => {
    expect(judged({ ...STATED, "q-b2": { head: 5.69, prompt: 20 } })).toEqual([
      "pair-prompt-height",
    ]);
    expect(judged({ ...STATED, "q-b2": { head: 5.69 } })).toEqual([
      "pair-prompt-height",
    ]);
  });

  it("fails a dropped authored heading", () => {
    expect(
      judged(STATED, undefined, (model) => {
        delete problem(model, "q-a1").semantic!.sourceQuestionHeader;
      }),
    ).toEqual(["header-kept"]);
    // A heading swapped between the two columns is not the authored one either.
    expect(
      judged(STATED, undefined, (model) => {
        const [left, right] = ["q-a1", "q-a2"].map((id) => problem(model, id));
        const kept = left.semantic!.sourceQuestionHeader;
        left.semantic!.sourceQuestionHeader =
          right.semantic!.sourceQuestionHeader;
        right.semantic!.sourceQuestionHeader = kept;
      }),
    ).toEqual(["header-kept"]);
  });

  it("fails a size set on an unpaired problem", () => {
    expect(
      judged(STATED, undefined, (model) => {
        (problem(model, "q-c1") as RenderBlock).sourceQuestionHeadHeightMm = 9;
      }),
    ).toEqual(["untouched"]);
  });

  it("fails a page note that joins the content flow, is repeated or is missing", () => {
    const note = /<aside class="tb-source-page-footer"[\s\S]*?<\/aside>/;
    const moved = (html: string) => {
      const [aside] = html.match(note)!;
      // Inside the content box, where it would take part in the flow.
      return html
        .replace(note, "")
        .replace(
          'data-source-body style="',
          `data-source-body data-moved style="`,
        )
        .replace(/(<div class="tb-reference-content"[^>]*>)/, `$1${aside}`);
    };
    expect(judged(STATED, moved)).toEqual(["footer-fixed"]);
    expect(
      judged(STATED, (html) => html.replace(note, (aside) => aside + aside)),
    ).toEqual(["footer-fixed"]);
    expect(judged(STATED, (html) => html.replace(note, ""))).toEqual([
      "footer-fixed",
    ]);
  });
});

describe("fixed page note and the renderer's bounds", () => {
  it("prints the note once, after the question grid, outside the content box", () => {
    const { html, captured } = pages(standardModel());
    const page = captured.find(
      (candidate) => candidate.physicalPageIndex === SOURCE_PAGE,
    )!;
    expect(page.footerCount).toBe(1);
    expect(page.footer!.parentIsPaper).toBe(true);
    expect(page.footer!.insideContent).toBe(false);
    expect(html.indexOf("tb-source-page-footer")).toBeGreaterThan(
      html.indexOf("tb-source-question-grid"),
    );
    // The saved section's pages carry no native note.
    for (const other of captured)
      if (other.physicalPageIndex !== SOURCE_PAGE)
        expect(other.footerCount).toBe(0);
    // Paired column problems sit in the native grid; the wide one does not.
    const inGrid = Object.fromEntries(
      page.problems.map((item) => [item.blockId, item.inGrid]),
    );
    expect(inGrid).toMatchObject({
      "q-a1": true,
      "q-a2": true,
      "q-b1": true,
      "q-b2": true,
      "q-c1": true,
      "q-w1": false,
    });
    expect(RECOVERY_FRAME_CSS).toContain(
      ".tb-source-page-footer{position:absolute;top:270mm;height:8mm",
    );
  });

  it("keeps the 8-section, 600-block and page bounds for source rows", async () => {
    // A browser that fails on first use: the refusals below must come before any page is opened.
    const browser = new Proxy({} as Browser, {
      get(_target, key) {
        if (key === "then") return undefined;
        throw new Error(`The browser must not be used (${String(key)})`);
      },
    });
    const chunk = (sections: SourceSectionSpec[], sectionIndices: number[]) =>
      renderTextbookChunk({
        exchange: textbookExchangeSchema.parse(sourceRowsExchange(sections)),
        readAsset: async () => {
          throw new Error("No asset");
        },
        officialOrigin: SYNTHETIC_ORIGIN,
        sectionIndices,
        firstPhysicalPageIndex: SOURCE_PAGE,
        variant: "student",
        mode: "draft",
        browser,
      });
    const section = (index: number, count: number): SourceSectionSpec => ({
      sectionKey: `sc${index}`,
      title: "합성",
      kind: "scriptcheck",
      activity: "dialogueCheck",
      blocks: Array.from({ length: count }, (_, at) => ({
        id: `s${index}n${at}`,
        content: SHORT_PROMPT,
      })),
    });
    // 600 problems and their one heading: 601 projected blocks.
    await expect(chunk([section(0, 600)], [0])).rejects.toThrow(
      "Render chunk exceeds 600 projected blocks",
    );
    await expect(
      chunk(
        Array.from({ length: 9 }, (_, index) => section(index, 2)),
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
      ),
    ).rejects.toThrow("Render chunks require 1–8 contiguous valid sections");

    const model = standardModel();
    const many = (count: number): TextbookRenderModel => ({
      ...model,
      sections: [
        {
          ...model.sections[0],
          blocks: Array.from(
            { length: count },
            () => model.sections[0].blocks[1],
          ),
        },
      ],
    });
    // Sizing blocks and private helpers are counted together.
    expect(() =>
      assertRecoveryMeasurementBudget(many(400), many(200)),
    ).not.toThrow();
    expect(() => assertRecoveryMeasurementBudget(many(400), many(201))).toThrow(
      "Render measurement exceeds 8 sections or 600 projected blocks",
    );
    expect(() =>
      assertRecoveryMeasurementBudget({
        ...model,
        sections: Array.from({ length: 9 }, () => model.sections[0]),
      }),
    ).toThrow("Render measurement exceeds 8 sections or 600 projected blocks");

    // Six 40mm rows of source problems do not fit one page: a one-page bound refuses them.
    const tall = createTextbookRenderModel(
      sourceRowsExchange([section(0, 12)]),
      "student",
    );
    expect(pages(tall).captured.length).toBeGreaterThan(1);
    let code = "placed";
    try {
      pages(tall, { maxPages: 1 });
    } catch (error) {
      if (!(error instanceof TextbookLayoutError)) throw error;
      code = error.issues[0].code;
    }
    expect(code).toBe("PAGE_LIMIT");
  });

  it("uses long and short synthetic text that differ, so equal heights are not an accident", () => {
    expect(LONG_PROMPT.length).toBeGreaterThan(SHORT_PROMPT.length * 5);
  });
});
