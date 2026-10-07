import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = process.env.EXPLORER_QA_URL ?? "http://localhost:4310";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error("Local isolated preview only");
const output = resolve(".qa-artifacts/student-shell");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(90_000);
const errors = [], api = [], rows = [];
page.on("pageerror", error => errors.push(error.message));
page.on("request", request => {
  if (new URL(request.url()).pathname.startsWith("/api/")) api.push(request.method()+" "+new URL(request.url()).pathname);
});
function assert(value, message) { if (!value) throw new Error(message); }
try {
  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const screen of ["list", "watch"]) {
      await page.goto(`${base}/dev/learn-hifi?screen=${screen}&set=${screen === "list" ? "empty" : "mockup"}`, { waitUntil: "domcontentloaded" });
      await page.locator("[data-student-module-content]").waitFor();
      if (screen === "list") await page.getByText("아직 배정된 강의가 없어요", { exact: true }).waitFor();
      else await page.getByRole("heading", { level: 1 }).waitFor();
      const geometry = await page.evaluate(() => {
        const module = document.querySelector("[data-student-module-content]");
        const logout = document.querySelector("[data-student-header] button");
        const visible = node => node.getBoundingClientRect().height > 0 && getComputedStyle(node).display !== "none";
        return { overflow: document.documentElement.scrollWidth - innerWidth, moduleWidth: module.getBoundingClientRect().width,
          headers: document.querySelectorAll("[data-student-header]").length, logoutHeight: logout.getBoundingClientRect().height,
          logoutDisabled: logout.disabled, visibleNav: [...document.querySelectorAll("[data-student-global-nav]")].filter(visible).length,
          labels: [...document.querySelectorAll("[data-student-global-nav] a")].filter(visible).map(node => node.textContent.trim()) };
      });
      assert(geometry.overflow === 0, `${width}-${screen}: overflow`);
      assert(geometry.headers === 1 && geometry.logoutHeight >= 44 && geometry.logoutDisabled, `${width}-${screen}: header/logout`);
      assert(geometry.visibleNav === 1 && geometry.labels.join(",") === "탐험,도감,강의", `${width}-${screen}: menus`);
      if (width >= 1280) assert(geometry.moduleWidth >= Math.min(width,1600)-50, `${width}-${screen}: unused desktop space`);
      rows.push({ width, screen, ...geometry });
      await page.screenshot({ path: resolve(output, `${width}-${screen}.png`), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`${base}/dev/learn-hifi?screen=issue&state=issued`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "김도윤", exact: true }).click();
  const panel = page.getByRole("form", { name: "학생 학습 메뉴 설정" });
  await panel.waitFor();
  assert(await panel.getByRole("checkbox", { checked: false }).count() === 2, "new student default");
  await panel.getByRole("checkbox", { name: "강의", exact: true }).check();
  await panel.getByRole("button", { name: "학습 메뉴 저장", exact: true }).click();
  await panel.getByText("저장했습니다.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "이서연", exact: true }).click();
  await panel.waitFor();
  assert(await panel.getByRole("checkbox", { checked: false }).count() === 2, "other student isolation");
  await page.getByRole("button", { name: "김도윤", exact: true }).click();
  await panel.waitFor();
  assert(await panel.getByRole("checkbox", { name: "강의", exact: true }).isChecked(), "first student persisted grant");
  await panel.getByRole("checkbox", { name: "강의", exact: true }).uncheck();
  await panel.getByRole("button", { name: "학습 메뉴 저장", exact: true }).click();
  await panel.getByText("저장했습니다.", { exact: true }).waitFor();
  assert(await panel.getByRole("checkbox", { checked: false }).count() === 2, "disable all");
  await page.screenshot({ path: resolve(output, "390-manager.png"), fullPage: true });
  assert(errors.length === 0, errors.join("\n"));
  assert(api.length === 0, `Unexpected real API calls: ${api.join(",")}`);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ rows, manager: "two students, save and revoke", errors, api }, null, 2));
  process.stdout.write(`Student shell: ${rows.length} views, manager save/revoke/isolation, 0 errors, 0 real API calls.\n`);
} finally { await browser.close(); }
