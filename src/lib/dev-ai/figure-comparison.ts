import "server-only";
import type { Browser, Page } from "puppeteer-core";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { substituteLabels } from "@/lib/figure/mathjaxSubstitute";
import { COMPARISON_GRID_LAYOUT, gridIndexOverlay, measureGridFromGray } from "@/lib/figure/gridMeasure";
import { abortError } from "./cli-process";
import { validDevAiSvg } from "./svg";

// 결함 2(2026-09-18): 비교 사진마다 Chrome 을 새로 띄웠다. 한 번 띄운 브라우저를 요청들이 나눠 쓰고
// (요청마다 페이지 하나), 한동안 안 쓰면 닫는다. 죽거나 끊기면 다음 요청이 다시 띄운다.
// 취소·시간 초과는 그 요청의 페이지만 닫는다 — 같이 쓰는 다른 요청을 죽이지 않는다.
const BROWSER_IDLE_MS = 120_000;
interface SharedBrowser {
  browser: Promise<Browser>;
  users: number;
  idle?: NodeJS.Timeout;
}
let shared: SharedBrowser | undefined;

function forget(holder: SharedBrowser) {
  if (shared !== holder) return;
  clearTimeout(holder.idle);
  shared = undefined;
}

async function acquireBrowser(): Promise<{
  browser: Browser;
  release: () => void;
}> {
  let holder = shared;
  if (holder) {
    clearTimeout(holder.idle);
    holder.idle = undefined;
    const live = await holder.browser.then(
      (browser) => browser.connected,
      () => false,
    );
    if (!live) {
      forget(holder);
      holder = undefined;
    }
  }
  if (!holder) {
    const launched = launchExportBrowser();
    const fresh: SharedBrowser = { browser: launched, users: 0 };
    holder = fresh;
    shared = fresh;
    launched.then(
      (browser) => browser.once("disconnected", () => forget(fresh)),
      () => forget(fresh),
    );
  }
  const owner = holder;
  owner.users++;
  let browser: Browser;
  try {
    browser = await owner.browser;
  } catch (error) {
    owner.users--;
    throw error;
  }
  const release = () => {
    owner.users--;
    if (owner.users > 0 || shared !== owner) return;
    owner.idle = setTimeout(() => {
      forget(owner);
      void browser.close().catch(() => {});
    }, BROWSER_IDLE_MS);
    owner.idle.unref?.();
  };
  return { browser, release };
}

/** Closes the shared comparison browser now (tests and shutdown). */
export async function closeFigureComparisonBrowser(): Promise<void> {
  const holder = shared;
  if (!holder) return;
  forget(holder);
  await holder.browser.then((browser) => browser.close()).catch(() => {});
}

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
  const { browser, release } = await acquireBrowser();
  let page: Page | undefined;
  let expired = false;
  const closePage = () => {
    void page?.close().catch(() => {});
  };
  const expire = () => {
    expired = true;
    closePage();
  };
  const timeout = setTimeout(expire, 30_000);
  signal?.addEventListener("abort", closePage, { once: true });
  try {
    if (signal?.aborted) throw abortError();
    page = await browser.newPage();
    if (signal?.aborted) throw abortError();
    if (expired)
      throw new Error("도형 비교 이미지를 시간 안에 만들지 못했습니다.");
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
      .frame{position:relative;width:900px;height:900px}
      img{display:block;width:900px;height:900px;object-fit:contain}
      .grid-advisory img{position:absolute;left:${COMPARISON_GRID_LAYOUT.inset}px;top:${COMPARISON_GRID_LAYOUT.inset}px;width:${COMPARISON_GRID_LAYOUT.side}px;height:${COMPARISON_GRID_LAYOUT.side}px}
      .grid-index{position:absolute;transform:translate(-50%,-50%);font:13px/16px Arial,sans-serif;color:#b91c1c;white-space:nowrap}
      .grid-legend{position:absolute;left:0;top:0;width:900px;text-align:center;font:13px/20px Arial,sans-serif;color:#8f1616}
      </style></head><body><section><h1>1. ORIGINAL</h1><div class="frame"><img src="${original}"></div></section>
      <section><h1>2. RECONSTRUCTION</h1><div class="frame"><img src="${reconstruction}"></div></section></body></html>`,
      { waitUntil: "load", timeout: 20_000 },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode()));
    });
    if (signal?.aborted) throw abortError();
    // Reuse this request's already decoded images/page. No extra browser, decoder,
    // source rewrite or snapping. Pixel measurements can never approve a figure.
    const overlays: ReturnType<typeof gridIndexOverlay>[] = [];
    for (const index of [0, 1]) {
      const raster = await page.evaluate((i: number) => {
        const image = document.images[i];
        if (!image) return null;
        const nw = image.naturalWidth, nh = image.naturalHeight;
        if (!Number.isSafeInteger(nw) || !Number.isSafeInteger(nh) ||
            nw < 1 || nh < 1 || nw > 16000 || nh > 16000 || nw * nh > 40_000_000) return null;
        const scale = Math.min(1, 900 / Math.max(nw, nh));
        const width = Math.max(1, Math.round(nw * scale));
        const height = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        try {
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) return null;
          context.fillStyle = "white"; context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          const rgba = context.getImageData(0, 0, width, height).data;
          const gray = new Array<number>(width * height);
          for (let j = 0; j < gray.length; j++) {
            gray[j] = Math.round((299 * rgba[4 * j]! + 587 * rgba[4 * j + 1]! + 114 * rgba[4 * j + 2]!) / 1000);
          }
          return { width, height, naturalWidth: nw, naturalHeight: nh, gray };
        } catch {
          // Tainted/unsupported canvas is unknown. Original comparison stays usable.
          return null;
        } finally {
          canvas.width = 0; canvas.height = 0;
        }
      }, index);
      if (signal?.aborted) throw abortError();
      const grid = raster && measureGridFromGray(raster.gray, raster.width, raster.height);
      overlays.push(grid && raster ? gridIndexOverlay(grid, raster.naturalWidth, raster.naturalHeight) : null);
    }
    if (overlays.some(Boolean)) {
      await page.evaluate((items) => {
        for (const [index, frame] of Array.from(document.querySelectorAll<HTMLElement>(".frame")).entries()) {
          frame.classList.add("grid-advisory");
          const overlay = items[index];
          const legend = document.createElement("div");
          legend.className = "grid-legend";
          legend.textContent = overlay?.legend ?? "칸 실측 불명 · 원문과 직접 대조";
          frame.append(legend);
          for (const tick of overlay?.ticks ?? []) {
            const label = document.createElement("span");
            label.className = "grid-index";
            label.style.left = `${tick.x}px`; label.style.top = `${tick.y}px`;
            label.textContent = tick.label; frame.append(label);
          }
        }
      }, overlays);
    }
    if (signal?.aborted) throw abortError();
    const data = await page.screenshot({ type: "png", encoding: "base64" });
    return `data:image/png;base64,${data}`;
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", closePage);
    await page?.close().catch(() => {});
    release();
  }
}
