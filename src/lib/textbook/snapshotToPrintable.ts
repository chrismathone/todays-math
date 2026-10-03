import type { TestPrintProblem } from "@/components/print/types";
import type { ProblemSnapshot } from "@/contracts/textbookExchange.contract";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import { assertSafeSvg } from "./assets";

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
  const raster = svg
    ? figures.filter((f) => f.figure.assetId !== svgId)
    : figures;
  // Incomplete dimensions/physical widths remain unknown as a whole in the legacy print reader.
  // Exact per-figure nulls are retained in frozenFigures; they are never assigned to option 1.
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
    content: shown(payload.content),
    answer: shown(payload.answer),
    solution: payload.solution === null ? null : shown(payload.solution),
    questionType: payload.questionType,
    score:
      score === undefined
        ? (snapshot.sourceMetadata?.originalScore ?? null)
        : score,
    figureUrls: raster.map((f) => f.asset.url),
    figureDims: raster.every(
      (f) => f.asset.widthPx !== null && f.asset.heightPx !== null,
    )
      ? raster.flatMap((f) => [f.asset.widthPx!, f.asset.heightPx!])
      : [],
    figureSourceMm: raster.every((f) => f.figure.sourceWidthMm !== null)
      ? raster.map((f) => f.figure.sourceWidthMm!)
      : [],
    choiceFigureIndex: raster.map((f) => f.figure.choiceIndex),
    figureSvg: svg ?? null,
    frozenFigures: payload.figures,
  };
}
