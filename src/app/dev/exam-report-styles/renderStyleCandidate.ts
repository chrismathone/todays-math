import "server-only";
import { createElement, Fragment } from "react";
import {
  studentExamReportSchema,
  type StudentExamReport,
} from "@/contracts/examReport.contract";
import { selfHostedMathCss } from "@/lib/examReport/paperHtml";
import { PdfPayloadSchema, type PdfPayload } from "@/lib/export/pdfServer";
import {
  styleCandidatePages,
  type StyleCandidateId,
  type StyleCandidateOptions,
} from "./candidates";
import { STYLE_CANDIDATE_CSS } from "./paperStyles";

/**
 * DB·Chromium을 부르지 않는다. 리드가 pdfDocument(payload, origin) 등으로 조판할 값만 반환한다.
 * App Router에서 react-dom/server 정적 import를 피하는 기존 H1과 같은 경로다.
 */
export async function renderStyleCandidate(
  id: StyleCandidateId,
  report: StudentExamReport,
  options: StyleCandidateOptions = {},
): Promise<PdfPayload> {
  const value = studentExamReportSchema.parse(report);
  const { renderToStaticMarkup } = await import("react-dom/server");
  const pages = styleCandidatePages(id, value, options);
  return PdfPayloadSchema.parse({
    html: renderToStaticMarkup(
      createElement(
        "div",
        { "data-mathgen-document": "true", "data-style-candidate": id },
        createElement(Fragment, null, ...pages),
      ),
    ),
    cssUrls: [],
    cssText: `${selfHostedMathCss()}\n${STYLE_CANDIDATE_CSS}`,
    title:
      `${value.publication.title.replaceAll("\n", " ")} · ${value.student.name} · ${id}`.slice(
        0,
        200,
      ),
    fontPolicy: "self-hosted",
  });
}
