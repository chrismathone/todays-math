// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  account: vi.fn(),
  list: vi.fn(),
  student: vi.fn(),
  note: vi.fn(),
  confirm: vi.fn(),
  settings: vi.fn(),
  pdf: vi.fn(),
  print: vi.fn(),
  logs: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({ getAccountAccess: m.account }));
vi.mock("@/lib/errorLog/record", () => ({ recordErrorLog: m.logs }));
vi.mock("@/lib/examReport/server", () => ({
  readExamReportList: m.list,
  readExamReportStudent: m.student,
  saveExamReportNote: m.note,
  confirmExamReport: m.confirm,
  saveExamReportSettings: m.settings,
  readConfirmedExamReportPdf: m.pdf,
  printExamReports: m.print,
}));
import { GET as list } from "@/app/api/exam-reports/[testId]/route";
import {
  GET as student,
  PUT as note,
} from "@/app/api/exam-reports/[testId]/students/[studentId]/route";
import { POST as confirm } from "@/app/api/exam-reports/[testId]/students/[studentId]/confirm/route";
import { GET as pdf } from "@/app/api/exam-reports/[testId]/students/[studentId]/pdf/route";
import { PATCH as settings } from "@/app/api/exam-reports/[testId]/settings/route";
import { POST as print } from "@/app/api/exam-reports/[testId]/print/route";
import {
  ERROR_LOG_ROUTE,
  settleErrorLogWrites,
} from "@/lib/errorLog/withErrorLog";
import { ExamReportError } from "@/lib/examReport/read";
import {
  reportCandidate,
  reportId,
  reportPdf,
} from "../helpers/examReportFeedFixture";
const params = { testId: reportId(4), studentId: reportId(6) };
const context = { params: Promise.resolve(params) };
const methods = [
  [list, "GET", ""],
  [student, "GET", "/students/x"],
  [note, "PUT", "/students/x"],
  [confirm, "POST", "/students/x/confirm"],
  [pdf, "GET", "/students/x/pdf"],
  [settings, "PATCH", "/settings"],
  [print, "POST", "/print"],
] as const;
const request = (method: string, suffix: string, body?: unknown) =>
  new Request(
    `https://math.example.test/api/exam-reports/${params.testId}${suffix}`,
    {
      method,
      ...(body !== undefined
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.account.mockResolvedValue({
    id: reportId(20),
    role: "director",
    approvalStatus: "approved",
    menus: ["export"],
  });
});
describe("실제 성적표 라우트 계약과 원장 관문", () => {
  it("모든 메서드는 로그인·원장·출력 메뉴와 오류 기록을 거친다", async () => {
    for (const [handler, method, suffix] of methods) {
      expect(handler[ERROR_LOG_ROUTE]).toContain("/api/exam-reports/[testId]");
      m.account.mockResolvedValueOnce(null);
      expect((await handler(request(method, suffix), context)).status).toBe(
        401,
      );
      m.account.mockResolvedValueOnce({
        role: "reviewer",
        approvalStatus: "approved",
        menus: ["export"],
      });
      expect((await handler(request(method, suffix), context)).status).toBe(
        403,
      );
      m.account.mockResolvedValueOnce({
        role: "director",
        approvalStatus: "approved",
        menus: [],
      });
      expect((await handler(request(method, suffix), context)).status).toBe(
        403,
      );
    }
    await settleErrorLogWrites();
    expect(m.logs).toHaveBeenCalled();
    expect(m.confirm).not.toHaveBeenCalled();
  });
  it("잘못된 id·본문·긴 문장을 저장 함수에 보내지 않는다", async () => {
    expect(
      (
        await list(request("GET", ""), {
          params: Promise.resolve({ testId: "bad" }),
        })
      ).status,
    ).toBe(400);
    for (const body of [
      { teacherNote: "판 없음" },
      { expectedRevision: 0, teacherNote: "가".repeat(1001) },
      { expectedRevision: 0, teacherNote: "", state: "confirmed" },
    ])
      expect(
        (await note(request("PUT", "/students/x", body), context)).status,
      ).toBe(400);
    expect(
      (await print(request("POST", "/print", { scope: "other" }), context))
        .status,
    ).toBe(400);
    expect(m.note).not.toHaveBeenCalled();
    expect(m.print).not.toHaveBeenCalled();
  });
  it("문장을 포함한 확정·409와 PDF 헤더를 계약대로 반환한다", async () => {
    const report = reportCandidate().current.report;
    const summary = {
      student: report.student,
      gradingStatus: report.status,
      score: report.score,
      wrongCount: 1,
      teacherNote: report.teacherNote,
      revision: 2,
      status: "confirmed",
      confirmedAt: report.takenAt,
    };
    m.confirm.mockResolvedValue({
      report,
      summary,
      options: {},
      classComparison: null,
    });
    const response = await confirm(
      request("POST", "/students/x/confirm", {
        expectedRevision: 1,
        teacherNote: "문장",
      }),
      context,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(m.confirm).toHaveBeenCalledWith(
      expect.anything(),
      params.testId,
      params.studentId,
      { expectedRevision: 1, teacherNote: "문장" },
      "https://math.example.test",
    );
    m.confirm.mockRejectedValueOnce(new ExamReportError(409, "내용 변경"));
    expect(
      (
        await confirm(
          request("POST", "/students/x/confirm", { expectedRevision: 1 }),
          context,
        )
      ).status,
    ).toBe(409);
    m.pdf.mockResolvedValue(reportPdf);
    const download = await pdf(request("GET", "/students/x/pdf"), context);
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await download.arrayBuffer())).toEqual(reportPdf);
    m.print.mockResolvedValue(reportPdf);
    expect((await print(request("POST", "/print", {}), context)).status).toBe(
      200,
    );
    expect(m.print).toHaveBeenCalledWith(
      expect.anything(),
      params.testId,
      { scope: "confirmed", kind: "students" },
      "https://math.example.test",
    );
  });
});
