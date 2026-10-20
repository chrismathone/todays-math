// Re-render the longer stress answer through the production math composition.
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { freemem } from "node:os";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
if (freemem() < 3 * 1024 ** 3) throw new Error("Need 3GiB free before Vite.");
const root = process.cwd(), dir = resolve(root, ".qa-artifacts/hifi-long-answer-source");
await mkdir(dir, { recursive: true });
const answer = Array.from({ length: 10 }, (_, i) => `(${i + 1}) $${(i + 1) * 12}$`).join(" ");
await writeFile(resolve(dir, "index.html"), '<!doctype html><meta charset="utf-8"><div id="root"></div><script type="module" src="/entry.jsx"></script>');
await writeFile(resolve(dir, "entry.jsx"), `import React from 'react';import {createRoot} from 'react-dom/client';import {MathText} from '@/components/math/MathText';import {fractionViewFor} from '@/components/unified/fractionDisplay';const p={grade:'중1',content:'다음 곱셈을 계산하시오. '+Array.from({length:10},(_,i)=>'('+ (i+1)+') 12×'+(i+1)).join(' '),answer:${JSON.stringify(answer)},solution:'각 소문항의 두 수를 곱한다.'};window.hifiLongFixture=p;createRoot(document.getElementById('root')).render(<div id="answer"><MathText text={fractionViewFor(p)(p.answer)}/></div>);`);
const server = await createServer({ configFile: false, root: dir, cacheDir: resolve(root, ".qa-artifacts/hifi-long-cache"), plugins: [react({ exclude: /node_modules|cache/ })], resolve: { alias: { "@": resolve(root, "src") } }, server: { host: "127.0.0.1", port: 0, fs: { allow: [root, await realpath(resolve(root, "node_modules"))] } } });
let browser;
try {
  await server.listen();
  if (freemem() < 3 * 1024 ** 3) throw new Error("Need 3GiB free before Chromium.");
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForSelector("#answer .katex");
  const content = await page.locator("#answer").innerHTML();
  if (await page.locator("#answer .katex").count() !== 10) throw new Error("Expected ten math answers.");
  const fixture = await page.evaluate(() => window.hifiLongFixture);
  const file = resolve(root, "docs/design/mockups/answer-quick-key-hifi-20261020.html");
  let html = await readFile(file, "utf8");
  html = html.replace(/(<script id="captured" type="application\/json">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
    const data = JSON.parse(json); data.answers[24] = content; data.longAnswerOverride = fixture;
    return start + JSON.stringify(data).replaceAll("<", "\\u003c") + end;
  });
  await writeFile(file, html);
  console.log("Updated only the Hi-fi tenth-part stress answer through fractionViewFor + MathText.");
} finally { await browser?.close(); await server.close(); }
