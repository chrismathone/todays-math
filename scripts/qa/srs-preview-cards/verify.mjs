import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import { memoryGate } from "./memory-gate.mjs";

const root = process.cwd();
const out = path.join(
  root,
  "docs/planning/tracks/reports/srs-e5-preview-cards-g5-2-shots",
);
await mkdir(out, { recursive: true });
memoryGate("Vite");
const server = await createServer({
  configFile: false,
  root: path.join(root, "scripts/qa/srs-preview-cards"),
  publicDir: path.join(root, "public"),
  cacheDir: path.join(root, ".qa-artifacts/srs-preview-cards-cache"),
  plugins: [
    {
      name: "qa-next-client",
      enforce: "pre",
      resolveId(id) {
        if (id === "next/link") return "\0qa:next/link";
      },
      load(id) {
        if (id === "\0qa:next/link")
          return 'import React from "react"; export default function Link(props) { return React.createElement("a",props); }';
      },
      transform(code, id) {
        if (id.replaceAll("\\", "/").endsWith("/src/app/globals.css"))
          return code.replace(
            '@import "tailwindcss";',
            '@import "tailwindcss" source(none);',
          );
      },
    },
    react(),
  ],
  resolve: { alias: { "@": path.join(root, "src") } },
  optimizeDeps: { entries: ["index.html"] },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
  },
});
const cases = [
  ["5-2-2-1", "2 2/5"],
  ["5-2-2-2", "3 3/4"],
  ["5-2-2-3", "6/20"],
  ["5-2-2-4", "1 1/2"],
  ["5-2-3-1", "2"],
  ["5-2-3-2", "18"],
  ["5-2-3-3", "10"],
  ["5-2-3-4", "7"],
];
let browser;
const results = [],
  errors = [];
try {
  await server.listen();
  memoryGate("Chromium");
  browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.route("**/api/**", (route) => {
    errors.push(`Unexpected API: ${route.request().url()}`);
    return route.abort();
  });
  for (const theme of ["classic", "sea", "forest"])
    for (const width of [1280, 390])
      for (const [section, answer] of cases) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(
          `${server.resolvedUrls.local[0]}?section=${section}&theme=${theme}`,
        );
        await page.locator("[data-preview-figure] svg").waitFor();
        await page.waitForLoadState("networkidle");
        await page.locator(".katex").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        // Match app/layout.tsx: the accessible MathML must not appear beside the visible math.
        const mathml = await page
          .locator(".katex-mathml")
          .first()
          .evaluate((el) => ({
            position: getComputedStyle(el).position,
            width: el.getBoundingClientRect().width,
          }));
        expect(mathml.position).toBe("absolute");
        expect(mathml.width).toBeLessThanOrEqual(1);
        // CSS theme images must also finish before the evidence screenshot.
        await page.evaluate(async () => {
          const url = getComputedStyle(
            document.querySelector('[data-testid="study-spread"]')
              .parentElement,
          ).getPropertyValue("--study-theme");
          const match = url.match(/url\(["']?(.*?)["']?\)/);
          if (match) {
            const image = new Image();
            image.src = match[1];
            await image.decode();
          }
        });
        const measure = async (leaf) => {
          const result = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            innerOverflow: [...document.querySelectorAll("main *")]
              .filter(
                (el) =>
                  !el.closest(".katex-mathml") &&
                  el.getClientRects().length &&
                  el.clientWidth > 0 &&
                  el.scrollWidth > el.clientWidth + 1 &&
                  getComputedStyle(el).overflowX !== "visible",
              )
              .map((el) => ({
                tag: el.tagName,
                class: el.className,
                width: el.clientWidth,
                scroll: el.scrollWidth,
              })),
          }));
          expect(result.overflow).toBe(false);
          expect(result.innerOverflow).toEqual([]);
          const file = `${section}-${theme}-${width}-${leaf}.png`;
          await page.screenshot({ path: path.join(out, file), fullPage: true });
          results.push({ theme, width, section, leaf, ...result, file });
        };
        await measure(width === 390 ? "meaning" : "spread");
        if (width === 390) {
          await page
            .getByRole("button", { name: "예와 연습", exact: true })
            .click();
          await measure("practice");
        }
        const input = page.getByRole("textbox");
        if (section.startsWith("5-2-2-")) {
          await expect(input).toHaveAttribute("placeholder", "예: 1/2, 1 1/2");
          await expect(input).not.toHaveAttribute("inputmode", "numeric");
          await expect(
            page.getByText("분수는 1/2, 대분수는 1 1/2로 쓸 수 있어요."),
          ).toBeVisible();
        }
        await input.fill("999");
        await input.press("Enter");
        await expect(page.getByRole("status")).not.toContainText("맞았어요");
        await expect(page.getByRole("status")).not.toBeEmpty();
        await input.fill(answer);
        await expect(page.getByRole("status")).toBeEmpty();
        await input.press("Enter");
        await expect(page.getByRole("status")).toContainText("맞았어요");
        await page
          .getByRole("button", { name: "문제 풀기", exact: true })
          .click();
        await expect(page.locator("body")).toHaveAttribute(
          "data-started",
          "true",
        );
        await page
          .getByRole("button", { name: "학습 홈", exact: true })
          .click();
        await expect(page.locator("body")).toHaveAttribute(
          "data-exited",
          "true",
        );
      }
  expect(errors).toEqual([]);
  await writeFile(
    path.join(out, "results.json"),
    JSON.stringify(
      { screenshots: results.length, cases: 48, errors, results },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Chromium: 48 cases, ${results.length} screenshots; overflow/API/errors: 0`,
  );
} finally {
  await browser?.close();
  await server.close();
}
