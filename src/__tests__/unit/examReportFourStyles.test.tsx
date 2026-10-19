import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EXAM_REPORT_STYLES,
  styleReportPages,
} from "@/components/exam-report/StyledExamReportPaper";
import { studentExamReportPages } from "@/components/exam-report/ExamReportPaper";
import { REPORT_BLOCK_PRESETS } from "@/lib/examReport/blocks";
import {
  STYLE_SCENARIOS,
  styleFixture,
  PREVIEW_HEADER,
  PREVIEW_FOOTER,
} from "@/app/dev/exam-report-styles/fixtures";
import { styledReportTableDom } from "@/lib/examReport/styledReportDom";

const cases = (
  Object.keys(REPORT_BLOCK_PRESETS) as (keyof typeof REPORT_BLOCK_PRESETS)[]
).flatMap((composition) =>
  (Object.keys(STYLE_SCENARIOS) as (keyof typeof STYLE_SCENARIOS)[]).map(
    (scenario) => ({ composition, scenario }),
  ),
);

describe.each(EXAM_REPORT_STYLES)("제품 네 양식 · $name", ({ id }) => {
  it.each(cases)(
    "$composition / $scenario · 고정 기록은 첫 쪽, 오답만 이어진다",
    ({ composition, scenario }) => {
      const { report } = styleFixture(scenario);
      const before = JSON.stringify(report);
      const root = document.createElement("div");
      root.innerHTML = renderToStaticMarkup(
        <>
          {styleReportPages(id, report, {
            blocks: REPORT_BLOCK_PRESETS[composition],
            header: PREVIEW_HEADER,
            footer: PREVIEW_FOOTER,
          })}
        </>,
      );
      const pages = [...root.querySelectorAll("[data-report-style]")];
      expect(pages[0].querySelector(".sc-contact")?.textContent).toBe(
        PREVIEW_FOOTER,
      );
      const summary = composition === "summary";
      expect(pages[0].querySelector(".sc-noteText")?.textContent ?? "").toBe(
        summary ? report.teacherNote : "",
      );
      expect(
        Boolean(pages[0].querySelector('[data-report-block="retries"]')),
      ).toBe(summary && report.retries.length > 0);
      for (const page of pages.slice(1))
        expect(
          [...page.querySelectorAll("[data-report-block]")].map((block) =>
            block.getAttribute("data-report-block"),
          ),
        ).toEqual(["wrongTable"]);
      expect(
        [...root.querySelectorAll("[data-er-wrong-no]")].map((node) =>
          Number(node.getAttribute("data-er-wrong-no")),
        ),
      ).toEqual(
        summary && report.status === "graded"
          ? report.wrongQuestions.map((q) => q.no)
          : [],
      );
      const marks = [...root.querySelectorAll("[data-mark-no]")];
      expect(
        marks.map((node) => Number(node.getAttribute("data-mark-no"))),
      ).toEqual(
        id === "grid" && summary ? report.questions.map((q) => q.no) : [],
      );
      for (const [i, mark] of marks.entries())
        expect(mark.querySelector("strong")?.getAttribute("aria-label")).toBe(
          report.questions[i].isCorrect === null
            ? "기록 없음"
            : report.questions[i].isCorrect
              ? "정답"
              : "오답",
        );
      expect(root.querySelector("[data-solution-no],.katex,img")).toBeNull();
      expect(JSON.stringify(report)).toBe(before);
    },
  );

  it("학생 출력과 시안은 같은 양식과 표 재배치를 사용한다", () => {
    const { report } = styleFixture("wrong16");
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(
      <>{studentExamReportPages(report, { style: id })}</>,
    );
    expect(
      root
        .querySelector("[data-report-style]")
        ?.getAttribute("data-report-style"),
    ).toBe(id);
    const rows = root.querySelectorAll("[data-er-wrong-row]").length;
    for (let i = 0; i < 2; i++) {
      styledReportTableDom(root, [0, rows]);
      const pages = [...root.querySelectorAll("[data-report-style]")];
      expect(pages).toHaveLength(2);
      expect(pages[0].querySelector("[data-er-wrong-no]")).toBeNull();
      expect(pages[0].querySelector(".sc-noteText")?.textContent).toBe(
        report.teacherNote,
      );
      expect(pages[1].querySelector("h3")?.textContent).toBe(
        "틀린 문항 (이어서)",
      );
      expect(
        pages[1].querySelector(".sc-noteText,.sc-contact,.sc-retries"),
      ).toBeNull();
      expect(pages[1].querySelector("[data-sc-page-count]")?.textContent).toBe(
        "2 / 2쪽",
      );
      expect(
        [...root.querySelectorAll("[data-er-wrong-no]")].map((node) =>
          Number(node.getAttribute("data-er-wrong-no")),
        ),
      ).toEqual(report.wrongQuestions.map((q) => q.no));
    }
  });
});
