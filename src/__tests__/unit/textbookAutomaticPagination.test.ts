// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  splitTextbookMarkdown,
  splitRecallMarkdown,
  recallPieces,
  renderTextbookMarkdown,
} from "@/lib/textbook/render/markdown";
import { splitConceptBody } from "@/lib/textbook/render/conceptParts";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { planTextbookChunks } from "@/lib/textbook/render/server";
import {
  continuesTextbookSection,
  paginateTextbookSections,
  blockWidthMm,
} from "@/lib/textbook/layout/paginate";
import { textbookFixture } from "../helpers/textbookFixture";

describe("automatic manuscripts retain all content across pages and export chunks", () => {
  it("splits preparation lists without splitting formulas, code, tables or changing list numbers", () => {
    const source = `### 준비 학습\n\n${Array.from({ length: 30 }, (_, i) => `1. 개념 ${i + 1}`).join("\n")}\n\n$$\nx^2 + y^2\n$$\n\n\`\`\`text\n줄 하나\n\n줄 둘\n\`\`\`\n\n| 수 | 값 |\n|---|---|\n| 1 | 2 |`;
    const parts = splitTextbookMarkdown(source);
    const html = parts.map(renderTextbookMarkdown).join("");
    expect(html.match(/<li>/g)).toHaveLength(30);
    expect(html).toContain('<ol start="29">');
    expect(parts.find((p) => p.startsWith("$$"))).toBe("$$\nx^2 + y^2\n$$");
    expect(parts.find((p) => p.startsWith("```"))).toContain(
      "줄 하나\n\n줄 둘",
    );
    expect(html.match(/<table>/g)).toHaveLength(1);
    for (let i = 1; i <= 30; i++) expect(html).toContain(`개념 ${i}</p>`);
  });
  it("keeps thirty sentence prompts with their writing space and hides every answer including multiline answers", () => {
    const source = Array.from(
      { length: 30 },
      (_, i) => `**용어 ${i}**\n\n{{비공개 답 ${i}\n\n둘째 문단}}`,
    ).join("\n\n");
    const parts = splitRecallMarkdown(source);
    expect(parts).toHaveLength(30);
    for (const [i, part] of parts.entries()) {
      expect(part).toContain(`**용어 ${i}**`);
      const student = recallPieces(part, "sentences");
      expect(student.filter((p) => p.kind === "blank")).toHaveLength(1);
      expect(JSON.stringify(student)).not.toContain("비공개 답");
      expect(JSON.stringify(recallPieces(part, "study"))).toContain(
        `비공개 답 ${i}`,
      );
    }
  });
  it("preserves every concept field in the render projection without changing the frozen body", () => {
    const body = {
      goal: "학습 목표",
      prerequisites: ["준비 1", "준비 2"],
      definition: Array.from({ length: 30 }, (_, i) => `정의 ${i}`).join(
        "\n\n",
      ),
      conditions: "조건",
      examples: ["예 1", "예 2"],
      counterexamples: ["반례"],
      misconceptions: ["오개념"],
      explainPrompt: "설명 질문",
    };
    const original = JSON.stringify(body);
    const parts = splitConceptBody(body);
    for (const field of [
      "goal",
      "definition",
      "conditions",
      "explainPrompt",
    ] as const)
      expect(
        parts
          .map((p) => p[field])
          .filter(Boolean)
          .join("\n\n"),
      ).toBe(body[field]);
    for (const field of [
      "prerequisites",
      "examples",
      "counterexamples",
      "misconceptions",
    ] as const)
      expect(parts.flatMap((p) => p[field])).toEqual(body[field]);
    expect(JSON.stringify(body)).toBe(original);
  });
  it("chunks continued automatic chapters at rest and unit boundaries without breaking manual continuations", () => {
    const exchange = textbookFixture(16, 0);
    exchange.units[0].sections.forEach((s) => {
      s.startPolicy = "continue";
    });
    const first = exchange.units[0];
    const second = {
      ...first,
      unitKey: "second-unit",
      sections: first.sections.splice(8),
    };
    exchange.units.push(second);
    first.sections[2].templateKey = "rest";
    expect(planTextbookChunks(exchange, 4)).toEqual([
      [0, 1, 2],
      [3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14, 15],
    ]);
    expect(
      continuesTextbookSection(
        first.sections[0]
          ? { ...first.sections[0], unitKey: first.unitKey }
          : undefined,
        { ...second.sections[0], unitKey: second.unitKey },
      ),
    ).toBe(false);
    second.sections.forEach((s) => {
      s.templateKey = "auto-lesson";
    });
    expect(planTextbookChunks(exchange, 4).at(-1)).toEqual([15]);
    second.sections.push({ ...second.sections[0], sectionKey: "extra" });
    second.sections.forEach((s) => {
      s.templateKey = "basic";
    });
    expect(() => planTextbookChunks(exchange, 4)).toThrow(/CHUNK_CONTINUATION/);
  });
  it("starts each automatic lesson on a new actual page while retaining all placements", () => {
    const e = textbookFixture(3, 1);
    e.units[0].sections.forEach((s) => {
      s.startPolicy = "continue";
      s.templateKey = "auto-lesson";
    });
    const model = createTextbookRenderModel(e, "student");
    const measurements = model.sections.flatMap((s) =>
      s.blocks.map((b) => ({
        blockId: b.id,
        widthMm: blockWidthMm(e.config, b),
        heightMm: 20,
      })),
    );
    const result = paginateTextbookSections(
      model.sections,
      measurements,
      e.config,
    );
    expect(result.pages).toHaveLength(3);
    expect(result.pageMap.map((p) => p.itemId)).toEqual(
      e.items.map((i) => i.itemId),
    );
  });
});
