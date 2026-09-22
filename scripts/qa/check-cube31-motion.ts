/** Isolated real-browser board QA; no app server, authentication, or database. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, type Page } from "@playwright/test";

const output = path.join(os.tmpdir(), "cube31-motion-qa");
const names = ["일의 자리", "십의 자리", "백의 자리"];

async function main() {
  mkdirSync(output, { recursive: true });
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
    css: { postcss: { plugins: [] } },
    server: { host: "127.0.0.1", port: 3110, strictPort: true },
    plugins: [
      react(),
      {
        name: "cube-motion-harness",
        resolveId(id) {
          if (id === "virtual:cube-motion") return "\0cube-motion.tsx";
        },
        load(id) {
          if (id !== "\0cube-motion.tsx") return;
          return `import React from 'react';
          import {createRoot} from 'react-dom/client';
          import Board from '/src/components/lab/cube31/RegroupingBoard.tsx';
          const p = new URLSearchParams(location.search);
          createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(Board,{problem:{a:Number(p.get('a')??473),b:Number(p.get('b')??352),operation:p.get('op')??'add'},onComplete:()=>{}})));`;
        },
        configureServer(vite) {
          vite.middlewares.use(async (req, res, next) => {
            if (req.url?.split("?")[0] !== "/") return next();
            res.setHeader("Content-Type", "text/html");
            res.end(
              await vite.transformIndexHtml(
                "/",
                `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;font-family:Arial,sans-serif}#root{container: cube-workspace / inline-size;width:100%;max-width:1100px}*{box-sizing:border-box}</style></head><body><div id="root"></div><script type="module" src="/@id/virtual:cube-motion"></script></body></html>`,
              ),
            );
          });
        },
      },
    ],
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1000 },
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const evidence: Record<string, unknown> = {};
  async function open(query = "") {
    await page.goto(`http://127.0.0.1:3110/${query}`);
    await page.getByRole("button", { name: "처음부터", exact: true }).waitFor();
  }
  async function move(p: number, n: number) {
    await page
      .getByRole("button", { name: `${names[p]} 1개 옮기기`, exact: true })
      .evaluate((button, count) => {
        for (let i = 0; i < count; i++) (button as HTMLButtonElement).click();
      }, n);
  }
  async function geometry() {
    return page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          '[data-regrouping-board], [data-regrouping-board] section, [data-drop], [data-block-zone="tray"]',
        ),
      ).map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    );
  }
  async function noClipping(target: Page) {
    const clipped = await target.evaluate(
      () =>
        Array.from(document.querySelectorAll("[data-block-zone] svg")).filter(
          (element) => {
            const rect = element.getBoundingClientRect();
            const zone = element
              .closest("[data-block-zone]")!
              .getBoundingClientRect();
            return (
              rect.left < zone.left - 0.5 ||
              rect.right > zone.right + 0.5 ||
              rect.top < zone.top - 0.5 ||
              rect.bottom > zone.bottom + 0.5
            );
          },
        ).length,
    );
    assert.equal(clipped, 0, "all blocks fit inside their reserved slots");
  }
  try {
    await open();
    const initial = await geometry();
    evidence.initial = initial;
    assert.ok(
      initial[0].height <= 500,
      `desktop board ${initial[0].height}px exceeds 500px`,
    );
    await move(2, 3);
    await page.getByLabel("백의 자리 작업판 7개").waitFor();
    assert.deepEqual(await geometry(), initial);
    await move(1, 5);
    await page.getByLabel("십의 자리 작업판 12개").waitFor();
    assert.deepEqual(await geometry(), initial);
    await page.screenshot({
      path: path.join(output, "473-352-before-bundle.png"),
    });
    evidence.bundle = await page
      .getByRole("button", { name: "십의 자리 10개 묶기", exact: true })
      .evaluate(async (button) => {
        (button as HTMLButtonElement).click();
        await new Promise(requestAnimationFrame);
        return Array.from(
          document.querySelectorAll('[data-block-flight="bundle"]'),
        ).map((element) => {
          const animation = element.getAnimations()[0];
          animation.pause();
          animation.currentTime = 150;
          return {
            timing: animation.effect?.getTiming(),
            frames: (animation.effect as KeyframeEffect).getKeyframes(),
          };
        });
      });
    await page.getByLabel("백의 자리 작업판 8개").waitFor();
    assert.deepEqual(await geometry(), initial);
    assert.equal((evidence.bundle as unknown[]).length, 10);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(output, "473-352-flight.png") });
    await page
      .locator('[data-block-flight="bundle"]')
      .evaluateAll((elements) =>
        elements.forEach((element) =>
          element.getAnimations().forEach((animation) => animation.play()),
        ),
      );
    await page.waitForTimeout(600);
    assert.equal(await page.locator("[data-block-motion-layer]").count(), 0);
    await move(0, 2);
    await page.waitForTimeout(650);
    await page.screenshot({
      path: path.join(output, "473-352-after-bundle.png"),
    });
    await noClipping(page);

    // Verify both CSS zoom and transformed ancestors use real screen rects.
    for (const mode of ["zoom", "transform"]) {
      await open();
      await page.locator("#root").evaluate((root, kind) => {
        root.style.setProperty(kind, kind === "zoom" ? ".7" : "scale(.7)");
        root.style.transformOrigin = "top left";
      }, mode);
      evidence[mode] = await page
        .getByRole("button", {
          name: "옮기기: 백의 자리 백 판 1번",
          exact: true,
        })
        .evaluate((button) => {
          const rect = button.querySelector("svg")!.getBoundingClientRect();
          (button as HTMLButtonElement).click();
          return { x: rect.x, y: rect.y, width: rect.width };
        });
      const ghost = await page
        .locator('[data-block-flight="move"]')
        .evaluate((element) => {
          const node = element as HTMLElement;
          const effect = node.getAnimations()[0].effect as KeyframeEffect;
          return {
            x: parseFloat(node.style.left),
            y: parseFloat(node.style.top),
            width: parseFloat(node.style.width),
            frames: effect.getKeyframes(),
            duration: effect.getTiming().duration,
          };
        });
      const source = evidence[mode] as { x: number; y: number; width: number };
      assert.ok(Math.abs(ghost.x - source.x) < 0.01);
      assert.ok(Math.abs(ghost.y - source.y) < 0.01);
      assert.ok(Math.abs(ghost.width - source.width) < 0.01);
      assert.equal(ghost.duration, 420);
      assert.notEqual(
        ghost.frames[0].transform,
        ghost.frames.at(-1)?.transform,
      );
      evidence[`${mode}Flight`] = ghost;
    }

    await open("?a=999&b=999");
    const maximum = await geometry();
    for (const p of [0, 1, 2]) await move(p, 9);
    await page
      .getByRole("button", { name: "일의 자리 10개 묶기", exact: true })
      .click();
    await page.getByLabel("십의 자리 작업판 19개").waitFor();
    await noClipping(page);
    assert.deepEqual(await geometry(), maximum);
    await page
      .getByRole("button", { name: "십의 자리 10개 묶기", exact: true })
      .click();
    await page.getByLabel("백의 자리 작업판 19개").waitFor();
    await noClipping(page);
    assert.deepEqual(await geometry(), maximum);
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(output, "999-999-maximum.png") });
    evidence.maximum = maximum;
    for (const width of [1024, 800, 760, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await noClipping(page);
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        height: document
          .querySelector("[data-regrouping-board]")!
          .getBoundingClientRect().height,
      }));
      assert.equal(
        dimensions.scroll,
        dimensions.client,
        `horizontal overflow at ${width}`,
      );
      evidence[`width${width}`] = dimensions;
    }

    await page.setViewportSize({ width: 1200, height: 1000 });
    await open("?a=402&b=175&op=subtract");
    const subtraction = await geometry();
    await page
      .getByRole("button", { name: "백의 자리 1개 풀기", exact: true })
      .click();
    assert.equal(await page.locator('[data-block-flight="split"]').count(), 10);
    await page
      .getByRole("button", { name: "십의 자리 1개 풀기", exact: true })
      .click();
    assert.deepEqual(await geometry(), subtraction);
    await page
      .getByRole("button", { name: "일의 자리 1개 빼기", exact: true })
      .click();
    assert.ok(await page.locator('[data-block-flight="remove"]').count());
    assert.deepEqual(await geometry(), subtraction);
    await page
      .getByRole("button", { name: "한 번 되돌리기", exact: true })
      .click();
    assert.equal(await page.locator("[data-block-motion-layer]").count(), 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "일의 자리 1개 빼기", exact: true })
      .click();
    assert.equal(await page.locator("[data-block-motion-layer]").count(), 0);
    assert.equal(
      await page
        .locator("[data-regrouping-board]")
        .evaluate((board) => board.getAnimations({ subtree: true }).length),
      0,
    );
    assert.deepEqual(errors, []);
    writeFileSync(
      path.join(output, "measurements.json"),
      JSON.stringify(evidence, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          output,
          initialHeight: initial[0].height,
          maximumHeight: maximum[0].height,
          checks:
            "stable geometry, 19 blocks, zoom/transform, 420ms flights, bundle/split, removal, cleanup, reduced motion, narrow widths",
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
    await server.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
