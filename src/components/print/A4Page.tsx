import type { CSSProperties, ReactNode } from "react";

import { PAPER_CSS_VARIABLES } from "@/components/print/tokens";
import type { PrintPageKind } from "@/components/print/types";

import styles from "./TestPrint.module.css";

interface A4PageProps {
  children: ReactNode;
  kind: PrintPageKind;
  pageNumber: number;
  className?: string;
  /** 문제지 외의 A4 시안도 실제 문서 이름으로 읽는다. */
  ariaLabel?: string;
}

const pageVariables = PAPER_CSS_VARIABLES as CSSProperties;

/** 미리보기와 브라우저 인쇄가 함께 쓰는 A4 DOM 경계. */
export function A4Page({
  children,
  kind,
  pageNumber,
  className,
  ariaLabel,
}: A4PageProps) {
  return (
    <section
      aria-label={
        ariaLabel ??
        `${kind === "questions" ? "문제지" : "정답지"} ${pageNumber}쪽`
      }
      className={[styles.a4Page, className].filter(Boolean).join(" ")}
      data-page-kind={kind}
      data-page-number={pageNumber}
      data-print-page="true"
      style={pageVariables}
    >
      {children}
    </section>
  );
}
