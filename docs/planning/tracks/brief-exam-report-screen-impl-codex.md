# 지시서 4 — 성적표 원장님 화면 · 확정 쓰기 실제 구현 (codex · 2026-10-18)

워크트리 `/Users/pss/Desktop/creative/today-exam-report` · 가지 `phase/11-exam-report-eywa`(main `f67fb786b` 기준). **커밋하지 않는다** — 바꾼 파일을 남기고 보고만 한다.
금지 · 안전은 지시서 1 §2 그대로: DB 에 붙지 않는다 · `.env` 를 만들거나 복사하지 않는다 · `prisma generate` 를 돌리지 않는다(리드가 이미 돌렸다 — 새 모델이 클라이언트에 있다) · push 금지 · 외부 호출 · 유료 모델 금지 · `git add -A` 금지.

## 0. 정해진 것 (다시 묻지 않는다)
- 화면: Wire **A** · Hi-fi **H3 «문장 옆에서 쓰기»** + H1 목록 배지 · 위쪽 인쇄. 합의문 `docs/planning/tracks/reports/exam-report-screen-hifi-consensus.md` 의 «지킬 것 셋»을 지킨다. 시안 `/dev/exam-report-screen-hifi` 의 H3 를 실제로 옮긴다(새 모양을 지어내지 않는다).
- 여쭐 것 셋: 문장 없이 확정 됨(지면의 «원장님 문장» 칸이 빠진다) · 확정 전 인쇄 됨, 인쇄 단추의 기본은 «확정된 학생만» · 문장 길이 상한 + 남은 글자 수.
- 지면: H1 부품 `src/components/exam-report/` · 서버 HTML `src/lib/examReport/paperHtml.ts` · PDF `buildPdf`(`fontPolicy: "self-hosted"`).
- **DB 는 적용돼 있다**(`prisma/migrations/20261018150000_exam_report_confirmation`): `exam_report_draft`(편집 자리 — 문장 · 지면 설정 · 상태 · 문장/설정을 고치면 DB 트리거가 판을 올리고 확정을 푼다) · `exam_report_artifact`(보관본 — 고치거나 지울 수 없다). 모델 `ExamReportDraft` · `ExamReportArtifact`. 제약은 PGlite 시험 `examReportMigration.test.ts` 가 잰다 — 읽고 시작한다.
- **PDF 바이트는 비공개 버킷 `exam-report-private`**(앱 Supabase 프로젝트 · PDF 만 · 4MB)에 둔다. 경로는 `{reportId}/{artifactId}.pdf`(DB CHECK). 저장소 통신은 영어 듣기가 쓰는 `src/lib/english/listening/media/storageApi.ts` 의 방식(서버 키 · 주소 검사)을 본떠 성적표용 작은 모듈로 만든다 — 영어 울타리(`englishFence`) 를 넘지 않게 **복사해 줄인다**(import 하지 않는다).

## 1. 할 일
1. **읽기 어댑터** — 낸 시험 한 회 · 반 하나의 학생 목록과 학생 한 명의 `StudentExamReport`. 이미 있는 `src/lib/examReport/{build,problems}.ts` 를 쓴다(같은 계산을 두 벌 짓지 않는다). 상태 넷(문장 없음 · 문장 씀 · 확정 · 다시 확정)과 결시. **«다시 확정»은 읽을 때 정한다**: 확정 보관본의 `source_digest` 가 지금 내용의 지문(`examReportSnapshotDigest`)과 다르면 다시 확정(재채점 감지 — 기존 표에 트리거가 없다).
2. **API**(전부 `withErrorLog` · 권한은 반 시험의 `test:write` · 소유 · 지점 — 발행 API `src/lib/examPublication/server.ts` 의 판정을 본뜬다):
   - 목록 · 학생 하나 읽기.
   - 문장 저장(학생 하나) · 반 지면 설정(그 반의 모든 학생 줄에 같은 값).
   - **확정**: (문장이 오면 먼저 저장) → 최신 채점 · 판을 읽고 → HTML → `buildPdf` → 버킷에 올리고 → **한 거래에서** 판 · 최신 채점 · 지문이 그대로인지 다시 보고 보관본을 넣고 확정으로 바꾼다. 다르면 409(PDF 는 버린다). 저장 · PDF · 올리기가 실패하면 확정하지 않는다. 올린 뒤 거래가 실패해 남는 파일은 경로를 오류 기록에 남긴다(지우지 않는다).
   - 확정 PDF 받기(학생 하나) · **반 인쇄**: 고른 범위(확정된 학생만 / 전원)를 한 파일로. 확정된 학생은 보관본 PDF 를, 확정 전 학생은 지금 내용으로 그린다. PDF 를 합칠 도구가 이미 있는지 먼저 찾는다.
   - 계약은 `src/contracts/` 에 Zod. 짝 시험. `errorLogRouteCoverage` 등 전수 가드 초록.
3. **에이와 통로의 실제 소스** — `src/lib/examReport/confirmedSource.ts` 를 위 표 · 버킷으로 연다. 단 **서버 변수 `EXAM_REPORT_EYWA_FEED=on` 일 때만** 연다(값이 없으면 지금처럼 `not-installed` · 404). 에이와 첫 연동은 테스트 학생 «학원이»로만 한다(원장님) — 켜는 것은 리드가 한다.
4. **화면** — 실제 페이지(작업실 경로 · 원장 관문). 들어오는 길 둘: 낸 시험 줄의 반마다 «성적표»(채점이 끝난 반만 — `ExamPublicationParts.tsx`) · 채점 저장 뒤 점수 목록 아래 «성적표로»(`GradeSheet.tsx`). 미리보기는 `PaperStrip`. 문장을 쓰는 대로 옆 지면이 바뀐다. 1040px 본문에서도 나란히(합의 1).
5. **문장 상한** — 실제 H1 지면에 문장을 길게 넣었을 때 S1 · M1 첫 쪽이 넘치지 않는 최대 길이를 재는 스크립트를 `scripts/qa/` 에 쓴다(Chromium 이 샌드박스에서 안 돌면 **스크립트만** 쓰고 리드가 돌린다). 화면 상한은 그 값을 쓰는 상수 하나로, 지금은 180 을 두고 «임시» 주석.
6. `/dev/print-check` 에 실제 성적표 인쇄 항목(대기).

## 2. 하지 않을 것
- DB 스키마 · 마이그레이션 변경 · 공유 DB 접속 · 버킷 만들기(있다).
- 에이와 쪽 일(첨부 · 발송) · 통로를 켜기.
- 재시험 성적 연결(원기록 연결이 없다 — 지금처럼 빈칸).

## 3. 끝맺음
- 시험: 관련 `npx vitest run` · `npm run type-check` · 바꾼 파일 eslint · `npm run lint:affordance` · `devPageGuardCoverage` · `errorLogRouteCoverage`.
- 계획서 §14 아래 `#### 14.5 실제 화면 · 확정 쓰기 (codex)` — 한 것 · 시험 · 확신 없는 곳.
- 마지막 답에 바꾼 파일 목록 · 시험 결과 · 리드가 돌려야 하는 것(Chromium · 실측).
