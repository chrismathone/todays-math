// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  tests: vi.fn(),
  artifact: vi.fn(),
  context: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    test: { findMany: m.tests },
    examReportArtifact: { findUnique: m.artifact },
  },
}));
vi.mock("@/lib/examReport/read", async (original) => ({
  ...(await original<typeof import("@/lib/examReport/read")>()),
  loadExamReportContext: m.context,
}));
vi.mock("@/lib/examReport/storage", () => ({
  examReportStorage: () => ({ read: m.read }),
}));
import { confirmedExamReportSource } from "@/lib/examReport/confirmedSource";
import { createExamReportFeed } from "@/lib/eywa/managedExamReports";
import {
  reportBinding,
  reportCandidate,
  reportPdf,
} from "../helpers/examReportFeedFixture";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EXAM_REPORT_EYWA_FEED", "");
});
afterEach(() => vi.unstubAllEnvs());
describe("실제 에이와 성적표 소스의 닫힌 기본값", () => {
  it.each(["", "off", "ON", "unknown"])(
    "%s에서는 DB·버킷 없이 not-installed와 PDF 404가 된다",
    async (flag) => {
      vi.stubEnv("EXAM_REPORT_EYWA_FEED", flag);
      const feed = createExamReportFeed(confirmedExamReportSource);
      expect(await feed.day(reportBinding, "2026-10-24")).toMatchObject({
        availability: "not-installed",
        reports: [],
      });
      expect(
        await confirmedExamReportSource.readPdf(
          reportCandidate().confirmation!.id,
        ),
      ).toBeNull();
      expect(m.tests).not.toHaveBeenCalled();
      expect(m.artifact).not.toHaveBeenCalled();
      expect(m.read).not.toHaveBeenCalled();
    },
  );
  it("on일 때만 현재 확정 보관본을 읽고 첫 연동은 학원이 한 명으로 제한한다", async () => {
    vi.stubEnv("EXAM_REPORT_EYWA_FEED", "on");
    const candidate = reportCandidate();
    const archived = {
      ...candidate.confirmation!,
      confirmedAt: new Date(candidate.confirmation!.confirmedAt),
      pdfPath: "path",
    };
    const student = { ...candidate.student, name: "학원이" };
    const entry = {
      student,
      summary: { status: "confirmed" },
      snapshot: candidate.current,
      draft: { confirmedArtifact: archived },
    };
    m.tests.mockResolvedValue([{ id: candidate.test.id }]);
    m.context.mockResolvedValue({
      test: {
        ...candidate.test,
        publication: { branchId: candidate.publicationBranchId },
        class: {
          eywaClassId: candidate.test.sourceClassId,
          eywaBindingId: candidate.test.eywaBindingId,
          branchId: candidate.test.branchId,
        },
      },
      entries: [
        entry,
        { ...entry, student: { ...student, name: "다른 학생" } },
        { ...entry, summary: { status: "stale" } },
      ],
    });
    expect(
      (await confirmedExamReportSource.readDay(reportBinding, "2026-10-24"))
        .candidates,
    ).toHaveLength(1);
    expect(
      (
        await createExamReportFeed(confirmedExamReportSource).day(
          reportBinding,
          "2026-10-24",
        )
      ).reports,
    ).toHaveLength(1);
    m.artifact.mockResolvedValue(archived);
    m.read.mockResolvedValue(reportPdf);
    expect(await confirmedExamReportSource.readPdf(archived.id)).toEqual(
      reportPdf,
    );
    expect(m.read).toHaveBeenCalledWith({
      path: "path",
      size: archived.pdfSize,
      sha256: archived.pdfSha256,
    });
  });
});
