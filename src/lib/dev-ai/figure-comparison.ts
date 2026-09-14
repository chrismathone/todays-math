import "server-only";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { substituteLabels } from "@/lib/figure/mathjaxSubstitute";
import { abortError } from "./cli-process";
import { validDevAiSvg } from "./svg";

/** Source figurePipeline parity: review actual reconstructed pixels after math typesetting. */
export async function buildFigureComparisonImage(
  original: string,
  svg: string,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw abortError();
  if (
    !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(original) ||
    original.length > 16_000_000 ||
    !validDevAiSvg(svg)
  )
    throw new Error("도형 비교 이미지가 올바르지 않습니다.");
  const typeset = substituteLabels(svg);
  if (typeset.unresolved.length)
    throw new Error("재작도한 도형의 수식 라벨을 조판하지 못했습니다.");
  const reconstruction = `data:image/svg+xml;base64,${Buffer.from(typeset.svg).toString("base64")}`;
  const browser = await launchExportBrowser();
  const close = () => {
    void browser.close().catch(() => {});
  };
  const timeout = setTimeout(close, 30_000);
  signal?.addEventListener("abort", close, { once: true });
  try {
    if (signal?.aborted) throw abortError();
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setViewport({ width: 1840, height: 960, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      void (
        request.url().startsWith("data:image/") &&
        request.resourceType() === "image"
          ? request.continue()
          : request.abort()
      ).catch(() => {});
    });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;width:1840px;height:960px;background:white}
      body{display:flex;gap:20px;padding:10px;font:24px Arial,sans-serif;color:black}
      section{width:900px}h1{font-size:24px;margin:0;height:40px;text-align:center}
      img{display:block;width:900px;height:900px;object-fit:contain}
      </style></head><body><section><h1>1. ORIGINAL</h1><img src="${original}"></section>
      <section><h1>2. RECONSTRUCTION</h1><img src="${reconstruction}"></section></body></html>`,
      { waitUntil: "load", timeout: 20_000 },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode()));
    });
    if (signal?.aborted) throw abortError();
    const data = await page.screenshot({ type: "png", encoding: "base64" });
    return `data:image/png;base64,${data}`;
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", close);
    await browser.close().catch(() => {});
  }
}
