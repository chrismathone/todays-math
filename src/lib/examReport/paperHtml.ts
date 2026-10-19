import "server-only";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createElement } from "react";
import {
  studentExamReportSchema,
  classExamReportSchema,
  type ClassExamReport,
  type StudentExamReport,
} from "@/contracts/examReport.contract";
import {
  StudentExamReportPaper,
  ClassExamReportPaper,
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

/**
 * 화면과 같은 요약/이어지는 표의 초기 HTML. buildPdf는 자체 글꼴 적재 뒤 행 높이를
 * 다시 재서 이어지는 쪽을 조정한다. 이 함수는 DB·로더·Chromium을 호출하지 않는다.
 */
// App Router 의 라우트 그래프는 `react-dom/server` 를 정적으로 들이면 빌드가 막힌다 — 부를 때 읽는다(2026-10-18 운영 빌드 실패).
async function staticMarkup(
  element: Parameters<
    typeof import("react-dom/server").renderToStaticMarkup
  >[0],
) {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(element);
}

export async function buildExamReportPaperHtml(
  report: StudentExamReport,
  options: ExamReportOutputOptions = {},
): Promise<PdfPayload> {
  const value = studentExamReportSchema.parse(report);
  return PdfPayloadSchema.parse({
    html: await staticMarkup(
      createElement(StudentExamReportPaper, { report: value, options }),
    ),
    cssUrls: [],
    cssText: `${selfHostedMathCss()}\n${EXAM_REPORT_PAPER_CSS}`,
    title:
      `${value.publication.title.replaceAll("\n", " ")} · ${value.student.name} 성적표`.slice(
        0,
        200,
      ),
    fontPolicy: "self-hosted",
  });
}

export async function buildClassExamReportPaperHtml(
  report: ClassExamReport,
): Promise<PdfPayload> {
  const value = classExamReportSchema.parse(report);
  return PdfPayloadSchema.parse({
    html: await staticMarkup(
      createElement(ClassExamReportPaper, { report: value }),
    ),
    cssUrls: [],
    cssText: `${selfHostedMathCss()}\n${EXAM_REPORT_PAPER_CSS}`,
    title: `${value.publication.title} · ${value.className} 반 성적표`.slice(
      0,
      200,
    ),
    fontPolicy: "self-hosted",
    landscape: true,
  });
}
