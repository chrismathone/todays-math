# 월말평가 성적표 · 에이와 PDF — codex 작업 보고

2026-10-18 · 가지 `phase/11-exam-report-eywa` · 시작 HEAD `581d9ab41`(지시서 커밋, 그 부모 `c7d3389b2`). A → B → C → D 순서로 진행했다. 시작 작업트리는 깨끗했다.

## 무엇을 어디에

| 차례 | 결과 | 위치 |
| --- | --- | --- |
| A | S1 요약·M1 요약+오답 풀이·C2 반 정오 격자의 H1~H4. H1 추천 이유. A4·공용 인쇄 토큰·PaperStrip 사용. 전부 지어낸 이름·20문항·8명. 기본·많은 오답·0점·만점·결시·미채점·긴 이름/문장 선택. 내용 토글과 시안 인쇄 | `src/app/dev/exam-report-hifi/` |
| A | `devPageVisible({ directorOnly: true })`, 실제 학생·시험 DB 읽기 없음. 성적표용 접근성 이름만 선택적으로 추가했고 기존 A4의 기본 동작은 보존 | `page.tsx`, `src/components/print/A4Page.tsx` |
| A | 실물 검수 항목 `exam-report-hifi`, 상태 **형태미확정**. 시안 비교/인쇄 검사 스크립트 | `src/app/dev/print-check/items.ts`, `scripts/qa/exam-report-hifi.mjs` |
| B | 학생 한 명·발행본 한 회의 순수 뷰모델. 최신 재채점·점수/만점·오답 번호/단원/유형/낸 글·명시적으로 연결된 재시험·원장님 문장. 결시·미채점·부분 응답 누락·실제 0점 구별 | `src/contracts/examReport.contract.ts`, `src/lib/examReport/build.ts` |
| B | 기존 `testMaxScore`, `rollupScores`, `hydrateTestSnapshots` → `contentOf` 재사용. C2 학생 점수·정오·문항별 정답 수. 단원별 정답률·그래프·종합 지수 없음 | `src/lib/examReport/problems.ts`, `build.ts` |
| C | 미적용 확정/문장/PDF 보관 SQL과 설명. 스키마·마이그레이션 무변경 | `prisma/drafts/exam-report-confirmation/` |
| C | 확정 snapshot·에이와 목록·지문·PDF 요청의 Zod 계약. 현재 내용과 확정본 대조, 재채점/문장 변경 시 재확정 전 제외. 대상·지점·연결·테스트/결시/예측 제외. PDF 크기/서두/바이트 SHA-256, 읽는 동안 내용·연결 지점 재확인 | `src/contracts/eywaExamReport.contract.ts`, `src/lib/eywa/managedExamReports.ts`, `examReportReceiver.ts` |
| C | 실제 `verifyReceiverRequest`를 쓰는 서명된 날짜별 목록·한 항목 PDF 통로, `withErrorLog`. 기존 결과 피드의 활성 연결 검사도 재사용 | `src/app/api/integrations/eywa/v2/exam-reports/[date]/**`, `src/lib/eywa/managedTestResults.ts`(검사 함수 export만) |
| C | 새 DB 자리가 없는 현재는 DB 질의·PDF 생성 없는 닫힌 소스. 목록 `availability: "not-installed", reports: []`, 항목 PDF 404 | `src/lib/examReport/confirmedSource.ts` |
| C | 기존 PDF 엔진 입력/DOM 경계·서버 지면 분리·글꼴/쪽 나눔·확정/보관 순서 조사 | `docs/planning/tracks/reports/exam-report-pdf-design-20261018.md` |

실제 성적표 화면·확정 단추·문장 저장 API·선택된 운영 지면·운영 학생 PDF 생성은 구현하지 않았다. 개발 시안과 데이터 함수는 분리돼 있다. 에이와 발송·기존 ClassNote 재발송·미첨부 학생 알림도 건드리지 않았다.

배점이 없으면 맞힌 문항 수 / 전체 문항 수로 표현한다. 기존 채점의 환산 점수는 `score.storedValue`로 따로 보존하고 기존 채점 규칙을 변경하지 않았다.

## 시험과 결과

새 파일은 시험을 먼저 만들고 실패를 확인한 뒤 구현했다. 오답 목록/문항 번호 무결성과 PDF를 읽는 동안 지점이 달라지는 경우도 실제 실패 → 수정 → 통과로 확인했다. 모든 DB 의존은 시험 더블이며 실제 DB·외부 API·모델을 호출하지 않았다.

최종 결과: **16파일 · 128시험 통과**. `npm run type-check` 통과. 변경한 모든 TS/TSX/MJS의 `npx eslint` 오류·경고 0, `npm run lint:affordance`와 `git diff --check` 통과. 전체 시험 묶음은 돌리지 않았다.

```text
npx vitest run <아래 16파일> --configLoader runner
src/__tests__/unit/examReportHifi.test.tsx
src/__tests__/unit/examReport.test.ts
src/__tests__/unit/examReportProblems.test.ts
src/__tests__/unit/examReportContract.test.ts
src/__tests__/unit/managedExamReports.test.ts
src/__tests__/api/eywaExamReports.test.ts
src/__tests__/unit/managedTestResults.test.ts
src/__tests__/unit/achievementMaxScore.test.ts
src/__tests__/unit/examPublicationContent.test.ts
src/__tests__/unit/devPageGuardCoverage.test.ts
src/__tests__/unit/errorLogRouteCoverage.test.ts
src/__tests__/unit/proxyStudentGate.test.ts
src/__tests__/unit/affordanceGuard.test.ts
src/__tests__/unit/pdfExport.test.ts
src/__tests__/unit/paperFrame.test.ts
src/__tests__/unit/examPaperProbeParity.test.tsx
```

`proxyStudentGate`의 고정 예상 목록에 새 서명 수신 경로 두 개만 추가했다. 프록시 권한 정책은 바꾸지 않았다. HMAC 검사는 경로/질의 변조와 다른 binding을 거절한다. PDF 바이트 fixture는 전송 검사 자료이며 실제 지면 PDF가 아니다.

## 검증하지 못한 것 · 확신 없는 곳

- 시안 브라우저·PDF 실측: 로컬 Vite listen이 `EPERM`, 별도 headless Chromium도 macOS MachPort `Permission denied (1100)`로 시작하지 못했다. 우회하거나 사용자 창을 띄우지 않았다. 따라서 화면/지면의 폭별 잘림·실제 글꼴·쪽수·배경 인쇄 꺼짐·확대 창 초점 복귀는 **통과라고 말하지 않는다**. 검사 스크립트는 남겼지만 그 실행 결과도 미완료다. 실물 인쇄는 Hi-fi 선택 후 원장님 검수 대기다.
- 기존 PDF 엔진은 HTML/CSS를 받아 서버에서 PDF로 만들 수 있다. 그러나 성적표 서버 지면은 없고, A4Page와 현재 PDF 엔진의 DOM 표지도 다르다. 선택된 지면을 서버에 연결하는 부분은 설계만 남겼다.
- M1 발행 payload는 원본 배점과 `problemType` 분류를 별도로 고정하지 않는다. 뷰모델의 글·답·해설·단원명은 발행본이지만, 배점/유형은 현재 기존 읽기 규칙이다. 이를 운영 발행 당시와 같다고 입증하지 않았다. 확정 쓰기 어댑터를 열기 전에 고정 정책을 검토해야 한다.
- 재시험은 원기록과 명시적으로 연결된 입력만 받는다. 현재 복습 계획 API에는 재시험 성적의 영속 연결이 없으므로 날짜나 제목으로 자동 추정하지 않았다.
- 확정 SQL은 실행·드라이런·SQL 엔진 검증을 하지 않은 제안이다. 지점/소유 권한, 최신 결과 잠금, JSON/내용/PDF 대응 검증, 보관/삭제 정책을 적용 전 검토해야 한다.

## 커밋 · 안전 준수

**커밋은 만들지 못했다.** 파일을 골라 `git add`와 지정된 영문 메시지·`Co-Authored-By: Codex <noreply@openai.com>`의 커밋을 시도했으나, 두 명령 모두 `/Users/pss/Desktop/creative/today_/.git/worktrees/today-exam-report/index.lock` 생성이 `Operation not permitted`로 거절됐다. 시작 HEAD 그대로이며 변경 30파일은 이 워크트리에 미커밋으로 남았다. 권한을 우회하거나 다른 git 디렉터리를 만들지 않았다. `git add -A`, push, main 병합은 하지 않았다.

`.env` 작성/복사, DB 접속, `prisma generate`, `schema.prisma` 변경, 마이그레이션 적용, 다른 워크트리 변경, 외부 API·유료 모델 호출을 하지 않았다. 기본 Vitest 설정 로더도 공유 `node_modules/.vite-temp` 쓰기가 거절돼 `--configLoader runner`로 실행했다.

리드가 검토 후 만들 커밋 요약 예: `Add exam report hi-fi prototypes and safe Eywa PDF contracts`. 마지막에 위 공동 작성자 꼬리말을 붙인다. main 병합·push는 리드 몫이다.

## 남은 것 · 원장님께 여쭐 것

1. `/dev/exam-report-hifi`에서 H1~H4 선택. 선택 전 실제 지면/화면을 구현하지 않는다.
2. 선택된 지면의 브라우저·PDF·실물 검수. 현재 미검증 부분을 먼저 확인한다.
3. `prisma/drafts/exam-report-confirmation/`의 DB 변경 승인과 보관/삭제 정책. 승인·드라이런·DB 적용 뒤에만 Prisma·읽기/확정 쓰기 어댑터를 연결한다.
4. 발행 배점/유형 고정과 재시험 연결 정책을 리드가 검토한다. 그 뒤 한 학생·한 발행본의 검수된 PDF 한 파일을 확정 보관하고 에이와 실제 연동 시험을 한다.
