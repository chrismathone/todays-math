-- 2026-10-01 원장님 «개념 백지를 담아서 내 시험지에 저장하고 다음에 또 쓸수 있게» — 26 §9 ⑾(이 마이그레이션 적용 승인 포함).
--
-- 내 시험지(`workspace_document`)의 자료 종류에 «개념 백지»(`conceptBlank`)를 더한다. 개념 백지는 고정 문항이라
-- 고르기(소단원 · 형식 · 난이도별 수 · 제목)만 담는다 — 문제은행 · 출제 엔진은 그대로다.
-- 🔴 넓히기만 한다 — 지금 저장된 행(draft · extraction)은 새 목록 안이라 깨지지 않는다. DB 먼저 · 코드 나중.
-- 제약 이름은 표를 만들 때 칸 옆 CHECK 에 Postgres 가 붙인 것이다(20260914134000).
-- 종류를 더할 때 이 목록도 같이 고친다 — `src/__tests__/unit/workspaceDocumentKindConstraint.test.ts` 가 막는다.

ALTER TABLE "workspace_document" DROP CONSTRAINT "workspace_document_kind_check";

ALTER TABLE "workspace_document" ADD CONSTRAINT "workspace_document_kind_check"
  CHECK ("kind" IN ('draft', 'extraction', 'conceptBlank'));
