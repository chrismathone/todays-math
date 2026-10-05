// @vitest-environment node
/**
 * Native source question rows in real Chromium, with the production fonts — not mocked boxes.
 *
 *   TEXTBOOK_PDF_TEST=1 node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts src/__tests__/unit/textbookRecoverySourceQuestionRows.integration.test.ts
 *
 * The heading and prompt of a two-column row are equalized by `measureRecoveryDom` and carried
 * to the page by `applyRecoveryMeasurements`. Here that is followed through the production chunk
 * renderer (the final render) and through the real `measureTextbookPreview`, bundled as the
 * browser would load it (the preview), and the result is read back from the delivered pages.
 *
 * 🔴 All content is synthetic (see `helpers/textbookSourceRows.ts`). No page is compared with the
 * original source PDF here, and nothing below claims such equality.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import type { Browser, Page } from "puppeteer-core";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  textbookExchangeSchema,
  type TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import type { TextbookSourceFragment } from "@/contracts/textbookSemantic.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { canonicalJson } from "@/lib/textbook/canonical";
import { loadTextbookLocalBundle } from "@/lib/textbook/render/bundle.server";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  renderTextbookChunk,
  type TextbookChunkResult,
} from "@/lib/textbook/render/server";
import { sourceQuestionRowPlan } from "@/lib/textbook/render/sourceQuestionRows";
import {
  noAssets,
  openArtifact,
  witnessBrowser,
  type WitnessedPage,
} from "../../../scripts/qa/textbook/recovery/intro-proof";
import { SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";
import {
  judgeSourceRows,
  kindExpectation,
  kindSections,
  linkedGroupExpectation,
  linkedGroupSections,
  rowGapsMm,
  LONG_PROMPT,
  SHORT_HEADER,
  SHORT_PROMPT,
  SOURCE_PAGE,
  SOURCE_ROW_PROBE,
  sourceRowsExchange,
  standardExpectation,
  standardSections,
  WRAPPING_HEADER,
  type Box,
  type CapturedSourcePage,
  type MeasuredSizes,
  type SourceRowExpectation,
  type SourceRowFailure,
} from "../helpers/textbookSourceRows";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const height = (box: Box) => box[3] - box[1];
const rules = (failures: SourceRowFailure[]) =>
  [...new Set(failures.map((failure) => failure.rule))].sort();
const capture = (page: Page) =>
  page.evaluate(`(${SOURCE_ROW_PROBE})(document)`) as Promise<
    CapturedSourcePage[]
  >;
/** Heading and prompt heights of every problem of a measurement document, as they lie. */
const NATURAL_PROBE = String.raw`(function () {
  var mm = 25.4 / 96, out = {}, blocks = document.querySelectorAll("[data-measure-id]");
  for (var i = 0; i < blocks.length; i++) {
    var head = blocks[i].querySelector(".tb-problem-head");
    var prompt = blocks[i].querySelector(".tb-problem-question > .tb-prose");
    if (head && prompt)
      out[blocks[i].getAttribute("data-measure-id")] = {
        head: head.getBoundingClientRect().height * mm,
        prompt: prompt.getBoundingClientRect().height * mm,
        main: blocks[i].querySelector(".tb-problem-main").getBoundingClientRect().height * mm,
        styled: !!(head.getAttribute("style") || prompt.getAttribute("style"))
      };
  }
  return out;
})()`;

describe.skipIf(!run)("native source question rows in real Chromium", () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await launchExportBrowser();
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  }, 60_000);

  interface Rendered {
    result: TextbookChunkResult;
    pages: CapturedSourcePage[];
    /** What the renderer's own `measureRecoveryDom` call returned. */
    sizes: MeasuredSizes;
    /** The first document the renderer measured: nothing equalized yet. */
    firstDocument: string;
    evaluatorSources: string[];
    evaluatorErrors: string[];
    blocked: string[];
  }
  /** One production chunk, watched; the delivered HTML is then read back script-free. */
  async function render(
    exchange: TextbookExchange,
    sectionIndices: number[],
    variant: "student" | "answers" = "student",
    wrap: (inner: Browser) => Browser = (inner) => inner,
    firstPhysicalPageIndex = SOURCE_PAGE,
  ): Promise<Rendered> {
    const log: WitnessedPage[] = [];
    const result = await renderTextbookChunk({
      exchange,
      readAsset: noAssets,
      officialOrigin: SYNTHETIC_ORIGIN,
      sectionIndices,
      firstPhysicalPageIndex,
      variant,
      mode: "draft",
      browser: witnessBrowser(wrap(browser), log),
    });
    const evaluations = log.flatMap((page) => page.evaluations);
    const measured = evaluations.find((call) =>
      call.source.includes("sourceQuestionGroups"),
    )?.value as { sourceQuestionSizesMm?: MeasuredSizes } | undefined;
    const { page, blocked } = await openArtifact(browser, result.html);
    try {
      return {
        result,
        pages: await capture(page),
        sizes: measured?.sourceQuestionSizesMm ?? {},
        firstDocument: log[0].contents[0],
        evaluatorSources: evaluations.map((call) => call.source),
        evaluatorErrors: evaluations.flatMap((call) =>
          call.error ? [call.error] : [],
        ),
        blocked,
      };
    } finally {
      await page.close();
    }
  }
  /** The preview document's address: a secure origin, as the studio page has. */
  const PREVIEW_URL = "https://textbook.invalid/__source_rows_preview__.html";
  /** A page that is given the bundle's fonts and styles and nothing else. */
  async function bundledPage(
    scripts: boolean,
    previewHtml?: string,
  ): Promise<{
    page: Page;
    blocked: string[];
    bundle: Awaited<ReturnType<typeof loadTextbookLocalBundle>>;
  }> {
    const bundle = await loadTextbookLocalBundle();
    const page = await browser.newPage();
    const blocked: string[] = [];
    await page.setJavaScriptEnabled(scripts);
    await page.setRequestInterception(true);
    await page.emulateMediaType("print");
    page.on("request", (request) => {
      const resource = bundle.resources.get(request.url());
      if (resource)
        void request.respond({
          status: 200,
          contentType: resource.mimeType,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: Buffer.from(resource.bytes),
        });
      else if (previewHtml !== undefined && request.url() === PREVIEW_URL)
        void request.respond({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: previewHtml,
        });
      else if (request.url().startsWith("data:")) void request.continue();
      else {
        blocked.push(request.url());
        void request.abort();
      }
    });
    return { page, blocked, bundle };
  }
  const fontsLoaded =
    "document.fonts.load('400 13px TextbookPretendard', '가나다').then(function () { return document.fonts.load('700 13px TextbookPretendard', '가나다'); }).then(function () { return document.fonts.ready; }).then(function () { return document.fonts.check('400 13px TextbookPretendard', '가나다'); })";
  async function naturalSizes(
    html: string,
  ): Promise<
    Record<
      string,
      { head: number; prompt: number; main: number; styled: boolean }
    >
  > {
    const { page } = await bundledPage(false);
    try {
      await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
      expect(await page.evaluate(fontsLoaded)).toBe(true);
      return (await page.evaluate(NATURAL_PROBE)) as Record<
        string,
        { head: number; prompt: number; main: number; styled: boolean }
      >;
    } finally {
      await page.close();
    }
  }
  const standardExchange = () =>
    textbookExchangeSchema.parse(sourceRowsExchange(standardSections()));
  const onPage = (pages: CapturedSourcePage[], id: string) => {
    const found = pages
      .flatMap((page) => page.problems)
      .find((problem) => problem.blockId === id);
    if (!found) throw new Error(`No problem ${id} on the pages`);
    return found;
  };

  it("final render: native chapter connection cards clear readiness and retain converted label fonts", async () => {
    const exchange = sourceRowsExchange(
      [
        {
          sectionKey: "chapter-route",
          title: "합성 단원 안내",
          kind: "unitSpreadRight",
          activity: "unitIntro",
          blocks: [],
        },
      ],
      9,
    );
    const text = (rawText: string): TextbookSourceFragment => ({
      tag: "span",
      rawText,
    });
    const small = (rawText: string): TextbookSourceFragment => ({
      tag: "span",
      attributes: { className: "tb-source-small" },
      children: [text(rawText)],
    });
    const section = (
      className: string,
      children: TextbookSourceFragment[],
    ): TextbookSourceFragment => ({
      tag: "section",
      attributes: { className },
      children,
    });
    exchange.units[0].sections[0].blocks.push({
      blockId: "chapter-route-body",
      kind: "text",
      markdown: "합성 단원 안내",
      semantic: {
        activity: "unitIntro",
        source: {
          unit: "U01",
          page: 9,
          kind: "unitSpreadRight",
          path: "synthetic/chapter-route",
        },
        node: {
          kind: "fragments",
          fragments: [
            section("chapter-goals", [
              { tag: "h2", children: [text("합성 목표")] },
            ]),
            section("chapter-roadmap", [
              { tag: "h2", children: [text("합성 개념"), small("합성 안내")] },
              {
                tag: "div",
                attributes: { className: "chapter-topics" },
                children: [
                  {
                    tag: "div",
                    children: [
                      small("01"),
                      { tag: "strong", children: [text("합성 개념 이름")] },
                      {
                        tag: "span",
                        children: [
                          text("014"),
                          { tag: "em", children: [text("쪽")] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ]),
            section("chapter-connections", [
              { tag: "h2", children: [text("합성 연결")] },
              {
                tag: "div",
                attributes: { className: "connection-columns" },
                children: Array.from(
                  { length: 3 },
                  (_, index): TextbookSourceFragment => ({
                    tag: "div",
                    attributes: { className: index === 1 ? "current" : "" },
                    children: [
                      small(`합성 카드 ${index}`),
                      ...Array.from(
                        { length: 3 },
                        (): TextbookSourceFragment => ({
                          tag: "p",
                          children: [text("합성 내용")],
                        }),
                      ),
                    ],
                  }),
                ),
              },
            ]),
            section("chapter-readiness", [
              { tag: "h2", children: [text("합성 확인")] },
              { tag: "p", children: [text("합성 확인 항목")] },
            ]),
          ],
        },
      },
    });
    const before = canonicalJson(exchange);
    const rendered = await render(
      exchange,
      [0],
      "student",
      (inner) => inner,
      9,
    );
    const { page } = await openArtifact(browser, rendered.result.html);
    try {
      const actual = await page.evaluate(() => {
        const mm = 25.4 / 96;
        const root = document.querySelector(
          '.tb-source-fragments[data-source-kind="unitSpreadRight"]',
        )!;
        const cards = Array.from(
          root.querySelectorAll(".connection-columns>div"),
        );
        const font = (selector: string) =>
          parseFloat(getComputedStyle(root.querySelector(selector)!).fontSize) *
          0.75;
        return {
          cards: cards.map((card) => ({
            x: card.getBoundingClientRect().x * mm,
            top: card.getBoundingClientRect().top * mm,
            bottom: card.getBoundingClientRect().bottom * mm,
            background: getComputedStyle(card).backgroundColor,
          })),
          readinessTop:
            root.querySelector(".chapter-readiness")!.getBoundingClientRect()
              .top * mm,
          headingFont: font(".chapter-goals h2"),
          smallFont: font(".chapter-topics .tb-source-small"),
          titleFont: font(".chapter-topics strong>span"),
          pageFont: font(".chapter-topics>div>span:not(.tb-source-small)>span"),
          suffixFont: font(".chapter-topics em>span"),
          headerBorderPt:
            parseFloat(
              getComputedStyle(document.querySelector(".tb-header")!)
                .borderBottomWidth,
            ) * 0.75,
          footerDirection: getComputedStyle(
            document.querySelector(".tb-footer-brand")!,
          ).flexDirection,
        };
      });
      expect(actual.cards).toHaveLength(3);
      expect(new Set(actual.cards.map((card) => card.top))).toHaveLength(1);
      expect(actual.cards[0].x).toBeLessThan(actual.cards[1].x);
      expect(actual.cards[1].x).toBeLessThan(actual.cards[2].x);
      expect(Math.max(...actual.cards.map((card) => card.bottom))).toBeLessThan(
        actual.readinessTop,
      );
      expect(actual.cards.map((card) => card.background)).toEqual([
        "rgb(229, 238, 227)",
        "rgb(34, 109, 84)",
        "rgb(229, 238, 227)",
      ]);
      expect(actual.headingFont).toBeCloseTo(9, 3);
      expect(actual.smallFont).toBeCloseTo(9, 3);
      expect(actual.titleFont).toBeCloseTo(10.2, 3);
      expect(actual.pageFont).toBeCloseTo(12, 3);
      expect(actual.suffixFont).toBeCloseTo(6, 3);
      expect(actual.headerBorderPt).toBeGreaterThan(0);
      expect(actual.footerDirection).toBe("row-reverse");
      expect(canonicalJson(exchange)).toBe(before);
    } finally {
      await page.close();
    }
  }, 120_000);

  it("final render: native mini-concept headings retain inherited line height before the question grid", async () => {
    const exchange = sourceRowsExchange(
      [
        {
          sectionKey: "mini",
          title: "합성 기본 확인",
          kind: "basic",
          activity: "basicCheck",
          blocks: [{ id: "mini-question", content: SHORT_PROMPT }],
        },
      ],
      23,
    );
    exchange.units[0].sections[0].blocks.unshift({
      blockId: "mini-intro",
      kind: "text",
      markdown: "합성 개념 안내",
      semantic: {
        activity: "basicCheck",
        source: {
          unit: "U01",
          page: 23,
          kind: "basic",
          path: "synthetic/mini-intro",
        },
        node: {
          kind: "fragments",
          fragments: [
            {
              tag: "div",
              attributes: { className: "mini-concepts" },
              children: ["합성 개념 하나", "합성 개념 둘"].map(
                (rawText): TextbookSourceFragment => ({
                  tag: "div",
                  children: [
                    { tag: "strong", children: [{ tag: "span", rawText }] },
                    { tag: "p", rawText: "합성 개념 설명입니다." },
                  ],
                }),
              ),
            },
          ],
        },
      },
    });
    const rendered = await render(
      exchange,
      [0],
      "student",
      (inner) => inner,
      23,
    );
    const { page } = await openArtifact(browser, rendered.result.html);
    try {
      const headings = await page.evaluate(() =>
        Array.from(document.querySelectorAll(".mini-concepts strong")).map(
          (element) => ({
            fontPt: parseFloat(getComputedStyle(element).fontSize) * 0.75,
            linePx: parseFloat(getComputedStyle(element).lineHeight),
          }),
        ),
      );
      expect(headings).toHaveLength(2);
      for (const heading of headings) {
        expect(heading.fontPt).toBeCloseTo(8.2, 3);
        expect(heading.linePx).toBeCloseTo(19.68, 2);
      }
    } finally {
      await page.close();
    }
  }, 120_000);

  it("final render: canonical repair math and clinic headings retain their native sizes", async () => {
    const exchange = sourceRowsExchange(
      [
        {
          sectionKey: "repair",
          title: "합성 오류 점검",
          kind: "clinic",
          activity: "errorCheck",
          blocks: [{ id: "clinic-1", content: SHORT_PROMPT }],
        },
      ],
      30,
    );
    exchange.units[0].sections[0].blocks.unshift({
      blockId: "repair-text",
      kind: "text",
      markdown: "합성 오류 점검",
      semantic: {
        activity: "errorCheck",
        source: {
          unit: "U01",
          page: 30,
          kind: "clinic",
          path: "synthetic/repair",
        },
        node: {
          kind: "fragments",
          fragments: [
            {
              tag: "div",
              attributes: { className: "repair-example" },
              children: ["합성 표현 하나", "합성 표현 둘"].map((label) => ({
                tag: "div",
                children: [
                  {
                    tag: "span",
                    attributes: { className: "tb-source-small" },
                    rawText: label,
                  },
                  { tag: "span", rawText: "$0.\\dot2 3\\dot4$" },
                  { tag: "p", rawText: "합성 설명 문장입니다." },
                ],
              })),
            },
          ],
        },
      },
    });
    const rendered = await render(
      exchange,
      [0],
      "student",
      (inner) => inner,
      30,
    );
    const { page } = await openArtifact(browser, rendered.result.html);
    try {
      const boxes = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(".repair-example [data-textbook-math]"),
        ).map((element) => {
          const css = getComputedStyle(element);
          return {
            fontPt: parseFloat(css.fontSize) * 0.75,
            linePx: parseFloat(css.lineHeight),
            display: css.display,
            heightMm: (element.getBoundingClientRect().height * 25.4) / 96,
          };
        }),
      );
      expect(boxes).toHaveLength(2);
      for (const box of boxes) {
        expect(box.fontPt).toBeCloseTo(17, 3);
        expect(box.linePx).toBeCloseTo(37.4, 2);
        expect(box.display).toBe("inline-block");
        expect(box.heightMm).toBeCloseTo(9.897, 1);
      }
      const headingGaps = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            '.tb-source-problem[data-source-kind="clinic"] .tb-problem-head',
          ),
        ).map(
          (element) =>
            (parseFloat(getComputedStyle(element).marginBottom) * 25.4) / 96,
        ),
      );
      expect(headingGaps).toHaveLength(1);
      expect(headingGaps[0]).toBeCloseTo(1.2, 3);
    } finally {
      await page.close();
    }
  }, 120_000);

  it("final render: native four-question spread prompts reserve the same height before writing allocation", async () => {
    const exchange = sourceRowsExchange(
      [0, 1].map((side) => ({
        sectionKey: `native-spread-${side}`,
        title: "합성 단원 마무리",
        kind: "exercise",
        activity: "assessment" as const,
        blocks: Array.from({ length: 4 }, (_, index) => ({
          id: `native-${side}-${index}`,
          content: side === 1 && index === 2 ? LONG_PROMPT : SHORT_PROMPT,
          workLines: 2,
        })),
      })),
      42,
    );
    exchange.units[0].sections.forEach((section, side) => {
      section.startPolicy = "even-left";
      section.blocks.forEach((block) => {
        block.semantic!.source!.page = 42 + side;
        block.semantic!.source!.sectionName = "단원 마무리";
      });
      if (side === 1) section.startPolicy = "continue";
    });
    const before = canonicalJson(exchange);
    const rendered = await render(
      exchange,
      [0, 1],
      "student",
      (inner) => inner,
      42,
    );
    const ids = [
      "q-native-0-2",
      "q-native-0-3",
      "q-native-1-2",
      "q-native-1-3",
    ];
    const heights = ids.map((id) =>
      height(onPage(rendered.pages, id).promptBoxMm),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.03);
    expect(heights[0]).toBeGreaterThan(10);
    expect(rendered.evaluatorErrors).toEqual([]);
    expect(
      rendered.result.issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
    expect(canonicalJson(exchange)).toBe(before);
  }, 180_000);

  it("final render: the longest heading and the longest prompt set both columns, and the work areas start level", async () => {
    const exchange = standardExchange();
    const before = canonicalJson(exchange);
    const rendered = await render(exchange, [0, 1]);

    // The renderer measured the two planned rows and nothing else.
    expect(Object.keys(rendered.sizes).sort()).toEqual([
      "q-a1",
      "q-a2",
      "q-b1",
      "q-b2",
    ]);
    // Independently: the same first document, opened again, before anything is equalized.
    const natural = await naturalSizes(rendered.firstDocument);
    for (const id of ["q-a1", "q-a2", "q-b1", "q-b2"])
      expect(natural[id].styled).toBe(false);
    // a1 carries the long heading, a2 the long prompt: each column decides one of the two.
    expect(natural["q-a1"].head).toBeGreaterThan(natural["q-a2"].head + 2);
    expect(natural["q-a2"].prompt).toBeGreaterThan(natural["q-a1"].prompt + 5);
    for (const [left, right] of [
      ["q-a1", "q-a2"],
      ["q-b1", "q-b2"],
    ]) {
      const head = Math.max(natural[left].head, natural[right].head);
      const prompt = Math.max(natural[left].prompt, natural[right].prompt);
      for (const id of [left, right]) {
        expect(rendered.sizes[id].head).toBeCloseTo(head, 3);
        expect(rendered.sizes[id].prompt).toBeCloseTo(prompt, 3);
      }
    }

    // The delivered pages: same physical heights, level work areas, untouched neighbours.
    expect(
      judgeSourceRows(rendered.pages, standardExpectation(rendered.sizes)),
    ).toEqual([]);
    for (const [left, right] of [
      ["q-a1", "q-a2"],
      ["q-b1", "q-b2"],
    ]) {
      const [a, b] = [left, right].map((id) => onPage(rendered.pages, id));
      expect(height(a.headBoxMm)).toBeCloseTo(height(b.headBoxMm), 1);
      expect(height(a.promptBoxMm)).toBeCloseTo(height(b.promptBoxMm), 1);
      expect(a.workTopMm).not.toBeNull();
      expect(a.workTopMm).toBeCloseTo(b.workTopMm!, 1);
      expect(a.blockBoxMm[1]).toBeCloseTo(b.blockBoxMm[1], 1);
    }
    // Saved problems sit side by side too, and keep their own, different prompt heights.
    const [shortSaved, longSaved] = ["q-s1", "q-s2"].map((id) =>
      onPage(rendered.pages, id),
    );
    expect(shortSaved.source).toBe(false);
    expect(height(longSaved.promptBoxMm)).toBeGreaterThan(
      height(shortSaved.promptBoxMm) + 5,
    );

    expect(
      rendered.result.issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
    expect(rendered.blocked).toEqual([]);
    expect(rendered.evaluatorErrors).toEqual([]);
    expect(
      rendered.evaluatorSources.filter((source) => /\b__name\b/.test(source)),
    ).toEqual([]);
    for (const page of rendered.pages) {
      expect(page.fontReady).toBe(true);
      expect(page.paperMm[0]).toBeCloseTo(210, 0);
      expect(page.paperMm[1]).toBeCloseTo(297, 0);
    }
    expect(rendered.pages).toHaveLength(rendered.result.pages.length);
    // The manuscript is exactly what it was.
    expect(canonicalJson(exchange)).toBe(before);
  }, 180_000);

  it("final render: the fixed page note stays at 270–278mm, outside the content box", async () => {
    const rendered = await render(standardExchange(), [0]);
    const page = rendered.pages[0];
    expect(page.physicalPageIndex).toBe(SOURCE_PAGE);
    expect(page.footerCount).toBe(1);
    const footer = page.footer!;
    expect(footer.position).toBe("absolute");
    expect(footer.parentIsPaper).toBe(true);
    expect(footer.insideContent).toBe(false);
    expect(footer.boxMm[1]).toBeCloseTo(270, 1);
    expect(footer.boxMm[3]).toBeCloseTo(278, 1);
    // Six problems above it: the content box ends well before the note begins.
    expect(page.problems).toHaveLength(6);
    expect(page.contentBoxMm![3]).toBeLessThan(270);
    for (const problem of page.problems)
      expect(problem.blockBoxMm[3]).toBeLessThanOrEqual(270);
    // The note takes no room in the flow: without it the same blocks lie in the same places.
    const plain = standardSections();
    delete plain[0].footer;
    const without = await render(
      textbookExchangeSchema.parse(sourceRowsExchange(plain)),
      [0],
    );
    expect(without.pages[0].footerCount).toBe(0);
    expect(
      without.pages[0].problems.map((problem) => problem.blockBoxMm),
    ).toEqual(page.problems.map((problem) => problem.blockBoxMm));
  }, 180_000);

  it("final render: the number's inner raw-text span prints with the 12.5pt font of its strong element", async () => {
    const rendered = await render(standardExchange(), [0]);
    const numbered = rendered.pages[0].problems.filter(
      (problem) => problem.numberFont,
    );
    // Five authored headings carry the native strong > span number; b2 has the default heading.
    expect(numbered.map((problem) => problem.blockId)).toEqual([
      "q-a1",
      "q-a2",
      "q-b1",
      "q-c1",
      "q-w1",
    ]);
    for (const problem of numbered) {
      const font = problem.numberFont!;
      expect(font.strongPx).toBeCloseTo((12.5 * 96) / 72, 2);
      expect(font.spanPx).toBe(font.strongPx);
      expect(font.spanWeight).toBe(font.strongWeight);
      expect(font.spanSpacing).toBe(font.strongSpacing);
      expect(problem.numberLines).toBe(1);
      expect(problem.tagLines).toBe(1);
    }
  }, 180_000);

  it("final render: a label long enough to wrap leaves the question number and the tag on one line", async () => {
    const rendered = await render(
      textbookExchangeSchema.parse(
        sourceRowsExchange([
          {
            sectionKey: "sc",
            title: "합성",
            kind: "scriptcheck",
            activity: "dialogueCheck",
            blocks: [
              { id: "a1", content: SHORT_PROMPT, header: WRAPPING_HEADER },
              { id: "a2", content: LONG_PROMPT, header: SHORT_HEADER },
            ],
          },
        ]),
      ),
      [0],
    );
    const [wrapped, short] = ["q-a1", "q-a2"].map((id) =>
      onPage(rendered.pages, id),
    );
    // The label does wrap: this heading is taller than one line, and both columns follow it.
    expect(height(wrapped.headBoxMm)).toBeGreaterThan(8);
    expect(height(short.headBoxMm)).toBeCloseTo(height(wrapped.headBoxMm), 1);
    expect(short.numberLines).toBe(1);
    expect({
      number: wrapped.numberLines,
      tag: wrapped.tagLines,
    }).toEqual({ number: 1, tag: 1 });
  }, 180_000);

  it("final render: a QR beside one prompt reserves the whole prompt row on both sides, and the work areas start level", async () => {
    const pair = (qrLeft: boolean, qrRight: boolean) =>
      textbookExchangeSchema.parse(
        sourceRowsExchange([
          {
            sectionKey: "sc",
            title: "합성",
            kind: "scriptcheck",
            activity: "dialogueCheck",
            blocks: [
              {
                id: "a1",
                content: SHORT_PROMPT,
                header: SHORT_HEADER,
                qr: qrLeft,
              },
              {
                id: "a2",
                content: LONG_PROMPT,
                header: SHORT_HEADER,
                qr: qrRight,
              },
            ],
          },
        ]),
      );
    const expectation = (sizes: MeasuredSizes): SourceRowExpectation => ({
      pairs: [
        { ids: ["q-a1", "q-a2"], alignPrompt: true, sizes: sizes["q-a1"] },
      ],
      untouched: [],
      headers: {},
      footers: {},
    });
    for (const [qrLeft, qrRight] of [
      [true, false],
      [false, true],
      [true, true],
    ]) {
      const rendered = await render(pair(qrLeft, qrRight), [0]);
      const natural = await naturalSizes(rendered.firstDocument);
      const [left, right] = ["q-a1", "q-a2"].map((id) =>
        onPage(rendered.pages, id),
      );
      expect([left.hasQr, right.hasQr]).toEqual([qrLeft, qrRight]);
      // The QR is taller than the short prose beside it: that side's row is the taller one.
      if (qrLeft)
        expect(natural["q-a1"].main).toBeGreaterThan(
          natural["q-a1"].prompt + 5,
        );
      const main = Math.max(natural["q-a1"].main, natural["q-a2"].main);
      for (const id of ["q-a1", "q-a2"])
        expect(rendered.sizes[id].main!).toBeCloseTo(main, 3);
      expect(
        judgeSourceRows(rendered.pages, expectation(rendered.sizes)),
      ).toEqual([]);
      expect(left.workTopMm).toBeCloseTo(right.workTopMm!, 1);
      expect(height(left.mainBoxMm)).toBeCloseTo(height(right.mainBoxMm), 1);
      expect(rendered.result.qrChecks).toHaveLength(
        Number(qrLeft) + Number(qrRight),
      );
    }
    // Without any QR the row is not reserved at all.
    const plain = await render(pair(false, false), [0]);
    expect(plain.sizes["q-a1"].main).toBeUndefined();
    expect(onPage(plain.pages, "q-a1").mainStyleMinHeight).toBe("");
    expect(judgeSourceRows(plain.pages, expectation(plain.sizes))).toEqual([]);
  }, 300_000);

  it("final render: a linked heading that does not fit its fixed slot is refused, not printed over the prompt", async () => {
    const sections = linkedGroupSections();
    const entry = sections[0].blocks[0];
    if (!("group" in entry)) throw new Error("A linked group is expected");
    entry.group.example.header = WRAPPING_HEADER;
    await expect(
      render(textbookExchangeSchema.parse(sourceRowsExchange(sections)), [0]),
    ).rejects.toThrow("SOURCE_HEADER_OVERFLOW");
  }, 180_000);

  it("final render: a linked source group aligns its headings only", async () => {
    const rendered = await render(
      textbookExchangeSchema.parse(sourceRowsExchange(linkedGroupSections())),
      [0],
    );
    expect(Object.keys(rendered.sizes).sort()).toEqual(["q-e1", "q-f1"]);
    for (const id of ["q-e1", "q-f1"])
      expect(rendered.sizes[id].prompt).toBeUndefined();
    expect(
      judgeSourceRows(rendered.pages, linkedGroupExpectation(rendered.sizes)),
    ).toEqual([]);
    const [example, confirm, second] = ["q-e1", "q-f1", "q-f2"].map((id) =>
      onPage(rendered.pages, id),
    );
    expect(example.role).toBe("example");
    expect(confirm.role).toBe("confirm");
    expect(example.headBoxMm[1]).toBeCloseTo(confirm.headBoxMm[1], 1);
    expect(height(example.headBoxMm)).toBeCloseTo(height(confirm.headBoxMm), 1);
    // The prompts keep their own heights: the confirmation's long prompt is the taller one.
    expect(height(confirm.promptBoxMm)).toBeGreaterThan(
      height(example.promptBoxMm) + 2,
    );
    expect(second.headStyleHeight).toBe("");
    expect(rendered.evaluatorErrors).toEqual([]);
  }, 180_000);

  it.each([
    ["scriptcheck", "dialogueCheck", 1],
    ["basic", "basicCheck", 2],
    ["exercise", "practice", 5],
    // Native R22 has adjoining rows; sourceDrillLayout also pins the 9mm gutter.
    ["drill", "practice", 0],
    ["practice", "practice", 4],
    ["reasoning", "reasoning", 4],
    ["concept1", "concepts", 4],
  ] as const)(
    "final render: %s rows are equalized and nothing is clipped at the current row gap",
    async (kind, activity, gapMm) => {
      const rendered = await render(
        textbookExchangeSchema.parse(
          sourceRowsExchange(kindSections(kind, activity)),
        ),
        [0],
      );
      expect(
        judgeSourceRows(rendered.pages, kindExpectation(rendered.sizes)),
      ).toEqual([]);
      expect(rendered.pages).toHaveLength(1);
      // Two rows on the page: the gap between them is the one this kind has today.
      const gaps = rowGapsMm(rendered.pages[0]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0]).toBeCloseTo(gapMm, 1);
      for (const problem of rendered.pages[0].problems) {
        expect(problem.inGrid).toBe(true);
        // The section fills its block and does not leave it.
        expect(problem.sectionBoxMm[3]).toBeLessThanOrEqual(
          problem.blockBoxMm[3] + 0.3,
        );
      }
    },
    180_000,
  );

  it("final render: the answers variant keeps the same equalized headings and prompts", async () => {
    const student = await render(standardExchange(), [0]);
    const answers = await render(standardExchange(), [0], "answers");
    const expectation: SourceRowExpectation = {
      ...standardExpectation(answers.sizes),
      untouched: ["q-c1", "q-w1"],
    };
    expect(judgeSourceRows(answers.pages, expectation)).toEqual([]);
    for (const id of ["q-a1", "q-a2", "q-b1", "q-b2"]) {
      expect(answers.sizes[id].head).toBeCloseTo(student.sizes[id].head, 2);
      expect(answers.sizes[id].prompt!).toBeCloseTo(
        student.sizes[id].prompt!,
        2,
      );
      // No ruled work area in the answer book.
      expect(onPage(answers.pages, id).workTopMm).toBeNull();
    }
  }, 180_000);

  it("preview: the real measureTextbookPreview equalizes the same rows to the same sizes", async () => {
    const exchange = standardExchange();
    exchange.config.print.firstPhysicalPageIndex = SOURCE_PAGE;
    const before = canonicalJson(exchange);
    const server = await render(standardExchange(), [0, 1]);

    // The browser module as the studio loads it, bundled without any transpiler helper.
    const entry = path
      .join(process.cwd(), "__source_rows_preview_entry__.ts")
      .replaceAll("\\", "/");
    const output = await build({
      configFile: false,
      logLevel: "error",
      root: process.cwd(),
      resolve: { tsconfigPaths: true },
      plugins: [
        {
          name: "source-rows-preview-entry",
          enforce: "pre",
          resolveId: (id) =>
            id
              .replaceAll("\\", "/")
              .endsWith("__source_rows_preview_entry__.ts")
              ? entry
              : null,
          load: (id) =>
            id.replaceAll("\\", "/") === entry
              ? 'export { measureTextbookPreview } from "@/lib/textbook/render/browser"; export { renderPageHtml, TEXTBOOK_CSS } from "@/lib/textbook/render/html";'
              : null,
        },
      ],
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ["iife"], name: "TextbookPreviewProbe" },
      },
    });
    const bundles = Array.isArray(output) ? output : [output];
    const code = (bundles[0] as { output: Array<{ code?: string }> }).output[0]
      .code!;
    expect(code).toContain("measureTextbookPreview");
    expect(/\b__name\b/.test(code)).toBe(false);

    const model = createTextbookRenderModel(exchange, "student");
    const styles = await loadTextbookLocalBundle();
    const { page, blocked, bundle } = await bundledPage(
      true,
      `<!doctype html><html><head><meta charset="utf-8"><style>${styles.fontCss}${styles.katexCss}</style></head><body><div id="pages"></div></body></html>`,
    );
    try {
      await page.goto(PREVIEW_URL, { waitUntil: "load" });
      await page.addScriptTag({ content: code });
      const outcome = (await page.evaluate(
        `(async function (model, fontCss, katexCss, png) {
          var P = window.TextbookPreviewProbe;
          var resources = {
            assetUrl: function () { throw new Error("The synthetic pages hold no stored asset"); },
            qrDataUrl: function () { return png; },
            editorialAssetUrl: function (name) { return "https://textbook.invalid/editorial/" + name; }
          };
          var layout = await P.measureTextbookPreview(model, resources, { fontCss: fontCss, katexCss: katexCss });
          var style = document.createElement("style");
          style.textContent = P.TEXTBOOK_CSS;
          document.head.appendChild(style);
          document.getElementById("pages").innerHTML = layout.pages.map(function (one) { return P.renderPageHtml(one, model, resources); }).join("");
          var sizes = {};
          model.sections.forEach(function (section) {
            section.blocks.forEach(function (block) {
              if (block.sourceQuestionHeadHeightMm !== undefined)
                sizes[block.id] = { head: block.sourceQuestionHeadHeightMm, prompt: block.sourceQuestionPromptMinHeightMm };
            });
          });
          return {
            pages: layout.pages.map(function (one) { return one.physicalPageIndex; }),
            errors: layout.issues.filter(function (issue) { return issue.severity === "error"; }).map(function (issue) { return issue.code; }),
            sizes: sizes,
            hostsLeft: document.querySelectorAll("[data-recovery-measure-host]").length
          };
        })(${JSON.stringify(model)}, ${JSON.stringify(bundle.fontCss)}, ${JSON.stringify(bundle.katexCss)}, ${JSON.stringify(PNG)})`,
      )) as {
        pages: number[];
        errors: string[];
        sizes: MeasuredSizes;
        hostsLeft: number;
      };
      expect(outcome.errors).toEqual([]);
      expect(outcome.pages[0]).toBe(SOURCE_PAGE);
      // The measuring host is removed: nothing of it stays in the studio page.
      expect(outcome.hostsLeft).toBe(0);
      expect(await page.evaluate(fontsLoaded)).toBe(true);
      // Exactly the planned rows received a size.
      expect(Object.keys(outcome.sizes).sort()).toEqual(
        sourceQuestionRowPlan(model)
          .flatMap((group) => group.ids)
          .sort(),
      );
      const pages = await capture(page);
      expect(
        judgeSourceRows(pages, standardExpectation(outcome.sizes)),
      ).toEqual([]);
      // Preview and final render agree on every measured size and on the printed boxes.
      for (const id of ["q-a1", "q-a2", "q-b1", "q-b2"]) {
        expect(outcome.sizes[id].head).toBeCloseTo(server.sizes[id].head, 2);
        expect(outcome.sizes[id].prompt!).toBeCloseTo(
          server.sizes[id].prompt!,
          2,
        );
        const [previewed, printed] = [pages, server.pages].map((set) =>
          onPage(set, id),
        );
        expect(height(previewed.headBoxMm)).toBeCloseTo(
          height(printed.headBoxMm),
          1,
        );
        expect(height(previewed.promptBoxMm)).toBeCloseTo(
          height(printed.promptBoxMm),
          1,
        );
        expect(previewed.workTopMm! - previewed.blockBoxMm[1]).toBeCloseTo(
          printed.workTopMm! - printed.blockBoxMm[1],
          1,
        );
      }
      // The browser asks a navigated origin for its icon; the preview itself asks for nothing else.
      expect(blocked.filter((url) => !url.endsWith("/favicon.ico"))).toEqual(
        [],
      );
    } finally {
      await page.close();
    }
    expect(canonicalJson(exchange)).toBe(before);
  }, 240_000);

  describe("mutation controls: each must be reported as a failure", () => {
    /** The delivered page with one thing changed in it, judged like any other page. */
    async function mutated(
      rendered: Rendered,
      change: { script?: string; html?: (html: string) => string },
    ): Promise<string[]> {
      const html = change.html
        ? change.html(rendered.result.html)
        : rendered.result.html;
      if (change.html) expect(html).not.toBe(rendered.result.html);
      const { page } = await openArtifact(browser, html);
      try {
        if (change.script)
          expect(await page.evaluate(change.script)).toBe(true);
        return rules(
          judgeSourceRows(await capture(page), {
            ...standardExpectation(rendered.sizes),
            untouched: ["q-c1", "q-w1"],
          }),
        );
      } finally {
        await page.close();
      }
    }
    const head = `document.querySelector('[data-block-id="q-a1"] .tb-problem-head')`;
    const prompt = `document.querySelector('[data-block-id="q-a1"] .tb-problem-question > .tb-prose')`;
    const note = `document.querySelector('.tb-source-page-footer')`;

    it("in the delivered page: wrong heading height, wrong prompt height, dropped heading, note in the flow", async () => {
      const rendered = await render(standardExchange(), [0]);
      expect(await mutated(rendered, {})).toEqual([]);
      expect(
        await mutated(rendered, {
          script: `(function () { var h = ${head}; h.style.height = (parseFloat(h.style.height) + 2) + "mm"; return true; })()`,
        }),
        // The taller heading also pushes its problem 2mm out of the block reserved for it.
      ).toEqual(["no-clip", "pair-head-height", "work-top"]);
      expect(
        await mutated(rendered, {
          script: `(function () { ${prompt}.style.minHeight = ""; return true; })()`,
        }),
      ).toEqual(["pair-prompt-height", "work-top"]);
      expect(
        await mutated(rendered, {
          script: `(function () { ${head}.innerHTML = "<strong>001</strong>"; return true; })()`,
        }),
      ).toEqual(["header-kept"]);
      // The rule that lets the number's inner span inherit the strong's font, taken away.
      expect(
        await mutated(rendered, {
          html: (html) =>
            html.replace(
              ".tb-source-problem .tb-problem-head strong span{",
              ".tb-rule-removed-by-the-test{",
            ),
        }),
      ).toEqual(["head-number-font"]);
      // The note taken out of its fixed place, three ways.
      expect(
        await mutated(rendered, {
          script: `(function () { ${note}.style.position = "static"; return true; })()`,
        }),
      ).toEqual(["footer-fixed"]);
      expect(
        await mutated(rendered, {
          script: `(function () { document.querySelector(".tb-reference-content").appendChild(${note}); return true; })()`,
        }),
      ).toEqual(["footer-fixed"]);
      expect(
        await mutated(rendered, {
          html: (html) =>
            html.replace(
              ".tb-source-page-footer{position:absolute;top:270mm;",
              ".tb-source-page-footer{position:static;top:270mm;",
            ),
        }),
      ).toEqual(["footer-fixed"]);
    }, 240_000);

    it("in the pipeline: a measurement result tampered before the renderer applies it", async () => {
      /** Changes what the renderer's own measurement call returns, and nothing else. */
      const tampering =
        (tamper: (sizes: MeasuredSizes) => void) =>
        (inner: Browser): Browser =>
          new Proxy(inner, {
            get(target, key) {
              if (key === "newPage")
                return async () => {
                  const page = await target.newPage();
                  return new Proxy(page, {
                    get(real, name) {
                      if (name === "evaluate")
                        return async (fn: unknown, ...args: unknown[]) => {
                          const value = (await (
                            real.evaluate as (
                              ...all: unknown[]
                            ) => Promise<unknown>
                          )(fn, ...args)) as {
                            sourceQuestionSizesMm?: MeasuredSizes;
                          } | null;
                          if (
                            String(fn).includes("sourceQuestionGroups") &&
                            value?.sourceQuestionSizesMm
                          )
                            tamper(value.sourceQuestionSizesMm);
                          return value;
                        };
                      const member = Reflect.get(real, name, real) as unknown;
                      return typeof member === "function"
                        ? (member as (...all: unknown[]) => unknown).bind(real)
                        : member;
                    },
                  });
                };
              const member = Reflect.get(target, key, target) as unknown;
              return typeof member === "function"
                ? (member as (...all: unknown[]) => unknown).bind(target)
                : member;
            },
          });
      const honest = await render(standardExchange(), [0]);
      const judge = (rendered: Rendered) =>
        rules(
          judgeSourceRows(rendered.pages, {
            ...standardExpectation(honest.sizes),
            untouched: ["q-c1", "q-w1"],
          }),
        );
      expect(judge(honest)).toEqual([]);
      // One column's heading 3mm taller than its neighbour's.
      const tallHead = await render(
        standardExchange(),
        [0],
        "student",
        tampering((sizes) => {
          sizes["q-a1"] = { ...sizes["q-a1"], head: sizes["q-a1"].head + 3 };
        }),
      );
      expect(judge(tallHead)).toEqual(["pair-head-height", "work-top"]);
      // The short prompt's column never told to match the long one.
      const noPrompt = await render(
        standardExchange(),
        [0],
        "student",
        tampering((sizes) => {
          sizes["q-a1"] = { head: sizes["q-a1"].head };
        }),
      );
      expect(judge(noPrompt)).toEqual(["pair-prompt-height", "work-top"]);
      // A row dropped from the result altogether.
      const noRow = await render(
        standardExchange(),
        [0],
        "student",
        tampering((sizes) => {
          delete sizes["q-b1"];
          delete sizes["q-b2"];
        }),
      );
      expect(judge(noRow)).toEqual([
        "pair-head-height",
        "pair-prompt-height",
        "work-top",
      ]);
    }, 240_000);

    it("in the manuscript: an authored heading removed before rendering", async () => {
      const exchange = standardExchange();
      const block = exchange.units[0].sections[0].blocks[0];
      delete block.semantic!.sourceQuestionHeader;
      const rendered = await render(exchange, [0]);
      expect(
        rules(
          judgeSourceRows(rendered.pages, {
            ...standardExpectation(rendered.sizes),
            untouched: ["q-c1", "q-w1"],
          }),
        ),
      ).toEqual(["header-kept"]);
    }, 180_000);
  });

  it("under real tsx: the measurement function with the row loop serialises without __name and equalizes in Chromium", () => {
    const code = `
      // tsx hands a TypeScript module to evaluated code through its default export.
      const load = async (file) => { const m = await import(file); return m.default ?? m; };
      const { launchExportBrowser } = await load("./src/lib/export/pdfServer.ts");
      const { measureRecoveryDom } = await load("./src/lib/textbook/render/recoveryMeasurement.ts");
      const block = (id, head, prompt) =>
        '<div data-measure-id="' + id + '"><header class="tb-problem-head" style="display:block;height:' + head + 'mm"></header><div class="tb-problem-question"><div class="tb-prose" style="height:' + prompt + 'mm"></div></div></div>';
      const browser = await launchExportBrowser();
      try {
        const page = await browser.newPage();
        await page.setContent(block("a", 10, 6) + block("b", 5, 18));
        const value = await page.evaluate(measureRecoveryDom, {
          blocks: [], dialogueBodyTopMm: 63.42, dialogueBottomMm: 263, sourceMemoryRowKeys: [],
          sourceQuestionGroups: [{ ids: ["a", "b"], alignPrompt: true }],
        });
        const source = String(measureRecoveryDom);
        console.log("RESULT" + JSON.stringify({
          runtime: process.execArgv.join(" "),
          helper: /\\b__name\\b/.test(source),
          hasRowLoop: source.includes("sourceQuestionGroups"),
          sizes: value.sourceQuestionSizesMm,
        }));
      } finally {
        // Windows may still hold the profile lock: closing must not fail the proof.
        await browser.close().catch(() => {});
      }
    `;
    const out = execFileSync(
      process.execPath,
      [
        "--conditions=react-server",
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        code,
      ],
      { encoding: "utf8", timeout: 170_000 },
    );
    const report = JSON.parse(out.slice(out.indexOf("RESULT") + 6)) as {
      runtime: string;
      helper: boolean;
      hasRowLoop: boolean;
      sizes: MeasuredSizes;
    };
    expect(report.runtime).toContain("tsx");
    expect(report.hasRowLoop).toBe(true);
    expect(report.helper).toBe(false);
    // The taller heading (10mm) and the taller prompt (18mm) are given to both.
    for (const id of ["a", "b"]) {
      expect(report.sizes[id].head).toBeCloseTo(10, 1);
      expect(report.sizes[id].prompt!).toBeCloseTo(18, 1);
    }
  }, 180_000);
});
