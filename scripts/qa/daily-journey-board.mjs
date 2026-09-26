import { chromium, webkit } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.BASE ?? "http://localhost:3000";
await mkdir(".qa-artifacts/daily-journey-board", { recursive: true });
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch({ headless: true });
  for (const width of [320, 390, 430]) {
    const page = await browser.newPage({
      viewport: { width, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(`${base}/dev/daily-journey-qa?days=17`);
    await page.waitForSelector("[data-qa-ready=true]");
    const measurements = await page
      .locator("[data-day-step]")
      .evaluateAll((tiles) =>
        tiles.map((tile) => {
          const body = tile.firstElementChild;
          return {
            step: tile.getAttribute("data-day-step"),
            h: body.clientHeight,
            sh: body.scrollHeight,
            w: body.clientWidth,
            sw: body.scrollWidth,
          };
        }),
      );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `${name} ${width}: page overflows`);
    assert.deepEqual(
      measurements.filter((t) => t.sh > t.h + 1 || t.sw > t.w + 1),
      [],
      `${name} ${width}: tile content clipped`,
    );
    console.log(
      name,
      width,
      "overflow",
      overflow,
      "badtiles",
      JSON.stringify(
        measurements.filter((t) => t.sh > t.h + 1 || t.sw > t.w + 1),
      ),
    );
    await page.locator("[data-daily-journey]").screenshot({
      path: `.qa-artifacts/daily-journey-board/${name}-${width}.png`,
    });
    await page.getByRole("button", { name: "이전 진도판" }).click();
    await page.getByRole("button", { name: /^1일차, .*다시 풀기/ }).click();
    if ((await page.getByLabel("검수 복습 일차").textContent()) !== "qa-day-1")
      throw new Error("Wrong replay day");
    await page.getByRole("button", { name: "현재 위치로" }).click();
    const before = await page
      .getByLabel("내 말, 17일 학습 완료")
      .getAttribute("style");
    await page.getByRole("button", { name: /이어서 학습하기/ }).click();
    if (
      (await page.getByLabel("내 말, 17일 학습 완료").getAttribute("style")) !==
      before
    )
      throw new Error("Moved on individual answer");
    await page.getByRole("button", { name: "검수: 하루 완료" }).click();
    await page.getByLabel("내 말, 18일 학습 완료").waitFor();
    await page.close();
  }
  await browser.close();
}
