/** Real bank layout in Chromium; synthetic responses, no database or AI calls. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, expect } from "@playwright/test";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const out = path.join(root, ".qa-artifacts/bank-detail-layout");
await mkdir(out, { recursive: true });
const base = {
  answer: "827",
  solution: "$485+342=827$",
  grade: "초3",
  chapter: "덧셈과 뺄셈",
  section: "세 자리 수의 덧셈",
  difficulty: "기본",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  eligible: true,
  reviewStatus: "approved",
};
const data = {
  problems: [
    {
      ...base,
      id: "short",
      problemCode: "SHORT",
      content: "두 수의 합을 구하시오.\n\n$485,342$",
    },
    {
      ...base,
      id: "choices",
      problemCode: "CHOICES",
      content:
        "두 수의 합을 구하시오.\n\n$485,342$\n\n① $826$ ② $828$ ③ $825$ ④ $817$ ⑤ $827$",
    },
    {
      ...base,
      id: "long",
      problemCode: "LONG",
      content:
        "계산 과정을 확인하세요.\n\n" +
        "다음 계산에서 자릿수를 맞추고 받아올림을 확인하세요.\n\n".repeat(9),
      solution: "풀이의 각 단계를 확인합니다.\n\n".repeat(35),
    },
    {
      ...base,
      id: "pending",
      problemCode: "PENDING",
      content: "검수 대기 문항입니다.",
      eligible: false,
      reviewStatus: "pending",
      ineligibleReason: "검수를 통과하지 않은 문항입니다.",
    },
  ],
  total: 4,
  page: 1,
  pageSize: 12,
  units: [],
  grades: [{ grade: "초3", count: 4 }],
  chapters: ["덧셈과 뺄셈"],
};
await writeFile(
  path.join(out, "index.html"),
  '<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>',
);
await writeFile(
  path.join(out, "entry.tsx"),
  `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import BankView from '/src/components/unified/BankView.tsx';import '/src/app/globals.css';import 'katex/dist/katex.min.css';import './frame.css';function App(){const [selected,setSelected]=useState([]);return <main className="qa-frame"><BankView initialData={${JSON.stringify(data)}} selected={selected} onToggle={p=>setSelected(s=>s.some(x=>x.id===p.id)?s.filter(x=>x.id!==p.id):[...s,p])} onExport={()=>{}}/></main>;}createRoot(document.getElementById('root')).render(<App/>);`,
);
await writeFile(
  path.join(out, "frame.css"),
  "body{margin:0;background:#f4f6fa;font-family:Arial,sans-serif}.qa-frame{margin-left:240px;padding:24px;min-width:0}@media(max-width:900px){.qa-frame{margin-left:0;padding:12px}}",
);
console.log("Starting isolated bank fixture");
const server = await createServer({
  configFile: false,
  root,
  plugins: [react()],
  define: { "process.env": "{}" },
  resolve: { alias: { "@": path.join(root, "src") } },
  optimizeDeps: { entries: [path.join(out, "index.html")] },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, realpathSync(path.join(root, "node_modules"))] },
  },
  logLevel: "error",
});
let browser;
const failures = [],
  measurements = [],
  errors = [];
try {
  await server.listen();
  console.log("Bank fixture listening");
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const width of [2048, 1440, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", (route) => route.fulfill({ json: data }));
    await page.goto(`${origin}/.qa-artifacts/bank-detail-layout/index.html`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(4);
    const offsets = await cards.evaluateAll((nodes) =>
      nodes.map((card) => {
        const buttons = [...card.querySelectorAll("button")].filter((button) =>
          button.textContent.includes("문제 상세"),
        );
        const bounds = card.getBoundingClientRect();
        const action = buttons[0].getBoundingClientRect();
        return {
          top: bounds.top,
          bottom: bounds.bottom,
          buttonBottom: action.bottom,
          offset: bounds.bottom - action.bottom,
        };
      }),
    );
    if (
      Math.max(...offsets.map((x) => x.offset)) -
        Math.min(...offsets.map((x) => x.offset)) >
      1
    )
      failures.push(
        `${width}: card button offsets differ ${JSON.stringify(offsets)}`,
      );
    await page.screenshot({
      path: path.join(out, `cards-${width}.png`),
      fullPage: true,
    });
    for (const index of [0, 2]) {
      await cards
        .nth(index)
        .getByRole("button", { name: "문제 상세", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      if (Math.abs(bounds.x + bounds.width / 2 - width / 2) > 1)
        failures.push(
          `${width}: dialog is not centered ${JSON.stringify(bounds)}`,
        );
      if (
        bounds.x < 0 ||
        bounds.x + bounds.width > width ||
        bounds.y < 0 ||
        bounds.y + bounds.height > 960
      )
        failures.push(`${width}: dialog leaves viewport`);
      const footer = dialog.locator("footer");
      const before = await footer.boundingBox();
      await dialog.getByText("풀이", { exact: true }).evaluate((node) => {
        let parent = node.parentElement;
        while (parent && parent.scrollHeight <= parent.clientHeight + 1)
          parent = parent.parentElement;
        if (parent) parent.scrollTop = parent.scrollHeight;
      });
      const after = await footer.boundingBox();
      if (
        Math.abs(before.y - after.y) > 1 ||
        after.y + after.height > bounds.y + bounds.height + 1
      )
        failures.push(`${width}: footer moves while scrolling`);
      measurements.push({
        width,
        kind: index ? "long" : "short",
        bounds,
        offsets,
      });
      await page.screenshot({
        path: path.join(out, `detail-${index ? "long" : "short"}-${width}.png`),
      });
      await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    }
    await page.close();
  }
  await writeFile(
    path.join(out, "report.json"),
    JSON.stringify({ measurements, failures, errors }, null, 2),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  console.log(
    "Bank card bottoms and short/long modal positions passed at five viewport sizes.",
  );
} finally {
  await browser?.close();
  await server.close();
}
