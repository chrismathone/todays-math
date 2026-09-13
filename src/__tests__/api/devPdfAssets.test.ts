// @vitest-environment node
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dev/unified/pdf-assets/[kind]/[filename]/route";

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const request = new Request("http://localhost/api/dev/unified/pdf-assets");
const getAsset = (kind: string, filename: string) =>
  GET(request, { params: Promise.resolve({ kind, filename }) });

beforeEach(() => vi.stubEnv("NODE_ENV", "development"));
afterEach(() => vi.unstubAllEnvs());

describe("development PDF.js assets", () => {
  it.each([
    ["cmaps", "UniKS-UTF16-H.bcmap", "application/octet-stream"],
    ["standard_fonts", "FoxitSerif.pfb", "application/octet-stream"],
    ["standard_fonts", "LiberationSans-Regular.ttf", "font/ttf"],
    ["wasm", "jbig2.wasm", "application/wasm"],
    ["wasm", "openjpeg.wasm", "application/wasm"],
    ["wasm", "qcms_bg.wasm", "application/wasm"],
    ["wasm", "quickjs-eval.wasm", "application/wasm"],
    ["wasm", "jbig2_nowasm_fallback.js", "text/javascript; charset=utf-8"],
    ["wasm", "openjpeg_nowasm_fallback.js", "text/javascript; charset=utf-8"],
    ["wasm", "quickjs-eval.js", "text/javascript; charset=utf-8"],
  ])("serves exact installed %s/%s bytes", async (kind, filename, mime) => {
    const expected = await readFile(join(packageRoot, kind, filename));
    const response = await getAsset(kind, filename);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(mime);
    expect(response.headers.get("content-length")).toBe(String(expected.length));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(expected.length).toBeGreaterThan(0);
    expect(Buffer.from(await response.arrayBuffer()).equals(expected)).toBe(true);
  });

  it.each([
    ["cmaps", "missing.bcmap"],
    ["standard_fonts", "missing.ttf"],
    ["wasm", "missing.wasm"],
    ["wasm", "missing.js"],
  ])("returns 404 for missing %s/%s", async (kind, filename) => {
    const response = await getAsset(kind, filename);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it.each([
    ["build", "pdf.worker.mjs"],
    ["iccs", "CGATS001Compat-v2-micro.icc"],
    ["../wasm", "jbig2.wasm"],
    ["..\\wasm", "jbig2.wasm"],
    ["%2e%2e%2fwasm", "jbig2.wasm"],
    ["__proto__", "jbig2.wasm"],
    ["constructor", "jbig2.wasm"],
    ["toString", "jbig2.wasm"],
    ["cmaps", "../wasm/jbig2.wasm"],
    ["wasm", "..\\wasm\\jbig2.wasm"],
    ["wasm", "%2e%2e%2fjbig2.wasm"],
    ["wasm", "%252e%252e%252fjbig2.wasm"],
    ["wasm", "..%5cjbig2.wasm"],
    ["wasm", "/jbig2.wasm"],
    ["wasm", "C:\\jbig2.wasm"],
    ["wasm", "jbig2.wasm:stream"],
    ["wasm", "jbig2.wasm\u0000"],
    ["wasm", "jbig2.wasm\n"],
    ["wasm", "jbig2.wasm\r\n"],
    ["wasm", "jbig2.wasm "],
    ["wasm", "jbig2.wasm."],
    ["wasm", "jbig2..wasm"],
    ["wasm", ".jbig2.wasm"],
    ["wasm", "a".repeat(256) + ".wasm"],
    ["wasm", "package.json"],
    ["wasm", "LICENSE_JBIG2"],
    ["cmaps", "jbig2.wasm"],
    ["standard_fonts", "jbig2_nowasm_fallback.js"],
    ["wasm", ""],
  ])("rejects invalid kind or filename: %s/%s", async (kind, filename) => {
    const response = await getAsset(kind, filename);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it.each(["production", "test", undefined] as const)(
    "returns 404 outside development (%s) before resolving params or files",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const response = await GET(request, {
        get params(): Promise<{ kind: string; filename: string }> {
          throw new Error("Production must not reach asset resolution");
        },
      });
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).toBe("");
    },
  );
});
