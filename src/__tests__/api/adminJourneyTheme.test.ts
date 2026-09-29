// @vitest-environment node
/** 진도판 테마(학원 전체 한 벌) — 관리자만 읽고 바꾼다 · 모르는 테마는 400 · 바꾸면 감사 기록. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  admin: true,
  adminOnlyAsked: [] as boolean[],
  stored: null as { theme: string; updatedAt: string | null } | null,
  write: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: vi.fn(async (_request: Request, adminOnly?: boolean) => {
    state.adminOnlyAsked.push(!!adminOnly);
    return state.admin
      ? { account: { id: "10000000-0000-4000-8000-000000000001" }, response: null }
      : {
          account: null,
          response: Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 }),
        };
  }),
}));
vi.mock("@/lib/journeyThemeStore", () => ({
  readJourneyTheme: vi.fn(async () => state.stored ?? { theme: "classic", updatedAt: null }),
  writeJourneyTheme: state.write,
}));
vi.mock("@/lib/audit", () => ({ recordAudit: state.audit }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));

import { GET, PUT } from "@/app/api/admin/journey-theme/route";
import { journeyThemeResponseSchema } from "@/contracts/journeyTheme.contract";

const put = (body: unknown) =>
  PUT(
    new Request("http://localhost/api/admin/journey-theme", {
      method: "PUT",
      headers: { origin: "http://localhost", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.admin = true;
  state.adminOnlyAsked = [];
  state.stored = null;
  state.write.mockImplementation(async (theme: string) => ({
    theme,
    updatedAt: "2026-09-30T02:00:00.000Z",
  }));
});

describe("GET /api/admin/journey-theme", () => {
  it("returns the classic board before anyone chooses", async () => {
    const res = await GET(new Request("http://localhost/api/admin/journey-theme"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(journeyThemeResponseSchema.parse(await res.json())).toEqual({
      data: { theme: "classic", updatedAt: null },
    });
    expect(state.adminOnlyAsked).toEqual([true]);
  });

  it("refuses a non-admin", async () => {
    state.admin = false;
    const res = await GET(new Request("http://localhost/api/admin/journey-theme"));
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/admin/journey-theme", () => {
  it("saves a known theme, records who changed it, and answers with the contract", async () => {
    const res = await put({ theme: "sky" });
    expect(res.status).toBe(200);
    expect(journeyThemeResponseSchema.parse(await res.json())).toEqual({
      data: { theme: "sky", updatedAt: "2026-09-30T02:00:00.000Z" },
    });
    expect(state.write).toHaveBeenCalledWith(
      "sky",
      "10000000-0000-4000-8000-000000000001",
    );
    expect(state.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "10000000-0000-4000-8000-000000000001",
        action: "admin.journey_theme_changed",
      }),
    );
    expect(state.adminOnlyAsked).toEqual([true]);
  });

  it("rejects an unknown theme and extra fields without writing", async () => {
    expect((await put({ theme: "castle" })).status).toBe(400);
    expect((await put({ theme: "sky", branchId: "x" })).status).toBe(400);
    expect(state.write).not.toHaveBeenCalled();
  });

  it("refuses a non-admin without writing", async () => {
    state.admin = false;
    expect((await put({ theme: "sky" })).status).toBe(403);
    expect(state.write).not.toHaveBeenCalled();
  });
});
