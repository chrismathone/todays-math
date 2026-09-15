# 오늘의 개념 ⑥′ — 수맥 강의 자료·순수 코드 이전 (워크트리 `concept-port`, 2026-09-15)

리드는 `D:/todays-math` 메인 세션이다. 필요한 사실은 이 문서와 21번 문서에 있다 — 수맥을 넓게 다시 조사하지 말고
아래 표의 파일만 읽는다.

## 0. 먼저 읽을 것 (이 순서)

1. 이 문서
2. `docs/planning/21-todays-concept.md` — §1.4(옮길 것) · §4 ⑥′
3. `docs/planning/07-coding-convention.md` — **D-123**(맨 끝) · **D-35** · **D-07**
4. `CLAUDE.md` 교훈 색인에서 20번 문서의 이 항목을 연다 —
   「이식해 온 규칙이 **전제를 적어 두고** 있었는데, 그 전제가 뒤집혀 있었다」(2026-08-24) ·
   「변이가 **동작을 안 바꾸면** 「가드가 아니다」가 거짓말이 된다」 ·
   「훅이 **아예 안 돌고 있었다**」(워크트리 husky)
5. 새 워크트리에서는 **`npx prisma generate` 먼저** — 안 하면 tsc 가 자기 파일과 무관한 779 오류를 낸다.
6. 오르카 셋업의 `npm install` 이 `package-lock.json` 을 고쳐 둔다 — **커밋에 싣지 말 것**(`git checkout -- package-lock.json`).

## 1. 목표

수맥의 강의 **자료 구조와 화면 밖 순수 코드**를 우리 구성(Prisma · Zod 계약 · Vitest)으로 옮긴다.
mathgen 이식처럼 **그대로 붙이지 않는다** — 수맥은 Drizzle·Supabase·조직(organization)·개념(concept) 축이고,
우리는 Prisma·Auth.js·**차시(`Unit`) 축**이다. 옮기면서 전제가 달라지는 곳을 **적는다**(§5 보고).

**화면은 만들지 않는다**(D-07 — 리드가 원장님께 와이어 5안을 따로 올리고 있다).
**DB 에 쓰지 않는다**(공유 DB) — 스키마 초안과 마이그레이션 **파일**까지만.

## 2. 옮길 것

수맥 경로는 전부 `D:/Su-Maek/` 아래, **읽기 전용**.

| # | 무엇 | 수맥 원본 (+시험) | 우리 자리 (제안 — 더 맞는 기존 관례가 있으면 따르고 보고) |
|---|---|---|---|
| 1 | 유튜브 주소 → 11자 ID · 정규 watch 주소 · nocookie 임베드 | `packages/core/src/media/youtube.ts` · `packages/core/test/media/youtube.test.ts` | `src/lib/concept/youtube.ts` |
| 2 | 제작 도구 `meta.json` 해석 — 실패는 «왜»를 말한다 | `packages/core/src/media/lecture-meta.ts` · `packages/core/test/media/lecture-meta.test.ts` | `src/lib/concept/lectureMeta.ts` |
| 3 | 강의 자료 계약 — 상태 `draft → published → archived`, 고지(`disclosure`)·잡 ID(`sourceJobId`) | `apps/web/src/lib/domain/learning-material.ts` · `packages/db/migrations/0009a_learning_materials.sql` · `0012a_material_disclosure_job.sql` | `src/contracts/conceptLecture.contract.ts` (Zod = 계약 SSOT) |
| 4 | **게시 관문**(순수 함수) — 게시 가능한가 · 안 되면 이유 목록 | 위 0009a 의 `kind_payload_ck` · 0012a 의 `disclosure_not_blank_ck` · 21번 §4 «게시 조건(제안)» | `src/lib/concept/publishGate.ts` |
| 5 | **시청 규칙**(순수 함수) — 앞으로 감기는 본 최대 지점까지 · 진도는 뒤로 안 간다 · 95% 완료 · 한 번 완료면 완료 · 끝까지 본 영상은 이어 보기로 끝 지점에 두지 않는다 | `apps/web/src/components/learn/LecturePlayer.tsx`(머리말·감시 틱) · `learning-material.ts` 의 `recordVideoWatch` | `src/lib/concept/watchRules.ts` — **컴포넌트는 옮기지 않는다** |
| 6 | 등록 CLI — `meta.json` → **초안까지만**(게시는 사람 버튼). 같은 잡 ID 는 두 번 안 만든다 | `packages/ingest/src/cli/register-lectures.mts` | 순수 계획기 `src/lib/concept/registerPlan.ts` + 얇은 CLI `scripts/concept/register-lectures.ts` |
| 7 | 초기 비밀번호 생성 — 헷갈리는 글자(0/O · 1/l/I) 빼기 | `apps/web/src/lib/domain/learner-account.ts` 의 `generateInitialPassword` | `src/lib/concept/initialPassword.ts` |
| 8 | **스키마 초안** — `ConceptLecture` · `ConceptLectureView`(학생 × 강의 시청 기록) | 위 0009a·0012a | `prisma/schema.prisma` + `prisma/migrations/<시각>_concept_lecture/migration.sql` |

### 2.1 옮기면서 바뀌는 전제 (리드가 정한 것)

- **붙는 자리 = 차시.** 수맥은 개념(`concept_id`·`conceptSlug`)에 붙였다. 우리는 `Unit` 에 붙인다.
  `meta.json` 의 차시 식별자는 **`unitCode` = `Unit.problemCodePrefix`**(예 `J30501`) — 사람이 읽을 수 있고 unique 다.
  **선택 필드**다: 없으면 null, CLI 는 `--unit=<코드>` 를 요구한다. **차시를 지어내지 않는다**(수맥 `conceptSlug` 규칙 그대로).
  `conceptSlug` · `pageId` 는 읽어도 쓰지 않는다 — 수맥 규약 필드는 **받아들이되 무시**(제작 도구가 아직 그 필드를 쓴다).
- **종류는 영상 하나.** 수맥의 `reading`·`practice` 는 옮기지 않는다 — D-123 ⑵(학생 로그인은 영상 시청 하나).
- **조직(organization)이 없다.** 강의는 **서비스 공용 목록**(D-31 공용 풀과 같은 결)으로 두고, 쓰기는 `isAdmin` 만.
  계정마다 따로 두는 안은 리드가 원장님께 묻는 중 — 스키마에 `userId` 소유 칸을 **넣지 않는다**.
- **주소 없는 초안을 허용한다.** 호스팅(유튜브 · 자체)이 열린 질문(21번 §5-3)이라 초안은 `videoUrl` 이 비어도 된다.
  **게시 관문**이 주소를 요구한다.
- **게시 관문 조건**: 제목 · 길이 > 0 · 유효한 유튜브 주소 · `sourceJobId` 가 있으면(도구가 만든 강의) 고지가 비어 있지 않음 ·
  **원장님 전편 시청 확인(`reviewedAt`)**. 마지막 것은 21번 §4 의 «제안» 이다 — 원장님 답이 오기 전까지는
  **엄한 쪽으로** 둔다(틀린 영상은 없는 영상보다 신뢰를 더 깎는다). 조건마다 **이유 문구**를 낸다 — 버튼만 잠그면 고장으로 보인다(수맥 `LectureGate` 의 원칙).
- **학생 계정·로그인은 이번에 안 한다.** 로그인 방식이 원장님 결정 대기다(절대 규칙 7 «이메일/비밀번호 하나» 와
  «이메일 없는 학생» — 21번 §5-2). 7번(초기 비밀번호)만 방식과 무관해서 옮긴다. `src/lib/auth.ts` 는 건드리지 않는다.

### 2.2 스키마 초안 (8번) — 적용 금지

- `ConceptLecture`(`concept_lecture`): `id` · `unitId`(→ `Unit`, `Restrict`) · `title` · `videoUrl?`(정규 watch 주소만) ·
  `seconds` · `disclosure?` · `sourceJobId?` · `sortOrder`(0~999) · `status`(enum) · `reviewedAt?` · `publishedAt?` ·
  `createdById?`(→ `User`) · `createdAt` · `updatedAt`. 수맥 SQL 의 **CHECK 두 개**(주소 형식 대신 «게시면 주소 있음», 고지 공백 금지)와
  `sourceJobId` **부분 unique**(null 제외)를 마이그레이션 SQL 에 손으로 넣는다 — Prisma 가 표현 못 하는 것은 SQL 에.
- `ConceptLectureView`(`concept_lecture_view`): (`studentId` → `Student` `Cascade`, `lectureId` → `ConceptLecture` `Cascade`) 가 기본키 ·
  `maxSeconds` · `percent` · `completedAt?` · `updatedAt`. 한 학생 × 한 강의 = 한 행(수맥 `learner_material_progress_uq`).
- 🔴 **`prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 금지** — 모두 공유 DB 에 닿는다.
  마이그레이션 SQL 은 `prisma migrate diff`(DB 없이 스키마끼리)로 뽑고 CHECK·부분 unique 를 손으로 더한다.
  폴더 이름의 시각은 기존 마지막(`20260914143500_…`) 뒤로.
- 마이그레이션 파일 첫 줄에 `-- ⚠️ 미적용 초안 (D-123 ⑥′) — 원장님 확인 전 적용 금지` 를 적는다.

## 3. 하지 말 것

- DB 쓰기 · 위 마이그레이션 명령 · 등록 CLI 의 `--apply` 실행 금지. CLI 는 **기본이 dry-run** 이고 시험은 순수 계획기로 한다.
- 화면 금지(D-07) — `src/app/**` · `src/components/**` 에 파일을 만들지 않는다. 메뉴 목록(`accountAccess.contract.ts`)도 건드리지 않는다.
- `src/lib/auth.ts` · 로그인 · 가입 경로 금지.
- `D:/hyper motion video` 저장소 금지 — 다른 워크트리(`lecture-gen`)가 일하고 있다.
- 수맥 저장소 쓰기 금지(읽기만).
- **푸시 금지** — 리드가 검수 후 병합한다.

## 4. 완료 조건 (TDD — 절대 규칙 2)

- **시험 먼저.** 수맥 시험 두 파일(`youtube.test.ts` · `lecture-meta.test.ts`)은 옮겨 와서 **전부 초록**이어야 한다
  — 줄어든 사례가 있으면 왜 뺐는지 보고에 적는다. 거기에 우리 전제(차시 코드 · 영상 하나 · 주소 없는 초안)의 사례를 더한다.
- **변이 시험** — 아래를 하나씩 끄면 시험이 **빨개지는가**. 안 빨개지면 그 가드는 가드가 아니다:
  ① `parseYouTubeId` 의 «경로 먼저»(`youtube.com/@채널?v=<11자>` 가 통과해 버리는 수맥 실측 결함) ·
  ② 시청 기록의 «뒤로 안 간다»(max) · ③ «한 번 완료면 완료» · ④ 등록 계획의 «같은 잡 ID 는 건너뛴다» ·
  ⑤ 게시 관문의 조건 각각 · ⑥ `meta.json` 의 `video_url` 이 유튜브가 아니면 **조용히 비우지 않고 실패**.
- `npx tsc --noEmit` 0 · `npm run lint` · 관련 vitest 초록.
- 커밋 전 **훅이 도는지** 한 번 본다(`git commit --allow-empty` 로 lint-staged 출력 확인 뒤 되돌림).
- 커밋 계정 `SUN <chrismathone@gmail.com>` — `git config --local` 로 건다.

## 5. 보고

워크트리 안 **`scratch/REPORT-01-concept-port.md`** 에 쓴다(터미널로 보고하지 않는다 — 한글이 깨진다).

- 옮긴 것 표(수맥 → 우리 · 시험 수 · 변이 시험 결과 ①~⑥)
- **전제가 달라진 곳** — 수맥 규칙이 무엇을 가정했고 우리 데이터에선 어떻게 되는지(2026-08-24 교훈의 자리)
- 스키마 초안의 SQL 전문과 «적용하면 무엇이 생기나» 한 단락
- **리드가 정할 것**
