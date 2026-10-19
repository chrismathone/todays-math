import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COLORS } from "@/components/unified/print/settings";
import { PAPER_COLORS } from "@/components/unified/print/tokens";
import { QuestionNumber } from "@/components/unified/print/templates/ProblemMeta";
import { ExamDetails } from "@/components/unified/print/ExamDetails";
import {
  readablePaperColor,
  inkOnColor,
} from "@/components/unified/print/readableColor";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "@/components/unified/print/types";

function luminance(color: string) {
  const hex = color.startsWith("#")
    ? color.slice(1)
    : color
        .match(/\d+/g)!
        .map((part) => Number(part).toString(16).padStart(2, "0"))
        .join("");
  const channels = [0, 2, 4].map(
    (at) => parseInt(hex.slice(at, at + 2), 16) / 255,
  );
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("readable ink preserves selected paper accents", () => {
  it("keeps already readable colors unchanged and handles legacy malformed colors safely", () => {
    expect(readablePaperColor("#135bec")).toBe("#135bec");
    expect(readablePaperColor("#1B2A4E")).toBe("#1B2A4E");
    expect(readablePaperColor("invalid")).toBe(PAPER_COLORS.ink);
  });

  it.each([
    ...COLORS.map(([, color]) => color),
    "#ffffff",
    "#ff0000",
    "#3cffff",
    "#010101",
  ])("renders readable text for %s on both paper backgrounds", (color) => {
    for (const background of [PAPER_COLORS.paper, PAPER_COLORS.paperWarm]) {
      expect(
        contrast(readablePaperColor(color, background), background),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(inkOnColor(color), color)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    "pyeongga",
    "jeongtong",
    "modern",
    "workbook",
    "jaseup",
    "yuhyung",
  ] as PrintTemplate[])(
    "%s keeps every selectable question number readable without changing the chosen decoration",
    (template) => {
      const savedColor = DEFAULT_PRINT_OPTIONS.color;
      for (const [, accent] of [
        ["남색", DEFAULT_PRINT_OPTIONS.color],
        ...COLORS,
      ]) {
        const element = new DOMParser()
          .parseFromString(
            renderToStaticMarkup(
              <QuestionNumber template={template} num={7} accent={accent} />,
            ),
            "text/html",
          )
          .querySelector("span")!;
        const background = accent;
        expect(
          contrast(element.style.color, background),
        ).toBeGreaterThanOrEqual(4.5);
        expect(element.style.background).toBeTruthy();
        expect(element.hasAttribute("data-question-number")).toBe(true);
      }
      expect(DEFAULT_PRINT_OPTIONS.color).toBe(savedColor);
    },
  );

  it("keeps every printed metadata line readable, including cyan and orange, while honoring the date toggle", () => {
    for (const [, color] of [
      ["남색", DEFAULT_PRINT_OPTIONS.color],
      ...COLORS,
    ]) {
      const doc = new DOMParser().parseFromString(
        renderToStaticMarkup(
          <ExamDetails
            meta={{
              title: "확인 학습",
              subject: "수학",
              schoolName: "한빛중학교",
              examDate: "2026-10-19",
            }}
            options={{ ...DEFAULT_PRINT_OPTIONS, color, showDate: false }}
          />,
        ),
        "text/html",
      );
      const details = doc.querySelector<HTMLElement>("[data-exam-details]")!;
      expect(details.textContent).toContain("한빛중학교");
      expect(details.textContent).not.toContain("2026-10-19");
      for (const background of [PAPER_COLORS.paper, PAPER_COLORS.paperWarm]) {
        expect(
          contrast(details.style.color, background),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
