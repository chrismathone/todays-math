# 성적표 틀린 문항 표 합의 구현

2026-10-18 · codex. `exam-report-wrong-table-consensus.md`와 지시서 4의 금지·안전을 지켰다. 기존 미커밋 작업을 보존했으며 커밋·push·공유 DB 접속·환경 파일 생성/복사·Prisma 생성·스키마/마이그레이션 변경·외부 호출·유료 모델 사용은 하지 않았다.

## 반영한 동작

- H1은 틀린 문항이 10개를 넘으면 번호·단원·유형을 두 벌 둔다. 읽는 순서를 «왼쪽 → 오른쪽, 위 → 아래»로 표시하고 원본 배열 순서대로 배치한다. 번호를 재정렬하지 않는다.
- 첫 쪽의 머리·점수 요약·재시험·원장님 문장·기록 안내·쪽수를 먼저 확보한다. 표 행의 남은 부분만 «틀린 문항 (이어서)» 쪽으로 옮긴다. 이어지는 쪽에도 학생·시험 정보와 표 머리, 전체 쪽수가 있다. M1 풀이 쪽은 그 뒤에 둔다.
- 최초 HTML은 추정치로 나눈다. 화면은 자체 글꼴 적재 뒤 축소 배율을 제거한 실제 행 높이와 이어지는 쪽 머리의 줄바꿈을 측정해 React로 다시 그린다. 서버 `buildPdf`도 같은 측정·행 분할을 적용하고 모든 쪽을 검사한 다음 PDF를 만든다. 제출 HTML의 JavaScript는 계속 비활성 상태다.
- 긴 단원·유형을 줄바꿈하며, 두 단의 같은 행 중 높은 쪽을 기준으로 행 전체를 옮긴다. 글자를 줄이거나 내용을 자르지 않는다. 한 행 또는 문장 자체가 한 쪽을 넘는 경우는 기존 넘침 검사로 막는다. 정상적으로 다음 쪽에 실린 표를 넘침으로 거절하지 않는다.
- DB와 같은 `EXAM_REPORT_NOTE_LIMIT = 1000`을 저장 하드 상한으로 둔다. 화면은 현재 배치에서 지면에 남은 세로 공간과 넘침을 안내하고, 글자 수는 저장 상한으로 구분한다. 요약 한 장에도 표의 추가 쪽이 붙을 수 있음을 미리보기 아래와 설정에 안내한다.
- `EXAM_REPORT_WRONG_TABLE_SINGLE_LIMIT = 10`, `EXAM_REPORT_LAYOUT_VERSION = "h1-v2"`. 기존 보관본을 바꾸지 않으며 새 지면 버전은 기존 snapshot 지문 판정을 따른다. 시안의 상한 fixture와 API 거절 시험도 1000자에 맞췄다.

기본 단원·유형과 짧은 문장 fixture의 초기 HTML을 아래처럼 잠갔다. 실제 글꼴/긴 문장/긴 표제에 따른 재배치가 추가 쪽을 만들 수 있으며 이 표를 실측 결과로 주장하지 않는다.

| 틀린 수 | S1 쪽 수 | M1 쪽 수 | 표 단 수 |
| --- | --- | --- | --- |
| 0 | 1 | 1 | 표 없음 |
| 10 | 1 | 6 | 1 |
| 11 | 1 | 7 | 2 |
| 16 | 1 | 9 | 2 |
| 20 | 1 | 11 | 2 |
| 40 | 2 | 22 | 2 |

## 시험 결과

- TDD: 새 표/저장 상한/화면 안내 시험의 실패를 확인한 뒤 구현했다. 최종 관련 **21파일·146건 통과**. PGlite는 로컬 시험 엔진이며 공유 DB에 연결하지 않았다.
- 순서·내용 보존은 40개의 실제 번호/ID, 역순 문항, 긴 단원/유형으로 확인했다. 첫 쪽의 표 전체를 넘기는 경우, 재배치를 두 번 해도 중복하지 않는 경우, 잘못된 행 수를 거절하는 경우와 이어지는 머리/쪽수도 확인했다.
- DOM 치수 시험은 주어진 치수의 더블로 배율 보정과 문장 높이 우선 차감을 확인한다. 실제 Chromium 글꼴 실측과 구분한다.
- 변경 TS/TSX/MJS ESLint: 오류·경고 0. `npm run lint:affordance`, `git diff --check` 통과.
- `npm run type-check`: 실패. 이번에 바꾸지 않은 `src/__tests__/fixtures/textbookTestProblem.ts:21`, `src/__tests__/unit/schoolTextbookRecovery.test.ts:12`에서 `questionGroupKey`가 빠져 있다는 오류 두 건이다. 해당 fixture나 Prisma 클라이언트는 수정하지 않았다. 이번 변경 파일의 타입 오류는 보고되지 않았다.
- `node scripts/qa/exam-report-screen-impl.mjs`: 400모듈의 로컬 HTML 생성 성공.
- `--measure`: Chromium 시작 실패(`Failed to launch the browser process: Code: null`, stderr 비어 있음). 실제 화면·PDF·프린터 실측은 미완료다.

관련 시험 명령:

```sh
npx vitest run --configLoader runner --no-cache \
  src/__tests__/unit/examReport*.test.* \
  src/__tests__/unit/pdfExport.test.ts \
  src/__tests__/unit/devPageGuardCoverage.test.ts \
  src/__tests__/unit/errorLogRouteCoverage.test.ts \
  src/__tests__/components/ExamReportWorkspace.test.tsx \
  src/__tests__/components/ExamReportEntrypoints.test.tsx \
  src/__tests__/api/examReportWorkspace.test.ts \
  src/__tests__/api/eywaExamReports.test.ts
```

## 리드가 다시 잴 것

```sh
node scripts/qa/exam-report-screen-impl.mjs --measure
```

틀린 수 목록은 `[0, 4, 8, 12, 16, 20, 40]`이다. 40개일 때 실제 질문도 40개로 늘려 음수 점수/문항 수가 생기지 않는다. 기본/긴 이름 상황 중 긴 상황에는 긴 단원·유형도 넣었다. S1/M1 × 7수량 × 2상황 × 3문장(한글/넓은 영문/줄바꿈), 총 84조합의 모든 쪽을 검사한다.

`.qa-artifacts/exam-report-screen-impl/measurements.json`에 `storageLimit`, `allBaselinesFit`, 각 조합의 문장 없는 지면·1000자 지면·최대 길이, 쪽수·표별 행 수·단 수를 남긴다. 문장 없는 기본 지면이 넘치면 실패한다. 1000자가 모든 조합의 지면에 들어간다고 요구하거나 조합별 최대 길이의 최솟값을 공통 글자 상한으로 적용하지 않는다. 1040×760의 나란히 배치/확정 단추 위치와 실제 PDF도 검수해야 한다. 이번 환경에서는 `index.html`만 갱신했으며 실측 JSON을 새로 만들지 못했다.

## 이번에 바꾼 파일 21개

기존 지시서 4 작업 전체가 아니라 이번 합의 후속에서 직접 바꾼 파일만 적었다.

- `src/components/exam-report/ExamReportPaper.tsx`
- `src/components/exam-report/paperStyles.ts`
- `src/components/exam-report/ExamReportWorkspace.tsx`
- `src/components/exam-report/usePaperOverflow.ts`
- `src/lib/examReport/wrongTable.ts` (새 파일)
- `src/lib/examReport/wrongTableDom.ts` (새 파일)
- `src/lib/examReport/settings.ts`
- `src/lib/examReport/paperHtml.ts`
- `src/lib/export/pdfServer.ts`
- `scripts/qa/exam-report-screen-impl-fixture.tsx`
- `scripts/qa/exam-report-screen-impl.mjs`
- `src/app/dev/exam-report-screen-hifi/fixtures.ts`
- `src/app/dev/exam-report-screen-hifi/ExamReportScreenHifi.tsx`
- `src/__tests__/helpers/examReportWrongTableFixture.ts` (새 파일)
- `src/__tests__/unit/examReportWrongTable.test.tsx` (새 파일)
- `src/__tests__/unit/examReportPaperHtml.test.ts`
- `src/__tests__/unit/examReportWorkspaceContract.test.ts`
- `src/__tests__/components/ExamReportWorkspace.test.tsx`
- `src/__tests__/api/examReportWorkspace.test.ts`
- `docs/planning/monthly-exam-plan-20261017.md`
- `docs/planning/tracks/reports/exam-report-wrong-table-impl-codex-20261018.md` (이 보고)
