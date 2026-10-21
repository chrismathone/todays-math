import { chromium } from "@playwright/test";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const all = await browser.contexts()[0].cookies();
for (const c of all.filter((c) => /clock|test/i.test(c.name))) console.log(JSON.stringify({ name: c.name, value: c.value, domain: c.domain, path: c.path, expires: c.expires }));
await browser.close().catch(() => {});
