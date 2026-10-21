/**
 * 도형 라벨 표기 규칙 — math-figure-editor(2026-10-21). 도형 라벨 조판 두 곳(엔진 라벨 `lib/figure/mathjaxLabel`,
 * 편집기 캔버스 `figure-editor/mathjaxLabel`)이 같이 쓴다. 한 곳만 고치면 캔버스와 저장본이 다른 모양을 그린다.
 *
 * todays-math 본문 조판(`components/math/editor/textPreprocess.ts` 의 VEC_MULTI_REGEX·VEC_SINGLE_UPPER_REGEX·
 * PURE_LABEL_REGEX)과 같게:
 * - 두 글자 이상 대문자 `\vec{AB}` → `\overrightarrow{\mathrm{AB}}` — `\vec` 의 짧은 화살은 가운데만 덮는다.
 * - 한글 수식 `arch AB` 가 바뀐 `\overset{\frown}{AB}` → `\overparen{AB}` — 작은 ⌒ 대신 글자 폭만큼 긴 호.
 * - 선분·화살·호·각 위의 **순수 대문자 이름**(`AB`·`A'`)은 점 이름이라 정자 — `\overline{\mathrm{AB}}`.
 * - 소문자 `\vec{a}` 는 그대로(변수라 이탤릭).
 */
const OVERLAY = "overline|overrightarrow|overparen|widehat|vec";

export function figureLabelMarks(tex: string): string {
  return tex
    .replace(/\\overset\{\s*\\frown\s*\}\s*\{/g, "\\overparen{")
    .replace(/\\vec\{\s*([A-Z][A-Z']+)\s*\}/g, (_m, l: string) => `\\overrightarrow{${l}}`)
    .replace(
      new RegExp(`\\\\(${OVERLAY})\\{\\s*([A-Z][A-Z']*)\\s*\\}`, "g"),
      (_m, command: string, l: string) => `\\${command}{\\mathrm{${l}}}`,
    );
}

/** 예전 이름 — 같은 함수. */
export const promoteVectorLabels = figureLabelMarks;
