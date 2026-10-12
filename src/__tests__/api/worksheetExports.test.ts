// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gunzipSync } from "node:zlib";
import { authorizeExport } from "@/lib/export/request";
import { POST } from "@/app/api/exports/hwpx/route";

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/export/hwpxServer", async (original) => ({
  ...(await original<typeof import("@/lib/export/hwpxServer")>()),
  buildHwpxParts: vi.fn(async () => ({
    mimetype: "application/hwp+zip",
    "Contents/section0.xml": "<native/>",
  })),
}));
const request = (body = "{}", origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/exports/hwpx", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin,
      "content-type": "application/json",
    },
    body,
  });
beforeEach(() => {
  mocks.session.mockResolvedValue(null);
  vi.stubEnv("NODE_ENV", "development");
});
afterEach(() => vi.unstubAllEnvs());

describe("worksheet export routes", () => {
  it("allows English library output only at the two shared POST endpoints", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.session.mockResolvedValue({
      id: "owner",
      menus: ["english-library"],
    });
    expect(await authorizeExport(request())).toBeNull();
    const pdf = new Request("http://localhost:3000/api/exports/pdf", request());
    expect(await authorizeExport(pdf)).toBeNull();
    const other = new Request(
      "http://localhost:3000/api/exports/other",
      request(),
    );
    expect((await authorizeExport(other))?.status).toBe(403);
    expect(
      (await authorizeExport(request("{}", "https://evil.example")))?.status,
    ).toBe(403);
  });
  it.each(["development", "production"])(
    "caps authenticated owners and highest admins in %s",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      for (const isSuperAdmin of [false, true]) {
        mocks.session.mockResolvedValue({
          id: "owner",
          isAdmin: true,
          isSuperAdmin,
          menus: [],
        });
        expect((await POST(request()))?.status).toBe(403);
        mocks.session.mockResolvedValue({
          id: "owner",
          isAdmin: true,
          isSuperAdmin,
          menus: ["export"],
        });
        expect(await authorizeExport(request())).toBeNull();
      }
    },
  );
  it("allows only same-origin loopback dev exports without login", async () => {
    expect(await authorizeExport(request())).toBe(null);
    expect(
      (await authorizeExport(request("{}", "https://evil.example")))?.status,
    ).toBe(403);
    vi.stubEnv("NODE_ENV", "production");
    expect((await authorizeExport(request()))?.status).toBe(401);
  });
  it("returns compressed native parts after validation and no-store headers", async () => {
    const response = await POST(
      request(JSON.stringify({ title: "시험지", pages: [{ objects: [] }] })),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const result = await response.json();
    expect(
      JSON.parse(
        gunzipSync(Buffer.from(result.partsGzip, "base64")).toString(),
      ),
    ).toMatchObject({ mimetype: "application/hwp+zip" });
  });
  it("rejects excessive content before parsing or generation", async () => {
    const req = request();
    req.headers.set("content-length", "3500001");
    const response = await POST(req);
    expect(response.status).toBe(422);
    expect((await response.json()).error).toContain("너무 큽니다");
  });
});
