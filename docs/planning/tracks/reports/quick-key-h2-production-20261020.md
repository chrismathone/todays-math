# H2 빠른 채점표 제품 구현 — 2026-10-20

## 범위와 커밋

원장님 선택 H2를 수학 정답·해설지와 정답만 지면에 연결했다. `origin/main` 선병합 `5b7a026c3`, 지시서 보존 `ac57ef533`, 내보내기 정적 조사 `9aa0e9709`, 순수 배치 함수와 선행 시험 `78953ee6a`, 제품 연결·회귀 시험 `9107c53ab`. 후속 검증 커밋은 이 보고서의 Git 이력에서 확인한다. push하지 않았다.

제품 변경: `AnswerPage.tsx`, `AnswerPage.module.css`, `answerKeyLayout.ts`, `useMeasuredAnswerPages.tsx`, `WorksheetPrint.tsx`. 영어의 기존 정답·근거 조판은 `EnglishAnswerPage.tsx`로 옮겨 그대로 연결했다. 다른 작업자 소유인 settings·pack·BodyContainer·PrintOptionsPanel은 수정하지 않았다.

시험 변경: `answerKeyLayout.test.ts`, `AnswerPage.quickKey.test.tsx`, `ArithmeticRoundForm.test.tsx`, `WorksheetPrint.preview.test.tsx`, `perProblemFractionView.test.tsx`. 검증 도구는 `scripts/qa/print-templates/h2-production.tsx`, `h2.html`, `measure-h2-production.mjs`, `audit-h2-color.mjs`, `count-color-pixels.py`이며 은행·학생·DB API를 사용하지 않는다.

## 동작

- 표는 본문 전체 폭의 5열이다. 번호를 답과 분리하며 답은 기존 `fractionViewFor → MathText`를 그대로 사용한다. 해설은 `SolutionText`다.
- 같은 답 DOM을 1·2·3·5칸 후보 폭에서 조판한 높이·넘침으로 판단한다. 짧은 답은 1칸, 긴 답은 최소 2칸부터 두 줄에 맞는 첫 폭을 선택한다. 행의 남은 칸이 부족하면 다음 행에서 이어간다. 한 행보다 긴 일반 문장은 5칸에서 전문을 싣고, 전체 폭보다 넓은 줄바꿈 불가 수식은 출력 오류를 명시한다.
- 행 전체를 다음 쪽으로 넘긴다. 이어지는 쪽에도 제목·표 머리를 반복한다. 모든 답 뒤에 해설을 기존의 문항별 실측·단 순서로 채운다. 표 아래 남은 공간에 긴 해설을 축소해 끼우지 않는다. 전체 한 쪽보다 긴 해설만 기존처럼 축소한다.
- 정답만은 해설 없이 표 하나가 여러 쪽으로 이어진다. 미리보기·인쇄·PDF 수집이 같은 export DOM을 사용한다.

## Chromium 실측

자체 작성한 25답을 반복한 25·50·100문항. 가분수·변수식·가로/세로 답·열 소문항 답을 포함한다. 일반 여백, 시스템 지면 글꼴, 1·2단의 12조합이다. 아래는 **답지 쪽수**로 문제지 쪽은 포함하지 않는다.

| 문항 | 해설 포함 1단 | 해설 포함 2단 | 정답만 1단 | 정답만 2단 |
|---|---:|---:|---:|---:|
| 25 | 3 | 2 | 1 | 1 |
| 50 | 6 | 4 | 1 | 1 |
| 100 | 11 | 7 | 2 | 2 |

12조합 모두 답 번호 누락·중복·역순 0, 칸 가로 넘침 0, 답/해설의 본문 영역 이탈 0. 해설 포함 판의 해설도 번호순으로 전체 문항과 일치하며 정답만 판에는 해설 0개다. 전체 폭을 단 수에 따라 좁히지 않는다. 원자료와 제품 파일 지문은 [measurements.json](../../../design/mockups/answer-quick-key-h2-production-20261020/measurements.json).

캡처: [정답·해설 첫 쪽](../../../design/mockups/answer-quick-key-h2-production-20261020/25-2col-solutions-first.png), [정답만 첫 쪽](../../../design/mockups/answer-quick-key-h2-production-20261020/25-2col-key-first.png), [100문항 정답만 마지막 쪽](../../../design/mockups/answer-quick-key-h2-production-20261020/100-2col-key-last.png), [100문항 해설 마지막 쪽](../../../design/mockups/answer-quick-key-h2-production-20261020/100-2col-solutions-last.png). 브라우저 검증이며 실물 프린터 또는 서버 PDF의 글꼴 환경 검증은 아니다.

## 색 원인

Hi-fi 10·19·25번 답의 모든 텍스트 잎은 계산된 색이 `rgb(14, 14, 16)`이었다. CDP에서 실제 숫자 잎은 KaTeX_Main, 목록의 일반 번호 잎은 Batang을 확인했다. 동일 HTML을 기본 Chromium과 `--disable-lcd-text` Chromium에서 차례로 캡처했다. 번호/왼쪽 구분선을 제외한 답 영역에서 RGB 최대-최소 차가 15보다 큰 픽셀 수가 각각 **80→0, 184→0, 864→0**으로 바뀌었다. 주황·파랑은 이 Windows Chromium의 LCD 글자 가장자리 래스터화에서 생기는 색이다. CSS 덧칠이나 색 수식이 아니다. 제품 답 글자는 기존 검정을 유지했다. 제품 12조합의 모든 답 잎도 같은 검정이다.

[계산된 색·실제 글꼴](../../../design/mockups/answer-quick-key-h2-production-20261020/color-audit.json), [픽셀 수](../../../design/mockups/answer-quick-key-h2-production-20261020/color-pixels.json), 비교 예: [기본 19번](../../../design/mockups/answer-quick-key-h2-production-20261020/color-default-19.png) / [LCD 끔](../../../design/mockups/answer-quick-key-h2-production-20261020/color-no-lcd-19.png). 캡처 환경의 원인 검증이며 모든 OS·뷰어의 색 인상을 일반화하지 않는다.

## 시험·검수

순수 함수 시험을 먼저 작성해 missing module 실패를 확인한 뒤 구현했다. 이후 표 아래 남은 공간의 두 번째 단에서 긴 해설이 축소되는 경계 사례도 시험 실패를 재현하고 문항 전체를 다음 쪽으로 보내도록 수정했다. RTL은 정답만/해설 포함, 같은 분수 조판, 기존 영어·200문항 회차 구분·미리보기·분수 표시 출구를 점검한다. 관련 7파일 **68시험 통과**([결과](../../../design/mockups/answer-quick-key-h2-production-20261020/tests.json)). 기존 분수 표시 시험의 BankView 표본에는 main이 요구하는 question 단위 초기 데이터 표지 3개를 보완했다.

`/dev/print-check` 항목: **빠른 채점표 H2 · 정답·해설 / 정답만**, id `answer-quick-key-h2`, 상태 **대기**. 실물에서 25·50·100문항의 번호·긴 답·표 머리·행 경계·글자색과 두 출력 모드를 검수한다. 실물 통과를 완료로 기록하지 않았다.

## 내보내기 조사

HWPX도 같은 export DOM의 모든 쪽에서 답을 수집한다. 수식·텍스트를 native 한글 요소로 다시 조판하므로 H2 병합칸·행 경계가 브라우저와 같다는 실행 보장은 없다. 이번에는 해당 코드를 수정하거나 한글 앱에서 검증하지 않았다. PDF 다운로드는 같은 DOM/CSS를 서버로 보낸다. 직접 HWP·DOCX 분기는 이 출력 화면에서 발견하지 못했다. 상세 근거는 [정적 조사](quick-key-h2-export-color-audit-20261020.md).

전체 `npm run type-check`는 다른 tsc가 없고 5.25GiB 이상인 상태에서 **1회 실행**, exit 2였다. 487파일 2,946진단: `Prisma.ProblemWhereInput`·`PrismaClientKnownRequestError` 등 생성 타입 누락과 이로 인한 광범위한 진단, `.builder-speed-baseline`도 검사 대상이었다. H2 제품·시험 파일에는 진단 0. 측정 harness의 기존/신규 `Window` 강제 형변환 2진단은 `Object.assign`으로 수정했다. 전체 검사 재실행·Prisma 생성·install은 지시대로 하지 않았다. 따라서 **전체 타입 검사 통과를 주장하지 않는다.** [원문 로그](../../../design/mockups/answer-quick-key-h2-production-20261020/type-check.txt), [집계](../../../design/mockups/answer-quick-key-h2-production-20261020/type-check-summary.json).

2단계 템플릿 A Hi-fi는 이 구현 검사 뒤 별도 보고한다.

## 재현

무거운 단계는 순차 실행하며 Vite·Chromium·vitest 시작 전 3GiB 이상을 확인한다. 이미 실행 중인 전체 타입 검사가 있으면 이 트랙의 전체 타입 검사를 시작하지 않는다.

```text
node scripts/qa/print-templates/measure-h2-production.mjs
node scripts/qa/print-templates/audit-h2-color.mjs
python scripts/qa/print-templates/count-color-pixels.py
```

첫 명령은 작은 Vite 측정 harness에서 실제 WorksheetPrint를 구동하고 12조합을 차례로 잰 뒤 Vite·Chromium을 `finally`에서 종료한다. 두 번째는 저장 Hi-fi의 기본/LCD 끔 브라우저를 한 번에 하나씩 구동·종료한다. 전체 Next build나 install·prisma generate를 실행하지 않는다.
