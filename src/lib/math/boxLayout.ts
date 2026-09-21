/**
 * 인용 상자(`> <보기>` …)의 **배치 한 벌** — 검수 카드(`SourceEditorRenderer`)·지면(`MarkdownRenderer`
 * ·`NativeProblem`)이 같은 원문을 거쳐 같은 격자를 그리게 한다(원장님 «모든 화면 일치», 2026-09-19).
 *
 * 원장님 2026-09-21: «그림이 이상하게 배열되고 있네. 문제 안에 여러 그림이 있을 경우 원본을 어기고».
 * 문제 22 는 원본 〈보기〉 가 그림 넷의 2열 2행인데 검수 화면에서 한 열로 쌓였다. 열 수를 아는 곳은 셋이다:
 *   ① 머리에 적힌 열 수 `<보기:cols=N>` — 인식(앞으로)·편집기·원문 코드가 적는다. 이것이 늘 이긴다.
 *   ② 원본 그림 자리 — 칸마다 그림이 하나뿐인 상자는, 그림 자리(작업실이 원본 쪽에서 오려 낸 rect)가
 *      몇 개씩 한 행에 섰는지가 곧 원본의 열 수다(`figureGridColumns`).
 *   ③ 아무도 모르면 1열 — 항목 수·글 길이로 원본 열을 **추정하지 않는다**(mathlab `box-grid.ts` 에서 옮겨 온 원칙).
 *
 * 여러 열이면 머리를 정본 `<보기:cols=N>` 으로 적고 칸마다 문단으로 나눈다. 그러면 두 렌더러는
 * «문단 하나 = 칸 하나, 머리의 N = 열 수» 만 알면 된다. 1열이면 **원문을 한 글자도 안 바꾼다.**
 */
import { boxCells } from "./boxBlock";
import {
  boxHeaderMarkdown,
  parseBoxHeader,
  type BoxColumns,
} from "./boxHeader";

/** 원본 쪽에 대한 비율 자리(작업실 `StudioFigure.rect` 와 같은 모양). */
export interface FigureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FIGURE_REF = /\[\s*그\s*림\s*(\d+)\s*\]/g;

/** 두 자리가 세로로 반 넘게 겹치면 같은 행이다. */
function sameRow(a: FigureRect, b: FigureRect): boolean {
  const overlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlap >= 0.5 * Math.min(a.height, b.height);
}

/**
 * 칸마다 그림이 꼭 하나인 상자의 열 수를 원본 그림 자리로 안다. 모르면 null.
 *
 * 격자는 **앞에서부터 가로로** 채운다. 그래서 원본도 그 차례여야 옮긴다 — 칸 차례대로 보며
 * 같은 행이면 오른쪽으로, 아니면 **아래**로 새 행이어야 한다. 세로 읽기 차례(ㄱ·ㄴ 이 왼쪽 열)나
 * 앞 행이 덜 찬 배치는 격자로 옮기면 차례가 바뀌므로 null 이다. 한 행이 넷 이상이어도 null
 * (격자가 셋까지다).
 */
export function figureGridColumns(
  cells: readonly string[],
  rectOf: (index: number) => FigureRect | undefined,
): BoxColumns | null {
  if (cells.length < 2) return null;
  const rects: FigureRect[] = [];
  for (const cell of cells) {
    const refs = [...cell.matchAll(FIGURE_REF)];
    if (refs.length !== 1) return null;
    const rect = rectOf(Number(refs[0]![1]) - 1);
    if (!rect || !(rect.width > 0 && rect.height > 0)) return null;
    rects.push(rect);
  }
  const rows: FigureRect[][] = [];
  for (const rect of rects) {
    const row = rows[rows.length - 1];
    const last = row?.[row.length - 1];
    if (row && last && sameRow(last, rect)) {
      if (rect.x <= last.x) return null;
      row.push(rect);
      continue;
    }
    // 새 행은 앞의 모든 행보다 아래여야 한다.
    if (
      rows.some((earlier) =>
        earlier.some((placed) => sameRow(placed, rect) || rect.y < placed.y),
      )
    )
      return null;
    rows.push([rect]);
  }
  const cols = rows[0]!.length;
  if (cols < 2 || cols > 3) return null;
  if (rows.some((row) => row.length > cols)) return null;
  if (rows.slice(0, -1).some((row) => row.length !== cols)) return null;
  return cols as BoxColumns;
}

export interface BoxLayoutOptions {
  /** `[그림N]` 의 원본 자리(0부터 센 번호). 모르면 undefined. */
  figureRect?: (index: number) => FigureRect | undefined;
}

/** 인용 상자 한 덩어리 — 첫 줄이 상자 머리인 연속 `>` 줄. */
const QUOTED_BLOCK = /^[ \t]*>[^\n]*(?:\n[ \t]*>[^\n]*)*/gm;
const QUOTE_PREFIX = /^[ \t]*>[ \t]?/;
/** `<보기>에서` 처럼 조사가 붙으면 머리가 아니라 발문 속 참조다(`boxBlock` 과 같은 판정). */
const PARTICLE_AFTER =
  /^\s*(?:에서|에게|에|의|을|를|이며|이고|이다|이|가|은|는|와|과|만|중|처럼|대로|같이|로|으로|보다|부터|까지|랑|도)/;

/**
 * 원문 속 인용 상자마다 열 수를 정하고, 여러 열이면 정본 머리 + 칸마다 문단으로 적는다.
 * 1열(적힌 1열·모름)이면 그 상자는 한 글자도 안 바꾼다. 두 번 돌려도 같다.
 */
export function layoutQuotedBoxes(
  markdown: string,
  options: BoxLayoutOptions = {},
): string {
  if (!markdown.includes(">") || !/<(?:보기|조건|상자|나열)/.test(markdown))
    return markdown;
  return markdown.replace(QUOTED_BLOCK, (block) => {
    const lines = block
      .split("\n")
      .map((line) => line.replace(QUOTE_PREFIX, ""));
    const header = parseBoxHeader(lines[0]!.trimStart());
    if (!header) return block;
    const rest = lines[0]!.trimStart().slice(header.length);
    if (PARTICLE_AFTER.test(rest)) return block;
    const body = lines.slice(1).join("\n");
    const cols =
      header.cols ??
      (options.figureRect
        ? figureGridColumns(boxCells(body, 1), options.figureRect)
        : null);
    if (cols === null || cols === 1) return block;
    const head = `> ${boxHeaderMarkdown(header.label, cols)}${rest.trimEnd()}`;
    const cells = boxCells(body, cols).map((cell) =>
      cell
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
    );
    return [head, ...cells].join("\n>\n");
  });
}
