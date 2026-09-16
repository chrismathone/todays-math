# 브리프 — 진도 계획 화면 검수 반영 (D-133)

확정: **07 D-133** · **05 §8.10** 표 끝 두 줄 · 앞선 트랙 보고서 `tracks/reports/daily-auto-test-screen.md`(⑤-A · ⑥). **먼저 읽어라.**
검수 페이지(원장님 답 *「시안은 모두 추천방안으로 진행해」*): https://claude.ai/artifact/4RoDShecYfF7pCFMgeNfWi

## 0. 무엇이 바뀌나 — 다섯 가지뿐

나머지(첫 줄 «모두 출제» · «저장 전 미리보기» · 날짜 칸 · 세 열 고르기 · «범위 없음» 칩 · 계기판 칸 수 · 상태 문구 · 작업실 크기)는 **구현 그대로** — 손대지 마라.

## 1. 만들 것

### 1.1 🔴 A1 — 시험지가 아침 자동으로 섰는지 안다 (`test.auto_draft_run_id`)

- **스키마**: `Test.autoDraftRunId String? @map("auto_draft_run_id") @db.Uuid` · 관계 `AutoDraftRun` · `onDelete: SetNull` · 인덱스.
  `AutoDraftRun` 쪽 역관계 이름은 네가 정한다. 마이그레이션 `prisma/migrations/2026091700xxxx_test_auto_draft_run/` — **ADD COLUMN NULL + FK + INDEX 만**(기존 행 안 건드림).
- **적용 스크립트** `scripts/qa/apply-test-auto-draft-migration.ts` — `apply-progress-plan-migration.ts` 와 같은 결(기본 dry-run · `ALLOW_SHARED_IMPORT=1 --apply` · 적용 뒤 칸/FK/인덱스 확인).
  🔴 **공유 DB 에 적용하지 마라** — 리드가 병합 뒤 dry-run → 적용한다(원장님 확인 받음). 이 워크트리엔 `.env` 도 없다.
- **`runAutoDraft`**: 회차 행을 **먼저** 만들고(합계 0) 그 id 로 초안을 세운 뒤, 끝에서 합계(`targets` · `created` · `skipped` · `skips`)를 **고쳐 쓴다.**
  대상 0 인 날도 지금처럼 회차 한 줄이 남아야 한다(«안 돈 것»과 구별 — 기존 시험 그대로 초록).
  중간에 던지면 회차 행이 합계 0 으로 남을 수 있다 — 어떻게 다룰지 정하고 보고서 ⑤에 적어라.
- **`generateDraftTest`**: 선택 입력 `autoDraftRunId` 를 받아 시험지 행에 적는다. **«모두 출제» 단추 길은 안 넘긴다**(NULL).
  요청 계약(`TestGenerateRequest`)에 칸을 **열지 마라** — 밖에서 이 칸을 채울 수 있으면 표지가 거짓말이 된다. 서버 안 인자로만.

### 1.2 A2 — «자동 출제» 표지: 메인 «오늘의 확인테스트» 검수 줄

- `api/tests/daily-review` 응답 `todayTests[]` 에 `autoDraft: boolean`(= `autoDraftRunId !== null`).
- `DailyReviewSection` «출제됨 N명 — 검수: 이름 이름 …» 에서 **자동으로 선 시험지의 이름 바로 뒤**에 «자동 출제» 표지.
  모양은 05 §8.10 (Hi-fi 2 표지 — 흰 바탕 · `#2064B3` 1px 테두리·글자 · 11px · 700 · 안쪽 2px 8px · 모서리 4px). 누르는 것이 아니다(D-30).
  ⚠️ 지금 검수 줄은 `d.auto` 묶음 학생만 돈다 — 아침 초안이 선 학생이 그 목록에 없을 때(예: 오늘 풀이 부족으로 바뀐 경우) 어떻게 보이는지 확인하고 보고서에 적어라.
- «오늘 초안 N장»은 **자동·손을 가르지 않는다**(리드 결정 D 유지) — 셈은 그대로.

### 1.3 Q5 — 밀림 칩은 하나

«N일 밀림 M명»(날마다) → **«밀림 N명 · 최대 D일»** 칩 하나(경고 결 그대로). N = 밀린 학생 수, D = 가장 많이 밀린 일 수. 밀린 학생이 없으면 칩이 없다.

### 1.4 Q6 — 오늘 수업이 없는 반은 수만

«중1 B반 · 중3 A반 — 오늘 수업 계획이 없습니다.» → **«오늘 수업 계획이 없는 반 N개»**. 오늘 대상이 0 이면 지금처럼 «오늘 수업 계획이 없습니다.» 한 줄(바꾸지 않는다).
API(`noLessonClasses`)는 그대로 둔다.

### 1.5 Q10 — 반 만들기 계획 칸 글자

«수업 계획 넣기»를 눌러 열면 글자가 **«수업 계획 접기»**, 다시 누르면 «수업 계획 넣기». `aria-expanded` 는 지금처럼.

## 2. 안 하는 것

- 시험지 목록 화면 · 학생별 계획 화면 · 계획 지우기 단추.
- 공유 DB 쓰기(마이그레이션 **적용** 포함) · eywa 코드/env/cron(보류).
- D-132 담당 딱지(main 에 있다 — `OwnerTag` · 오늘의 확인테스트 시험기간 줄에 이미 붙어 있다. 깨지 마라).

## 3. 시험 · 검수

- TDD(RED→GREEN):
  - `runAutoDraft` — 만든 초안마다 `autoDraftRunId` = 그 회차 id · 합계가 끝에 맞다 · 대상 0 인 날도 회차 한 줄 · 건너뛴 학생엔 시험지 없음.
  - `generateDraftTest` / `POST /api/tests/generate` — 단추 길은 NULL · 요청 본문에 칸을 넣어도 **거절**(strict) 또는 무시되어 NULL.
  - daily-review `todayTests[].autoDraft` 참/거짓 · 섹션 표지 있고/없고 · 밀림 칩 하나(최대 일 수) · «오늘 수업 계획이 없는 반 N개» · «수업 계획 접기».
  - 인메모리 가짜(`prismaTestDouble`)에 새 칸·FK 흉내.
- 변이: `scripts/qa/mutate-plan-screen.ts` 의 ⑦e(밀림 칩 차례) · ⑦h(수업 없는 반 줄) 앵커가 움직인다 — 뜻에 맞게 고치고, 새 가드(표지 두 방향 · 회차 id 배선 · 단추 길 NULL · 칩 하나 · 접기 글자)를 더해라. ⚠️ `rmSync` 금지.
- 🔴 실물 브라우저로 한 번 — `/dev/plan-screen-hifi?screen=main`(휴대폰 400 · 넓은 폭)에서 표지·칩·반 수 줄 캡처(`scratch/plan-screen-followup/`).
- 관문: `npx prisma generate` → `tsc --noEmit` 0 · 관련 시험 · `npm run lint` · `npm run lint:affordance` · `npm run build`.

## 4. 보고

`docs/planning/tracks/reports/plan-screen-followup.md` — ① 만든 것(마이그레이션 SQL 전문 포함) · ② 시안/브리프와 다른 점 · ③ 캡처 · ④ 시험·변이 표 ·
⑤ 리드가 정할 것(배포 순서 · 중간 실패한 회차) · ⑥ 원장님께 여쭐 것. 끝나면 보고서를 커밋하고 멈춰라. **푸시하지 마라.**

CLAUDE.md 절대 규칙 — D-07 · TDD · 문구(D-08) · 어포던스(D-30). 커밋 계정 `SUN <chrismathone@gmail.com>`.
