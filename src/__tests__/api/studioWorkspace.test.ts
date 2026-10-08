// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: async () => null,
}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/unifiedPreview", () => ({
  loadUnifiedBank: vi.fn(),
  UnifiedBankQueryError: class extends Error {},
}));
vi.mock("@/lib/unifiedBankSelection", () => ({
  randomBankResponse: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    class: { count: vi.fn(), findMany: vi.fn() },
    student: { count: vi.fn() },
    unit: { findMany: vi.fn() },
  },
}));
import { getSessionUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import {
  GET as bank,
  POST as scopedBank,
} from "@/app/api/studio/problems/route";
import { POST as randomBank } from "@/app/api/studio/problems/random/route";
import { randomBankResponse } from "@/lib/unifiedBankSelection";
import { GET as overview } from "@/app/api/studio/overview/route";
import { GET as teaching } from "@/app/api/studio/teaching/route";
import { GET as worker } from "@/app/api/studio/pdf-worker/route";
import { GET as asset } from "@/app/api/studio/pdf-assets/[kind]/[filename]/route";
const request = (path: string) =>
  new Request(`https://math.example/api/studio/${path}`);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "owner-17",
    name: "Teacher",
    email: "teacher@example.test",
    isAdmin: false,
  });
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "owner-17", role: "director" },
  });
  vi.mocked(db.class.count).mockResolvedValue(2);
  vi.mocked(db.student.count).mockResolvedValue(3);
  vi.mocked(db.class.findMany).mockResolvedValue([]);
  vi.mocked(db.unit.findMany).mockResolvedValue([]);
  vi.mocked(loadUnifiedBank).mockResolvedValue({
    problems: [],
    total: 0,
    page: 1,
    pageSize: 12,
    grades: [],
    chapters: [],
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("production workspace resources", () => {
  it("uses the same login and origin gate for large scope reads and bounds the body", async () => {
    vi.stubEnv("AUTH_URL", "https://math.example");
    const post = (body: string, origin = "https://math.example") =>
      new Request("https://math.example/api/studio/problems", {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body,
      });
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await scopedBank(post("{}"))).status).toBe(401);
    expect(
      (await scopedBank(post("{}", "https://elsewhere.example"))).status,
    ).toBe(403);
    expect(loadUnifiedBank).not.toHaveBeenCalled();
    const unitIds = Array.from(
      { length: 735 },
      (_, i) => `30000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    ).join(",");
    expect(
      (await scopedBank(post(JSON.stringify({ unitIds, pageSize: "10" }))))
        .status,
    ).toBe(200);
    expect(
      vi.mocked(loadUnifiedBank).mock.calls.at(-1)?.[0]?.get("unitIds"),
    ).toBe(unitIds);
    expect(
      (await scopedBank(post(JSON.stringify({ unitIds: "x".repeat(66_000) }))))
        .status,
    ).toBe(400);
  });
  it("guards random selection by login and same-origin before loading the pool", async () => {
    vi.stubEnv("AUTH_URL", "https://math.example");
    const post = (origin: string) =>
      new Request("https://math.example/api/studio/problems/random", {
        method: "POST",
        headers: { origin },
        body: "{}",
      });
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await randomBank(post("https://math.example"))).status).toBe(401);
    expect((await randomBank(post("https://elsewhere.example"))).status).toBe(
      403,
    );
    expect(randomBankResponse).not.toHaveBeenCalled();
    vi.mocked(randomBankResponse).mockResolvedValueOnce(
      Response.json({ problems: [] }),
    );
    expect((await randomBank(post("https://math.example"))).status).toBe(200);
    expect(randomBankResponse).toHaveBeenCalledOnce();
  });
  it("guards bank, teaching, overview and PDF resources before loading anything", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    for (const get of [bank, overview, teaching, worker])
      expect((await get(request("test"))).status).toBe(401);
    expect(
      (
        await asset(request("pdf-assets/wasm/jbig2.wasm"), {
          params: Promise.resolve({ kind: "wasm", filename: "jbig2.wasm" }),
        })
      ).status,
    ).toBe(401);
    expect(loadUnifiedBank).not.toHaveBeenCalled();
    expect(db.class.count).not.toHaveBeenCalled();
    expect(db.unit.findMany).not.toHaveBeenCalled();
  });
  it("preserves bank filters and scopes teaching overview to the authenticated owner", async () => {
    expect((await bank(request("problems?grade=7&page=2"))).status).toBe(200);
    expect(vi.mocked(loadUnifiedBank).mock.calls[0][0]?.get("page")).toBe("2");
    expect((await overview(request("overview"))).status).toBe(200);
    expect(db.class.count).toHaveBeenCalledWith({
      where: {
        userId: "owner-17",
        eywaBindingId: null,
        OR: [{ branchId: null }],
      },
    });
    expect(db.student.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({
            eywaBindingId: null,
            class: {
              userId: "owner-17",
              eywaBindingId: null,
              OR: [{ branchId: null }],
            },
          }),
        ]),
      }),
    });
    expect(db.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "owner-17",
          eywaBindingId: null,
          OR: [{ branchId: null }],
        },
        take: 3,
      }),
    );
    expect((await teaching(request("teaching"))).status).toBe(200);
  });
  it("D-130: an admin overview counts every class and student; the flagless owner above stays scoped", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "owner-17",
      name: "Teacher",
      email: "teacher@example.test",
      isAdmin: true,
      isSuperAdmin: true,
    });
    expect((await overview(request("overview"))).status).toBe(200);
    expect(db.class.count).toHaveBeenCalledWith({ where: {} });
    expect(db.student.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          expect.objectContaining({ eywaBindingId: null, class: {} }),
        ]),
      }),
    });
    expect(db.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, take: 3 }),
    );
  });
  it("serves the installed PDF worker and actual WASM bytes in production", async () => {
    const script = await worker(request("pdf-worker"));
    expect(script.status).toBe(200);
    expect(script.headers.get("content-type")).toContain("javascript");
    expect((await script.text()).length).toBeGreaterThan(10000);
    const wasm = await asset(request("pdf-assets/wasm/jbig2.wasm"), {
      params: Promise.resolve({ kind: "wasm", filename: "jbig2.wasm" }),
    });
    expect(wasm.status).toBe(200);
    expect(wasm.headers.get("content-type")).toBe("application/wasm");
    expect(wasm.headers.get("cache-control")).toContain("no-store");
    expect([...new Uint8Array(await wasm.arrayBuffer()).slice(0, 4)]).toEqual([
      0, 97, 115, 109,
    ]);
  });
  it.each([
    "../package.json",
    "C:secret.wasm",
    "jbig2.wasm%00",
    "jbig2.wasm/other",
    "jbig2.wasm\n",
  ])("rejects invalid PDF asset name %s", async (filename) => {
    expect(
      (
        await asset(request("pdf-assets/wasm/test"), {
          params: Promise.resolve({ kind: "wasm", filename }),
        })
      ).status,
    ).toBe(404);
  });
});
