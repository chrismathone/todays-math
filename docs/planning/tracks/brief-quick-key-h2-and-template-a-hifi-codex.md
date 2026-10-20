# 지시서 — 빠른 채점표 H2 구현 · 템플릿 A Hi-fi (codex, 2026-10-20 오후)

원장님 선택(2026-10-20):
- 빠른 채점표 **H2 · 번호 분리** (`docs/design/mockups/answer-quick-key-hifi-20261020.html`).
- 해설 없이 **«정답만» 인쇄도 이 채점표 하나로** 끝낸다.
- 시험지 템플릿은 **A · 여섯 원형을 분명하게** (`docs/design/mockups/print-templates-wire-20261020.html`).

순서: **1 → 2.** 1 은 제품 코드다. 2 는 시안이다(D-07 — 구현하지 않는다).

## 0. 시작 전

- 이 가지에 `origin/main` 을 먼저 합친다(`git fetch origin && git merge origin/main`). 지금 가지는 `611d31d41` 위에 있다.
- 다른 작업자 `print-spacing` 이 같은 인쇄 폴더를 만진다: `settings.ts` · `pack.ts` · `BodyContainer.tsx` · `PrintOptionsPanel.tsx`. 1 은 정답지(`AnswerPage.tsx` 와 그 측정 · 쪽 나눔)만 만지고 위 넷은 건드리지 않는다. 꼭 필요하면 보고에 적고 멈춘다.

## 1. 빠른 채점표 H2 — 제품에 넣기

- **자리:**
  - 정답 · 해설지는 맨 위에 H2 채점표를 두고, 그 뒤에 지금의 해설 흐름을 잇는다.
  - «정답만»(`quickAnswerOnly` 등 지금 그 갈래)은 H2 채점표만 낸다.
- **같은 문제는 같은 뷰:** 미리보기 · 인쇄 · PDF 가 한 경로로 지난다. 화면용 따로, 인쇄용 따로 짓지 않는다.
  - 답 조판은 지금 정답지와 같은 렌더러로 한다(`fractionViewFor` → `MathText` 등 지금 쓰는 것).
  - HWPX 등 다른 내보내기가 정답을 싣는지 찾아 보고에 적되, 이번에 고치지는 않는다.
- **긴 답:**
  - Hi-fi H2 의 규칙대로 한다 — 짧은 답은 1칸, 긴 답은 최소 2칸, 최대 두 줄로 2 · 3 · 5칸을 고른다. 원장님 말씀은 «알아서 격자 병합 · 행 바꾸기 — 스마트하게».
  - 판정은 글자 수가 아니라 실제 조판 폭 · 높이로 한다.
  - 번호순을 지킨다.
- **쪽 나눔:**
  - 행 단위로 넘긴다(행을 자르지 않는다).
  - 이어지는 쪽에는 표 머리를 반복한다.
  - 해설은 문항 단위로 지금 측정에 잇는다.
- **색:** Hi-fi 캡처에서 25번 목록 · `2(a+b)` · `5/8` 같은 답이 주황 · 파랑으로 보인다(Wire 에서는 검정이었다). 제품 정답지의 지금 글자색을 따르고, 시안의 덧칠은 옮기지 않는다. 까닭을 찾아 보고에 적는다.
- **TDD:**
  - 순수 함수(답 폭 → 칸 수 · 행 나눔 · 쪽 나눔)의 시험을 먼저 쓴다.
  - RTL 은 정답만 판에 해설이 없음, 해설 판에 표 + 해설이 있음을 본다.
  - 25 · 50 · 100문항과 긴 답이 섞인 표본으로 실제 Chromium 에서 잰다: 번호 누락 · 순서 · 칸 넘침 · 쪽 넘침 0.
- **`/dev/print-check`:** `src/app/dev/print-check/items.ts` 에 항목을 더한다(상태 «대기»). 인쇄 지면을 바꾸는 일이라 완료 조건은 실물 프린터 검수다.
- **커밋 · 푸시:** 단위마다 커밋. 푸시하지 않는다.

## 2. 템플릿 A — Hi-fi 4~5안

- A 의 여섯 원형(평가원 영역 2단 / 정통 학교 정보표 / 모던 안내 머리 / 워크북 오른쪽 풀이 / 자습 개념 · 모눈 / 유형 반복)을 유지한다.
- 시각 언어를 4~5안으로 다르게 한다: 선 굵기 · 머리 장식 · 번호 표시 · 남색 쓰는 자리 · 풀이 공간 표시.
- 각 안은 여섯 원형 첫 쪽을 모두 보인다. 실제 `WorksheetPrint` 의 문항 DOM 을 쓴다(지금 Wire 처럼).
- 파일:
  - `docs/design/mockups/print-templates-hifi-20261020.html`
  - 캡처
  - 보고 `docs/planning/tracks/reports/print-templates-hifi-20261020.md`
- 안마다 한 줄 설명과 추천 하나를 단다.
- 저장된 프리셋 이름(`pyeongga` 등)은 바꾸지 않는다.

## 지킬 것

- 🔴 **메모리**(원장님 «메모리 여유 체크하면서 순서대로»):
  - Vite · Chromium · vitest 를 띄우기 전에 남은 메모리 3GB 이상인지 본다.
  - 전체 `npm run type-check` 는 1 의 끝에 한 번만 돌린다. 돌리기 전에 다른 `tsc` 프로세스가 없는지 본다(`Get-CimInstance Win32_Process | ? CommandLine -match 'tsc --noEmit'`). 있으면 끝날 때까지 기다린다.
  - 쓰고 바로 끈다.
- 마우스 어포던스(D-30) · `npm install` / `prisma generate` 금지 · dev 는 `next dev --webpack`.
- 커밋 신원 `chrismathone@gmail.com` / `SUN`(이미 걸려 있으면 그대로).
- 이 지시서를 `docs/planning/tracks/brief-quick-key-h2-and-template-a-hifi-codex.md` 로 복사해 첫 커밋에 넣는다.

## 보고 — 1 이 끝나면 한 번, 2 가 끝나면 한 번

- 커밋
- 바꾼 파일
- 잰 값
- 캡처(정답 · 해설지 첫 쪽 · 정답만 첫 쪽 · 100문항 마지막 쪽)
- `/dev/print-check` 항목 이름
- 내보내기 조사
- 2 의 Hi-fi 파일과 추천
