import { PrintHeader } from "../PrintHeader";
import { printPagePadding, scaledItemStyle } from "../geometry";
// YuhyungTemplate.tsx (T6) — 유형 훈련지 (같은 유형 반복, 컴팩트)
// design_handoff 카피 + import path 조정 + options.accentColor → options.color.

import type { ProblemReview } from "../types";
import { bodyFontSize } from "../geometry";
import { PAPER_COLORS, A4_DIM } from "../tokens";
import { readablePaperColor } from "../readableColor";
import { BodyContainer } from "./BodyContainer";
import { ProblemHeader } from "./ProblemMeta";
import { ProblemBody } from "./ProblemBody";
import type { PrintTemplateProps } from "../types";

export function YuhyungTemplate({
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
  measure,
}: PrintTemplateProps) {
  const accent = options.color || PAPER_COLORS.accentSlate;
  const fs = bodyFontSize("yuhyung", columns);
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
        <ProblemBody problem={p.variant} fontSize={fs} options={options} />
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
          lineHeight: 1.65,
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
        columnGap={22}
        columnRule={options.columnDivider ? PAPER_COLORS.ink15 : null}
        splitIndex={splitIndex}
        distribute={options.layoutMode === "count"}
        style={{ fontSize: fs, lineHeight: 1.65 }}
      >
        {problems.map(renderItem)}
      </BodyContainer>

      {/* 푸터 — 진도 바 */}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--paper-font-sans)",
          fontSize: 9.5,
          color: PAPER_COLORS.ink50,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: readablePaperColor(accent),
            letterSpacing: "0.1em",
          }}
        >
          PROGRESS
        </span>
        <div
          style={{
            flex: 1,
            height: 3,
            background: PAPER_COLORS.ink08,
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${Math.round((page / Math.max(1, totalPages)) * 100)}%`,
              height: "100%",
              background: accent,
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "var(--paper-font-mono)",
            fontWeight: 700,
            color: PAPER_COLORS.ink,
          }}
        >
          PG · {page}
        </span>
      </div>
    </div>
  );
}
