/** Real BankView/CSS in Chromium, synthetic read-only responses; no Next build or DB. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, expect } from "@playwright/test";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const out = path.join(root, ".qa-artifacts/unified-bank-filters");
await mkdir(out, { recursive: true });
const units = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    grade: "중1",
    chapter: "수와 연산",
    section: "정수의 뜻과 수직선에서 정수의 대소 관계",
    orderIndex: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    grade: "중1",
    chapter: "수와 연산",
    section: "유리수의 덧셈과 뺄셈",
    orderIndex: 2,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    grade: "중2",
    chapter: "식의 계산",
    section: "단항식의 곱셈",
    orderIndex: 3,
  },
];
const problem = {
  id: "eligible",
  content: "다음 식을 계산하시오. $2 + 3$",
  answer: "5",
  solution: "$2 + 3 = 5$",
  grade: "중1",
  chapter: "수와 연산",
  section: "정수",
  difficulty: "기본",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  eligible: true,
  ineligibleReason: null,
  reviewStatus: "approved",
};
const data = {
  problems: [
    problem,
    {
      ...problem,
      id: "pending",
      eligible: false,
      reviewStatus: "pending",
      ineligibleReason: "검수를 통과하지 않은 문항입니다.",
    },
  ],
  total: 30,
  page: 1,
  pageSize: 12,
  units,
  grades: [
    { grade: "중1", count: 20 },
    { grade: "중2", count: 10 },
  ],
  chapters: ["수와 연산", "식의 계산"],
};
await writeFile(
  path.join(out, "index.html"),
  `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>`,
);
await writeFile(
  path.join(out, "entry.tsx"),
  `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import BankView from '/src/components/unified/BankView.tsx';
import '/src/app/globals.css';
import 'katex/dist/katex.min.css';
import './frame.css';
function App() {
  const [selected, setSelected] = useState([]);
  return <main className="qa-frame"><BankView initialData={${JSON.stringify(data)}} selected={selected}
    onToggle={p => setSelected(current => current.some(row => row.id === p.id) ? current.filter(row => row.id !== p.id) : [...current, p])}
    onExport={() => {}} /></main>;
}
createRoot(document.getElementById('root')).render(<App />);
`,
);
await writeFile(
  path.join(out, "frame.css"),
  `body{margin:0;background:#f4f6fa;font-family:Arial,sans-serif}.qa-frame{margin-left:240px;padding:32px;min-width:0}@media(max-width:900px){.qa-frame{margin-left:0;padding:16px}}`,
);

const server = await createServer({
  configFile: false,
  root,
  plugins: [react()],
  resolve: { alias: { "@": path.join(root, "src") } },
  optimizeDeps: { entries: [path.join(out, "index.html")] },
  server: { host: "127.0.0.1", port: 0 },
  logLevel: "error",
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const measurements = [];
  for (const width of [1440, 1024, 768, 375, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/dev/unified/problems?**", async (route) => {
      const params = new URL(route.request().url()).searchParams;
      requests.push(Object.fromEntries(params));
      await route.fulfill({
        json: { ...data, page: Number(params.get("page")) },
      });
    });
    await page.goto(`${origin}/.qa-artifacts/unified-bank-filters/index.html`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(
      page.getByRole("heading", { name: "문제은행", exact: true }),
    ).toBeVisible();
    if (width <= 620)
      await page.getByRole("button", { name: "상세 필터" }).click();
    for (const label of ["학년", "단원", "난이도", "유형", "상태", "출처"]) {
      await expect(page.getByRole("combobox", { name: label })).toBeVisible();
    }
    const searchBox = await page.getByRole("search").boundingBox();
    assert(
      searchBox.width <= 401,
      `Search grew to ${searchBox.width}px at ${width}px`,
    );
    const controls = await page.getByRole("combobox").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
    assert(
      controls.every(
        (box) => box.height >= 44 && box.x >= 0 && box.x + box.width <= width,
      ),
      "Filter controls must fit the viewport and remain touch-sized",
    );
    assert(
      Math.max(...controls.map((box) => box.width)) -
        Math.min(...controls.map((box) => box.width)) <=
        1,
      "Filter columns must align",
    );
    await page
      .getByRole("combobox", { name: "유형" })
      .selectOption("format:short_answer");
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    assert.equal(requests.at(-1).format, "short_answer");
    assert.equal(requests.at(-1).problemType, undefined);
    await page.getByRole("combobox", { name: "상태" }).selectOption("pending");
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await page.getByRole("checkbox", { name: "정답", exact: true }).check();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    assert.equal(requests.at(-1).hasAnswer, "true");
    await page.getByRole("button", { name: "범위", exact: true }).click();
    const picker = page.getByRole("group", { name: "문제은행 단원 범위" });
    await picker
      .getByRole("button", { name: units[0].section, exact: true })
      .click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await picker
      .getByRole("button", { name: units[1].section, exact: true })
      .click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    assert.equal(requests.at(-1).unitFrom, units[0].id);
    assert.equal(requests.at(-1).unitTo, units[1].id);
    await page
      .getByRole("textbox", { name: "문제 검색" })
      .fill("긴 검색어가 있는 문제 내용과 문항번호");
    await page.getByRole("button", { name: "검색", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    assert(
      overflow.document <= overflow.viewport,
      `Horizontal overflow at ${width}px: ${JSON.stringify(overflow)}`,
    );
    const chips = await page
      .getByRole("group", { name: "적용한 검색 조건" })
      .getByRole("button")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return { x: box.x, right: box.right, height: box.height };
        }),
      );
    assert(
      chips.every(
        (box) => box.x >= 0 && box.right <= width && box.height >= 44,
      ),
      "Active chips must fit and remain touch-sized",
    );
    await page.screenshot({
      path: path.join(out, `bank-active-${width}.png`),
      fullPage: true,
    });
    await expect(
      page.getByRole("button", { name: "2번 문제 담기", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("checkbox", { name: "2번 문제 담기", exact: true }),
    ).toBeDisabled();
    await page.getByRole("checkbox", { name: "이 페이지 전체 담기" }).check();
    await expect(
      page.getByRole("checkbox", { name: "1번 문제 담기 취소" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "2번 문제 담기" }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "다음 페이지" }).click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    assert.equal(requests.at(-1).page, "2");
    assert.equal(requests.at(-1).reviewStatus, "pending");
    await page.getByRole("button", { name: "초기화", exact: true }).click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    assert.deepEqual(requests.at(-1), { page: "1" });
    await page.getByRole("button", { name: "범위", exact: true }).click();
    await page.screenshot({
      path: path.join(out, `bank-${width}.png`),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    measurements.push({
      viewport: width,
      searchWidth: searchBox.width,
      controlWidth: controls[0].width,
      minimumControlHeight: Math.min(...controls.map((box) => box.height)),
      chipCount: chips.length,
      overflow: false,
      requestCount: requests.length,
    });
    await page.close();
  }
  await writeFile(
    path.join(out, "measurements.json"),
    JSON.stringify(measurements, null, 2),
  );
  console.log(JSON.stringify(measurements, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
