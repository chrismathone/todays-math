/**
 * tsx 로 지면 탐침을 돌릴 때 CSS 모듈을 «클래스 이름 = 키» 표로 바꾼다 — 읽기 전용 측정 도구 전용.
 *
 * 2026-09-26 부터 `ProblemContent` 가 `PracticeProblemText`(CSS 모듈)를 들여와, 탐침을 부르는 도구가 Node 에서
 * `SyntaxError` 로 죽었다. 지면 탐침은 그 컴포넌트를 안 그린다(학생 연습 화면 전용) — 이름만 있으면 된다.
 *
 *   npx tsx --require ./scripts/qa/css-module-stub.cjs --env-file=.env scripts/qa/measure-print-overflow.tsx --json out.json
 */
require.extensions[".css"] = (module) => {
  module.exports = new Proxy(
    {},
    { get: (_, key) => (key === "__esModule" ? false : String(key)) },
  );
};
