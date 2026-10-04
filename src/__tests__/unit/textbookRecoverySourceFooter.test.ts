// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  textbookSemanticSchema,
  type TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";
import { canonicalJson } from "@/lib/textbook/canonical";
import { textbookFixture } from "../helpers/textbookFixture";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import {
  blockWidthMm,
  paginateTextbookSections,
} from "@/lib/textbook/layout/paginate";
import { renderPageHtml } from "@/lib/textbook/render/html";
import { RECOVERY_FRAME_CSS } from "@/lib/textbook/render/recoveryFrameCss";

const footer: TextbookSourceFragment[] = [
  {
    tag: "div",
    attributes: { className: "study-footer" },
    children: [
      { tag: "span", rawText: "합성 학습 확인 안내" },
      { tag: "span", rawText: "확인 날짜: ______" },
    ],
  },
];

describe("original memory page footer", () => {
  it.each(["study", "keywords", "sentences"] as const)(
    "preserves one public fixed footer outside the %s content box",
    (phase) => {
      const exchange = textbookFixture(1, 0);
      const section = exchange.units[0].sections[0];
      section.templateKey = "reference-fullmaster";
      section.startPolicy = "continue";
      section.blocks = [
        {
          blockId: "synthetic-memory",
          kind: "concept-recall",
          phase,
          markdown: "합성 정의",
          showRepetitionChecks: phase === "study",
          semantic: {
            activity:
              phase === "study"
                ? "conceptStudy"
                : phase === "keywords"
                  ? "clozeRecall"
                  : "sentenceRecall",
            source: {
              unit: "U01",
              page: 18,
              kind: "fullmaster",
              path: "synthetic",
            },
            sourceFooter: footer,
            node: {
              kind: "concept",
              conceptId: "synthetic-concept",
              title: "합성 개념",
              rows: [
                { rowKey: "synthetic-row", label: "뜻", rawText: "합성 정의" },
              ],
            },
          },
        },
      ];
      const original = JSON.stringify(exchange);
      const model = createTextbookRenderModel(exchange, "student");
      const sizes = model.sections.flatMap((s) =>
        s.blocks.map((block) => ({
          blockId: block.id,
          widthMm: blockWidthMm(model.config, block),
          heightMm: block.kind === "heading" ? 20 : 75,
        })),
      );
      const layout = paginateTextbookSections(
        model.sections,
        sizes,
        model.config,
        { firstPhysicalPageIndex: 18 },
      );
      const html = renderPageHtml(layout.pages[0], model, {
        assetUrl: () => "",
        qrDataUrl: () => "",
      });
      expect(html.match(/data-anchor="source-study-footer"/g)).toHaveLength(1);
      expect(html).toContain("합성 학습 확인 안내");
      expect(html).toContain("확인 날짜: ______");
      expect(html.indexOf("tb-source-study-footer")).toBeGreaterThan(
        html.indexOf('class="content"'),
      );
      expect(RECOVERY_FRAME_CSS).toContain("top:270mm;height:8mm");
      expect(JSON.stringify(exchange)).toBe(original);
    },
  );

  it("keeps absent metadata absent and rejects an unbounded footer tree", () => {
    const old = { activity: "conceptStudy" as const };
    expect(canonicalJson(textbookSemanticSchema.parse(old))).toBe(
      canonicalJson(old),
    );
    let node: TextbookSourceFragment = { tag: "span", rawText: "합성" };
    for (let index = 0; index < 21; index++)
      node = { tag: "div", children: [node] };
    expect(
      textbookSemanticSchema.safeParse({ ...old, sourceFooter: [node] })
        .success,
    ).toBe(false);
    expect(
      textbookSemanticSchema.safeParse({ ...old, sourceFooter: footer })
        .success,
    ).toBe(true);
  });
});
