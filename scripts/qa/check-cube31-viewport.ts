/** Verify every activity fits, without silently clipping controls or scrolling the page. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { CUBE_LESSONS } from "../../src/lib/lab/cube31/lessons";

const output = path.join(os.tmpdir(), "cube31-viewport-qa");
mkdirSync(output, { recursive: true });
async function main() {
  const browser = await chromium.launch({ headless: true });
  const results: unknown[] = [];
  try {
    for (const viewport of [
      { width: 1920, height: 920 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      if (
        process.env.CUBE_QA_WIDTH &&
        viewport.width !== Number(process.env.CUBE_QA_WIDTH)
      )
        continue;
      const page = await browser.newPage({ viewport });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        (process.env.CUBE_QA_URL ?? "http://localhost:3107") + "/lab/cube-3-1",
      );
      await expect(page.locator('[aria-busy="false"]')).toBeVisible();
      const rows = [];
      for (let lesson = 0; lesson < CUBE_LESSONS.length; lesson++) {
        if (viewport.width <= 760)
          await page.getByRole("button", { name: "학습 순서 보기" }).click();
        const nav = page.getByRole("navigation", { name: "단원 학습 순서" });
        await nav.getByRole("button").nth(lesson).click();
        if (viewport.width <= 760)
          await page.getByRole("button", { name: "학습 순서 보기" }).click();
        await expect
          .poll(() =>
            nav.evaluate((el) => {
              const selected = el
                .querySelector('[aria-current="step"]')!
                .getBoundingClientRect();
              const frame = el.getBoundingClientRect();
              return Math.abs(
                (selected.top + selected.bottom - frame.top - frame.bottom) / 2,
              );
            }),
          )
          .toBeLessThan(2);
        if (viewport.width <= 760)
          await page.getByRole("button", { name: "학습 순서 닫기" }).click();
        const steps = page.getByRole("button", { name: /^\d+번째 활동$/ });
        for (let step = 0; step < (await steps.count()); step++) {
          await steps.nth(step).click();
          await page.evaluate(
            () =>
              new Promise<void>((resolve) =>
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => resolve()),
                ),
              ),
          );
          const geometry = await page.evaluate(() => {
            const frame = document.querySelector<HTMLElement>(
              '[class*="activityViewport"]',
            )!;
            const body = document.querySelector<HTMLElement>(
              '[class*="activityContent"]',
            )!;
            const rect = body.getBoundingClientRect();
            const frameRect = frame.getBoundingClientRect();
            const outside = [
              ...document.querySelectorAll<HTMLElement>(
                "article button, article input",
              ),
            ]
              .filter((el) => {
                const r = el.getBoundingClientRect();
                return (
                  r.width &&
                  r.height &&
                  (r.top < -1 ||
                    r.bottom > innerHeight + 1 ||
                    r.left < -1 ||
                    r.right > innerWidth + 1)
                );
              })
              .map(
                (el) => el.getAttribute("aria-label") ?? el.textContent?.trim(),
              );
            return {
              scrollHeight: document.documentElement.scrollHeight,
              scrollWidth: document.documentElement.scrollWidth,
              scrollY,
              scale: Number(body.style.getPropertyValue("--activity-scale")),
              activityBottom: rect.bottom,
              frameBottom: frameRect.bottom,
              outside,
            };
          });
          const label = `${viewport.width}×${viewport.height}, ${lesson + 1}.${step + 1}`;
          assert(
            geometry.scrollHeight <= viewport.height,
            `${label}: page scrolls vertically`,
          );
          assert(
            geometry.scrollWidth <= viewport.width,
            `${label}: page scrolls horizontally`,
          );
          assert.equal(geometry.scrollY, 0, `${label}: page moved`);
          assert(
            geometry.activityBottom <= geometry.frameBottom + 1,
            `${label}: activity clipped`,
          );
          assert.deepEqual(
            geometry.outside,
            [],
            `${label}: controls outside viewport`,
          );
          if (
            viewport.width >= 1366 &&
            CUBE_LESSONS[lesson].tasks[step]?.kind === "regroup"
          ) {
            assert(
              geometry.scale >= 0.8,
              `${label}: manipulative is too small to use`,
            );
          }
          rows.push({ lesson, step, scale: geometry.scale });
          if ((lesson === 1 || lesson === 12) && step === 0)
            await page.screenshot({
              path: path.join(output, `${viewport.width}-${lesson}.png`),
            });
        }
      }
      if (viewport.width > 760) {
        const nav = page.getByRole("navigation", { name: "단원 학습 순서" });
        const before = await nav.evaluate((el) => el.scrollTop);
        const stage = await page.locator("article").boundingBox();
        await nav.hover();
        await page.mouse.wheel(0, -200);
        await expect
          .poll(() => nav.evaluate((el) => el.scrollTop))
          .toBeLessThan(before);
        assert.deepEqual(
          await page.locator("article").boundingBox(),
          stage,
          "Scrolling lessons moved the activity",
        );
        assert.equal(await page.evaluate(() => scrollY), 0);
      }
      assert.deepEqual(errors, []);
      results.push({
        viewport,
        activities: rows.length,
        minimumScale: Math.min(...rows.map((r) => r.scale)),
        rows,
      });
      console.log(
        JSON.stringify({
          viewport,
          activities: rows.length,
          minimumScale: Math.min(...rows.map((r) => r.scale)),
        }),
      );
      await page.close();
    }
    writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(results, null, 2),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
