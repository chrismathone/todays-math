// C5 comparison snapshot before the approved C2 implementation (2026-10-19).
import {
  printPagePadding,
  scaledItemStyle,
} from "@/components/unified/print/geometry";
// JaseupTemplate.tsx (T5) — 자습 학습지 (개념박스 + 모눈 풀이공간)
// design_handoff 카피 + import path 조정 + options.accentColor → options.color
// + MarkdownRenderer 실제 import.

import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import type { ProblemReview } from "@/components/unified/print/types";
import { bodyFontSize } from "@/components/unified/print/geometry";
import { PAPER_COLORS, A4_DIM } from "@/components/unified/print/tokens";
import { readablePaperColor } from "@/components/unified/print/readableColor";
import { BodyContainer } from "@/components/unified/print/templates/BodyContainer";
import { ArithmeticRoundLabel, ProblemHeader } from "./ProblemMeta";
import { ProblemBody } from "@/components/unified/print/templates/ProblemBody";
import type { PrintTemplateProps } from "@/components/unified/print/types";
import { ExamDetails } from "@/components/unified/print/ExamDetails";

export function JaseupTemplate({
  page,
  round,
  firstPage,
  columns,
  meta,
  problems,
  startingNumber,
  options,
  splitIndex,
  itemScales,
  measure,
}: PrintTemplateProps) {
  const accent = options.color || PAPER_COLORS.accentGold;
  const isFirstPage = firstPage ?? page === 1;
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
          display: embeddedSolvingArea ? "grid" : "block",
          gridTemplateColumns: "1.15fr 1fr",
          gap: 14,
          paddingBottom: 14,
          borderBottom: `1px dashed ${PAPER_COLORS.ink15}`,
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
        </div>
        {/* 모눈 풀이공간 — 1단만 */}
        {embeddedSolvingArea && (
          <div
            style={{
              backgroundImage: `linear-gradient(${PAPER_COLORS.ink08} 1px, transparent 1px), linear-gradient(90deg, ${PAPER_COLORS.ink08} 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
              backgroundColor: PAPER_COLORS.paper,
              border: `1px solid ${PAPER_COLORS.ink15}`,
              minHeight: 100,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 6,
                right: 8,
                fontFamily: "var(--paper-font-sans)",
                fontSize: 9,
                color: PAPER_COLORS.mutedText,
                letterSpacing: "0.12em",
              }}
            >
              SCRATCH PAD
            </div>
          </div>
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
      style={{
        width: A4_DIM.width,
        height: A4_DIM.height,
        background: PAPER_COLORS.paperWarm,
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
      {(isFirstPage || round !== undefined) && (
        <>
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
              flexShrink: 0,
              ...(round !== undefined ? { gap: 16 } : {}),
            }}
          >
            <div
              style={
                round !== undefined
                  ? { minWidth: 0, overflowWrap: "anywhere" }
                  : undefined
              }
            >
              <div
                style={{
                  fontFamily: "var(--paper-font-sans)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: readablePaperColor(accent),
                  letterSpacing: "0.3em",
                  marginBottom: 4,
                }}
              >
                SELF-STUDY
              </div>
              <div
                style={{
                  fontFamily: "var(--paper-font-serif)",
                  fontSize: 24,
                  fontWeight: 800,
                  color: PAPER_COLORS.ink,
                  letterSpacing: "-0.01em",
                }}
              >
                {meta.title}
              </div>
              {isFirstPage && meta.todayGoal && (
                <div
                  style={{
                    fontFamily: "var(--paper-font-sans)",
                    fontSize: 11,
                    color: PAPER_COLORS.ink70,
                    marginTop: 4,
                  }}
                >
                  오늘의 목표 · {meta.todayGoal}
                </div>
              )}
            </div>
            <div
              style={{
                textAlign: "right",
                ...(round !== undefined
                  ? {
                      flexShrink: 0,
                      paddingLeft: 16,
                      borderLeft: `1px solid ${PAPER_COLORS.ink30}`,
                    }
                  : {}),
              }}
            >
              <ArithmeticRoundLabel
                round={round}
                style={{ color: readablePaperColor(accent), marginBottom: 6 }}
              />
              <div
                style={{
                  fontFamily: "var(--paper-font-sans)",
                  fontSize: 9.5,
                  color: PAPER_COLORS.ink50,
                  marginBottom: 2,
                }}
              >
                학습일
              </div>
              <div
                style={{
                  fontFamily: "var(--paper-font-serif)",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {options.showDate ? (meta.examDate ?? "—") : ""}
              </div>
            </div>
          </div>

          {/* 개념 박스 */}
          {isFirstPage && meta.conceptNote && (
            <div
              style={{
                background: PAPER_COLORS.paper,
                border: `1px solid ${accent}`,
                borderLeft: `5px solid ${accent}`,
                padding: "12px 16px",
                marginBottom: 18,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--paper-font-sans)",
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: readablePaperColor(accent),
                  letterSpacing: "0.16em",
                  marginBottom: 6,
                }}
              >
                ◆ 핵심 개념 정리
              </div>
              <div
                style={{
                  fontFamily: "var(--paper-font-serif)",
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: PAPER_COLORS.ink90,
                }}
              >
                <MarkdownRenderer content={meta.conceptNote} />
              </div>
            </div>
          )}
        </>
      )}

      {isFirstPage && <ExamDetails meta={meta} options={options} />}

      <BodyContainer
        solvingArea={options.solvingArea}
        columns={columns}
        gap={gap}
        columnRule={options.columnDivider ? PAPER_COLORS.ink15 : null}
        splitIndex={splitIndex}
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
