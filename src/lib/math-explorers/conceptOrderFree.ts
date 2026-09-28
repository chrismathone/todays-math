/**
 * 순서 무관 채점 표지 — 두 빈칸이 본디 대등한 카드는 두 정답 조각을 어느 칸에 넣어도 맞음으로 친다(리드 지시 2026-09-28 ·
 * Claude · codex · grok 3자 합의 «(다) 섞기»). 문장 조립은 자리 그대로 채점하므로, 맞바꿔도 뜻이 같은 문장(단위 등식 · 합집합 ·
 * 곱셈의 교환)을 만든 학생이 틀림 처리되던 결함을 막는다. 채점 뒤 화면은 학생이 놓은 순서를 그대로 보이므로, 맞바꿈이 조사까지
 * 맞는 카드만 넣었다 — 조사가 어긋나는 카드는 문장을 고쳤다(`conceptSentenceFixes.ts`).
 *
 * 별 · 레벨 · 기억 복습 · 다시 풀기는 «맞았나» 한 값만 받으므로 그대로다. 원본 카드 · 공유 DB 는 건드리지 않는다.
 * 정답이 아닌 모든 채움의 판정은 `docs/reference/concept-terms/card-fillings-audit.json`(시험이 잠금).
 */
export const orderFreeCards: ReadonlySet<string> = new Set([
  // 맞바꿔도 조사까지 맞고 뜻이 같다
  "g3-capacity", // 들이 — 1L는 1000mL이다
  "g3-kilometer", // 킬로미터
  "g3-length", // 길이 단위
  "g3-mass", // 무게 단위
  "g4-mixed", // 대분수 — 자연수와 진분수
  "g5-rectangle-area", // 직사각형의 넓이 — 가로와 세로
  "g6-cross-product", // 비례식의 성질 — 외항의 곱과 내항의 곱
  "g7-interior-sum", // 다각형의 내각의 합 — 180°에 n−2를 곱한
  "g9-real-number", // 실수 — 유리수와 무리수
  "like-terms", // 동류항 — 문자와 차수
  "g7-direct", // 정비례 — y=ax, a≠0
  "g7-inverse", // 반비례 — y=a/x, a≠0
  // 문장을 고친 뒤에도 본디 대칭
  "integer", // 정수 — 양의 정수, 0, 음의 정수 세 가지
  "g7-construction", // 작도 — 눈금 없는 자와 컴퍼스
]);
