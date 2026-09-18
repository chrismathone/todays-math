/**
 * `/dev/report-wire` 네 탭 × 두 상태(ⓐ 실데이터 · ⓑ 예시)를 넓은 폭과 휴대폰 폭(390)으로 찍는다.
 * 원장님께 그대로 보여 드릴 그림이다 (D-134 트랙 2 브리프 §3).
 *
 *   npx next dev --port 3117          # 먼저 띄운다
 *   node scratch/shot-report-wire.mjs
 */
import { mkdirSync } from "node:fs";

import { chromium } from "@playwright/test";

const OUT = "scratch/report-wire";
const URL = process.env.WIRE_URL ?? "http://localhost:3117/dev/report-wire";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

for (const [widthName, width] of [
  ["wide", 1280],
  ["phone", 390],
]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.on("pageerror", (e) => errors.push(`${widthName}: ${String(e)}`));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  if (widthName === "wide") {
    const head = await page.evaluate(() =>
      document.body.innerText.split("\n").slice(0, 8).join(" | "),
    );
    console.log("머리:", head.replace(/\s+/g, " ").slice(0, 300));
  }

  for (const [modeName, modeLabel] of [
    ["a-real", "ⓐ 지금 실데이터"],
    ["b-example", "ⓑ 채점 · 영상이 찬 뒤"],
  ]) {
    await page.getByRole("button", { name: modeLabel }).click();
    for (const key of ["A", "B", "C", "D"]) {
      await page
        .getByRole("button", { name: new RegExp(`^${key}\\.`) })
        .click();
      await page.waitForTimeout(120);
      const box = await page.evaluate(() => ({
        doc: document.documentElement.scrollHeight,
        overflowX:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      }));
      console.log(
        `  ${widthName} ${modeName} ${key}안 · 문서 ${box.doc}px${
          box.overflowX ? " · 🔴 가로 스크롤" : ""
        }`,
      );
      await page.screenshot({
        path: `${OUT}/${widthName}-${modeName}-${key}.png`,
        fullPage: true,
      });
    }
  }
  await page.close();
}

console.log("오류:", errors.length ? errors.join(" | ") : "없음");
await browser.close();
