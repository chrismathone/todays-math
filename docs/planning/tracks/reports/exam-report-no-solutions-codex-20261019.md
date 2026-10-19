# 성적표 풀이 제거 — Codex 수행 보고

2026-10-19 · 작업트리 `/Users/pss/Desktop/creative/today-report-styles` · 브랜치 `phase/11-report-styles` · 기준 HEAD `7a95dc858`.

브리프: [brief-exam-report-no-solutions-codex.md](../brief-exam-report-no-solutions-codex.md).

## 구현 결과

- `/dev/exam-report-styles`의 구성은 **요약 한 장 · 숫자만**이다. ‘풀이 포함’, `wrongSolutions` 블록·측정·렌더링·전용 CSS를 제거했다. 출력 선택은 ‘틀린 문항 표’로 바꾸고 큰 숫자형의 약점 설명을 표·문장 기준으로 고쳤다.
- 제품 `ExamReportWorkspace`는 요약만 고를 수 있다. 지면 안내와 확대 미리보기도 요약 기준이다. 기존 오답 표·재시험·원장님 문장·반 평균 선택은 유지했다.
- 공용 `ExamReportPaper`에서 풀이 쪽 생성과 문항·그림·정답·해설 재수록을 제거했다. 이 컴포넌트를 쓰는 서버 `paperHtml`과 미확정 학생의 반 전체 인쇄에도 적용된다. 풀이 전용 `paginate.ts`와 CSS를 정리했다.
- 틀린 문항 **표**의 번호·단원·유형과 원순서, 행 단위 쪽 나눔, 이어지는 머리·쪽수는 유지했다. 정상 단원명이나 선생님 의견 안의 ‘풀이’라는 단어를 삭제하지 않는다.
- 기존 Hi-fi 두 화면에서도 M1 선택과 풀이 문구를 제거했다. `print-check`의 확정 보관·스타일 후보·H1 세 항목을 요약·표 이어짐·기존 보관본 보존 기준으로 갱신했다. 역사적 Wire 시안은 변경하지 않았다.
- [메뉴 구현 map](../../../design/workspace-ui-rules-20261008.md)에 적용 경계를 기록했다. 풀이 제거 외의 지면·화면 모양은 바꾸지 않았다. 작업 시작 전의 점수 환산·추이·스타일 후보 미커밋 변경은 보존했다.

## M1 및 확정 PDF 호환

저장값 읽기 계약과 확정 스냅샷 계약에는 `M1`을 남겼다. 문항 계약의 원문·정답·해설 필드도 유지한다. 이 값들은 기존 확정본의 지문에 포함되므로 읽는 순간 변환하거나 삭제하지 않는다. 지면 버전 `h1-v2`와 해시 규칙도 유지했다.

출력용 `paperOptions`는 S1로 매핑하고 공용 지면에 M1을 직접 넘겨도 같은 요약을 그린다. 새 설정 PATCH 계약은 S1만 허용하며 M1 요청은 400으로 거절한다. 기존 M1 반에서 설정을 열고 그대로 적용하면 저장 요청을 보내지 않아 확정 상태를 보존한다. 실제 출력 옵션을 바꿔 적용할 때만 S1을 저장하고 기존 재확정 정책을 따른다.

이미 확정한 PDF는 원래 바이트를 내려받고 반 인쇄에서도 재생성 없이 합친다. 기존 보관본에 풀이 쪽이 있다면 그 쪽도 그대로 남는다. 새로 만드는 요약과 구분한다.

회귀 근거:

- 고정 합성 M1 JSON과 독립적으로 고정한 SHA-256을 [examReportLegacyM1.json](../../../../src/__tests__/fixtures/examReportLegacyM1.json)에 추가했다. 파싱·현재 스냅샷·외부 목록 자격에서 같은 지문을 유지하는지 검사한다. 실제 운영 학생 자료가 아니다.
- 기존 보관 PDF 세 쪽과 미확정 학생 요약 한 쪽을 합치는 시험에서 원래 세 쪽의 크기·순서, 단건 다운로드 바이트, 보관 레코드 불변을 확인했다.
- 긴 해설 1,500회와 그림을 가진 M1도 S1과 같은 요약 HTML을 만들며 입력 자료를 변경하지 않는다.

## 검사 결과

| 검사 | 결과 |
| --- | --- |
| 관련 Vitest | **23파일 · 393개 통과** |
| `npm run type-check` | 통과 |
| 변경·관련 TS/TSX/MJS 38파일 ESLint | 통과 |
| `npm run lint:affordance` | 통과 |
| `git diff --check` | 통과 |
| 후보 서버 지면 Chromium 실측 | **7스타일 × 2구성 × 13상황 = 182조건 · 237쪽 통과** |
| 3220 후보 화면 | **1280 · 390 · 320px**, 구성·상황·출력 선택·확대/Escape/초점 복귀 통과, 가로 넘침 0 |
| 제품 컴포넌트 로컬 화면 | **1200 · 1040 · 768 · 390px**, 가로 넘침 없음 |
| 제품 요약·표 조판 실측 | **84조건**, S1/기존 M1, 오답 0·4·8·12·16·20·40개, 일반/긴 이름, 세 문장 패턴의 기본 지면 모두 통과 |

최종 시험 명령:

```sh
npm run test -- src/__tests__/unit/examReport src/__tests__/api/examReport src/__tests__/components/ExamReportWorkspace.test.tsx src/__tests__/unit/managedExamReports.test.ts src/__tests__/unit/pdfServerBatch.test.ts src/__tests__/unit/devPageGuardCoverage.test.ts
npm run type-check
npm run lint:affordance
node scripts/qa/exam-report-styles.mjs --preview-origin=http://localhost:3220
node scripts/qa/exam-report-screen-impl.mjs --measure
```

타입 검사 첫 실행에서 공유 `node_modules`의 기존 Prisma 생성 타입에 `actualFormat`이 빠진 오류가 있었다. 저장소 스키마에 필드가 존재함을 확인하고 `npm run db:generate`로 클라이언트만 재생성한 뒤 최종 타입 검사를 통과했다. DB 마이그레이션·접속·쓰기는 실행하지 않았다.

이전 후보 QA의 정적 지면 URL은 Vite HTML fallback 뒤에 등록돼 빈 화면을 읽었다. QA middleware를 fallback 전에 등록하도록 수정하고 182조건을 실제 글꼴 적재 후 재검증했다. 후보 화면 검증에는 사용자가 지정한 3220 서버를 사용했다.

## 화면·실측 증거와 한계

Git 제외 경로:

- `.qa-artifacts/exam-report-styles/measurements.json`: 182조건의 글꼴·최소 9pt·지면 너비/높이·블록/꼬리말 경계, 3220 화면 세 폭, pageerror·외부/API 차단 기록.
- 같은 폴더의 `preview-1280.png`, `preview-390.png`, `preview-320.png`, 후보별 `*-summary.png`, `*-numbers.png`: 화면과 지면 캡처. 넓은/좁은 화면과 H1·큰 숫자형 지면을 직접 열어 확인했다.
- `.qa-artifacts/exam-report-screen-impl/measurements.json`, `screen-*.png`: DB·네트워크 없는 실제 제품 컴포넌트와 자체 글꼴의 화면·84조건 조판 실측.
- `.qa-artifacts/exam-report-no-solutions/live-hifi.json`, `exam-report-*-*.png`: 3220의 기존 Hi-fi 두 화면 선택지·풀이 DOM 부재·세 폭 점검.
- `.qa-artifacts/exam-report-no-solutions/audit.md`: 독립 Orca Codex의 중간 구조 감사. 지문 호환·무변경 설정 적용·혼합 인쇄 권고는 위 회귀 시험과 구현에 반영했다.

문장 저장 상한 1,000자는 지면에 항상 들어간다는 뜻이 아니다. 과도한 줄바꿈 등은 기존 넘침 검사와 확정 차단이 계속 처리한다. 84조건 결과의 `allBaselinesFit`은 기본 문장이 들어간다는 뜻이며 모든 1,000자 입력의 적합 판정이 아니다.

3220 Next 서버에는 기존 Auth 설정의 `MissingSecret` 서버 콘솔 경고가 있었다. 후보/Hi-fi는 정상 표시됐고 브라우저 pageerror는 없었다. 이 작업에서 인증 설정이나 실행 중인 서버를 바꾸지 않았다. 실계정 인증·운영 확정/저장·공유 버킷 접근과 물리 프린터 출력은 수행하지 않았다. 관련 `print-check` 항목의 실물 검수 상태는 **대기**로 유지했다.

운영·공유 DB 쓰기, 커밋, 푸시, `git add`를 하지 않았다. 마이그레이션 회귀 시험은 메모리 PGlite에서만 수행했다. `node_modules`는 스테이징하지 않았다. 읽기 전용 감사 작업트리는 자체 수정·커밋 없이 종료·정리했으며 감사 브랜치는 보존했다. 사용자 작업트리와 3220 서버는 유지한다.
