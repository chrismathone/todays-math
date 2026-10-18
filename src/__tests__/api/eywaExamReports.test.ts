// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  binding: {} as object,
  readDay: vi.fn(),
  readPdf: vi.fn(),
  logs: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { eywaBinding: { findUnique: async () => m.binding } },
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: vi.fn(),
}));
vi.mock("@/lib/errorLog/record", () => ({ recordErrorLog: m.logs }));
vi.mock("@/lib/examReport/confirmedSource", () => ({
  confirmedExamReportSource: { readDay: m.readDay, readPdf: m.readPdf },
}));

import { GET as list } from "@/app/api/integrations/eywa/v2/exam-reports/[date]/route";
import { GET as pdf } from "@/app/api/integrations/eywa/v2/exam-reports/[date]/[publicationId]/[sourceStudentId]/route";
import { settleErrorLogWrites } from "@/lib/errorLog/withErrorLog";
import { signedHeaders, type BindingConfig } from "@/lib/eywa/sync-contract";
import {
  reportBinding,
  reportCandidate,
  reportId,
  reportPdf,
} from "../helpers/examReportFeedFixture";

const date = "2026-10-24";
const config: BindingConfig = {
  bindingId: reportBinding.id,
  tenantId: reportId(80),
  targetBranchId: reportBinding.targetBranchId,
  sourceBaseUrl: "https://eywa.example.test",
  targetBaseUrl: "https://math.example.test",
  keyId: "fixture",
  controlSecret: "c".repeat(32),
  webhookSecret: "w".repeat(32),
  ssoSecret: "s".repeat(32),
};
const listPath = `/api/integrations/eywa/v2/exam-reports/${date}?bindingId=${config.bindingId}`;
const listContext = { params: Promise.resolve({ date }) };
const pdfContext = {
  params: Promise.resolve({
    date,
    publicationId: reportId(3),
    sourceStudentId: "eywa-student-1",
  }),
};
const request = (path: string, signed = true) =>
  new Request(config.targetBaseUrl + path, {
    headers: signed ? signedHeaders(config, "webhook", "GET", path) : {},
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EYWA_SYNC_BINDINGS_JSON", JSON.stringify([config]));
  vi.stubEnv("EYWA_SYNC_AUTO_JSON", "");
  m.binding = {
    id: config.bindingId,
    tenantId: config.tenantId,
    targetBranchId: config.targetBranchId,
    enabled: true,
    healthy: true,
    mode: "active",
    retiredAt: null,
    leaseExpiresAt: new Date(Date.now() + 60_000),
  };
  m.readDay.mockResolvedValue({
    availability: "ready",
    candidates: [reportCandidate()],
  });
  m.readPdf.mockResolvedValue(reportPdf);
});
afterEach(async () => {
  await settleErrorLogWrites();
  vi.unstubAllEnvs();
});

describe("에이와 성적표 서명 통로", () => {
  it("PDF를 읽는 동안 연결의 대상 지점이 달라지면 보내지 않는다", async () => {
    const body = await (await list(request(listPath), listContext)).json();
    m.readPdf.mockImplementationOnce(async () => {
      m.binding = { ...m.binding, targetBranchId: reportId(99) };
      return reportPdf;
    });
    const path = `/api/integrations/eywa/v2/exam-reports/${date}/${reportId(3)}/eywa-student-1?bindingId=${config.bindingId}&sha256=${body.reports[0].sha256}`;
    expect((await pdf(request(path), pdfContext)).status).toBe(409);
  });
  it("진짜 verifyReceiverRequest로 서명한 목록과 PDF를 주며 캐시하지 않는다", async () => {
    const response = await list(request(listPath), listContext);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    const path = `/api/integrations/eywa/v2/exam-reports/${date}/${reportId(3)}/eywa-student-1?bindingId=${config.bindingId}&sha256=${body.reports[0].sha256}`;
    const file = await pdf(request(path), pdfContext);
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("application/pdf");
    expect(file.headers.get("content-disposition")).toContain(
      "exam-report.pdf",
    );
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(reportPdf);
  });

  it("미적용 저장소는 빈 목록·PDF 404다 — PDF 생성기를 부르지 않는다", async () => {
    m.readDay.mockResolvedValue({
      availability: "not-installed",
      candidates: [],
    });
    expect(
      await (await list(request(listPath), listContext)).json(),
    ).toMatchObject({ availability: "not-installed", reports: [] });
    const path = `/api/integrations/eywa/v2/exam-reports/${date}/${reportId(3)}/eywa-student-1?bindingId=${config.bindingId}&sha256=${"a".repeat(64)}`;
    const response = await pdf(request(path), pdfContext);
    expect(response.status).toBe(404);
    expect(m.readPdf).not.toHaveBeenCalled();
  });

  it("서명 없음·경로/질의 변조·다른 binding은 내용을 읽기 전에 거절한다", async () => {
    expect((await list(request(listPath, false), listContext)).status).toBe(
      409,
    );
    const tampered = request(listPath);
    expect(
      (
        await list(
          new Request(tampered.url.replace(date, "2026-10-25"), {
            headers: tampered.headers,
          }),
          listContext,
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await list(
          request(listPath.replace(config.bindingId, reportId(99))),
          listContext,
        )
      ).status,
    ).toBe(409);
    expect(m.readDay).not.toHaveBeenCalled();
  });

  it("꺼진 연결을 빈 목록으로 위장하지 않으며 실패에 오류 기록을 붙인다", async () => {
    m.binding = { ...m.binding, enabled: false };
    const response = await list(request(listPath), listContext);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "binding_inactive" },
    });
    expect(response.headers.get("x-error-log-id")).toBeTruthy();
    await settleErrorLogWrites();
    expect(m.logs).toHaveBeenCalled();
    expect(m.readDay).not.toHaveBeenCalled();
  });
});
