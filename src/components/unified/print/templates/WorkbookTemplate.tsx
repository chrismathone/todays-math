import { PrintHeader } from "../PrintHeader";
import { printPagePadding, scaledItemStyle } from "../geometry";
// WorkbookTemplate.tsx (T4) — 학원 워크북 (풀이공간 포함)
// design_handoff 카피 + import path 조정 + options.accentColor → options.color.

import type { ProblemReview } from "../types";
import { bodyFontSize } from "../geometry";
import { PAPER_COLORS, A4_DIM } from "../tokens";
import { readablePaperColor } from "../readableColor";
import { BodyContainer } from "./BodyContainer";
import { ProblemHeader } from "./ProblemMeta";
import { ProblemBody } from "./ProblemBody";
import type { PrintTemplateProps } from "../types";

export function WorkbookTemplate({
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
  measure,
}: PrintTemplateProps) {
  const accent = options.color || PAPER_COLORS.accentRed;
  const fs = bodyFontSize("workbook", columns);
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
          // 1단: 카드가 flex: 1 로 균등 stretch → 풀이공간 자동 확장
          flex: columns === 1 ? 1 : undefined,
          display: embeddedSolvingArea ? "grid" : "block",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 16,
          border: `1px solid ${PAPER_COLORS.ink15}`,
          padding: "12px 14px",
          background: PAPER_COLORS.paper,
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
          {/* 배점은 ProblemBody.repositionScore 가 발문 끝에(§45) — 번호 행 표시 X. */}
          <ProblemBody problem={p.variant} fontSize={fs} options={options} />
        </div>
        {/* 풀이공간 — 1단에서만 (카드 flex:1 → grid stretch → 자연 확장) */}
        {embeddedSolvingArea && (
          <div
            style={{
              borderLeft: `1px dashed ${PAPER_COLORS.ink30}`,
              padding: "0 6px 0 12px",
              backgroundImage: `linear-gradient(transparent 0px, transparent 23px, ${PAPER_COLORS.ink08} 24px)`,
              backgroundSize: "100% 24px",
              minHeight: 100,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -2,
                left: 12,
                background: PAPER_COLORS.paper,
                padding: "0 6px",
                fontFamily: "var(--paper-font-sans)",
                fontSize: 9.5,
                fontWeight: 700,
                color: readablePaperColor(accent),
                letterSpacing: "0.1em",
              }}
            >
              풀이 SCRATCH
            </div>
          </div>
        )}
      </div>
    );
  };

  // 측정 모드 — 본문만 1단 flow. (1단 stretch 는 printPack 개수패킹이라 높이 무시,
  // 2단 block 은 실측.)
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
        distribute={options.layoutMode === "count"}
        style={{ marginTop: 16 }}
      >
        {problems.map(renderItem)}
      </BodyContainer>

      {/* 푸터 */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--paper-font-sans)",
          fontSize: 9.5,
          color: PAPER_COLORS.ink50,
          flexShrink: 0,
        }}
      >
        <span>
          {meta.academyName ?? "워크북"} · {meta.title}
          {columns === 2 ? " · 컴팩트" : ""}
        </span>
        <span style={{ fontWeight: 700 }}>page {page}</span>
      </div>
    </div>
  );
}
