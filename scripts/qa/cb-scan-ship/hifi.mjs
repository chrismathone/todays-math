import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const out = process.env.CB_SCAN_OUTPUT ?? "/tmp/cb-scan-ship-20261125";
const base = "http://127.0.0.1:4248";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const screens = [],
  errors = [],
  external = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (!url.startsWith(base) && !url.startsWith("data:")) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const option of ["H1", "H2", "H3", "H4"]) {
      for (const screen of [
        "paper",
        "capture",
        "check",
        "student",
        "teacher",
      ]) {
        await page.goto(`${base}/?option=${option}&screen=${screen}`);
        await expect(
          page.getByRole("heading", { name: "Hi-fi 비교" }),
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (["paper", "capture", "check", "teacher"].includes(screen))
          await expect(page.locator("[data-print-page]").first()).toBeVisible();
        const name = `${option}-${screen}-${width}`;
        await page.screenshot({
          path: path.join(out, `${name}.png`),
          fullPage: true,
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        screens.push({ name, width, overflow });
        expect(overflow, name).toBeLessThanOrEqual(1);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/?screen=check`);
  await page.getByLabel("사진 맞춤 성공 시안").uncheck();
  await expect(
    page.getByText("사진의 위치를 맞추지 못했습니다.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /확인 번호.*확대/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "종이에도 비워 뒀어요" }).click();
  await expect(page.getByText("직접 입력 · 빈 답으로 확인")).toBeVisible();
  await page.getByRole("button", { name: "지금 확인하기 어려워요" }).click();
  await expect(page.getByText("확인 필요로 남깁니다.")).toBeVisible();
  await page.screenshot({
    path: path.join(out, "H1-fallback-390.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "답 확인을 마치고 채점하기" }).click();
  await expect(page.locator("textarea")).toHaveCount(0);
  await page.goto(`${base}/?screen=capture`);
  await expect(
    page.getByRole("button", { name: "읽은 답 확인하기", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("교사 대리 촬영 시안").check();
  await page.getByRole("button", { name: "학생 고르기" }).click();
  await page.getByRole("button", { name: "학생 나 · 가상 학생" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "사진 찍기 · 시연" }).click();
  await expect(
    page.getByRole("button", { name: "읽은 답 확인하기", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("학생 나", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
} finally {
  await writeFile(
    path.join(out, "hifi-evidence.json"),
    JSON.stringify({ screens, errors, external }, null, 2),
  );
  await browser.close();
}
console.log(
  JSON.stringify({
    output: out,
    captures: screens.length + 1,
    errors,
    external,
  }),
);
