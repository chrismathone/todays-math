/**
 * **정답 쏠림 규칙** — 「그림이 붙은 문항에서 한 답이 너무 자주 나오는가」.
 *
 * 부수효과가 없는 순수 모듈이다. 판정기(`probe-elem-rules.ts` 의 `R9-c 정답고정`)와
 * 시험(`elemTiersG6.test.ts` 의 「정답 쏠림」)이 **둘 다 여기서** 문턱과 셈을 가져간다.
 *
 * ## 왜 판정기에서 뽑아냈나 — **`import` 만으로 판정기가 돈다**
 *
 * `probe-elem-rules.ts` 는 모듈 최상단에서 전량 쓸기(1,130갈래)를 돌고, 파일 끝에서
 * `process.exitCode = hits.length === 0 ? 0 : 1` 을 **쓴다.** 그래서 시험이 상수 하나만
 * 가져와도 쓸기가 통째로 딸려 오고, 무엇보다:
 *
 * > 지금은 결함이 0이라 안 보이지만, **어느 학년에든 진짜 결함이 하나 생기는 순간**
 * > 그 시험 파일은 **시험이 다 초록이어도 프로세스가 1로 끝난다.**
 *
 * 이것이 「**빨간데 근거가 없다**」의 가장 나쁜 판이다 — 빨간 이유가 그 파일 안에
 * **아예 없어서** 다음 사람이 영영 못 찾고, **다른 학년의 결함이 남의 시험 파일을**
 * 빨갛게 만든다. 그래서 규칙만 순수 모듈로 내린다(`answerChoiceRules.ts` 등과 같은 꼴).
 *
 * ## 문턱을 두 벌 두지 않는다
 *
 * 전에는 `0.8` 이 판정기와 시험 두 곳에 손으로 적혀 있었다. 한쪽만 옮기면 갈라져도
 * 아무도 모른다 — 이 저장소가 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이
 * 쓰게 하라」고 여러 번 적어 둔 자리다. 셈하는 함수도 같이 내려서
 * 「두 곳이 **다르게 센다**」까지 없앤다.
 */

/** 그림이 붙은 문항에서 한 답이 이만큼을 넘으면 「찍으면 맞는」 문항이다. g4 실측값. */
export const ANSWER_SKEW_MAX = 0.8;

/** 쏠림을 재려면 그림 붙은 문항이 적어도 이만큼은 있어야 한다. */
export const SKEW_MIN_SAMPLES = 4;

type Judged = { readonly answer: string; readonly figureSpec?: unknown };

/**
 * **싼 1차 걸름** — 넓게 되재 볼 만한 셀인가.
 *
 * 🔴 여기서 «넷 이상»을 요구하면 안 된다. 그림이 셋에 하나꼴로 붙는 셀은 씨앗 8개에서
 * 평균 2.7건이라 **넓혀 재는 데까지 못 간다** — 실제로 그렇게 초4 2-2-1·2-4-6 을
 * 놓쳤다(2-4-4 만 우연히 넷을 넘겨 걸렸다). 1차는 **둘만 있어도 통과**시키고,
 * 「쏠렸나」의 판정은 **120씨앗으로 되잰 뒤**에만 한다.
 */
export function answersLookAlike(items: readonly Judged[]): boolean {
  const withFig = items.filter((i) => i.figureSpec != null);
  return withFig.length >= 2 && new Set(withFig.map((i) => i.answer)).size === 1;
}

/**
 * 그림 붙은 문항 중 **가장 많이 나온 답의 비율**. 문턱과 무관하게 **날 값**을 준다.
 *
 * ⚠️ 견줄 짝이 `SKEW_MIN_SAMPLES` 미만이면 `null` — «쏠림»과 «못 셈»이 안 갈린다.
 *
 * 문턱 판정(`answerSkewAmongFigures`)과 **여유 보기**(문턱에 붙어 가는가)가 둘 다
 * 이 함수를 쓴다. 그래서 세는 방법이 한 벌이다.
 */
export function topAnswerShare(
  items: readonly Judged[],
): { answer: string; share: number; n: number } | null {
  const withFig = items.filter((i) => i.figureSpec != null);
  if (withFig.length < SKEW_MIN_SAMPLES) return null;
  const tally = new Map<string, number>();
  for (const i of withFig) tally.set(i.answer, (tally.get(i.answer) ?? 0) + 1);
  const [answer, hits] = [...tally].sort((a, b) => b[1] - a[1])[0]!;
  return { answer, share: hits / withFig.length, n: withFig.length };
}

/** 문턱을 넘은 셀만 돌려준다. 안 넘으면 `null`. */
export function answerSkewAmongFigures(
  items: readonly Judged[],
): { answer: string; share: number; n: number } | null {
  const top = topAnswerShare(items);
  return top && top.share > ANSWER_SKEW_MAX ? top : null;
}
