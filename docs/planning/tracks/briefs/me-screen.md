# me-screen — «도움이 필요한 학생» 교사 화면 구현 (Hi-fi H3 · 3자 눈검수 합의)

> 먼저 읽을 것: `docs/planning/tracks/reports/consult-27/consensus.md` **§6(4회전 — 이 일의 출발점)** · §4(2회전 Wire) · §1.2(사유 v1.1) ·
> `docs/planning/27-explorers-teacher-visibility.md` §4.2 · §6(맨 아래 «화면 단계에서 지킬 것») ·
> 시안 `docs/design/mockups/hifi-explorers-teacher.html`(`?view=H3` · `?view=H3&state=open` · `?view=empty` · `?view=entry`) 과 그림 `docs/design/mockups/hifi-explorers-teacher-shots/H3-*.png` · `empty-1280.png` · `entry-1280.png` ·
> 시안 보고 `docs/planning/tracks/reports/me-hifi.md`(토큰 출처 §2 · 수치 §5) · 끝점 보고 `docs/planning/tracks/reports/me-teacher.md` ·
> 계약 `src/contracts/mathExplorersTeacher.contract.ts` · 투영 `src/lib/math-explorers/teacherSummary.ts`(문턱 상수) · 끝점 `GET /api/classes/{id}/math-srs/explorers` · `GET /api/students/{id}/math-srs/explorers`.
> 가지: 워크트리에서 `git switch -c chrismathone/me-screen main`(origin 이 아니라 **로컬 main**).

## 왜

원장님 2026-10-01 «hifi 시안도 3종 AI들이 눈으로 본 다음에 협의 도출한 방향으로 진행해». 리드 · codex · grok 이 그림 22장을 보고 **H3** 을 골랐다(consensus §6).
D-07 의 시안 고르기는 이 화면에 한해 3자 합의가 대신한다(D-152). 문구 · 모양은 아래와 시안 H3 을 따르고, 시안에 없는 결정이 필요하면 **추측하지 말고 리드에게 question**.

## 만들 것

1. **수업 관리의 셋째 탭** «도움이 필요한 학생 N»(`src/components/unified/TeachingView.tsx` 의 `tabs` — N 은 학습 개입 학생 수, 0 이면 숫자 없음). 탭 키보드 이동은 지금 탭과 같게.
   주소로 탭과 반을 열 수 있게(`?tab=help&class=<id>` 같은 꼴 — 지금 TeachingView 가 주소를 어떻게 읽는지 보고 맞춘다). 탭 안은 새 컴포넌트(예: `src/components/math-explorers/TeacherHelpList.tsx` + CSS 모듈).
2. **자료**: 담당 반 목록(지금 화면들이 쓰는 `/api/classes?page=1&pageSize=100`) → 반마다 `GET /api/classes/{id}/math-srs/explorers` → 학생은 한 번씩. 펼칠 때 `GET /api/students/{id}/math-srs/explorers`.
   한 반이 실패해도 다른 반은 보인다 — 실패한 반은 목록 위 한 줄(«중1 심화 A 의 기록을 읽지 못했습니다 · 다시 불러오기»). 503 의 학생용 문구를 그대로 보이지 않는다(27 §6 ②).
3. **머리**(H3): 제목 «도움이 필요한 학생» · 한 줄 요약 «학습 개입 7명 · 운영 확인 3명 · 기준 아래 19명 — 담당 반 3 · 29명 · 10/1(목) 기준» · «새로고침» 단추 ·
   거르개 한 줄: 학교급(전체 · 초등 · 중등 — 사람 수) + 반 고르기(담당 반 전체 / 반마다). 갈래 거르개 없음.
4. **학습 개입 N명** + 딱지 «잠정 기준 v1.1»: 사유가 바뀌는 자리에 **얇은 머리**(«미해결을 남기고 끝냄 2명»), 차례는 계약의 `learningFlags` 차례, **0명인 사유 머리는 없다**.
   학생은 가장 앞선 사유 머리 아래 **한 번만** · 줄은 두 줄(이름 · 반 | 문장, 둘째 사유는 작은 «그 밖 …» 줄). «복습이 밀림» + «오래 쉼»이면 밀림이 주인.
   문장은 시안 H3 그대로의 꼴(«9/30(수) 일차방정식에서 3개.» · «3일 이상 지난 카드 14장 · 가장 오래 8일.» · «9/28(월)에 연 정수와 유리수 · 3일째.») — 문장은 **한 함수**가 계약 값으로 짓는다(손으로 쓴 숫자 없음).
   🔴 **«2단계 · 상한에 닿아 선생님과 확인» 빈 자리 상자는 만들지 않는다**(합의 §6).
   목록 발치에 기준 한 줄 — 문턱 값은 `teacherSummary.ts` 의 상수에서 읽어 짓는다(문서에 쓴 숫자를 옮겨 적지 않는다).
5. **펼침**(줄 안 — 오른쪽 칸 없음): 단추 «펼치기 ∨ / 접기 ∧»(이름도 같은 단추로 눌러도 된다 — 시안 H3). 펼친 줄에도 **사유 이름이 남는다**(머리가 화면 밖이어도 — codex).
   펼친 안: 숫자 한 줄 «모은 카드 230장 중 15장 · 밀린 카드 14장 · 가장 오래 8일 · 막힌 카드 없음» → **밀린 · 막힌 카드를 단원별 한 줄로 묶음**(단원 · N장 · 카드 이름 + 밀린 날, 오래 밀린 차례) →
   «최근 세션» 3건(날짜 · 단원 · «첫 시도 15개 중 9개 맞힘» · 미해결) → «문항 글과 학생이 고른 답은 싣지 않습니다.» → 맨 아래 **«접기»** 단추 하나 더(폰에서 위로 안 올라가도 닫힌다).
   🔴 펼침 안에서 사유 문장을 되풀이하지 않는다(grok) · 5칸 띠 없음 · **진행 중(active) 세션의 `unresolved` 는 그리지 않는다**(엔진이 비운 값 — 27 §6 ①).
6. **운영 확인 N명**(따로 센다): «시작 전. 계정을 만든 날 9/24(목) · 7일째 탐험 기록 없음.» · «계정 없음.» + 학습 사유 딱지 + «반 관리에서 계정 확인 →» 링크. 이름은 단추가 아니다(D-30).
7. **기준 아래 N명** — 접어 둠, «이름 펼치기» 단추 · 머리 곁 글 «기준에 걸리지 않은 학생 — 살필 일이 없다는 뜻은 아닙니다».
8. **빈 상태**(학습 개입 0): 큰 글 **«잠정 기준에 걸린 학생이 없습니다»** · 작은 글 «기준 아래 N명은 아래에서 펼칩니다»(합의 §6 — 시안 글과 다르다).
9. **들어오는 한 줄** — 반 · 학생 관리에서 반을 고른 오른쪽 칸 위와, 반 복습 현황 화면 머리(`src/app/(main)/classes/[id]/math-srs/page.tsx` 쪽 — 중등 «수학 복습» · 초등 «SRS 현황»)에
   «이 반에서 도움이 필요한 학생 4명 → · 운영 확인 2명» 글 링크(시안 `entry-1280.png`, 점선 «새 줄» 표지는 시안 표지라 없다). 누르면 셋째 탭이 그 반으로 열린다. 0명이면 줄을 안 그린다.
10. **폰**(390 × 844): 첫 화면에 **첫 학생의 사유 줄까지** 보여야 한다 — 머리 · 거르개를 한 줄로 줄인다(학교급 거르개는 남긴다). 시안 H3-390 은 이름만 겨우 보였다 — 그보다 나아야 한다.

## 지켜야 하는 것

- **제품의 얼굴 그대로** — 색 · 글꼴 · 모서리 · 단추 · 딱지는 `globals.css` 토큰과 `course-dashboard.module.css` · `TeachingView.module.css` 의 값(시안 보고 §2 표지). 새 색 · 새 그림자 없음. 05 §0 금지 목록.
- D-08 사무적 문구(느낌표 · 이모지 없음) · D-30(줄 · 딱지 · 머리는 안 눌린다 — `npm run lint:affordance`) · 문항 글 · 학생 답 · 종합 점수 · 순위 · 학생 번호 없음.
- **학생 화면 · 저장 꼴 · DB · 끝점 계약을 바꾸지 않는다.** 끝점에 칸이 모자라면 리드에게 question(계약을 넓히는 일은 리드가 정한다).
- 권한: 셋째 탭과 들어오는 줄은 반 · 학생 관리를 볼 수 있는 계정에서만. 학생 끝점이 403 이면 펼침 안에 «기록을 볼 권한이 없습니다» 한 줄(메뉴 판정은 지금 코드의 방식을 읽고 따른다).

## TDD · 검증

- 빨강 먼저. RTL 시험: 학생이 한 번씩 · 사유 머리 차례 · 0명 머리 없음 · 둘째 사유 줄 · 밀림 + 쉼의 주인 · 운영 확인 · 계정 없음 딱지 · 기준 아래 접힘 · 빈 상태 문구 · 한 반 실패 · 펼침(단원 묶음 · 최근 세션 · 진행 중 미해결 안 그림 · 아래 접기) ·
  응답에 문항 글이 없다는 단정은 계약이 이미 한다 — 화면 쪽은 «문장을 짓는 함수» 시험(숫자 · 날짜 · 요일 · 단위)과 «2단계 상자 없음».
  자료는 계약 schema 로 parse 되는 고정 응답(손으로 쓴 꼴이 계약과 어긋나면 시험이 먼저 운다).
- 관련 시험(이름을 적어): 새 시험 + `TeachingView`/`AdminPages`/`Main` 처럼 TeachingView 를 그리는 시험 + `errorLogRouteCoverage` + 어포던스. vitest `--pool=threads --maxWorkers=1`.
- **그림**(3자가 다시 본다 — 이것이 끝의 기준): 실제 컴포넌트를 실제 Chromium 으로 그려 `docs/planning/tracks/reports/me-screen/` 에
  `1280-first.png` · `1280-open.png`(밀린 카드 14장 학생 펼침 — 그 줄이 위쪽에) · `390-first.png` · `390-open.png` · `empty-1280.png` · `entry-1280.png`. 표본은 시안과 같은 29명(계약 꼴로).
  화면 한 장 크기 · deviceScaleFactor 1 · 긴 전체 쪽 그림 금지. `.env` 가 없으니 Next 를 띄우지 말고 Vite 하네스로(예: `e2e/body-typeset` · `e2e/concept-blank-paper` 의 방식) 컴포넌트에 고정 응답을 먹인다.
  잰 값을 보고서에: 1280 · 390 첫 화면에 보이는 학생 수 · 블록 높이 · 펼친 뒤 다음 학생 · 문서 가로 폭 = 창 폭.
- 보고서 `docs/planning/tracks/reports/me-screen.md`(만든 것 · 합의 §6 항목별로 어떻게 했나 · 수치 · 못 본 것). 가지에 커밋 → `worker_done`.

## 하지 않는 것

«봤음» 닫기 · «남은 것 다시» 상한 · 선수 회복 배정 · 답안별 기록(전부 2단계 이후 — 27 §5) · 갈래 거르개 · 오른쪽 칸 · 새 끝점 · DB.

## 공통

node_modules 는 main 을 가리키는 정션 — `npm install` · `npx prisma generate` 금지. 전체 `npm run type-check` 금지(리드가 병합 뒤 main 에서).
무거운 검사(vitest 여러 파일 · Playwright) 전에 `C:\Users\user\orca\cb-verify.lock` 가 있으면 기다리고, 없으면 만들고(내용: 트랙 이름) 돌린 뒤 지운다 — 걸음 사이에는 놓는다.
시작 전에 여유 메모리가 1.5GB 아래면 기다린다. 5분 넘게 출력 없는 제 프로세스는 스스로 끈다. 답과 보고서는 한국어.
