# 지시서 — 월말평가 학생 성적표(M5)와 에이와 PDF 연동 (codex · 2026-10-18)

워크트리 `/Users/pss/Desktop/creative/today-exam-report` · 가지 `phase/11-exam-report-eywa`(origin/main `c7d3389b2` 에서).
리드(Claude)가 검수하고 main 에 병합한다. **너는 이 가지에 커밋만 한다 — 밀지 않는다 · main 을 건드리지 않는다.**

## 0. 먼저 읽을 것 (정본)

- `CLAUDE.md` — 절대 규칙 전부. 특히 1(D-07 형태 결정은 원장님 확정 없이 구현 금지) · 2(TDD) · 5(문구) · 6(인쇄 = 실물 검수) · 8(D-30 어포던스) · 11(D-159 공용 부품).
- `docs/planning/monthly-exam-plan-20261017.md` — §4 M5(**에이와 연동 요구 다섯**) · §9(M1 발행본 `exam_publication` · `test.publication_id`) · §10 리포트 벤치마크 · §10.5 · §10.6 원장님 결정 · §13.1(성적표 Wire 선택 **S1 · M1 · C2**).
- `docs/planning/23-achievement-report.md` — 성취 리포트 원칙(단일 지수 없음 · 태도는 문장 · A4 한 장 · 기록 현황 한 줄).
- 시안: `src/app/dev/exam-report-wire/`(S1 ~ S4 한 장 · M1 ~ M4 여러 장 · 토글 · C1 ~ C4 반 성적표) · `src/app/dev/report-hifi/`(23번 Hi-fi — 학부모 A4 `ParentSheet`).
- 에이와 통로: `src/lib/eywa/managedTestResults.ts` · `resultsWake.ts` · `managedReceiver.ts`(`verifyReceiverRequest`) · `contract.ts` · `src/app/api/integrations/eywa/**` — 결과 피드의 날짜별 지문(digest v2 — 커밋 `ff8107b0a`)을 본보기로.
- PDF: `src/lib/export/pdfServer.ts` · `pdfClient.ts`(`exportPreviewPdf`) · `src/app/api/exports/pdf/route.ts` — 시험지 편집 화면이 이미 쓰는 A4 → PDF 길. 지면 부품 `src/components/print/A4Page.tsx`.
- 에이와 쪽 결정 `docs/decisions/reports-ai.md` 는 **에이와 저장소**에 있다(여기 없음) — 계획서 §4 M5 의 요약이 우리 쪽 정본이다.

## 1. 할 일 (차례대로)

### A. 성적표 Hi-fi 4안 — **시안만** (D-07)
- 원장님이 Wire 에서 **S1(한 장) · M1(여러 장) · C2(반 성적표)** 를 골랐다. 다음 단계는 Hi-fi 4안(`H1 ~ H4`)이다.
- `/dev/exam-report-hifi` 를 새로 짓는다: 실제 지면 부품(`A4Page` · 인쇄 토큰 `src/components/print/tokens`)으로 S1 · M1 · C2 를 각 안마다 그린다. 안끼리 다른 것은 세부(머리 · 표의 모양 · 틀린 문항 칸 · 원장님 문장 칸 · 색 톤)다. 첫 안에 «추천»을 붙이고 까닭을 적는다.
- 지어낸 픽스처만 쓴다(DB 읽지 않음). 학생 이름은 지어낸 것.
- 페이지 가드: 다른 `/dev` 페이지처럼 `devPageVisible({ directorOnly: true })`. `devPageGuardCoverage.test.ts` 가 초록이어야 한다.
- 🔴 **실제 성적표 화면 · 지면은 구현하지 않는다** — 원장님이 Hi-fi 를 고른 뒤다.

### B. 성적표 데이터 — 화면과 무관한 속 (TDD)
- 학생 한 명 · 발행본(`exam_publication`) 한 회의 성적표 **뷰모델**을 만드는 순수 함수와 그 시험: 점수 · 만점(배점이 없으면 문항 수) · 틀린 문항(번호 · 단원 · 유형 · 낸 그대로의 글은 `hydrateTestSnapshots` → `contentOf` 로) · 재시험 결과(있으면) · 원장님 문장(없으면 빈칸) · 결시.
- 23번 §4: 한 회차로 단원 그래프 · 정답률 표를 그리지 않는다.
- 반 성적표(C2)용 집계 함수도 같은 방식으로(학생별 점수 · 문항별 정답 수).
- 이미 있는 `src/lib/achievement/*` · `src/lib/testResults/*` 를 먼저 찾아 쓴다 — 같은 계산을 두 벌 짓지 않는다.

### C. «확정» 상태와 에이와 PDF 통로 (계획서 §4 M5 의 다섯 요구)
1. 원장님 문장을 인쇄 전까지 고치므로 **확정된 성적표만** 내보낸다. 확정 상태와 원장님 문장을 담을 자리가 필요하면 **DB 변경 초안만** 쓴다: `prisma/drafts/` 에 SQL + 설명. 🔴 `schema.prisma` 를 바꾸거나 마이그레이션을 적용하지 않는다(공유 DB 는 원장님 승인 · DB 먼저 · 코드 나중). 코드는 칸이 없을 때 «확정된 것 없음»으로 안전하게 돌아야 한다 — 그 동작을 시험으로 잠근다.
2. 서명 통로 `/api/integrations/eywa/v2/…`(결과 피드와 같은 `verifyReceiverRequest`): ⑴ 날짜를 주면 «그 날 확정 성적표가 있는 (발행본 · 에이와 학생)» 목록과 각 항목의 **지문**(재채점 · 원장님 문장 수정 = 새 지문) ⑵ 항목 하나의 PDF 본문. 대상은 결과 피드와 같다 — 결시 · 연결 안 된 학생 · 테스트 학생 · 예측 문제지는 주지 않는다.
3. PDF 는 서버에서 학생 한 명 · 한 회를 **파일 하나로**. 지금 PDF 길은 브라우저가 뜬 A4 DOM 을 서버에 보내는 방식이다 — 서버 혼자 만들 수 있는지(`pdfServer.ts` 가 무엇을 받는지) 먼저 조사하고, 길이 없으면 **설계안만** 적고 멈춘다(화면 지면이 아직 확정 전이므로 PDF 의 모양은 Hi-fi 선택 뒤에 붙는다).
4. 계약은 `src/contracts/` 에(Zod) · 짝 시험 · 오류 기록 래퍼(`withErrorLog`) · `errorLogRouteCoverage` 등 전수 가드가 초록이어야 한다.

### D. 끝맺음
- `docs/planning/monthly-exam-plan-20261017.md` 끝에 `### 14. M5 · 에이와 PDF — 진행 (codex)` 절: 한 것 · 커밋 · 시험 · 남은 것 · 원장님께 여쭐 것 · DB 초안 위치.
- 리드에게 남기는 보고 `docs/planning/tracks/reports/exam-report-eywa-codex-20261018.md`(무엇을 어디에 · 돌린 시험과 결과 · 확신 없는 곳).

## 2. 금지 · 안전

- 🔴 **DB 에 붙지 않는다.** 이 워크트리에는 `.env` 가 없다 — 만들지도 복사하지도 않는다. 공유 운영 DB 다. 시험은 기존 더블(`src/mocks/prismaTestDouble.ts` 등)로.
- `npx prisma generate` 를 돌리지 않는다(공유 `node_modules` 의 클라이언트가 이 워크트리에 묶인다).
- `node_modules` 는 심볼릭 링크다 — `git add -A` 금지, 파일을 골라 더한다.
- 외부 API · 유료 모델 호출 금지. 밀기(push) 금지. main · 다른 워크트리(`today_`, `today-exam-publish`, orca) 건드리지 않기.
- 시험: `npx vitest run <관련 파일>` · 끝에 `npm run type-check` · 바꾼 파일 `npx eslint`. 전체 묶음 중 `elem-probe` 의 시간 초과는 이전부터 있던 것이다.
- 커밋 메시지는 영어 한 줄 요약 + 끝에 `Co-Authored-By: Codex <noreply@openai.com>`. 화면 · 문서의 말은 한국어(D-08 간결 · 사무적).
