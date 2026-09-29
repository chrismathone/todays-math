# 트랙 english-base — 표 셋 · 적용 스크립트 · 대역 · 라우트 (D-148)

공통 지시 `english-common.md` 를 먼저. 이 트랙은 **뒷단**이다 — 화면은 만들지 않는다. **DB 에 닿지 않는다**(드라이런도 리드가 main 에서).

## 1. 만들 것

### 1.1 Prisma 모델 셋 (`prisma/schema.prisma`) — 25 §2 표 그대로
- `EnglishExam`(`english_exam`) · `EnglishMaterial`(`english_material`) · `EnglishQuestionSet`(`english_question_set`). `User` 에 `englishExams EnglishExam[]`.
- 관례: id `String @id @default(uuid()) @db.Uuid` · `@map`/`@@map` snake_case · `createdAt @default(now()) @map("created_at")` · `updatedAt @updatedAt`. SQL 에만 있는 CHECK 는 `///` 주석에 «SQL 에만 있는 것».
- `types` · `questions` 는 `Json @db.JsonB`. `bytes Bytes?` · `content String? @db.Text`.

### 1.2 마이그레이션 `prisma/migrations/20260930120000_english_studio/migration.sql`
- 표 셋 · FK(exam→user CASCADE, material/set→exam CASCADE) · 색인(25 §2) · CHECK: `grade IN (...)`, `status IN ('초안','검토 중','검토 완료')`, `source IN ('chatgpt','cloze','deepseek','manual')`, `jsonb_typeof(types)='array'`, `jsonb_typeof(questions)='array'`, `revision >= 1`, material `bytes IS NOT NULL OR content IS NOT NULL`, `size >= 0`.
- 세 표 **`ENABLE ROW LEVEL SECURITY`**. 머리 주석에 «Do not run migrate dev/deploy/db push — apply with scripts/qa/apply-english-studio-migration.ts».

### 1.3 가드 스크립트 `scripts/qa/apply-english-studio-migration.ts`
본보기 `scripts/qa/apply-error-log-migration.ts` 를 그대로 따른다: 드라이런 기본(트랜잭션 ROLLBACK) · `ALLOW_SHARED_IMPORT=1` + `--apply` · `--revert`(행이 있으면 `--drop-rows` 요구) · 앞조건(`user` 있음 · 표 셋 없음) · `SET LOCAL lock_timeout` · 적용 뒤 `information_schema`/`pg_constraint`/`pg_indexes`/RLS 확인 · 기존 `user` 행 수 무변경 · `_prisma_migrations` 체크섬 한 줄. **돌리지 않는다.**

### 1.4 시험 대역 `src/mocks/englishTestDouble.ts`
- 인메모리 표 셋 + `composeEnglishDb(base)` (`learnTestDouble.ts` 의 `composeLearnDb` 본보기) — 라우트 시험이 `@/lib/db` 를 이걸로 모킹. `prismaTestDouble.ts` 에는 `errorLogTestDouble` 처럼 **import 한 줄 + models 합성**만(전역 `vitest.setup.ts` 모킹이 그대로 답하게). 모르는 모양(where·select·data)은 **던진다**. `findMany` 는 `where.exam.user.branchId` / `where.exam.userId` / `where.userId` 를 안다(`ownedRowsWhere` 모양). `update` 는 `where: { id, revision }` CAS(맞는 행 없으면 `P2025`).

### 1.5 소유 헬퍼 `src/lib/ownership.ts`
- `requireOwnedEnglishExam(viewer, examId)` — 없으면 404 `notFoundError("시험")`, 범위 밖 403(`withinOwnerScope`). 자료·세트는 부모 시험으로. 기존 헬퍼 모양(`requireOwnedTest`) 그대로.

### 1.6 라우트 (`src/app/api/english/**`, 25 §3 표 — `generate` 는 ai 트랙)
- 계약 `english.contract.ts` 로 입력 parse(`validationError`) · 응답 `jsonOk(…ResponseSchema, …)`.
- `GET /api/english/exams` — `ownedRowsWhere(session)` 를 `{ user: … }`/`{ userId }` 로 · 요약 수 셋(`_count` 또는 두 번째 질의) · `createdAt` 순.
- `POST /api/english/exams` 201 · `PATCH/DELETE /api/english/exams/[id]`.
- `GET/POST /api/english/exams/[id]/materials` — JSON `{name, content}`(계약) **또는** multipart `file`: 이름 확장자 `pdf|docx|txt|png|jpg|jpeg`, `content-length` 로 먼저 자르고 **`ENGLISH_MATERIAL_MAX_BYTES`** 초과는 413 `{error:{code:"PAYLOAD_TOO_LARGE", message:"파일은 10MB 이하로 올려 주세요."}}`(JSON — 사유가 파서에 지워지지 않게) · `.txt` 는 `content` 도 채움(≤30,000자). 목록은 bytes 없이(`select`).
- `GET /api/english/materials/[id]` — 파일이면 bytes, 아니면 content 를 `text/plain; charset=utf-8` · `Content-Disposition: attachment; filename*=UTF-8''…` · `X-Content-Type-Options: nosniff`. `DELETE`.
- `GET/POST /api/english/exams/[id]/sets` — POST 는 `englishSetCreateSchema` → **`validateEnglishDraft`** 통과해야(실패 422 `ENGLISH_DRAFT_REJECTED`, `details` 에 `issues`) → `status: "초안"` · `revision: 1` 저장 → 201 `englishSetResponseSchema`.
- `GET/PUT/DELETE /api/english/sets/[id]` — PUT 은 `englishSetUpdateSchema` → 검증기 → `update where {id, revision}` · 없으면 409 `REVISION_MISMATCH`(«다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.») · `revision + 1`.
- 세션 `getSessionUser()` 401 · 쓰기는 같은 출처 검사(`authorizeAccount` 의 `sameOriginMutation` 결 — 기존 헬퍼가 있으면 그것).

### 1.7 영어 울타리 `src/__tests__/unit/englishFence.test.ts` (25 §6)
- D-141 울타리(`mathSrsQuickFence.test.ts` · `mathSrsRecordIsolation.test.ts`)와 같은 정적 검사, 주석 걷기는 `src/__tests__/helpers/sourceComments.ts`.
- ⑴ 금지 뿌리(문제은행 `src/lib/problem*` · `src/lib/elementary` · `src/lib/middle*` · `src/lib/ai/` · `src/lib/daily/` · `src/lib/math-srs/` · `src/lib/math-explorers/` · `src/app/api/{problems,tests,basket,exports,studio,learn}` · `scripts/`)에서 `src/lib/english/**` · `src/components/english/**` 로 가는 import 사슬 **0**. 🔴 `src/components/unified/**`(셸)와 `src/app/(main)/english/**` · `src/app/api/english/**` 는 **허용**(quick 울타리를 베끼면 셸이 막힌다).
- ⑵ `english_exam|english_material|english_question_set|EnglishExam|EnglishMaterial|EnglishQuestionSet` 글자는 허용 목록(`prisma/schema.prisma` · 그 마이그레이션 · 적용 스크립트 · `src/lib/english/**` · `src/lib/ownership.ts` · `src/app/api/english/**` · `src/app/(main)/english/**` · `src/mocks/englishTestDouble.ts` · `src/mocks/prismaTestDouble.ts` · `src/__tests__/**` · `docs/**`)에만.
- 자기 변이로 확인: 금지 뿌리 파일 하나에 영어 import 를 넣은 임시 복사본으로 시험이 빨개지는지(보고서에 결과).

## 2. 시험
- `src/__tests__/api/englishExams.test.ts` · `englishMaterials.test.ts` · `englishSets.test.ts` — 핸들러를 직접 불러 응답을 계약으로 `.parse()` · 401/403/404/409/413/422 · 지점 관리자는 지점 전체 · 강사는 자기 것만 · multipart 10MB 경계(실제 바이트로) · CAS.
- `src/__tests__/unit/englishTestDouble.test.ts`(모르는 모양은 던진다) · 울타리.
- 전수 가드가 요구하는 것: `errorLogRouteCoverage`(withErrorLog) · `accountRouteAccess.test.ts` · `examWiringAudit`(`db.problem` 은 안 쓴다 — 걸리지 않아야 정상).

## 3. 보고서 `docs/planning/tracks/reports/english-base.md`
한 것 · 시험 결과 줄 · 계약에서 모자랐던 것 · 리드가 정할 것(드라이런 명령 한 줄 그대로 적기) · 위험.
