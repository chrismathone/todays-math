/**
 * 마크다운 지면(`MarkdownRenderer`)에 넣기 **직전**의 전처리 — 렌더러와 판정 자가 같은 함수를 부른다.
 *
 * 2026-09-26 `MarkdownRenderer.tsx` 에서 그대로 옮겼다(글자 하나 안 바꿨다 — `renderParity` 가 잠근다).
 * 옮긴 까닭: 코퍼스 렌더 판정 자(`testchanger/mathRenderQa.ts`)가 **어떤 운영 화면과도 다른 조합**
 * (문자열 경로 `renderMathHtml`)으로 재서, 지면이 깨진 글을 «안전»으로 셌다(후보정 조사 J).
 * 자가 지면과 같은 것을 보려면 같은 전처리를 불러야 하는데, 렌더러는 클라이언트 컴포넌트
 * (`BoxQuoteCard` — `"use client"`)를 끌고 와 lib·스크립트가 import 할 수 없었다.
 */
import { layoutQuotedBoxes } from "./boxLayout";
import { applyHardBreaks } from "./hardBreaks";
import { decodeHtmlEntities, preprocessMathText } from "./textPreprocess";

/**
 * 인용문 머리 줄의 정본 `<보기:cols=N>` → 전처리를 통과하는 `<보기N>`(`auto` 는 맨 `<보기>`).
 * 열 수 상한은 머리 판정과 같다 — 상자 1~3 · 나란히 1~4(`<보기:cols=4>` 는 머리가 아니라 옮기지 않는다).
 *
 * `preprocessMathText`(Step 9 자동 wrap)가 `cols=2` 를 수식으로 감싸 KaTeX 로 그려 버리기 때문에
 * 수식 전처리 직전에만 옮겨 적는다(`MarkdownRenderer.tsx` 상자 주석 2).
 */
const QUOTED_CANONICAL_HEADER =
  /^([ \t]*>[ \t]*)\\?<(?:(보기|조건|상자|나열):cols=(auto|[1-3])|(나란히):cols=(auto|[1-4]))\\?>/gm;
const protectBoxHeaders = (text: string) =>
  text.includes(":cols=")
    ? text.replace(
        QUOTED_CANONICAL_HEADER,
        (
          _m,
          lead: string,
          boxLabel: string | undefined,
          boxCols: string | undefined,
          sideLabel: string | undefined,
          sideCols: string | undefined,
        ) => {
          const cols = boxCols ?? sideCols;
          return `${lead}<${boxLabel ?? sideLabel}${cols === "auto" ? "" : cols}>`;
        },
      )
    : text;

/** mathgen 원본 보정: 인라인 수식에서 lim 첨자가 옆에 붙는 문제 → 아래로 내린다. */
const BARE_LIM = /\\lim(?!(?:[a-zA-Z]|\s*\\limits))/g;
/**
 * 앞 첨자 «$_{n}\mathrm{C}_{r}$» — 앞에 아무것도 없거나 연산 기호 뒤면 KaTeX 가 첨자를 **앞 기호에** 붙인다
 * («$+_{n}C$» 가 «+ₙ C» 로). TeX 관례대로 빈 묶음 `{}` 을 앞에 둔다(2026-10-20 교차 검수 · 교과서 13행).
 */
const LEFT_SUBSCRIPT = /(^|\$|\\displaystyle|[+\-=(,]|\\times|\\cdot)(\s*)_\{/g;

/**
 * 전처리 결과 캐시. `preprocessMathText` 는 순수 함수(같은 입력 → 같은 출력)라
 * 캐시가 결과를 바꾸지 않는다. 정규식 64패스 + 수식당 약 59패스를 아낀다.
 *
 * `useMemo` 가 아니라 모듈 캐시인 이유:
 *  - 이 렌더러는 서버 컴포넌트(`/dev/katex` 등)에서도 쓰인다.
 *  - 같은 본문을 문제은행 카드·검수 발췌·인쇄 지면이 각각 그리므로
 *    인스턴스를 넘어 재사용돼야 이득이 크다.
 * 서버 프로세스에서 무한히 자라지 않도록 오래된 항목부터 버린다.
 */
const PREPROCESS_CACHE_LIMIT = 256;
const preprocessCache = new Map<string, string>();

/** 마크다운 지면이 react-markdown 에 넘기는 글. */
export function preprocessMarkdown(content: string): string {
  const cached = preprocessCache.get(content);
  if (cached !== undefined) return cached;

  // ⚠️ 하드 브레이크는 **맨 마지막**이다. `preprocessMathText` 가 `\(…\)` → `$…$`,
  //    `$…$` → `$$…$$` 승격 등으로 수식 경계를 바꾸므로, 그 전에 공백을 붙이면
  //    「수식 밖인 줄 알았던 줄」이 수식 안이 되어 원문이 오염된다.
  // 상자 배치(열 수·칸)는 수식 전처리 **전에** 정한다 — 검수 카드와 같은 원문을 봐야 같은 격자다.
  const result = applyHardBreaks(
    preprocessMathText(
      protectBoxHeaders(layoutQuotedBoxes(decodeHtmlEntities(content))),
    )
      .replace(BARE_LIM, "\\lim\\limits")
      .replace(LEFT_SUBSCRIPT, "$1$2{}_{"),
  );

  if (preprocessCache.size >= PREPROCESS_CACHE_LIMIT) {
    const oldest = preprocessCache.keys().next().value;
    if (oldest !== undefined) preprocessCache.delete(oldest);
  }
  preprocessCache.set(content, result);
  return result;
}
