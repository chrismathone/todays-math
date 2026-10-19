# 문항 형식 칸 R2 — 독립 읽기 전용 감사

- 감사일: 2026-10-19. 대상: `/Users/pss/Desktop/creative/today-format-col`.
- 기준 HEAD: `9d33e0cfbd4fe96a59c08d3c3bbe2d7a0ce5aab9`, 브랜치 `phase/12-question-format-column`.
- 대상 루트의 `AGENTS.md`, `docs/planning/tracks/brief-question-format-column-code-r2-codex.md`, 미커밋 형식 reader/지연 저장/집계 코드와 1차 보고서를 읽었다. 아래 상대 경로는 모두 이 대상 루트의 실제 파일이며 `:숫자`는 관찰 당시 줄 번호다.
- 감사 도중 주 작업자가 R2 코드를 계속 수정했다. **1차 구현·브리프의 예시 지문**과 **추가된 R2 MVCC 지문**을 구분한다. R2 부록의 소스 채록 기준은 `2026-10-19T05:22:11Z`(14:22:11 KST)이며 이후 수정본의 최종 승인 보고서가 아니다.
- 저장소 파일 수정, DB 접속·SQL 실행, 테스트 실행, git add/commit/push, Prisma generate, node_modules 변경, 작업자 생성은 하지 않았다. 이 보고서만 요청한 `/tmp` 경로에 작성했다. 기존 보고서의 DB 수치·시험 결과를 이번 감사의 실측으로 재주장하지 않는다.

## 1. 판단

1. **운영 `problem` 적재·갱신에서 `problem_zz_actual_format_invalidate`를 끄거나 `session_replication_role=replica`로 우회하는 코드는 발견하지 못했다.** 관련 검색의 실제 실행문은 교재 PGlite 시험 또는 English listening의 다른 테이블에 한정됐다. `problem`을 대상으로 하는 COPY/복원 실행 경로도 발견하지 못했다. 저장소 밖 운영자 SQL·복제 설정·현재 DB의 트리거 활성 상태는 이번 범위에서 확인할 수 없다.
2. **COPY 자체는 트리거 비활성화 수단이 아니다.** 일반 PostgreSQL `COPY FROM`은 대상 테이블의 트리거와 CHECK를 실행한다. 다만 이번 트리거는 `BEFORE UPDATE`만 받으므로 INSERT/COPY 신규행에 실린 비NULL 형식 값의 진위를 검증하지 않는다. 현재 확인한 일반 로더는 형식 세 칸을 보내지 않아 NULL로 시작하므로 이 경우는 정상적인 미계산 상태다. [PostgreSQL COPY 공식 문서](https://www.postgresql.org/docs/current/sql-copy.html)
3. **브리프의 예시 `(shared 행 수, max(updated_at), 형식 NULL 수)`만으로 긴 TTL 캐시의 정확성을 보장할 수 없다.** 시각을 보존하는 직접 SQL이 실제로 있고, 출제 잠금만 바꾸는 SQL은 형식 칸까지 그대로 둔다. 본문 변경→트리거 NULL→백필 완료 후 예전 지문으로 돌아가는 경우도 있다. 백필 안내와 결과 캐시 무효화 안내는 별개다.
4. **감사 중 추가된 R2 `bankReadFingerprint.ts`는 위 단순 지문을 쓰지 않는다.** `problem/shared`와 `unit/source_material/source_book`의 도메인·ID·`xmin`을 두 seed로 해시한다. 따라서 일반 SQL의 시각 보존 갱신도 감지할 근거가 있다. 같은 RepeatableRead 스냅샷, 관련 테이블의 완전한 포함, 매 요청 검증, 해시 충돌·XID 재사용 등에 대한 제한이 붙는다. 이 지문도 트리거를 우회해 남은 잘못된 형식 값을 수리하지는 않는다.
5. **브리프가 digest 감사 담당으로 지목한 `verify-problem-actual-format.ts`에는 저장 digest 자체의 일치 검사가 없다.** 동일 형식이지만 digest만 틀린 행을 놓칠 수 있다. 현재 도구 중 세 칸 모두를 실제 입력과 비교하는 것은 백필의 드라이런 `scanBackfill`이다.

## 2. 검색 범위와 재현 방법

`rg`로 코드·SQL·문서와 숨김 파일을 검색하고, 호출부와 트리거 DDL은 `nl -ba`로 읽었다. 무시 파일에 숨은 실행 경로도 확인하려고 `--hidden --no-ignore`를 사용한 검색을 추가했다. 코드 확장자 검색 시점의 파일 수는 6,150개였다(`src` 4,097, `scripts` 1,513, `prisma` 93, `supabase` 1 및 기타 경로). 심볼릭 링크 대상은 따라가지 않았고, `node_modules`, `.git`, `.next`, dist/build/coverage, 브라우저 시험 산출물과 `.env*`는 제외했다. 별도로 확장자 제한 없는 파일명 검색으로 JSON·문서의 동일 위험 문자열도 확인했다.

대표 검색식(모두 정적 검색이며 실행 대상 SQL이 아님):

```text
rg -n -i -U --hidden --no-ignore [생성물/비밀파일 제외 glob]
  'session_replication_role|DISABLE\s+TRIGGER|--disable-triggers|pg_restore|pg_dump|
   pgloader|copy_expert|copy_from|pg-copy-streams|COPY\s+(public\.)?"?problem\b|
   \\copy\s+(public\.)?"?problem\b|CREATE\s+SUBSCRIPTION'

rg -n -i -U [동일 범위]
  'DROP\s+TRIGGER|ENABLE\s+(ALWAYS\s+|REPLICA\s+)?TRIGGER|
   TRUNCATE\s+(TABLE\s+)?(public\.)?"?problem\b|pg_trigger|tgenabled|
   pg_trigger_depth|SET\s+(LOCAL\s+)?ROLE|ALTER\s+ROLE|ALTER\s+DATABASE'

rg -n -i -U [코드/SQL 범위]
  'problem\s*\.\s*(create\w*|update\w*|upsert|delete\w*)|
   (INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO)\s+(public\.)?"?problem\b|
   updated_at|updatedAt|BANK_COUNTS_EPOCH|invalidateBankReadCache'
```

동적으로 조립한 테이블명, 저장소 밖 psql/관리 콘솔, DB 카탈로그·역할 기본값, 실제 logical replication 적용 세션을 이 검색만으로 부정할 수는 없다.

## 3. 트리거 우회·비활성화 경로별 결과

| 검색 대상 | 발견 여부와 실제 근거 | `problem` 형식 캐시에 대한 판단 |
|---|---|---|
| 대상 트리거의 DISABLE/DROP, `problem DISABLE TRIGGER ALL/USER` | 운영 코드에서 미발견. 대상 트리거 생성은 `prisma/migrations/20261019120000_problem_actual_format/migration.sql:42` | 저장소 내 명시적인 대상 우회 경로 없음 |
| `session_replication_role=replica` | `src/__tests__/api/textbookRoutes.test.ts:820`, `src/__tests__/lib/textbookRegisterAndRefs.test.ts:802`; 변경 대상은 `textbook_edition`. 각각 `:825`, `:807`에서 원복 | PGlite 시험이며 운영 적재 경로 아님. 시험 DB 생성은 `src/__tests__/helpers/textbookPglite.ts:79`·`:82`; 호출은 두 시험의 `:98`, `:89` |
| `problem`의 다른 트리거 DISABLE/DROP | `src/__tests__/unit/questionIdentityDdl.test.ts:756`, `:762`는 `problem_question_group_invalidate`를 고의 제거/중지해 운영 도구의 거절을 시험함. `:763`에서 복구 | 대상 형식 트리거를 끄는 코드가 아니다. DB는 같은 파일 `:103`의 `new PGlite()` |
| 교재 테이블의 `DISABLE TRIGGER USER` | `src/__tests__/lib/textbookAdminUsability.test.ts:393`(`textbook_section`), `src/__tests__/lib/textbookTeacherFlows.test.ts:1589`(`textbook_item`) | 다른 테이블의 시험 설정 |
| 제품 코드의 DISABLE | `src/lib/english/listening/runtime/storageMigration.ts:453`; 복구 `:464` | `english_listening_media_asset`의 특정 불변 트리거만 중지. 세션 전체 role 변경이나 `problem` 비활성화가 아님 |
| 운영 정리 스크립트의 DISABLE | `scripts/qa/english-listening/retirement/purge-live.mts:356`; 복구 `:362` | `english_listening_source_transcript`에만 적용 |
| `COPY problem FROM`, `\copy problem`, copy-stream/driver API | 실행 경로 미발견 | COPY라는 단어의 코드 hit는 주로 읽기 전용 측정기의 금지 SQL 정규식. 예: `scripts/qa/measure-question-format-column-live.ts:69`, `scripts/qa/explain-question-format-column-live.ts:40` |
| `pg_restore`, `--disable-triggers`, pgloader, CREATE SUBSCRIPTION | 실행 경로 미발견 | DB 밖 복원·복제 설정의 부재까지 보증하지 않음 |
| `pg_dump` | `docs/transfer/AUDIT-2026-08-14.md:107`의 백업 안내 | 읽기 백업 안내이며 problem 적재/트리거 우회 코드 아님 |
| `TRUNCATE problem` | `src/__tests__/unit/schoolTextbookDbRetryBatch.test.ts:434`; `:426`에서 PGlite 생성 | 로컬 시험 fixture 초기화만 발견 |
| 과거 `DROP TRIGGER ... ON problem` DDL | 예: `prisma/migrations/20260825020000_problem_family_code/migration.sql:202`, `prisma/migrations/20260824223000_register_quarantined_problem_corpus/migration.sql:22` | 각각 코드 부여/격리 트리거 교체. 20261019 형식 트리거의 제거가 아님 |

일반 활성 트리거는 `origin/local`에서 실행되고 `replica`에서는 실행되지 않으며, DISABLE된 트리거는 해당 이벤트에서 실행되지 않는다. 따라서 이런 우회가 향후 생기거나 외부에서 실행되면 다시 ENABLE/role 복구만 해서는 이미 누락된 무효화가 소급되지 않는다. 영향 범위의 형식 전체 대조·백필이 필요하다. [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html), [session_replication_role](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-SESSION-REPLICATION-ROLE)

## 4. 저장 형식을 신뢰할 수 있는 범위

[형식 트리거 DDL](/Users/pss/Desktop/creative/today-format-col/prisma/migrations/20261019120000_problem_actual_format/migration.sql:19)은 `content`, `answer`, `question_type`, `problem_type`, `family_key`, `question_group_key`의 실제 변경을 NULL-safe하게 비교하고 세 형식 칸을 모두 NULL로 만든다(`:24`·`:29`). `updated_at`은 바꾸지 않는다. 같은 UPDATE에 새 형식 칸을 같이 실어도 입력이 바뀌면 NULL이 우선한다.

`problem_question_group_invalidate` 뒤에 이름 순으로 실행되도록 `problem_zz_...`로 만든 이유도 DDL `:39`에 있다. 앞선 정체 트리거는 단원·난이도·해설·그림 등도 변경 입력으로 본다(`supabase/migrations/20261018063016_question_group_identity.sql:66`). 이때 비NULL 질문 키가 NULL이 되면 뒤의 형식 트리거도 이를 감지한다. 이미 질문 키가 NULL인 행의 그림/해설 변경은 형식 입력이 바뀌지 않으면 형식 칸을 유지한다.

CHECK는 enum 허용값과 세 칸의 완결성·digest 문자열 모양만 검사한다(`migration.sql:8`·`:12`). **현재 버전 문자열을 단 비NULL 값이 실제 원문 분류 결과와 맞는지 SQL 제약이 증명하는 것은 아니다.** 입력을 안 바꾸고 형식 세 칸만 덮는 UPDATE도 유지된다. 지연 저장과 승인된 백필처럼 정확한 계산을 하는 writer만 이 칸을 공급한다는 신뢰 경계가 필요하다.

신규 INSERT/COPY가 세 칸을 생략하면 nullable/no-default 칸은 NULL이 된다. 확인한 수동·AI·교과서·엔진 로더는 이 형태다. 반대로 원장/덤프/외부 적재가 비NULL 트리플을 보내면 UPDATE 전용 트리거는 그것을 재판정하지 않는다. 이 경우 원문·버전·digest 대응 확인 또는 세 칸을 비우고 승인된 백필이 필요하다. 현재 저장소에서 잘못된 비NULL 값을 넣는 실제 운영 사례를 발견했다는 뜻은 아니다.

R2 reader 관찰본은 [questionCountSql.ts:272](/Users/pss/Desktop/creative/today-format-col/src/lib/problem/questionCountSql.ts:272)에서 비NULL/현재 버전만 신뢰하며, 새 시험 `src/__tests__/unit/problemActualFormatReader.test.ts:179`·`:196`도 틀린 digest의 현재 버전 형식을 그대로 신뢰하는 의도를 명시한다. 이는 R2 지시와 일치한다. 그만큼 트리거 활성·정확한 writer·별도 감사를 보장해야 한다. 현재 DB 활성 상태는 조회하지 않았다. 카탈로그 검사 코드 `scripts/db/apply-problem-actual-format-migration.ts:38`·`:53`은 두 트리거가 `O` 상태인지 검사하도록 되어 있다.

## 5. 앱과 직접 SQL의 updated_at 관행

`Problem.updatedAt`은 `prisma/schema.prisma:944`의 `@updatedAt`이다. 초기 DB DDL은 `prisma/migrations/20260813014714_init/migration.sql:94`에서 NOT NULL만 선언한다. 마이그레이션·트리거 검색에서 `problem.updated_at`을 모든 UPDATE마다 자동 갱신하는 DB 트리거는 발견하지 못했다. `@updatedAt`은 Prisma ORM 수준의 동작이므로 raw SQL에 적용되지 않는다. [Prisma 공식 스키마 문서](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference#updatedat)

| 쓰기 종류 | 실제 파일·줄 | 시각 및 캐시 관행 |
|---|---|---|
| 일반 앱 등록·수정 | `src/app/api/problems/route.ts:66`, `src/app/api/problems/[id]/route.ts:118` | Prisma model API가 시각을 관리. 입력 변경은 DB 형식 트리거가 처리 |
| AI 생성·변형 채택 | `src/app/api/problems/generate/route.ts:74`, `src/app/api/problems/transform/adopt/route.ts:135` | `createManyAndReturn`; 형식 세 칸은 payload에 없음 |
| 검수·잠금 상태 변경 | `src/app/api/problems/[id]/review-status/route.ts:46`, `src/app/api/problems/[id]/review/route.ts:60` | Prisma update. 입력 변경이 없으면 형식 칸은 유지되지만 출제 수량은 바뀔 수 있음 |
| 교재에서 은행에 등록 | `src/lib/textbook/server/itemRegister.ts:185` | raw INSERT에 `updated_at=${SQL_NOW}` 명시. `src/lib/textbook/server/sql.ts:41`의 UTC SQL 시각. 형식 세 칸은 생략 |
| 일반 배치 로더 | `scripts/import/load-classified.ts:205`, `scripts/import/load-engine-problems.ts:1250`, `scripts/import/textbook/load-school-textbook.ts:1285`, `scripts/import/exam-paper/load-exam-paper.ts:605` | model create/createMany. 별도 `new PrismaClient()`를 쓰는 스크립트는 앱 프로세스의 Map 무효화 hook을 공유하지 않음 |
| 본문/정답 raw 수리 | `scripts/import/protected-question-maintenance.ts:211` | content·answer·solution·figure_svg만 SET. updated_at 보존 |
| 본문 raw 교체 | `scripts/qa/apply-hwp-rescue.ts:338` | content만 SET. apply/revert 모두 시각 보존 |
| 정답 raw 교체 | `scripts/qa/apply-ambiguous-answers.ts:234`·`:242` | answer만 SET. apply/revert 모두 시각 보존 |
| 질문 정체 증거 backfill | `scripts/import/question-group-backfill.ts:297`·`:314`; `scripts/import/bounded-question-reinforcement.ts:952` | question_group_key만 SET. 시각 보존, 형식 무효화 발생 가능 |
| 출제 잠금 해제/복원 | `scripts/qa/apply-unusable-discard.ts:384`·`:408`, `scripts/qa/apply-choice-figure-discard.ts:283` | direct_use_allowed만 SET. 시각과 질문 키·형식 칸 모두 유지 가능. 단순 지문의 확정적인 누락 사례 |
| 그림/치수 raw 갱신 | `scripts/figure/reconnect-figures.mjs:142`, `scripts/figure/attach-hwp-figures.mjs:55`·`:109`, `scripts/figure/attach-load-figures.mjs:96`, `scripts/figure/prune-figures.mjs:115`; `scripts/qa/backfill-figure-dimensions.ts:72`·`:146`, `scripts/qa/backfill-figure-source-mm.ts:222`·`:401`, `scripts/qa/apply-choice-figure-index.ts:190`·`:392` | updated_at 미갱신. 비NULL 질문 키가 무효화되면 질문 수·형식 캐시 상태가 달라질 수 있음 |
| 시각을 명시적으로 갱신하는 raw 수리 | `scripts/qa/apply-math-residue.ts:123`·`:124`, `scripts/qa/apply-render-postfix.ts:210`·`:211` | `updated_at=now()`를 명시. raw SQL 전체가 같은 관행을 따르는 것은 아님 |
| 형식 지연 저장·운영 백필 | `src/lib/problem/actualFormatProjection.ts:48`, `scripts/db/backfill-problem-actual-format.ts:187`·`:201` | 형식 세 칸만 SET하고 시각은 의도적으로 유지. 선택 revision을 cache-only 쓰기 때문에 바꾸지 않는 설계 |
| 삭제 원장 복원 | `scripts/qa/dedupe-identical-problems.ts:473`·`:474`·`:480` | 원장의 createdAt/updatedAt을 복원하여 새 INSERT에 과거 시각을 명시. 신규 INSERT가 항상 전역 max를 올린다는 가정에 반례가 됨 |

앱의 model 쓰기는 `src/lib/db.ts:35`·`:43`에서 문제은행 캐시를 비운다. 책/자료/단원도 `:47`·`:54`·`:61`에 hook이 있다. **이 무효화는 해당 프로세스의 Map에만 작용하며, raw SQL과 독립 PrismaClient에는 같은 hook이 적용되지 않는다.** 교재 SQL adapter도 `src/lib/textbook/server/sqlAdapter.ts:23`·`:26`에서 raw 경로를 사용한다. 평상시 INSERT는 행 수/새 R2 지문으로 감지할 수 있으나, 이를 model hook의 효과라고 설명하면 안 된다.

## 6. DB 지문 캐시의 안전성 조건과 누락

### 6.1 count/max/NULL 수만 쓸 때

다음은 실행 실험이 아니라 실제 쓰기 문장과 DDL로부터 도출한 반례다. shared의 한 독립 문항이 approved·현재 형식이고 잠금만 해제된다고 두면:

| 상태 | shared 행 수 | max(updated_at) | actual_format NULL 수 | 출제 가능 문항 수 |
|---|---:|---|---:|---:|
| 전 | N | T | 0 | K |
| `apply-unusable-discard.ts:384` 실행 뒤 | N | T | 0 | K+1 |

잠금은 출제 조건이다(`src/lib/problemEligibility.ts:32`·`:38`). 따라서 이 지문으로 이전 수량·대표 ID 목록을 재사용하면 틀릴 수 있다. 형식 백필을 추가 실행해도 형식 자체는 이미 현재 값이므로 이 문제를 해결하지 않는다.

그 밖의 누락 조건:

- **NULL 수의 원상복귀:** updated_at을 보존하는 본문/정답/질문 키 수정 뒤 트리거가 NULL로 만들고, 다음 요청 전 지연 저장/백필이 채우면 `(N,T,0)`으로 돌아간다. 형식별 수량이나 질문 묶음이 바뀌어도 과거 결과와 같은 키가 될 수 있다.
- **이미 NULL인 행의 재수정:** NULL→NULL 변경은 NULL 행 수를 늘리지 않는다. 본문/정답이나 질문 묶음 변화가 사라지는 것은 아니다.
- **버전 불일치:** NULL 수만으로는 비NULL의 다른 버전을 나타내지 못한다. 적어도 `actual_format IS NULL OR actual_format_version IS DISTINCT FROM 현재 버전`을 별도로 봐야 한다.
- **max의 정보 손실:** 일부 행 updated_at이 바뀌어도 전역 최대보다 크지 않으면 max는 그대로다. 과거 시각 복원, 같은 밀리초, 오래 시작한 거래, 서로 다른 앱 시계가 그 조건을 만들 수 있다. 모든 시각 갱신이 전역적으로 엄격하게 증가한다는 계약은 없다. 초기 DDL도 TIMESTAMP(3)이다.
- **행 수 상쇄:** 삭제와 삽입 또는 shared/private 이동이 상쇄되면 물리 행 수가 같을 수 있다. 질문 키·형식·대표 ID의 분포가 같다는 뜻은 아니다.
- **관련 테이블:** `unit`의 학년·학기·순서, `source_material`의 book_id·kind, `source_book`의 제목·출판사·저자 변경은 problem 행의 시각에 전파되지 않는다. 실제 의존은 `src/lib/problem/questionCountSql.ts:459`·`:460`, `src/lib/bankSourceQuestions.ts:265`·`:281`, `src/lib/unifiedPreview.ts:765`. `Unit`에는 updatedAt도 없다(`prisma/schema.prisma:522`). 실제 unit 직접 갱신 예는 `scripts/qa/apply-source-material-migration.ts:492`다.

단순 지문은 모든 관련 변경마다 지문 또는 전역 epoch가 반드시 달라진다는 운영 계약이 있어야만 안전하다. 현재 저장소는 위 반례를 허용하므로 그런 계약이 이미 성립한다고 판단할 근거가 없다. 짧은 TTL은 오래된 결과의 지속 시간을 줄일 뿐, 지문의 완전성을 증명하지 않는다.

### 6.2 감사 중 추가된 R2 MVCC 지문

[src/lib/bankReadFingerprint.ts:19](/Users/pss/Desktop/creative/today-format-col/src/lib/bankReadFingerprint.ts:19)의 관찰본은 다음과 같다.

- `:21`~`:26`: shared problem과 전체 unit/source_material/source_book에서 도메인·ID·`xmin`을 읽는다.
- `:27`~`:30`: 행 수와 seed 0/1의 `hashtextextended`를 각각 `bit_xor`한 값으로 token을 만든다. NULL 또는 다른 버전의 형식 수는 별도 invalid에 둔다.
- `:38`·`:43`: 요청의 client에 대해 DB 지문을 읽고 AsyncLocalStorage 범위에서 재사용한다.
- `src/lib/bankReadCache.ts:40`·`:66`: invalid가 있으면 결과 캐시를 사용하지 않는다. 정상 지문이 있으면 TTL은 1시간(`:7`, `:50`·`:85`), 없으면 기존 15초 경로다. epoch도 키에 유지한다(`:41`, `:67`).
- 관찰 시점의 적용부는 `src/lib/bankSourceQuestions.ts:95`·`:246`, `src/lib/unifiedPreview.ts:609`·`:775`다. 각각 RepeatableRead 거래에 들어간다(`bankSourceQuestions.ts:98`·`:249`, `unifiedPreview.ts:735`·`:780`).

PostgreSQL의 xmin은 해당 행 버전을 넣은 거래 ID이며 UPDATE는 새 행 버전을 만든다. 따라서 **다른 거래가 정상 SQL로 갱신한 경우**, updated_at을 SET하지 않거나 형식 트리거를 끄더라도 위 token의 입력은 달라진다. 행 삭제·shared 이동은 집합을 바꾸고, 관련 메타데이터 수정도 포함된다. 이 구현에는 6.1의 시각 보존 반례를 그대로 적용할 수 없다. [PostgreSQL 시스템 열 공식 문서](https://www.postgresql.org/docs/current/ddl-system-columns.html)

안전성 설명에 필요한 조건과 한계:

1. **지문 SELECT와 cache miss의 결과 SELECT는 같은 client·같은 RepeatableRead 스냅샷이어야 한다.** 다른 거래의 지문과 결과를 섞거나 지문을 요청 간 TTL로 재사용하면 안 된다. helper는 이를 주석으로 요구하지만 격리 수준을 직접 강제하지는 않는다(`bankReadFingerprint.ts:17`, `:38`). 현재 확인한 적용부는 조건을 만족하도록 구성되어 있다.
2. **지문을 읽은 뒤 같은 거래에서 업무 입력을 변경하고 같은 지문 아래 결과를 캐시하지 않아야 한다.** xmin은 행별 증가 번호가 아니라 거래 ID다. 같은 거래 안에서 같은 행을 여러 번 바꾼 모든 버전을 구별하는 증표로 쓰면 안 된다. invalid 시 결과 캐시를 끄는 현재 처리는 지연 저장 중의 위험을 줄인다.
3. **결과가 의존하는 모든 데이터·공유 범위를 포함해야 한다.** 현재 네 테이블은 관찰한 은행 수량/출처/bootstrap 의존과 맞는다. 새 JOIN·정책·계정별 조건이 추가되면 범위를 다시 검토해야 한다. 최근 출제·제외 ID 등은 기존 공개 캐시 제외 계약을 유지해야 한다(`bankReadCache.ts:113`).
4. **변경 감지와 형식 무결성을 분리해야 한다.** 트리거 우회로 원문만 바뀌고 잘못된 현재 버전 형식이 남으면 xmin은 바뀌어 결과 캐시는 새로 계산되지만, reader는 여전히 그 잘못된 형식을 신뢰한다. invalid도 0일 수 있다. 이때 필요한 것은 입력 대응 감사/백필이지 epoch만 갱신하는 것이 아니다.
5. **두 seed 해시 XOR는 충돌 가능성이 있는 변경 지문이다.** 동일 token을 논리적으로 동일한 모든 DB 내용의 증명이라고 표현하면 과하다. 단순 count/max보다 검출 범위가 넓지만 암호학적 무충돌 증명은 아니다. XID는 32비트로 재사용될 수 있으므로 DB 복원·교체·장기 지속 캐시에는 DB/배포 범위와 epoch 전환이 필요하다. 1시간 TTL과 현재 프로세스 Map은 장기 재사용 범위를 제한한다. [PostgreSQL XID 수명 설명](https://www.postgresql.org/docs/current/ddl-system-columns.html)
6. **이 코드는 분산 결과 저장소가 아니다.** 인스턴스별 Map이 같은 DB 상태를 검증해 자기 결과를 재사용한다. 인스턴스 간 결과를 전달/공유하는 캐시 서버를 새로 만든 것은 아니다.

일반적인 raw SQL은 이 MVCC 지문이 매번 검증되는 경로에서 시각을 보존해도 감지된다. 그러므로 모든 직접 SQL을 무조건 지문 누락으로 분류해서도 안 된다. 다만 fingerprint가 없는 기존 15초 경로, 복원/DB 교체, 트리거 우회로 남은 잘못된 형식, 미래 의존 범위 변경에는 별도의 대처가 필요하다. 이 감사는 DB에 접속하지 않았으므로 지문 비용·EXPLAIN 결과·700ms 목표 달성을 판단하지 않는다.

## 7. 백필·무효화 안내가 필요한 경로

이미 미커밋 안내가 들어간 곳은 `docs/planning/08-import-ledger.md:9`, `docs/planning/schoolbook-import-20261007.md:13`이다. 두 문장은 적재·원문 갱신 후 승인된 백필 재실행을 알린다. 다음 경로/작업 종류까지 안내가 적용된다는 것을 분명하게 해야 한다.

| 경로/작업 | 필요한 안내 |
|---|---|
| 일반 적재 `scripts/import/load-classified.ts:205`, `scripts/import/load-engine-problems.ts:1250`, `scripts/import/textbook/load-school-textbook.ts:1285`, `scripts/import/textbook/load-supplement.ts:345`, `scripts/import/exam-paper/load-exam-paper.ts:605`, `scripts/import/verified-engine-batch.ts:808`, `scripts/import/bounded-question-reinforcement.ts:739` | 신규행은 형식 NULL로 시작. 대량 작업 뒤 승인된 백필을 실행해 미계산 상태를 정리한다. 미실행 시에도 NULL 정확 fallback은 유지되어야 한다. 형식 백필은 정확성 경로를 대체하기보다 미계산 비용을 줄이는 역할 |
| 교과서 refresh/recovery `scripts/import/textbook/load-school-textbook.ts:1106`, `scripts/import/textbook/recover-held.ts:337`·`:394` | 입력 UPDATE로 세 칸이 비워지거나 새 변형이 생긴다. 성공한 갱신/적재 뒤 백필·검증 대상 |
| 본문·정답 수리 `scripts/qa/apply-hwp-rescue.ts:338`, `scripts/qa/apply-ambiguous-answers.ts:234`, `scripts/import/protected-question-maintenance.ts:211` 및 이를 쓰는 `scripts/import/question-content-repair.ts:413`, `scripts/qa/bank/math-zero-card-wording.ts:226` | apply와 revert 모두 포함해 성공 후 백필 안내. 시각을 유지하므로 단순 지문을 쓰는 배포에는 epoch 변경도 필요 |
| 질문 묶음 변경 `scripts/import/question-group-backfill.ts:297`·`:314`, `scripts/import/bounded-question-reinforcement.ts:952` | 질문 키만 바뀌어도 형식 입력 digest가 바뀐다. 성공 후 형식 백필·질문 수 재확인. 이 경로는 아래 readback 호환성도 선행 검토 |
| 그림·치수 보정(§5의 raw 경로) | 비NULL 질문 키가 제거된 행은 형식도 NULL이 되므로 백필 대상. 이미 독립 행이었다면 형식 변화가 없을 수 있다. 그림 작업 전체를 형식 변경으로 단정하지 말고 실제 무효화 상태를 확인 |
| 삭제 원장 복원 `scripts/qa/dedupe-identical-problems.ts:473`·`:480` | 과거 시각을 보존한다. 사용 중인 generated client/원장에 형식 필드가 포함된다면 비NULL 값도 함께 복원될 수 있으므로 입력·현재 버전·digest를 대조. 원장에 형식 필드가 없으면 NULL 시작으로 처리. 현재 오래된 원장이 잘못된 형식 필드를 실제로 포함한다고 확인한 것은 아님 |
| 향후 외부 COPY/복원, trigger DISABLE/replica 세션의 problem 쓰기 | 세션/트리거 복구 후 **NULL 행만 채우는 지연 저장으로 끝내면 안 된다.** 비NULL 현재 버전의 오래된 값까지 전체 대조하고 영향 범위 백필. 질문 정체 키의 증거도 별도 감사해야 하며 형식 백필이 그것을 재증명하지 않음 |
| 잠금/검수/단원·출처 메타데이터만 바꾸는 직접 SQL | 형식 입력 변경이 없다면 형식 백필을 해결책으로 안내하지 않는다. 단순 지문/기존 TTL 배포에서는 epoch 또는 정해진 전체 캐시 만료가 필요. R2 MVCC 지문 적용 경로에서는 보통 행 버전 변화로 감지됨 |

운영 안내에는 다음 구분이 필요하다.

- `scripts/db/backfill-problem-actual-format.ts`는 기본 드라이런이며 `--report`로 결과를 남길 수 있다(`:205` 이후). 공유 DB apply는 기존 승인 절차·`ALLOW_SHARED_IMPORT=1`·durable `--state`가 필요하다(`:219`·`:220`). 이번 감사에서는 어느 모드도 실행하지 않았다.
- 드라이런의 `alreadyCurrent == rows`, 형식별 쓰기 예정 0, evidence/sample 불일치 0을 확인한다. apply 뒤에는 `completed=true`와 최종 대조 결과가 필요하다(`:276`). unknown을 억지로 0으로 만드는 작업이 아니다.
- 비NULL의 다른 규칙 버전은 `:165`에서 `FORMAT_EXISTING_VERSION_MISMATCH`로 거절한다. 새 버전의 승인된 업그레이드 절차와 현재 writer 버전을 맞춰야 한다. 단순히 여러 번 재실행하면 바뀐다고 안내하면 안 된다.
- `BANK_COUNTS_EPOCH`는 현재 환경변수 캐시 키다(`src/lib/bankReadCache.ts:41`·`:67`). DB에서 자동 증가하는 전역 revision이 아니다. 전환이 필요한 경우 모든 서비스 프로세스/배포에 같은 새 값을 반영해야 한다. 백필 자체는 이 값을 바꾸지 않는다.

## 8. 추가 누락: digest 감사와 기존 운영 도구의 호환성

### 8.1 verify 도구만으로 저장 digest 검증 완료를 말할 수 없음

`scripts/db/verify-problem-actual-format.ts:145`는 현재 입력으로 fact를 다시 계산한다. `:146`의 rowMismatches는 제품 reader의 **형식 결과**와 그 fact의 형식만 비교한다. `:149`의 corpusDigest도 새로 계산한 digest로 만든다. 저장된 `row.actualFormatDigest`/`row.actualFormatVersion`와 fact를 직접 비교하는 문장은 없다. 최종 실패 조건은 이 rowMismatches와 집계/문항류 parity의 합이다(`:187`·`:198`).

따라서 형식이 우연히 같고 저장 digest만 틀린 현재 버전 행은 이 도구의 mismatch에 잡히지 않을 수 있다. 저장된 다른 버전이 reader fallback으로 같은 형식을 내는 경우도 버전 무결성 검증의 증거가 되지 않는다. 브리프의 “digest 대조는 verify 도구의 몫”이라는 운영 설명에는 이 누락을 남겨야 한다.

반면 `scripts/db/problem-actual-format.ts:71`의 `matchesFact`는 형식·버전·digest 세 칸을 모두 비교하고, `scripts/db/backfill-problem-actual-format.ts:38`·`:46`은 이를 드라이런 전 행에 적용한다. **현재 코드 기준으로 digest 대응 증거는 이 드라이런으로 보충하고, verify의 형식/집계 parity와 구분해야 한다.** 파일을 수정해 보완하지는 않았다.

### 8.2 백필을 안내하기 전에 확인할 readback 조건

다음은 실행으로 재현하지 않은 정적 조건부 호환성 발견이다.

- `scripts/import/protected-question-maintenance.ts:56`의 `patchedRow`는 원본 전체를 복사하고 question_group_key만 NULL로 바꾼다(`:65`). 형식 세 칸은 보존한다. 반면 실제 입력 UPDATE 후에는 새 DB 트리거가 세 칸을 비운다. 기존 형식 값이 비NULL이던 행에서는 `:221`·`:223`의 전체행 기대값 비교가 실패하여 거래가 중단될 수 있다. 이 경우 “성공 후 백필” 안내만 추가해서는 수리 도구를 실행 가능하게 만들지 못한다.
- `scripts/import/question-group-backfill.ts:90`·`:92`의 `questionPayloadDigest`도 question_group_key만 제외하고 **형식 세 칸은 포함**한다. 질문 키를 바꾸면 형식 트리거가 비NULL 캐시를 NULL로 만들므로 `:447`의 readback 비교가 실패할 수 있다. NULL 캐시 상태의 행에는 이 조건이 발생하지 않는다.

이는 트리거를 우회해 조용히 잘못 쓰는 경로가 아니라, **새 트리거가 정상 작동하면서 오래된 전체행 검증 계약과 충돌해 실패할 수 있는 경로**다. 기존 운영 승인·증거 보존 요구를 유지한 별도 호환성 검토가 필요하다. 이 감사에서는 코드·증거·DB를 고치지 않았다.

## 9. 관찰본 식별 및 한계

감사 중 작업 트리가 변했으므로 아래 SHA-256으로 R2 부록의 관찰본을 식별한다. 채록 시각은 `2026-10-19T05:22:11Z`다.

| 파일 | SHA-256 |
|---|---|
| `src/lib/bankReadFingerprint.ts` | `a471c3fb2037ca5a18d168dce4c189b1fd885487e3fd0b69945d80ed087a8f0a` |
| `src/lib/bankReadCache.ts` | `275d0f11a1a57d0066a1376a436fd1e0e142e3c3c8cb3f501c20474cafa393f9` |
| `src/lib/problem/questionCountSql.ts` | `9d37c6ff48de757604e8e8550e1ac58a488e6a4f8b440ac0235689fc098c2640` |
| `src/lib/problem/actualFormatProjection.ts` | `ba2f7c79269fa990373a14ca3b11ad493e8cba36cd3cefa5402e0d2ba2d2a5fa` |
| `scripts/db/verify-problem-actual-format.ts` | `a54113c985011aa56ec5ae1b590d19392cc384f95bccc4a144a7251599c00b4b` |
| `prisma/migrations/20261019120000_problem_actual_format/migration.sql` | `794ccf77aadaf1b63292090b6419cff5d6c66aaa1f6f2f14e00e7280e876f4f9` |

현재 DB의 트리거/권한/role 기본값, 운영 실행 이력, 실제 데이터 불일치 건수, 백필 성공, 동시성·실행 시간은 확인하지 않았다. 정적 감사로 확인한 경로와 도출한 안전성 조건만 보고한다. 주 작업 경로의 변경은 읽기만 했으며 다른 작업자의 진행 중 변경을 되돌리거나 덮지 않았다.
