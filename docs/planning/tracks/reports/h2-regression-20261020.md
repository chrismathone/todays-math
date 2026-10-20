# H2 연산 정답지 · 합친 검수 목록 회귀 수정

2026-10-20. 리드의 합치기 전 검사 요청. T2 제품 구현에 앞서 H2 회귀를 별도로 수정·검증한다.

## 커밋과 변경

- `167b47545`: `origin/main` (`ed17a8acb`) 선병합. `items.ts` 충돌에서 H2 빠른 채점표와 스마트 풀이 여백 항목을 둘 다 보존했다.
- `e1b914caa`: 실측 전 H2 내용 보존과 연산 회차 머리 회귀 수정, 검수 항목 수 141로 갱신.
- 후속 검증·보고 커밋은 이 파일의 Git 이력에서 확인한다. push하지 않았다.

바꾼 제품 파일은 `src/components/unified/print/useMeasuredAnswerPages.tsx`다. 실측 전에도 회차마다 H2 표의 내용과 번호를 렌더한다. 이 행은 아직 측정한 배치가 아니므로 `ready=false`를 유지한다. 실제 브라우저에서 조판 폭·높이가 생기면 기존 H2 실측·병합·행 단위 쪽 나눔으로 대체한다. jsdom을 감지하는 분기나 가짜 측정 완료 신호는 넣지 않았다. 출력 preflight는 실측 완료를 계속 기다린다.

시험 변경:

- `ArithmeticGroupedOutput.test.tsx`: H2의 번호 셀을 확인하고, 6양식 각각 1·2단에서 회차별 정답 2쪽·머리의 `data-arithmetic-round` 하나·연속 번호 1~6·해설 없음·실측 전 준비 상태 false를 검증한다. 기존 문제지 회차/묶음/글자 크기 검사는 유지했다.
- `useMeasuredAnswerPages.test.tsx`: 배치값이 없는 초기 렌더의 회차별 H2 내용·선택 변경과 미준비 상태를 검증한다.
- `PrintCheck.test.tsx`: 합친 실제 항목 수 **141**을 명시했다. 검수 항목을 삭제해 수를 맞추지 않았다.

## 수정 전 재현과 집중 검사

수정 전 3파일 19시험 중 **10 통과 / 9 실패**를 재현했다. ArithmeticGroupedOutput 6개(정답 쪽 0장), PrintCheck 1개(141 ≠ 139), 새 실측 전 경계 시험 2개가 실패했다. 수정 후 관련 6파일 **59/59 통과**.

## main의 기존 실패 — 실제 실행 비교

Orca로 `ed17a8acbfa15712888e681f5cb561ab5560bfe5` 전용 비교 체크아웃을 만들고, 제품 수정 전 5파일을 `--maxWorkers=2`로 실행했다. 테스트 의존성은 이 가지의 같은 node_modules를 정션으로 연결해 환경 차이를 줄였다. **36 통과 / 6 실패**였다.

| main 파일 | 실패 수 | 실제 진단 |
|---|---:|---|
| JeongtongHeader.test.tsx | 1 | `table`이 없어 `textContent` 접근에서 TypeError |
| mathgenTemplates.test.tsx | 3 | workbook · jaseup · yuhyung 출력에 기대한 `검증 학교` 없음 |
| arithmeticV2Geometry.test.ts | 1 | saved SVG 투영 시험에서 `problemAt` 호출 기대 1, 실제 0 |
| PrintCheck.test.tsx | 1 | main의 실제 항목 수 140, 기대 수 139 |
| ArithmeticGroupedOutput.test.tsx | 0 | main은 7시험 모두 통과 |

앞의 5실패는 이번 H2 변경 전 main에서도 빨갰다. PrintCheck는 main의 스마트 여백 추가와 이 가지의 H2 추가를 모두 반영해 141로 수정했다. 정통 머리·Mathgen 메타·연산 도형의 제품 코드는 이번 회귀 수정에서 바꾸지 않았다.

비교 종료 후 깨끗한 체크아웃과 main 조상 관계를 확인하고, 리드 지시대로 **`cmd /c rmdir`로 node_modules 정션을 먼저 끊은 뒤 `orca worktree rm`**을 실행했다. 작업트리 디렉터리와 Git worktree 목록에서 제거됨을 확인했다. 추가 작업트리·하위 작업자는 만들지 않았다.

## 전체 인쇄 관련 검사

요청한 정확한 검색식으로 잡히는 **119파일 전부**, 여기에 검색식에 걸리지 않는 기존 실패 비교용 `JeongtongHeader`·`mathgenTemplates` 2파일을 더한 **총 121파일**을 `--maxWorkers=2`로 실행한다. `arithmeticV2Geometry`는 원래 검색 결과에 있다. 목록을 임의로 줄이거나 기존 빨강을 제외하지 않았다.

```text
git grep -l -E 'print-check|AnswerPage|answerKeyLayout|WorksheetPrint|useMeasured|packMeasured|PrintOptions|Arithmetic' -- 'src/__tests__/**/*.test.ts*'
node scripts/qa/print-templates/run-h2-regressions.mjs
```

시작 전 메모리: 수정 전 집중 3.15GiB, main 비교 3.11GiB, 수정 후 집중 3.61GiB, 전체 검사 3.10GiB. 각 실행은 순차로 진행했다. Vite·Chromium·전체 type-check·install·Prisma 생성은 실행하지 않았다.

최종 결과: **121파일 / 5,452시험 — 5,421 통과 · 28 실패 · 3 보류**. ArithmeticGroupedOutput 7개, PrintCheck 10개, 새 실측 전 시험 2개를 포함해 H2 회귀는 모두 통과했다. 전체 초록을 주장하지 않는다.

| 전체 검사의 실패 | 수 | 분류 |
|---|---:|---|
| JeongtongHeader · mathgenTemplates · arithmeticV2Geometry | 5 | 위의 main 전용 체크아웃에서 같은 실패를 실제 재현 |
| branchLibrary API | 18 | 작업트리의 생성 Prisma 런타임에 `Prisma.sql`이 없어 실패. main의 node_modules에는 함수가 있음 |
| workspaceArithmeticV2 API | 5 | 400 응답 때 오류 기록이 한 번 호출되는데 시험은 호출 없음으로 기대 |

추가 API 실패의 시험·API·lib·contract·mock·Vitest 설정·Prisma schema·package 소스는 `git diff origin/main HEAD -- ...`로 **차이 0**을 확인했다. H2 변경이 서버/API 경로를 바꾼 것으로 보고하지 않는다. 다만 API 23개를 별도 main 실행으로 재확인한 것은 아니다. 다른 무거운 단계로 메모리가 0.3GiB까지 낮아져 추가 실행을 시작하지 않았다. `Prisma.sql`의 local=undefined / main=function은 같은 Node에서 읽기 전용으로 확인했다. install·Prisma 생성·API 제품 코드는 수정하지 않았다.

보류 3개는 `textbookRecoveryAnswerCheckHeading.integration.test.ts`의 기존 skipped 시험이다. 임의 제외나 새 skip을 추가하지 않았다.

근거: [전체 선택 파일 목록](h2-regression-20261020/selected-files.json), [수정 전·main 비교·집중·전체 결과](h2-regression-20261020/results.json). 원문 Vitest JSON은 `.qa-artifacts/h2-regression-20261020/{before,main-before,fixed-focused,full}.json`에 남겼다. 재현 스크립트는 요청 검색식의 전체 파일을 다시 수집하며 추가 비교 2파일을 합친다.
