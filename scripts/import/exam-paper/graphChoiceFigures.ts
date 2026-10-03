import { checkChoiceFigureIndex } from "../../../src/lib/problem/choiceFigureIndex";

export interface GraphChoiceRepair {
  /** null이면 발문 그림이 없다는 검토 결과다. */
  stem: string | null;
  choices: string[];
  /** 추출기가 다른 문항에 붙였을 때만 그 번호를 명시한다. */
  sourceNumber?: number;
  why: string;
}

/** 색인의 순서를 유지한다. 파일명의 접미사를 추측해 번호를 붙이지 않는다. */
export function graphFigureFields(
  repair: GraphChoiceRepair | undefined,
  figures: readonly { file: string }[],
): { choiceFigureIndex?: number[] } {
  if (!repair) return {};
  const files = [
    ...(repair.stem === null ? [] : [repair.stem]),
    ...repair.choices,
  ];
  if (
    repair.choices.length !== 5 ||
    files.some((file) => !file) ||
    new Set(files).size !== files.length ||
    figures.length !== files.length ||
    new Set(figures.map((f) => f.file)).size !== files.length ||
    figures.some((f) => !files.includes(f.file))
  ) {
    throw new Error(
      "[중단] 검토한 발문·보기 그림의 파일 목록과 원본 색인이 다르다",
    );
  }
  const choiceFigureIndex = figures.map((f) =>
    f.file === repair.stem ? 0 : repair.choices.indexOf(f.file) + 1,
  );
  if (!checkChoiceFigureIndex(figures.length, choiceFigureIndex).ok) {
    throw new Error("[중단] 그래프 보기 번호가 빠지거나 중복됐다");
  }
  return { choiceFigureIndex };
}

/** 빌더와 적재기가 같은 이동을 한다. 원본 색인·PNG는 보존하며 번호만 바꾼다. */
export function resolveGraphFigureAssignments<
  T extends { number: number; file: string },
>(figures: readonly T[], repairs: Record<string, GraphChoiceRepair> = {}): T[] {
  let out = [...figures];
  const used = new Set<string>();
  for (const [key, repair] of Object.entries(repairs)) {
    const target = Number(key);
    const source = repair.sourceNumber ?? target;
    if (
      !Number.isInteger(target) ||
      target < 1 ||
      !Number.isInteger(source) ||
      source < 1
    )
      throw new Error("[중단] 그림을 옮길 문항 번호가 올바르지 않다");
    const selected = figures.filter((f) => f.number === source);
    graphFigureFields(repair, selected);
    for (const f of selected) {
      if (
        used.has(f.file) ||
        figures.filter((other) => other.file === f.file).length !== 1
      )
        throw new Error(`[중단] ${f.file} 그림의 소유 문항이 겹친다`);
      used.add(f.file);
    }
    if (source === target) continue;
    if (out.some((f) => f.number === target))
      throw new Error(
        `[중단] 문${target}에 이미 그림이 있어 이동을 확정할 수 없다`,
      );
    // 이동할 때만 사람이 확인한 읽기 차례로 정렬한다. 기존 문항의 색인 차례는 그대로다.
    const files = [
      ...(repair.stem === null ? [] : [repair.stem]),
      ...repair.choices,
    ];
    const moved = files.map((file) => ({
      ...selected.find((f) => f.file === file)!,
      number: target,
    }));
    let inserted = false;
    out = out.flatMap((f) => {
      if (f.number !== source) return [f];
      if (inserted) return [];
      inserted = true;
      return moved;
    });
  }
  return out;
}

/** 검토한 그래프만 호출한다. 빈 추출 조각은 허용하지만 기존 글 보기는 덮지 않는다. */
export function restoreGraphChoices(
  choices: readonly string[],
  answer: string,
): string[] {
  if (
    choices.length > 5 ||
    choices.some((choice) => choice.trim()) ||
    !/^[①-⑤]$/.test(answer)
  )
    throw new Error("[중단] 그래프 보기 복구 전제가 바뀌었다");
  return Array<string>(5).fill("[그림]");
}
