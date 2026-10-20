import { MathText, SolutionText } from "@/components/math/MathText";
import { fractionViewFor } from "../fractionDisplay";
import { A4_DIM } from "./tokens";
import { printPagePadding, scaledItemStyle } from "./geometry";
import { BodyContainer } from "./templates/BodyContainer";
import type { PrintTemplateProps } from "./types";
import { useEnglishPrintRenderer } from "./EnglishPrintRenderer";
import { ArithmeticRoundLabel } from "./templates/ProblemMeta";

function EnglishAnswer(props: {
  content: NonNullable<
    PrintTemplateProps["problems"][number]["variant"]["english"]
  >;
  quick?: boolean;
}) {
  const { Answer } = useEnglishPrintRenderer();
  return <Answer {...props} />;
}

/** Answers share measured pagination; long solutions and quick keys never truncate. */
export function EnglishAnswerPage({
  page,
  round,
  totalPages,
  problems,
  startingNumber,
  options,
  meta,
  measure,
  splitIndex,
  itemScales,
}: PrintTemplateProps) {
  const items = problems.map(({ id, variant: p }, index) => {
    // 문제지(NativeProblem)와 같은 결정 — 한 문항의 정답·해설·본문이 같은 모양이다.
    const shown = fractionViewFor(p);
    return (
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
        {p.english ? (
          <EnglishAnswer content={p.english} quick={options.quickAnswerOnly} />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <strong style={{ color: options.color }}>
                {p.arithmetic?.number ?? startingNumber + index}.
              </strong>
              <MathText text={shown(p.answer || "정답 미입력")} />
            </div>
            {!options.quickAnswerOnly && p.solution && (
              // 해설은 한 조합(`SolutionText` — 줄 나눔 → MathText)만 지난다. 화면·정답지와 같은 줄.
              <SolutionText text={shown(p.solution)} />
            )}
          </>
        )}
      </section>
    );
  });
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
          ...(round !== undefined
            ? {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }
            : {}),
        }}
      >
        <h2
          style={{
            fontFamily: "var(--paper-font-sans)",
            fontSize: 18,
            fontWeight: 800,
            ...(round !== undefined
              ? { minWidth: 0, overflowWrap: "anywhere" }
              : {}),
          }}
        >
          {meta.title} · {options.quickAnswerOnly ? "빠른 정답" : "정답과 해설"}
        </h2>
        <ArithmeticRoundLabel
          round={round}
          style={{ border: `1px solid ${options.color}`, padding: "4px 12px" }}
        />
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
