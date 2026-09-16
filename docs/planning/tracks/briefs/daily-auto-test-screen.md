# 브리프 — 진도 계획 화면 (22번 ④ · D-131)

확정: **05 §8.10** · **D-131**(Hi-fi 2 «계기판 관») · D-129(Wire B) · 관리자 범위 D-130. **먼저 읽어라.**
시안: `docs/design/mockups/wire-d129-daily-auto-test.html`(B 탭) · `docs/design/mockups/hifi-d129-daily-auto-test.html`(2 탭).

⚠️ **띄우는 시점**: `plan-api`(계획 쓰기·읽기 API)와 `admin-sees-all`(관리자 범위)이 main 에 병합된 **뒤**다.
이 화면은 그 두 트랙의 라우트와 소유 범위 위에 선다. 그 보고서(`tracks/reports/daily-auto-test-plan-api.md` ·
`admin-sees-all.md`)의 «리드가 정할 것»과 리드 결정을 먼저 읽어라.

## 0. 리드 결정 — 두 트랙 보고서에서 (2026-09-16)

- **계획 API 는 main 에 있다** — `/api/classes/[id]/progress-plan` · `/api/students/[id]/progress-plan`(한 줄 덮어쓰기) ·
  이번 주 예정 14일 · `POST /api/classes` 가 계획을 같이 받는다. 보고서 `tracks/reports/daily-auto-test-plan-api.md`.
- 🔴 **«저장하기 전에 결과를 본다»는 미리보기 경로로** — `POST …/progress-plan/preview`(저장 안 함)를 **이 트랙이 더한다.**
  날짜 펴기는 서버의 `src/lib/daily/planSchedule.ts` 한 곳을 부른다. 화면에서 날짜를 다시 펴지 마라.
- 반 만들기 응답에 계획이 없다 — 만들고 바로 이번 주 예정을 그려야 하면 응답에 칸을 더하고 `classApi.ts` 파싱도 같이 고쳐라.
- **400/422 로 가르지 마라** — 서버가 준 문구·`details` 를 그대로 그린다.
- 학생 계획 «끄기»는 **멈춤**이다(반 계획으로 돌아가지 않는다). 학생 계획 화면은 이 트랙 밖이다.
- **관리자 범위(D-130)도 main 에 있다** — 소유 판정은 `src/lib/ownership.ts`(뷰어를 받는다)·`src/lib/ownerScope.ts` 한 곳.
  새 경로(미리보기 등)도 `requireOwnedClass(id, session)` 을 쓰고 `session.id` 로 거르지 마라. 계획 라우트는 이미 그렇게 옮겼다.
  원장님(관리자) 반 선택기에 역할 계정들의 반이 섞인다 — «누구의 반» 표시는 **D-07 미확정**이니 지어내지 말고 보고서 ⑥ 에 적어라.

## 1. 만들 것

1. **반 관리 › 수업 계획 카드** — 요일 토글(월요일부터 그리고 저장은 0=일) · 시작 차시 · 한 수업 N차시(기본 1) ·
   시작일 · 자동 출제 켜기/끄기 · 저장. 계획 API 를 부른다(새로 짜지 마라).
2. **반 관리 › 이번 주 예정 카드 — 계기판 관** — 수업일 한 칸씩 가로. 끝난 칸 초록 · 오늘 파랑 · 밀린 칸 노랑 ·
   빈 칸(색 값은 05 §8.10 표 그대로). 칸 아래 날짜 · 차시 이름. 아래 한 줄 「3일 밀림」.
   날짜·차시·밀림은 **계획 API 가 준 값**을 그리기만 한다 — 화면에서 날짜를 다시 펴지 마라(규칙은 한 곳).
3. **반 만들기** — 계획 칸을 **접어 둔다**. 「수업 계획 넣기」 한 줄을 누르면 열린다. 계획 없이도 반은 만들어진다.
4. **메인 › 오늘의 확인테스트**(`src/components/main/DailyReviewSection.tsx`) —
   ⑴ eywa 소유자 문지기를 풀어 **계획이 있으면 누구에게나** 보인다(eywa 갈래 표시는 보류 중이니 지금 규칙 유지) ·
   ⑵ 첫 줄은 **짧게** 「오늘 초안 N장」 · ⑶ 칩 「3일 밀림 N명」 · 「문항 부족 N명」 · 「시험기간 N명」 ·
   ⑷ 계획이 없는 반은 **「오늘 수업 계획이 없습니다.」**(지금의 「오늘 수업 보고서가 아직 없습니다」를 바꾼다).
5. **시험지 목록** — 자동으로 선 시험지에 **«자동 출제»** 표지.
   시험이 자동으로 섰는지 아는 길을 먼저 찾아라(회차 기록 `auto_draft_run` · 시험 행). **없으면 칸을 더하기 전에
   리드에게 물어라** — 공유 DB 스키마 변경은 원장님 확인이 필요하다.

## 2. 안 하는 것

- **학생별 계획 덮어쓰기 화면**(개별 진도 학생) — 형태가 아직 안 정해졌다. 만들지 말고 «열린 질문»으로 보고해라.
- eywa 코드·env·cron(D-129 ⑸ 보류). 공유 DB 쓰기.
- 확정 안 된 모양을 지어내지 마라 — 시안에 없는 상태(불러오는 중 · 오류 · 계획 없음)는 **가장 작게** 두고 보고서에 적어라
  (learn-screens 관례 — `tracks/reports/todays-concept-learn-screens.md` §2).

## 3. 시험 · 검수

- TDD(RED→GREEN). RTL — 요일 순서(월요일부터) · 저장 요청 모양(0=일) · 계기판 칸 색 구분(data 속성으로) ·
  접힌 계획 칸이 열림 · 메인 문구 넷 · «자동 출제» 표지.
- 어포던스(D-30) — 계기판 칸은 누르는 것이 아니다(손가락 커서·hover 금지). `npm run lint:affordance`.
- 🔴 **실물 브라우저로 한 번** — 휴대폰 폭 · 넓은 폭에서 Hi-fi 2 와 나란히 캡처(learn-screens 의 `side-by-side-*.png` 관례).
  jsdom 은 줄 깨짐·넘침을 못 잰다.
- 변이 하네스 `scripts/qa/mutate-plan-screen.ts` — ⚠️ `rmSync` 금지(임시 파일 + `unlinkSync`).
- 관문: `tsc --noEmit` 0 · 관련 시험 · `npm run lint` · `npm run build`.

## 4. 보고

`docs/planning/tracks/reports/daily-auto-test-screen.md` — ① 만든 것 · ② 시안과 다른 점 표(까닭) · ③ 캡처 ·
④ 시험·변이 표 · ⑤ 리드가 정할 것 · ⑥ 원장님께 여쭐 것(D-07). 끝나면 리드에게 알리고 **푸시하지 마라.**

CLAUDE.md 절대 규칙 — D-07 · TDD · 문구(D-08) · 어포던스(D-30). 커밋 계정 `SUN <chrismathone@gmail.com>`.
