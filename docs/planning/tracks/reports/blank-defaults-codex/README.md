# 개념 백지 기본값 · 단원 요약 — 2026-10-20

## 커밋

- `fe03f16f3` — 새 고르기는 A~E 모두 꺼짐. 지시서 복사 포함.
- `48b2904bb` — 고른 소단원을 나무 순서의 학년 · 학기 · 대단원으로 묶음.
- 후속 캡처 커밋 — 1366 · 390 네 장과 독립 예시의 의존성 변환 설정 보강.
- 푸시하지 않음.

## 바꾼 파일

- `src/components/concept-blank/ConceptBlankView.tsx`: 새 초안의 형식을 끄고, 소단원 선택 후 형식이 전부 꺼져 있으면 «형식을 하나 이상 켜세요.»를 표시. 요약에는 소단원 키를 전달.
- `src/components/concept-blank/ConceptBlankUnitPicker.tsx`: `BLANK_TREE` 순서로 묶음. 초등은 대단원 번호의 앞자리로 학기를 표시하고 중학은 학기 없이 표시. 머리 포함 여섯 줄까지 표시하며 새 묶음은 소단원 한 줄까지 들어갈 때만 시작. 숨긴 소단원은 «외 N개 소단원»으로 표시. 머리와 소단원 모두 `sectionTitleTex` · `PaperText` 사용.
- `src/components/concept-blank/unit-picker.module.css`: 묶음 머리와 소단원 한 줄 표시 · 들여쓰기. 기존 버튼 어포던스 유지.
- `src/__tests__/components/ConceptBlankView.test.tsx`: 새 고르기의 기본 꺼짐과 저장 · 인쇄 · 미리보기 차단 검증. 기존 생성 시험에서 형식을 명시적으로 켬. 주소 · 저장본 복원 시험 유지.
- `src/__tests__/components/ConceptBlankUnitPicker.test.tsx`: 나무 순서, 초등 두 학기 · 중학 학기 없음, 숨김 개수, 머리만 남는 경계, KaTeX 검증.
- `docs/planning/tracks/brief-blank-defaults-codex.md`: 받은 지시서 원문.

은행 · 지면 · 문항 수 계산 · 지면 코드 · 인쇄 · 계약 · DB 변경 없음.

## 검증

- TDD: 기본값 새 시험은 기존 구현에서 1건 실패(37건 통과). 요약 새 시험은 기존 구현에서 3건 실패.
- 최종 RTL: 두 파일 **42/42 통과** (`--pool=threads --maxWorkers=1`). 중간 실행 한 번은 작업자 시작 시간 초과로 끝나 동일 범위를 재실행.
- `npm run lint:affordance`: 종료 코드 0. 두 구현 커밋의 ESLint · Prettier · 변경 파일 어포던스 훅 통과.
- 전체 `npm run type-check`: 지시대로 한 번 실행. `.next/dev/types/routes.d.ts`의 469~493행 생성 파일 문법 오류(TS1109 · TS1005 · TS1160)로 실패. 전체 타입 검사 통과로 보고하지 않음.
- `npm install` · `prisma generate` 실행하지 않음.

## 브라우저 검증 범위

통합 `/dev/workspace-alignment`는 로컬 `@prisma/client did not initialize yet` 오류로 열리지 않았다. 캡처는 동일한 실제 `ConceptBlankView` · CSS와 실제 초5 · 중1 은행을 연결한 독립 Vite 예시에서 확보했다. 실계정 · DB · 통합 셸 검증을 완료한 것으로 보고하지 않는다.

리드의 메모리 제한 지시(남은 메모리 약 1GB)에 따라 직접 띄운 Vite · 캡처 Node · 그 자식 Chromium 프로세스를 종료했다. 이후 리드가 약 6.5GB 확보와 개념 백지 캡처 재개를 알린 뒤 서버 하나와 Chromium 하나로 순서대로 수행했다. 캡처 완료 뒤 Chromium과 Vite를 종료했다. 전체 타입 검사는 다시 실행하지 않았다(병합 시 리드가 수행).

### 캡처 — 1366 / 390

| 폭 | 새로 연 화면 | 6개 소단원 선택 요약 |
|---|---|---|
| PC 1366 | [fresh-1366.png](fresh-1366.png) | [selected-1366.png](selected-1366.png) |
| 폰 390 | [fresh-390.png](fresh-390.png) | [selected-390.png](selected-390.png) |

선택 구성은 초5 1학기 «1-2 약수와 배수» 1개, 초5 2학기 «2-3 합동과 대칭» 1개, 중1 «1. 소인수분해» 4개다. 두 폭 모두 세 묶음의 머리와 각 첫 소단원, «외 3개 소단원»이 표시된다. 스크립트가 6개 선택 · 초등 두 학기 머리 · 중학 머리를 확인했고, 문서 전체 가로 넘침은 두 폭 모두 `false`였다.

네 이미지를 육안 확인했다. 새 화면은 형식이 꺼져 있고, 단원 선택 뒤에도 형식이 꺼진 채 «형식을 하나 이상 켜세요.»가 표시된다. 요약은 머리만 남은 묶음 없이 제한된 높이에 표시된다. 기존 형식 표는 내부 가로 스크롤을 유지한다. 학생지 · 인쇄 지면은 이번 캡처 대상이 아니다.

독립 예시 재현용 파일은 `visual/`에 보존한다. 저장소 루트 기준으로 `node node_modules/vite/bin/vite.js --config docs/planning/tracks/reports/blank-defaults-codex/visual/vite.config.mjs`를 실행하고 서버 준비 후 `node docs/planning/tracks/reports/blank-defaults-codex/visual/capture.cjs`를 실행한다. 의존성 자동 변환과 MathJax 명시 변환은 이 예시 설정에만 적용된다. 제품 코드 변경은 없다.
