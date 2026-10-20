# 시험지 만들기 H2 — 실사용 다듬기

2026-10-20 · `fix/builder-h2-width` · 기준 `0e858c133`.

[브리프](../brief-builder-h2-polish-codex.md)의 세 작업을 구현했다. **1440·1920·1040·390px 실제 Chrome 검증에서 문서·열의 가로 넘침 0, 페이지 오류 0**이다. 차시 이름 선표시와 체크 시 재요청 방지를 브라우저와 컴포넌트 시험으로 확인했다. 기존 관련 시험 전체는 **272/275 통과**했으며, 남은 출력 권한 3건은 변경 없는 기준 작업트리에서도 동일하게 실패한다.

## 구현

- **공간·스크롤:** 기존 리드의 최대 폭 1440px, 1단계 오른쪽 `clamp(300px,28%,380px)`, 학년 목록의 고정 높이 제거를 유지했다. 2단계도 왼쪽 보조 열을 같은 폭으로 제한하고 오른쪽 문항 열에 남는 폭을 배정했다. 컨테이너 900px를 넘는 화면에서 두 열에 각각 sticky·높이 제한·`overflow:auto`·`overscroll-behavior:contain`을 적용한다. 작은 화면은 한 열과 페이지 스크롤이다.
- **띠·제목 가림:** `useBuilderScrollFrame.ts`가 `--workspace-sticky-inset`과 단계 띠의 실제 높이를 사용한다. 현재 열의 시작 위치도 높이 계산에 반영해 초기 화면의 열 하단이 뷰포트를 벗어나지 않는다. 띠 줄바꿈·화면 크기·페이지 스크롤에 맞춰 갱신한다. 단계 왕복 시 제목과 저장한 조건을 포함한 설정 영역으로 스크롤한다.
- **담은 범위:** 넓은 화면은 이름·가능 수 / 학년·단원·수·고정·빼기의 두 행이다. 좁은 메타는 전체 내용을 `title`에도 제공하며, 차시 이름과 기존 문구는 보존했다.
- **차시 로딩:** `navigation.lessons` 응답으로 이름을 먼저 그린다. 미확인 수 칸에만 기존 로딩 문구를 표시하고 수 확인 전 선택은 막는다. source·최근 제외 여부·재시도 세대별로 수를 누적하고, 응답받은 ID와 진행 중 ID를 제외한 새 ID만 요청한다. 체크·해제·검색·페이지 이동이 진행 중 요청을 취소하거나 기존 수를 지우지 않는다. source 변경·명시적 재시도·언마운트 시 취소하는 계약과 저장한 조건 적용의 완료 조건을 보존했다.
- **동작 정렬:** 검토 머리의 정답·해설 / 되돌리기 / 문항 추가는 같은 44px 테두리 보조 버튼으로 오른쪽 한 줄에 둔다. 기존 글자색은 유지했다. 범위 추가와 문항별 형식 변경·교체·삭제·위아래 이동도 오른쪽으로 정렬했다. 형식 설명은 문항의 메타 줄로 옮겼다. 좁은 화면은 버튼을 줄바꿈한다. 이전·다음 하단 배치는 보존했다.

현재 배치와 반응형 규칙은 `DESIGN.md`와 메뉴 구현표에도 반영했다. 학생 화면·인쇄·서버·DB 코드는 변경하지 않았다.

## 자동 검사

| 검사 | 결과·증거 |
| --- | --- |
| 기존 관련 시험 전체 | 19파일, 272/275 통과 · [로그](builder-h2-polish-codex-20261020/tests.log) |
| ExamBuilder·저장 조건·H2·demand·picker 5파일 | 80/80 통과 · [하위 작업 로그](builder-h2-polish-codex-20261020/component-tests.log) |
| 신규 로딩 회귀 | 4건: 수 응답 전 이름 표시·체크 재요청 0회, 요청 중 기존 수 유지, 최근 제외별 캐시, source별 캐시 격리·재사용 |
| 전체 타입 검사 | `npm run type-check` 통과 · [로그](builder-h2-polish-codex-20261020/type-check.log) |
| 변경 TS/TSX/MJS ESLint | 통과 · [로그](builder-h2-polish-codex-20261020/eslint.log) |
| 어포던스 | `npm run lint:affordance` 통과 · [로그](builder-h2-polish-codex-20261020/affordance.log) |
| 서식·diff | 변경 구현 파일 Prettier·`git diff --check` 통과 |

전체 시험의 실패 3건은 `exportPerMenu.test.ts:172`의 `textbook` 단독 권한 기대값이다. 대상은 `POST /api/exam/practice/resolve`, `GET /api/exam/practice`, `POST /api/exam/practice`다. 변경 없는 `/Users/pss/Desktop/creative/today-originmain-check`의 같은 기준 커밋에서 동일한 3실패를 재현했다([기준 로그](builder-h2-polish-codex-20261020/baseline-export-test.log)). 해당 권한 코드와 시험은 수정하지 않았다.

재현 명령:

```sh
node_modules/.bin/vitest run --config src/components/exam-builder/vitest.config.mts --configLoader runner
npm run type-check
node_modules/.bin/eslint src/components/exam-builder/ExamBuilder.tsx src/components/exam-builder/ExamBuilder.demand.test.tsx src/components/exam-builder/ScopeSequencePicker.tsx src/components/exam-builder/useBuilderScrollFrame.ts scripts/qa/measure-builder-h2-polish.mjs
npm run lint:affordance
node scripts/qa/measure-builder-h2-polish.mjs
```

## 실제 브라우저

제품 `MathExamBuilder`·`ExamBuilder`·문항 렌더러·CSS·글꼴을 Vite로 묶어 설치된 Google Chrome에서 실행했다. 셸의 사이드바·상단 띠 크기를 재현하고, 24차시·40문항의 합성 데이터와 지연 가능한 fetch 대역을 사용했다. 외부 네트워크는 차단했다. 인증된 Next HTTP·실데이터·실제 출력 검증을 의미하지 않으며, 서버 응답 시간이 줄었다고 주장하지 않는다.

| 뷰포트 | 가용 본문 | 1단계 왼쪽 / 오른쪽 | 2단계 왼쪽 / 오른쪽 | 스크롤 | 가로 넘침 |
| --- | ---: | --- | --- | --- | ---: |
| 1440×1000 | 1145px | 804.4 / 320.6px | 320.6 / 804.4px | 각각 독립 | 0px |
| 1920×1000 | 1440px | 1040 / 380px | 380 / 1040px | 각각 독립 | 0px |
| 1040×1000 | 773px | 한 열 | 한 열 | 페이지 하나 | 0px |
| 390×844 | 343px | 한 열 | 한 열 | 페이지 하나 | 0px |

네 폭 모두 차시 진입 집계 **1회(20개)**, 체크·해제 추가 요청 **0회**, 다음 쪽 요청 **1회(새 ID 4개만)**를 확인했다. 수 응답을 보류해도 20개 이름이 먼저 표시되고, 다음 쪽 요청 중에도 담은 범위의 기존 수가 유지된다. 넓은 화면에서는 실제 마우스 휠로 왼쪽·오른쪽을 각각 움직여 다른 열의 스크롤 위치가 보존되는지 확인했다. 페이지 스크롤 후 단계 띠와 열의 겹침, 초기 열 하단, 설정으로 돌아왔을 때 제목·저장 조건 가림, 보조 버튼의 높이·테두리·한 줄 정렬도 검사했다.

12개 측정 기록과 26개 캡처를 남겼으며 대표 이미지를 직접 확인했다. [브라우저 로그](builder-h2-polish-codex-20261020/browser.log), [실측 JSON](builder-h2-polish-codex-20261020/browser-measurements.json).

- [수 응답 전 차시 · 1440](builder-h2-polish-codex-20261020/1440-lessons-before-counts.png)
- [범위 설정 · 1440](builder-h2-polish-codex-20261020/1440-scope.png), [독립 스크롤 · 1920](builder-h2-polish-codex-20261020/1920-scope-scrolled.png)
- [문항 검토 · 1440](builder-h2-polish-codex-20261020/1440-review.png), [문항 검토 · 1920](builder-h2-polish-codex-20261020/1920-review.png)
- [문항 본문 · 1040](builder-h2-polish-codex-20261020/1040-review-questions.png), [문항 본문 · 폰](builder-h2-polish-codex-20261020/390-review-questions.png)
- [설정으로 돌아오기 · 폰](builder-h2-polish-codex-20261020/390-scope-return.png), [출제 조건 · 폰](builder-h2-polish-codex-20261020/390-scope-composition.png)

## 작업 상태

DB 접근·스테이징·커밋·push·배포를 하지 않았다. `node_modules`는 처음의 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크 그대로이며 스테이징하지 않았다. **3010 개발 서버는 PID 4511, 현재 작업트리에서 실행 중인 상태를 유지했다.** 기존 미추적 브리프도 보존했다.

AGENTS.md의 병렬 작업 지시에 따라 [Orca CLI 스킬](/Users/pss/.agents/skills/orca-cli/SKILL.md)로 Codex 로딩 하위 작업을 분리하고, patch를 이 작업트리에 통합했다([하위 결과](builder-h2-polish-codex-20261020/loading-worker.md)). 하위 작업 터미널은 종료했고 완료 상태를 표시했다. 커밋 금지로 `main`에 병합되지 않은 변경이 있으므로, 삭제 금지 규칙에 따라 `/Users/pss/orca/workspaces/today_/builder-h2-loading`과 브랜치를 보존했다. 최종 결과는 현재 작업트리의 미커밋 변경이다.
