import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
const root = process.cwd(),
  dir = resolve(root, "scripts/qa/print-templates");
const out = resolve(
  root,
  "docs/design/mockups/answer-quick-key-wire-20261020.html",
);
const server = await createServer({
  configFile: false,
  root: dir,
  cacheDir: resolve(root, ".qa-artifacts/quick-key-cache-v2"),
  resolve: { alias: { "@": resolve(root, "src") } },
  server: {
    host: "127.0.0.1",
    port: 0,
    fs: { allow: [root, await realpath(resolve(root, "node_modules"))] },
  },
  plugins: [
    react({ exclude: /node_modules|quick-key-cache/ }),
    {
      name: "entry",
      configureServer(s) {
        s.middlewares.use(async (req, res, next) => {
          if (req.url === "/") {
            res.setHeader("Content-Type", "text/html");
            res.end(
              await s.transformIndexHtml(
                "/",
                '<!doctype html><html lang="ko"><meta charset="utf-8"><title>빠른 채점표 Wire</title><div id="root"></div><script type="module" src="/quick-key.tsx"></script></html>',
              ),
            );
          } else next();
        });
      },
    },
  ],
});
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1700, height: 1300 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
  await page.waitForSelector(".v3 .sample");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    for (const sample of document.querySelectorAll(".sample")) {
      const pages = sample.querySelector(".pages"),
        first = pages.querySelector(".sheet");
      const units = [...first.querySelector(".flow").children];
      let sheet = first,
        flow = sheet.querySelector(".flow");
      let count = 1;
      flow.replaceChildren();
      for (const unit of units) {
        flow.append(unit);
        if (
          flow.getBoundingClientRect().bottom >
          sheet.getBoundingClientRect().top + 1005
        ) {
          if (flow.children.length === 1)
            throw Error("Single row exceeds page");
          sheet = first.cloneNode(true);
          sheet.querySelector(".flow").replaceChildren();
          sheet.querySelector("header p").innerHTML =
            "빠른 채점표 <span>계속</span>";
          pages.append(sheet);
          flow = sheet.querySelector(".flow");
          flow.append(unit);
          count++;
        }
      }
      [...pages.children].forEach(
        (s, i) =>
          (s.querySelector("footer").textContent = `${i + 1} / ${count}`),
      );
    }
  });
  const measurements = await page.evaluate(() =>
    [...document.querySelectorAll(".sample")].map((s) => ({
      variant: s.dataset.v,
      count: Number(s.dataset.n),
      pages: s.querySelectorAll(".sheet").length,
      answers: s.querySelectorAll(".cell,.stripe").length,
      overflow: [...s.querySelectorAll(".sheet")].some(
        (p) => p.scrollHeight > p.clientHeight + 1,
      ),
    })),
  );
  if (errors.length || measurements.some((m) => m.overflow))
    throw Error(JSON.stringify({ errors, measurements }));
  // Freeze product-rendered DOM; inline KaTeX fonts so the review HTML works offline.
  await page.evaluate(async () => {
    for (const style of document.querySelectorAll("style")) {
      const urls = [
        ...style.textContent.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g),
      ].map((m) => m[1]);
      for (const url of new Set(urls)) {
        if (url.startsWith("data:")) continue;
        const r = await fetch(url);
        if (!r.ok) throw Error(`font ${url}: ${r.status}`);
        const b = await r.blob();
        const data = await new Promise((done) => {
          const fr = new FileReader();
          fr.onload = () => done(fr.result);
          fr.readAsDataURL(b);
        });
        style.textContent = style.textContent.split(url).join(data);
      }
    }
    document.querySelectorAll("script").forEach((s) => s.remove());
  });
  await writeFile(out, "<!doctype html>\n" + (await page.content()));
  await mkdir(resolve(root, ".qa-artifacts/quick-key"), { recursive: true });
  await writeFile(
    resolve(
      root,
      "docs/planning/tracks/reports/answer-quick-key-measure-20261020.json",
    ),
    JSON.stringify(measurements, null, 2),
  );
  await page
    .locator(".v1 .sheet")
    .first()
    .screenshot({
      path: resolve(root, ".qa-artifacts/quick-key/recommended.png"),
    });
  console.log(JSON.stringify({ out, measurements }));
} finally {
  await browser.close();
  await server.close();
}
