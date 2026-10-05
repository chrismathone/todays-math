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
  it("preserves the original final dialogue note without adding a different generic note", () => {
    const exchange = textbookFixture(1, 0);
    const section = exchange.units[0].sections[0];
    section.templateKey = "reference-opening";
    section.startPolicy = "continue";
    section.blocks = [
      {
        blockId: "synthetic-source-board",
        kind: "text",
        markdown: "합성 판서",
        semantic: {
          activity: "dialogue",
          source: {
            unit: "U01",
            page: 13,
            kind: "opening",
            path: "synthetic",
            scriptIndex: 4,
          },
          sourceFooter: [
            {
              tag: "div",
              attributes: { className: "script-continue" },
              children: [
                { tag: "span", rawText: "단원을 여는 수업" },
                { tag: "strong", rawText: "4 / 4" },
                { tag: "span", rawText: "이어서 개념을 정리합니다." },
              ],
            },
          ],
          node: { kind: "board", title: "합성 판서", tex: "1=1" },
        },
      },
    ];
    const before = canonicalJson(exchange);
    const model = createTextbookRenderModel(exchange, "student");
    const layout = paginateTextbookSections(
      model.sections,
      model.sections.flatMap((s) =>
        s.blocks.map((block) => ({
          blockId: block.id,
          widthMm: blockWidthMm(model.config, block),
          heightMm: block.kind === "heading" ? 30 : 40,
        })),
      ),
      model.config,
      { firstPhysicalPageIndex: 13 },
    );
    const html = renderPageHtml(layout.pages[0], model, {
      assetUrl: () => "",
      qrDataUrl: () => "",
    });
    expect(html.match(/class="script-continue"/g)).toHaveLength(1);
    expect(html).toContain("이어서 개념을 정리합니다.");
    expect(html).not.toContain("수업에서 배운 내용을 설명해 보세요.");
    expect(html).not.toContain('class="tb-dialogue-page-note"');
    expect(canonicalJson(exchange)).toBe(before);
  });
  it("preserves a source question page's authored checkbar outside its question grid", () => {
    const exchange = textbookFixture(1, 2);
    const section = exchange.units[0].sections[0];
    section.templateKey = "reference-scriptcheck";
    section.startPolicy = "continue";
    const authoredFooter: TextbookSourceFragment[] = [
      {
        tag: "div",
        attributes: { className: "checkbar" },
        children: [
          { tag: "strong", rawText: "합성 질문 확인" },
          { tag: "span", rawText: "합성 표시" },
        ],
      },
    ];
    section.blocks.forEach((block, index) => {
      block.semantic = {
        activity: "dialogueCheck",
        source: {
          unit: "U01",
          page: 17,
          kind: "scriptcheck",
          path: `synthetic[${index}]`,
        },
        ...(index === 0 ? { sourceFooter: authoredFooter } : {}),
      };
    });
    const before = canonicalJson(exchange);
    const model = createTextbookRenderModel(exchange, "student");
    const layout = paginateTextbookSections(
      model.sections,
      model.sections.flatMap((s) =>
        s.blocks.map((block) => ({
          blockId: block.id,
          widthMm: blockWidthMm(model.config, block),
          heightMm: block.kind === "heading" ? 30 : 70,
        })),
      ),
      model.config,
      { firstPhysicalPageIndex: 17 },
    );
    const html = renderPageHtml(layout.pages[0], model, {
      assetUrl: () => "",
      qrDataUrl: () => "data:image/png;base64,AA==",
    });
    expect(html.match(/data-anchor="source-page-footer"/g)).toHaveLength(1);
    expect(html).toContain("합성 질문 확인");
    expect(html).toContain("tb-source-question-grid question-grid");
    expect(html.indexOf("tb-source-page-footer")).toBeGreaterThan(
      html.indexOf("tb-source-question-grid"),
    );
    expect(canonicalJson(exchange)).toBe(before);
  });
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
      textbookSemanticSchema.safeParse({ ...old, sourceQuestionHeader: [node] })
        .success,
    ).toBe(false);
    expect(
      textbookSemanticSchema.safeParse({ ...old, sourceFooter: footer })
        .success,
    ).toBe(true);
  });
});
