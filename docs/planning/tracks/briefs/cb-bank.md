# 트랙 cb-e3 · e4 · e5 · e6 · m1 · m2 · m3 — 개념 백지 고정 문항 은행 (D-150 · 26 §5)

공통 규칙: `docs/planning/tracks/briefs/cb-common.md`. 트랙마다 **학년 하나 · 파일 하나**.

| 트랙 | 파일(소유 — 이것만) | 학년 | 뼈대(저장소 밖, 읽기만) |
|---|---|---|---|
| cb-e3 | `src/lib/concept-blank/bank/e3.ts` | 초3 | `C:\Creative\testautocreator-data\I-개념용어\cube-3-1.json` · `cube-3-2.json` |
| cb-e4 | `…/bank/e4.ts` | 초4 | `cube-4-1.json` · `cube-4-2.json` |
| cb-e5 | `…/bank/e5.ts` | 초5 | `cube-5-1.json` · `cube-5-2.json` |
| cb-e6 | `…/bank/e6.ts` | 초6 | `cube-6-1.json` · `cube-6-2.json` |
| cb-m1 | `…/bank/m1.ts` | 중1 | `gaenyeom-1-1.json` · `gaenyeom-1-2.json` |
| cb-m2 | `…/bank/m2.ts` | 중2 | `gaenyeom-2-1.json` · `gaenyeom-2-2.json` |
| cb-m3 | `…/bank/m3.ts` | 중3 | `gaenyeom-3-1.json` · `gaenyeom-3-2.json` |

(보고서 `docs/planning/tracks/reports/cb-<트랙>.md` 도 내 것.) 그 밖은 고치지 않는다 — 계약 · 시험 · 다른 학년 파일 포함.

## 무엇을 채우나 — 꼴은 `src/contracts/conceptBlank.contract.ts`
- 대상 소단원 = `BLANK_TREE`(`src/lib/concept-blank/sections.ts`)에서 내 학년의 **소단원 전부**. 열쇠는 `section.key` 그대로 복사.
- 소단원마다 최소: **개념 ≥ 2**(그 소단원에 해당하는 교재 용어가 있으면 **그 용어 전부**) · **○× ≥ 1** · **적용 ≥ 1** ·
  도형 · 측정 · 그래프 · 좌표 소단원은 **그림 ≥ 1**. 계산 연습뿐이라 개념이 없는 소단원은 개념 0 이어도 되고 보고서에 목록.
- 교재 JSON 은 **뼈대**: 어떤 용어가 어느 소단원에 있나(`terms[].term · section · chapter · kind`)만 쓴다. 교재 소단원 이름과
  교육과정 소단원 이름이 조금 다르다 — 뜻으로 맞춘다. `sentence` 는 🔴 **읽고 뜻만 확인, 문장은 새로 쓴다**.
- 말투 참고(우리 글, 옮겨도 됨): 탐험 카드 `src/lib/math-explorers/definition-content.ts` · 보충 카드 `supplement-content.ts`.

## 칸 쓰는 법
- `id`: 소문자 · 숫자 · 붙임표. 초등 `e5-2-3-1-c1`(학년-학기-단원-소단원-종류번호, c 개념 · o ○× · a 적용 · f 그림),
  중학 `m1-01-03-c1`(대단원 번호 두 자리 - 그 대단원 안 소단원 차례 두 자리). 파일 안에서도 · 은행 전체에서도 겹치면 안 된다.
- `level`: **하** 기본 용어 뜻 · **중** 성질 · 관계 · 기호 · 헷갈리는 둘 가르기 · **상** 공식의 까닭 · 조건이 겹침 · 경계 · 활용.
  소단원마다 되도록 셋 다.
- `kind`: `정의 · 성질 · 공식 · 방법 · 법칙 · 정리 · 단위` 중 하나(교재 JSON 의 갈래를 참고하되 이 일곱으로).
- `definition`: 한두 문장 · 초등은 그 학년 말로 · 핵심어를 `{ }` 로 1~4곳(빈칸 형식에서 비고, 채점표에서 굵게 — **학생이
  꼭 떠올려야 할 말**만). 수식은 `$...$`(중학) — `{ }` 안에 `$` 금지. 빈칸을 빼도 문장이 읽혀야 한다.
- `example`(선택, 개념 지도의 «예»): 짧은 물음 + 답(수 · 낱말).
- `ox`: 헷갈리기 쉬운 문장 · 참/거짓 · 까닭 한 줄. 참과 거짓을 섞는다.
- `apply`: 한 줄 물음 · 짧은 답(계산은 **직접 검산**).
- `figures`: SVG 조각(바깥 `<svg>` 없이) · `viewBox` 는 `0 0 200 125` 권장 · 색은 지면 팔레트(선 `#1F1F23` · 보조 `#6B6B72` ·
  금 `#A57F00` · 칠 `#F7F3E6`) · 🔴 답이 되는 이름을 그림에 쓰지 않는다 · 빈 이름표는 `tags`(x · y · w, 높이 18, viewBox 안) ·
  `lines` 1~2줄(줄 이름 + 채점 답). 직각 표시 · 같은 길이 표시 · 점선(숨은 선 · 높이 · 대칭축)을 수학적으로 맞게.
  **그린 뒤 눈으로 본다**: 스크래치에서 Playwright 로 그림마다 PNG 를 떠 몇 장이라도 직접 확인하고 보고서에 몇 장 봤는지 적는다.

## 받아들임
1. `npx vitest run src/__tests__/unit/conceptBlankBank.test.ts` 초록(꼴 · 열쇠 · 제 학년만 · id · 핵심어 · 이름표 자리).
2. `npx tsx scripts/qa/concept-blank/check-leak.ts --part <e5 등>` **누출 0건**(12글자 창). `--n 10` 도 돌려 보고 숫자를 보고서에.
3. 보고서: 소단원별 개수 표(개념 · ○× · 적용 · 그림 · 하/중/상) · 개념 0 소단원과 까닭 · 교재 용어 중 못 넣은 것과 까닭 · 그림 확인 장 수.
4. `npm run type-check` 초록.
