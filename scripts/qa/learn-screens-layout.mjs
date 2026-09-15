/**
 * «오늘의 개념» 학생 화면 네 장 + 원장님 발급 칸 — **실물 브라우저 계측 + 캡처** (learn-screens 브리프 §3).
 *
 * jsdom 은 레이아웃이 없어 «휴대폰 폭에서 넘치는가 · 가장 긴 차시 이름 · 가장 긴 강의 제목에서 잘리는가 ·
 * 강의 많은 날 · 지난 수업 20일치가 다 서는가»를 못 잰다(LearnScreens.test.tsx 머리말). 여기서 잰다.
 * 20번 교훈 «시안은 가장 큰 실데이터로» — 차시는 시드 735 전량, `set=stress` 는 20일치 · 6편 날 · 200자 제목.
 *
 *   BASE=http://localhost:3217 node scripts/qa/learn-screens-layout.mjs
 *
 * 대상: `/dev/learn-hifi` — 제품 컴포넌트 + 픽스처(`/api/learn/**` · 발급 API 만 가로챈다). **DB 에 닿지 않는다.**
 * 결과: `scratch/learn-screens/*.png` · `layout.json`. 판정이 하나라도 빨가면 종료 코드 1.
 * 시안(`docs/design/mockups/hifi-d124-todays-concept.html` 1안)의 휴대폰 넷 · 발급 칸도 찍어 나란히 붙인다.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3217";
const OUT = path.resolve("scratch", "learn-screens");
const MOCKUP = path.resolve("docs", "design", "mockups", "hifi-d124-todays-concept.html");

/** 폭 — 작은 휴대폰(360) · 흔한 휴대폰(400) · 태블릿(768) · 흔한 노트북(1366) */
const WIDTHS = [360, 400, 768, 1366];
const HEIGHT = { 360: 780, 400: 860, 768: 1024, 1366: 768 };

const RUNS = [
  { key: "login", query: "screen=login" },
  { key: "password", query: "screen=password" },
  { key: "list", query: "screen=list", expectDays: 3, expectTodayLinks: 1 },
  { key: "list-stress", query: "screen=list&set=stress", expectDays: 21, expectTodayLinks: 6, stress: true },
  { key: "list-yesterday", query: "screen=list&today=2026-09-16", expectDays: 3, expectTodayLinks: 1, yesterday: true, widths: [400] },
  { key: "watch", query: "screen=watch&lecture=l4&at=52", watch: true },
  { key: "watch-stress", query: "screen=watch&set=stress&lecture=stress-longest", watch: true, stress: true },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const failures = [];

/** 가장 긴 강의 제목 · 차시 이름은 페이지가 스스로 찾는다(가장 긴 글자) — 손으로 적지 않는다 */
function measure(page) {
  return page.evaluate(() => {
    const rect = (el) => el.getBoundingClientRect();
    const lines = (el) => {
      const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
      return Math.round(rect(el).height / lh);
    };
    const clipped = (el) => el.scrollWidth - el.clientWidth > 1;
    const main = document.querySelector("main");
    const column = main?.parentElement ?? null;
    const days = [...document.querySelectorAll("section[aria-label]")].filter((s) =>
      /월 \d+일/.test(s.getAttribute("aria-label") ?? ""),
    );
    const titles = [...document.querySelectorAll('a[href^="/learn/watch/"] b, main h1')];
    const units = [...document.querySelectorAll("main h2")];
    const longestOf = (els) =>
      els.reduce((a, b) => ((b.textContent ?? "").length > (a?.textContent ?? "").length ? b : a), null);
    const longestTitle = longestOf(titles);
    const longestUnit = longestOf(units);
    const texts = [...document.querySelectorAll("main :is(p, h1, h2, b, span, label, a, button)")];
    const clippedTexts = texts
      .filter((el) => el.children.length === 0 && clipped(el))
      .map((el) => (el.textContent ?? "").slice(0, 40));
    const top = document.querySelector("header");
    const bar = document.querySelector('input[aria-label="재생 위치"]')?.parentElement?.parentElement ?? null;
    const frame = bar?.previousElementSibling ?? null;
    const submit = document.querySelector('main button[type="submit"]');
    return {
      pageOverflowX: Math.round(document.documentElement.scrollWidth - window.innerWidth),
      columnWidth: column ? Math.round(rect(column).width) : null,
      columnLeft: column ? Math.round(rect(column).left) : null,
      columnRight: column ? Math.round(window.innerWidth - rect(column).right) : null,
      days: days.length,
      todayLinks: days[0] ? days[0].querySelectorAll('a[href^="/learn/watch/"]').length : 0,
      todayTag: days.some((d) => /오늘$/.test(d.getAttribute("aria-label") ?? "")),
      longestTitle: longestTitle
        ? { chars: (longestTitle.textContent ?? "").length, lines: lines(longestTitle), clipped: clipped(longestTitle) }
        : null,
      longestUnit: longestUnit
        ? {
            text: longestUnit.textContent,
            chars: (longestUnit.textContent ?? "").length,
            lines: lines(longestUnit),
            clipped: clipped(longestUnit),
          }
        : null,
      clippedTexts,
      topRight: top ? Math.round(rect(top).right - window.innerWidth) : null,
      barOverflowX: bar ? Math.round(bar.scrollWidth - bar.clientWidth) : null,
      frameRatio: frame ? Math.round((rect(frame).width / rect(frame).height) * 100) / 100 : null,
      primaryHeight: submit ? Math.round(rect(submit).height) : null,
    };
  });
}

async function open(width, query) {
  const page = await browser.newPage({ viewport: { width, height: HEIGHT[width] ?? 900 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/dev/learn-hifi?${query}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector("main", { timeout: 180_000 });
  await page.waitForFunction(() => !document.body.textContent?.includes("불러오는 중…"), null, { timeout: 60_000 });
  await page.evaluate(() => document.fonts?.ready);
  return page;
}

async function stressLongestId() {
  const page = await open(400, "screen=list&set=stress");
  const id = await page.evaluate(async () => {
    const res = await fetch("/api/learn/lectures");
    const { data } = await res.json();
    return data.lectures.reduce((a, b) => (b.title.length > a.title.length ? b : a)).id;
  });
  await page.close();
  return id;
}

for (const run of RUNS) {
  for (const width of run.widths ?? WIDTHS) {
    const query = run.query.includes("lecture=stress-longest")
      ? run.query.replace("stress-longest", await stressLongestId())
      : run.query;
    const page = await open(width, query);
    if (run.watch) await page.waitForSelector('input[aria-label="재생 위치"]:not([disabled])', { timeout: 60_000 });
    const m = await measure(page);
    const name = `${run.key}-${width}`;
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
    if (run.key.startsWith("list")) await page.screenshot({ path: path.join(OUT, `${name}-full.png`), fullPage: true });

    const checks = [
      ["본문이 가로로 넘치지 않는다", m.pageOverflowX <= 1],
      ["잘린 글자가 없다", m.clippedTexts.length === 0],
      ["윗줄이 화면 안에 선다", m.topRight === null || m.topRight <= 0],
    ];
    if (width >= 768)
      checks.push([
        "넓은 화면에서는 가운데 한 줄(480px 이하 · 양옆 여백이 같다)",
        m.columnWidth !== null && m.columnWidth <= 480 && Math.abs(m.columnLeft - m.columnRight) <= 2,
      ]);
    else checks.push(["휴대폰 폭에서는 화면 전체", m.columnWidth === width]);
    if (run.expectDays !== undefined) {
      checks.push([`날짜 묶음이 ${run.expectDays}개 선다`, m.days === run.expectDays]);
      checks.push([`남색 판에 강의 ${run.expectTodayLinks}편`, m.todayLinks === run.expectTodayLinks]);
      checks.push([run.yesterday ? "어제 수업이면 «오늘» 표시가 없다" : "오늘 수업에 «오늘» 표시", m.todayTag === !run.yesterday]);
    }
    if (run.stress)
      checks.push([
        "가장 긴 강의 제목(200자)이 잘리지 않는다",
        m.longestTitle !== null && m.longestTitle.chars >= 200 && !m.longestTitle.clipped,
      ]);
    if (run.key === "list-stress")
      checks.push([
        "가장 긴 차시 이름이 잘리지 않고 3줄 안",
        m.longestUnit !== null && !m.longestUnit.clipped && m.longestUnit.lines <= 3,
      ]);
    if (run.watch) {
      checks.push(["재생 막대가 넘치지 않는다", (m.barOverflowX ?? 0) <= 1]);
      checks.push(["영상 판이 16:9", m.frameRatio !== null && Math.abs(m.frameRatio - 1.78) <= 0.03]);
    }
    for (const [label, ok] of checks) if (!ok) failures.push(`${name}: ${label}`);
    results.push({ name, ...m, checks: Object.fromEntries(checks) });
    console.log(
      `${checks.every(([, ok]) => ok) ? "✓" : "✗"} ${name.padEnd(20)} 넘침 ${m.pageOverflowX} · 줄 폭 ${m.columnWidth} · ` +
        `묶음 ${m.days} · 남색 판 ${m.todayLinks} · 긴 제목 ${m.longestTitle ? `${m.longestTitle.chars}자/${m.longestTitle.lines}줄` : "-"} · ` +
        `긴 차시 ${m.longestUnit ? `${m.longestUnit.chars}자/${m.longestUnit.lines}줄` : "-"} · 잘림 ${m.clippedTexts.length}`,
    );
    if (m.clippedTexts.length) console.log(`    잘림: ${m.clippedTexts.join(" | ")}`);
    await page.close();
  }
}

// ── 원장님 발급 칸 — 두 상태 + 끈 계정 + 퇴원 (400 · 1366) ──────────────────────
for (const width of [400, 1366]) {
  const name = (s) => `issue-${s}-${width}`;
  let page = await open(width, "screen=issue");
  await page.getByRole("button", { name: "김도윤" }).click();
  await page.getByRole("button", { name: "계정 만들기" }).waitFor();
  await page.screenshot({ path: path.join(OUT, `${name("before")}.png`), fullPage: true });
  await page.getByLabel("아이디").fill("m1a-01");
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await page.getByText("초기 비밀번호 — 지금 한 번만 보입니다").waitFor();
  const issued = await page.evaluate(() => ({
    pageOverflowX: Math.round(document.documentElement.scrollWidth - window.innerWidth),
    storage: Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    urlHasPin: location.href.includes("7392"),
  }));
  await page.screenshot({ path: path.join(OUT, `${name("issued")}.png`), fullPage: true });
  const issuedChecks = [
    ["본문이 가로로 넘치지 않는다", issued.pageOverflowX <= 1],
    ["초기 비밀번호가 저장소에 없다", issued.storage === 0],
    ["초기 비밀번호가 주소에 없다", !issued.urlHasPin],
  ];
  for (const [label, ok] of issuedChecks) if (!ok) failures.push(`${name("issued")}: ${label}`);
  results.push({ name: name("issued"), ...issued, checks: Object.fromEntries(issuedChecks) });
  console.log(`${issuedChecks.every(([, ok]) => ok) ? "✓" : "✗"} ${name("issued").padEnd(20)} 넘침 ${issued.pageOverflowX} · 저장소 ${issued.storage}`);
  await page.close();
  for (const state of ["disabled", "withdrawn"]) {
    page = await open(width, `screen=issue&state=${state}`);
    await page.getByRole("button", { name: "김도윤" }).click();
    await page.getByText(state === "disabled" ? "계정 꺼짐 — 로그인 막힘" : "퇴원 — 로그인 막힘").waitFor();
    await page.screenshot({ path: path.join(OUT, `${name(state)}.png`), fullPage: true });
    await page.close();
  }
}

// ── 시안 1안 — 휴대폰 넷 · 발급 칸 ─────────────────────────────────────────
const mock = await browser.newPage({ viewport: { width: 1600, height: 1400 }, deviceScaleFactor: 1 });
await mock.goto(pathToFileURL(MOCKUP).href, { waitUntil: "load" });
await mock.waitForTimeout(500);
const phones = { login: "#sl-1", password: "#sp-1", list: "#ls-1", watch: "#pl-1" };
for (const [key, sel] of Object.entries(phones))
  await mock.locator(sel).locator("xpath=..").screenshot({ path: path.join(OUT, `mockup-${key}.png`) });
await mock.locator("#is-1").screenshot({ path: path.join(OUT, "mockup-issue.png") });
await mock.close();

// ── 나란히 — 왼쪽 시안 휴대폰, 오른쪽 구현(360 · 400) ──────────────────────────
const img = (file) => `data:image/png;base64,${fs.readFileSync(path.join(OUT, file)).toString("base64")}`;
const pair = await browser.newPage({ viewport: { width: 1800, height: 1000 }, deviceScaleFactor: 1 });
for (const key of ["login", "password", "list", "watch"]) {
  await pair.setContent(`<!doctype html><meta charset="utf-8">
<style>body{margin:0;display:flex;gap:24px;align-items:flex-start;padding:20px;background:#e9edf3;font:14px system-ui}
figure{margin:0;display:grid;gap:8px}figcaption{font-weight:700;color:#172b4d}img{display:block;border:1px solid #c9d2df}</style>
<figure><figcaption>시안 1안 «작업실 그대로» — ${key}</figcaption><img src="${img(`mockup-${key}.png`)}"></figure>
<figure><figcaption>구현 /dev/learn-hifi · 360</figcaption><img src="${img(`${key}-360.png`)}"></figure>
<figure><figcaption>구현 · 400</figcaption><img src="${img(`${key}-400.png`)}"></figure>`);
  await pair.screenshot({ path: path.join(OUT, `side-by-side-${key}.png`), fullPage: true });
}
await pair.setContent(`<!doctype html><meta charset="utf-8">
<style>body{margin:0;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;padding:20px;background:#e9edf3;font:14px system-ui}
figure{margin:0;display:grid;gap:8px}figcaption{font-weight:700;color:#172b4d}img{display:block;border:1px solid #c9d2df;max-width:860px}</style>
<figure><figcaption>시안 1안 — 발급 전 · 만든 직후</figcaption><img src="${img("mockup-issue.png")}"></figure>
<figure><figcaption>구현 — 발급 전(400)</figcaption><img src="${img("issue-before-400.png")}"></figure>
<figure><figcaption>구현 — 만든 직후(400)</figcaption><img src="${img("issue-issued-400.png")}"></figure>`);
await pair.screenshot({ path: path.join(OUT, "side-by-side-issue.png"), fullPage: true });
await pair.close();

await browser.close();
fs.writeFileSync(path.join(OUT, "layout.json"), `${JSON.stringify({ base: BASE, results, failures }, null, 2)}\n`);
if (failures.length) {
  console.error(`\n✗ ${failures.length}건\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`\n✓ 전부 통과 — ${results.length}회 계측 · 캡처 ${OUT}`);
