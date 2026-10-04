/** Real React preview + Chromium layout, with a synthetic book and no database writes.
 * node --conditions=react-server --import tsx scripts/qa/textbook/preview-browser.ts
 */
import assert from "node:assert/strict";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import type { ElementHandle } from "puppeteer-core";
import { launchExportBrowser } from "../../../src/lib/export/pdfServer";
import { textbookFixture } from "../../../src/__tests__/helpers/textbookFixture";
import { createTextbookRenderModel } from "../../../src/lib/textbook/render/model";

async function main() {
  const root = process.cwd();
  const fixture = process.argv[2]
    ? (JSON.parse(await readFile(process.argv[2], "utf8")) as {
        editionId: string;
        responses: Record<string, unknown>;
        assets: Array<{ id: string; mime: string; base64: string }>;
      })
    : null;
  const exchange = textbookFixture(1, 0);
  exchange.config.print.firstPhysicalPageIndex = 0;
  exchange.units[0].sections = [
    {
      sectionKey: "body",
      title: "세 자리 수의 개념",
      templateKey: "auto-unit-intro",
      startPolicy: "continue",
      blocks: [
        {
          blockId: "body-text",
          kind: "text",
          markdown:
            "백의 자리, 십의 자리, 일의 자리를 살펴봅시다.\n\n$325=300+20+5$입니다.",
        },
      ],
    },
  ];
  const model = createTextbookRenderModel(exchange, "student");
  const client = fixture
    ? `import React from 'react';
import {createRoot} from 'react-dom/client';
import {TextbookStudioView} from '/src/components/textbook/TextbookStudioView.tsx';
import 'katex/dist/katex.min.css';
createRoot(document.getElementById('root')).render(React.createElement(TextbookStudioView,{initialEditionId:${JSON.stringify(fixture.editionId)}}));`
    : `import React,{useCallback,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SectionMeasure} from '/src/components/textbook/measuredPreview.tsx';
import 'katex/dist/katex.min.css';
const model=${JSON.stringify(model)};
const resources={assetUrl:()=>{throw new Error('Unexpected asset')},qrDataUrl:()=>{throw new Error('Unexpected QR')}};
function App(){
  const [anchor,setAnchor]=useState(0),[zoom,setZoom]=useState('fit');
  const onPages=useCallback(pages=>{window.previewPages=pages},[]);
  const h=React.createElement;
  return h('main',{style:{padding:24,maxWidth:1600,margin:'auto'}},
    h('h1',null,'실제 교재 지면 크기 검증'),
    h('button',{onClick:()=>setAnchor(0)},'표지'),
    h('button',{onClick:()=>setAnchor(2)},'본문'),
    h('button',{onClick:()=>setZoom(z=>z==='fit'?'wide':'fit')},'배율 변경'),
    h(SectionMeasure,{model,resources,zoom,physicalPageIndex:anchor,provisionalNotice:null,onPages}));
}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
  const server = await createServer({
    configFile: false,
    root,
    publicDir: "public",
    plugins: [
      react(),
      {
        name: "textbook-preview-qa",
        enforce: "pre",
        resolveId(id) {
          if (id === "/preview-qa.jsx") return "\0preview-qa.jsx";
          if (id === "next/navigation") return "\0preview-qa-navigation.js";
          if (id === "next/image") return "\0preview-qa-image.js";
        },
        load(id) {
          if (id === "\0preview-qa.jsx") return client;
          if (id === "\0preview-qa-navigation.js")
            return "export const useRouter=()=>({push:()=>{}});";
          if (id === "\0preview-qa-image.js")
            return "import React from 'react'; export default function Image({fill,priority,unoptimized,loader,...props}){return React.createElement('img',props)};";
        },
        configureServer(dev) {
          dev.middlewares.use(async (request, response, next) => {
            const url = request.url?.split("?")[0] ?? "";
            if (fixture && url.startsWith("/api/")) {
              if (request.method !== "GET") {
                response.statusCode = 405;
                response.end("Read-only QA");
                return;
              }
              const asset = fixture.assets.find(
                (a) =>
                  url ===
                  `/api/textbook/editions/${fixture.editionId}/assets/${a.id}`,
              );
              if (asset) {
                response.setHeader("Content-Type", asset.mime);
                response.end(Buffer.from(asset.base64, "base64"));
                return;
              }
              const body = fixture.responses[url];
              response.setHeader("Content-Type", "application/json");
              response.statusCode = body ? 200 : 404;
              response.end(
                JSON.stringify(body ?? { message: "No read-only QA response" }),
              );
              return;
            }
            if (request.url !== "/preview-qa") {
              next();
              return;
            }
            response.setHeader("Content-Type", "text/html");
            response.end(
              await dev.transformIndexHtml(
                "/preview-qa",
                `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>교재 미리보기 검사</title><style>body{margin:0;font-family:sans-serif}button{margin:8px;padding:10px}</style></head><body><div id="root"></div><script type="module" src="/preview-qa.jsx"></script></body></html>`,
              ),
            );
          });
        },
      },
    ],
    optimizeDeps: {
      entries: [],
      exclude: ["next/navigation", "next/image"],
      include: [
        "react",
        "react-dom/client",
        "react/jsx-dev-runtime",
        "qrcode",
        "katex",
        "debug",
        "extend",
      ],
    },
    resolve: { alias: { "@": path.join(root, "src") } },
    define: { "process.env": "{}" },
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
    },
  });
  await server.listen();
  console.log("Preview QA server ready");
  const browser = await launchExportBrowser();
  const errors: string[] = [];
  const report: unknown[] = [];
  const out = path.join(root, "output", "textbook-preview-qa");
  await mkdir(out, { recursive: true });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      console.error("Browser:", message);
    });
    const address = server.httpServer!.address() as { port: number };
    await page.setViewport({ width: 1600, height: 1000 });
    console.log(
      `Preview QA origin http://127.0.0.1:${address.port}/preview-qa`,
    );
    const response = await page.goto(
      `http://127.0.0.1:${address.port}/preview-qa`,
      { waitUntil: "domcontentloaded", timeout: 120000 },
    );
    assert.equal(response?.status(), 200);
    await page.waitForSelector(".tb-paper", { timeout: 60000 });
    if (fixture) {
      const edition = fixture.responses[
        `/api/textbook/editions/${fixture.editionId}/export`
      ] as {
        data: {
          units: Array<{
            sections: Array<{ title: string; sectionKey: string }>;
          }>;
        };
      };
      const titles = edition.data.units.flatMap((u) =>
        u.sections.map((s) => s.title),
      );
      const sectionKeys = edition.data.units.flatMap((u) =>
        u.sections.map((s) => s.sectionKey),
      );
      assert.equal(await page.$$eval(".tb-cover", (nodes) => nodes.length), 1);
      const occurrences: Record<string, number> = {};
      for (const [sectionIndex, title] of titles.entries()) {
        console.log("Checking saved preview:", title);
        const button = await page.evaluateHandle(
          ({ title, occurrence }) =>
            Array.from(document.querySelectorAll("button")).filter(
              (b) => b.textContent?.trim() === title,
            )[occurrence],
          { title, occurrence: occurrences[title] ?? 0 },
        );
        occurrences[title] = (occurrences[title] ?? 0) + 1;
        assert(button.asElement(), `Missing outline button: ${title}`);
        await (button.asElement()! as ElementHandle<HTMLButtonElement>).click();
        if (title === titles[0]) {
          const next = await page.evaluateHandle(() =>
            Array.from(document.querySelectorAll("button")).find(
              (b) => b.textContent?.trim() === "다음 쪽",
            ),
          );
          await (next.asElement()! as ElementHandle<HTMLButtonElement>).click();
        }
        try {
          await page.waitForFunction(
            (key) =>
              Array.from(
                document.querySelectorAll(".tb-paper[data-section-key]"),
              ).some((paper) => paper.getAttribute("data-section-key") === key),
            { timeout: 15000 },
            sectionKeys[sectionIndex],
          );
        } catch (error) {
          console.error(
            await page.evaluate(() => ({
              headings: Array.from(
                document.querySelectorAll(".tb-section-heading"),
              ).map((h) => h.textContent),
              preview: document.body.innerText.slice(-3000),
            })),
          );
          await page.screenshot({
            path: path.join(out, "saved-preview-failure.png"),
            fullPage: true,
          });
          throw error;
        }
        assert.equal(
          await page.$$eval(".tb-cover", (nodes) => nodes.length),
          0,
        );
        await page.waitForFunction(
          (key) =>
            Array.from(
              document.querySelectorAll(".tb-paper[data-section-key]"),
            ).some((p) => p.getAttribute("data-section-key") === key),
          {},
          sectionKeys[sectionIndex],
        );
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        await page.waitForSelector(
          "[data-textbook-preview-viewport] .tb-paper",
        );
        if (title === titles[4]) {
          await page.screenshot({
            path: path.join(out, "saved-book-preview.png"),
            fullPage: true,
          });
          const before = await page.$$eval(".tb-paper", (nodes) =>
            nodes.map((n) => n.getAttribute("data-textbook-page")),
          );
          const next = await page.evaluateHandle(() =>
            Array.from(document.querySelectorAll("button")).find(
              (b) => b.textContent?.trim() === "다음 쪽",
            ),
          );
          await (next.asElement()! as ElementHandle<HTMLButtonElement>).click();
          await page.waitForFunction(
            (before) =>
              JSON.stringify(
                Array.from(document.querySelectorAll(".tb-paper")).map((n) =>
                  n.getAttribute("data-textbook-page"),
                ),
              ) !== JSON.stringify(before),
            {},
            before,
          );
        }
        report.push({ section: title, rendered: true });
      }
    }
    for (const width of [1600, 820, 390]) {
      await page.setViewport({ width, height: 1000 });
      await page.waitForFunction(() => {
        const viewport = document.querySelector(
          "[data-textbook-preview-viewport]",
        );
        const paper = document.querySelector(".tb-paper");
        return (
          viewport &&
          paper &&
          paper.getBoundingClientRect().width <=
            viewport.getBoundingClientRect().width
        );
      });
      const bounds = await page.evaluate(() => {
        const viewport = document
          .querySelector("[data-textbook-preview-viewport]")!
          .getBoundingClientRect();
        const paper = document
          .querySelector(".tb-paper")!
          .getBoundingClientRect();
        return {
          viewportWidth: viewport.width,
          paperWidth: paper.width,
          paperHeight: paper.height,
          pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
          clipped: paper.bottom > viewport.bottom + 1,
        };
      });
      assert(!bounds.pageOverflow, `Horizontal overflow at ${width}`);
      assert(!bounds.clipped, `Paper height clipped at ${width}`);
      const paperCount = await page.$$eval(
        ".tb-paper",
        (papers) => papers.length,
      );
      assert(
        bounds.paperWidth >=
          Math.min(790, (bounds.viewportWidth - 36) / paperCount),
        `Cover too small at ${width}`,
      );
      report.push({ width, ...bounds });
      await page.screenshot({
        path: path.join(out, `cover-${width}.png`),
        fullPage: true,
      });
    }
    assert.deepEqual(errors, []);
    await writeFile(
      path.join(
        out,
        fixture ? "saved-book-browser-report.json" : "report.json",
      ),
      JSON.stringify({ checks: report, errors }, null, 2),
    );
    console.log(JSON.stringify({ output: out, checks: report, errors }));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
