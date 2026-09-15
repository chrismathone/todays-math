// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSharedFigureAssetHandler,
  validateSharedFigureBaseUrl,
  type SharedFigureAsset,
} from "@/lib/sharedFigureAssets";

const baseUrl =
  "https://project.supabase.co/storage/v1/object/public/shared-figures/";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPioAAAAASUVORK5CYII=",
  "base64",
);
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
);
function asset(
  originalPath: string,
  bytes: Buffer,
  mimeType: string,
): SharedFigureAsset & { originalPath: string } {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    originalPath,
    sha256,
    size: bytes.length,
    mimeType,
    objectPath: `v1/${sha256}${originalPath}`,
  };
}
const pngAsset = asset("/figures/book/figure.png", png, "image/png");
const svgAsset = asset("/figures-svg/book/figure.svg", svg, "image/svg+xml");
const sourceCommit = "6897d28554fe517ec446f7a230eb6ea06e201901";
function deployment(
  ...entries: (SharedFigureAsset & { originalPath: string })[]
) {
  return {
    schemaVersion: 1,
    sourceCommit,
    entries: Object.fromEntries(
      entries.map(({ originalPath, ...entry }) => [originalPath, entry]),
    ),
  };
}
const manifest = deployment(pngAsset, svgAsset);
function upstream(
  bytes = png,
  headers: HeadersInit = { "Content-Type": "image/png" },
) {
  return new Response(bytes, { headers });
}
function setup(options: { baseUrl?: string; manifest?: unknown } = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(upstream());
  const handler = createSharedFigureAssetHandler({
    baseUrl,
    manifest,
    ...options,
    fetch,
  });
  return { handler, fetch };
}
function context(kind = "figures", path = ["book", "figure.png"]) {
  return { params: Promise.resolve({ kind, path }) };
}
function request(
  method = "GET",
  headers?: HeadersInit,
  path = "/figures/book/figure.png",
) {
  return new Request(`https://app.example${path}`, { method, headers });
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("@/config/shared-figures.manifest.json");
  vi.resetModules();
});

describe("shared figure configuration and allowlist", () => {
  it.each([
    undefined,
    "",
    "http://project.supabase.co/bucket",
    "//project.supabase.co/bucket",
    "https://user:password@project.supabase.co/bucket",
    "https://@project.supabase.co/bucket",
    `${baseUrl}?token=secret`,
    `${baseUrl}?`,
    `${baseUrl}#fragment`,
    `${baseUrl}#`,
    ` ${baseUrl}`,
    `${baseUrl}\n`,
    "https://project.supabase.co/a/../bucket",
    "https://project.supabase.co/a/./bucket",
    "https://project.supabase.co/%2e%2e/bucket",
    "https://project.supabase.co/bucket%2fprivate",
    "https://project.supabase.co\\@evil.example/",
    "https://project.supabase.co//",
    "https://project.supabase.co/a//b",
    "https:///bucket",
  ])("rejects unsafe configured base %s without fetching", async (value) => {
    expect(validateSharedFigureBaseUrl(value)).toBeNull();
    const { handler, fetch } = setup({ baseUrl: value });
    expect((await handler(request(), context())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    baseUrl,
    baseUrl.slice(0, -1),
    "https://project.supabase.co",
    "https://project.supabase.co:8443/assets",
  ])("accepts a fixed HTTPS origin/base directory %s", (value) => {
    expect(validateSharedFigureBaseUrl(value)?.href.endsWith("/")).toBe(true);
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { schemaVersion: 2, sourceCommit, entries: {} },
    { schemaVersion: 1, sourceCommit, entries: [] },
    { schemaVersion: 1, sourceCommit, entries: {} },
    { schemaVersion: 1, entries: manifest.entries },
    { ...manifest, sourceCommit: "invalid" },
  ])("stays off for absent, empty or malformed manifest %#", async (value) => {
    const { handler, fetch } = setup({ manifest: value });
    const response = await handler(request(), {
      get params(): ReturnType<typeof context>["params"] {
        throw new Error("Must stay off before params");
      },
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { originalPath: "/api/library/private.png" },
    { originalPath: "/figures/../private.png" },
    { originalPath: "/figures/a%2fb.png" },
    { originalPath: "/figures/\ud800.png" },
    { originalPath: "//figures/book/figure.png" },
    { originalPath: "/figures/book/figure.html", mimeType: "text/html" },
    { originalPath: "/figures-svg/book/figure.png" },
    { originalPath: "/figures/book/a.constructor" },
    { originalPath: "/figures/book/a.toString" },
    { mimeType: "text/html" },
    { mimeType: "image/svg+xml" },
    { mimeType: "image/png\r\nSet-Cookie: bad" },
    { sha256: "a".repeat(63) },
    { sha256: "A".repeat(64) },
    { size: 0 },
    { size: -1 },
    { size: 1.5 },
    { size: Number.MAX_SAFE_INTEGER + 1 },
    { size: "68" },
    { objectPath: `https://evil.example/${pngAsset.sha256}.png` },
    { objectPath: `//evil.example/${pngAsset.sha256}.png` },
    { objectPath: `../${pngAsset.sha256}.png` },
    { objectPath: `a/./${pngAsset.sha256}.png` },
    { objectPath: `a\\${pngAsset.sha256}.png` },
    { objectPath: `a%2f${pngAsset.sha256}.png` },
    { objectPath: `${pngAsset.sha256}.png?download=1` },
    { objectPath: `${pngAsset.sha256}.png#x` },
    { objectPath: "mutable/figure.png" },
    { objectPath: null },
  ])("rejects the entire malformed manifest %#", async (patch) => {
    const { handler, fetch } = setup({
      manifest: deployment(svgAsset, {
        ...pngAsset,
        ...patch,
      } as SharedFigureAsset & { originalPath: string }),
    });
    expect((await handler(request(), context())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a malformed entry alongside a valid entry", async () => {
    const { handler, fetch } = setup({
      manifest: {
        ...manifest,
        entries: { ...manifest.entries, "/figures/bad.png": null },
      },
    });
    expect((await handler(request(), context())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["private", ["figure.png"]],
    ["library", ["figure.png"]],
    ["__proto__", ["figure.png"]],
    ["figures", ["missing.png"]],
    ["figures", []],
    ["figures", ["..", "figure.png"]],
    ["figures", ["book", "../figure.png"]],
    ["figures", ["book/figure.png"]],
    ["figures", ["book\\figure.png"]],
    ["figures", ["book%2ffigure.png"]],
    ["figures", ["%252e%252e", "figure.png"]],
    ["figures", ["book", "figure.png\u0000"]],
    ["figures", ["book", "figure.png?url=https://evil.example"]],
    ["figures", ["book", "figure.png#x"]],
    ["figures", ["book", "figure.png:stream"]],
    ["figures", ["book", " figure.png"]],
  ])("does not fetch missing or invalid params %s/%s", async (kind, path) => {
    const { handler, fetch } = setup();
    const response = await handler(
      request(),
      context(kind as string, path as string[]),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    "/figures/book%2ffigure.png",
    "/figures/book%5cfigure.png",
    "/figures/%252fbook/figure.png",
    "/figures/%2e%2e/book/figure.png",
    "/figures/../book/figure.png",
    "/figures/./book/figure.png",
    "/figures//book/figure.png",
    "/figures/%zz/book/figure.png",
    "/figures/book/figure.png%00",
  ])(
    "rejects unsafe raw URL even with valid rewritten params %s",
    async (path) => {
      const { handler, fetch } = setup();
      const input = request();
      // Preserve the raw form which URL/Request constructors normalize before a handler.
      Object.defineProperty(input, "url", {
        value: `https://app.example${path}`,
      });
      expect((await handler(input, context())).status).toBe(404);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});

describe("verified same-origin byte delivery", () => {
  it.each([
    "/figures/book/figure.png",
    "/api/shared-figures/figures/book/figure.png",
  ])("serves allowlisted PNG bytes through %s", async (path) => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(
      upstream(png, {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: "untrusted",
        "Set-Cookie": "private=bad",
      }),
    );
    const response = await handler(
      request(
        "GET",
        {
          Cookie: "secret=session",
          Authorization: "Bearer secret",
          Range: "bytes=0-1",
        },
        path,
      ),
      context(),
    );
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe(String(png.length));
    expect(response.headers.get("etag")).toBe(`"sha256-${pngAsset.sha256}"`);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, s-maxage=300, must-revalidate",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `${baseUrl}${pngAsset.objectPath}`,
      {
        method: "GET",
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "image/png", "Accept-Encoding": "identity" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("serves SVG with manifest MIME and restricts active document content", async () => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(
      upstream(svg, { "Content-Type": "IMAGE/SVG+XML; charset=utf-8" }),
    );
    const response = await handler(
      request("GET", undefined, svgAsset.originalPath),
      context("figures-svg", ["book", "figure.svg"]),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(svg.toString());
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
  });

  it("uses the fixed manifest key even when query/header values supply an arbitrary URL", async () => {
    const { handler, fetch } = setup();
    const response = await handler(
      request(
        "GET",
        { Host: "evil.example", "X-Forwarded-Host": "evil.example" },
        `${pngAsset.originalPath}?url=https://evil.example/private&path=../private`,
      ),
      context(),
    );
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe(`${baseUrl}${pngAsset.objectPath}`);
  });

  it("supports manifest-listed Unicode and spaces without double decoding", async () => {
    const entry = asset("/figures/교재 이름/figure.png", png, "image/png");
    const { handler } = setup({ manifest: deployment(entry) });
    const response = await handler(
      request(
        "GET",
        undefined,
        "/figures/%EA%B5%90%EC%9E%AC%20%EC%9D%B4%EB%A6%84/figure.png",
      ),
      context("figures", ["교재 이름", "figure.png"]),
    );
    expect(response.status).toBe(200);
  });

  it("verifies HEAD bytes upstream and returns GET metadata without a body", async () => {
    const { handler, fetch } = setup();
    const response = await handler(request("HEAD"), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe(String(png.length));
    expect(response.headers.get("etag")).toBe(`"sha256-${pngAsset.sha256}"`);
    expect(await response.text()).toBe("");
    expect(fetch.mock.calls[0][1]?.method).toBe("GET");
  });

  it.each([
    `"sha256-${pngAsset.sha256}"`,
    `W/"sha256-${pngAsset.sha256}"`,
    `"other", W/"sha256-${pngAsset.sha256}"`,
    "*",
  ])(
    "returns 304 only after verified bytes for If-None-Match %s",
    async (etag) => {
      const { handler, fetch } = setup();
      const response = await handler(
        request("GET", { "If-None-Match": etag }),
        context(),
      );
      expect(response.status).toBe(304);
      expect(response.headers.get("etag")).toBe(`"sha256-${pngAsset.sha256}"`);
      expect(response.headers.has("content-length")).toBe(false);
      expect(await response.text()).toBe("");
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it("returns the current bytes for a stale ETag", async () => {
    const { handler } = setup();
    const response = await handler(
      request("GET", { "If-None-Match": '"sha256-old"' }),
      context(),
    );
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "does not fetch for unsupported %s",
    async (method) => {
      const { handler, fetch } = setup();
      expect((await handler(request(method), context())).status).toBe(405);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});

describe("upstream failures never deliver unverified bytes", () => {
  it.each([
    201, 204, 206, 301, 302, 307, 308, 400, 401, 403, 404, 429, 500, 503,
  ])("returns empty uncached 502 for upstream status %s", async (status) => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(
      new Response(status === 204 ? null : "private upstream error", {
        status,
        headers: { Location: "https://evil.example", "Set-Cookie": "bad=1" },
      }),
    );
    const response = await handler(request(), context());
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(await response.text()).toBe("");
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each<Record<string, string>>([
    {},
    { "Content-Type": "text/html" },
    { "Content-Type": "image/jpeg" },
    { "Content-Type": "image/png", "Content-Length": "1" },
    { "Content-Type": "image/png", "Content-Length": "invalid" },
    { "Content-Type": "image/png", "Content-Encoding": "gzip" },
  ])("rejects inconsistent upstream metadata %#", async (headers) => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(upstream(png, headers));
    expect((await handler(request(), context())).status).toBe(502);
  });

  it.each(["GET", "HEAD"])(
    "rejects size and hash mismatch for %s, even with matching ETag",
    async (method) => {
      for (const bytes of [
        png.subarray(1),
        Buffer.concat([png, Buffer.from("x")]),
        Buffer.alloc(png.length),
      ]) {
        const { handler, fetch } = setup();
        fetch.mockResolvedValueOnce(upstream(bytes));
        const response = await handler(
          request(method, { "If-None-Match": `"sha256-${pngAsset.sha256}"` }),
          context(),
        );
        expect(response.status).toBe(502);
        expect(await response.text()).toBe("");
      }
    },
  );

  it("cancels an oversized streamed body before reading the rest", async () => {
    const { handler, fetch } = setup();
    const cancel = vi.fn();
    fetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(png.length + 1));
          },
          cancel,
        }),
        { headers: { "Content-Type": "image/png" } },
      ),
    );
    expect((await handler(request(), context())).status).toBe(502);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("verifies an exact body split across chunks without trusting Content-Length", async () => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(png.subarray(0, 8));
            controller.enqueue(png.subarray(8));
            controller.close();
          },
        }),
        { headers: { "Content-Type": "image/png" } },
      ),
    );
    const response = await handler(request(), context());
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  });

  it("rejects a missing response body", async () => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(
      new Response(null, { headers: { "Content-Type": "image/png" } }),
    );
    expect((await handler(request(), context())).status).toBe(502);
  });

  it.each(["redirected", "url"])(
    "rejects an unexpectedly followed redirect (%s)",
    async (property) => {
      const { handler, fetch } = setup();
      const redirected = upstream();
      Object.defineProperty(redirected, property, {
        value:
          property === "redirected" ? true : "https://evil.example/figure.png",
      });
      fetch.mockResolvedValueOnce(redirected);
      expect((await handler(request(), context())).status).toBe(502);
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it.each([
    new Error("private DNS details"),
    new DOMException("Timed out", "TimeoutError"),
    new TypeError("fetch failed"),
  ])("returns empty 502 for fetch errors %#", async (error) => {
    const { handler, fetch } = setup();
    fetch.mockRejectedValueOnce(error);
    const response = await handler(request(), context());
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("");
  });

  it("returns 502 if the body stream errors", async () => {
    const { handler, fetch } = setup();
    fetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error("connection reset"));
          },
        }),
        { headers: { "Content-Type": "image/png" } },
      ),
    );
    expect((await handler(request(), context())).status).toBe(502);
  });
});

describe("Next shared-figures route exports", () => {
  it("stays off with an empty statically imported deployment manifest", async () => {
    vi.stubEnv("SHARED_FIGURE_CDN_BASE_URL", baseUrl);
    vi.doMock("@/config/shared-figures.manifest.json", () => ({
      default: deployment(),
    }));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { GET, HEAD, runtime } =
      await import("@/app/api/shared-figures/[kind]/[...path]/route");
    expect(runtime).toBe("nodejs");
    expect((await GET(request(), context())).status).toBe(404);
    expect((await HEAD(request("HEAD"), context())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stays off without the configured base even with an active manifest", async () => {
    vi.stubEnv("SHARED_FIGURE_CDN_BASE_URL", undefined);
    vi.doMock("@/config/shared-figures.manifest.json", () => ({
      default: manifest,
    }));
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { GET } =
      await import("@/app/api/shared-figures/[kind]/[...path]/route");
    expect((await GET(request(), context())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("delivers mocked verified bytes through GET and HEAD when activated", async () => {
    vi.stubEnv("SHARED_FIGURE_CDN_BASE_URL", baseUrl);
    vi.doMock("@/config/shared-figures.manifest.json", () => ({
      default: manifest,
    }));
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(upstream()));
    vi.stubGlobal("fetch", fetch);
    const { GET, HEAD } =
      await import("@/app/api/shared-figures/[kind]/[...path]/route");
    const get = await GET(request(), context());
    const head = await HEAD(request("HEAD"), context());
    expect(get.status).toBe(200);
    expect(Buffer.from(await get.arrayBuffer())).toEqual(png);
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe(String(png.length));
    expect(await head.text()).toBe("");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
