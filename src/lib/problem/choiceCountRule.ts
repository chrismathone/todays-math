/**
 * 「보기가 있으면 **정확히 다섯 개**」 — 규칙을 **한 곳**에 둔다 (D-80).
 *
 * 원장님 지시 2026-08-25: *「일부 4지선다 문항들이 있는데 전부 삭제후 5지선다로 교체.
 * 혹은 정답을 방해하지 않는 5번 보기 생성」*.
 *
 * 세는 쪽(`scripts/qa/census-choice-count.ts`)·지키는 쪽(엔진 시험)·엔진이
 * **같은 파일**을 읽는다.
 *
 * ## 열쇠를 손으로 정하지 않는다
 *
 * ㉠ **개수**는 `parseProblemContent(content).choices.length` — 지면이 실제로 그리는
 *    그 목록이다. 「①~⑤ 를 세면 되겠지」로 손수 세면 지면과 갈라진다.
 * ㉡ **분모**를 `question_type` 으로 가르지 않는다 — 못 믿는 컬럼이다
 *    (CLAUDE.md 2026-08-18: 「정답이 ①인데 «서술형» 이라 적힌 행이 36건」).
 *
 * 🔴 **정답 모양으로도 못 가른다.** 「정답이 보기 표식인 것」만 분모로 잡으면
 *    원장님이 지목하신 `J30401-A04-002` 가 **사라진다** — 보기가 ①②③④ 넷인데
 *    정답이 `$3$`(계수 값)이다. 그래서 분모는 **「지면에 보기가 그려지는가」** 하나뿐이고,
 *    정답 모양은 거르는 자가 아니라 **교차축**이다.
 */
import { parseProblemContent } from "./parseProblemContent";

/** 원장님 확정 (2026-08-25): 보기가 있으면 정확히 다섯 개. */
export const CHOICE_COUNT = 5;

/** 지면이 그리는 보기 개수. 규칙은 **제품 파서 한 곳**에서 온다. */
export function choiceCountOf(content: string): number {
  return parseProblemContent(content).choices.length;
}

/** 🔴 **분모** — 지면에 보기가 그려지는 문항인가 (머리말 참조). */
export function hasChoices(content: string): boolean {
  return choiceCountOf(content) > 0;
}

/**
 * 🔴 **관문** — 엔진이 낸 문항이 규칙을 어기면 **멈춘다.**
 *
 * 생성기마다 「보기 다섯」을 따로 지키면 새 유형이 하나 늘 때마다 그 자리가 하나
 * 더 생기고, 빠뜨려도 아무도 모른다. 그래서 **엔진 진입점 한 곳**이 산출물을
 * 다시 보고 아니면 던진다.
 *
 * 보기가 **아예 없는** 문항(단답형·서술형)은 그냥 지나간다 — 이 규칙의 대상이 아니다.
 */
export function assertChoiceCount(content: string, where: string): void {
  const n = choiceCountOf(content);
  if (n === 0 || n === CHOICE_COUNT) return;
  throw new Error(
    `보기는 ${CHOICE_COUNT}개여야 합니다 — ${where} 가 ${n}개짜리 보기를 냈습니다`,
  );
}
