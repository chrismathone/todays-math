-- 오늘의 영어 — 세트의 «만든 조건» (D-151 · 원장님 2026-10-01 «수학 문제처럼 생성된 영어 문제도 입력할 수 있는 모든 메타데이터 기억되게»)
-- 만들기 화면의 칸(제작 방식 · 소재 · 원문 변형의 원문 · 난이도 · 문항 수 · 지문 길이 · 유형 · 자료 이름)과 서버 AI 의 모델 · 프롬프트 판.
-- 모양은 계약 src/contracts/english.contract.ts `englishSetMetaSchema` 가 잠근다. 옛 세트는 NULL 로 남는다(채우지 않는다).
--
-- 🔴 배포 순서: 이 SQL 을 공유 DB 에 **먼저** 적용한 뒤 코드를 민다 — 거꾸로면 세트 읽기가 «column does not exist» 로 전부 500.
--    더하기만 하는 변경이라 옛 코드는 이 칸을 모른 채 그대로 돈다.
-- 🔴 Do not run migrate dev/deploy/db push — apply with scripts/qa/apply-english-set-meta-migration.ts

ALTER TABLE "english_question_set" ADD COLUMN "meta" JSONB;
ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_meta_object" CHECK ("meta" IS NULL OR jsonb_typeof("meta") = 'object');
