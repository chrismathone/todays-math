import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { freemem } from "node:os";

async function memoryGate(stage) {
  while (freemem() < 3 * 2 ** 30) {
    console.log(`Waiting for 3GiB before ${stage}; ${(freemem()/2**30).toFixed(2)}GiB free`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  console.log(`Memory gate ${stage}: ${(freemem()/2**30).toFixed(2)}GiB free`);
}
async function bounded(promise, stage, ms = 60000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${stage} exceeded ${ms}ms`)), ms); })]); }
  finally { clearTimeout(timer); }
}

const root = process.cwd();
const out = path.join(root, "scripts/qa/print-templates/evidence");
await mkdir(out, { recursive: true });
await memoryGate("Vite");
const server = await createServer({
  configFile: false, root: path.join(root,"scripts/qa/print-templates"), publicDir: path.join(root, "public"),
  cacheDir: path.join(root, ".qa-artifacts/print-templates-cache"),
  plugins: [{
    name: "limit-tailwind-scan-to-production-renderers", enforce: "pre",
    async load(id) {
      if(id.replaceAll("\\", "/").endsWith("/src/app/globals.css")) {
        return (await readFile(id,"utf8")).replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "../components/math";\n@source "../components/unified/UnifiedProblem.tsx";\n@source "../components/unified/NativeProblem.tsx";\n@source "../lib/math/choiceLayout.ts";\n@source "../lib/figure/figureSvgFrame.ts";');
      }
    },
  }, react({ exclude: /node_modules|cache|\.qa-artifacts/ })], resolve: { alias: { "@": path.join(root, "src") } },
  optimizeDeps: { entries: ["index.html"] },
  server: { host: "127.0.0.1", port: 0, fs: {allow:[root,await realpath(path.join(root,"node_modules"))]} },
});
let browser;
try {
  await bounded(server.listen(), "Vite listen");
  const url = server.resolvedUrls.local[0];
  console.log("Harness:", url);
  await memoryGate("Chromium");
  browser = await chromium.launch({ timeout: 60000 });
  console.log("Browser launched");
  const page = await browser.newPage({ viewport: { width: 1100, height: 1300 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(30000);
  const errors = [];
  await page.route("**/api/**", route => { errors.push(`Unexpected API request: ${route.request().url()}`); return route.abort(); });
  page.on("pageerror", error => { errors.push(String(error)); console.error("Page error:",String(error)); });
  page.on("console", message => { if(message.type() === "error") console.error(message.text()); });
  const results = {};
  const snapshots = { styles:"", templates:{} };
  for (const template of ["pyeongga", "jeongtong", "modern", "workbook", "jaseup", "yuhyung"]) {
    await page.emulateMedia({ media: "screen" });
    await page.goto(`${url}?template=${template}`, {timeout:60000});
    console.log("Loaded",template);
    await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    // Preserve measured production pagination; print media hides measurement hosts.
    await page.emulateMedia({ media: "print" });
    const captureStyle = await page.addStyleTag({ content: `body{margin:0!important;padding:0!important} body *{visibility:hidden} [data-mathgen-document],[data-mathgen-document] *{visibility:visible} [data-mathgen-document]{position:absolute!important;left:0!important;top:0!important} [data-unified-paper]{box-shadow:none!important}` });
    await captureStyle.evaluate(style => { style.dataset.qaCaptureOnly = "true"; });
    const sheets = page.locator("[data-mathgen-document] [data-unified-paper]");
    const count = await sheets.count();
    const snapshot = await page.evaluate(async () => {
      const sheets = [...document.querySelectorAll("[data-mathgen-document] [data-unified-paper]")];
      const doc = document.querySelector("[data-mathgen-document]");
      let styles = [...document.querySelectorAll("style:not([data-qa-capture-only])")].map(s=>s.textContent).join("\n");
      // Standalone question snippets also need the inherited export-document font tokens.
      styles += `\n:root{${doc.getAttribute("style")};--paper-font-mono:monospace}`;
      const urls = [...new Set([...styles.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(m=>m[1]))];
      for(const url of urls) {
        if(url.startsWith("data:")) continue;
        const response = await fetch(url); if(!response.ok) throw new Error(`CSS asset ${url}: ${response.status}`);
        const blob = await response.blob();
        const data = await new Promise(resolve=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob); });
        styles = styles.split(url).join(data);
      }
      const withDocument = sheet => { const wrapper = doc.cloneNode(false); wrapper.append(sheet.cloneNode(true)); return wrapper.outerHTML; };
      return { styles,
        documentStyle:doc.getAttribute("style"), documentClass:doc.className,
        first:withDocument(sheets[0]),last:withDocument(sheets.at(-1)),
        firstSheet:sheets[0].outerHTML,lastSheet:sheets.at(-1).outerHTML,
        items:sheets.flatMap(s=>[...s.querySelectorAll("[data-measure-idx]")].map(i=>i.outerHTML)) };
    });
    snapshots.styles = snapshot.styles;
    snapshots.templates[template] = snapshot;
    const fixture = await page.evaluate(() => window.measurementFixture);
    if(fixture.fixture.length !== 25) throw new Error("Expected exactly 25 fixture problems");
    const metrics = await sheets.evaluateAll(sheets => sheets.map(sheet => {
      const box = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
      const items = [...sheet.querySelectorAll("[data-measure-idx]")];
      const lineCount = el => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const lines = new Set();
        while(walker.nextNode()) { const n = walker.currentNode; if(!n.textContent.trim() || n.parentElement.closest(".katex-mathml")) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          for(const r of range.getClientRects()) if(r.width && r.height) lines.add(Math.round(r.top * 2) / 2);
        } return lines.size;
      };
      return { box:box(sheet), header:sheet.querySelector("[data-print-header]")?.textContent || null,
        headerBox:sheet.querySelector("[data-print-header]") ? box(sheet.querySelector("[data-print-header]")) : null,
        items:items.map(item => ({ number:item.querySelector("[data-question-number]")?.textContent,
          box:box(item), bodyBox:box(item.querySelector("[data-problem-body]")),
          font:getComputedStyle(item.querySelector("[data-problem-body]" )).font,
          lines:lineCount(item.querySelector("[data-problem-body]")), zoom:getComputedStyle(item).zoom })),
        footer:sheet.firstElementChild.lastElementChild.textContent,
        images:[...sheet.querySelectorAll("img")].map(img => ({complete:img.complete,width:img.naturalWidth})),
      };
    }));
    const fonts = await page.context().newCDPSession(page);
    const fontProbe = await page.evaluate(() => {
      const body = document.querySelector("[data-mathgen-document] [data-problem-body]");
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      while(walker.nextNode()) {
        const node = walker.currentNode;
        if(/[가-힣]/.test(node.textContent) && !node.parentElement.closest(".katex-mathml")) {
          node.parentElement.setAttribute("data-qa-font-probe","");
          return {text:node.textContent,font:getComputedStyle(node.parentElement).font};
        }
      }
      throw new Error("No Korean font leaf");
    });
    await fonts.send("DOM.enable"); await fonts.send("CSS.enable");
    const { root: dom } = await fonts.send("DOM.getDocument");
    const { nodeId } = await fonts.send("DOM.querySelector", { nodeId: dom.nodeId, selector: "[data-qa-font-probe]" });
    const actualFonts = await fonts.send("CSS.getPlatformFontsForNode", { nodeId });
    await fonts.detach();
    // Match export clients: isolate the real unscaled export DOM, retaining head CSS.
    // Nested app stacking/paint contexts otherwise obscure an element screenshot.
    await page.evaluate(() => {
      const doc = document.querySelector("[data-mathgen-document]").cloneNode(true);
      document.body.replaceChildren(doc);
    });
    for(const [label,index] of [["first",0],["last",count-1]]) {
      await sheets.nth(index).scrollIntoViewIfNeeded();
      const bounds = await sheets.nth(index).boundingBox();
      await page.screenshot({ path:path.join(out,`${template}-${label}.png`), animations:"disabled", clip:{x:bounds.x,y:bounds.y,width:794,height:1123}, captureBeyondViewport:true });
    }
    results[template] = { pageCount:count, options:fixture.options, actualFonts, fontProbe, pages:metrics };
    const numbers = metrics.flatMap(p=>p.items.map(item=>Number(item.number)));
    if(numbers.join(",") !== Array.from({length:25},(_,i)=>i+1).join(",")) throw new Error(`Lost or repeated problem: ${template}`);
    if(metrics.some(p=>p.images.some(img=>!img.complete || !img.width))) throw new Error(`Broken image: ${template}`);
    await writeFile(path.join(out,"rendered-pages.json"),JSON.stringify(snapshots,null,2));
    await writeFile(path.join(out,"partial-metrics.json"),JSON.stringify(results,null,2));
    await writeFile(path.join(out,"fixture.json"), JSON.stringify(fixture,null,2));
    console.log(template, count, "pages", metrics.map(p=>p.items.map(i=>i.number).join(",")).join(" | "));
  }
  if(errors.length) throw new Error(errors.join("\n"));
  const manifest = { baseCommit:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(), browser:browser.version(), platform:process.platform, capturedAt:new Date().toISOString(), results };
  const files = execFileSync("git",["ls-files","src/components/unified/print","src/components/unified/UnifiedProblem.tsx","src/components/math","src/app/globals.css"],{encoding:"utf8"}).trim().split(/\r?\n/);
  manifest.sourceSha256 = Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash("sha256").update(await readFile(file)).digest("hex")])));
  await writeFile(path.join(out,"metrics.json"),JSON.stringify(manifest,null,2));
  await writeFile(path.join(out,"rendered-pages.json"),JSON.stringify(snapshots,null,2));
} finally { try { await browser?.close(); } finally { await server.close(); console.log("Chromium and Vite closed"); } }
