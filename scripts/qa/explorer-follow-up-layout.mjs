// Run against .qa-artifacts/srs-e5-cards/fixture.tsx via its Vite config.
// Uses the real browser layout; jsdom does not compute grid geometry.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.EXPLORER_QA_URL ?? "http://127.0.0.1:3228/";
const output = ".qa-artifacts/srs-e5-cards/review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1, `${label}: ${a} vs ${b}`);
try {
  for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 390, height: 600 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    async function open(kind, stage) {
      await page.goto(`${base}?kind=${kind}&stage=${stage}`);
      await page.getByRole("group", { name: "답 고르기" }).waitFor();
      await page.waitForFunction(() => !document.body.textContent.includes("준비 중"));
      await page.evaluate(() => document.fonts.ready);
    }
    for (const kind of ["examples", "assemble", "truth"]) {
      await open(kind, "again");
      const choices = await page.getByRole("group", { name: "답 고르기" }).getByRole("button").evaluateAll(buttons => buttons.map(button => {
        const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
        const text = button.querySelector("[data-choice-text]");
        const marker = button.querySelector("[class*=previous]");
        return { button:rect(button), text:rect(text.querySelector(".katex-html") ?? text), marker:marker ? rect(marker):null, number:rect(button.querySelector("[data-answer-key]")) };
      }));
      for (const choice of choices.filter(choice => choice.marker)) {
        if (kind === "examples") {
          const plain = choices.find(choice => !choice.marker);
          close(choice.text.x - choice.button.x, plain.text.x - plain.button.x, "example label inset");
          close(choice.marker.x, choice.text.x, "previous label aligned below answer text");
        } else {
          close((choice.number.x + choice.text.x + choice.text.width) / 2, choice.button.x + choice.button.width / 2, `${kind} remains centered`);
        }
        assert.ok(choice.marker.y >= choice.text.y + choice.text.height, "marker below label");
      }
      await page.screenshot({ path:`${output}/${kind}-again-${viewport.width}x${viewport.height}.png`, fullPage:true });
    }
    async function truthGeometry(stage) {
      await open("truth", stage);
      const geometry = await page.evaluate(() => {
        const dock = document.querySelector("[data-explorer-dock]");
        const instruction = dock.firstElementChild.getBoundingClientRect();
        const button = dock.querySelector("[role=group] button").getBoundingClientRect();
        const bounds = dock.getBoundingClientRect();
        return { height:bounds.height, top:instruction.top - bounds.top, above:button.top - instruction.bottom, below:bounds.bottom - button.bottom, buttonHeight:button.height };
      });
      await page.screenshot({ path:`${output}/truth-${stage}-${viewport.width}x${viewport.height}.png`, fullPage:true });
      return geometry;
    }
    const initial = await truthGeometry("initial"), again = await truthGeometry("again");
    if (!process.argv.includes("--alignment-only"))
      for (const key of Object.keys(initial)) close(initial[key], again[key], `truth ${key}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    report.push({viewport,initial,again,errors});
    await page.close();
  }
  await writeFile(`${output}/layout.json`, JSON.stringify(report,null,2));
  console.log(process.argv.includes("--alignment-only") ? "PASS: previous-answer alignment for all three kinds at all three sizes." : "PASS: previous-answer alignment for all three kinds; truth spacing matches initial at all three sizes.");
} finally {
  await browser.close();
}
