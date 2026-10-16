-- 2026-10-16 원장님 «이름 붙인 출제 조건»(시험지 만들기 W5 · Hi-fi 1안) — 저장 자리를 공유 DB 에 둔다(원장님 승인 «추천대로 진행»).
--
-- 내 시험지(`workspace_document`)의 자료 종류에 «출제 조건»(`examCondition`)을 더한다. 출처 · 범위 행(수 · 고정) ·
-- 총 문항 · 난이도 의도 · 최근 출제 빼기 · 같은 문항류 규칙만 담는다 — 문항 · 지면은 담지 않는다.
-- 🔴 넓히기만 한다 — 지금 저장된 행(draft · extraction · conceptBlank · arithmeticSheet)은 새 목록 안이라 깨지지 않는다. DB 먼저 · 코드 나중.
-- 종류를 더할 때 이 목록도 같이 고친다 — `src/__tests__/unit/workspaceDocumentKindConstraint.test.ts` 가 막는다.

-- One ALTER keeps the previous kinds constrained throughout this widening.
ALTER TABLE "workspace_document"
  DROP CONSTRAINT "workspace_document_kind_check",
  ADD CONSTRAINT "workspace_document_kind_check"
    CHECK ("kind" IN ('draft', 'extraction', 'conceptBlank', 'arithmeticSheet', 'examCondition'));
