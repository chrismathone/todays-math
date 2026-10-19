# 성적표 지면 스타일 후보 — Codex 작업 기록

2026-10-18 · 워크트리 `/Users/pss/Desktop/creative/today-report-styles` · 커밋 없음.

## 구현

`/dev/exam-report-styles`에서 H1과 편지형·증서형·신문형·정오 격자형·큰 숫자형·장부형을 공용 `PaperStrip`으로 비교한다. 첫 쪽 일곱 장이 먼저 나란히 나오고, 후보별 이어지는 쪽도 모두 남긴다. 모든 후보에 차이 한 줄·약점 한 줄을 붙였으며 추천 표시는 없다. 페이지는 `devPageVisible({ directorOnly: true })`로 가린다.

구성 예는 요약 한 장·풀이 포함·숫자만이다. 구성·상황·출력 선택을 바꾸면 일곱 후보에 같이 적용한다. 예시 상황은 보통·틀린 10개·틀린 16개·0점(틀린 20개)·만점·문장 없음·긴 문장·결시·미채점·배점 없음·85점 만점·이력 한 회·이력 중 결시, 총 13가지다. 기존 Hi-fi의 지어낸 픽스처를 확장했다. 학생·문항·이력·연락처 모두 예시다.

블록 12종의 선택·순서·쪽 나누기는 `src/lib/examReport/blocks.ts`의 `planReportBlocks`가 맡는다. 스타일은 높이만 제공한다. 블록을 통째로 옮기고, 표만 행 단위로 이어진다. `wrongSolutions`는 **문제·정답·해설 전체를 한 행에 담는 풀이 표**다. 이어지는 쪽에는 표제를 반복하며 한 문항의 본문과 해설을 서로 다른 쪽으로 나누지 않는다. 한 블록 또는 한 행 자체가 한 쪽보다 크면 내용을 자르지 않고 사유를 담아 실패한다.

단원별 정답률 그래프·석차·백분위·종합 점수는 없다. `reviewUnits`는 오답이 있는 단원을 덜 맞힌 비율 순서로 최대 세 개 고르되 이름만 표시한다. 동률은 출제 순서다. 블록을 고르고 순서를 바꾸는 실제 «성적표 틀» 편집 화면은 만들지 않았다.

`scoreTo100(value, maximum)`을 새 후보와 기존 H1이 함께 쓴다. 정수로 반올림한 `N점 / 100점 만점`과, 무배점·100점 외 만점일 때의 원래 값을 함께 보인다. 결시·미채점은 점수로 바꾸지 않는다. 기존 H1 C2의 점수 열도 100점 기준을 명시한다.

뷰모델 계약에 선택 `history?: { date, title, score100 | null }[]`만 추가했다. 실제 이력을 읽거나 쓰는 경로는 추가하지 않았다. 추이는 날짜순 최근 여섯 회, 두 회 이상일 때만 렌더한다. 세로축은 0~100점으로 고정하고 점마다 숫자를 적는다. `null`은 결시로 표시하고 앞뒤 선을 끊는다. 추이 출력 선택은 기본 켬이다. 기존 H1도 이 선택 이력을 받을 수 있다.

## 리드가 사용할 서버 HTML

위치: `src/app/dev/exam-report-styles/renderStyleCandidate.ts`.

```ts
const payload = await renderStyleCandidate("newspaper", report, {
  blocks: REPORT_BLOCK_PRESETS.solutions,
  header: { name: "오늘의수학", line: "월말평가 성적표" },
  footer: "학원에서 지정한 연락처",
  trend: true,
  average: null,
});
```

ID는 `H1`, `letter`, `certificate`, `newspaper`, `grid`, `numbers`, `ledger`다. `blocks`는 같은 타입의 순서 있는 목록이며 헤더·연락처는 입력 그대로 쓴다. 선택 해제·빈 문장·재시험 없음·이력 한 회 등은 공통 함수에서 생략한다. 같은 입력이면 같은 HTML이다.

반환값은 기존 `PdfPayloadSchema`의 HTML·CSS·제목·`fontPolicy: "self-hosted"`다. 지면마다 `[data-unified-paper]`와 `[data-print-page]`가 있고 바깥은 `[data-mathgen-document]`다. 지면 띠·버튼·effect·DOM 측정은 포함하지 않는다. 기존 `pdfDocument(payload, origin)` 또는 리드의 Chromium 도구에 넘길 수 있다. 이 함수 자체는 DB·Chromium·외부 API를 부르지 않는다.

한글 글꼴은 자체 `/fonts/NotoSerifKR-subset.woff2`, `/fonts/PretendardVariable.woff2`만 쓴다. KaTeX CSS·woff2는 기존 H1 자산 함수를 재사용한다. 원본 크기는 A4 세로, 본문·보조 글자의 하한은 9pt다. 틀린 칸은 굵은 ✕·번호 밑줄·테두리로 구분하며 색 바탕에 의존하지 않는다.

```sh
# 서버 HTML만 생성. 포트·브라우저 없이 실행 가능.
node scripts/qa/exam-report-styles.mjs --html-only

# Chromium을 실행할 수 있는 환경에서 지면·글꼴·화면 폭 검사와 PNG 캡처.
# 이 명령도 PDF는 만들지 않는다.
node scripts/qa/exam-report-styles.mjs
```

생성 위치는 git에서 제외된 `.qa-artifacts/exam-report-styles/`다. HTML 전용 실행은 총 273조건을 생성하고 보통 상황의 후보별 구성 세 가지(21벌)를 `.html`과 `.payload.json`으로 남긴다. 이 실행의 예시 반 평균은 켬이다. `html-generation.json`의 쪽 수는 **순수 함수가 나눈 쪽 수**이며 실측 결과가 아니다. HTML의 `/fonts/`를 제공할 origin이 필요하다.

## 검증 결과와 경계

- `npx vitest run --configLoader runner src/__tests__/unit/examReport*.test.* src/__tests__/unit/devPageGuardCoverage.test.ts src/__tests__/api/examReportWorkspace.test.ts` — **20파일·437개 통과**.
- 후보 7 × 구성 3 × 상황 13 = **273조건**의 내용·정수 환산·원점수·정오·오답 순서·풀이 보존·쪽 경계·서버 결정성을 검사했다. 모든 후보의 표를 실제로 두 쪽에 걸쳐 렌더하는 시험도 포함한다.
- `npm run type-check` — 통과.
- 변경 TS·TSX·MJS 파일 `npx eslint` — 통과.
- `npm run lint:affordance` — 통과.
- `node scripts/qa/exam-report-styles.mjs --html-only` — **273조건 생성 성공**.
- `git diff --check` — 통과.

공유 `node_modules` 아래에 Vite 임시 설정을 쓰는 기본 실행은 샌드박스에서 EPERM이었다. `--configLoader runner`로 공유 모듈을 수정하지 않고 시험했다.

**브라우저 실측은 미완료다.** 로컬 서버는 `listen EPERM 127.0.0.1`, 직접 Chromium은 `MachPortRendezvousServer Permission denied`로 샌드박스에 막혔다. Orca 브라우저 연결도 `runtime_access_denied (EPERM)`였다. 따라서 글꼴 적재 뒤의 실제 넘침·9pt 가독성·모바일 폭·확대 창을 Chromium에서 확인했다고 주장하지 않는다. 쪽 높이는 DOM 없는 추정이며, CSS와 원문이 같은 서버 HTML까지만 검증했다. `/dev/print-check`의 새 `exam-report-styles` 항목은 **대기**다. 실제 PDF·배경 인쇄 꺼짐·프린터 출력은 리드와 원장님 검수가 남는다.

## 변경 파일

개발 시안 일곱 파일:

- `src/app/dev/exam-report-styles/page.tsx`
- `src/app/dev/exam-report-styles/ExamReportStyles.tsx`
- `src/app/dev/exam-report-styles/ExamReportStyles.module.css`
- `src/app/dev/exam-report-styles/candidates.tsx`
- `src/app/dev/exam-report-styles/paperStyles.ts`
- `src/app/dev/exam-report-styles/fixtures.ts`
- `src/app/dev/exam-report-styles/renderStyleCandidate.ts`

공통 블록·환산·추이와 기존 H1:

- `src/lib/examReport/blocks.ts`
- `src/lib/examReport/score100.ts`
- `src/lib/examReport/trend.ts`
- `src/lib/examReport/wrongTable.ts`
- `src/lib/examReport/paperHtml.ts`
- `src/contracts/examReport.contract.ts`
- `src/components/exam-report/ExamReportPaper.tsx`
- `src/components/exam-report/ExamReportTrend.tsx`
- `src/components/exam-report/paperStyles.ts`

시험·검수 기록:

- `src/__tests__/unit/examReportBlocks.test.ts`
- `src/__tests__/unit/examReportStyles.test.tsx`
- `src/__tests__/unit/examReportStylesHtml.test.ts`
- `src/__tests__/unit/examReportStylesPreview.test.tsx`
- `src/__tests__/unit/examReportPaper.test.tsx`
- `scripts/qa/exam-report-styles.mjs`
- `src/app/dev/print-check/items.ts`
- `docs/planning/tracks/reports/exam-report-styles-codex-20261018.md`
