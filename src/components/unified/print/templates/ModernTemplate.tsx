import { PrintHeader } from "../PrintHeader";
import { printPagePadding, scaledItemStyle } from "../geometry";
// ModernTemplate.tsx (T3) — 모던 내신형 (학교 마케팅 / 세련된 톤)
// design_handoff 카피 + import path 조정 + options.accentColor → options.color
// (Mathgen 의 PrintOptions 는 `color` 사용).

import type { ProblemReview } from "../types";
import { bodyFontSize } from "../geometry";
import { PAPER_COLORS, A4_DIM } from "../tokens";
import { readablePaperColor } from "../readableColor";
import { BodyContainer } from "./BodyContainer";
import { ProblemHeader } from "./ProblemMeta";
import { ProblemBody } from "./ProblemBody";
import type { PrintTemplateProps } from "../types";

export function ModernTemplate({
  page,
  round,
  firstPage,
  totalPages,
  totalProblems,
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
  const accent = options.color || PAPER_COLORS.accentNavy;
  const fs = bodyFontSize("modern", columns);
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
        <ProblemHeader
          sectionHeading={p.sectionHeading}
          sectionInstruction={p.sectionInstruction}
          num={num}
          problem={p.variant}
          options={options}
          accent={accent}
        />
        <div style={{ paddingLeft: 28 }}>
          <ProblemBody problem={p.variant} fontSize={fs} options={options} />
        </div>
      </div>
    );
  };

  // 측정 모드 — 본문만 1단 flow, 타겟 컬럼 폭.
  if (measure) {
    return (
      <div
        style={{
          width: measure.columnWidthPx,
          fontFamily: "var(--paper-font-serif)",
          fontSize: fs,
          lineHeight: 1.85,
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
        columnGap={32}
        columnRule={options.columnDivider ? PAPER_COLORS.ink15 : null}
        splitIndex={splitIndex}
        itemWhitespace={itemWhitespace}
        distribute={options.layoutMode === "count"}
        style={{ fontSize: fs, lineHeight: 1.85 }}
      >
        {problems.map(renderItem)}
      </BodyContainer>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--paper-font-sans)",
          fontSize: 10,
          color: PAPER_COLORS.ink50,
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        <span>
          {meta.schoolName ?? "○○고등학교"} · {meta.grade ?? "2학년"}{" "}
          {meta.subject}
        </span>
        <span style={{ fontWeight: 700, color: readablePaperColor(accent) }}>
          {page} / {totalPages}
        </span>
      </div>
    </div>
  );
}
