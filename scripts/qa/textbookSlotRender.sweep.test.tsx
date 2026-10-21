/**
 * 교과서 그림 행 전수 — 3단계(양식 구성 · 출력)가 문항을 그리는 부품에 실제 행을 넣어 본다(2026-10-21 출처 고르기 지시).
 * 조판(`ProblemContent` 정적 렌더) · 넘침 자(`estimateProblemPx`) · 자리 검사(`checkFigureSlots`) — 셋 다 `slottedProblem` 을 부른다.
 * 행은 `dump-textbook-slot-rows-live.ts` 가 읽기 전용으로 저장소 밖에 쓴 파일이다(TEXTBOOK_SLOT_ROWS). 요약만 쓴다(본문 없음).
 *
 * TEXTBOOK_SLOT_ROWS=<rows.json> TEXTBOOK_SLOT_SUMMARY=<summary.json> \
 *   npx vitest run --config scripts/qa/textbook-slot-render-vitest.config.mts --maxWorkers=1
 */
import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import { checkFigureSlots } from "@/lib/problem/figureSlots";
import { estimateProblemPx } from "@/lib/printOverflow";

type Row = {
  id: string;
  content: string;
  figureUrls: string[];
  choiceFigureIndex: number[];
  slot: boolean;
  eligible: boolean;
};
const path = process.env.TEXTBOOK_SLOT_ROWS;

describe.skipIf(!path)("교과서 그림 행 — 3단계 렌더 부품", () => {
  it("던지지 않고 · 자리 행은 자리마다 그림이 서고 · 자리 표기가 글로 새지 않는다", () => {
    const rows = JSON.parse(readFileSync(path!, "utf8")) as Row[];
    const thrown: { id: string; where: string; error: string }[] = [];
    const slotProblems: {
      id: string;
      eligible: boolean;
      problems: string[];
    }[] = [];
    const leaked: {
      id: string;
      eligible: boolean;
      placed: number;
      marks: number;
    }[] = [];
    let slotRows = 0;
    for (const row of rows) {
      const choiceFigureIndex = row.choiceFigureIndex.length
        ? row.choiceFigureIndex
        : undefined;
      let html = "";
      try {
        html = renderToStaticMarkup(
          <ProblemContent
            content={row.content}
            figureUrls={row.figureUrls}
            choiceFigureIndex={choiceFigureIndex}
            deferFigures={false}
          />,
        );
      } catch (error) {
        thrown.push({
          id: row.id,
          where: "ProblemContent",
          error: String(error).slice(0, 200),
        });
      }
      try {
        estimateProblemPx(
          row.content,
          row.figureUrls.map(() => null),
          null,
          undefined,
          choiceFigureIndex,
        );
      } catch (error) {
        thrown.push({
          id: row.id,
          where: "estimateProblemPx",
          error: String(error).slice(0, 200),
        });
      }
      if (!row.slot) continue;
      slotRows++;
      const problems = checkFigureSlots(
        row.content,
        row.figureUrls.length,
        choiceFigureIndex,
      );
      if (problems.length)
        slotProblems.push({
          id: row.id,
          eligible: row.eligible,
          problems: problems.map((p) => p.replace(/\s+/g, " ").slice(0, 120)),
        });
      const marks = row.content
        .split("\n")
        .filter((line) => /^\s*\[그림:\d+\]/.test(line)).length;
      const placed = [...html.matchAll(/data-figure-slot="/g)].length;
      if (html.includes("[그림:") || placed === 0)
        leaked.push({ id: row.id, eligible: row.eligible, placed, marks });
    }
    const summary = {
      rows: rows.length,
      slotRows,
      thrown: thrown.length,
      slotProblemRows: slotProblems.length,
      slotProblemRowsEligible: slotProblems.filter((r) => r.eligible).length,
      leakedRows: leaked.length,
      leakedRowsEligible: leaked.filter((r) => r.eligible).length,
      thrownSamples: thrown.slice(0, 20),
      slotProblems,
      leaked,
    };
    if (process.env.TEXTBOOK_SLOT_SUMMARY)
      writeFileSync(
        process.env.TEXTBOOK_SLOT_SUMMARY,
        JSON.stringify(summary, null, 2),
      );
    console.log(
      JSON.stringify({
        rows: summary.rows,
        slotRows,
        thrown: summary.thrown,
        slotProblemRows: summary.slotProblemRows,
        slotProblemRowsEligible: summary.slotProblemRowsEligible,
        leakedRows: summary.leakedRows,
        leakedRowsEligible: summary.leakedRowsEligible,
      }),
    );
    expect(thrown).toEqual([]);
    // 자리를 못 세운 행 · 자리 표기가 지면에 글로 남는 행도 결함이다(던지지 않아도)
    expect(slotProblems).toEqual([]);
    expect(leaked).toEqual([]);
  });
});
