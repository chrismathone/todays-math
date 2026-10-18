# 월말평가 성적표 확정 · PDF 보관 — 초안 (적용본으로 대체됨)

2026-10-18 원장님 승인 · **공유 DB 에 적용됨** — 정본은 `prisma/migrations/20261018150000_exam_report_confirmation/migration.sql`.
이 폴더의 `draft.sql` 은 검토 이력이다. 적용본에서 바뀐 것:

- PDF 바이트를 DB 에 넣지 않는다 — 비공개 버킷 `exam-report-private`(PDF 만 · 4MB)에 두고 `pdf_path` · `pdf_sha256` · `pdf_size` 만 적는다(원장님 승인).
- 기존 표(`test` · `test_result`)에 고유 색인 · 트리거를 더하지 않는다 — 재채점은 읽을 때 지문으로 가린다(`managedExamReports.ts`).
- `branch_id` 는 발행본처럼 비어도 된다(SET NULL). 원장님 문장 1000자 CHECK(화면 상한은 지면 실측으로 따로).

적용 · 확인: `scripts/qa/apply-exam-report-migration.ts`(드라이런 기본) · 버킷 `scripts/qa/create-exam-report-bucket.mts` · 제약 · 트리거 시험 `src/__tests__/unit/examReportMigration.test.ts`(PGlite).
