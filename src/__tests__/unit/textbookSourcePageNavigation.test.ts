// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { renderHeadingHtml } from "@/lib/textbook/render/blocks/front";
import { sourceStageLabel } from "@/lib/textbook/render/editorial";
import { textbookFixture } from "../helpers/textbookFixture";

const resources = {
  assetUrl: () => "data:image/png;base64,AA==",
  qrDataUrl: () => "data:image/png;base64,AA==",
};
function heading(kind?: string, sectionName?: string) {
  const block = createTextbookRenderModel(
    textbookFixture(1, 1),
    "student",
  ).sections[0].blocks.find((candidate) => candidate.kind === "heading");
  if (!block || block.kind !== "heading") throw new Error("No fixture heading");
  if (kind)
    block.semantic = {
      activity: sectionName?.startsWith("누적 복습") ? "review" : "practice",
      source: { unit: "U01", page: 34, kind, path: "synthetic", sectionName },
    };
  return block;
}

describe("source page navigation preserves native captions and progress", () => {
  it.each([
    ["practice", "실전문제", "설명·적용"],
    ["practice", "서술형", "설명·적용"],
    ["mindmap", "단원 마무리", "개념 정리"],
    ["exercise", "누적 복습 Daily 2", "다시 꺼내기"],
    ["types", "유형 연습", "유형 연습"],
  ])("renders %s / %s with native active tab %s", (kind, label, active) => {
    const block = heading(kind, label);
    const html = renderHeadingHtml(block, resources, "practice");
    expect(html).toContain(`>${sourceStageLabel(block, "practice")}</div>`);
    expect(html).toContain(
      `class="tb-progress-active" aria-current="step">${active}</span>`,
    );
  });

  it("keeps the source memory sheet's three authored steps", () => {
    const block = heading("fullmaster", "개념 정리");
    block.progressSteps = [
      { activity: "practice", label: "개념학습" },
      { activity: "recall-cloze", label: "빈칸개념암기" },
      { activity: "recall-sentence", label: "통문장개념암기" },
    ];
    const html = renderHeadingHtml(block, resources, "recall");
    expect(html).toContain("빈칸개념암기");
    expect(html).toContain("통문장개념암기");
    expect(html).not.toContain("유형 연습");
  });

  it("keeps stored source-absent custom navigation", () => {
    const block = heading();
    block.progressSteps = [{ activity: "practice", label: "저장된 단계" }];
    const html = renderHeadingHtml(block, resources, "practice");
    expect(html).toContain(
      'class="tb-progress-active" aria-current="step">저장된 단계</span>',
    );
    expect(sourceStageLabel(block, "practice")).toBe("유형 연습");
    expect(html).not.toContain("설명·적용");
  });
});
