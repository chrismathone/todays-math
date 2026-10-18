import "server-only";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  studentExamReportSchema,
  type StudentExamReport,
} from "@/contracts/examReport.contract";
import {
  StudentExamReportPaper,
  type ExamReportOutputOptions,
} from "@/components/exam-report/ExamReportPaper";
import { EXAM_REPORT_PAPER_CSS } from "@/components/exam-report/paperStyles";
import { PdfPayloadSchema, type PdfPayload } from "@/lib/export/pdfServer";

const requireAsset = createRequire(import.meta.url);
let mathCss: string | undefined;

/** 실제 KaTeX CSS와 woff2를 함께 싣는다. CDN·Next의 가변 CSS 해시 주소에 의존하지 않는다. */
function selfHostedMathCss(): string {
  if (mathCss !== undefined) return mathCss;
  const cssPath = requireAsset.resolve("katex/dist/katex.min.css");
  mathCss = readFileSync(cssPath, "utf8").replace(
    /src:([^;]+);/g,
    (declaration, sources: string) => {
      const font = /url\(fonts\/([^()]+\.woff2)\)/.exec(sources);
      if (!font) return declaration;
      const bytes = readFileSync(
        path.join(path.dirname(cssPath), "fonts", font[1]),
      );
      return `src:url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2");`;
    },
  );
  return mathCss;
}

/** HTML까지만 만든다. DB·로더·확정 어댑터·Chromium은 호출하지 않는다. */
export function buildExamReportPaperHtml(
  report: StudentExamReport,
  options: ExamReportOutputOptions = {},
): PdfPayload {
  const value = studentExamReportSchema.parse(report);
  return PdfPayloadSchema.parse({
    html: renderToStaticMarkup(
      createElement(StudentExamReportPaper, { report: value, options }),
    ),
    cssUrls: [],
    cssText: `${selfHostedMathCss()}\n${EXAM_REPORT_PAPER_CSS}`,
    title: `${value.publication.title.replaceAll("\n", " ")} · ${value.student.name} 성적표`,
    fontPolicy: "self-hosted",
  });
}
