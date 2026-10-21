import type { TestPrintProblem } from "@/components/print/types";
import type { ProblemSnapshot } from "@/contracts/textbookExchange.contract";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import { assertSafeSvg } from "./assets";
import { renumberSnapshotSlots } from "./snapshotSlots";

export interface PrintableSnapshotAsset {
  url: string;
  widthPx: number | null;
  heightPx: number | null;
  svg?: string;
}
export type SnapshotPrintable = TestPrintProblem & {
  choiceFigureIndex: (number | null)[];
  frozenFigures: ProblemSnapshot["payload"]["figures"];
};

/** Display projection only. Never use this transformed model as hash input or merge it with live fields. */
export function snapshotToPrintable(
  snapshot: ProblemSnapshot,
  orderIndex: number,
  resolveAsset: (assetId: string) => PrintableSnapshotAsset,
  score?: number | null,
): SnapshotPrintable {
  const payload = snapshot.payload;
  const shown = fractionViewFor({
    grade: snapshot.sourceMetadata?.grade ?? "",
    content: payload.content,
    answer: payload.answer,
    solution: payload.solution,
  });
  const figures = payload.figures.map((figure) => ({
    figure,
    asset: resolveAsset(figure.assetId),
  }));
  const svgId = snapshot.rawSource?.figureSvgAssetId;
  const svg = svgId
    ? figures.find((f) => f.figure.assetId === svgId)?.asset.svg
    : undefined;
  if (svg) assertSafeSvg(svg);
  const inlineIndex = svg
    ? figures.findIndex((f) => f.figure.assetId === svgId)
    : -1;
  const raster = figures.filter((_, i) => i !== inlineIndex);
  // 그림 자리 `[그림:n]` 은 은행 `figureUrls` 차례다 — SVG 원문을 못 받아 SVG 가 그림 배열에 남으면 번호가 하나 밀린다.
  // 이 투영이 넘기는 배열(raster)의 차례로 옮긴다(`snapshotSlots.ts`). 자리가 없으면 본문 그대로다.
  const slotted = renumberSnapshotSlots(
    payload.content,
    payload.figures,
    svgId,
    figures.map((_, i) => i).filter((i) => i !== inlineIndex),
  );
  // Keep exact per-figure unknowns. The shared sizing rule treats only that index as unknown.
  return {
    id:
      snapshot.source.system === "todays-math"
        ? snapshot.source.problemId
        : snapshot.snapshotId,
    orderIndex,
    problemCode:
      snapshot.source.system === "todays-math"
        ? snapshot.source.problemCode
        : null,
    content: shown(slotted),
    answer: shown(payload.answer),
    solution: payload.solution === null ? null : shown(payload.solution),
    questionType: payload.questionType,
    score:
      score === undefined
        ? (snapshot.sourceMetadata?.originalScore ?? null)
        : score,
    figureUrls: raster.map((f) => f.asset.url),
    figureDims: raster.flatMap((f) => [f.asset.widthPx, f.asset.heightPx]),
    figureSourceMm: raster.map((f) => f.figure.sourceWidthMm),
    choiceFigureIndex: raster.map((f) => f.figure.choiceIndex),
    figureSvg: svg ?? null,
    frozenFigures: payload.figures,
  };
}
