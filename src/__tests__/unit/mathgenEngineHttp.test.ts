// @vitest-environment node
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { request } from "node:http";
import { gzipSync } from "node:zlib";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, passthrough } from "msw";
import { server } from "@/mocks/server";
import catalog from "../../../scripts/figure/engine-catalog.json";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";
import { engineEndpoint, requestEngine } from "@/lib/mathgen-engine/transport";

vi.mock("server-only", () => ({}));
const secret = "integration-only-engine-secret";
let python: ChildProcess;
let origin: string;
const payload = HwpxPayloadSchema.parse({
  title: "수식과 그림",
  pages: [
    {
      objects: [
        { type: "text", x: 50, y: 120, w: 100, h: 20, text: "계산하시오." },
        {
          type: "equation",
          x: 155,
          y: 120,
          w: 60,
          h: 30,
          latex: "\\frac{1}{2}",
        },
        { type: "image", x: 420, y: 180, w: 100, h: 80, imageId: "image1" },
      ],
    },
  ],
});

beforeAll(async () => {
  python = spawn(
    process.env.PYTHON_BIN ?? "python",
    ["-B", "api/mathgen-engine.py"],
    {
      env: {
        ...process.env,
        STUDIO_ENGINE_SECRET: secret,
        PYTHONIOENCODING: "utf-8",
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  origin = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Python HTTP startup timed out")),
      10000,
    );
    python.once("error", reject);
    python.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Python HTTP startup failed"));
    });
    python.stdout!.once("data", (chunk: Buffer) => {
      clearTimeout(timer);
      resolve(chunk.toString().trim());
    });
  });
});
afterAll(async () => {
  if (python?.exitCode === null) {
    python.kill();
    await once(python, "exit");
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function configure() {
  server.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//, () => passthrough()));
  vi.stubEnv("STUDIO_ENGINE_URL", origin);
  vi.stubEnv("STUDIO_ENGINE_SECRET", secret);
  vi.stubEnv("VERCEL", "");
}
function signed(
  body: string,
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  return {
    "content-type": "application/json",
    "x-mathgen-timestamp": timestamp,
    "x-mathgen-signature": createHmac("sha256", secret)
      .update(`mathgen-engine-v1\n${timestamp}\n`)
      .update(body)
      .digest("hex"),
  };
}

describe("signed Python HTTP engine", () => {
  it("produces the same real SVG and MathJax typesetting as local Python", async () => {
    vi.stubEnv("STUDIO_ENGINE_URL", "");
    vi.stubEnv("VERCEL", "");
    const local = await renderFigureSpec(catalog.v2_example);
    expect(local.ok).toBe(true);
    configure();
    expect(await renderFigureSpec(catalog.v2_example)).toEqual(local);
    const raw = await renderFigureSpec(catalog.v2_example, {
      typeset: false,
      strict: true,
    });
    expect(raw.ok).toBe(true);
    if (raw.ok) expect(raw.svg).toContain("<svg");
  });

  it("returns native editable HWPX parts through bounded gzip transport", async () => {
    configure();
    const parts = await buildHwpxParts(payload);
    expect(parts.mimetype).toBe("application/hwp+zip");
    expect(parts["Contents/section0.xml"]).toContain("계산하시오.");
    expect(parts["Contents/section0.xml"]).toContain("hp:equation");
    expect(parts["Contents/section0.xml"]).toContain("over");
    expect(parts["Contents/content.hpf"]).toContain("BinData/image1.png");
  });

  it.each(["missing", "invalid", "expired", "future", "tampered"])(
    "rejects %s authentication before engine execution",
    async (kind) => {
      configure();
      const body = JSON.stringify({
        operation: "figure",
        payload: catalog.v2_example,
      });
      const headers = signed(
        body,
        String(
          Math.floor(Date.now() / 1000) +
            (kind === "expired" ? -61 : kind === "future" ? 61 : 0),
        ),
      );
      if (kind === "invalid") headers["x-mathgen-signature"] = "a".repeat(64);
      const response = await fetch(`${origin}/api/mathgen-engine`, {
        method: "POST",
        headers: kind === "missing" ? {} : headers,
        body: kind === "tampered" ? body + " " : body,
      });
      expect(response.status).toBe(401);
    },
  );

  it("rejects oversized HTTP bodies and invalid specs", async () => {
    configure();
    // Advertise the oversize body without uploading it: the function must reject
    // before reading. Sending megabytes after an early close can reset the socket.
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(
        `${origin}/api/mathgen-engine`,
        {
          method: "POST",
          headers: { ...signed(""), "content-length": "3500001" },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(413);
    const result = await renderFigureSpec({
      ...catalog.v2_example,
      forbidden: "x",
    });
    expect(result.ok).toBe(false);
    const tooLarge = await renderFigureSpec({
      version: 2,
      labels: { A: "x".repeat(65536) },
    });
    expect(tooLarge).toMatchObject({
      ok: false,
      error: expect.stringMatching(/너무 큽니다/),
    });
  });

  it("does not dispatch cancelled figure or HWPX requests", async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(
      await renderFigureSpec(catalog.v2_example, {
        signal: AbortSignal.abort(),
      }),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/취소/) });
    await expect(buildHwpxParts(payload, AbortSignal.abort())).rejects.toThrow(
      /취소/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("internal transport boundaries", () => {
  it("fails closed without a signing secret before making an HTTP request", async () => {
    configure();
    vi.stubEnv("STUDIO_ENGINE_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      requestEngine("figure", {}, { timeoutMs: 1000 }),
    ).rejects.toThrow(/인증 설정/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the deployment protection secret only to the same deployment and rejects redirects", async () => {
    configure();
    vi.stubEnv("VERCEL_URL", "math-example.vercel.app");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "test-bypass");
    vi.stubEnv("STUDIO_ENGINE_URL", "https://math-example.vercel.app");
    const fetchMock = vi.fn(async () =>
      Response.json({ resultGzip: gzipSync("{}").toString("base64") }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await requestEngine("figure", {}, { timeoutMs: 1000 });
    expect(fetchMock.mock.calls[0]).toEqual([
      expect.any(URL),
      expect.objectContaining({
        redirect: "error",
        headers: expect.objectContaining({
          "x-vercel-protection-bypass": "test-bypass",
        }),
      }),
    ]);
    vi.stubEnv("STUDIO_ENGINE_URL", "https://another-engine.example");
    await requestEngine("figure", {}, { timeoutMs: 1000 });
    expect(fetchMock.mock.calls[1]).toEqual([
      expect.any(URL),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "x-vercel-protection-bypass": expect.anything(),
        }),
      }),
    ]);
  });

  it("bounds request bodies before opening a connection", async () => {
    configure();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      requestEngine(
        "hwpx",
        { text: "x".repeat(3_500_000) },
        { timeoutMs: 1000 },
      ),
    ).rejects.toThrow(/너무 큽니다/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("selects only fixed server configuration and fails closed on Vercel", () => {
    vi.stubEnv("STUDIO_ENGINE_URL", "");
    vi.stubEnv("VERCEL", "");
    expect(engineEndpoint()).toBeNull();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "math-example.vercel.app");
    expect(engineEndpoint()?.href).toBe(
      "https://math-example.vercel.app/api/mathgen-engine",
    );
    vi.stubEnv("VERCEL_URL", "");
    expect(() => engineEndpoint()).toThrow();
    vi.stubEnv("STUDIO_ENGINE_URL", "https://example.org/unsafe?token=x");
    expect(() => engineEndpoint()).toThrow();
    vi.stubEnv("STUDIO_ENGINE_URL", "");
    vi.stubEnv("VERCEL_ENV", "development");
    expect(engineEndpoint()).toBeNull();
  });

  it("bounds decompressed responses", async () => {
    configure();
    const bomb = gzipSync("x".repeat(1024 * 1024 + 1)).toString("base64");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ resultGzip: bomb })),
    );
    await expect(
      requestEngine("figure", {}, { timeoutMs: 1000 }),
    ).rejects.toThrow(/너무 큽니다/);
  });

  it("bounds streamed responses even without Content-Length", async () => {
    configure();
    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream)),
    );
    await expect(
      requestEngine("figure", {}, { timeoutMs: 1000 }),
    ).rejects.toThrow(/너무 큽니다/);
    expect(cancelled).toBe(true);
  });

  it.each(["cancel", "timeout"])(
    "aborts an active HTTP request on %s",
    async (mode) => {
      configure();
      const controller = new AbortController();
      let aborted = false;
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal!.addEventListener("abort", () => {
                aborted = true;
                reject(init.signal!.reason);
              });
              if (mode === "cancel") queueMicrotask(() => controller.abort());
            }),
        ),
      );
      await expect(
        requestEngine(
          "figure",
          {},
          { signal: controller.signal, timeoutMs: 30 },
        ),
      ).rejects.toThrow(mode === "cancel" ? /취소/ : /시간/);
      expect(aborted).toBe(true);
    },
  );
});
