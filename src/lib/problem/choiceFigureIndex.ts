/**
 * 「이 그림은 몇 번 보기의 것인가」 — `Problem.choiceFigureIndex` 를 읽는 **한 곳**.
 *
 * ## 왜 이 파일이 있는가
 *
 * 지면에는 `① [그림] ② [그림]` 이라고 찍히고 그래프는 그 위에 따로 쌓인다.
 * **어느 그래프가 ①인지 지면에 없어 학생이 답을 고를 수 없다**(실측 147건).
 * 짝은 원본 시험지에 늘 있었는데 이관 파이프라인이 다섯 군데서 버렸다.
 * 근거: `docs/planning/tracks/reports/choice-figures.md`
 *
 * ## 규약 — `figureDims` 와 같은 모양, 같은 엄격함
 *
 *   `figureUrls` 와 **같은 순서·같은 길이**의 정수 배열.
 *     `0`      보기 그림이 아니다 (발문·자료 그림)
 *     `1`~`10` 그 번호의 보기 그림 (오늘 데이터는 1~5 뿐)
 *
 * ## 🔴 모를 때 어느 쪽으로 받는가 — 이게 이 파일의 요점이다
 *
 * **빈 배열은 «짝을 모른다»는 뜻이고, 그게 기본값이다.** 모르면 지면은
 * **오늘 그대로** 그린다 — 그림을 한 덩어리로 놓고 보기 번호를 붙이지 않는다.
 *
 * 빈 배열이 「아무 그림이나 ①에 붙여도 된다」로 **미끄러지면 안 된다.**
 * 지금은 못 푸는 문항이 **못 푸는 채로 보인다.** 틀린 짝은 **그럴듯해 보이면서
 * 틀린다** — 학생은 ③을 골랐는데 그게 ③이 아니다. 그건 지금보다 나쁘다.
 *
 * 그래서 아래 셋 중 하나라도 걸리면 **통째로** «모른다»로 받는다. 반쪽은 안 받는다:
 *   (1) 길이가 `figureUrls.length` 와 다르다
 *   (2) 값이 `0..10` 밖이거나 정수가 아니다
 *   (3) **0 이 아닌 번호가 겹친다** — 그림 둘이 같은 ③을 주장한다
 *
 * (3)이 특히 중요하다. 겹친 채로 하나만 그리면 **틀린 짝이 조용히 지면에 나간다.**
 * 겹침은 짝짓기가 무너졌다는 뜻이므로 「모른다」가 정직하다.
 */

import { FIGURE_MARKER } from "./figureMarker";

/** 배열이 담을 수 있는 보기 번호의 상한. 마커 표기(①~⑩)와 같은 범위다. */
export const MAX_CHOICE_NUMBER = 10;

/** 그림 한 장이 무엇인지. `null` 이면 «이 문항의 짝을 모른다». */
export type ChoiceFigureLink =
  { kind: "stem" } | { kind: "choice"; number: number };

export interface ChoiceFigureIndexCheck {
  ok: boolean;
  /** 왜 «모른다»로 받는지. `ok` 면 빈 문자열. */
  reason: string;
}

/**
 * 배열이 규약을 지키는지 본다 — 적재 스크립트의 검산과 렌더가 **같은 규칙**을 쓴다.
 *
 * 빈 배열은 «모른다»이지 «틀렸다»가 아니다. 그래서 `ok: false` + 사유 `"모른다"` 로
 * 돌려준다 — 부르는 쪽이 「고쳐야 할 것」과 「아직 없는 것」을 갈라 볼 수 있어야 한다.
 */
export function checkChoiceFigureIndex(
  figureCount: number,
  flat: readonly number[] | null | undefined,
): ChoiceFigureIndexCheck {
  if (!flat || flat.length === 0) return { ok: false, reason: "모른다" };
  if (flat.length !== figureCount)
    return {
      ok: false,
      reason: `길이가 다르다 (그림 ${figureCount}장 · 배열 ${flat.length})`,
    };
  for (const value of flat) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_CHOICE_NUMBER)
      return { ok: false, reason: `값이 범위 밖이다 (${value})` };
  }
  const used = new Set<number>();
  for (const value of flat) {
    if (value === 0) continue; // 발문 그림은 여럿일 수 있다
    if (used.has(value))
      return { ok: false, reason: `보기 ${value} 번에 그림이 둘 이상이다` };
    used.add(value);
  }
  return { ok: true, reason: "" };
}

/**
 * `figureUrls` 와 같은 길이의 배열로 편다. **모르면 전부 `null`** 이다.
 *
 * `parseFigureDimensions`(printOverflow.ts)와 같은 꼴로 돌려준다 — 부르는 쪽이
 * 「이 장은 아는가」를 장마다 물을 수 있고, 모르는 문항은 자연히 오늘 지면이 된다.
 */
export function parseChoiceFigureIndex(
  figureCount: number,
  flat: readonly number[] | null | undefined,
): (ChoiceFigureLink | null)[] {
  if (figureCount <= 0) return [];
  const unknown = (): (ChoiceFigureLink | null)[] =>
    Array.from({ length: figureCount }, () => null);
  if (!checkChoiceFigureIndex(figureCount, flat).ok) return unknown();

  return Array.from({ length: figureCount }, (_, index) => {
    const value = flat![index]!;
    return value === 0
      ? ({ kind: "stem" } as const)
      : ({ kind: "choice", number: value } as const);
  });
}

/** 이 문항의 짝을 아는가 — 지면이 보기 번호를 붙여도 되는가. */
export function hasChoiceFigureLinks(
  figureCount: number,
  flat: readonly number[] | null | undefined,
): boolean {
  return checkChoiceFigureIndex(figureCount, flat).ok;
}

/**
 * 본문이 `[그림]` 자국**뿐인** 보기 — 그 칸의 내용이 곧 그림이다.
 * `[그림] 위로 볼록한 곡선` 처럼 글이 붙은 보기는 글 보기로 본다(그 글이 그림의 설명인지 알 길이 없다).
 */
export function isFigureChoice(body: string): boolean {
  return body.trim() === FIGURE_MARKER;
}

/** 조판이 그릴 자리 — `figureUrls` 의 색인으로 적는다. */
export interface ChoiceFigurePlan {
  /** 발문 아래에 그릴 그림(원래 차례). */
  stem: number[];
  /** 보기 번호(1부터) → 그 보기 칸에 넣을 그림. */
  byChoice: Record<number, number>;
}

/**
 * 「어느 그림을 어느 보기 칸에 넣는가」 — 조판 · 넘침 자 · 적재기가 **같이 쓰는 한 곳**
 * (2026-10-03 3자 합의 B1 · `tracks/reports/consult-bank-fix/consensus.md`).
 *
 * 배열 규약(`checkChoiceFigureIndex`)에 **보기 쪽 사정**을 더해 본다 — 짝은 양쪽에서 맞아야 한다:
 *   · 0 이 아닌 번호는 실제로 있는 보기이고, 그 보기의 본문이 `[그림]` 이다
 *     (글 보기를 가리키는 그림은 칸에 못 들어가 조판에서 **사라진다**)
 *   · 본문이 `[그림]` 인 보기마다 그림이 하나씩 있다 (반쪽 짝은 받지 않는다)
 * 하나라도 어긋나면 `null` — «모른다»이고, 조판은 오늘 그대로 그린다.
 * 보기 그림이 하나도 없을 때도 `null` 이다(오늘의 조판과 다를 것이 없다).
 */
export function planChoiceFigures(
  figureCount: number,
  flat: readonly number[] | null | undefined,
  choices: readonly string[],
): ChoiceFigurePlan | null {
  if (!checkChoiceFigureIndex(figureCount, flat).ok) return null;
  const plan: ChoiceFigurePlan = { stem: [], byChoice: {} };
  for (let index = 0; index < figureCount; index += 1) {
    const value = flat![index]!;
    if (value === 0) {
      plan.stem.push(index);
      continue;
    }
    const body = choices[value - 1];
    if (body === undefined || !isFigureChoice(body)) return null;
    plan.byChoice[value] = index;
  }
  const everyFigureChoiceLinked = choices.every(
    (body, i) => !isFigureChoice(body) || plan.byChoice[i + 1] !== undefined,
  );
  if (!everyFigureChoiceLinked) return null;
  return Object.keys(plan.byChoice).length > 0 ? plan : null;
}

/**
 * `[그림]` 보기가 있는데 짝을 모른다 — **학생이 못 푸는 문항**이다.
 * 적재기는 이런 행의 출제 허용을 끈다(은행 카드에는 그대로 보인다 — 결함이 보여야 고친다).
 */
export function hasUnlinkedFigureChoices(
  figureCount: number,
  flat: readonly number[] | null | undefined,
  choices: readonly string[],
): boolean {
  return (
    choices.some(isFigureChoice) &&
    planChoiceFigures(figureCount, flat, choices) === null
  );
}
