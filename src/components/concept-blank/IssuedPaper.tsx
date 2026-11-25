import { cloneElement, type ReactElement, type ReactNode } from "react";
import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";
import { SCAN_MARKER_IDS } from "@/contracts/conceptBlankScanIssued.contract";
import { conceptBlankPages } from "./ConceptBlankPaper";
import s from "./issuedPaper.module.css";

export type IssuedQr = { url: string; dataUrl: string };

/** P1. The original page planner/body/footer remain the authority. Marks use only page margins. */
export function issuedPaperPages(input: {
  sheets: ConceptBlankSheet[];
  part: "student" | "key";
  code?: string;
  qr: IssuedQr[];
}) {
  const pages = conceptBlankPages({
    sheets: input.sheets,
    view: input.part,
    code: input.code,
  });
  if (pages.length !== input.qr.length)
    throw new RangeError("발행 지면과 QR 쪽 수가 다릅니다.");
  return pages.map((page, i) => {
    const sheet = page.props.children as ReactElement<{
      children: ReactNode[];
      "data-cb-issued-part"?: string;
      "data-cb-issued-page"?: number;
    }>;
    const [head, ...body] = sheet.props.children;
    return cloneElement(page, {
      className: `${page.props.className} ${s.page}`,
      children: cloneElement(
        sheet,
        {
          "data-cb-issued-part": input.part,
          "data-cb-issued-page": i + 1,
        },
        <div className={s.head}>
          <div className={s.originalHead}>{head}</div>
          <div className={s.qr}>
            {/* Exact print raster: do not optimize or resample this data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={input.qr[i].dataUrl}
              alt={`${input.part === "student" ? "학생지" : "채점표"} ${i + 1}쪽 QR`}
              data-cb-issued-qr=""
              data-url={input.qr[i].url}
              width={76}
              height={76}
            />
            <span>
              {input.part === "student" ? "답안 촬영" : "채점표"} · {i + 1}/
              {pages.length}
            </span>
          </div>
        </div>,
        ...body,
        ...SCAN_MARKER_IDS.map((id) => (
          <span
            key={id}
            className={s.marker}
            data-cb-registration={id}
            aria-hidden="true"
          />
        )),
      ),
    });
  });
}
