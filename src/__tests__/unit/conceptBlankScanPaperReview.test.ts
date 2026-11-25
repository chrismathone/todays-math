// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { scanPaperCss } from "@/lib/concept-blank/scan/paperCss.server";
import {
  scanFontFingerprint,
  scanFontCss,
  browserScanCss,
} from "@/lib/concept-blank/scan/fonts.server";
import { createScanRenderQueue } from "@/lib/concept-blank/scan/renderQueue";

it("stores font-free CSS and a fingerprint, delivers small same-origin CSS, keeps isolated fonts", () => {
  const css = scanPaperCss();
  expect(css).not.toMatch(/base64|@font-face/);
  const fontFingerprint = scanFontFingerprint();
  expect(fontFingerprint).toMatch(/^[a-f0-9]{64}$/);
  const artifact = {
    version: 1 as const,
    css,
    fontFingerprint,
    pages: [{ part: "student" as const, number: 1, html: "<p>수학</p>" }],
  };
  const browser = browserScanCss(artifact);
  expect(browser).toContain("/fonts/PretendardVariable.woff2");
  expect(browser).toContain("/fonts/katex/");
  expect(browser).not.toMatch(/base64|url\(https?:\/\//);
  expect(Buffer.byteLength(browser)).toBeLessThan(1_000_000);
  expect(Buffer.byteLength(JSON.stringify(artifact))).toBeLessThan(1_000_000);
  expect(scanFontCss("embedded")).toContain("data:font/woff2;base64,");
  // Old immutable rows are served compactly too, without modifying their saved hash/bytes.
  const legacy = {
    ...artifact,
    fontFingerprint: undefined,
    css: scanFontCss("embedded") + css,
  };
  expect(browserScanCss(legacy)).not.toContain("base64");
  expect(legacy.css).toContain("base64");
  const oldFaces = scanFontCss("embedded")
    .match(/@font-face\s*\{[^}]*\}/g)!
    .slice(0, 2)
    .join("\n");
  const oldCss =
    oldFaces +
    readFileSync("node_modules/katex/dist/katex.min.css", "utf8") +
    css;
  expect(browserScanCss({ ...legacy, css: oldCss })).not.toContain("base64");
  for (const file of readFileSync(
    "node_modules/katex/dist/katex.min.css",
    "utf8",
  ).matchAll(/url\(fonts\/([^()]+\.woff2)\)/g)) {
    expect(
      readFileSync(`public/fonts/katex/${file[1]}`).equals(
        readFileSync(`node_modules/katex/dist/fonts/${file[1]}`),
      ),
    ).toBe(true);
  }
  expect(() =>
    browserScanCss({ ...artifact, fontFingerprint: "0".repeat(64) }),
  ).toThrow(/글꼴/);
});

it("queues concurrent renders FIFO, releases after failure and expires a waiter without running it", async () => {
  vi.useFakeTimers();
  try {
    const queue = createScanRenderQueue();
    let release!: () => void;
    const order: number[] = [];
    const first = queue(async () => {
      order.push(1);
      await new Promise<void>((r) => {
        release = r;
      });
    }, 1000);
    const second = queue(async () => {
      order.push(2);
      throw new Error("render failed");
    }, 1000);
    const rejected = expect(second).rejects.toThrow("render failed");
    const expired = vi.fn();
    const third = queue(expired, 20);
    const timeout = expect(third).rejects.toThrow(/대기/);
    await vi.advanceTimersByTimeAsync(21);
    await timeout;
    expect(order).toEqual([1]);
    release();
    await first;
    await rejected;
    await queue(async () => {
      order.push(4);
    }, 1000);
    expect(order).toEqual([1, 2, 4]);
    expect(expired).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});

it("returns on the running deadline but holds the Chromium slot until late cleanup finishes", async () => {
  vi.useFakeTimers();
  try {
    const queue = createScanRenderQueue();
    let cleanup!: () => void;
    const first = queue(async () => {
      await new Promise<void>((r) => {
        cleanup = r;
      });
    }, 20);
    const timedOut = expect(first).rejects.toThrow(/제한 시간/);
    const nextWork = vi.fn().mockResolvedValue("next");
    const next = queue(nextWork, 200);
    await vi.advanceTimersByTimeAsync(21);
    await timedOut;
    expect(nextWork).not.toHaveBeenCalled();
    cleanup();
    expect(await next).toBe("next");
  } finally {
    vi.useRealTimers();
  }
});
