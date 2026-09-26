/**
 * 🔴 편집 칸에서 한 번 저장하면 글 노드의 `\`·`$` 가 이스케이프돼(`visualDocument.ts` `documentMarkdown`)
 * 누출이 `\\displaystyle \$\$이동 거리=` 로 **굳는다** — 그 뒤 모든 출구가 역슬래시와 달러를 그린다(2026-09-26).
 * 사람이 글로 `\displaystyle`(뒤에 `$$`)을 칠 리 없으니 이 모양은 편집기 이스케이프가 만든 것이 분명하다 —
 * 이스케이프만 풀어 입구 후보정(`normalizeMathgenText`)에 넘긴다(지시어를 지우고 가짜 `$$` 를 걷는 판단은 그쪽이 한다).
 * 역슬래시가 정확히 둘일 때만 — 셋이면 «친 역슬래시 + 진짜 명령»이다. 화폐 `\$` 는 지시어 뒤가 아니면 그대로.
 *
 * lib 에 둔 까닭: 편집기(`components/math/editor/sourceRepair.ts`)만 부르면 편집 칸은 낫는데 해설 읽기·정답지는
 * 굳은 저장본을 그대로 그린다. 입구 후보정도 **이 함수**를 먼저 부르면 모든 화면이 같은 모양이 된다.
 */
export function reviveEscapedStyleLeak(source: string): string {
  return source.replace(
    ESCAPED_STYLE,
    (_match, word: string, space: string, display: string | undefined) =>
      `\\${word}${space}${display ? "$$" : ""}`,
  );
}

const ESCAPED_STYLE =
  /(?<!\\)\\\\(displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b([ \t]*)(\\\$\\\$)?/g;
