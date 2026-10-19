# 지시서 2 — 성적표 H1 지면을 실제 부품으로 · 서버 HTML (codex · 2026-10-18)

워크트리 `/Users/pss/Desktop/creative/today-exam-report` · 가지 `phase/11-exam-report-eywa`(main `e9ba95291`).
리드(Claude)가 검수하고 main 에 병합한다. **너는 커밋하지 않는다** — 바꾼 파일을 남기고 보고만 한다(지난번처럼 샌드박스가 `index.lock` 을 못 만든다).

## 0. 정해진 것
- 원장님이 성적표 Hi-fi 에서 **H1 «시험지 얼굴»** 을 골랐다(2026-10-18 «추천으로 진행»). 형식은 Wire 에서 고른 **S1(요약 한 장) · M1(요약 + 틀린 문항 풀이) · C2(반 정오 격자)** 그대로.
- 먼저 읽을 것: 지시서 1 `docs/planning/tracks/brief-exam-report-eywa-codex.md`(금지 · 안전 §2 는 이번에도 전부 그대로) · 설계 `docs/planning/tracks/reports/exam-report-pdf-design-20261018.md`(1 ~ 5단계) · 시안 `src/app/dev/exam-report-hifi/` · 뷰모델 `src/lib/examReport/build.ts` · 계약 `src/contracts/examReport.contract.ts` · PDF 엔진 `src/lib/export/pdfServer.ts`(`PdfPayloadSchema`).

## 1. 할 일
1. **H1 지면 부품** `src/components/exam-report/` — S1 · M1 · C2 를 H1 모양 그대로(글꼴 · 선 · 간격 · 색 토큰 · 문구를 시안에서 옮긴다. 새 모양을 지어내지 않는다). 입력은 `StudentExamReport`(C2 는 반 집계) + 출력 선택(오답 · 재시험 · 원장님 문장 · 반 평균)뿐. 상태 · effect · DOM 측정 없이 그려져야 한다(`renderToStaticMarkup` 로 같은 결과). H2 ~ H4 는 옮기지 않는다.
2. **M1 쪽 나누기** — 오답 문항을 쪽에 나누는 순수 함수(문항 · 그림 크기 추정으로). 긴 글을 자르거나 글자를 줄이지 않는다. 시험으로 잠근다(오답 0 · 1 · 많음 · 그림 있음).
3. **서버 HTML** `src/lib/examReport/paperHtml.ts`(server-only) — 학생 한 명 · 한 회의 모든 쪽을 `PdfPayloadSchema` 에 맞는 값(HTML · CSS · 제목)으로. A4 쪽마다 PDF 엔진이 요구하는 경계를 준다(`preparePage` 가 무엇을 찾는지 보고 맞춘다). 지면 띠 · 화면 단추는 넣지 않는다. 외부 글꼴 요청이 붙지 않게(자체 글꼴만) 할 방법을 조사해 적고, 엔진을 바꿔야 하면 옵션으로만 더한다(기존 시험지 내보내기 동작은 그대로). 🔴 Chromium 으로 실제 PDF 를 만들어 보지는 않는다 — HTML 까지만 시험한다.
4. **시안 정리** — `/dev/exam-report-hifi` 의 H1 은 새 부품을 쓰게 바꾼다(시안과 실제가 갈리지 않게). H2 ~ H4 는 그대로 둔다.
5. `/dev/print-check` 의 `exam-report-hifi` 항목 설명에 «H1 선택 · 새 부품» 을 적는다(상태는 «대기» 그대로 — 실물 검수는 원장님).

## 2. 하지 않을 것
- 🔴 원장님이 성적표를 열고 · 문장을 쓰고 · 확정하는 **화면**은 짓지 않는다 — 아직 Wire 가 없다(D-07).
- DB · `schema.prisma` · 마이그레이션 · 실제 로더 · 확정 쓰기 어댑터 — 승인 전이다.
- 에이와 통로(`managedExamReports.ts` · 라우트)는 건드리지 않는다.

## 3. 끝맺음
- 시험: `npx vitest run <관련 파일>` · `devPageGuardCoverage` · `npm run type-check` · 바꾼 파일 `npx eslint` · `npm run lint:affordance`.
- `docs/planning/monthly-exam-plan-20261017.md` §14 아래에 `#### 14.1 H1 지면 부품 (codex)` — 한 것 · 시험 · 확신 없는 곳 · 원장님께 여쭐 것.
- 마지막 답에 바꾼 파일 목록과 돌린 시험 결과.
