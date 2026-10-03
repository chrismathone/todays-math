import { checkChoiceFigureIndex } from "../../../src/lib/problem/choiceFigureIndex";

export interface GraphChoiceRepair {
  stem: string;
  choices: string[];
  why: string;
}

/** 색인의 순서를 유지한다. 파일명의 접미사를 추측해 번호를 붙이지 않는다. */
export function graphFigureFields(
  repair: GraphChoiceRepair | undefined,
  figures: readonly { file: string }[],
): { choiceFigureIndex?: number[] } {
  if (!repair) return {};
  const files = [repair.stem, ...repair.choices];
  if (
    repair.choices.length !== 5 ||
    new Set(files).size !== 6 ||
    figures.length !== 6 ||
    new Set(figures.map((f) => f.file)).size !== 6 ||
    figures.some((f) => !files.includes(f.file))
  ) {
    throw new Error(
      "[중단] 검토한 발문 그림 1장·보기 그림 5장과 원본 색인이 다르다",
    );
  }
  const choiceFigureIndex = figures.map((f) => files.indexOf(f.file));
  if (
    !checkChoiceFigureIndex(figures.length, choiceFigureIndex).ok ||
    !choiceFigureIndex.includes(0)
  ) {
    throw new Error("[중단] 그래프 보기 번호가 빠지거나 중복됐다");
  }
  return { choiceFigureIndex };
}
