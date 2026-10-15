/* eslint-disable @next/next/no-img-element -- source-local figure resources */
import { Fragment, type ReactNode } from "react";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import {
  blocksToMarkdown,
  tableCellMath,
} from "@/lib/mathgen/blocksToMarkdown";
import type { ContentBlock, ChoiceGroup } from "@/lib/mathgen/contracts";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { layoutQuotedBoxes } from "@/lib/math/boxLayout";
import { CHOICE_MARKS } from "@/lib/math/circledNumber";
import {
  choiceColumnCount,
  type PrintChoiceLayout,
} from "@/lib/math/choiceLayout";
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
  choiceLayout = "auto",
}: {
  problem: StudioProblem;
  print: boolean;
  hideScores?: boolean;
  /**
   * 보기 번호 배치 — 원장님이 시험지 설정에서 고른 값(2026-09-20).
   * 「자동」이면 **원본 시험지의 배치 힌트**(`ocr.choicesLayout`)가 그대로 이긴다 —
   * 오늘 그대로다. 고른 값이 있으면 그것이 힌트를 이긴다(문서 전체를 같은 꼴로).
   */
  choiceLayout?: PrintChoiceLayout;
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
    maxWidthMm: placements[index]?.maxWidthMm,
  }));
  const used = new Set<number>();
  // 대분수 결정은 문항 하나에 한 번 — 본문·보기·소문항이 같은 모양이다(정답지와도 같다).
  const shownFractions = fractionViewFor(problem);
  // 〈보기〉 배치(트랙 46): 칸마다 그림 하나인 상자는 원본 그림 자리가 열 수를 안다 — 검수 카드와
  // 같은 규칙(`layoutQuotedBoxes`)에 작업실이 원본 쪽에서 오려 낸 자리를 넘긴다(원장님 문제 22).
  const boxLayout = {
    figureRect: (index: number) => problem.studioCrop?.figures?.[index]?.rect,
  };
  const markFigures = (text: string) => {
    for (const match of text.matchAll(/\[그림\s*(\d+)\]/g))
      used.add(Number(match[1]) - 1);
    return shownFractions(layoutQuotedBoxes(text, boxLayout));
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
                      {/* 칸을 수식으로 볼지는 검수 카드·편집기와 같은 규칙 하나(`tableCellMath`) */}
                      {markdown(tableCellMath(cell))}
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
    // 원장님이 고른 값이 원본 힌트를 이긴다. 「자동」이면 힌트 → 폭 판정 순서로 오늘 그대로.
    const chosen = choiceLayout !== "auto";
    const layout = chosen ? choiceLayout : (metadata?.choicesLayout ?? "auto");
    const columns = choiceColumnCount(
      layout,
      choices.map((choice) => blocksToMarkdown(choice.contents)),
      chosen,
    );
    return (
      <div
        data-native-choices={layout}
        // HWPX 에 칸을 알린다 — 분수 보기가 한글에서 번호와 다른 줄로 떨어지지 않게(트랙 46).
        data-hwpx-grid=""
        // 글 칸은 기준선 맞춤 — 분수 보기 옆 칸·번호가 분수의 기준선에 선다(한글과 같다, 트랙 51).
        // 그림 보기만 위쪽(그림 바닥이 기준선이 되면 번호가 그림 아래로 내려간다).
        className="mt-3 grid items-baseline gap-x-4 gap-y-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {choices.map((choice) => (
          <div
            key={choice.number}
            data-native-choice={choice.number}
            className="flex items-baseline gap-1.5 has-[img]:items-start has-[img]:self-start"
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
  const fallback = !data
    ? parseProblemContent(layoutQuotedBoxes(problem.content, boxLayout))
    : null;
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
              style={figureWidthStyle(figure.sourceMm, figure.maxWidthMm)}
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
