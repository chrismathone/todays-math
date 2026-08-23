/**
 * HTML 한 장을 그대로 찍는다 — 시안·판정 sheet 를 눈으로 보려고.
 *
 *   node scripts/qa/shot-sian.mjs [html경로] [png경로] [폭]
 *
 * 기본은 대분수 시안. 브라우저는 제품 검사와 같은 chromium 이다.
 */
import { chromium } from "@playwright/test";
import path from "node:path";

const SEP = String.fromCharCode(92);
const abs = (p) => path.resolve(p).split(SEP).join("/");

const html = process.argv[2] ?? "docs/planning/tracks/mixed-number-sian.html";
const out = process.argv[3] ?? (process.env.TEMP ?? ".") + "/sian-mixed.png";
const width = Number(process.argv[4] ?? 1100);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1400 } });
await page.goto("file:///" + abs(html));
await page.waitForTimeout(800);
await page.locator("body").screenshot({ path: out });
await browser.close();
console.log("→ " + out);
