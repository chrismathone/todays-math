-- 2026-10-16 원장님 «내 양식 저장 · 불러오기»(시험지 만들기 3단계 W6 · A안 — «추천대로 진행»).
--
-- 내 시험지(`workspace_document`)의 자료 종류에 «내 양식»(`printPreset`)을 더한다. 지면 설정(템플릿 · 폰트 · 색 · 배치 ·
-- 간격 · 보기 번호 · 표시 옵션 · 정답지 옵션)과 잘 바뀌지 않는 머리 정보만 담는다 — 문항 · 제목 · 시험일 · 학년 · 학기는 담지 않는다.
-- 🔴 넓히기만 한다 — 지금 저장된 행은 새 목록 안이라 깨지지 않는다. DB 먼저 · 코드 나중.
-- 종류를 더할 때 이 목록도 같이 고친다 — `src/__tests__/unit/workspaceDocumentKindConstraint.test.ts` 가 막는다.

-- One ALTER keeps the previous kinds constrained throughout this widening.
ALTER TABLE "workspace_document"
  DROP CONSTRAINT "workspace_document_kind_check",
  ADD CONSTRAINT "workspace_document_kind_check"
    CHECK ("kind" IN ('draft', 'extraction', 'conceptBlank', 'arithmeticSheet', 'examCondition', 'printPreset'));
