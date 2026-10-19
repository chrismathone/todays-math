# 지시서 — 시험지 만들기 속도 (codex · 2026-10-18)

워크트리 `/Users/pss/Desktop/creative/today-builder-speed` · 가지 `phase/12-builder-speed`. **커밋하지 않는다.**
금지: 공유 DB 쓰기 · `.env` 만들기/복사 · `prisma generate` · `prisma format` · push · 외부/유료 호출 · `git add -A`. DB 스키마를 바꿔야 하면 **짓지 말고 초안만**(`prisma/drafts/…`) 남겨 보고한다(DB 먼저 · 코드 나중 · 원장님 승인).
🔴 **화면 모양 · 문구를 바꾸지 않는다**(D-07) — 같은 화면이 빨리 뜨게만 한다.

## 원장님 신고 (2026-10-18)
1. 처음 출제 범위(735개)를 불러올 때 너무 오래 걸린다.
2. «문항 추가» 창의 «조건에 맞는 문항을 불러오는 중입니다…»가 너무 오래 걸린다.
3. 문항 «교체»(다른 문제 랜덤 출제)도 오래 걸린다.
4. «출처 고르기» 창의 «출처별 문항 수를 불러오는 중입니다.»도 오래 걸린다.

## 리드 조사(실측 — 이 Mac → 공유 DB, 읽기만)
- 범위 목록: `POST /api/studio/problems/sources`(`view=available&identity=question&families=1`) 한 번에 핸들러 7.3~7.8초. 응답은 69KB. 시간은 `loadQuestionCandidates`(`src/lib/.../questionProjection.ts:61`)가 공개 문항 118,166행(약 46MB, `answer` 포함)을 Node 로 다 끌어와 세는 데 3.9초 + 형식 판정 재읽기 1.4초.
- 같은 계산이 반복된다: 출제 조건 창의 «최근 출제 뺀 수»(`ExamBuilder.tsx:240-257`), 출처 · «같은 문항류» 바꿀 때(`MathExamBuilder.tsx:257-282`).
- 이미 있는 묶어 세기: `bankSourceAvailability.ts:98 countFamiliesByUnit`. 막히는 곳은 «형식»이 본문을 읽어야 정해진다는 것.

## 할 일
1. 신고 1~4 각 경로의 시간을 먼저 잰다(로컬 PGlite 나 모킹 · 쿼리 수 · 읽는 행 수 · 바이트). 잰 숫자를 보고서에.
2. 효과 큰 순서로 고친다 — 화면 모양 그대로:
   - 세는 경로는 행 전체 대신 DB 에서 묶어 센다(필요한 칸만 · `answer` · `solution` · 본문 같은 큰 칸 빼기). 형식이 본문 판정을 꼭 요구하면 그 판정 결과를 저장 칸으로 두는 **초안**을 남기고, 그 전까지 쓸 수 있는 가장 싼 길을 쓴다.
   - 목록(`initialUnits`)을 먼저 보여 주고 수는 도착하면 채운다(이미 있는 문구 · 자리만 쓴다 — 새 문구 금지).
   - 계정과 무관한 수는 서버 캐시(짧은 TTL · 문항 적재 때 무효화할 열쇠).
   - 같은 계산 되풀이 제거(필요할 때 · 한 번).
   - 문항 추가 창 · 교체: 후보를 고를 때 전체를 읽지 말고 그 범위 · 조건만, 쪽 단위로.
3. **결과가 같아야 한다** — 고치기 전 · 후의 수 · 후보 집합이 같다는 시험(픽스처로 고정)을 먼저 쓴다(TDD). 지점 · 소유 경계(`ownerScope.ts` · `branchId`)를 넓히지 않는다.
4. 시험: 관련 vitest · `npm run type-check`(🔴 `questionGroupKey` 관련 기존 2건은 공유 Prisma 클라이언트 탓 — 무시하고 보고) · 바꾼 파일 eslint · `lint:affordance` · `errorLogRouteCoverage`.

## 끝맺음
`docs/planning/tracks/reports/builder-speed-codex-20261018.md` — 경로별 전 · 후 숫자(잰 것과 추정을 가른다) · 바꾼 파일 · DB 초안 여부 · 확신 없는 곳. 마지막 답에 같은 요약.
