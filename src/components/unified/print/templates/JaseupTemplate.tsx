import { PrintHeader } from "../PrintHeader";
import { printPagePadding, scaledItemStyle } from "../geometry";
// JaseupTemplate.tsx (T5) — 자습 학습지 (개념박스 + 모눈 풀이공간)
// design_handoff 카피 + import path 조정 + options.accentColor → options.color
// + MarkdownRenderer 실제 import.

import type { ProblemReview } from "../types";
import { bodyFontSize } from "../geometry";
import { PAPER_COLORS, A4_DIM } from "../tokens";
import { readablePaperColor } from "../readableColor";
import { BodyContainer } from "./BodyContainer";
import { ProblemHeader } from "./ProblemMeta";
import { ProblemBody } from "./ProblemBody";
import type { PrintTemplateProps } from "../types";

export function JaseupTemplate({
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
  const accent = options.color || PAPER_COLORS.accentNavy;
  const fs = bodyFontSize("jaseup", columns);
  const gap = Math.max(0, options.spacing);
  const embeddedSolvingArea =
    columns === 1 && (!options.solvingArea || options.solvingArea === "off");

  const renderItem = (p: ProblemReview, i: number) => {
    const num = startingNumber + i;
    return (
      <div
        key={p.id}
        data-measure-idx={i}
        style={{
          ...scaledItemStyle(options, itemScales?.[i]),
          flex: columns === 1 ? 1 : undefined,
          display: "block",
          paddingBottom: embeddedSolvingArea ? 0 : 14,
          borderBottom: embeddedSolvingArea
            ? undefined
            : `1px dashed ${PAPER_COLORS.ink15}`,
          breakInside: "avoid",
          minHeight: 0,
        }}
      >
        <div>
          <ProblemHeader
            sectionHeading={p.sectionHeading}
            sectionInstruction={p.sectionInstruction}
            num={num}
            problem={p.variant}
            options={options}
            accent={accent}
          />
          <ProblemBody problem={p.variant} fontSize={fs} options={options} />
          {/* 정답 기록 칸 */}
          {!embeddedSolvingArea && (
            <div
              style={{
                marginTop: 8,
                padding: "6px 10px",
                background: PAPER_COLORS.paperWarm,
                border: `1px solid ${PAPER_COLORS.ink15}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--paper-font-sans)",
                fontSize: 11,
              }}
            >
              <span
                style={{ fontWeight: 700, color: readablePaperColor(accent) }}
              >
                내 정답
              </span>
              <span
                style={{
                  flex: 1,
                  borderBottom: `1px solid ${PAPER_COLORS.ink30}`,
                  height: 16,
                }}
              />
              <span style={{ fontSize: 10, color: PAPER_COLORS.ink50 }}>
                ✓ 채점
              </span>
              <span
                style={{
                  width: 16,
                  height: 16,
                  border: `1.5px solid ${PAPER_COLORS.ink30}`,
                  display: "inline-block",
                }}
              />
            </div>
          )}
        </div>
        {/* 모눈 풀이공간 — 1단만 */}
        {embeddedSolvingArea && (
          <div
            data-writing-space="grid"
            style={{
              backgroundImage:
                "linear-gradient(#d3dbe6 1px, transparent 1px), linear-gradient(90deg, #d3dbe6 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              backgroundColor: PAPER_COLORS.paper,
              height: 85,
              marginTop: 12,
              position: "relative",
            }}
          ></div>
        )}
      </div>
    );
  };

  // 측정 모드 — 본문만 1단 flow. (1단 stretch 는 개수패킹이라 높이 무시, 2단 실측.)
  if (measure) {
    return (
      <div
        style={{
          width: measure.columnWidthPx,
          fontFamily: "var(--paper-font-serif)",
          fontSize: fs,
          lineHeight: 1.6,
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
      >
        {problems.map(renderItem)}
      </BodyContainer>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--paper-font-sans)",
          fontSize: 10,
          color: PAPER_COLORS.ink50,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: readablePaperColor(accent),
            letterSpacing: "0.12em",
          }}
        >
          오늘의 메모
        </span>
        <span
          style={{
            flex: 1,
            borderBottom: `1px dashed ${PAPER_COLORS.ink30}`,
            height: 1,
          }}
        />
        <span>p. {page}</span>
      </div>
    </div>
  );
}
