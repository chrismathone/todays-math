# 지시서 — 시험지 만들기 «출제할 범위»: 문항이 없는 학년 · 단원은 처음부터 고를 수 없게 (codex, 2026-10-20)

원장님 2026-10-20(캡처): «출제할 범위에 없는 부분은 애초에 선택할 수 없게 비활성화.»
캡처: 출처 «교과서만»을 고른 상태인데 학년 · 과정 목록에 초1 ~ 미적분2 가 모두 눌리게 떠 있다.

## 1. 지금

- 화면: `src/components/exam-builder/ScopeSequencePicker.tsx` — S2 길잡이(`navigation`) 모드.
  - 학년 · 과정 → 단원 → 차시 순서다.
  - 길잡이 모드에서는 학년 · 단원 단추의 `suffix` 가 늘 `""` 라서 비활성화되지 않는다(247 · 273행).
  - 길잡이가 아닌 모드에는 이미 `availability()` 가 있다: « · 출제 가능 문항 없음» 꼬리를 달고 `disabled`.
- 자료: `src/components/exam-builder/mathSource.ts`.
  - `navigation()` 은 `view=curriculum` 으로 학년 · 단원 · 차시를 받는다. 이 요청에는 **출처 필터(`options.filters` — 교과서만 · 고른 책 등)가 실리지 않는다.**
  - 출처별 수는 차시 단계에서 `demandScopes()`(`view=scope-counts`, `/sources` POST)로만 센다.

## 2. 바꿀 것

- **서버:** 길잡이 요청(학년 목록 · 한 학년의 단원 목록)이 scope-counts 와 **같은 필터**를 받는다. 학년마다 · 단원마다 출제 가능 문항이 있는지(수 또는 있음/없음)를 함께 돌려준다.
  - 판정은 scope-counts 와 **같은 함수 · 같은 where**를 쓴다(출제 가능 조건 `problemEligibleWhere` · 출처 · 자료 · 소유 범위). 두 규칙이 갈라지면 «학년은 눌리는데 차시는 다 0» 같은 어긋남이 생긴다.
  - 행마다 세지 말고 묶어서 센다(groupBy 등).
  - 계약(zod)을 넓힐 때는 **읽는 쪽이 새 칸을 선택 칸으로** 받게 한다. 옛 화면 · 새 서버, 새 화면 · 옛 서버 둘 다 깨지지 않게 한다.
- **화면:** 길잡이 모드에서도 학년 · 단원 단추에 지금의 `availability()` 와 같은 규칙 · 같은 꼬리 « · 출제 가능 문항 없음»을 쓴다.
  - 새 꼴을 만들지 않는다. 비활성 단추 모양은 지금 것을 그대로 쓴다.
  - 수를 아직 모르면(불러오는 중 · 실패) 지금처럼 « · 출제 가능 수 확인 필요». 그때 비활성으로 둘지는 지금 규칙을 따르고 보고에 적는다.
- **출처 · 책을 바꾸면**(전체 ↔ 교과서만 · 책 고르기) 학년 · 단원의 가능 여부를 다시 받는다.
  - 이미 고른 차시가 새 출처에서 0이 돼도 **말없이 빼지 않는다.** 지금처럼 «출제 가능 문항 없음»으로 보이게 두고, 원장님이 직접 빼게 한다.
- 차시 단계는 지금도 수가 0이면 체크가 막힌다. 그대로 둔다.

## 3. 지킬 것

- **TDD:**
  - 서버 판정의 순수 부분 · 라우트 시험을 먼저 쓴다(교과서만 + 초1 은 0 → 학년 비활성, 초3 은 있음).
  - RTL(`ExamBuilder.demand.test.tsx` · `ExamBuilder.h2.test.tsx` 꼴): 교과서만일 때 0인 학년 단추가 `disabled` 이고 꼬리가 붙는다. 전체로 바꾸면 다시 눌린다.
  - 단위 시험은 실DB 없이 모킹한다(이 기계엔 Docker 가 없다).
  - 실DB 의 쿼리 시간은 잴 수 있으면 재고, 못 재면 «못 쟀다»고 쓴다.
- **실제 Chromium:** 캡처 1366 한 장 — 교과서만 선택 시 학년 목록.
- **화면 문구 · 꼴은 지금 것 그대로**(D-07 — 새 꼴이 필요해지면 멈추고 보고).
- **어포던스:** 비활성 단추에는 손가락 커서를 쓰지 않는다(D-30, `npm run lint:affordance`).
- **환경:** `npm install` / `prisma generate` 금지(정션 node_modules) · dev 는 `next dev --webpack` · 작업트리엔 `.env` 없음.
- 🔴 **메모리**(원장님 «메모리 여유 체크하면서 순서대로»):
  - vitest · Vite · Chromium 을 띄우기 전에 남은 메모리 3GB 이상인지 본다.
  - 전체 `npm run type-check` 는 끝에 한 번만 돌린다. 돌리기 전에 다른 `tsc --noEmit` 프로세스가 없는지 본다(`Get-CimInstance Win32_Process | ? CommandLine -match 'tsc --noEmit'`). 있으면 끝날 때까지 기다린다.
  - 쓰고 바로 끈다.
- **커밋:** 단위마다 커밋한다. 푸시하지 않는다. 커밋 신원은 `git config --local user.email chrismathone@gmail.com` · `user.name SUN`.
- 이 지시서를 `docs/planning/tracks/brief-scope-availability-codex.md` 로 복사해 첫 커밋에 넣는다.

## 4. 보고

- 커밋 · 바꾼 파일
- 서버 판정이 scope-counts 와 같은 함수임을 보이는 자리
- 계약 호환(옛/새 조합)
- 시험 결과 · 캡처
- 못 잰 것
