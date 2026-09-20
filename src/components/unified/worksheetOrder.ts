import type { StudioProblem } from "./types";

/**
 * 「문제 순서」 칸이 쓰는 **원본에서의 자리** — 원장님 2026-09-20
 * «그냥 원본의 몇쪽 몇번 문제였나만 간략하게».
 *
 * 쪽은 잘라 온 크롭(`studioCrop.page`)이 알고, **번호는 문자 인식만 안다**
 * (`ocr.number` — `sourcePrompts.ts:126` 이 «the printed problem number» 로 받아 온 값).
 * 그래서 아직 문자 인식을 안 돌린 그림 크롭에는 번호가 **없다**. 없으면 쪽만 쓴다 —
 * 목록 차례(1, 2, 3…)를 번호로 둔갑시키면 원본과 다른 번호를 지면에 적는 셈이다.
 */
export interface SourcePlace {
  page: number;
  /** 원본에 인쇄된 번호. 문자 인식 전에는 없다. */
  number?: number;
}

export function sourcePlace(problem: StudioProblem): SourcePlace | null {
  const page = problem.studioCrop?.page;
  if (!Number.isInteger(page) || (page as number) < 1) return null;
  const number = problem.ocr?.number ?? problem.studioCrop?.ocr?.number;
  return Number.isInteger(number) && (number as number) > 0
    ? { page: page as number, number: number as number }
    : { page: page as number };
}

/**
 * 목록 한 줄의 첫 글자와 마우스를 올렸을 때 보이는 글자.
 *
 * 파일 이름은 칸을 다 먹어 **글자로는 안 쓰고** `title` 로만 남긴다 — 여러 파일을
 * 섞어 담는 경우가 있어 어느 원본인지 확인할 길은 있어야 한다.
 */
export function worksheetRowLabel(problem: StudioProblem): {
  text: string;
  title: string;
} {
  const place = sourcePlace(problem);
  const source = problem.sourceLabel?.trim() || "";
  const fallback = problem.section || source || "가져온 문제";
  if (!place) return { text: fallback, title: fallback };
  const text = place.number
    ? `${place.page}쪽 ${place.number}번`
    : `${place.page}쪽`;
  return { text, title: source || fallback };
}

/** 정렬 열쇠 — 원본 자리를 모르면 맨 뒤(그런 문항은 혼자 한 묶음이라 실제로는 안 밀린다). */
function placeKey(problem: StudioProblem): [number, number] {
  const place = sourcePlace(problem);
  if (!place) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
  return [place.page, place.number ?? 0];
}

/**
 * 「순서 초기화」가 되돌릴 **원본 차례** — 화면에 보이는 «N쪽 M번» 과 같은 열쇠를 쓴다.
 * 보이는 것과 단추가 하는 일이 어긋나면 안 된다(지시서 ⑶).
 *
 * 파일이 섞여 있으면 **파일끼리 묶고**, 묶음 차례는 지금 목록에서 그 파일이 처음 나온
 * 차례를 그대로 쓴다. 쪽·번호만으로 세우면 서로 다른 파일의 «1쪽 3번» 둘이 엉킨다.
 * 원본 자리를 모르는 문항(문제은행 등)은 혼자 한 묶음이라 **지금 자리를 지킨다**.
 *
 * `Array.prototype.sort` 는 안정 정렬이라, 쪽·번호가 같으면 지금 차례가 남는다.
 * 그래서 이 함수는 **두 번 돌려도 결과가 같다**.
 */
export function sortBySourceOrder(list: StudioProblem[]): StudioProblem[] {
  const groups = new Map<string, StudioProblem[]>();
  list.forEach((problem, index) => {
    const key = problem.studioCrop
      ? `source:${problem.studioCrop.sourceId}`
      : `alone:${index}`;
    const group = groups.get(key);
    if (group) group.push(problem);
    else groups.set(key, [problem]);
  });
  return [...groups.values()].flatMap((group) =>
    [...group].sort((a, b) => {
      const [pageA, numberA] = placeKey(a);
      const [pageB, numberB] = placeKey(b);
      return pageA - pageB || numberA - numberB;
    }),
  );
}

/** 이미 원본 차례인가 — 「순서 초기화」를 흐리게 할지 정하는 값. */
export function isSourceOrdered(list: StudioProblem[]): boolean {
  const sorted = sortBySourceOrder(list);
  return sorted.every((problem, index) => problem === list[index]);
}
