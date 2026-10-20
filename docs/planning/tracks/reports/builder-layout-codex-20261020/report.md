# 시험지 만들기 창 틀 수정 · 2026-10-20

## 커밋

- `46624449b` — 문항 검토의 이전·다음 단추를 왼쪽에만 유지. 지시서 사본 포함.
- `5e27ccf9b` — 출력 설정 창과 미리보기 열의 높이 맞춤.
- 이 보고서와 Chromium 캡처·실측 JSON은 별도 검증 기록 커밋. 푸시하지 않음.

## 바꾼 파일

- `src/components/exam-builder/ExamBuilder.tsx`, `ExamBuilder.module.css`: 오른쪽 `reviewFooterNav`와 CSS 삭제. 왼쪽 동작·막힘 판정·설명 연결 유지.
- `src/components/exam-builder/ExamBuilder.h2.test.tsx`: 단추가 각 하나임을 검사하고 단일 단추 조회로 변경.
- `src/components/exam-builder/useBuilderScrollFrame.ts`: 출력 틀도 실측. 상위 요소의 하단 여백을 확보하고 resize에 반응.
- `src/components/exam-builder/MathExamBuilder.tsx`: 시험지 만들기에서만 높이 맞춤 옵션 사용.
- `src/components/unified/WorksheetEditor.tsx`, `WorksheetEditor.module.css`: 선택적 `builderScrollFrame`, 같은 높이의 두 열, 각 열 안에서만 스크롤. 설정/순서 목록의 중첩 세로 스크롤 제거. 화면 CSS만 변경.
- `src/__tests__/components/WorksheetEditor.orderPanel.test.tsx`: 전용 틀 구조와 기본 공유 편집기 제외를 검사.
- `scripts/qa/measure-builder-layout.mjs`: 재현 가능한 Chromium 실측.
- `docs/planning/tracks/brief-builder-layout-codex.md`: 받은 지시서 원문 사본.
- 이 폴더의 캡처·`results.json`·보고서.

## 실제 Chromium 실측

Windows Edge의 Chromium을 사용했다. 실제 `MathExamBuilder`·`WorksheetEditor`·`WorksheetPrint`를 Vite로 묶고 예시 문항 40개와 셸 크기 모형을 제공했다. 출력 전 확인 응답은 예시 데이터다. 실계정·운영 셸 전체·실DB·실물 인쇄 검증을 주장하지 않는다. 지면·인쇄·미리보기 렌더 소스는 수정하지 않았다.

모든 값은 CSS px. 상단/하단은 viewport 좌표이며 좌우가 동일하다.

| 창 크기 | 2단계 위 / 아래 / 높이 | 3단계 위 / 아래 / 높이 | 3단계 아래끝 차이 | 가로 넘침(2·3단계) | 3단계 페이지 세로 넘침 |
| --- | --- | --- | --- | --- | --- |
| 1280×720 | 316 / 708 / 392 | 168 / 684 / 516 | 0 | 0 / 0 | 0 |
| 1366×768 | 316 / 756 / 440 | 168 / 732 / 564 | 0 | 0 / 0 | 0 |
| 1920×1080 | 316 / 1068 / 752 | 168 / 1044 / 876 | 0 | 0 / 0 | 0 |

3단계 서식 설정·문제 순서 탭 모두 왼쪽 창 내부에 추가 세로 스크롤 영역이 없음을 검사했다. 창 높이만 40px 줄였을 때 좌우 아래끝도 각각 40px 감소했고 페이지 세로 넘침은 0이었다. 2단계는 기존 틀의 페이지 세로 넘침 8px가 남으며 변경하지 않았다. 왼쪽을 끝까지 스크롤했을 때 이전·다음 단추가 창 안에 보이고 오른쪽에는 중복 단추가 없음을 검사했다. 단추를 항상 고정하는 변경은 하지 않았다.

| 창 크기 | 2단계 | 2단계 왼쪽 단추 | 3단계 서식 설정 | 3단계 문제 순서 |
| --- | --- | --- | --- | --- |
| 1280×720 | [캡처](1280x720-review.png) | [캡처](1280x720-review-actions.png) | [캡처](1280x720-output.png) | [캡처](1280x720-output-order.png) |
| 1366×768 | [캡처](1366x768-review.png) | [캡처](1366x768-review-actions.png) | [캡처](1366x768-output.png) | [캡처](1366x768-output-order.png) |
| 1920×1080 | [캡처](1920x1080-review.png) | [캡처](1920x1080-review-actions.png) | [캡처](1920x1080-output.png) | [캡처](1920x1080-output-order.png) |

원시 수치: [results.json](results.json). 브라우저 pageerror 0.

## 검증

- H2 RTL: 16개 통과. 단일 이전·다음, 기존 출력 막힘·설명·이동 동작 포함.
- WorksheetEditor 순서 패널·진행 상태: 2파일 21개 통과. 기본 공유 편집기에는 전용 틀이 붙지 않음.
- 수정 TS/TSX ESLint 통과.
- `npm run lint:affordance` 통과.
- `git diff --check` 통과.
- 전체 `npm run type-check`는 마지막에 한 번 실행했고 실패(exit 1). Prisma 생성 타입의 `ProblemWhereInput`·`PrismaClientKnownRequestError` 등 누락과 `.builder-speed-baseline`·서버/스크립트를 포함한 다수 오류가 출력됐다. 전체 타입 검사 통과를 주장하지 않는다. 지시서가 금지한 `prisma generate`로 환경을 바꾸지 않았다.
- 같은 실행의 `tsconfig.tsbuildinfo`에서 진단이 있는 파일은 483개이며, 이번에 바꾼 TS/TSX 파일에 기록된 진단은 0개였다. [진단 요약](type-check-summary.json). 재실행하지 않고 저장된 진단을 읽었다.

패키지 설치·Prisma 생성·푸시를 하지 않았다. 설치된 Next 패키지에 `node_modules/next/dist/docs/`가 없어 요청된 로컬 가이드는 읽을 수 없었다. Next API·라우팅 변경은 없다.
