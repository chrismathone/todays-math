/**
 * 수학 글의 줄바꿈 — **한글은 어절 단위로** 줄을 바꾼다(D-164 ② · 2026-10-21 합의).
 *
 * `word-break: keep-all` 은 한글 어절 가운데서 줄을 안 바꾼다(«구하시 ⏎ 오» 가 안 생긴다). 폭보다 긴 한 마디(긴 식 이름 ·
 * 띄어쓰기 없는 긴 글)는 `overflow-wrap: anywhere` 로 그래도 끊긴다 — 칸 밖으로 안 넘친다(둘째가 없으면 화면에서 넘친다 —
 * `mathTextWrapChrome.test.tsx` 의 변이가 보였다).
 * 화면과 지면이 같은 규칙이다. 뿌리 셋에 단다(물려받는 속성이라 안쪽 전부에 선다):
 *  - `ProblemContent` — 문제 본문 · 보기 · 상자 · 그림 캡션
 *  - `NativeProblem` — 작업실 원본 문항
 *  - `MathText` — 정답 · 해설(`SolutionText` 가 이것을 지난다) · 따로 그리는 보기 · 연산 발문. 부르는 화면이 열 곳 넘어
 *    부르는 쪽이 아니라 여기서 단다(2026-10-21 Codex 검토 — 정답지 · 문제은행 · 복습 해설이 빠져 있었다). 같은 컴포넌트로
 *    그리는 짧은 이름표(유형 · 개념 이름)도 받는다 — 칸을 넘지는 않는다.
 * 렌더러를 바로 부르는 자리는 이 상수를 넘긴다 — 교재 QR 화면의 정답 · 풀이(`TextbookQrScreen` · `/q/[slug]`) · 작업실 원본
 * 미리보기(`StudioReviewPane` 의 `SourceEditorDisplay` — 고치는 칸은 그대로다).
 *
 * 🔴 **영어 분기에는 안 단다** — 통합 인쇄의 문항 본문(`ProblemBody`)은 영어 문항을 `EnglishQuestion` 으로, 정답 지면
 *    (`EnglishAnswerPage`)은 `EnglishAnswer` 로 따로 그리고, 그 길은 수학 렌더러를 안 거친다(합의: «공용 본문의 영어 분기는
 *    범위를 가른다»). 같은 지면의 **수학 문항**(영어가 섞인 문서의 수학 정답 · 해설)은 그대로 이 규칙을 받는다.
 * ⚠️ 지면 높이가 바뀐다 — 어절째 다음 줄로 넘어가 줄이 는다. 높이 캐시의 지문에 이 파일이 들어 있다(`heightCacheManifest.ts`).
 */
export const MATH_TEXT_WRAP = "[word-break:keep-all] [overflow-wrap:anywhere]";
