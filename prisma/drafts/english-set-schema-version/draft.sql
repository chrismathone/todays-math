-- 오늘의 영어 — 세트의 «형식 판» 칸과 2판 본문 칸 (자료 개선 M0 · docs/planning/english-material-upgrade-20261002.md §C)
--
-- 🔴 **초안이다. 어디에도 적용하지 않았다.** 이 파일은 `prisma/migrations/` 밖에 있어 `prisma migrate` 가 모른다.
--    `prisma/schema.prisma` 에도 이 칸이 **없다** — 칸이 없는 DB 에 칸을 읽는 코드가 먼저 나가면 세트 읽기가 전부 500 이다.
-- 🔴 Do not run migrate dev/deploy/db push. 적용은 M1 게이트(원장님 승인 · 2판 저장 방식 확정) 뒤에,
--    이 초안을 `prisma/migrations/<날짜>_english_set_schema_version/migration.sql` 로 옮기고 전용 적용 도구로 한다.
--    지금 돌릴 수 있는 것은 `npx tsx scripts/qa/check-english-schema-version-draft.ts` (DB 에 닿지 않는 정적 검사)뿐이다.
--
-- 무엇을 더하나 — **더하기만 한다**(기존 칸 · 행 · CHECK · 색인 · RLS 를 안 건드린다):
--   schema_version  자료 형식의 판(1 · 2). 지금 있는 행은 모두 1 이 된다(DEFAULT). 동시 수정 CAS 인 `revision` 과 다른 칸이다.
--   payload_v2      2판 문서(계약 `englishV2DocumentSchema`). 1판 행은 NULL.
--
-- 지키는 것:
--   - 1판 행은 지금과 똑같다: `questions` 배열 · `meta`(NULL 그대로) · `source` 의 옛 값(deepseek) · `revision` 의 뜻.
--   - 옛 코드(이 칸을 모르는 빌드)는 그대로 돈다 — INSERT 는 DEFAULT 1 을 받고, 읽기는 칸을 안 읽는다.
--   - 2판 행의 `questions` 는 **빈 배열**이어야 한다. 옛 코드가 2판 행에 1판 문항 배열을 덮어쓰면 DB 가 거절한다
--     (소리 없이 섞인 행이 생기지 않는다). 옛 코드가 2판 행을 읽으면 계약의 «문항 1개 이상»에 걸려 드러난다.
--   - `payload_v2` 안의 `schemaVersion` 은 칸과 같은 2 여야 한다 — 행과 본문이 서로 다른 판을 말하지 못한다.
--
-- 열어 둔 것(M1 에서 확정 — 이 초안이 정하지 않는다):
--   - 2판 행의 `passage`(NOT NULL) 에 무엇을 둘지(첫 지문의 글 · 빈 글).
--   - 원본 파일 · 추출 블록 · 권리 이력은 **이 표에 칸을 끼우지 않는다** — `english_material` 의 CHECK(bytes 또는 content)를
--     깨지 않게 따로 영어 문서/asset 표로 설계한다(§C.3).
--
-- 되돌리기(적용 뒤 · 2판 행이 **없을 때만**): CHECK → 칸 둘 순서로 지운다. 2판 행이 생긴 뒤에는 되돌리지 않고
-- 2판 쓰기를 끈 채 읽기 호환을 유지하거나 앞으로 고친다(§A-5).

ALTER TABLE "english_question_set" ADD COLUMN "schema_version" SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE "english_question_set" ADD COLUMN "payload_v2" JSONB;

-- 판은 1 과 2 뿐이다 — 두 갈래 어디에도 안 드는 값(3 · 0 …)은 이 CHECK 가 거절한다. 판을 더하면 새 마이그레이션으로 갈래를 넓힌다.
-- (판만 따로 재는 CHECK 를 하나 더 두지 않는다 — 이 CHECK 에 가려 한 번도 울지 않는 제약이 된다. 로컬 드라이런의 변이로 확인.)
-- 1판 행에는 2판 본문이 없고, 2판 행에는 2판 본문(객체 · 같은 판)이 있고 1판 문항 배열이 비어 있다.
-- 🔴 본문의 판은 `@>` 로 잰다. `->` 로 꺼내 `=` 로 견주면 칸이 없을 때 NULL 이 되고, CHECK 는 NULL 을 통과로 본다 —
--    판 표지가 없는 빈 객체 `{}` 가 2판 본문으로 들어간다(2026-10-02 로컬 드라이런의 표본이 잡았다).
--    `@>` 는 본문이 객체일 때만 참이라(배열 · 글자는 거짓) «객체인가»를 따로 재지 않는다 — 따로 두면 가려져 안 우는 절이 된다.
ALTER TABLE "english_question_set" ADD CONSTRAINT "english_question_set_payload_matches_version" CHECK (
  ("schema_version" = 1 AND "payload_v2" IS NULL)
  OR (
    "schema_version" = 2
    AND "payload_v2" IS NOT NULL
    AND "payload_v2" @> '{"schemaVersion": 2}'::jsonb
    AND jsonb_array_length("questions") = 0
  )
);
