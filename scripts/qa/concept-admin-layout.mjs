/**
 * «오늘의 개념» 원장님 화면 — **실물 브라우저 레이아웃 계측 + 캡처** (브리프 §3 ④).
 *
 * jsdom 은 레이아웃이 없어 «가장 긴 차시 이름에서 줄이 깨지는가 · 반 여럿에서 표가 가로로
 * 넘치는가 · 판이 표를 덮는가»를 못 잰다(ConceptView.test.tsx 머리말). 여기서 잰다.
 * 20번 교훈 «시안은 가장 큰 실데이터로» — 차시는 시드 735 전량, 반은 시안의 12 와 스물다섯.
 *
 *   BASE=http://localhost:3217 node scripts/qa/concept-admin-layout.mjs
 *
 * 대상: `/dev/concept-hifi` — 실제 작업실 껍데기 + 픽스처(`/api/concept/**` 만 가로챈다).
 * **DB 에 닿지 않는다.** 결과: `scratch/concept-admin-ui/*.png` · `layout.json`. 판정이
 * 하나라도 빨가면 종료 코드 1.
 *
 * 시안(`docs/design/mockups/hifi-d124-todays-concept.html` 1안)도 같은 폭에서 찍어 나란히 붙인다.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3217";
const OUT = path.resolve("scratch", "concept-admin-ui");
const MOCKUP = path.resolve("docs", "design", "mockups", "hifi-d124-todays-concept.html");
const LONGEST = "1-1-2 받아올림이 두 번, 세 번 있는 (세 자리 수)+(세 자리 수)";

/** 폭 — 원장님 모니터(1536) · 흔한 노트북(1366·1280) · 휴대폰(400) */
const RUNS = [
  { key: "mockup12", query: "", widths: [1536, 1366, 1280, 400] },
  { key: "stress25", query: "stress=1", widths: [1536, 1280, 400] },
  { key: "viewer", query: "admin=0", widths: [1536] },
  { key: "noviews", query: "views=0", widths: [1536] },
];
const HEIGHT = { 1536: 864, 1366: 768, 1280: 800, 400: 860 };

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const failures = [];

async function open(width, query) {
  const page = await browser.newPage({
    viewport: { width, height: HEIGHT[width] ?? 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${BASE}/dev/concept-hifi${query ? `?${query}` : ""}#concept`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  // 원장님이 들어오는 길 그대로 — 옆 메뉴(«수업 · 학생 관리» 아래)의 «오늘의 개념»을 누른다.
  // 휴대폰 폭에서는 옆 메뉴가 아래 막대가 된다 — 이름은 같다.
  const menu = page
    .getByRole("navigation", { name: "작업실 메뉴" })
    .getByRole("button", { name: "오늘의 개념" });
  await menu.waitFor({ timeout: 180_000 });
  await menu.click();
  await page.getByRole("table", { name: "반별 이번 주 차시" }).waitFor({ timeout: 180_000 });
  await page.evaluate(() => document.fonts?.ready);
  return page;
}

function measure(page) {
  return page.evaluate((longestText) => {
    const rect = (el) => el.getBoundingClientRect();
    const overlap = (a, b) =>
      !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    const table = document.querySelector("table");
    const scroll = table?.parentElement ?? null;
    const aside = document.querySelector('aside[aria-label="차시 판"]');
    const longest = [...document.querySelectorAll("table td span")].filter(
      (el) => el.textContent === longestText,
    );
    const lineHeight = (el) => parseFloat(getComputedStyle(el).lineHeight) || 18;
    const classButtons = table ? [...table.querySelectorAll("tbody button[aria-pressed]")] : [];
    const widest = classButtons.reduce((m, b) => Math.max(m, rect(b).width), 0);
    // 반 이름 줄 수 — 2026-09-15 휴대폰 폭에서 «초/3/A/반» 이 한 글자씩 쪼개졌는데 이 자가
    // 차시 이름만 재고 반 이름은 안 재서 초록이었다(캡처를 눈으로 보고 찾았다).
    const classLines = classButtons.map((b) => {
      const name = b.querySelector("strong");
      return name ? Math.round(rect(name).height / lineHeight(name)) : 0;
    });
    return {
      maxClassNameLines: classLines.length ? Math.max(...classLines) : 0,
      pageOverflowX: Math.round(document.documentElement.scrollWidth - window.innerWidth),
      tableOverflowX: scroll ? Math.round(scroll.scrollWidth - scroll.clientWidth) : null,
      tableWidth: table ? Math.round(rect(table).width) : null,
      classButtons: classButtons.length,
      widestClassButton: Math.round(widest),
      longest: longest.map((el) => ({
        clippedX: Math.round(el.scrollWidth - el.clientWidth),
        lines: Math.round(rect(el).height / lineHeight(el)),
        width: Math.round(rect(el).width),
      })),
      sideBesideTable: aside && scroll ? rect(aside).left >= rect(scroll).right - 1 : null,
      sideOverlapsTable: aside && scroll ? overlap(rect(aside), rect(scroll)) : null,
    };
  }, LONGEST);
}

for (const run of RUNS) {
  for (const width of run.widths) {
    const page = await open(width, run.query);
    const m = await measure(page);
    const name = `${run.key}-${width}`;
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    if (width !== 400) await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });

    const checks = [
      ["본문이 가로로 넘치지 않는다", m.pageOverflowX <= 1],
      ["가장 긴 차시 이름이 표에 있다", m.longest.length >= 1],
      ["가장 긴 차시 이름이 잘리지 않는다", m.longest.every((l) => l.clippedX <= 1)],
      ["가장 긴 차시 이름이 3줄 안에 든다", m.longest.every((l) => l.lines <= 3)],
      ["판이 표를 덮지 않는다", m.sideOverlapsTable === false],
      ["반이 전부 표에 선다", m.classButtons === (run.key === "stress25" ? 25 : 12)],
      ["반 이름이 3줄 안에 든다(글자 단위로 쪼개지지 않는다)", m.maxClassNameLines <= 3],
    ];
    // 넓은 화면(1280 이상)에서는 표 자체도 가로 스크롤 없이 들어와야 한다.
    if (width >= 1280) checks.push(["표가 가로로 넘치지 않는다", (m.tableOverflowX ?? 0) <= 1]);
    for (const [label, ok] of checks) if (!ok) failures.push(`${name}: ${label}`);
    results.push({ name, ...m, checks: Object.fromEntries(checks) });
    console.log(
      `${checks.every(([, ok]) => ok) ? "✓" : "✗"} ${name.padEnd(16)} ` +
        `본문넘침 ${m.pageOverflowX} · 표넘침 ${m.tableOverflowX} · 표폭 ${m.tableWidth} · ` +
        `반 ${m.classButtons} · 긴이름 ${m.longest.map((l) => `${l.lines}줄/${l.width}px`).join(",")} · ` +
        `판 ${m.sideBesideTable ? "옆" : "아래"}`,
    );

    if (run.key === "mockup12" && width === 1536) {
      // 끝까지 본 학생을 펼친 모습 · 전체 차시 보기
      await page.getByRole("button", { name: /7\/12명$/ }).click();
      await page.screenshot({ path: path.join(OUT, "expanded-1536.png"), fullPage: false });
      await page.getByRole("button", { name: "전체 차시 735" }).click();
      await page.getByRole("region", { name: "전체 차시" }).waitFor();
      await page.getByRole("button", { name: LONGEST }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, "tree-1536.png"), fullPage: false });
    }
    if (run.key === "stress25" && width === 1536) {
      await page.getByRole("button", { name: /^중1 C반/ }).click();
      await page.screenshot({ path: path.join(OUT, "blocked-1536.png"), fullPage: false });
    }
    await page.close();
  }
}

// 시안 1안 — 같은 폭에서
const mock = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
await mock.goto(pathToFileURL(MOCKUP).href, { waitUntil: "load" });
await mock.waitForTimeout(500);
const app = mock.locator("#p-1 .app").first();
await app.screenshot({ path: path.join(OUT, "mockup-1.png") });
await mock.close();

// 나란히 — 왼쪽 시안, 오른쪽 구현(1536)
const pair = await browser.newPage({ viewport: { width: 3100, height: 900 }, deviceScaleFactor: 1 });
const img = (file) => `data:image/png;base64,${fs.readFileSync(path.join(OUT, file)).toString("base64")}`;
await pair.setContent(`<!doctype html><meta charset="utf-8">
<style>body{margin:0;display:flex;gap:20px;padding:20px;background:#e9edf3;font:14px system-ui}
figure{margin:0;display:grid;gap:8px}figcaption{font-weight:700;color:#172b4d}img{display:block;border:1px solid #c9d2df}</style>
<figure><figcaption>시안 1안 «작업실 그대로» (hifi-d124)</figcaption><img src="${img("mockup-1.png")}"></figure>
<figure><figcaption>구현 — /dev/concept-hifi · 1536×864 · 같은 반 12 · 강의 7편 · 차시 735</figcaption><img src="${img("mockup12-1536.png")}"></figure>`);
await pair.screenshot({ path: path.join(OUT, "side-by-side.png"), fullPage: true });
await pair.close();

await browser.close();
fs.writeFileSync(path.join(OUT, "layout.json"), `${JSON.stringify({ base: BASE, results, failures }, null, 2)}\n`);
if (failures.length) {
  console.error(`\n✗ ${failures.length}건\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`\n✓ 전부 통과 — ${results.length}회 계측 · 캡처 ${OUT}`);
