// ProblemMeta.tsx
// 문항 번호 + 메타(단원/난이도) + 점수 라벨. 템플릿 별로 스타일 다름.
//
// design_handoff/src/ProblemMeta.tsx 그대로 — import path 만 ../tokens / ../types.

import React from "react";
import { MathText } from "@/components/math/MathText";
import { arithmeticTypeTitle } from "@/lib/arithmetic-v2/presentation/text";
import { PAPER_COLORS } from "../tokens";
import { inkOnColor, readablePaperColor } from "../readableColor";
import type { PrintOptions, PrintTemplate, ProblemReview } from "../types";

/** One shared first row, also rendered unchanged by the measurement pass. */
export function ProblemHeader({
  num,
  problem,
  sectionHeading,
  options,
  accent = options.color,
}: {
  num: number;
  problem: ProblemReview["variant"];
  sectionHeading?: string;
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

export function QuestionNumber({ template, num, accent }: QuestionNumberProps) {
  const textAccent = readablePaperColor(accent);
  const boxWidth =
    num >= 1000 ? { minWidth: 22, padding: "0 4px" } : { width: 22 };
  const printStyle: React.CSSProperties = {
    WebkitPrintColorAdjust: "exact" as const,
  };

  switch (template) {
    case "pyeongga":
      // 평가원 — 두꺼운 본문 글자 번호 + 마침표
      return (
        <span
          style={{
            fontWeight: 800,
            fontFamily: "var(--paper-font-serif)",
            fontSize: 14,
            color: textAccent,
            marginRight: 6,
            ...printStyle,
          }}
        >
          {num}.
        </span>
      );

    case "jeongtong":
      // 정통 — 단순 번호 + 마침표 (큰 글자)
      return (
        <span
          style={{
            fontWeight: 800,
            fontFamily: "var(--paper-font-serif)",
            fontSize: 14,
            color: textAccent,
            marginRight: 6,
            ...printStyle,
          }}
        >
          {num}.
        </span>
      );

    case "modern":
      // 모던 — 큰 sans-serif 번호, accent 색, zero-pad
      return (
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: textAccent,
            fontFamily: "var(--paper-font-sans)",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            ...printStyle,
          }}
        >
          {String(num).padStart(2, "0")}.
        </span>
      );

    case "workbook":
      // 워크북 — 채워진 박스
      return (
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            ...boxWidth,
            height: 22,
            background: accent,
            color: inkOnColor(accent),
            fontWeight: 700,
            fontSize: 12,
            marginRight: 6,
            verticalAlign: "middle",
            ...printStyle,
          }}
        >
          {num}
        </span>
      );

    case "jaseup":
      // 자습 — "문 N" 큰 serif
      return (
        <span
          style={{
            fontFamily: "var(--paper-font-serif)",
            fontWeight: 800,
            fontSize: 18,
            color: textAccent,
            marginRight: 8,
            lineHeight: 1,
            ...printStyle,
          }}
        >
          문 {num}
        </span>
      );

    case "yuhyung":
      // 유형 — 외곽선 박스
      return (
        <span
          style={{
            display: "inline-grid",
            placeItems: "center",
            ...boxWidth,
            height: 22,
            border: `1.5px solid ${accent}`,
            fontWeight: 700,
            fontSize: 12,
            marginRight: 6,
            verticalAlign: "middle",
            color: textAccent,
            ...printStyle,
          }}
        >
          {num}
        </span>
      );

    default:
      return <span style={{ fontWeight: 700, marginRight: 6 }}>{num}.</span>;
  }
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
