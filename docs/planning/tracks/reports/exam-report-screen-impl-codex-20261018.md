# 성적표 실제 화면 · 확정 쓰기 구현 보고

2026-10-18 · phase/11-exam-report-eywa · HEAD f67fb786b. 커밋하지 않았다. 리드가 검수할 미커밋 변경으로 남겼다. 시작 때 미추적이던 지시서는 수정하지 않았다.

실제 화면과 API를 연결했다. Chromium 실측·실계정/저장소 왕복·실물 출력은 미검증이며, 아래 리드 실행 항목으로 남긴다. 계획서 §14.5에도 같은 범위를 적었다.

## 구현

- `/exam-reports/{testId}`: 기존 UnifiedWorkspace 안의 원장·출력 메뉴 화면. A 목록·H3 문장 옆 미리보기·H1 배지와 위쪽 인쇄, PaperStrip 확대, 긴 명단/설정의 PickerDialog를 사용한다.
- 낸 시험의 반별 링크는 명단이 있고 remaining=0인 반만 표시한다. GradeSheet는 발행본 시험을 저장한 뒤 점수 목록 아래 ‘성적표로’를 표시한다.
- 기존 성적 계산·발행 문항·스냅샷 자산 읽기를 재사용한다. 자산 로더에 선택적인 거래 클라이언트를 전달하여 최종 재조회도 같은 거래에서 수행한다. 명단은 채점표와 같은 생성 순서다.
- 문장 없음·문장 씀·확정·다시 확정과 결시/미채점을 구분한다. 재채점과 반 평균 근거 변경도 현재 snapshot 지문으로 감지한다. 수정 중인 문장은 학생 전환·저장 실패·409 재조회 뒤에도 남는다.
- 확정은 현재 문장 저장을 포함한다. 최신 판/채점 읽기 → 자체 글꼴 HTML → buildPdf → 비공개 업로드 → 짧은 거래의 최신 판·채점·지문 재검사 → 보관본 삽입과 확정 순서다. 업로드 뒤 거래가 실패하면 unconfirmedPdfPath를 오류 기록에 남기며 파일을 삭제하지 않는다.
- 최종 거래는 반 권한을 재검사하고 test·채점·응답·시험 문항·편집 줄을 잠근다. 잠금을 기다리는 사이 끝난 채점을 읽도록 ReadCommitted를 쓴다. 재채점 후 같은 편집 판을 다시 확정하면 새 판을 부여하여 기존 보관본을 덮지 않는다.
- 비공개 저장소는 영어 모듈 import 없이 필요한 전송만 복사해 줄였다. Supabase 주소·서버 키·private 버킷·UUID 경로·PDF 표지·4,000,000바이트 상한·실제 원격 SHA를 검사하며 덮어쓰기/삭제 기능은 없다.
- 반 인쇄는 기존 의존성 pdf-lib로 합친다. 확정 학생은 보관 PDF를 쓰고, 전원 범위의 미확정 학생은 현재 저장 내용으로 그린다. 반환 직전 내용 지문을 다시 비교한다. C2는 가로 A4다.
- 빈 문장은 H1 문장 칸을 빼며 줄바꿈은 지면에도 반영한다. PDF는 글꼴/그림 로드 후 쪽 넘침·겹침을 검사하고 넘치면 422로 중단한다. 새 API 번들에 KaTeX CSS/글꼴 tracing을 추가했다.
- 에이와 소스는 EXAM_REPORT_EYWA_FEED가 정확히 on일 때만 DB/버킷을 읽는다. 미설정/그 밖의 값은 not-installed와 PDF 404다. 이번 첫 연동 대상은 이름 ‘학원이’로 제한했다. 기존 결시·미연결·isTest 제외도 유지한다. 운영 변수는 활성화하지 않았다.
- 전수 영어 울타리가 기존 시안의 AutoGrowTextarea import를 잡았다. 부품을 공용 ui 경로로 옮기고 기존 영어 경로는 재수출로 유지했다. 실제 화면과 시안 모두 같은 공용 부품/임시 문장 상수를 쓴다.

## API

모든 메서드는 withErrorLog, 원장·출력 메뉴, 발행본/시험 소유·지점, 반의 test:write 검사를 거친다. 성공 응답과 PDF는 no-store다.

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| GET | /api/exam-reports/{testId} | 반 목록·집계·옵션 지문 |
| GET / PUT | /api/exam-reports/{testId}/students/{studentId} | 학생 읽기 / 문장 저장 |
| PATCH | /api/exam-reports/{testId}/settings | 반 모든 편집 줄의 동일 지면 설정 |
| POST | /api/exam-reports/{testId}/students/{studentId}/confirm | 문장 저장을 포함한 확정 |
| GET | /api/exam-reports/{testId}/students/{studentId}/pdf | 현재 내용과 일치하는 확정 보관 PDF |
| POST | /api/exam-reports/{testId}/print | scope=confirmed(기본)/all, kind=students(기본)/class |

문장/확정은 expectedRevision, 반 설정은 expectedOptionsDigest를 요구한다. 학생용 전원 인쇄도 결시·미채점은 제외한다. 재시험의 원기록 연결은 만들지 않아 기존처럼 빈 배열이다.

## 검증

| 검사 | 최종 결과 |
| --- | --- |
| 관련 Vitest | 35파일·355건 통과 |
| npm run type-check | 통과 |
| 변경 TS/TSX/MJS 파일 ESLint | 오류·경고 0 |
| npm run lint:affordance | 통과 |
| git diff --check | 통과 |
| 실제 부품 로컬 HTML 묶음 | 398모듈·성공 |
| Chromium 실측 | 시작 실패·미검증 |
| 실계정·공유 DB·운영 버킷·실물 프린터 | 실행하지 않음 |

Vitest는 공유 node_modules에 캐시를 쓰지 않도록 --configLoader runner --no-cache로 실행했다. PGlite 마이그레이션 불변식 6건, 새 확정 서버 더블 16건, 저장소·에이와 flag·원장/API 계약·화면·진입 링크, 기존 지면/정적 렌더/PDF·발행/스냅샷 자산·채점·작업실·개발/오류 기록/영어 울타리/학생 프록시·인쇄 목록을 포함한다.

확정 서버 더블은 문장 저장 실패, PDF/업로드 실패, 업로드 뒤 판·결과 ID·내용 지문·권한 변경, 옛 보관본 보존, 반 평균에 의한 재확정, 저장 PDF 재읽기와 합치기를 확인한다. 더블 통과를 실제 DB 동시 실행/Chromium 검증으로 세지 않는다.

실측 시도는 다음 메시지로 Chromium 시작 전에 종료했다: `Failed to launch the browser process: Code: null`(stderr 비어 있음). 권한을 바꾸거나 사용자 브라우저를 조작하지 않았다.

## 리드가 실행할 것

1. 샌드박스 밖에서 아래 실측 명령을 실행한다. Chrome 경로가 다르면 CHROME_PATH를 지정한다. 외부 통신은 CSP와 요청 차단으로 닫힌 로컬 파일이다.

```sh
node scripts/qa/exam-report-screen-impl.mjs --measure
```

생성물: `.qa-artifacts/exam-report-screen-impl/index.html`, `measurements.json`, `screen-1200.png`, `screen-1040.png`, `screen-768.png`, `screen-390.png`. 1040×760에서 sideBySide=true와 confirmBottomFromScreenTop<=760, 가로 넘침과 캡처를 확인한다. 현재 환경에서 생성된 것은 index.html뿐이다.

2. H1 S1/M1 × 오답 0/4/8/12/20 × 기본/긴 이름 × 한글/넓은 영문/줄바꿈 60조합의 첫 쪽을 실측한다. 스크립트는 각 조합에서 0~1000자의 최대 길이를 구한다. safeLimit:null이면 문장 없는 기본 지면부터 넘치는 조합이 있다는 뜻이다. 이 경우 지면 옵션/분할 정책을 먼저 검토한다. 임시 180자를 전 조합에 안전하다고 주장하지 않는다. 실측 결과에 맞춰 `src/lib/examReport/settings.ts`의 한 상수만 고친 뒤 관련 시험을 다시 돌린다. 화면/상한 조건이 실패하면 스크립트도 실패 종료한다.

3. 실계정에서 S1·M1·C2의 실제 buildPdf, private 버킷 업로드/받기, 빈 문장 확정, 문장/설정 수정과 재채점 후 재확정, 확정 학생만/미확정 포함 합친 인쇄를 확인한다. 실제 거래/잠금·PDF 용량/글꼴은 이 작업에서 공유 DB에 접속해 검증하지 않았다. 큰 오답 요약·큰 C2는 기존 한 쪽 구성이고 넘치면 422다. 새 자동 분할은 구현 범위에 넣지 않았다.

4. `/dev/print-check`의 `exam-report-confirmed-print`는 대기다. 문장 상한·M1 쪽 나눔·C2 가로·배경 없는 정오·보관 PDF와 반 인쇄의 동일 쪽을 실물 100% 배율로 검수한다.

5. 에이와 첫 왕복은 ‘학원이’의 기존 연결/대상 조건으로 리드가 확인하고, 서버 변수 활성화도 리드가 한다. 이 작업에서는 첨부·발송이나 통로 활성화를 하지 않았다.

## 변경 파일 전체 57개

시작 때 이미 미추적이던 지시서는 아래에서 제외했다. DB 스키마·마이그레이션·환경 파일 변경은 없다.

- `docs/planning/monthly-exam-plan-20261017.md`
- `docs/planning/tracks/reports/exam-report-screen-impl-codex-20261018.md`
- `next.config.ts`
- `scripts/qa/exam-report-screen-impl-fixture.tsx`
- `scripts/qa/exam-report-screen-impl.mjs`
- `src/__tests__/api/examReportWorkspace.test.ts`
- `src/__tests__/api/eywaExamReports.test.ts`
- `src/__tests__/components/ExamReportEntrypoints.test.tsx`
- `src/__tests__/components/ExamReportWorkspace.test.tsx`
- `src/__tests__/components/GradeSheet.test.tsx`
- `src/__tests__/components/PrintCheck.test.tsx`
- `src/__tests__/components/WorkspaceEntry.test.tsx`
- `src/__tests__/unit/accountRouteAccess.test.ts`
- `src/__tests__/unit/examReportConfirmedSource.test.ts`
- `src/__tests__/unit/examReportServer.test.ts`
- `src/__tests__/unit/examReportStorage.test.ts`
- `src/__tests__/unit/examReportWorkspaceContract.test.ts`
- `src/app/(main)/exam-reports/[testId]/page.tsx`
- `src/app/api/exam-reports/[testId]/print/route.ts`
- `src/app/api/exam-reports/[testId]/route.ts`
- `src/app/api/exam-reports/[testId]/settings/route.ts`
- `src/app/api/exam-reports/[testId]/students/[studentId]/confirm/route.ts`
- `src/app/api/exam-reports/[testId]/students/[studentId]/pdf/route.ts`
- `src/app/api/exam-reports/[testId]/students/[studentId]/route.ts`
- `src/app/api/integrations/eywa/v2/exam-reports/[date]/[publicationId]/[sourceStudentId]/route.ts`
- `src/app/api/integrations/eywa/v2/exam-reports/[date]/route.ts`
- `src/app/dev/exam-report-screen-hifi/ExamReportScreenHifi.tsx`
- `src/app/dev/exam-report-screen-hifi/fixtures.ts`
- `src/app/dev/print-check/items.ts`
- `src/components/english/AutoGrowTextarea.tsx`
- `src/components/exam-report/ExamReportPaper.tsx`
- `src/components/exam-report/ExamReportWorkspace.module.css`
- `src/components/exam-report/ExamReportWorkspace.tsx`
- `src/components/exam-report/client.ts`
- `src/components/exam-report/paperStyles.ts`
- `src/components/exam-report/usePaperOverflow.ts`
- `src/components/test/GradeSheet.tsx`
- `src/components/ui/AutoGrowTextarea.tsx`
- `src/components/unified/ExamPublicationParts.tsx`
- `src/components/unified/PrivateLibrary.tsx`
- `src/components/unified/UnifiedWorkspace.tsx`
- `src/components/unified/WorkspacePage.tsx`
- `src/contracts/examReportWorkspace.contract.ts`
- `src/contracts/eywaExamReport.contract.ts`
- `src/contracts/testresult.contract.ts`
- `src/lib/accountRouteAccess.ts`
- `src/lib/examReport/confirmedSource.ts`
- `src/lib/examReport/http.ts`
- `src/lib/examReport/paperHtml.ts`
- `src/lib/examReport/problems.ts`
- `src/lib/examReport/read.ts`
- `src/lib/examReport/server.ts`
- `src/lib/examReport/settings.ts`
- `src/lib/examReport/storage.ts`
- `src/lib/export/pdfServer.ts`
- `src/lib/testResults/gradeSheet.ts`
- `src/lib/tests/loadSnapshotAssets.ts`
