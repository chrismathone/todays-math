import { cloneElement, type ReactElement, type ReactNode } from "react";
import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";
import { SCAN_MARKER_IDS } from "@/contracts/conceptBlankScanIssued.contract";
import { conceptBlankPages } from "./ConceptBlankPaper";
import s from "./issuedPaper.module.css";

export type IssuedQr = { url: string; dataUrl: string };

/** P1. The original page planner/body/footer remain the authority. Marks use only page margins.
 * 채점표는 촬영 대상이 아니다 — 원래 지면 그대로(QR · 표식 없음, 원장님 2026-11-25). */
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
  const withQr = input.part === "student";
  if (input.qr.length !== (withQr ? pages.length : 0))
    throw new RangeError(
      withQr
        ? "발행 지면과 QR 쪽 수가 다릅니다."
        : "채점표에는 QR을 싣지 않습니다.",
    );
  return pages.map((page, i) => {
    const sheet = page.props.children as ReactElement<{
      children: ReactNode[];
      "data-cb-issued-part"?: string;
      "data-cb-issued-page"?: number;
    }>;
    const issuedAttrs = {
      "data-cb-issued-part": input.part,
      "data-cb-issued-page": i + 1,
    };
    if (!withQr)
      return cloneElement(page, {
        children: cloneElement(sheet, issuedAttrs),
      });
    const [head, ...body] = sheet.props.children;
    return cloneElement(page, {
      className: `${page.props.className} ${s.page}`,
      children: cloneElement(
        sheet,
        issuedAttrs,
        <div className={s.head}>
          <div className={s.originalHead}>{head}</div>
          <div className={s.qr}>
            {/* Exact print raster: do not optimize or resample this data URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={input.qr[i].dataUrl}
              alt={`학생지 ${i + 1}쪽 QR`}
              data-cb-issued-qr=""
              data-url={input.qr[i].url}
              width={76}
              height={76}
            />
            <span>
              답안 촬영 · {i + 1}/{pages.length}
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
