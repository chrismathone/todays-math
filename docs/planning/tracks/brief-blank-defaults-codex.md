# 지시서 — 개념 백지: 형식 토글 기본 꺼짐 · 고른 단원을 학년 · 학기 · 대단원으로 묶어 보이기 (codex, 2026-10-20)

원장님 2026-10-20 요청 둘(화면 캡처로 받음). 개념 백지 작업 전 `docs/planning/26-concept-blank.md` 를 읽는다.

## 1. 형식 토글 — 새로 열면 전부 꺼짐

- 지금: `src/components/concept-blank/ConceptBlankView.tsx` 의 `draftFrom()` 이 `on: !saved` — 새 고르기는 A~E 가 모두 켜진 채 시작한다.
- 바꿀 것: **새 고르기(주소에 `?blank=` 없음 · 저장본 아님)는 A~E 모두 꺼짐.** 저장본 · 주소의 고르기를 열면 지금처럼 저장된 형식만 켠다.
- 전부 꺼진 상태에서 화면이 깨지지 않게: 미리보기 · 저장 · 인쇄가 «형식을 하나 이상 켜세요» 같은 안내로 막히는지 확인하고, 없으면 지금 화면의 빈 상태 말투(D-08 — 간결 · 사무적 · 느낌표 없음)로 한 줄 넣는다. 지면 · 문항 수 계산 · 지면 코드(`sheetCode.ts`) · 계약은 바꾸지 않는다.

## 2. 단원 고르기 요약 — 학년 · 학기 · 대단원으로 묶기

- 지금: `src/components/concept-blank/ConceptBlankUnitPicker.tsx` 의 요약 카드가 소단원 이름만 4줄 + «외 N개 소단원».
- 바꿀 것: 고른 소단원을 **나무 순서대로** 학년 · 학기 · 대단원 묶음 머리 아래에 보인다.
  - 초등: 학기는 대단원 번호의 앞자리(`1-2 약수와 배수` → 1학기). 머리 예: «초5 · 1학기 · 1-2 약수와 배수».
  - 중학: 교육과정 시드(`prisma/seed-data/units.ts`)에 학기가 없다 — **학년 · 대단원만**(원장님 확정): «중1 · 1. 소인수분해». 학기를 지어내지 않는다.
  - 카드 높이는 지금처럼 묶여 있어야 한다 — 보이는 줄 수에 상한을 두고 넘치면 «외 N개 소단원»(묶음 머리는 줄 수에 넣되 한 묶음이 머리만 남고 잘리지 않게).
  - 소단원 이름은 지금처럼 `sectionTitleTex` + `PaperText`(KaTeX). 대단원 이름의 수식도 같은 길로.
- 요약에 넘기는 값을 문자열 배열에서 구조(학년 · 대단원 · 소단원 이름)로 바꿔도 된다 — `getBlankSection` · `BLANK_TREE`(`src/lib/concept-blank/sections.ts`)를 쓴다.

## 3. 지킬 것

- TDD — RTL 로 ① 새 고르기의 토글이 모두 꺼짐 · 저장본은 저장된 형식만 켜짐 ② 초등 묶음 머리에 학기 · 중학 머리에 학기 없음 · 넘침 줄. 기존 시험이 «다 켜짐»을 붙잡고 있으면 새 규칙에 맞게 고친다.
- 개념 백지 은행 · 지면(`paper/**`) · 인쇄 · 계약 · DB 는 그대로. 화면만.
- 마우스 어포던스(D-30) · `npm run lint:affordance`.
- 정션 `node_modules` — `npm install` / `prisma generate` 금지. 전체 `type-check` 는 끝에 한 번(다른 작업자 둘이 같이 돈다 — 메모리). 단위마다 커밋. 푸시하지 않는다.
- 커밋 신원: `git config --local user.email chrismathone@gmail.com` · `git config --local user.name SUN`.
- 이 지시서를 `docs/planning/tracks/brief-blank-defaults-codex.md` 로 복사해 첫 커밋에 넣는다.
- 다 되면 보고: 커밋 · 바꾼 파일 · PC 1366 / 폰 390 캡처(새로 연 화면 · 단원 6개 이상 고른 요약 — 초등 두 학기 + 중학이 섞인 것).
