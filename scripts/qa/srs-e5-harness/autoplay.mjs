// 띄워 둔 탭에서 화면마다 무엇이 나오는지 기록하며 넘긴다. 답은 정확하지 않아도 된다(흐름 관찰용).
// node autoplay.mjs <최대 걸음> <캡처 접두>
import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const max = Number(process.argv[2] ?? 10);
const prefix = process.argv[3] ?? "auto";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = browser.contexts()[0].pages().find((p) => p.url().includes("localhost:4321"));
page.setDefaultTimeout(8000);
const log = [];
const visible = async (sel) => (await page.locator(sel).count()) > 0 && (await page.locator(sel).first().isVisible());
for (let i = 0; i < max; i++) {
  await page.waitForTimeout(900);
  const head = (await page.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 260);
  log.push(`#${i} ${head}`);
  await page.screenshot({ path: resolve(".qa-artifacts/srs-e5/shots", `${prefix}-${String(i).padStart(2, "0")}.png`) });
  const buttons = await page.locator("main button:visible").allInnerTexts();
  const flat = buttons.map((b) => b.replace(/\s+/g, " ").trim());
  const pick = (re) => flat.findIndex((b) => re.test(b));
  let acted = false;
  for (const re of [/뜻을 가리고 도전하기/, /다음 활동/, /다음/, /계속/, /확인했어요/, /이어서/]) {
    const k = pick(re);
    if (k >= 0 && !/진도판/.test(flat[k])) {
      await page.locator("main button:visible").nth(k).click();
      acted = true;
      break;
    }
  }
  if (acted) continue;
  const input = page.locator("main input:visible, main textarea:visible");
  if ((await input.count()) > 0) {
    await input.first().fill("1");
    await page.keyboard.press("Enter");
    continue;
  }
  if (flat.some((b) => /^1 /.test(b))) {
    await page.keyboard.press("1");
    await page.waitForTimeout(150);
    if (flat.some((b) => /^2 /.test(b)) && flat.some((b) => /확인하기/.test(b))) await page.keyboard.press("2");
    await page.waitForTimeout(150);
    if (flat.some((b) => /확인하기/.test(b))) await page.keyboard.press("Enter");
    continue;
  }
  log.push(`   멈춤 — 단추: ${flat.join(" | ")}`);
  break;
}
console.log(log.join("\n"));
await browser.close().catch(() => {});
