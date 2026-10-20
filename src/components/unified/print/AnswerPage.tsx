import { memo, type CSSProperties } from "react";
import { MathText, SolutionText } from "@/components/math/MathText";
import { fractionViewFor } from "../fractionDisplay";
import { printPagePadding, scaledItemStyle } from "./geometry";
import { A4_DIM } from "./tokens";
import { BodyContainer } from "./templates/BodyContainer";
import { ArithmeticRoundLabel } from "./templates/ProblemMeta";
import { EnglishAnswerPage } from "./EnglishAnswerPage";
import type { PrintOptions, PrintTemplateProps, ProblemReview } from "./types";
import type {
  AnswerKeyRow,
  AnswerPageLayout,
  AnswerSpan,
} from "./answerKeyLayout";
import s from "./AnswerPage.module.css";

export interface AnswerPageProps extends PrintTemplateProps {
  layout?: AnswerPageLayout;
}

const AnswerValue = memo(function AnswerValue({
  problem,
}: {
  problem: ProblemReview["variant"];
}) {
  return (
    <MathText
      text={fractionViewFor(problem)(problem.answer || "정답 미입력")}
    />
  );
});

export function QuickAnswerCell({
  problem,
  number,
  span = 1,
  style,
  measureKey,
  natural,
  scale,
}: {
  problem: ProblemReview["variant"];
  number: number;
  span?: AnswerSpan;
  style?: CSSProperties;
  measureKey?: string;
  natural?: boolean;
  /** Below 1 only for a five-cell answer measured wider than the grid. */
  scale?: number;
}) {
  return (
    <div
      role="cell"
      aria-colspan={span}
      className={`${s.keyCell} ${natural ? s.natural : ""}`}
      data-answer-number={number}
      data-answer-span={span}
      data-answer-candidate={measureKey}
      data-measure-idx={measureKey ? undefined : number - 1}
      style={{ gridColumn: `span ${span}`, ...style }}
    >
      <strong className={s.keyNumber}>{number}</strong>
      <div className={s.keyAnswer} data-answer-value>
        {scale !== undefined && scale < 1 ? (
          // em sizing shrinks KaTeX with the text, so the drawn width follows.
          <span data-answer-scale={scale} style={{ fontSize: `${scale}em` }}>
            <AnswerValue problem={problem} />
          </span>
        ) : (
          <AnswerValue problem={problem} />
        )}
      </div>
    </div>
  );
}

export function AnswerSolution({
  problem,
  number,
  options,
  scale = 1,
  measureIndex,
}: {
  problem: ProblemReview["variant"];
  number: number;
  options: PrintOptions;
  scale?: number;
  measureIndex?: number;
}) {
  const shown = fractionViewFor(problem);
  return (
    <section
      className={s.solution}
      data-answer-solution={number}
      data-measure-idx={measureIndex}
      style={scaledItemStyle({ ...options, template: "jeongtong" }, scale)}
    >
      <div className={s.solutionAnswer}>
        <strong style={{ color: options.color }}>{number}.</strong>
        <AnswerValue problem={problem} />
      </div>
      {problem.solution ? (
        <SolutionText text={shown(problem.solution)} />
      ) : null}
    </section>
  );
}

export function AnswerSolutionHeading() {
  return <h3 className={s.solutionHeading}>정답과 해설</h3>;
}

function QuickAnswerTable({
  rows,
  problems,
  startingNumber,
}: {
  rows: AnswerKeyRow[];
  problems: ProblemReview[];
  startingNumber: number;
}) {
  return (
    <div
      role="table"
      aria-label="빠른 채점표"
      className={s.keyTable}
      data-answer-key
    >
      {rows.map((row, index) => {
        const used = row.cells.reduce((sum, cell) => sum + cell.span, 0);
        return (
          <div role="row" key={index} className={s.keyRow}>
            {row.cells.map((cell) => (
              <QuickAnswerCell
                key={problems[cell.index].id}
                problem={problems[cell.index].variant}
                number={
                  problems[cell.index].variant.arithmetic?.number ??
                  problems[cell.index].number ??
                  startingNumber + cell.index
                }
                span={cell.span}
                scale={cell.scale}
              />
            ))}
            {used < 5 ? (
              <div
                aria-hidden="true"
                className={s.emptyCell}
                style={{ gridColumn: `span ${5 - used}` }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** One component is used by previews, the export DOM, and measurement probes. */
export function AnswerPage(props: AnswerPageProps) {
  const {
    page,
    round,
    totalPages,
    problems,
    startingNumber,
    options,
    meta,
    measure,
    layout,
  } = props;
  // English owns structured answer/evidence rendering; keep its existing path.
  if (problems.some((problem) => problem.variant.english))
    return <EnglishAnswerPage {...props} />;
  const allIndices = problems.map((_, index) => index);
  const fallbackRows: AnswerKeyRow[] = [];
  for (let i = 0; i < problems.length; i += 5)
    fallbackRows.push({
      height: 0,
      cells: allIndices.slice(i, i + 5).map((index) => ({ index, span: 1 })),
    });
  const rows = layout?.keyRows ?? fallbackRows;
  const solutionIndices = options.quickAnswerOnly
    ? []
    : (layout?.solutionIndices ?? allIndices);
  const solutions = solutionIndices.map((index, offset) => (
    <AnswerSolution
      key={problems[index].id}
      problem={problems[index].variant}
      number={
        problems[index].variant.arithmetic?.number ??
        problems[index].number ??
        startingNumber + index
      }
      options={options}
      scale={layout?.scales[offset] ?? props.itemScales?.[offset]}
      measureIndex={measure ? index : undefined}
    />
  ));
  // Compatibility for the solution renderer's existing direct measurement calls.
  if (measure)
    return <div style={{ width: measure.columnWidthPx }}>{solutions}</div>;
  return (
    <div
      className={s.page}
      data-answer-page
      style={
        {
          width: A4_DIM.width,
          height: A4_DIM.height,
          padding: printPagePadding(options.marginPreset),
          "--answer-accent": options.color,
        } as CSSProperties
      }
    >
      <header className={s.header}>
        <div className={s.headerTop}>
          <h2>
            {meta.title} ·{" "}
            {options.quickAnswerOnly ? "빠른 정답" : "정답과 해설"}
          </h2>
          <ArithmeticRoundLabel
            round={round}
            style={{
              border: `1px solid ${options.color}`,
              padding: "4px 12px",
            }}
          />
        </div>
        <div className={s.headerLabel}>
          {rows.length || !solutions.length ? "빠른 채점표" : "정답과 해설"}
        </div>
      </header>
      <div className={s.content} data-answer-body>
        {rows.length ? (
          <QuickAnswerTable
            rows={rows}
            problems={problems}
            startingNumber={startingNumber}
          />
        ) : null}
        {rows.length && solutions.length ? <AnswerSolutionHeading /> : null}
        {solutions.length ? (
          <BodyContainer
            columns={options.columns}
            gap={Math.max(0, options.spacing)}
            columnGap={26}
            columnRule={options.columnDivider ? "#D4D4D8" : null}
            splitIndex={layout?.splitIndex ?? props.splitIndex}
          >
            {solutions}
          </BodyContainer>
        ) : null}
      </div>
      <footer className={s.footer}>
        <span>{meta.subject}</span>
        <span>
          {page} / {totalPages}
        </span>
      </footer>
    </div>
  );
}
