// ProblemMeta.tsx
// 문항 번호 + 메타(단원/난이도) + 점수 라벨. 템플릿 별로 스타일 다름.
//
// design_handoff/src/ProblemMeta.tsx 그대로 — import path 만 ../tokens / ../types.

import React from "react";
import { MathText } from "@/components/math/MathText";
import { arithmeticTypeTitle } from "@/lib/arithmetic-v2/presentation/text";
import { arithmeticGroupInstructionMarkup } from "@/lib/arithmeticOutputLayout";
import { PAPER_COLORS } from "../tokens";
import { inkOnColor, readablePaperColor } from "../readableColor";
import type { PrintOptions, PrintTemplate, ProblemReview } from "../types";

/** One shared first row, also rendered unchanged by the measurement pass. */
export function ProblemHeader({
  num,
  problem,
  sectionHeading,
  sectionInstruction,
  options,
  accent = options.color,
}: {
  num: number;
  problem: ProblemReview["variant"];
  sectionHeading?: string;
  sectionInstruction?: string;
  options: PrintOptions;
  accent?: string;
}) {
  const topic = options.showChapter && !problem.arithmetic ? problem.topic : "";
  const difficulty =
    options.showDifficulty && !problem.arithmetic ? problem.difficulty : "";
  const metadata = [topic, difficulty].filter(Boolean).join(" · ");
  return (
    <>
      {sectionHeading && (
        <h3
          data-arithmetic-type-heading
          style={{
            margin: "0 0 10px",
            paddingBottom: 6,
            borderBottom: `1px solid ${PAPER_COLORS.ink30}`,
            fontFamily: "var(--paper-font-sans)",
            fontSize: 12,
            lineHeight: 1.5,
            fontWeight: 700,
            color: PAPER_COLORS.ink,
            overflowWrap: "anywhere",
          }}
        >
          <MathText text={arithmeticTypeTitle(sectionHeading)} />
        </h3>
      )}
      {sectionHeading && sectionInstruction && (
        <div
          data-arithmetic-group-instruction
          style={{
            margin: "0 0 10px",
            fontSize: 13,
            lineHeight: 1.6,
            fontWeight: 600,
            color: PAPER_COLORS.ink,
            overflowWrap: "anywhere",
          }}
        >
          <MathText
            text={arithmeticGroupInstructionMarkup(sectionInstruction)}
          />
        </div>
      )}
      <div
        data-problem-header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
          <QuestionNumber
            template={options.template}
            num={
              problem.arithmetic?.number ??
              problem.english?.displayNumber ??
              num
            }
            accent={accent}
          />
        </span>
        {metadata && (
          <span
            data-problem-metadata
            title={metadata}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 4,
              fontFamily: "var(--paper-font-sans)",
              fontSize: 10,
              color: PAPER_COLORS.ink50,
              minWidth: 0,
              whiteSpace: "nowrap",
              lineHeight: 1.4,
            }}
          >
            {topic && (
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {topic}
              </span>
            )}
            {topic && difficulty && (
              <span aria-hidden style={{ flexShrink: 0 }}>
                {" "}
                ·{" "}
              </span>
            )}
            {difficulty && <span style={{ flexShrink: 0 }}>{difficulty}</span>}
          </span>
        )}
      </div>
    </>
  );
}

/** Inline field inside each template's own title band or information table. */
export function ArithmeticRoundLabel({
  round,
  style,
}: {
  round?: number;
  style?: React.CSSProperties;
}) {
  if (round === undefined) return null;
  return (
    <span
      data-arithmetic-round
      style={{
        display: "inline-block",
        flexShrink: 0,
        fontFamily: "var(--paper-font-sans)",
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: 700,
        letterSpacing: "normal",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {round}회차
    </span>
  );
}

interface QuestionNumberProps {
  template: PrintTemplate;
  num: number;
  accent: string;
}

export function QuestionNumber({ num, accent }: QuestionNumberProps) {
  return (
    <span
      data-question-number
      style={{
        display: "inline-grid",
        placeItems: "center",
        minWidth: 26,
        minHeight: 26,
        padding: "0 4px",
        background: accent,
        color: inkOnColor(accent),
        border: `1px solid ${PAPER_COLORS.ink15}`,
        fontFamily: "var(--paper-font-sans)",
        fontSize: 14,
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {String(num).padStart(2, "0")}
    </span>
  );
}

interface PointsLabelProps {
  points: number;
  style?: React.CSSProperties;
}

export function PointsLabel({ points, style }: PointsLabelProps) {
  return (
    <span
      style={{
        fontFamily: "var(--paper-font-serif)",
        fontSize: 11,
        color: PAPER_COLORS.ink70,
        marginLeft: 6,
        ...style,
      }}
    >
      [{points}점]
    </span>
  );
}

interface TopicLabelProps {
  topic: string;
  accent?: string;
}

/** 단원명 — 모던/워크북에서 사용. */
export function TopicLabel({ topic, accent }: TopicLabelProps) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: accent ? readablePaperColor(accent) : PAPER_COLORS.ink50,
        fontFamily: "var(--paper-font-sans)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {topic}
    </span>
  );
}
