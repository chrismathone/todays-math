import { PrintHeader } from "../PrintHeader";
import { printPagePadding, scaledItemStyle } from "../geometry";
// PyeonggaTemplate.tsx (T1) — 평가원 정밀형 (수능·모의평가 클론)
// design_handoff 의 동명 파일 그대로 + import path 조정 + ProblemBody placeholder
// → 실제 import 로 교체.

import type { ProblemReview } from "../types";
import { bodyFontSize } from "../geometry";
import { PAPER_COLORS, A4_DIM } from "../tokens";
import { BodyContainer } from "./BodyContainer";
import { ProblemHeader } from "./ProblemMeta";
import { ProblemBody } from "./ProblemBody";
import type { PrintTemplateProps } from "../types";

export function PyeonggaTemplate({
  page,
  totalProblems,
  round,
  firstPage,
  meta,
  columns,
  problems,
  startingNumber,
  options,
  splitIndex,
  itemScales,
  itemWhitespace,
  measure,
}: PrintTemplateProps) {
  const fs = bodyFontSize("pyeongga", columns);
  const gap = Math.max(0, options.spacing);

  const renderItem = (p: ProblemReview, i: number) => {
    const num = startingNumber + i;
    return (
      <div
        key={p.id}
        data-measure-idx={i}
        style={{
          ...scaledItemStyle(options, itemScales?.[i]),
          breakInside: "avoid",
          paddingBottom: 4,
        }}
      >
        {/* 배점은 ProblemBody.repositionScore 가 발문 끝에 통일(§45) — 번호 행엔 표시 X. */}
        <ProblemHeader
          sectionHeading={p.sectionHeading}
          sectionInstruction={p.sectionInstruction}
          num={num}
          problem={p.variant}
          options={options}
          accent={options.color}
        />
        <ProblemBody problem={p.variant} fontSize={fs} options={options} />
      </div>
    );
  };

  // 측정 모드 — 본문만 1단 flow, 타겟 컬럼 폭 (BodyContainer "0 56px" 패딩은
  // columnWidthPx 가 이미 반영 — 측정 래퍼엔 패딩 없음).
  if (measure) {
    return (
      <div
        style={{
          width: measure.columnWidthPx,
          fontFamily: "var(--paper-font-serif)",
          fontSize: fs,
          lineHeight: 1.75,
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
        style={{ padding: "0 0 16px", fontSize: fs, lineHeight: 1.75 }}
      >
        {problems.map(renderItem)}
      </BodyContainer>

      {/* 푸터 */}
      <div
        style={{
          margin: "0",
          paddingTop: 6,
          borderTop: `1px solid ${PAPER_COLORS.ink}`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        <span>{meta.subject} 영역</span>
        <span style={{ fontFamily: "var(--paper-font-mono)" }}>{page}</span>
      </div>
    </div>
  );
}
