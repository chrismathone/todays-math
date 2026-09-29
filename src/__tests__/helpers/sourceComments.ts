/**
 * 소스 글에서 주석을 걷는 자 — 전수 울타리 시험(«그 모듈을 부르는 곳은 여기뿐»)이 주석 속 이름을 «부르는 곳»으로
 * 세지 않게. 쓰는 곳 둘 — mathSrsRecordIsolation.test.ts(src · scripts 전부) · mathSrsGradingGuard.test.ts(탐험 · 복습).
 *
 * 줄 주석을 먼저, 블록 주석은 **줄 머리(들여쓰기 뒤)의 `/*`** 에서만 걷는다.
 * 🔴 블록을 아무 데서나 먼저 걷으면 줄 주석 · 문자열 속 `/*`(«`/api/**`» · `"preview/*.html"`)가 블록 시작으로 읽혀
 *    다음 블록 주석 끝까지 — 코드 줄째 — 걷힌다. `scripts/qa/mobile-explorers-qa.mjs` 가 두 번 그렇게 격리 시험에서
 *    사라졌다(2026-09-27 2만여 자, 2026-09-29 JSDoc 한 줄로 10만여 자 · 기록 모듈을 부르는 줄 포함). 저장소 전체에서
 *    같은 식으로 코드 줄을 삼키던 블록이 다섯 더 있었다 — 쓰는 시험마다 `eatenCode` 가 0 인지 단정한다.
 * 줄 중간의 `/* … *\/`(코드 뒤 짧은 주석)는 남긴다 — 걷지 못해 생기는 것은 «주석 속 이름을 부르는 곳으로 셈»(빨강)이고,
 * 잘못 걷어 생기는 것은 «부르는 곳을 못 셈»(초록인데 눈멂)이라 앞의 것이 낫다.
 * CSS 는 줄 주석이 없고 블록 주석이 줄 중간에도 오므로 이 자를 쓰지 않는다(CSS 시험들은 «아무 데나» 그대로).
 */

/** 줄 주석 — `//`, 파이썬 · SQL 을 같이 훑는 시험은 `#` 도. 줄 머리에서 시작하는 것만. */
const lineComment = (hash: boolean) =>
  hash ? /^\s*(\/\/|#).*$/gm : /^\s*\/\/.*$/gm;
/** 블록 주석 — 줄 머리(들여쓰기 뒤)에서 여는 것만. */
const BLOCK_COMMENT = /^[ \t]*\/\*[\s\S]*?\*\//gm;
/** 걷은 블록 안에 이런 줄이 있으면 주석이 아니라 코드를 걷은 것이다. */
const CODE_LINE =
  /^[ \t]*(import|export|const|let|var|function|async function|class|return|await|for|if)\b/m;

export type CommentOptions = {
  /** `#` 줄도 주석으로(파이썬 · SQL 파일을 같이 훑을 때). */
  hash?: boolean;
  /** 블록 규칙 — 시험의 변이 확인용으로만 바꾼다. */
  block?: RegExp;
};

export function withoutComments(text: string, options: CommentOptions = {}) {
  return text
    .replace(lineComment(options.hash ?? false), "")
    .replace(options.block ?? BLOCK_COMMENT, "");
}

/** 걷힐 블록 가운데 코드 줄(import · const · function …)을 품은 것의 길이 — 0 개여야 한다. */
export function eatenCode(text: string, options: CommentOptions = {}) {
  return [
    ...text
      .replace(lineComment(options.hash ?? false), "")
      .matchAll(options.block ?? BLOCK_COMMENT),
  ]
    .filter(([block]) => CODE_LINE.test(block.split("\n").slice(1).join("\n")))
    .map(([block]) => block.length);
}

/** 옛 규칙(블록을 아무 데서나 먼저) — 시험이 «옛 규칙이면 빨갛다»를 보이는 데만 쓴다. */
export const ANYWHERE_BLOCK = /\/\*[\s\S]*?\*\//g;
