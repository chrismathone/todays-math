// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { examReportDaySchema } from "@/contracts/eywaExamReport.contract";
import {
  createExamReportFeed,
  eligibleExamReports,
  examReportSnapshotDigest,
} from "@/lib/eywa/managedExamReports";
import { unavailableExamReportSource } from "@/lib/examReport/confirmedSource";
import {
  reportBinding,
  reportCandidate,
  reportId,
  reportPdf,
} from "../helpers/examReportFeedFixture";

const date = "2026-10-24";
describe("에이와 확정 성적표", () => {
  it("학생·발행본 한 항목과 지문을 반환한다. 0점도 확정 응시 결과다", () => {
    const rows = eligibleExamReports(reportBinding, date, [reportCandidate()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].item).toMatchObject({
      publicationId: reportId(3),
      sourceStudentId: "eywa-student-1",
      sourceTestId: reportId(4),
      testDate: date,
    });
    expect(
      examReportDaySchema.parse({
        version: "v1",
        bindingId: reportBinding.id,
        date,
        availability: "ready",
        reports: rows.map((r) => r.item),
      }).reports,
    ).toHaveLength(1);
  });

  it.each([
    "draft",
    "absent",
    "ungraded",
    "unlinked",
    "test-student",
    "prediction",
    "foreign-student",
    "foreign-class",
    "foreign-publication",
    "wrong-day",
    "wrong-test",
  ])("%s는 내보내지 않는다", (kind) => {
    const candidate = reportCandidate();
    switch (kind) {
      case "draft":
        candidate.confirmation!.state = "draft";
        break;
      case "absent":
        candidate.current.report.status = "absent";
        break;
      case "ungraded":
        candidate.current.report.status = "ungraded";
        break;
      case "unlinked":
        candidate.student.eywaStudentId = null;
        break;
      case "test-student":
        candidate.student.isTest = true;
        break;
      case "prediction":
        candidate.test.predictionRunId = reportId(90);
        break;
      case "foreign-student":
        candidate.student.eywaBindingId = reportId(90);
        break;
      case "foreign-class":
        candidate.test.branchId = reportId(90);
        break;
      case "foreign-publication":
        candidate.publicationBranchId = reportId(90);
        break;
      case "wrong-day":
        candidate.current.report.publication.testDate = "2026-10-25";
        break;
      case "wrong-test":
        candidate.test.id = reportId(90);
        break;
    }
    expect(eligibleExamReports(reportBinding, date, [candidate])).toEqual([]);
  });

  it("재채점·원장님 문장 변경은 재확정 전에는 빠지고 재확정하면 새 지문이다", () => {
    const candidate = reportCandidate();
    const original = eligibleExamReports(reportBinding, date, [candidate])[0]
      .item.sha256;
    candidate.current.report.teacherNote =
      "식을 옮긴 뒤 원래 조건에 넣어 확인하세요.";
    expect(eligibleExamReports(reportBinding, date, [candidate])).toEqual([]);
    candidate.confirmation!.snapshot = structuredClone(candidate.current);
    candidate.confirmation!.sourceDigest = examReportSnapshotDigest(
      candidate.current,
    );
    const edited = eligibleExamReports(reportBinding, date, [candidate])[0].item
      .sha256;
    expect(edited).not.toBe(original);
    candidate.current.report.resultId = reportId(70);
    expect(eligibleExamReports(reportBinding, date, [candidate])).toEqual([]);
    candidate.confirmation!.snapshot = structuredClone(candidate.current);
    candidate.confirmation!.sourceDigest = examReportSnapshotDigest(
      candidate.current,
    );
    expect(
      eligibleExamReports(reportBinding, date, [candidate])[0].item.sha256,
    ).not.toBe(edited);
  });

  it("같은 발행본·학생이 두 반 시험에 걸리면 임의로 고르지 않는다", () => {
    const candidate = reportCandidate();
    expect(() =>
      eligibleExamReports(reportBinding, date, [
        candidate,
        structuredClone(candidate),
      ]),
    ).toThrow("ambiguous_report");
  });

  it("DB 초안이 미적용된 기본 소스는 읽기·PDF 생성·DB 질의 없이 빈 목록과 404다", async () => {
    const feed = createExamReportFeed(unavailableExamReportSource);
    expect(await feed.day(reportBinding, date)).toMatchObject({
      availability: "not-installed",
      reports: [],
    });
    await expect(
      feed.pdf(
        reportBinding,
        date,
        reportId(3),
        "eywa-student-1",
        "a".repeat(64),
      ),
    ).rejects.toMatchObject({ code: "report_not_found" });
  });

  it("목록 지문에 맞는 보관 PDF만 반환하고 바이트 해시도 검사한다", async () => {
    const source = {
      readDay: vi.fn(async () => ({
        availability: "ready" as const,
        candidates: [reportCandidate()],
      })),
      readPdf: vi.fn(async () => reportPdf),
    };
    const feed = createExamReportFeed(source);
    const { reports } = await feed.day(reportBinding, date);
    expect(
      await feed.pdf(
        reportBinding,
        date,
        reportId(3),
        "eywa-student-1",
        reports[0].sha256,
      ),
    ).toEqual(reportPdf);
    await expect(
      feed.pdf(
        reportBinding,
        date,
        reportId(3),
        "eywa-student-1",
        "b".repeat(64),
      ),
    ).rejects.toMatchObject({ code: "report_changed" });
    source.readPdf.mockResolvedValue(new TextEncoder().encode("%PDF-tampered"));
    await expect(
      feed.pdf(
        reportBinding,
        date,
        reportId(3),
        "eywa-student-1",
        reports[0].sha256,
      ),
    ).rejects.toMatchObject({ code: "report_pdf_invalid" });
  });

  it("PDF 바이트를 읽는 동안 확정이 풀리면 오래된 PDF를 보내지 않는다", async () => {
    const candidate = reportCandidate();
    const feed = createExamReportFeed({
      readDay: async () => ({ availability: "ready", candidates: [candidate] }),
      readPdf: async () => {
        candidate.current.report.teacherNote = "수정 중";
        return reportPdf;
      },
    });
    const { reports } = await feed.day(reportBinding, date);
    await expect(
      feed.pdf(
        reportBinding,
        date,
        reportId(3),
        "eywa-student-1",
        reports[0].sha256,
      ),
    ).rejects.toMatchObject({ code: "report_changed" });
  });

  it("실재하지 않는 날짜와 지문·학생 식별자 형식을 계약으로 거절한다", async () => {
    const feed = createExamReportFeed(unavailableExamReportSource);
    await expect(feed.day(reportBinding, "2026-02-30")).rejects.toMatchObject({
      code: "invalid_date",
    });
    await expect(
      feed.pdf(reportBinding, date, reportId(3), "eywa-student-1", "bad"),
    ).rejects.toMatchObject({ code: "invalid_report_request" });
  });
});
