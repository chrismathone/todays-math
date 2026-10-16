// @vitest-environment node
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  buildFigureComparisonImage,
  closeFigureComparisonBrowser,
} from "@/lib/dev-ai/figure-comparison";
import { launchExportBrowser } from "@/lib/export/pdfServer";

vi.mock("server-only", () => ({}));

// macOS 개발 기기에 Chrome · Edge 앱이 없으면 제품 탐지(launchExportBrowser)는 경로를 못 찾는다.
// 그때만 시험에서 Playwright 가 받아 둔 Chromium 을 PDF_CHROMIUM_EXECUTABLE 로 넘긴다.
// Windows · Linux 와 Chrome/Edge 가 있는 Mac 은 제품 탐지 그대로 돈다.
const MAC_SYSTEM_BROWSERS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];
if (
  process.platform === "darwin" &&
  !process.env.PDF_CHROMIUM_EXECUTABLE &&
  !MAC_SYSTEM_BROWSERS.some((candidate) => existsSync(candidate))
) {
  const { chromium } = await import("@playwright/test");
  const playwrightChromium = chromium.executablePath();
  if (existsSync(playwrightChromium))
    vi.stubEnv("PDF_CHROMIUM_EXECUTABLE", playwrightChromium);
}

describe("actual source/rendered comparison image", () => {
  // 결함 2: 비교 브라우저는 유휴 시간까지 살아 있으므로 시험이 끝나면 바로 닫는다.
  // 닫기는 시험 대상이 아니라 한도를 넉넉히 — 이 컴퓨터(크롬 없음 → 엣지)는 전체 시험 부하에서 닫기가 10초를 넘겨
  // 시험 둘이 초록인데 파일이 빨갰다(2026-09-19, 단독이면 3.9초). 트랙 15 가 잰 엣지 닫기는 33초까지 걸렸다.
  afterAll(() => closeFigureComparisonBrowser(), 60_000);
  it("rejects remote source images and unsafe SVG before opening a browser", async () => {
    await expect(
      buildFigureComparisonImage("https://example.com/source.png", "<svg/>"),
    ).rejects.toThrow("도형 비교 이미지");
    await expect(
      buildFigureComparisonImage(
        "data:image/png;base64,YQ==",
        "<svg><script>alert(1)</script></svg>",
      ),
    ).rejects.toThrow("도형 비교 이미지");
  });
  it("renders labeled original and reconstruction panels with actual math glyphs", async () => {
    const browser = await launchExportBrowser();
    let source: string;
    try {
      const page = await browser.newPage();
      source = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 280;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 360, 280);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, 220);
        ctx.lineTo(180, 55);
        ctx.lineTo(300, 220);
        ctx.closePath();
        ctx.stroke();
        ctx.font = "24px serif";
        ctx.fillStyle = "black";
        ctx.fillText("A", 172, 40);
        ctx.fillText("B", 36, 240);
        ctx.fillText("C", 306, 240);
        return canvas.toDataURL("image/png");
      });
    } finally {
      await browser.close();
    }
    const result = await buildFigureComparisonImage(
      source,
      '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="280" viewBox="0 0 360 280"><path d="M60 220L180 55L300 220Z" fill="none" stroke="black" stroke-width="3"/><text x="180" y="40" font-size="24" text-anchor="middle" data-mj="A">A</text><text x="40" y="244" font-size="24" data-mj="B">B</text><text x="304" y="244" font-size="24" data-mj="C">C</text></svg>',
    );
    const png = Buffer.from(result.split(",")[1], "base64");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1840, 960]);
    const artifact = path.join(
      process.cwd(),
      ".qa-artifacts",
      "mathgen-integration",
    );
    await mkdir(artifact, { recursive: true });
    await writeFile(path.join(artifact, "figure-comparison.png"), png);
  }, 60_000);
});
