/**
 * AI 생성·변형물의 「말 대신 기호」를 **말로** 바꾼다 — 원장님 지시 2026-08-26
 * 「해설에 `$\min(a,3)=2$` 라 쓰지 말고 **최솟값이란 말을 명확히** 쓸 것」.
 *
 * ## 왜 여기가 필요한가 — 결정적 엔진 가드가 이 축을 못 본다
 *
 * 해설표기 트랙이 그 지시를 전수로 고쳤고(239자리 재서 216자리 교체), 엔진(초등·중등)
 * 쪽은 판정기가 등록 유형을 직접 돌려 막는다. 그런데 **원장님이 짚으신 그 행의 출처가
 * `ai_generated` 였다.** 그 판정기는 결정적 엔진만 훑으므로 `src/lib/ai/**` 가 다시
 * `\min` 을 내면 못 막는다 — 그 축에 가드가 하나도 없었다.
 *
 * ## 규칙을 **다시 적지 않는다**
 *
 * 판정도 바꾸기도 `scripts/qa/wordyOperator.ts` **하나**가 한다. 그 파일이 대상 목록을
 * 세어서 골랐고(명령 174종·라벨 921종 census), 무엇을 일부러 뺐는지도 거기 적혀 있다
 * (`\sin`·`\log`·`\lim`·`\sum` 은 교과서가 그 기호를 가르친다). 여기서 규칙을 옮겨
 * 적으면 한쪽만 고쳐도 아무도 모른다.
 *
 * ⚠️ 그 파일이 `scripts/` 에 있는 것은 태생이 일회성 수리 도구였기 때문이다. 이제
 *    **제품이 읽으므로** `src/lib/` 로 옮기는 편이 옳다 — 이 워크트리는 그 파일이 다른
 *    트랙 소관이라 자리를 안 옮기고 그대로 읽는다. 병합할 때 옮겨도 이 파일은 import
 *    한 줄만 바뀐다.
 *
 * ## 왜 «막기»가 아니라 «고치기»인가
 *
 * 막으면(요청을 실패시키면) 한 항목 때문에 40~128초짜리 호출이 통째로 버려지고, 원장님
 * 화면에는 사유 없이 실패만 남는다. 반대로 고치기는 **값을 지어낼 위험**이 있는데 —
 * 그 위험은 규칙 자체가 이미 막아 두었다:
 *
 *   · 인자를 **한 글자도 안 고치고** 그대로 옮긴다(수를 잃을 자리가 구조적으로 없다).
 *   · 함수 적용 꼴(`\min(a,3)`)만 바꾼다. `km/\min`(분) 처럼 인자가 없는 것은
 *     **손대지 않는다** — 그걸 「최솟값」으로 읽으면 **에러 없이 그럴듯하게 틀린다**
 *     (해설표기 트랙이 그래서 23자리를 일부러 남겼다).
 *   · 그 위에 `preservesValues` 로 **수·한글·`$` 의 차례**를 견준다. 하나라도 어긋나면
 *     바꾼 것을 **버리고 원문을 그대로 둔다** — 우리가 못 믿는 결과를 지면에 안 보낸다.
 *
 * 그리고 이 경로의 산출물은 전부 `pending` 이라, 원장님이 출제 화면에서 **눈으로 보고**
 * 승인한 뒤에야 학생에게 간다(D-22). 고치기가 마지막 방어선이 아니다.
 */
import {
  preservesValues,
  rewriteWordyOperators,
  wordyOperatorHits,
} from "../../../scripts/qa/wordyOperator";

export interface SpokenText {
  /** 지면에 나갈 글. 바꿀 수 없거나 검산에 걸리면 **원문 그대로**다. */
  out: string;
  /** 말로 바꾼 자리 수. */
  changed: number;
  /**
   * 바꾸고 나서도 **남아 있는** 기호 자리 수. 0 이 아니면 그건 대개 옳은 것들이다
   * (아래첨자 `\max_{x}` · 단위 `km/\min`). 세어서 찍을 뿐 막지 않는다 — 여기서 막으면
   * 「분(minute)」을 쓴 멀쩡한 문항이 통째로 버려진다.
   */
  leftover: number;
  /** 바꾼 것을 **버린** 까닭. 검산에 걸렸을 때만 채워진다. */
  refused: string | null;
}

/**
 * 한 칸(발문·정답·해설)을 말로 바꾼다.
 *
 * ⚠️ **정규화(`normalizeLatex`)를 거친 글을 넘겨라.** 지면·DB 가 쓰는 그 문자열이어야
 *    바꾼 자리와 나가는 자리가 같아진다.
 */
export function speakWordyOperators(text: string): SpokenText {
  const result = rewriteWordyOperators(text);
  if (result.changed === 0) {
    return {
      out: text,
      changed: 0,
      leftover: result.skipped.length,
      refused: null,
    };
  }
  const verdict = preservesValues(text, result.out);
  if (!verdict.ok) {
    // 🔴 못 믿는 결과는 **안 쓴다.** 바꾸다 값을 잃느니 기호가 남는 편이 낫다 —
    //    남은 기호는 원장님이 검수에서 본다. 잃은 값은 아무도 못 본다.
    return {
      out: text,
      changed: 0,
      leftover: wordyOperatorHits(text).length,
      refused: verdict.why ?? "검산에 걸렸다",
    };
  }
  return {
    out: result.out,
    changed: result.changed,
    leftover: result.skipped.length,
    refused: null,
  };
}

/** 해설은 없을 수 있다. 널을 그대로 통과시킨다. */
export function speakWordyOperatorsOrNull(
  text: string | null,
): { out: string | null } & Omit<SpokenText, "out"> {
  if (text === null)
    return { out: null, changed: 0, leftover: 0, refused: null };
  return speakWordyOperators(text);
}
