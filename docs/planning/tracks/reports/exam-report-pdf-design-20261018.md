# M5 · 서버 PDF 조사와 다음 연결 설계

2026-10-18 · 지면 선택·DB 적용 전. 실제 학생 성적표 지면과 PDF 생성기는 구현하지 않았다.

`src/lib/export/pdfServer.ts`의 `buildPdf(input, origin, signal)`은 URL이나 React 컴포넌트 대신 **HTML 문자열 + CSS URL 목록 + CSS 본문 + 제목**을 받는다(`PdfPayloadSchema`). 서버가 이 문자열을 만들면 브라우저 화면이 먼저 열려 있을 필요는 없다. Puppeteer가 스크립트를 끄고 인쇄 매체로 문서를 싣고 글꼴·그림을 기다린 뒤 PDF를 반환한다. 따라서 서버 PDF 엔진은 있다.

다만 현재 `pdfClient.ts/exportPreviewPdf`는 **이미 브라우저가 조판한** `[data-mathgen-document]`·`[data-unified-paper]` DOM과 활성 stylesheet를 복제한다. `A4Page`의 경계는 `[data-print-page]`로 다르다. `preparePage`는 `[data-unified-paper]`가 없으면 실패한다. 현재 Hi-fi는 상태·지면 띠가 있는 개발 시안이고, 확정 지면의 서버 전용 렌더러가 아니다. 이를 가져다 실제 성적표로 발행하지 않았다.

선택 뒤의 연결 순서는 다음과 같다.

1. 선택된 H안의 학생 S1·M1 지면을 개발 화면에서 독립시킨다. 순수 읽기 계약 `StudentExamReport`와 출력 선택만 받고 실제 인쇄와 서버가 같은 부품을 쓴다. 명조·A4는 공용 토큰을 쓴다. C2 반 성적표는 에이와 학생 첨부 대상이 아니다.
2. 승인된 서버 어댑터가 권한·지점·연결과 최신 채점을 확인하고 `loadExamReportProblems` → `hydrateTestSnapshots` → `contentOf`로 낸 글을 읽는다. `buildStudentExamReport`를 호출한다. 재시험은 원기록 연결이 확인된 것만 넣는다. 현재 재시험 API는 복습 계획이며 원시험↔재시험 성적의 영속 연결은 없다. 날짜·시험 제목으로 추측하지 않는다.
3. `renderToStaticMarkup` 등으로 동일한 지면을 HTML로 만들고 정적 CSS·자체 글꼴을 명시한다. A4마다 현재 PDF 엔진이 요구하는 경계를 제공한다. 개발 시안의 `PaperStrip`·화면 제어·숨은 복제 DOM은 보내지 않는다. 클라이언트 effect·DOM 측정이 있어야 내용이 생기는 구조는 피한다.
4. M1은 오답 수·문항/그림 크기로 실제 쪽을 나눈다. 글꼴이 실린 뒤 이름·문장·문항·해설의 누락/넘침과 9pt 하한을 확인한다. 긴 문장을 자동으로 자르거나 글자를 줄여 맞추지 않는다. 색 바탕을 꺼도 숫자·○×가 남아야 한다. 실물 검수는 `/dev/print-check`의 `exam-report-hifi`에 남겼다.
5. 학생 한 명·한 발행본의 모든 쪽을 `buildPdf` 한 문서로 만든다. 현재 응답 상한은 4,000,000바이트다. 예측하지 못한 그림/폰트 실패·넘침·용량 초과면 확정하지 않는다. 클라이언트 배치 합치기만 있는 것을 서버 완성으로 보지 않는다.
6. 채점 저장과 같은 시험/보고서 잠금 순서를 정해 최신 채점·문장·선택이 렌더 전후 같은지 확인한다. 다르면 PDF를 버리고 다시 확인한다. 내용 snapshot·지면 버전·PDF 바이트/해시를 저장한 뒤 확정 포인터를 같은 거래로 옮긴다. 보관본을 재인쇄와 에이와 다운로드에 같이 쓴다.

현재 PDF 엔진은 자체 origin의 stylesheet/font/image와 data 그림/폰트만 허용하고 API·스크립트·외부 그림은 차단한다. 기본 FONT_CSS는 외부 글꼴 주소도 덧붙인다. 후속 구현은 자체 적재된 실제 글꼴 로딩을 검증하고, 불필요한 외부 글꼴 요청을 끄는 옵션을 검토해야 한다. 이 작업에서는 Chromium·유료 모델·외부 API를 호출해 PDF를 만들지 않았다.

서명 통로 초안은 `GET /api/integrations/eywa/v2/exam-reports/{시험일}?bindingId=…`, `GET /api/integrations/eywa/v2/exam-reports/{시험일}/{publicationId}/{에이와학생id}?bindingId=…&sha256=…`다. 기존 `verifyReceiverRequest`의 webhook 목적 HMAC이 **경로와 질의까지** 서명한다. 목록과 PDF는 같은 대상 판정을 쓰고 PDF 다운로드는 목록 지문을 요구한다. 상태가 바뀌면 409, 대상 확정본이 없으면 404다. 실패는 `withErrorLog`를 지난다.

계약은 `src/contracts/eywaExamReport.contract.ts`. `sourceDigest`는 현재 채점 기록 ID·점수·낸 문항·원장님 문장·재시험·선택·지면 버전을 포함한 정규 JSON 지문이다. 목록 지문은 판 번호 `exam-report-v1`·연결·에이와 학생·내용 지문·보관본 ID·PDF 지문·확정 시각을 포함한다. PDF 본문도 크기·서두·SHA-256을 대조한다. 서명 통로는 PDF를 그때마다 새로 만들지 않고 검수된 보관본 한 파일을 준다.

현재 실제 소스는 `unavailableExamReportSource`이며 어떤 DB 모델도 조회하지 않는다. 빈 목록(`availability: "not-installed"`)과 PDF 404까지 구현했다. 시험의 PDF 바이트는 전송/해시 검사용 지어낸 값이며 유효한 지면 PDF를 생성했다는 증거가 아니다. SQL은 `prisma/drafts/exam-report-confirmation/`의 미적용 초안이다.

추가로 확인한 한계: 현 M1 고정본에는 문항 글·정답·해설·단원명은 있으나 원본 배점과 `problemType` 분류가 별도 고정돼 있지 않다. 현재 뷰모델의 배점 계산은 기존 `testMaxScore`·시험별 조정 배점/은행 배점 규칙을 재사용하고, 유형 분류는 현재 문항 값을 읽는다. 운영 발행본에서 이를 «낸 당시와 같다»고 증명하지 않았다. 확정 쓰기 어댑터를 열기 전에 발행 배점·유형의 고정 정책을 리드가 검토해야 한다. 기존 발행본이나 은행을 이 작업에서 수정하지 않았다.

## H1 선택 뒤 구현 — 2026-10-18

위 본문은 지면 선택 전 조사 기록이다. 원장님이 H1 «시험지 얼굴»을 고른 뒤, 연결 순서 **1·3·4의 HTML 단계**를 구현했다. 실제 로더·확정 쓰기·PDF 보관·에이와 연결은 열지 않았다.

- **공용 지면**: `src/components/exam-report/ExamReportPaper.tsx`의 `StudentExamReportPaper`와 `ClassExamReportPaper`. `StudentExamReport`/`ClassExamReport`와 출력 선택만 받는다. S1·M1은 세로 A4, C2는 가로 A4다. `studentExamReportPages`/`classExamReportPages`를 개발 시안의 PaperStrip에서도 재사용한다. H2~H4의 기존 부품·CSS는 유지했다.
- **H1 CSS 정본**: 같은 폴더의 `paperStyles.ts`에 선택된 H1의 글꼴·선·여백·색 토큰을 옮겼다. 서버에는 그 문자열을 넣고 시안도 같은 문자열을 쓴다. A4Page의 인쇄 토큰을 유지하면서, 서버에 없는 Next CSS module·Tailwind reset에 기대지 않도록 지면 크기·명조 제목 굵기·문항/그림 배치를 명시했다. 지어낸 재시험 안내와 «예시 자료» 꼬리는 실제 부품에 넣지 않는다.
- **문항 경로**: `PaperProblemView` → `ProblemContent`와 `MathText`/`SolutionText`를 재사용한다. 성적표가 선택하는 `staticLayout` 옵션은 보기 상자의 상태·effect·DOM 측정 대신 `StaticBoxQuoteCard`로 원문 열 수를 그린다. 보기 열 수도 인라인으로 고정하므로 브라우저 폭·print 매체에 기대지 않는다. 옵션 기본값은 기존 동작 그대로다.
- **M1 쪽 나누기**: `src/lib/examReport/paginate.ts`. 기존 `estimateProblemPx`·그림 치수/인쇄 폭·`solutionForDisplay`를 읽어 문항·정답·해설·그림 높이를 추정한다. H1의 같은 높이 두 칸을 상한으로 쓰며 긴 문항은 한 쪽을 쓴다. 오답 0개는 추가 쪽 없음. 문항·순서·글자 크기를 바꾸지 않으며, 한 쪽보다 큰 문항은 번호를 담은 오류로 중단한다.
- **서버 HTML**: server-only `src/lib/examReport/paperHtml.ts`의 `buildExamReportPaperHtml(report, options)`가 `renderToStaticMarkup`으로 학생 한 명·한 회의 모든 쪽을 만든다. 반환값은 `PdfPayloadSchema`의 HTML·CSS·제목·글꼴 정책이다. `[data-mathgen-document]` 안에 A4마다 `[data-unified-paper]`와 A4Page의 `[data-print-page]`를 함께 둬 `preparePage`가 인식한다. 지면 띠·화면 단추·숨은 복제 지면은 없다.

### 자체 글꼴과 엔진 옵션

한글 명조는 기존 `/fonts/NotoSerifKR-subset.woff2`, 고딕은 기존 `/fonts/PretendardVariable.woff2`를 `@font-face`로 쓴다. 서버 HTML은 origin을 아직 모르므로 자체 경로를 넣고 PDF 엔진의 `<base href="origin/">`와 같은 origin 자산 허용 규칙으로 읽는다. 두 파일 모두 이미 `public/fonts`에 있으며 새 글꼴을 다운로드하지 않았다.

수식은 설치된 KaTeX의 실제 `katex.min.css`를 읽고, 그 CSS가 가리키는 woff2를 data URL로 넣는다. CSS·수식 글꼴을 CDN이나 가변 Next CSS 주소에서 찾지 않는다. 미래의 서버 확정 어댑터를 실제 라우트에 연결할 때에는 **그 라우트의 output file tracing에 `node_modules/katex/dist/katex.min.css`와 `fonts/*.woff2`가 포함되는지** 확인해야 한다. 현 `next.config.ts`에는 `/api/textbook/**`용 자산 목록만 있으므로 이 단계에서 아직 없는 생성 라우트용 목록을 추가하지 않았다.

`PdfPayloadSchema`에 `fontPolicy: "default" | "self-hosted"`를 선택적으로 추가했다. 기본은 `default`로 기존 시험지의 FONT_CSS·외부 글꼴 허용 동작을 유지한다. 성적표는 `self-hosted`를 명시한다. 이 모드에서 엔진은 FONT_CSS를 덧붙이지 않고 외부 stylesheet/font 요청도 차단한다. 렌더 시 자체 명조·고딕이 실제로 로드되지 않으면 오류를 내도록 했으나, **그 Chromium 동작을 실행해 검증한 것은 아니다.** HTML 시험은 외부 글꼴 URL 부재, 자체 폰트 경로와 KaTeX data 글꼴, 기본 모드의 기존 외부 CSS 유지까지 확인한다.

### 검증의 경계

쪽 나누기는 DOM 없는 **추정**이다. 글꼴을 올린 Chromium 조판 실측·실제 PDF·실물 출력으로 페이지 높이와 9pt 가독성을 검수했다는 뜻이 아니다. 크기 정보가 없는 그림은 0으로 세지 않고 기존 미상 높이를 사용한다. 아주 긴 학생/반/시험 이름, 원장님 문장, S1의 많은 오답 행, 큰 반 명단·많은 문항의 C2는 실물 검수와 후속 확정 전 넘침 검사가 필요하다. 텍스트를 자동으로 자르거나 줄여 맞추는 처리는 없다.

이번 작업에서는 Chromium·DB·외부 API를 호출하지 않았으며, 생성 HTML을 확정본이나 PDF 보관본으로 간주하지 않는다. `/dev/print-check`의 `exam-report-hifi`는 **H1 선택 · 새 부품 / 대기**로 갱신했다. 실제 화면·PDF/프린터 검수는 원장님께 남긴다.
