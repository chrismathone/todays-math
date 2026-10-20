// Do not run until the lead explicitly releases the heavy-work hold.
// One browser, one context at a time. Never starts Vite, Next, typecheck, or DB.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { freemem } from "node:os";

if (!process.argv.includes("--resume-after-lead-release")) {
  throw new Error("리드의 실행 재개 연락 뒤에만 --resume-after-lead-release로 실행하세요.");
}
const root = process.cwd();
const output = resolve(root, "docs/design/mockups/answer-quick-key-hifi-20261020");
await mkdir(output, { recursive: true });
if (freemem() < 3 * 1024 ** 3) throw new Error("Not enough free memory to launch the browser.");
const browser = await chromium.launch();
const cases = [];
try {
  for (const variant of ["h1", "h2", "h3", "h4", "h5"]) {
    for (const count of [25, 50, 100]) {
      // Additional protection; this is not a substitute for the lead's release.
      if (freemem() < 3 * 1024 ** 3) {
        throw new Error("사용 가능 메모리가 3GiB 미만입니다. 다음 캡처를 시작하지 않습니다.");
      }
      const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
      try {
        const page = await context.newPage();
        const errors = [];
        const remote = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("request", request => {
          if (/^https?:/.test(request.url())) remote.push(request.url());
        });
        const url = pathToFileURL(resolve(root, "docs/design/mockups/answer-quick-key-hifi-20261020.html"));
        url.searchParams.set("variant", variant);
        url.searchParams.set("count", String(count));
        await page.goto(url.href);
        await page.waitForFunction(() => window.quickKeyHifiReady || window.quickKeyHifiError, null, { timeout: 30000 });
        const result = await page.evaluate(() => {
          if (window.quickKeyHifiError) throw new Error(window.quickKeyHifiError);
          document.body.classList.add("full");
          document.querySelectorAll(".sheet").forEach(sheet => { sheet.hidden = false; });
          const editions = [...document.querySelectorAll(".edition")].map(edition => {
            const sheets = [...edition.querySelectorAll(".sheet")];
            const overflow = sheets.flatMap((sheet, index) => {
              const content = sheet.querySelector(".content").getBoundingClientRect();
              return [...sheet.querySelector(".content").children]
                .filter(child => child.getBoundingClientRect().bottom > content.bottom + 1)
                .map(() => index + 1);
            });
            const cellOverflow = [...edition.querySelectorAll(".key-cell .answer")].filter(answer => {
              const rect = answer.getBoundingClientRect();
              return answer.scrollWidth > answer.clientWidth + 1 || [...answer.querySelectorAll(".katex-html")].some(ink => {
                const bounds = ink.getBoundingClientRect();
                return bounds.left < rect.left - 1 || bounds.right > rect.right + 1;
              });
            }).length;
            const numbers = [...edition.querySelectorAll(".key-cell")].map(cell => Number(cell.dataset.number));
            const solutions = edition.querySelectorAll(".solution").length;
            return { mode: edition.dataset.mode, pages: sheets.length, numbers, solutions, overflow, cellOverflow };
          });
          return { evidence: window.quickKeyHifiEvidence, editions };
        });
        if (errors.length || remote.length || result.editions.length !== 2 || result.editions.some(edition =>
          edition.numbers.length !== count || edition.numbers.some((number, index) => number !== index + 1) ||
          edition.overflow.length || edition.cellOverflow || edition.solutions !== (edition.mode === "key" ? 0 : count)
        )) throw new Error(JSON.stringify({ variant, count, result, errors, remote }));
        cases.push({ variant, count, ...result, errors, remote });
        if (count === 25 || count === 100) {
          await page.setViewportSize({ width: 1800, height: 1400 });
          await page.addStyleTag({ content: ".paper-window,.pair{overflow:visible!important}" });
          for (const mode of ["solutions", "key"]) {
            const sheets = page.locator(`.edition[data-mode="${mode}"] .sheet`);
            await sheets.evaluateAll(nodes => nodes.forEach((node, index) => { node.hidden = index !== 0; }));
            await sheets.first().screenshot({ path: resolve(output, `${variant}-${count}-${mode}-first.png`) });
            if (count === 100) {
              await sheets.evaluateAll(nodes => nodes.forEach((node, index) => { node.hidden = index !== nodes.length - 1; }));
              await sheets.last().screenshot({ path: resolve(output, `${variant}-${count}-${mode}-last.png`) });
            }
          }
        }
      } finally {
        await context.close();
      }
    }
  }
  await writeFile(resolve(root, "docs/planning/tracks/reports/answer-quick-key-hifi-measure-20261020.json"), JSON.stringify(cases, null, 2));
  console.log(`Verified ${cases.length * 2} editions sequentially. Review the screenshots before reporting visual completion.`);
} finally {
  await browser.close();
}
