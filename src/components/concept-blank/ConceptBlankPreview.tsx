"use client";

import { useMemo } from "react";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import {
  conceptBlankPages,
  type ConceptBlankPaperProps,
} from "./ConceptBlankPaper";

/** 지면이 읽는 배율 변수 — 띠가 같이 내려 준다(`paper/paper.module.css`). */
const SCALE_VARS = ["--cb-paper-scale"];

/** 미리보기 — 지면을 옆으로 넘겨 보고, 누르면 크게 본다. 띠와 크게 보기는 공용 부품(`PaperStrip`)이다. */
export default function ConceptBlankPreview({
  sheets,
  view,
  code,
}: ConceptBlankPaperProps) {
  const pages = useMemo(() => {
    const papers = conceptBlankPages({ sheets, view, code });
    return papers.map((page, i) => ({
      key: String(page.key),
      node: page,
      caption: (
        <>
          <strong>{i + 1}</strong>
          <span>/ {papers.length}쪽</span>
        </>
      ),
      enlargeLabel: `${i + 1}쪽 확대`,
    }));
  }, [sheets, view, code]);
  return (
    <PaperStrip
      pages={pages}
      scaleVars={SCALE_VARS}
      hint={
        <>
          좌우로 넘겨 보고, 페이지를 누르면 크게 볼 수 있습니다. ·{" "}
          {pages.length}쪽
        </>
      }
    />
  );
}
