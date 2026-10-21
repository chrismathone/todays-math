// 띄워 둔 크로뮴(원격 디버깅 9333)에 붙어 같은 탭을 이어서 조작하고 캡처한다(로컬 서버 전용).
// node drive.mjs '<steps JSON>'
// steps: {goto} {click} {clickText} {fill:[sel,val]} {type} {press} {wait} {waitFor} {shot,full} {text,max} {buttons} {eval} {cookie:[name,value]} {size:[w,h]}
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const base = "http://localhost:4321";
const dir = resolve(".qa-artifacts/srs-e5");
const shots = resolve(dir, "shots");
mkdirSync(shots, { recursive: true });
const steps = JSON.parse(process.argv[2] ?? "[]");

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.PORT ?? 9333}`);
const context = browser.contexts()[0];
const page = context.pages().find((p) => p.url().startsWith(base)) ?? context.pages()[0] ?? (await context.newPage());
await page.setViewportSize({ width: Number(process.env.W ?? 1366), height: Number(process.env.H ?? 900) });
page.setDefaultTimeout(Number(process.env.T ?? 15_000));
page.setDefaultNavigationTimeout(240_000);
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`);
});
page.on("response", async (r) => {
  if (r.url().includes("/api/") && r.status() >= 400) {
    const body = await r.text().catch(() => "");
    errors.push(`api ${r.status()} ${r.request().method()} ${r.url().replace(base, "")} ${body.slice(0, 400)} req=${(r.request().postData() ?? "").slice(0, 300)}`);
  }
});
for (const step of steps) {
  try {
    if (step.goto) await page.goto(base + step.goto, { waitUntil: "networkidle" });
    else if (step.click) await page.locator(step.click).first().click();
    else if (step.clickText) await page.getByText(step.clickText, { exact: !!step.exact }).first().click();
    else if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1]);
    else if (step.type) await page.keyboard.type(step.type, { delay: 25 });
    else if (step.press) await page.keyboard.press(step.press);
    else if (step.wait) await page.waitForTimeout(step.wait);
    else if (step.waitFor) await page.locator(step.waitFor).first().waitFor();
    else if (step.cookie) await context.addCookies([{ name: step.cookie[0], value: step.cookie[1], url: base }]);
    else if (step.shot) {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.screenshot({ path: resolve(shots, `${step.shot}.png`), fullPage: !!step.full });
      console.log("shot", step.shot);
    } else if (step.text) {
      const text = await page.locator(step.text === true ? "body" : step.text).first().innerText();
      console.log("---- text\n" + text.replace(/\n{3,}/g, "\n\n").slice(0, step.max ?? 3000));
    } else if (step.buttons) {
      const names = await page
        .locator("button:visible, a:visible, input:visible, textarea:visible, [contenteditable=true]:visible")
        .evaluateAll((els) =>
          els.map(
            (e) =>
              `${e.tagName.toLowerCase()}${e.getAttribute("type") ? `[${e.getAttribute("type")}]` : ""} «${(e.innerText || e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.value || "").trim().replace(/\s+/g, " ").slice(0, 70)}»${e.disabled ? " (disabled)" : ""}`,
          ),
        );
      console.log("---- controls\n" + names.join("\n"));
    } else if (step.brief) {
      const text = await page.locator("main").first().innerText();
      console.log("brief:", text.replace(/\s+/g, " ").slice(0, step.brief));
    } else if (step.eval) console.log("eval:", JSON.stringify(await page.evaluate(step.eval)));
  } catch (e) {
    errors.push(`step ${JSON.stringify(step)} failed: ${String(e.message).split("\n")[0]}`);
    break;
  }
}
console.log("url", page.url().replace(base, ""));
if (errors.length) console.log("---- errors\n" + errors.join("\n"));
await browser.close().catch(() => {});
