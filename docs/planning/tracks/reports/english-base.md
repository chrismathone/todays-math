# 보고 — 트랙 english-base: 표 셋 · 적용 스크립트 · 대역 · 라우트 · 울타리 (D-148)

브리프: `docs/planning/tracks/briefs/english-base.md` · 공통 `english-common.md`
SSOT: `docs/planning/25-english-studio.md` §2 · §3 · §4.4 · §6 · 결정 **D-148**(07 Decision Log)
워크트리: `BIGSHOL/english-base` · 기준 커밋 **`0150e9db6`**(리드가 옮긴 것 — 1790652d7 과 같은 내용) · 리드 커밋 **c70ee7509**(오류 코드 셋) · **946cccacb**(25 §6.2 정정 · 검증기 시험 `s` 플래그 제거) · **2de827cc3**(자료 상한 4MB) 병합 · 2026-09-30 · **푸시하지 않았다.**

> 🔴 **DB 에 닿지 않았다 — 드라이런도.** 마이그레이션·적용 스크립트는 **파일만** 있다(브리프 «DB 에 닿지 않는다», `.env` 없음).
> 배포 순서는 **DB 먼저 · 코드 나중**(25 §7 ①): ① 리드가 main 에서 드라이런 → ② 원장님께 여쭘 → ③ `--apply` → ④ 코드 병합·푸시.
> ④ 가 ③ 보다 앞서면 영어 메뉴의 모든 요청이 500(P2021)이다 — 옛 화면은 이 표를 모르므로 수학 쪽은 무사하다.

---

## ① 무엇을 만들었나

### 표 셋 · 마이그레이션 · 적용 스크립트 (파일만 — 공유 DB 에 적용하지 않았다)

| 파일 | 무엇 |
|---|---|
| `prisma/schema.prisma` (고침, +78줄) | `EnglishExam`(`english_exam`) · `EnglishMaterial`(`english_material`) · `EnglishQuestionSet`(`english_question_set`) + `User.englishExams`. 관례대로 uuid id · `@map` snake_case · `types`·`questions` `Json @db.JsonB` · `bytes Bytes?` · `content String? @db.Text` · `examDate @db.Date`. SQL 에만 있는 CHECK 는 `///` 주석에 «SQL 에만 있는 것». ⚠️ `prisma format` 은 **돌리지 않았다** — 돌리면 무관한 모델 72줄이 재정렬된다(한 번 돌렸다가 되돌림). 블록은 손으로 정렬했고 `prisma validate` 는 통과 |
| `prisma/migrations/20260930120000_english_studio/migration.sql` (새로) | 윗부분은 `prisma migrate diff --from-schema-datamodel <0150e9db6 schema> --to-schema-datamodel …` (DB 없이 스키마끼리, DATABASE_URL 은 닿지 않는 127.0.0.1:1) 산출 **그대로** — 표 3 · 색인 3 · FK 3(exam→user **CASCADE** · material/set→exam **CASCADE**). «손으로 더한 것»: CHECK 8(`grade IN` · `jsonb_typeof(types)='array'` · `bytes IS NOT NULL OR content IS NOT NULL` · `size >= 0` · `status IN` · `source IN` · `jsonb_typeof(questions)='array'` · `revision >= 1`) · RLS 3. **20문장**. 머리에 «Do not run migrate dev/deploy/db push — apply with scripts/qa/apply-english-studio-migration.ts» |
| `scripts/qa/apply-english-studio-migration.ts` (새로) | `apply-error-log-migration.ts` 를 그대로 따랐다 — 드라이런 기본(트랜잭션 안에서 다 하고 ROLLBACK) · `ALLOW_SHARED_IMPORT=1 --apply` · `--revert`(행이 있으면 `--drop-rows` 요구) · 앞조건(`user` 있음 · 세 표 없음) · `SET LOCAL lock_timeout='10s'` · 적용 뒤 ⑵ 칸 형·NULL(9·8·10칸) ⑶ FK 셋과 ON DELETE ⑷ 색인 셋 ⑸ CHECK 여덟(`pg_constraint contype='c'`) ⑹ RLS 셋 ⑺ `user` 행 수 무변경 · `_prisma_migrations` 체크섬 한 줄(CR 제거 sha256). 문장 수 20 을 못 박았다. **돌리지 않았다** |

### 시험 대역 · 소유 헬퍼 · 라우트 지원

| 파일 | 무엇 |
|---|---|
| `src/mocks/englishTestDouble.ts` (새로) | 인메모리 표 셋 + `composeEnglishDb(base)`(`composeLearnDb` 본보기 — 계정은 원래 대역, 영어 셋은 여기). **모르는 모양(where·select·include·orderBy·data)은 던진다.** `findMany` 는 `ownedRowsWhere` 모양(`userId` · `user.branchId` · `exam.userId` · `exam.user.branchId` · `{}`) · `id/examId: {in}` · `bytes: null | {not: null}` · `status` 를 안다. `include._count.select.{materials,sets}` · `revision: {increment}` · `update where {id, revision}` CAS(없으면 `P2025`) · `delete` Cascade · SQL CHECK 흉내(본문 하나 · size ≥ 0 · 배열 · FK). 씨앗 셋 + `englishRows` |
| `src/mocks/prismaTestDouble.ts` (고침, 3줄) | `errorLogTestDouble` 과 같은 결 — import 한 줄 · `...englishModels` 합성 · `resetPrismaTestDouble()` 에서 `resetEnglishTestDouble()` (reset 을 안 걸면 행이 시험 사이로 샌다) |
| `src/lib/ownership.ts` (고침) | `requireOwnedEnglishExam(viewer, examId)` — 없으면 404 `notFoundError("시험")`, 범위 밖 403(`ownerIsInScope` → `withinOwnerScope`). 자료·세트는 라우트가 `examId` 를 읽어 이 하나로 판정 |
| `src/lib/english/serialize.ts` (새로, **base 소유**) | DB 행 → 계약(`serializeEnglishExam(row, counts)` · `serializeEnglishMaterial(row, hasFile)` · `serializeEnglishSetSummary` · `serializeEnglishSet` · `englishSetTypes`) · `toDateOnly`/`fromDateOnly`(UTC 자정 — `Test.testDate` 와 같은 결). 인쇄 페이지(print 의 `page.tsx`)가 세트를 읽을 때 같이 쓸 수 있다 |
| `src/lib/english/routeSupport.ts` (새로, **base 소유**) | `requireEnglishSession(request, {mutation})`(401 · 쓰기는 `sameOriginMutation` 403 «같은 사이트에서 요청해 주세요.») · 영어 전용 거절 `englishError`/`payloadTooLarge`(413)/`draftRejected`(422 `details.issues`)/`revisionMismatch`(409) · 자료 파일 규칙(확장자→MIME 표 · `contentLengthExceeds` · `attachmentDisposition`) · `loadEnglishExams(where)`/`loadEnglishExam(id)`(`_count` + 검토 완료 수는 둘째 질의) |

### 라우트 (`src/app/api/english/**` — 6파일 · 13처리기, 전부 `withErrorLog("<경로 글자 그대로>", …)`)

| 경로 | 메서드 | 무엇 |
|---|---|---|
| `/api/english/exams` | GET | `ownedRowsWhere(session)` 그대로 where 에 · 요약 셋 · **새것이 먼저(createdAt desc)** · `Cache-Control: private, no-store` |
| | POST | `englishExamCreateSchema` → 201 · `types: []` · 소유자 = 세션 |
| `/api/english/exams/[id]` | PATCH | `englishExamUpdateSchema`(`title?` · `examDate?`(null 로 지움) · `types?`) → 고친 뒤 요약과 함께 200 |
| | DELETE | `requireOwnedEnglishExam` → `delete`(DB Cascade) → `{data:{id}}` |
| `/api/english/exams/[id]/materials` | GET | `bytes` 없이(`select`) · `hasFile` 은 둘째 질의 `bytes: {not: null}` · **올린 차례(createdAt asc)** |
| | POST | 본문 읽기 **전** `content-length` > `ENGLISH_MATERIAL_MAX_BYTES`(4MB) + 64KiB(겉봉 여유) → 413 JSON. multipart(`file`): 확장자 `pdf·docx·txt·png·jpg·jpeg` 아니면 400 · `file.size` > 상한 → 413 · 빈 파일 400 · MIME 은 **확장자 표**(브라우저 형은 안 믿음) · `.txt` 는 `content` 도(trim · ≤30,000자) · 깨진 multipart 400. JSON `{name, content}` → `text/plain` · size = UTF-8 바이트 |
| `/api/english/materials/[id]` | GET | 파일이면 bytes 를 그 MIME 으로, 아니면 `content` 를 `text/plain; charset=utf-8`(이름에 `.txt`) · `Content-Disposition: attachment; filename="<ascii>"; filename*=UTF-8''…` · `X-Content-Type-Options: nosniff` · `private, no-store` |
| | DELETE | 부모 시험으로 404/403 |
| `/api/english/exams/[id]/sets` | GET | 요약 목록(지문·문항 없음) · **최근 고친 것이 먼저(updatedAt desc)** |
| | POST | `englishSetCreateSchema` → **`validateEnglishDraft`** 실패 422 `ENGLISH_DRAFT_REJECTED` + `details.issues[{question, message}]` → `status:"초안"` · `revision:1` → 201 |
| `/api/english/sets/[id]` | GET | 세트 전체 |
| | PUT | `englishSetUpdateSchema` → 검증기(`source` 는 저장된 값) → `update where {id, revision}` · `revision: {increment: 1}` · P2025 면 행이 남아 있으면 409 `REVISION_MISMATCH`(«다른 곳에서 먼저 저장됐습니다. 다시 불러온 뒤 고쳐 주세요.»), 그 사이 지워졌으면 404 |
| | DELETE | 부모 시험으로 404/403 |

판정 순서는 기존 라우트와 같다: 세션 401 → (쓰기) 같은 출처 403 → id 400 → 존재 404 → 범위 403 → 본문 400 → 검증기 422 → CAS 409.

### 시험

| 파일 | 건수 | 무엇 |
|---|---|---|
| `src/__tests__/api/englishExams.test.ts` | 22 | 401·403(다른 출처)·400 다섯 · 201 응답 계약 parse · 저장 행 소유자 · 날짜 왕복 · 목록 범위(강사 자기 것만 · 지점 관리자 지점 전체 · 다른 지점 0) · 요약 수 셋 · 차례 · PATCH 404/403/400 넷/200 · DELETE Cascade(남의 것은 남는다) |
| `src/__tests__/api/englishMaterials.test.ts` | 23 | JSON 지문 201/400 넷 · png 201(MIME 은 확장자 · bytes 원본 저장) · `.txt` content · 확장자 다섯 400 · file 칸 없음/빈 파일/깨진 multipart 400 · **content-length 로 본문 읽기 전 413(JSON 사유)** · **상한(4MB) 경계 실제 바이트(정확히 상한 201 · +1 413 — 크기·문구 모두 계약 상수에서)** · 목록(bytes 없음 · 차례) · 내려받기 머리(attachment UTF-8 · nosniff · text/plain) · 소유 넷 · 지점 관리자 |
| `src/__tests__/api/englishSets.test.ts` | 23 | 201(초안·revision 1·유형 딱지) · status 보내면 400 · 계약 400 넷 · 검증기 422 넷(문항 번호·문구) · **makeCloze 초안 저장** · 소유 넷 · 요약 목록(지문 없음·차례) · GET · PUT 200/409(낡은 revision — 아무것도 안 바뀜 → 다시 읽으면 저장)/422/400 셋/404/403 · DELETE |
| `src/__tests__/unit/englishTestDouble.test.ts` | 17 | 모르는 모양 여섯이 던진다 · ownedRowsWhere 모양 · `_count` · Cascade · CHECK/FK 흉내 · `bytes` 필터 · select 투영 · CAS(P2025 · increment) · compose 없이 `where.user` 를 물으면 던진다 |
| `src/__tests__/unit/englishFence.test.ts` | 10 | 아래 «울타리» |

### 영어 울타리 `src/__tests__/unit/englishFence.test.ts` (25 §6 · 브리프 §1.7 · **리드 정정 2026-09-30 반영**)

- ⑴ **import 사슬** — 금지 뿌리(브리프 목록 + 시험지·내보내기·엔진·검수·예측·인쇄 뿌리)에서 몇 단계를 돌아가도 `src/lib/english/**` · `src/components/english/**` 에 닿지 않는다. 🔴 `src/components/unified/**` · `src/app/(main)/english/**` · `src/app/api/english/**` · `src/lib/ownership.ts` · `src/mocks/**` 는 **금지 뿌리가 아니다**(시험이 `NEVER_FORBIDDEN` 으로 못 박음 — quick 울타리를 베끼면 셸이 막힌다).
- ⑵ **DB 식별자만** — 표 이름 글자 `english_exam|english_material|english_question_set` · 접근자 `.englishExam|.englishMaterial|.englishQuestionSet`(`db.`·`tx.` 등 받침 불문) · Prisma 가 만든 모델 형(`Prisma.EnglishExam…` · `@prisma/client` 의 `EnglishExam|…`). **계약의 타입 이름 `EnglishExam·EnglishMaterial·EnglishQuestionSet` 은 세지 않는다**(리드 정정 — 화면·MSW·print 가 쓴다). 허용 목록: 스키마 · 그 마이그레이션 · 적용 스크립트 · `src/lib/english/**`(serialize · routeSupport 포함) · `src/lib/ownership.ts` · `src/app/api/english/**` · `src/app/(main)/english/**`(print 가 만들 자리 — 실재 검사만 미룸) · `src/mocks/englishTestDouble.ts` · `src/mocks/prismaTestDouble.ts` · `src/__tests__/**` · `docs/**`. 주석은 `helpers/sourceComments.ts` 로 걷고(`eatenCode` 0 단정) `src·scripts·prisma·e2e·.claude` 의 ts·js·py·sql·prisma 를 훑는다.
- 자기 시험: import 모양 여섯 · 분모(파일 > 1000 · 금지 뿌리 > 200 · 알려진 사용처·접근처) · 합성 그래프 변이 셋(ai→validate · daily→컴포넌트 · apiResponse 를 거쳐 돌아가기) · `tableAccess` 표본(DB 접근 넷은 잡고 계약 형·컴포넌트 이름·주석은 안 잡음).

---

## ② 시험 결과 줄

```
npx vitest run src/__tests__/api/englishExams.test.ts src/__tests__/api/englishMaterials.test.ts src/__tests__/api/englishSets.test.ts \
  src/__tests__/unit/englishTestDouble.test.ts src/__tests__/unit/englishFence.test.ts src/__tests__/unit/englishMenu.test.ts \
  src/__tests__/unit/englishValidate.test.ts src/__tests__/unit/errorLogRouteCoverage.test.ts src/__tests__/unit/accountRouteAccess.test.ts \
  src/__tests__/unit/examWiringAudit.test.ts src/__tests__/unit/prismaTestDoubleSnapshot.test.ts src/__tests__/unit/withErrorLog.test.ts \
  src/__tests__/unit/contracts.smoke.test.ts src/__tests__/unit/ownerScope.test.ts src/__tests__/api/adminSeesAll.test.ts
→ Test Files 15 passed (15) · Tests 275 passed (275)
검토 후속 뒤: 관련 10파일 169건 통과 · 🔴 AUTH_URL=http://localhost:3000 npx vitest run <API 시험 셋> → 3파일 70건 통과(main 의 .env 를 흉내 낸 재현 — 스텁 전에는 54건이 403 이었다, 검토 A)
npm run lint            → 0 errors (경고 62 — 전부 기존 파일: review.contract · elementary · middle · math-explorers · unifiedPreview). 영어 파일의 경고는 처음에 1 이었다(`englishExams.test.ts` 미사용 `OTHER` — 검토 G) → 지웠고 `eslint --max-warnings=0` 으로 영어 파일 전부 0 확인
npm run lint:affordance → 통과
npx tsc --noEmit        → 오류 0 (기준 커밋의 오류 1건은 리드 946cccacb 가 고쳤고 병합됨)
npx prettier --check    → 새 파일 전부 통과 · 고친 기존 파일 둘은 --strip-trailing-cr diff 로 차이 없음
```

**자기 변이(실제 임시 파일로 — 보고 뒤 지웠고 `git status` 에 없다)**

| 변이 | 결과 |
|---|---|
| `src/lib/ai/__english_probe.ts` 에 `import … from "@/lib/english/validate"` | 울타리 ⑴ 빨강 — `src/lib/ai/__english_probe.ts → src/lib/english/validate.ts` |
| `src/lib/daily/__english_probe.ts` 에 `db.englishExam.findMany()` | 울타리 ⑵ 빨강 — `src/lib/daily/__english_probe.ts (클라이언트 접근)` |
| `sets/[id]/route.ts` 의 PUT 틀 경로를 `/api/english/sets/[id]x` 로 | `errorLogRouteCoverage` ⑴·⑵ 둘 다 빨강(«틀의 경로가 파일과 다르다» · «표지 …x») — 새 라우트 6파일이 모집단에 들어갔다(교훈 2026-09-26) |
| 되돌린 뒤 | 두 가드 24건 초록 |

전체 시험은 돌리지 않았다(공통 지시 — 트랙 넷이면 워커가 굶는다; 리드가 병합 뒤 main 에서).

---

## ③ 계약에서 모자랐던 것 · 브리프와 다르게 한 것

1. ~~`errorCodeSchema` 에 영어 코드 셋이 없었다~~ → **리드가 c70ee7509 로 넣었고 이 브랜치에 병합했다**(82cf5bcdb). `routeSupport` 의 413/422/409 는 이제 다른 거절과 같이 `jsonError` 를 지나고, 시험도 `errorResponseSchema` 로 parse 한다(후속 커밋).
2. ~~`englishValidate.test.ts` 117행의 정규식 `s` 플래그가 tsc 에서 빨갰다~~ → **리드 946cccacb 가 플래그를 뺐고 병합했다** — tsc 오류 0.
3. `requireOwnedEnglishExam(**viewer, examId**)` — 브리프·25 §3 이 두 번 그렇게 적어 그대로 했다. 기존 헬퍼(`requireOwnedTest(id, viewer)`)와 인자 차례가 반대다. 맞추라면 한 줄.
4. 계약에 **시험 하나 읽기(GET `/api/english/exams/{id}`)** 가 없어 만들지 않았다(목록에 요약이 같이 온다). 목록은 페이지 없이 전부(학원 하나 규모).
5. **`.txt` 파일의 `content`** — 계약 상한 30,000자를 넘는 뒷부분은 싣지 않는다(원본 `bytes` 는 그대로, 내려받기는 온전). 거절할지 자를지는 정하지 않은 자리라 «자름»으로 두고 응답 `content` 에 그대로 보이게 했다.
6. **차례** — 시험 목록 `createdAt` **내림차순**(새 시험이 먼저), 자료 `createdAt` 오름차순(올린 차례), 세트 `updatedAt` 내림차순(최근 고친 것). 브리프의 «createdAt 순»은 방향이 없어 이렇게 정했다 — 셸이 다른 차례를 원하면 알려 달라.
7. **PUT 은 보낸 `status` 를 그대로 저장한다.** «내용을 고치면 상태는 초안으로 내려간다»(25 §1.3)는 편집 화면(shell) 규칙으로 읽었다. 서버가 강제하길 원하면 PUT 에서 `passage/questions` 가 바뀌었을 때 `status` 를 «초안»으로 덮는 줄 하나.
8. `content-length` 선판정에 **겉봉 여유 64KiB** 를 뒀다 — 정확히 4MB(계약 상수) 인 파일이 multipart 경계 몇백 바이트 때문에 거절되지 않게. 실제 크기는 받은 뒤 `file.size` 로 다시 잰다(경계 시험이 실제 바이트로 잠근다).
9. 울타리 ⑵ 는 리드 정정대로 **DB 식별자만** 센다. 거기에 Prisma 가 만든 모델 형(`@prisma/client` 의 `EnglishExam` · `Prisma.EnglishExam…`)도 DB 쪽 식별자로 보고 같이 센다 — 화면이 이걸 import 하면 DB 결합이라 빨간 게 맞다고 봤다. 빼라면 정규식 둘(`PRISMA_NAMESPACE` · `PRISMA_IMPORT`)을 지우면 된다.
10. `src/lib/english/serialize.ts` · `routeSupport.ts` 는 브리프 소유 표에 없던 **새 base 모듈**이다(ai 의 `generate.ts`·`chatgpt.ts` 와 이름이 겹치지 않는다).
11. `prismaTestDouble.ts` 는 «import 한 줄 + 합성»에 **reset 호출 한 줄**을 더했다 — errorLog 대역과 같은 결이고, 없으면 영어 행이 시험 사이로 샌다.
12. 워크트리는 오르카가 **origin/main(c134549f1)** 에서 만들었고 로컬 main(0150e9db6)과 갈라져 있었다(둘 다 f60f8f9b7 위). 내 변경이 없을 때 `git reset --hard 0150e9db6` 로 옮겼다 — origin 의 커밋 여섯(D-143/D-146 후속)은 이 브랜치에 없다. 리드가 pull 할 때 알고 있으면 된다.

---

## ④ 리드가 정할 것

- **드라이런(main · `.env` 있는 자리) — 한 줄 그대로:**
  ```
  npx tsx scripts/qa/apply-english-studio-migration.ts
  ```
  원장님께 여쭌 뒤:
  ```
  ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-english-studio-migration.ts --apply
  ```
  되돌리기 드라이런 `npx tsx scripts/qa/apply-english-studio-migration.ts --revert`(행이 있으면 `--drop-rows`).
- ③-3 인자 차례 · ③-6 차례 · ③-7 PUT 상태 강제 · ③-9 Prisma 형 검사 유지 여부.
- ⑤-1 은 리드가 받아들여 상한을 4MB 로 내렸다(2de827cc3) — 남은 결정 없음.

---

## ⑤ 위험

1. ~~Vercel Serverless Function 의 요청 본문 상한 4.5MB 에 10MB 파일이 먼저 막힌다~~ → **리드가 받아들여 계약 상한을 4MB 로 내렸다**(2de827cc3 · `ENGLISH_MATERIAL_MAX_BYTES` = 4MB · 문구는 `ENGLISH_MATERIAL_MAX_LABEL`). 라우트 문구·주석·경계 시험은 그 상수에서 끌어 쓴다 — 숫자를 손으로 적은 자리가 없다. 4.5MB 와 4MB 사이 겉봉 여유(64KiB)는 그대로 들어간다.
2. **실제 DB 로 한 번도 안 돌렸다.** 대역이 흉내 낸 것 — `update where {id, revision}`(Prisma 5+ extendedWhereUnique) · `bytes: {not: null}` 필터 · `include._count` · `Bytes`(Uint8Array) 를 `Response` 본문으로 · `@db.Date` 왕복 — 은 main 에서 드라이런 뒤 표본 한 번(시험 하나 · 자료 하나 · 세트 저장·고치기)으로 확인해야 한다(교훈 2026-09-20 «없어서 초록인 것은 안 보인다»).
2-1. **`prismaTestDouble.$transaction` 의 스냅샷은 영어 행을 안 덮는다**(검토 H — 설계: 영어 라우트는 tx 를 안 쓴다, `englishTestDouble.ts` 머리말). 누가 tx 안에서 영어 표를 만지면 실패한 트랜잭션의 영어 행이 조용히 남는다 — `prismaTestDoubleSnapshot` 은 그 파일의 `let *Rows` 만 세므로 못 잡는다. 그때는 영어 행 배열을 스냅샷에 넣거나(같은 파일로 합치기) 대역을 `$transaction` 에 연결해야 한다.
3. **CHECK 가 계약 값과 글자로 묶여 있다** — 학년·상태·출처 값을 계약에 더하면 새 마이그레이션 없이는 DB 가 거절한다(조용히 통과하지 않는다 — 의도한 것).
4. **RLS 는 켰고 정책은 없다** — 앱은 Prisma 직결로 소유 범위를 걸어 읽는다(다른 새 표와 같은 관례). Supabase 공개 API 로는 못 읽는다.
5. `content-length` 가 없는(chunked) 요청은 다 받은 뒤에야 잰다 — 플랫폼 상한이 먼저 막으므로 실질 위험은 작다.
6. 울타리 ⑴ 의 금지 뿌리를 브리프보다 넓혔다(시험지·내보내기·인쇄·검수·예측 뿌리). `src/components/print/**` 이 언젠가 영어 컴포넌트를 부르면 빨갛다 — 방향이 반대(영어 → print 의 `A4Page`)라 지금 설계에서는 부딪히지 않는다.
7. `prisma format` 을 리드가 나중에 돌리면 무관한 모델 72줄이 재정렬된다 — 내 커밋에는 없다.
8. 병합 뒤 shell 의 MSW 핸들러(`src/mocks/handlers/english.ts`)와 이 라우트의 응답이 같은 계약을 지나므로 모양은 맞지만, **차례(③-6)·413 문구·422 `details.issues` 모양**은 셸이 그대로 읽는지 리드가 한 번 견줘야 한다.

---

## ⑥ 못 한 것

- DB 드라이런·적용(브리프대로 안 함) · 전체 시험(리드가 main 에서) · `generate` 라우트(ai 트랙) · 화면(shell) · 인쇄(print).

---

## ⑦ 검토 후속 (리드 적대적 검토 — 판정 «조건부 병합 가능», 병합 대상 f859d93e6 → 후속 커밋들)

- **8d84bd920** — 울타리 ⑴ 예외: ai 트랙의 실물 탐침 `scripts/qa/probe-english-generate-live.ts` 를 `NEVER_FORBIDDEN` 에 두고 `isForbidden` 이 그 목록을 먼저 보게 했다(리드 D1, 2026-09-30). `scripts/` 의 나머지는 그대로 금지 · 합성 간선 변이는 그대로 빨강. 25 §6 문서는 리드가 병합 때 고친다.
- **fe2e279ad** — 검토 A·C·D·E·F·G.
  - A 🔴 API 시험 셋 `beforeEach` 첫 줄에 `vi.stubEnv("AUTH_URL", "")` · `vi.stubEnv("NEXTAUTH_URL", "")`(+ `afterEach(vi.unstubAllEnvs)`, 선례 `classOwner.test.ts`) — main 의 `.env`(`AUTH_URL=http://localhost:3000`)가 워커에 실려 같은 출처 검사가 403 을 내던 자리. 워크트리에서 `AUTH_URL=http://localhost:3000` 으로 재현해 70/70.
  - C 🟡 적용 스크립트 «이미 적용» 판정 — `_prisma_migrations` 기록이 있으면 세 표 `to_regclass` 도 보고, 하나라도 없으면 «기록은 있는데 표가 없다» throw(exit 1).
  - D 🟡 `check()` 가 CHECK 를 `pg_get_constraintdef` 정의문으로 대조 — 학년·상태·출처 목록은 계약 상수(`ENGLISH_GRADES` · `ENGLISH_SET_STATUSES` · `ENGLISH_SET_SOURCES`)와 **집합**으로 같아야(빠짐·남음 모두 빨강), 배열·본문·크기·revision 식은 기대 모양과 맞아야 한다. ⚠️ PG 의 `IN` 재작성 모양(`= ANY (ARRAY['…'::character varying…])`)을 전제로 따옴표 값을 뽑는다 — 드라이런에서 모양이 다르면 정의문을 찍고 멈춘다(열린 채 통과하지 않는다).
  - E 🟡 `.txt` `content` 자르기 — `clampUtf16`(UTF-16 단위로 자르되 끝의 높은 서로게이트를 뺀다; 코드포인트로 자르면 계약 `max`(UTF-16 `.length`)를 넘길 수 있어 이쪽). 시험: 상한 경계의 이모지(걸치면 쌍째 뺌 · 딱 들어가면 그대로 · 고립 서로게이트 0).
  - F 🟡 `.txt` 파일 원본 내려받기도 `text/plain; charset=utf-8`(text/* 면 charset 통일). 시험: txt 는 charset 붙고 png 는 그대로.
  - G 🟡 미사용 `OTHER` 제거 · 보고서 lint 문장 정정(②).
  - 기록만: I 인자 차례 `(viewer, examId)` 유지(ai 트랙 `examLookup.ts` 가 전제) · H 는 ⑤ 2-1 에 적음.
