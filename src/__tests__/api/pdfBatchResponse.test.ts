// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PDF_RESPONSE_MAX_BYTES } from "@/lib/export/pdfLimits";
const mocks = vi.hoisted(() => ({ build: vi.fn() }));
vi.mock("@/lib/export/pdfServer", async (original) => ({
  ...(await original<typeof import("@/lib/export/pdfServer")>()),
  buildPdf: mocks.build,
}));
vi.mock("@/lib/export/request", async (original) => ({
  ...(await original<typeof import("@/lib/export/request")>()),
  authorizeExport: vi.fn(async () => null),
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (
    _path: string,
    handler: (request: Request) => Promise<Response>,
  ) => handler,
}));
import { POST } from "@/app/api/exports/pdf/route";
describe("bounded PDF responses", () => {
  it.each([PDF_RESPONSE_MAX_BYTES, PDF_RESPONSE_MAX_BYTES + 1])(
    "bounds generated %i-byte documents before platform rejection",
    async (size) => {
      mocks.build.mockResolvedValue(new Uint8Array(size));
      const response = await POST(
        new Request("https://math.example/api/exports/pdf", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ html: "<article>문항</article>" }),
        }),
      );
      expect(response.headers.get("cache-control")).toContain("no-store");
      if (size > PDF_RESPONSE_MAX_BYTES) {
        expect(response.status).toBe(413);
        expect(await response.json()).toHaveProperty("error");
      } else {
        expect(response.status).toBe(200);
        expect((await response.arrayBuffer()).byteLength).toBe(size);
      }
    },
  );
});
