/** Student concept screens in a touch-capable mobile browser, using the DB-free fixture. */
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://localhost:3217";
const widths = (process.env.WIDTHS ?? "320,360,390,430").split(",").map(Number);
const heights = { 320: 700, 360: 780, 390: 844, 430: 932 };
const browser = await chromium.launch();

async function screen(width, query) {
  const page = await browser.newPage({
    viewport: { width, height: heights[width] ?? 900 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/dev/learn-hifi?${query}`);
  await page.locator("main").waitFor();
  await page.waitForFunction(() => !document.body.textContent?.includes("불러오는 중…"));
  return page;
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkShortViewportForm(page, width, label) {
  // A reduced visual viewport approximates the space left when a software keyboard opens.
  await page.setViewportSize({ width, height: 360 });
  const submit = page.locator('main button[type="submit"]');
  await submit.scrollIntoViewIfNeeded();
  const m = await page.evaluate(() => ({
    submitBottom: document.querySelector('main button[type="submit"]')?.getBoundingClientRect().bottom,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  }));
  check(m.submitBottom !== undefined && m.submitBottom <= 360 && m.overflow <= 1, `${width}: ${label} with short viewport (${JSON.stringify(m)})`);
}

try {
  for (const width of widths) {
    let page = await screen(width, "screen=login");
    await page.locator('input[name="loginId"]').fill("m1a-01");
    await page.locator('input[name="password"]').fill("2a584long");
    check((await page.locator('input[name="password"]').inputValue()) === "2a584long", `${width}: login password kept verbatim`);
    await page.locator('input[name="password"]').fill("7392");
    await page.locator('input[name="password"]').press("Enter");
    await page.waitForFunction(() => (document.querySelector('main [role="alert"]')?.textContent ?? "").length > 0);
    check((await page.locator('main [role="alert"]').innerText()).length > 0, `${width}: login keyboard feedback`);
    await checkShortViewportForm(page, width, "login form");
    await page.close();

    page = await screen(width, "screen=password");
    // Current and login passwords also accept existing 8–72 character passwords.
    await page.locator('input[name="currentPassword"]').fill("2a584long");
    check((await page.locator('input[name="currentPassword"]').inputValue()) === "2a584long", `${width}: existing password kept verbatim`);
    await page.locator('input[name="currentPassword"]').fill("7392");
    await page.locator('input[name="newPassword"]').fill("2a584");
    check((await page.locator('input[name="newPassword"]').inputValue()) === "2584", `${width}: PIN digit filter`);
    await page.locator('input[name="newPasswordAgain"]').fill("2a585");
    check((await page.locator('input[name="newPasswordAgain"]').inputValue()) === "2585", `${width}: confirmation PIN digit filter`);
    await checkShortViewportForm(page, width, "password form");
    await page.getByRole("button", { name: "바꾸고 들어가기" }).tap();
    check((await page.locator('main [role="alert"]').innerText()).includes("같지 않습니다"), `${width}: PIN mismatch feedback`);
    await page.locator('input[name="newPasswordAgain"]').fill("2584");
    await page.getByRole("button", { name: "바꾸고 들어가기" }).tap();
    await page.waitForFunction(() => {
      const message = document.querySelector('main [role="alert"]')?.textContent ?? "";
      return message.length > 0 && !message.includes("같지 않습니다");
    });
    await page.close();

    page = await screen(width, "screen=list&set=stress");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const listBottom = await page.evaluate(() => ({
      last: [...document.querySelectorAll('main a[href^="/learn/watch/"]')].at(-1)?.getBoundingClientRect().bottom,
      nav: document.querySelector('nav[aria-label="학생 학습 메뉴"]')?.getBoundingClientRect().top,
    }));
    check(listBottom.last !== undefined && listBottom.nav !== undefined && listBottom.last <= listBottom.nav, `${width}: final lecture obscured by mobile nav (${JSON.stringify(listBottom)})`);
    await page.close();

    page = await screen(width, "screen=watch&lecture=l4&at=52");
    await page.locator('input[aria-label="재생 위치"]:not([disabled])').waitFor();
    await page.getByRole("button", { name: "재생", exact: true }).tap();
    await page.getByRole("button", { name: "멈춤" }).waitFor();
    await page.waitForTimeout(1100);
    await page.getByRole("button", { name: "멈춤" }).tap();
    await page.getByRole("button", { name: "재생", exact: true }).waitFor();
    const rate = page.getByRole("button", { name: /재생 속도/ });
    const beforeRate = await rate.getAttribute("aria-label");
    await rate.tap();
    check((await rate.getAttribute("aria-label")) !== beforeRate, `${width}: playback rate touch`);
    const slider = page.locator('input[aria-label="재생 위치"]');
    const rect = await slider.boundingBox();
    check(rect !== null && rect.height >= 44, `${width}: slider touch target`);
    await page.touchscreen.tap(rect.x + rect.width * 0.9, rect.y + rect.height / 2);
    check(Number(await slider.inputValue()) <= 81, `${width}: forward seek guard`);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const watchBottom = await page.evaluate(() => ({
      last: document.querySelector('main a[href^="/learn/watch/"]')?.getBoundingClientRect().bottom,
      nav: document.querySelector('nav[aria-label="학생 학습 메뉴"]')?.getBoundingClientRect().top,
    }));
    check(watchBottom.last !== undefined && watchBottom.nav !== undefined && watchBottom.last <= watchBottom.nav, `${width}: next lecture obscured by mobile nav (${JSON.stringify(watchBottom)})`);
    await page.close();
    console.log(`✓ ${width}px: keyboard login, PIN touch, final card, playback touch, seek guard, next card`);
  }
} finally {
  await browser.close();
}
