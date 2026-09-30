# me-wire — «개념 카드 기록 · 도움이 필요한 학생» 교사 화면 Wire 4~5안 (시안만)

> 먼저 읽을 것: `docs/planning/27-explorers-teacher-visibility.md`(전부) · `docs/planning/05-design-system.md` §0(정체성 · 금지 목록 · §0-3 제시 방식) ·
> `docs/planning/23-achievement-report.md` §2 · §7(종합 점수 없음 · 태도는 문장) · 앞선 Wire 의 틀 `docs/design/mockups/wire-star-economy.html` · `wire-supplement-cards.html`.
> 가지: 워크트리는 이미 `chrismathone/me-wire`(로컬 main 에서 갈렸다) 위에 있다 — 새 가지를 만들지 않는다.

## 무엇을

교사가 개념 카드(탐험) 기록과 «누가 왜 도움이 필요한가»를 보는 화면의 **Wire 4~5안**을 한 HTML 로 만든다 —
`docs/design/mockups/wire-explorers-teacher.html`. 구현이 아니다. 원장님이 고르실 재료다(D-07: Wire 4~5안 → 선택 → Hi-fi).

- 틀은 앞선 Wire 와 같게: 흑백 · 상자 위주 · 위에 «정할 것» 상자 · 안마다 한 줄 요지 · 끝에 비교표.
- **지금 있는 교사 화면을 먼저 읽는다**(코드로): 중등 `src/components/math-srs/ClassMathSrs.tsx`(반 복습 현황 — `/classes/[id]/math-srs`) ·
  초등 `src/components/math-srs/CourseDashboard.tsx`(«오늘의 기억 · SRS» — 명단 · 상세 탭 다섯). 새 안은 이 둘의 말투 · 밀도 · 자리와 어울려야 한다.
- 보여 줄 자료는 27번 문서 §4.2 와 `tracks/briefs/me-teacher.md` 의 출력 목록 **안에서만** 고른다(있는 자료만 — 없는 숫자를 그리지 않는다).
  문항 글 · 학생 답은 없다(D-141 ⑵). 종합 점수 · 순위 · 백분위를 만들지 않는다(D-134).
- 안마다 달라야 하는 축(적어도 넷을 가른다):
  1. **자리** — 반 현황 화면 안의 한 구역 · «오늘의 기억» 상세의 새 탭 · 수업 관리의 새 화면 · 반 카드의 한 줄 요약에서 펼침.
  2. **첫 화면의 주인** — «도움이 필요한 학생»(사유 목록)이 먼저인가 · 반 전체의 개념 지도가 먼저인가 · 학생 명단이 먼저인가.
  3. **사유의 모양** — 학생 줄에 딱지 · 사유별 묶음 · 한 줄 문장(«○○ — 미해결 3개를 남기고 끝냄»).
  4. **카드 230장을 어떻게** — 단원별 5칸 띠 · 밀린 것만 목록 · 숫자 요약만.
- 표본은 **작게 짓지 말고 실제 크기로**: 한 반 12명 · 초등과 중등 섞인 경우 · 사유가 없는 학생이 대부분인 반 · 계정 없는 학생 · 기록 없는 학생.
  (교훈 2026-08-19 «시안이 작은 픽스처로 서면 원장님이 실제 화면에서 찾아 준다».)
- 문구는 간결 · 사무적(D-08) — 느낌표 · 이모지 없음. 손가락 커서 · hover 는 실제로 누르는 것에만(D-30 — Wire 에서도 표시를 가른다).
- 끝에 **«정할 것» 목록**(원장님께 물을 것): 자리 · 첫 화면 · 사유 문턱(27 §4.2 의 첫 값) · 사유를 «봤음»으로 닫는 기능이 필요한가(닫으려면 저장이 필요하다 — 2단계).

## 하지 않는 것

제품 코드(`src/`) 수정 · 새 자료 짓기 · Hi-fi(색 · 실제 글꼴 · 그림자).

## 끝났다는 것

- HTML 을 브라우저(Playwright 또는 설치된 Edge headless — 새로 내려받지 않는다)로 열어 안마다 PNG 를 떠 `docs/design/mockups/wire-explorers-teacher-shots/` 에 넣고,
  1280 폭과 폰 폭(390)에서 넘침이 없는지 확인한다.
- 보고서 `docs/planning/tracks/reports/me-wire.md` — 안마다 한 줄 요지 · 읽은 기존 화면의 사실 · 정할 것.
- 가지에 커밋(main 에 밀지 않는다) → `worker_done`.

## 공통

node_modules 는 main 을 가리키는 정션 — `npm install` · `npx prisma generate` 금지. 전체 `npm run type-check` 금지.
무거운 검사(Playwright) 전에 `C:\Users\user\orca\cb-verify.lock` 가 있으면 기다리고, 없으면 만들고(내용: 트랙 이름) 돌린 뒤 지운다. 답과 보고서는 한국어.
