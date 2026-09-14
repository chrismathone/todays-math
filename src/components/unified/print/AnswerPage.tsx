import { MathText } from "@/components/math/MathText";
import { displayFractions } from "../fractionDisplay";
import { A4_DIM } from "./tokens";
import { printPagePadding, scaledItemStyle } from "./geometry";
import { BodyContainer } from "./templates/BodyContainer";
import type { PrintTemplateProps } from "./types";

/** Answers share measured pagination; long solutions and quick keys never truncate. */
export function AnswerPage({
  page,
  totalPages,
  problems,
  startingNumber,
  options,
  meta,
  measure,
  splitIndex,
  itemScales,
}: PrintTemplateProps) {
  const items = problems.map(({ id, variant: p }, index) => (
    <section
      key={id}
      data-measure-idx={index}
      style={{
        fontSize: 12,
        lineHeight: 1.8,
        overflowWrap: "anywhere",
        ...scaledItemStyle(
          { ...options, template: "jeongtong" },
          itemScales?.[index],
        ),
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <strong style={{ color: options.color }}>
          {startingNumber + index}.
        </strong>
        <MathText
          text={displayFractions(p.answer || "정답 미입력", p.grade, p.content)}
        />
      </div>
      {!options.quickAnswerOnly && p.solution && (
        <MathText
          as="div"
          text={displayFractions(p.solution, p.grade, p.content)}
        />
      )}
    </section>
  ));
  if (measure)
    return <div style={{ width: measure.columnWidthPx }}>{items}</div>;
  return (
    <div
      style={{
        width: A4_DIM.width,
        height: A4_DIM.height,
        padding: printPagePadding(options.marginPreset),
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        fontFamily: "var(--paper-font-serif)",
        background: "white",
        color: "#0E0E10",
      }}
    >
      <header
        style={{
          borderBottom: `2px solid ${options.color}`,
          marginBottom: 16,
          paddingBottom: 12,
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--paper-font-sans)",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {meta.title} · {options.quickAnswerOnly ? "빠른 정답" : "정답과 해설"}
        </h2>
      </header>
      <BodyContainer
        columns={options.columns}
        gap={options.spacing}
        columnGap={26}
        columnRule={options.columnDivider ? "#D4D4D8" : null}
        splitIndex={splitIndex}
      >
        {items}
      </BodyContainer>
      <footer
        style={{
          flexShrink: 0,
          textAlign: "center",
          marginTop: 12,
          fontSize: 11,
        }}
      >
        {page} / {totalPages}
      </footer>
    </div>
  );
}
