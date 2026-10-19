// @vitest-environment node
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EXAM_REPORT_STYLES,
  styleReportPages,
} from "@/components/exam-report/StyledExamReportPaper";
import { buildExamReportPaperHtml } from "@/lib/examReport/paperHtml";
import { FOUR_STYLE_CSS } from "@/components/exam-report/fourStyleCss";
import { styleFixture } from "@/app/dev/exam-report-styles/fixtures";

describe("제품 양식 · 미리보기와 서버 PDF 정본", () => {
  it.each(EXAM_REPORT_STYLES)(
    "$name의 전체 지면과 CSS가 서버 HTML에도 그대로 담긴다",
    async ({ id }) => {
      const { report } = styleFixture("zero");
      const options = {
        header: { name: "오늘의수학", line: "월말평가 성적표" },
        footer: "오늘의수학",
      };
      const expected = renderToStaticMarkup(
        createElement(Fragment, null, ...styleReportPages(id, report, options)),
      );
      const payload = await buildExamReportPaperHtml(report, { style: id });
      expect(payload.html).toContain(expected);
      expect(payload.html).toContain(`data-exam-report-document="${id}"`);
      expect(payload.cssText).toContain(FOUR_STYLE_CSS);
      expect(payload.cssText).not.toMatch(
        /data-report-style="(?:certificate|newspaper|numbers)"/,
      );
      expect(payload.fontPolicy).toBe("self-hosted");
    },
  );
  it("미설정과 명시한 H1은 같은 새 PDF를 만든다", async () => {
    const { report } = styleFixture("normal");
    expect(await buildExamReportPaperHtml(report)).toEqual(
      await buildExamReportPaperHtml(report, { style: "H1" }),
    );
  });
});
