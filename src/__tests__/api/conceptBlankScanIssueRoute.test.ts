// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  issue: vi.fn(),
  render: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/concept-blank/scan/database.server", () => ({
  scanDatabase: { fakeLocal: true },
}));
vi.mock("@/lib/concept-blank/scan/issuance", async () => ({
  ...(await vi.importActual("@/lib/concept-blank/scan/issuance")),
  issueScanPaper: mocks.issue,
}));
vi.mock("@/lib/concept-blank/scan/paper.server", () => ({
  renderScanPaper: mocks.render,
}));
import { POST } from "@/app/api/concept-blank/scan/issued/route";
import { ScanUnavailableError } from "@/lib/concept-blank/scan/database";
const teacher = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    role: "director",
    approvalStatus: "approved",
    menus: ["conceptBlank"],
  },
};
const student = {
  student: {
    studentId: "00000000-0000-4000-8000-000000000002",
    mustChangePassword: false,
  },
};
const payload = {
  requestId: "00000000-0000-4000-8000-000000000003",
  selection: {
    sections: ["초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기"],
    forms: [
      {
        form: "term",
        counts: { 하: 1, 중: 0, 상: 0 },
        extras: { 하: 0, 중: 0, 상: 0 },
      },
    ],
  },
};
const request = (
  body: unknown = payload,
  origin = "https://today.aywa.co.kr",
) =>
  new Request("https://today.aywa.co.kr/api/concept-blank/scan/issued", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  // 로컬 `.env` 의 AUTH_URL 이 같은 출처 검사에 섞이지 않게.
  vi.stubEnv("AUTH_URL", "https://today.aywa.co.kr");
  vi.stubEnv("NEXTAUTH_URL", "");
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(teacher);
  mocks.issue.mockResolvedValue({ id: payload.requestId });
});
describe("issued scan paper HTTP boundary", () => {
  it.each([
    null,
    student,
    { user: { ...teacher.user, role: "reviewer" } },
    { user: { ...teacher.user, menus: [] } },
  ])(
    "refuses unauthorized actors before rendering/persistence: %j",
    async (session) => {
      mocks.auth.mockResolvedValue(session);
      const response = await POST(request());
      expect([401, 403]).toContain(response.status);
      expect(mocks.issue).not.toHaveBeenCalled();
      expect(mocks.render).not.toHaveBeenCalled();
    },
  );
  it("refuses cross-origin writes and caller-supplied layout/answer payloads", async () => {
    expect((await POST(request(payload, "https://evil.example"))).status).toBe(
      403,
    );
    expect(
      (await POST(request({ ...payload, layout: { forged: true } }))).status,
    ).toBe(400);
    expect(mocks.issue).not.toHaveBeenCalled();
  });
  it("uses the authenticated teacher and the trusted renderer, and returns no answers", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ data: { id: payload.requestId } });
    expect(mocks.issue.mock.calls[0][0]).toEqual({
      kind: "teacher",
      id: teacher.user.id,
    });
    expect(mocks.issue.mock.calls[0][2].render).toBeTypeOf("function");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("returns an actionable 503 when the additive tables are not deployed", async () => {
    mocks.issue.mockRejectedValueOnce(new ScanUnavailableError());
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error.message).toMatch(/DB 적용/);
  });
  it("counts streamed bytes even without Content-Length", async () => {
    const response = await POST(request({ junk: "x".repeat(1_500_001) }));
    expect(response.status).toBe(413);
    expect(mocks.issue).not.toHaveBeenCalled();
  });
});
