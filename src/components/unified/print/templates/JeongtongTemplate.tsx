import { PrintHeader } from "../PrintHeader";
import { printPagePadding, scaledItemStyle } from "../geometry";
// JeongtongTemplate.tsx (T2) — 정통 내신형 (학교 시험지 표 양식)
// design_handoff 카피 + import path 조정 + ProblemBody import 교체.

import type { ProblemReview } from "../types";
import { bodyFontSize } from "../geometry";
import { PAPER_COLORS, A4_DIM } from "../tokens";
import { BodyContainer } from "./BodyContainer";
import { ProblemBody } from "./ProblemBody";
import { ProblemHeader } from "./ProblemMeta";

import type { PrintTemplateProps } from "../types";

export function JeongtongTemplate({
  page,
  totalProblems,
  round,
  firstPage,
  columns,
  meta,
  problems,
  startingNumber,
  options,
  splitIndex,
  itemScales,
  itemWhitespace,
  measure,
}: PrintTemplateProps) {
  const isFirstPage = firstPage ?? page === 1;
  const fs = bodyFontSize("jeongtong", columns);
  const gap = Math.max(0, options.spacing);

  const renderItem = (p: ProblemReview, i: number) => {
    const num = startingNumber + i;
    // Numbering is display-only; the stored source question and crop stay untouched.
    const printProblem = p.variant;
    return (
      <div
        key={p.id}
        data-measure-idx={i}
        style={{
          ...scaledItemStyle(options, itemScales?.[i]),
          breakInside: "avoid",
        }}
      >
        <ProblemHeader
          sectionHeading={p.sectionHeading}
          sectionInstruction={p.sectionInstruction}
          num={num}
          problem={p.variant}
          options={options}
          accent={options.color}
        />
        <ProblemBody
          problem={printProblem}
          fontSize={fs}
          compact
          options={options}
        />
      </div>
    );
  };

  // 측정 모드 — 헤더/푸터/A4 chrome 없이 본문만 1단 flow, 타겟 컬럼 폭으로 렌더.
  // usePrintLayout 이 각 data-measure-idx 래퍼의 offsetHeight 를 실측한다.
  if (measure) {
    return (
      <div
        style={{
          width: measure.columnWidthPx,
          fontFamily: "var(--paper-font-serif)",
          fontSize: fs,
          lineHeight: 1.5,
        }}
      >
        <BodyContainer columns={1} gap={gap}>
          {problems.map(renderItem)}
        </BodyContainer>
      </div>
    );
  }

  return (
    <div
      data-template-t2={options.template}
      style={{
        width: A4_DIM.width,
        height: A4_DIM.height,
        background: PAPER_COLORS.paper,
        padding: printPagePadding(options.marginPreset),
        boxSizing: "border-box",
        position: "relative",
        overflow: "visible",
        fontFamily: "var(--paper-font-serif)",
        color: PAPER_COLORS.ink,
        fontSize: 13,
        lineHeight: 1.6,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PrintHeader
        page={page}
        round={round}
        firstPage={firstPage}
        totalProblems={totalProblems}
        meta={meta}
        options={options}
      />

      <BodyContainer
        solvingArea={options.solvingArea}
        columns={columns}
        gap={gap}
        columnRule={options.columnDivider ? PAPER_COLORS.ink15 : null}
        splitIndex={splitIndex}
        itemWhitespace={itemWhitespace}
        distribute={options.layoutMode === "count"}
        style={{
          marginTop: isFirstPage ? 18 : 0,
          marginBottom: 8,
          fontSize: fs,
          lineHeight: 1.5,
          fontFamily: "var(--paper-font-serif)",
        }}
      >
        {problems.map(renderItem)}
      </BodyContainer>

      {/* 푸터 */}
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          fontFamily: "var(--paper-font-serif)",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        - {page} -
      </div>
    </div>
  );
}
