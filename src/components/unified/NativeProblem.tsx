/* eslint-disable @next/next/no-img-element -- source-local figure resources */
import { Fragment, type ReactNode } from "react";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import type { ContentBlock, ChoiceGroup } from "@/lib/mathgen/contracts";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { CHOICE_MARKS } from "@/lib/math/circledNumber";
import { fitsTwoColumns } from "@/lib/math/displayWidth";
import { figureWidthStyle, parseFigureDimensions } from "@/lib/figurePrintSize";
import { fractionViewFor } from "./fractionDisplay";
import {
  repositionScore,
  stripLeadingProblemNumber,
} from "./nativeProblemLayout";
import type { StudioProblem } from "./types";
import { hideQuestionScores } from "./questionScoreDisplay";

/** Typed source content shares the existing math renderer and target physical sizing policy. */
export default function NativeProblem({
  problem,
  print,
  renderFigure,
  hideScores = false,
}: {
  problem: StudioProblem;
  print: boolean;
  hideScores?: boolean;
  /** Decorate figures in place using their original zero-based source index. */
  renderFigure?: (index: number, image: ReactNode) => ReactNode;
}) {
  const metadata = problem.ocr;
  const data = metadata?.contentEdited ? undefined : metadata;
  const placements = parseFigureDimensions(
    problem.figureUrls.length,
    problem.figureDims,
    problem.figureSourceMm,
    problem.figureUrls,
  );
  const figures = problem.figureUrls.map((src, index) => ({
    src,
    index,
    sourceMm: placements[index]?.sourceMm,
  }));
  const used = new Set<number>();
  // 대분수 결정은 문항 하나에 한 번 — 본문·보기·소문항이 같은 모양이다(정답지와도 같다).
  const shownFractions = fractionViewFor(problem);
  const markFigures = (text: string) => {
    for (const match of text.matchAll(/\[그림\s*(\d+)\]/g))
      used.add(Number(match[1]) - 1);
    return shownFractions(text);
  };
  const markdown = (text: string, emphasizeNegation = false) => (
    <MarkdownRenderer
      content={markFigures(text)}
      nativeFigures={figures}
      renderNativeFigure={renderFigure}
      emphasizeNegation={emphasizeNegation}
    />
  );

  const renderBlocks = (
    blocks: ContentBlock[],
    transform: (text: string) => string = (text) => text,
    emphasize = false,
  ): ReactNode => {
    const tables: string[][][] = [];
    // Keep source normalization across text/equation boundaries; native tables remain real cells.
    const serialized = blocksToMarkdown(
      blocks.map((block) => {
        if (block.type !== "table") return block;
        tables.push(block.rows);
        return {
          type: "text",
          value: `\n\n[원본표${tables.length}]\n\n`,
          rows: [],
        };
      }),
    );
    return transform(serialized)
      .split(/(\[원본표\d+\])/)
      .map((part, index) => {
        const table = /^\[원본표(\d+)\]$/.exec(part);
        if (!table)
          return part.trim() ? (
            <Fragment key={index}>{markdown(part, emphasize)}</Fragment>
          ) : null;
        const rows = tables[Number(table[1]) - 1];
        if (!rows) return markdown(part);
        return (
          <table
            key={index}
            data-native-table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              margin: "8px 0",
            }}
          >
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      style={{
                        border: "1px solid #888888",
                        padding: "3px 6px",
                        textAlign: "center",
                      }}
                    >
                      {markdown(
                        /[\\^_{}]/.test(cell) && !cell.includes("$")
                          ? `$${cell}$`
                          : cell,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      });
  };
  const choiceGrid = (choices: ChoiceGroup[]) => {
    if (!choices.length) return null;
    const layout = metadata?.choicesLayout ?? "auto";
    const columns =
      ({ "1x5": 5, "2x3": 3, "3x2": 2, "5x1": 1 } as Record<string, number>)[
        layout
      ] ??
      (fitsTwoColumns(
        choices.map((choice) => blocksToMarkdown(choice.contents)),
      )
        ? 2
        : 1);
    return (
      <div
        data-native-choices={layout}
        className="mt-3 grid gap-x-4 gap-y-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {choices.map((choice) => (
          <div
            key={choice.number}
            data-native-choice={choice.number}
            className="flex items-start gap-1.5"
          >
            <span>
              {CHOICE_MARKS[choice.number - 1] ?? `(${choice.number})`}
            </span>
            <div className="min-w-0 flex-1 [&_p]:my-0">
              {renderBlocks(choice.contents, (text) =>
                text.replace(/^[①-⑳]\s*/, ""),
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };
  const score = data?.printedScore ?? data?.score;
  const nativeBody = data
    ? renderBlocks(
        data.blocks,
        (text) =>
          repositionScore(
            stripLeadingProblemNumber(text, data.number),
            score,
            !hideScores,
          ),
        true,
      )
    : null;
  const fallback = !data ? parseProblemContent(problem.content) : null;
  const body = data
    ? nativeBody
    : markdown(
        hideScores
          ? hideQuestionScores(fallback!.question)
          : fallback!.question,
        true,
      );
  const choices = data
    ? choiceGrid(data.choiceGroups)
    : choiceGrid(
        fallback!.choices.map((value, index) => ({
          number: index + 1,
          contents: [{ type: "text", value, rows: [] }],
        })),
      );
  const subQuestions = data?.subQuestions.map((sub) => (
    <div key={sub.number} data-native-subquestion={sub.number}>
      {renderBlocks(
        sub.contents,
        (text) =>
          `(${sub.number}) ${repositionScore(text.replace(/^\s*\(\d+\)\s*/, ""), sub.printedScore ?? sub.score, !hideScores)}`,
        true,
      )}
      {choiceGrid(sub.choices ?? [])}
      {print && !sub.choices?.length && (
        <div data-native-solve-space aria-hidden style={{ height: 60 }} />
      )}
    </div>
  ));
  return (
    <div data-native-problem>
      {data?.labelType &&
        !blocksToMarkdown(data.blocks).includes(data.labelType) && (
          <span className="text-sm font-semibold">[{data.labelType}]</span>
        )}
      {body}
      {figures
        .filter((figure) => !used.has(figure.index))
        .map((figure) => {
          const image = (
            <img
              src={figure.src}
              alt="문항 그림"
              className="mx-auto my-2 block h-auto max-w-full mix-blend-multiply"
              style={figureWidthStyle(figure.sourceMm)}
            />
          );
          return (
            <Fragment key={figure.index}>
              {renderFigure ? renderFigure(figure.index, image) : image}
            </Fragment>
          );
        })}
      {choices}
      {subQuestions}
    </div>
  );
}
