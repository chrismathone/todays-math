import chromium from "@sparticuz/chromium-min";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer, { type Page } from "puppeteer-core";
import { z } from "zod";

const PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";
const FONT_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
]);
const FONT_CSS = [
  "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Nanum+Gothic:wght@400;700;800&display=swap",
  "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@400;500;700;900&display=swap",
  "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&display=swap",
];
export const PdfPayloadSchema = z.object({
  html: z.string().min(1).max(8_000_000),
  cssUrls: z.array(z.string().max(4000)).max(32).default([]),
  cssText: z.string().max(2_000_000).default(""),
  title: z.string().trim().max(200).default("시험지"),
  /** 기존 시험지의 외부 글꼴 적재는 유지하고, 자체 글꼴 문서만 명시적으로 닫는다. */
  fontPolicy: z.enum(["default", "self-hosted"]).default("default"),
});
export type PdfPayload = z.infer<typeof PdfPayloadSchema>;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

export function allowedPdfResource(
  raw: string,
  type: string,
  origin: string,
  fontPolicy: PdfPayload["fontPolicy"] = "default",
): boolean {
  if (raw === "about:blank") return true;
  if (raw.startsWith("data:")) return ["image", "font"].includes(type);
  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return false;
    // Asset-only requests: submitted HTML must never drive an API/navigation request.
    if (url.origin === origin)
      return (
        ["stylesheet", "font", "image"].includes(type) &&
        !url.pathname.startsWith("/api/")
      );
    return (
      url.protocol === "https:" &&
      fontPolicy !== "self-hosted" &&
      FONT_HOSTS.has(url.hostname) &&
      ["stylesheet", "font"].includes(type)
    );
  } catch {
    return false;
  }
}

export function pdfDocument(input: PdfPayload, origin: string): string {
  const styles = [
    ...new Set([
      ...input.cssUrls,
      ...(input.fontPolicy === "self-hosted" ? [] : FONT_CSS),
    ]),
  ].filter((url) =>
    allowedPdfResource(url, "stylesheet", origin, input.fontPolicy),
  );
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="${escape(origin)}/"><title>${escape(input.title)}</title>${styles.map((url) => `<link rel="stylesheet" href="${escape(url)}">`).join("")}<style>${input.cssText.replace(/<\/style/gi, "<\\/style")}</style><style>html,body{margin:0;padding:0}[data-mathgen-document]{display:block!important;--preview-scale:1!important;--preview-trailing-space:0px!important;width:210mm!important;min-width:0!important}[data-unified-paper]{zoom:1!important;margin:0!important;box-shadow:none!important;break-after:page}[data-unified-paper]:last-child{break-after:auto}@page{size:A4;margin:0}</style></head><body>${input.html}</body></html>`;
}

async function preparePage(page: Page, input: PdfPayload, origin: string) {
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    void (allowedPdfResource(
      request.url(),
      request.resourceType(),
      origin,
      input.fontPolicy,
    )
      ? request.continue()
      : request.abort());
  });
  await page.emulateMediaType("print");
  await page.setContent(pdfDocument(input, origin), {
    waitUntil: "load",
    timeout: 30000,
  });
  await page.evaluate(async (selfHosted: boolean) => {
    const families = selfHosted
      ? ["Noto Serif KR", "Pretendard"]
      : [
          "Noto Serif KR",
          "Noto Sans KR",
          "Nanum Myeongjo",
          "Nanum Gothic",
          "Gowun Batang",
          "Gowun Dodum",
          "Pretendard",
        ];
    await Promise.all(
      families.flatMap((family) =>
        [400, 700].map(async (weight) => {
          const loading = document.fonts.load(
            `${weight} 16px "${family}"`,
            "가힣국문수학9A",
          );
          if (selfHosted) {
            const loaded = await loading;
            if (loaded.length === 0)
              throw new Error("성적표 글꼴을 불러오지 못했습니다.");
          } else await loading.catch(() => undefined);
        }),
      ),
    );
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => image.decode()),
    );
    if (!document.querySelector("[data-unified-paper]"))
      throw new Error("내보낼 페이지가 없습니다.");
  }, input.fontPolicy === "self-hosted");
}

/** Shared browser runtime for server PDF and bounded SVG comparison rendering. Callers must close it. */
export async function launchExportBrowser() {
  const localCandidates =
    process.platform === "win32"
      ? [
          path.join(
            process.env.PROGRAMFILES ?? "C:/Program Files",
            "Google/Chrome/Application/chrome.exe",
          ),
          path.join(
            process.env["PROGRAMFILES(X86)"] ?? "C:/Program Files (x86)",
            "Microsoft/Edge/Application/msedge.exe",
          ),
          path.join(
            process.env.LOCALAPPDATA ?? "",
            "Google/Chrome/Application/chrome.exe",
          ),
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [];
  const executablePath =
    process.env.PDF_CHROMIUM_EXECUTABLE ||
    localCandidates.find((candidate) => existsSync(candidate)) ||
    (process.platform === "linux"
      ? await chromium.executablePath(PACK)
      : undefined);
  if (!executablePath)
    throw new Error(
      "PDF 생성용 Chromium 경로가 필요합니다. PDF_CHROMIUM_EXECUTABLE을 설정하거나 인쇄에서 PDF로 저장해 주세요.",
    );
  return puppeteer.launch({
    executablePath,
    headless: true,
    pipe: true,
    args:
      process.platform === "linux"
        ? [...chromium.args, "--font-render-hinting=none"]
        : ["--font-render-hinting=none"],
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
  });
}

/** Original Chromium PDF pipeline, with target asset paths and no uploaded scripts. */
export async function buildPdf(
  input: PdfPayload,
  origin: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) throw new Error("내보내기가 취소되었습니다.");
  const browser = await launchExportBrowser();
  const close = () => {
    void browser.close();
  };
  const timeout = setTimeout(close, 60000);
  signal?.addEventListener("abort", close, { once: true });
  try {
    if (signal?.aborted) throw new Error("내보내기가 취소되었습니다.");
    const page = await browser.newPage();
    await preparePage(page, input, origin);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", close);
    await browser.close();
  }
}
