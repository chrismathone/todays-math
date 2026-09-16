# 보고 — 진도 계획 화면 검수 반영 (D-133)

브리프: `docs/planning/tracks/briefs/plan-screen-followup.md` · 확정 **07 D-133** · **05 §8.10** 표 끝 두 줄 · 앞선 보고서 `tracks/reports/daily-auto-test-screen.md`(⑤-A · ⑥)
검수 페이지: https://claude.ai/artifact/4RoDShecYfF7pCFMgeNfWi (원장님 답 *「시안은 모두 추천방안으로 진행해」*)
워크트리: `chrismathone/plan-screen-followup` · 기준 `7ba9e13a`(main 최신 — `merge-base --is-ancestor` 확인) · 커밋 계정 `SUN <chrismathone@gmail.com>` · 2026-09-16 · **푸시 안 함**

> 🔴 **공유 DB — 접속 0 · 쓰기 0.** 마이그레이션은 **파일만** 만들었다(적용 스크립트는 기본 드라이런 — 이 워크트리에서는 드라이런도 안 돌렸다.
> `.env` 가 없고, 스크립트는 닿지 않는 `127.0.0.1:1` 에서 문장 3개를 센 뒤 멈추는 것까지만 봤다).
> 🔴 **배포보다 마이그레이션이 먼저다** — ⑤-A.

커밋: `55b10b9b` 구현 · `bdae7ee2` 변이 하네스 · `d6551d4e` 표지 파랑 리터럴(실물 계측이 잡은 결함) · 이 보고서 + 캡처

---

## ① 만든 것

### 1.1 🔴 A1 — 시험지가 아침 자동으로 섰는지 안다 (`test.auto_draft_run_id`)

**스키마** (`prisma/schema.prisma`)

| 모델 | 칸 | 무엇 |
|---|---|---|
| `Test` | `autoDraftRunId String? @map("auto_draft_run_id") @db.Uuid` · `autoDraftRun AutoDraftRun? @relation(…, onDelete: SetNull)` · `@@index([autoDraftRunId])` | 아침 회차가 세운 시험지만 값. 손으로 낸 시험지(«모두 출제»·직접 출제)는 NULL |
| `AutoDraftRun` | 역관계 **`tests Test[]`** | 이 회차가 세운 시험지 |

⚠️ `prisma format` 은 **돌리지 않았다** — 돌리면 `User`·`WorkspaceDocument` 등 남의 모델 줄맞춤까지 50여 줄이 바뀐다(한 번 돌려 보고 되돌렸다). 새 줄은 이웃 줄에 손으로 맞췄다 · `prisma validate` 통과.

**마이그레이션** `prisma/migrations/20260917000000_test_auto_draft_run/migration.sql` — `prisma migrate diff --from-schema-datamodel <7ba9e13a 의 schema> --to-schema-datamodel prisma/schema.prisma --script`
(DB 없이 스키마끼리) 산출 **그대로**, 손으로 더한 것 없음. **ADD COLUMN NULL + INDEX + FK 만** — 기본값 없음 · 기존 행 안 건드림.
머리 주석(적용 금지 경고·배포 순서)을 걷은 SQL 전문:

```sql
-- AlterTable
ALTER TABLE "test" ADD COLUMN     "auto_draft_run_id" UUID;

-- CreateIndex
CREATE INDEX "test_auto_draft_run_id_idx" ON "test"("auto_draft_run_id");

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_auto_draft_run_id_fkey" FOREIGN KEY ("auto_draft_run_id") REFERENCES "auto_draft_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

**적용 스크립트** `scripts/qa/apply-test-auto-draft-migration.ts` — `apply-progress-plan-migration.ts` 와 같은 결.

| | |
|---|---|
| 기본 | 드라이런 — 트랜잭션 안에서 적용 → 확인 → **ROLLBACK** |
| 적용 | `ALLOW_SHARED_IMPORT=1 npx tsx scripts/qa/apply-test-auto-draft-migration.ts --apply` (둘 중 하나라도 없으면 거부) |
| 이 마이그레이션 하나만 | `migrate deploy` 를 안 쓴다 · `_prisma_migrations` 에 같은 방식(체크섬 = CR 제거 sha256) 기록 · 이미 있으면 아무것도 안 함 |
| ⑴ 앞 조건 | `auto_draft_run` 표 **와** `20260916120000_progress_plan_and_auto_draft` 기록이 있어야 한다 — 없으면 손대지 않고 멈춘다 |
| ⑵ 칸 | `uuid` · NULL 허용 · 기본값 없음 |
| ⑶ FK | `test_auto_draft_run_id_fkey` → `auto_draft_run` · 칸 하나 · 🔴 **ON DELETE SET NULL**(CASCADE 면 회차 기록을 지울 때 시험지가 같이 지워진다) |
| ⑷ 인덱스 | `test_auto_draft_run_id_idx` 가 `public.test (auto_draft_run_id)` 위 |
| ⑸ 기존 행 | 적용 전후 `test` 행 수가 같고, 값이 있는 행 **0** |
| 잠금 | 트랜잭션 첫 문장 `SET LOCAL lock_timeout = '10s'` — 앱이 `test` 를 쓰는 중이면 뒤에서 한없이 기다리며 앱 쿼리를 줄 세우지 않고 포기한다 |
| 되돌리기 | `--revert`(드라이런) · `--revert --apply` — FK·인덱스·칸·기록 한 줄. 🔴 **칸에 값이 하나라도 있으면 거부**(아침 회차가 이미 돌았으면 표지 근거가 사라진다) |

**`runAutoDraft`** (`src/lib/tests/runAutoDraft.ts`)

1. 회차 행을 **먼저** 만든다 — `targets 0 · created 0 · skipped 0 · skips []`(CHECK 둘을 만족).
2. 대상을 고르고(`draftAll` — 고르기·범위·묶기는 한 글자도 안 바꿨다) 초안마다 `generateDraftTest(owner, 요청, { autoDraftRunId: run.id })`.
   한 일은 `tally`(targets · created · skips)에 쌓는다. `targets` 는 계획을 편 **직후** 적는다.
3. 끝에서 `settle` — 회차 행 합계를 **고쳐 쓴다**(`totalsOf` 한 곳 — 행과 응답이 같은 값). 대상 0 인 날도 1 에서 선 행이 남는다.
4. 🔴 **중간에 던지면**(`settleInterrupted`, 그 뒤 오류를 다시 던져 cron 은 지금처럼 500):
   - 이 회차 id 를 단 시험지가 **0** 이면(`test.count` — `tally.created` 가 아니라 시험지 칸으로 센다) **회차 행을 지운다** — 합계 0 인 줄이 남으면 «그날 대상이 없었다»로 읽힌다.
   - **있으면** 행을 남기고 거기까지의 합계를 적는다 — 지우면 SET NULL 로 «자동 출제» 표지가 사라진다.
   - 끝난 회차는 늘 `created + skipped = targets` 다(대상은 시험기간·범위 없음·묶음 중 한 곳에만 들고, 묶음 학생은 만들거나 건너뛴다) → **끊긴 회차는 `created + skipped < targets`** 로 가른다.
   - 정리마저 실패하면 `console.error` 로 남기고 원래 오류를 던진다 → ⑤-B.

**`generateDraftTest`** (`src/lib/tests/generateDraftTest.ts`) — 세 번째 인자 `origin: DraftTestOrigin = {}`(`autoDraftRunId?`)만 `test.create` 에 `autoDraftRunId: origin.autoDraftRunId ?? null` 로 적는다.
`POST /api/tests/generate` 라우트는 **안 고쳤다**(두 인자로 부른다 → NULL). 요청 계약 `testGenerateRequestSchema` 는 이미 `strictObject` 라 본문에 `autoDraftRunId` 를 넣으면 **400** — 칸을 열지 않았다.
응답 계약 `testSchema`(`serializeTest`)에도 칸을 **안 열었다** — 화면은 daily-review 의 `autoDraft` 만 본다(⑤-F).

**가짜 DB** (`src/mocks/prismaTestDouble.ts`) — `TestRow.autoDraftRunId`(시드 행을 만드는 세 곳 NULL) · `test.create` 가 없는 회차 id 면 **P2003**(`test_auto_draft_run_id_fkey`) ·
`autoDraftRun.update` · `autoDraftRun.delete`(**SET NULL** — 이어진 시험지의 칸만 비운다) · 회차 행 CHECK 둘(`counts_nonnegative` · `skips_match`)을 create/update 에서 흉내.

### 1.2 A2 — «자동 출제» 표지: 메인 «오늘의 확인테스트» 검수 줄

- `GET /api/tests/daily-review` — `todayTests[]` 에 **`autoDraft: boolean`**(= `autoDraftRunId !== null`, 필수 칸). 조회 `select` 에 `autoDraftRunId` 를 더했다. 학생별 **최신 한 건** 기준은 그대로다.
- `DailyReviewSection` — «출제됨 N명 — 검수: 이름 …» 의 각 이름을 `inline-flex items-center gap-1` 묶음으로 감싸고, `todayTests` 의 그 학생 시험지가 `autoDraft` 면 **링크 바로 뒤**에
  `<span data-auto-draft-tag>자동 출제</span>`.
  모양(05 §8.10 Hi-fi 2 표지): `bg-white border border-[#2064b3] text-[#2064b3] text-[11px] font-bold px-2 py-0.5 rounded-[4px]` + `leading-4`(16px) · `whitespace-nowrap shrink-0`.
  🔴 파랑은 **리터럴** #2064B3 — 처음엔 `text-blue`(`--blue`)로 썼는데 **실물 계측이 #3159DF 를 잡았다**(③). 작업실 `.teaching` 이 `--blue` 를 덮는다 — 운영 메인도 작업실 안에서 그려지므로(`TeachingView` → `MainScreen embedded`) 실제 결함이었다. RTL 은 계산된 색을 못 본다. 계기판 «오늘» 칸과 같은 §2.2 기능색 리터럴로 고쳤다.
  ⚠️ 글자는 작업실 안에서 **12px** 로 그려진다 — 작업실 `.lessonContent` 가 `text-[9~12…]` 를 캡션 12px 바닥으로 올린다(담당 딱지 11.5px 도 같다). 규칙을 우회하지 않고 작업실 크기를 따랐다 → ②-9 · ⑥-3.
  **링크 밖**이다(링크 이름은 학생 이름 그대로) · 단추·링크·role 없음 · 손가락 커서·hover 없음(D-30).
- «이 화면에서 방금 낸 초안»은 `todayTests` 에 없으므로 표지가 없다(손으로 낸 것).
- **«오늘 초안 N장»은 자동·손을 가르지 않는다**(리드 결정 D) — 셈 그대로, 주석만 고쳤다.
- D-132 담당 딱지(`OwnerTag` — 시험기간 줄)는 안 건드렸다 — 그 시험 3건 그대로 초록.

🔴 **브리프 ⚠️ «검수 줄은 `d.auto` 묶음 학생만 돈다» — 실제로 확인했다**(임시 RTL 시험, 커밋 안 함). 아침 초안(`autoDraft: true`)이 선 학생이 지금 `auto` 밖이면:

| 그 학생이 지금 | «오늘 초안 N장» | 검수 줄 이름·표지 | 그 밖 |
|---|---|---|---|
| 문항 부족(`lacking`) | **센다**(1장) | **없다** — «출제됨» 줄 자체가 안 선다(auto 학생이 출제 전이면) | 부족 목록에 그 학생 + **«직접 출제» 링크**가 그대로 선다 |
| 시험기간·미분류(`examOrUnread`) | 센다 | 없다 | 펼침 목록에 **«직접 출제»** |
| 범위 없음(`noRange`) | 센다 | 없다 | 칩 «범위 없음 1명»만 |
| 오늘 대상 아님(계획을 바꿈 등) | 센다 | 없다 | 아무 데도 없다 |

즉 **초안 장수와 보이는 이름 수가 어긋나고**, 그 초안으로 가는 링크가 화면에 없다. 게다가 부족·시험기간 줄의 «직접 출제»는 `POST /api/tests/generate` 를 부르는데 그 라우트는 **같은 날 중복을 막지 않는다** — 누르면 같은 학생의 두 번째 초안이 선다(그러면 `todayTests` 최신 한 건은 손 시험지가 되어 표지도 사라진다 — 시험으로 잠갔다). 모양을 바꾸는 일이라 손대지 않았다 → ⑤-C · ⑥-1.

### 1.3 Q5 — 밀림 칩은 하나

«N일 밀림 M명»(날마다) → **«밀림 N명 · 최대 D일»** 칩 하나. N = `delayed.length`, D = `max(days)`. 밀린 학생이 없으면 칩이 없다. 경고 결(`border-g-red text-g-red-text`) · 칩 차례(밀림 → 문항 부족 → 시험기간 → 범위 없음) 그대로.

### 1.4 Q6 — 오늘 수업이 없는 반은 수만

«중1 B반 · 중3 A반 — 오늘 수업 계획이 없습니다.» → **«오늘 수업 계획이 없는 반 N개»**. 대상이 0 인 날은 지금처럼 «오늘 수업 계획이 없습니다.» 한 줄(안 바꿈). API `noLessonClasses` 그대로.

### 1.5 Q10 — «수업 계획 접기»

`ClassManage` 반 추가 폼의 단추 글자 `{planOpen ? "수업 계획 접기" : "수업 계획 넣기"}`. `aria-expanded` · `aria-controls` 그대로.

### 1.6 곁에 고친 것

- 시안 페이지 픽스처(`src/app/dev/plan-screen-hifi/fixture.ts`) — 초안 다섯 중 **앞 셋 `autoDraft: true`**(표지 캡처용).
- 실물 계측 `scripts/qa/plan-screen-layout.mjs` — `OUT_DIR` · `ONLY` · `WIDTHS` 환경 변수 · 메인 칩 기대값 · «반 N개» 줄 · 옛 «— 오늘 수업 계획이 없습니다.» 줄이 남았나 ·
  **표지 판정**(개수 · 글자 · 링크 바로 뒤 · 링크/단추 밖 · 손가락 커서 · 계산된 스타일 7가지 · 이름과 세로 가운데 ±1.5px) · 섹션만 한 장 더 캡처 · 반 만들기 «수업 계획 접기».
- 이웃 변이 하네스 `scripts/qa/mutate-daily-plan.ts` ⑥d·⑥e — `runAutoDraft` 구조가 바뀌어 앵커 0개가 됐다. 뜻을 옮겼다(⑥d 회차 행을 안 만들고 가짜 id 로 달린다 · ⑥e `totalsOf` 의 까닭 목록을 비운다).

## ② 시안 · 브리프와 다른 점

| # | 시안/브리프 | 구현 | 까닭 |
|---|---|---|---|
| 1 | 시안 Hi-fi 2 표지 글자 **«자동 초안»** | **«자동 출제»** | D-131 · D-133 · 05 §8.10 · 브리프가 «자동 출제» |
| 2 | 시안: 시험지 목록 행 끝(날짜 앞) | 메인 검수 줄 **이름 바로 뒤** | D-133 ⑵ — 목록 화면은 안 만든다 |
| 3 | 줄높이·이름과의 간격 — 시안에 없음 | 줄높이 **16px** · 이름과 **4px**(이웃 학생과는 8px) | 표지가 앞 이름에 붙어 읽히게 · 검수 줄 높이가 흔들리지 않게 → ⑥-3 |
| 4 | 브리프 «거절(strict) 또는 무시되어 NULL» | **거절 400** | 계약이 이미 strict 다 — 고친 것 없음 |
| 5 | 브리프 «중간에 던지면 … 정하라» | 이은 시험지 0 → 행 삭제 · 있으면 부분 합계(`created + skipped < targets`) | 1.1 ④ · ⑤-B |
| 6 | (브리프에 없음) 확정·인쇄한 자동 시험지 | **표지 그대로** | «무엇이 세웠나»는 상태와 따로다 → ⑥-2 |
| 7 | (브리프에 없음) 응답 `testSchema` | 칸을 **안 열었다** | 표지는 daily-review 한 곳 · 계약 넓히기 최소 → ⑤-F |
| 8 | 대상 0 인 날 회차 한 줄 | 같다 — 다만 행을 **두 번 쓴다**(create 합계 0 → update 합계 0) | 한 길로 두려고. 하루 한 번 쓰기 하나 더 |
| 9 | 표지 글자 **11px** | 작업실 안에서 **12px**(클래스는 `text-[11px]` — 옛 틀에서는 11px) | 작업실 `.lessonContent` 의 캡션 바닥 12px 규칙 — «작업실 크기 그대로»(D-133 ⒀) 선례를 따랐다. 11px 로 박으려면 그 규칙을 피하는 클래스를 써야 한다 → ⑥-3 |
| 10 | 표지 파랑 #2064B3 | 같다 — **리터럴** | 작업실 `--blue` 는 #3159DF(1.2 🔴) |

## ③ 캡처 — 실물 브라우저

`next build` → `next start -p 3219`(`ENABLE_RENDER_QA=1` · 임시 `AUTH_SECRET` · `DATABASE_URL=127.0.0.1:1` — DB 닿지 않음) · `/dev/plan-screen-hifi`(작업실 틀 그대로) ·
`BASE=… OUT_DIR=scratch/plan-screen-followup ONLY=main,main-stress,main-empty,create-open WIDTHS=400,1366 node scripts/qa/plan-screen-layout.mjs`.

🔴 **첫 계측은 빨강 12** — 표지가 `1px solid rgb(49, 89, 223)`(#3159DF) · 12px 로 그려졌다. 작업실 `.teaching` 이 `--blue` 를 덮고, `.lessonContent` 가 작은 글자를 12px 로 올린다(1.2 🔴).
색은 리터럴로 고치고(`d6551d4e`) 다시 빌드 → **8회 전부 통과**. 12px 은 작업실 규칙을 따르고 기대값에 적었다(⑥-3).

| 실행 | 400 | 1366 |
|---|---|---|
| main — 초안 5(앞 셋 자동) · 칩 셋 · 수업 없는 반 하나 | 넘침 0 · 잘림 0 · 밖 0 · 칩 «밀림 1명 · 최대 3일 / 문항 부족 2명 / 시험기간 1명»(2줄) · «오늘 수업 계획이 없는 반 1개» · **표지 3** | 같음 · 칩 1줄 |
| main-stress — 밀림 9명(1~12일) · 범위 없음 · 긴 반 이름 일곱 | 0 · 0 · 0 · 칩 «밀림 9명 · 최대 12일 / 문항 부족 2명 / 시험기간 1명 / 범위 없음 2명»(2줄) · «…반 7개» · 표지 3 | 같음 · 칩 1줄 |
| main-empty — 대상 0 | 0 · 0 · 0 · «오늘 수업 계획이 없습니다.» · 반 수 줄 없음 | 같음 |
| create-open — «수업 계획 넣기» 누름 | 0 · 0 · 0 · 단추 «수업 계획 접기» | 같음 |

표지 판정(전부): 글자 «자동 출제» · 이름 링크 **바로 뒤** · 링크/단추 **밖** · 손가락 커서 없음 ·
계산된 모양 `rgb(255,255,255) | 1px solid rgb(32,100,179) | rgb(32,100,179) | 12px | 700 | 2px 8px | 4px` · 높이 22px · 이름과 4px · **이름과 세로 가운데 차 0px** · 콘솔 오류·경고 0.
옛 «반 이름 — 오늘 수업 계획이 없습니다.» 줄은 어느 폭에서도 없다.

눈으로 본 것: 넓은 폭은 «출제됨 5명 — 검수: 김도윤 [자동 출제] 이서준 [자동 출제] 박하은 [자동 출제] 최지우 정민재» 한 줄.
**휴대폰(400)은 이름·표지 묶음째 줄을 바꾼다**(«정민재»가 한 줄에 혼자 선다 — 작업실이 링크를 44px 높이로 세워 줄 사이가 넓다, 지금도 그렇다).
«수업 계획 접기»는 Playwright 로 한 번 더 — 열면 «접기»·`aria-expanded=true`, 다시 누르면 «넣기»·`false`·요일 칸 0(400·1366).

캡처(`scratch/plan-screen-followup/`, 커밋함 — 파일 26개(png 25 · layout.json) · 912KB): `main-section-{400,1366}.png`(**표지·칩·반 수 줄 가까이**) · `main-stress-section-*` · `main-empty-section-*` ·
전체 `{main,main-stress,main-empty,create-open}-{400,1366}.png` · `create-toggle-{open,closed}-{400,1366}.png` · `side-by-side-main.png`(시안 Hi-fi 2 ↔ 구현) · `mockup-*` · `layout.json`.

## ④ 시험 · 변이

### 4.1 시험 (TDD — RED 확인 뒤 GREEN)

RED: 새·고친 시험 5파일을 구현 전에 돌려 **35건 빨강**을 봤다 — 까닭이 전부 맞았다(시험지 칸 `undefined` · 회차 행이 끝에 서서 끊긴 회차 행 없음 ·
`autoDraftRun.delete` 없음 · 계약이 `autoDraft` 를 몰라 섹션 픽스처가 ZodError · 접기 글자). 이미 초록이던 것: «본문에 회차 id → 400»(계약이 원래 strict) ·
«초안 전에 던지면 회차 행이 없다»(옛 구현은 행을 끝에 만들어 우연히 참 — 새 구조에서 변이 ⑫c 가 가드임을 확인).
GREEN: 구현 뒤 94건 중 1건 빨강 — 옛 시험 픽스처 셋에 `autoDraft` 가 없어 계약 파싱이 깨진 것 → 칸만 더했다.

| 파일 | 건 | 무엇 |
|---|---|---|
| `api/autoDraftRunLink.test.ts` (새로) | 7 | 🔴 단추 길(POST /api/tests/generate)은 **같은 날 아침 회차가 있어도** NULL · 🔴 본문에 `autoDraftRunId` → **400 · 시험지 안 섬** · 응답 계약에 칸 없음 · 서버 안 인자만 칸에 적힘 · 인자 없으면 NULL · 없는 회차 id → **P2003**(시험지 안 남음) · 회차 삭제 → 시험지는 남고 칸만 빔(SET NULL) |
| `api/autoDraftCron.test.ts` (+7) | 18 | 🔴 만든 초안마다 `autoDraftRunId` = 그 회차 id(회차 한 줄) · 🔴 합계는 끝에서 — 회차 행 = 응답 · `created + skipped = targets` · 대상 0 인 날도 한 줄(합계 0 · 이은 시험지 없음) · 🔴 건너뛴 학생(already · lacking)엔 이 회차 시험지 없음 · **아침 전 손 시험지의 칸은 NULL 그대로** · 두 번 돌면 둘째 회차엔 이은 시험지 없음 · 🔴 초안 전에 던지면 회차 행 없음(500) · 🔴 초안 뒤에 던지면 행을 남기고 부분 합계(`created + skipped < targets`, 500) |
| `api/dailyReview.test.ts` (+2 · 고침 1) | 25 | 🔴 `todayTests[].autoDraft` 아침 회차 시험지 참 · 손 시험지 거짓 · 같은 학생에 손 시험지가 더 늦게 섰으면 최신(손) 거짓 · (고침) 기존 `todayTests` 기대값에 `autoDraft: false` |
| `components/DailyReviewSection.test.tsx` (+8 · 뜻 바꿈 2 · 기대값 1) | 23 | 🔴 자동 시험지 이름 **바로 뒤** «자동 출제» · 손 시험지엔 없음 · 표지는 링크 밖(링크 이름 그대로) · 🔴 방금 «모두 출제»한 초안엔 없음 · 확정·인쇄한 자동 시험지도 표지 · «오늘 초안 N장»은 자동·손 둘 다 셈 · 표지 클래스 9가지(05 §8.10) · 🔴 D-30(span · 링크/단추 밖 · 커서·hover 없음 · role 없음) · 🔴 밀림 칩 하나 «밀림 3명 · 최대 5일»(맨 앞 학생이 최대가 아님) · 경고 결 · 밀린 학생 없으면 칩 없음 · 🔴 «오늘 수업 계획이 없는 반 2개»(반 이름 없음 · 대상 0 문구 안 섬) · 반이 없으면 줄 없음 · (고침) 칩 기대값 · 옛 «날마다 칩» · 옛 «반 이름 줄» 시험을 새 뜻으로 · 픽스처 `autoDraft` |
| `components/ProgressPlanScreen.test.tsx` (+1) | 21 | 🔴 열면 «수업 계획 접기»(`aria-expanded` 참) · 다시 누르면 «수업 계획 넣기»(거짓 · 칸 닫힘) |

새 시험 **25건** · 고친 시험 4건(뜻 바꿈 2 — 옛 «날마다 칩» · 옛 «반 이름 줄» / 기대값 2 — 칩 글자 · `todayTests` 에 `autoDraft`) · 옛 픽스처 넷에 칸 더함.

**관련 36파일 578건 전부 통과**(`--maxWorkers=2`, 구현 커밋 상태) — 위 5 + 앞 트랙의 24파일(`adminSeesAll` · `class` · `progress` · `progressPlan`(api·unit) · `kstDate` ·
`mockHandlers.contract` · `noRmSync` · `planSchedule` · `progressResolver` · `ClassManage` · `ClassTable` · `StudentAccountPanel` · `TeachingView` · `TeachingMainScreen` ·
`LoadingSkeletons` · `planGauge` · `progressPlanPreview` · `planDailyReview` · `ClassManageWorkflow`) + 시험지 행을 만지는 파일(`test` · `prismaTestDoubleSnapshot` ·
`defaultReviewRange`(api·unit) · `basket` · `classOwner` · `metrics` · `predictedPaper` · `predictedPaperGuards` · `testresult` · `persistPredictedPaper`).
표지 색을 고친 뒤(`d6551d4e` — 클래스 글자와 그 시험 기대값만 바뀜) `DailyReviewSection.test.tsx` **23건** 다시 통과.

### 4.2 변이

**`scripts/qa/mutate-plan-screen.ts` — 앵커 68개 전부 정확히 하나**(기존 48 + 새 20). 뜻이 바뀐 것: ⑦e(날마다 칩 차례 → «최대 D일») · ⑦h(반 이름 줄 → 반 수 줄, 앵커는 그대로).
커밋한 상태(`bdae7ee2`)에서 새·바뀐 무리만 돌렸다(`⑥d ⑦ ⑩ ⑪ ⑫`) — **빨개짐 29/29 · 살아남음 0 · 보류 0 · 판정 거부 0 · 변이한 파일 전부 원본과 md5 일치** · 음성 대조 5파일 초록.
①~⑤ · ⑥a~c · ⑧ · ⑨(19개)는 이 트랙이 그 코드를 안 고쳐 **다시 돌리지 않았다**(앵커만 셈).

| # | 변이 | 판정 | 빨개진 시험(첫 하나 · 수) |
|---|---|---|---|
| 1 | ⑥d 열어도 글자가 «수업 계획 넣기» 그대로 | 🟥 | 🔴 열면 「수업 계획 접기」 — 다시 누르면 접히고 「수업 계획 넣기」 (1) |
| 2 | ⑦a 문지기가 eywa 소유자만 | 🟥 | 🔴 eywa 소유자가 아니어도 계획이 있으면 섹션이 선다 (3) |
| 3 | ⑦b 문지기가 없다 | 🟥 | 🔴 eywa 소유자도 아니고 계획도 없으면 섹션 자체가 없다 (1) |
| 4 | ⑦c «오늘 초안»이 확정·인쇄까지 센다 | 🟥 | 「오늘 초안」은 초안만 센다 (1) |
| 5 | ⑦d «오늘 초안»이 방금 만든 초안을 안 센다 | 🟥 | 모두 출제 — 오늘 시험이 없는 학생만 학생별로 POST 한다 (1) |
| 6 | ⑦e 밀림 칩 «최대 D일»이 맨 앞 학생의 일 수 | 🟥 | 🔴 밀림 칩은 하나 — 「밀림 N명 · 최대 D일」 (1) |
| 7 | ⑦j 밀림 칩 N 이 밀린 날 가짓수(옛 셈) | 🟥 | 🔴 밀림 칩은 하나 (1) |
| 8 | ⑦k 밀린 학생이 없어도 밀림 칩이 선다 | 🟥 | 밀린 학생이 없으면 밀림 칩이 없다 (1) |
| 9 | ⑦f 시험기간 칩 문구가 예전 꼴 | 🟥 | 🔴 첫 줄은 짧게 「오늘 초안 N장」 … (2) |
| 10 | ⑦g 대상이 없는 날 예전 보고서 문구 | 🟥 | 🔴 오늘 대상이 없으면 「오늘 수업 계획이 없습니다.」 (1) |
| 11 | ⑦h 수업 없는 반 수 줄이 안 선다 | 🟥 | 🔴 오늘 대상이 없는 반은 수만 (1) |
| 12 | ⑦m 수업 없는 반 줄이 반 이름을 늘어놓는다 | 🟥 | 🔴 오늘 대상이 없는 반은 수만 (1) |
| 13 | ⑦i 동기화 줄이 계획만 있는 계정에도 | 🟥 | 🔴 eywa 소유자가 아니어도 … 동기화 줄은 없다 (1) |
| 14 | ⑩a 자동 시험지에 표지가 안 선다 | 🟥 | 🔴 아침 자동으로 선 시험지는 이름 바로 뒤에 «자동 출제» (3) |
| 15 | ⑩b 손 시험지에도 표지가 선다 | 🟥 | 🔴 아침 자동으로 선 시험지는 … 손으로 낸 시험지엔 없다 (2) |
| 16 | ⑩c 방금 «모두 출제»한 초안에도 표지 | 🟥 | 🔴 자동 초안이 없으면 표지가 없다 — 방금 낸 초안에도 없다 (1) |
| 17 | ⑩d 표지에 손가락 커서 | 🟥 | 🔴 표지는 누르는 것이 아니다(D-30) (1) |
| 18 | ⑩e daily-review `autoDraft` 늘 거짓 | 🟥 | 🔴 todayTests[].autoDraft — 아침 회차 시험지만 참 (1) |
| 19 | ⑩f daily-review `autoDraft` 늘 참 | 🟥 | 오늘 이미 만든 학생별 시험이 todayTests 에 실린다 (3) |
| 20 | ⑩g daily-review 가 칸을 안 읽는다(undefined → 참) | 🟥 | 오늘 이미 만든 학생별 시험이 todayTests 에 실린다 (3) |
| 21 | ⑪a 아침 회차가 회차 id 를 안 넘긴다 | 🟥 | 🔴 만든 초안마다 autoDraftRunId 가 그 회차 id (3) |
| 22 | ⑪b generateDraftTest 가 칸을 안 적는다 | 🟥 | 🔴 만든 초안마다 autoDraftRunId 가 그 회차 id (3) |
| 23 | ⑪c 단추 길이 그날 마지막 회차를 짐작해 붙인다 | 🟥 | 🔴 단추 길로 선 시험지는 칸이 비어 있다 — 같은 날 아침 회차가 있어도 (1) |
| 24 | ⑪d 출제 요청 계약 strict 해제(`looseObject`) | 🟥 | 🔴 요청 본문에 회차 id 를 넣으면 거절한다(400) (1) |
| 25 | ⑫a 끝에서 합계를 안 고쳐 쓴다 | 🟥 | 회차 기록에 만든 수·건너뛴 까닭이 남는다 (2) |
| 26 | ⑫b 대상 수를 안 적는다 | 🟥 | 계획이 있는 학생에게 초안을 세운다 (3) |
| 27 | ⑫c 끊긴 회차 — 이은 시험지가 없어도 행을 남긴다 | 🟥 | 🔴 초안을 세우기 전에 던지면 회차 행이 남지 않는다 (1) |
| 28 | ⑫d 끊긴 회차 — 이은 시험지가 있어도 행을 지운다 | 🟥 | 🔴 초안을 세운 뒤 던지면 회차 행을 남기고 … (1) |
| 29 | ⑫e 끊긴 회차 — 부분 합계를 안 적는다 | 🟥 | 🔴 초안을 세운 뒤 던지면 회차 행을 남기고 … (1) |

**안 넣은 변이 하나** — «단추 길(라우트)이 본문의 회차 id 를 옮겨 담는다». 계약이 strict 라 본문에 칸이 있으면 라우트에 닿기 **전에** 400 이 난다 —
한 겹만 바꾸는 변이는 구조적으로 초록(보류)일 수밖에 없다. 두 겹(계약 strict = ⑪d · 서버 인자만 = ⑪b·⑪c)을 따로 겨눴다.

**이웃 하네스** — 이 트랙이 `runAutoDraft` · daily-review 라우트 · 출제 계약 · `DailyReviewSection` · `ClassManage` · 가짜 DB 를 고쳤다.
`mutate-admin-scope` 39 · `mutate-class-owner` 43 **전부 정확히 하나**. `mutate-daily-plan` 은 ⑥d·⑥e **앵커 0개**가 됐다 → 뜻을 옮겨(1.6) 34개 전부 하나 ·
그 둘을 돌려 **2/2 빨강 · 원본 일치**. `mutate-learn-screens` 는 `--anchors` 가 없어 daily-review 라우트를 겨누는 ③f 앵커(`      : kstDateOf(new Date());`)를 손으로 셌다 — 1개.

### 4.3 관문

| 관문 | 결과 |
|---|---|
| `npx prisma generate` → `tsc --noEmit` | **0** |
| `prisma validate` · `migrate diff` | 통과 · 산출 3문장 = 마이그레이션 파일 |
| 적용 스크립트 | 닿지 않는 DB(`127.0.0.1:1`)로 한 번 — 파일을 읽어 «문장 3개 · 체크섬 9c5a2f41…» 까지 찍고 접속에서 멈춤(공유 DB 접속 0) |
| `npm run lint` | 저장소 전체 58(오류 3 — 전부 기존 `scripts/admin/bootstrap-admin.cjs` `require()` · 경고 55 — 앞 트랙 보고서와 같은 수). **이 트랙이 고친·만든 파일만 eslint: 0** |
| `npm run lint:affordance` | **0** (커밋 훅도 두 번 돌았다) |
| 관련 vitest | **36파일 578건 통과** (4.1) |
| `npm run build` | **exit 0** 두 번(구현 뒤 · 표지 색 고친 뒤) — PowerShell → `cmd /c` · 임시 `AUTH_SECRET` · DB `127.0.0.1:1` |
| 실물 브라우저 계측 | 첫 판 빨강 12(표지 색·크기) → 고친 뒤 **8/8** · 콘솔 0 (③) |
| 변이 ⑩d 다시 | 표지 클래스가 바뀌어 앵커가 움직였다 → 커밋 상태(`d6551d4e`)에서 **1/1 빨강 · 원본 일치** |
| 전체 `npm run test` | **안 돌렸다** — ⑤-G |

## ⑤ 리드가 정할 것

**A. 🔴 배포 순서 — 마이그레이션이 먼저.** Prisma 는 `select` 없이 `test` 를 읽거나 만들 때마다 모든 스칼라 칸(`auto_draft_run_id` 포함)을 부른다 —
칸 없이 배포되면 **출제·검수·인쇄·채점·메인 «오늘의 확인테스트»가 전부 500** 이다(22 §4 «표 없이 배포되면 500» 과 같은 결, 범위는 더 넓다).
순서: main 병합 → `npx tsx scripts/qa/apply-test-auto-draft-migration.ts`(드라이런) → `ALLOW_SHARED_IMPORT=1 … --apply` → 푸시·배포.
앞 조건 `20260916120000`(auto_draft_run)은 22 §5 에 «공유 DB 적용 끝»이라 적혀 있다 — 스크립트가 다시 확인한다.
잠금: ADD COLUMN(기본값 없음 — 메타데이터만) · `CREATE INDEX`(동시 아님 — 만드는 동안 `test` 쓰기가 멈춘다) · FK 검증(전부 NULL — 한 번 훑음). `test` 표가 작아 순간이지만 **아침 8시 cron 무렵·수업 중 인쇄 시간은 피할 것**. `lock_timeout 10s`.

**B. 중간에 끊긴 회차** — 구현한 규칙(1.1 ④)으로 «합계 0 인 줄이 거짓으로 남는» 경우는 **정리마저 실패할 때**(DB 가 통째로 끊긴 경우)뿐이다.
그때는 합계 0 행 = «대상 0» 과 못 가른다. 더 막으려면 `auto_draft_run` 에 `finished_at`(끝에서 채움) 같은 칸이 필요하다 — 스키마라 원장님 확인이 필요해 **안 했다**.
끊긴 뒤 같은 날 `?day=` 로 다시 돌리면 이미 선 초안은 «already» 로 건너뛰고 **새 회차 행**이 선다(끊긴 행은 부분 합계로 남는다).
또, 시험지는 섰는데 응답을 못 받은 초안은 «failed» 로 세지만 칸은 이어져 있다 — 그 경우 끝난 회차에서도 표지는 있고 `created` 에는 없다(드묾).

**C. 🔴 아침 초안이 `auto` 밖 학생에게 선 경우**(1.2 표) — 지금 검수 줄에 이름·표지가 없고, 그 학생 줄의 «직접 출제»가 **같은 날 두 번째 초안**을 만들 수 있다.
길 셋: ⑴ 검수 줄을 `todayTests` 전부로 돈다(`auto` 밖 학생도 이름·표지 — 모양 변경, ⑥-1) ⑵ 부족·시험기간 줄에서 오늘 시험이 있는 학생은 «직접 출제» 대신 검수 링크 ⑶ 출제 라우트가 같은 날·같은 학생 확인테스트를 막는다(«모두 출제»의 화면 쪽 막음과 같은 규칙을 서버에). ⑶은 모양이 안 바뀌어 원장님 확인 없이도 되고, ⑴·⑵는 D-07.

**D. «오늘 초안 N장»** — 결정 D 대로 자동·손을 안 가른다. 이제 칸이 있으니 «자동 N장 · 손 N장»으로 가를 수는 있다(모양 — 안 했다).

**E. 표지 근거는 학생별 최신 한 건** — 같은 학생에 아침 초안 뒤 손 시험지가 또 서면 최신(손)만 보여 표지가 없다(시험으로 잠갔다). C-⑶ 을 하면 이 경우가 사라진다.

**F. 응답 계약 `testSchema` 에 칸을 안 열었다** — `/tests/[id]` 검수 화면에서도 «자동 출제»를 보이려면 그때 연다(계약이 strict 라 MSW·픽스처가 같이 바뀐다).

**H. 20번 교훈 후보** — «RTL 이 클래스 이름을 보고 초록인데, 작업실이 토큰(`--blue`)과 작은 글자를 덮어 **계산된 모양이 확정과 달랐다**». 담당 딱지(D-132, `text-[11.5px]`)도 작업실 안에서는 12px 로 그려진다(이 트랙은 안 건드림). 적을지.

**G. 전체 `npm run test` 는 안 돌렸다** — 관련 36파일만(④). 이 기계는 메모리가 빠듯하다. 병합 검수 때 한 번.

## ⑥ 원장님께 여쭐 것 (D-07)

1. **아침 초안이 선 학생이 «자동으로 나가는» 갈래 밖일 때**(오늘 문항이 모자라게 바뀌었거나 시험기간으로 바뀐 경우) — 지금은 «오늘 초안 N장» 숫자에만 들어가고, 검수 줄에 이름이 **안 보인다.** 검수 줄에 그 학생 이름(과 «자동 출제» 표지)도 같이 보일지.
2. **확정·인쇄한 시험지에도 «자동 출제» 표지를 계속 둘지** — 지금은 둔다(아침에 자동으로 섰다는 사실은 확정해도 그대로라서).
3. **표지 세부** — ⑴ 글자 크기: 확정은 11px 인데 작업실은 작은 글자를 모두 12px 로 올린다(담당 딱지도 12px 로 그려진다). 작업실에 맞춰 **12px** 로 두었다 — 11px 로 꼭 줄일지. ⑵ 이름과 표지 사이 4px · 표지 높이 22px(줄높이 16px). 캡처 `main-section-*.png`.
