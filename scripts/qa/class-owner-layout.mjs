/**
 * 관리자 화면의 «누구의 반» 담당 딱지 — **실물 브라우저 계측 + 캡처** (브리프 class-owner-tag §3).
 *
 * jsdom 은 계산된 스타일·레이아웃이 없어 «딱지가 05 §8.11 표의 색·크기로 그려지나 · 휴대폰 폭에서
 * 페이지가 가로로 넘치나 · 손가락 커서가 딱지에 붙나»를 못 잰다. 여기서 잰다.
 *
 *   BASE=http://localhost:3241 node scripts/qa/class-owner-layout.mjs
 *
 * 대상: `/dev/class-owner-hifi`(관리자) · `?admin=0`(관리자 아님) — 실제 컴포넌트 + 픽스처, **DB 에 닿지 않는다.**
 * 시안: `docs/design/mockups/hifi-d132-class-owner.html` 3 탭을 같은 폭에서 찍어 나란히 붙인다.
 * 결과: `scratch/class-owner-tag/*.png` · `layout.json`. 판정이 하나라도 빨가면 종료 코드 1.
 *
 * ⚠️ 펼친 `<select>` 목록과 `title` 말풍선은 **운영체제가 그린다** — 캡처에 안 찍힌다. 여기서는 속성 값만 잰다.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3241";
const OUT = path.resolve("scratch", "class-owner-tag");
const MOCKUP = path.resolve("docs", "design", "mockups", "hifi-d132-class-owner.html");
const HEIGHT = { 1536: 864, 400: 860 };

/** 05 §8.11 표 — 계산된 스타일로 옮긴 값 */
const SPEC = {
  common: { fontSize: "11.5px", lineHeight: "18px", paddingTop: "1px", paddingLeft: "7px", borderRadius: "3px" },
  "ledger:other": { backgroundColor: "rgb(233, 233, 230)", color: "rgb(22, 22, 22)", fontWeight: "500" },
  "ledger:mine": { backgroundColor: "rgb(22, 22, 22)", color: "rgb(255, 255, 255)", fontWeight: "700" },
  "workroom:other": { backgroundColor: "rgb(238, 241, 245)", color: "rgb(23, 43, 77)", fontWeight: "500" },
  "workroom:mine": { backgroundColor: "rgb(23, 43, 77)", color: "rgb(255, 255, 255)", fontWeight: "700" },
};

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const failures = [];
const fail = (msg) => failures.push(msg);

async function open(width, query) {
  const page = await browser.newPage({ viewport: { width, height: HEIGHT[width] ?? 900 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/dev/class-owner-hifi${query ? `?${query}` : ""}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.getByRole("heading", { level: 1, name: /누구의 반/ }).waitFor({ timeout: 240_000 });
  await page.getByRole("table", { name: "반별 이번 주 차시" }).waitFor({ timeout: 120_000 });
  await page.getByText("최근 등록한 반", { exact: true }).waitFor({ timeout: 120_000 });
  await page.getByRole("heading", { level: 1, name: /걷기반 · 걷기학생/ }).waitFor({ timeout: 120_000 });
  await page.getByRole("button", { name: "출제" }).waitFor({ timeout: 120_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(300);
  return page;
}

function measure(page) {
  return page.evaluate(() => {
    const tags = [...document.querySelectorAll("[data-owner-tag]")].map((el) => {
      const cs = getComputedStyle(el);
      const frame = el.closest("section[aria-label]")?.getAttribute("aria-label") ?? "";
      const workroom = /개념 판|작업실 개요/.test(frame);
      return {
        frame,
        text: el.textContent,
        kind: `${workroom ? "workroom" : "ledger"}:${el.getAttribute("data-owner-tag")}`,
        inButton: el.closest("button") !== null,
        style: {
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          fontWeight: cs.fontWeight,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          paddingTop: cs.paddingTop,
          paddingLeft: cs.paddingLeft,
          borderRadius: cs.borderTopLeftRadius,
          letterSpacing: cs.letterSpacing,
          cursor: cs.cursor,
          whiteSpace: cs.whiteSpace,
        },
        rect: (() => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        })(),
      };
    });
    const heads = [...document.querySelectorAll("th")].map((th) => th.textContent?.trim());
    const selects = [...document.querySelectorAll("select")]
      .filter((s) => /반/.test(s.closest("label")?.textContent ?? ""))
      .map((s) => ({
        title: s.getAttribute("title"),
        options: [...s.options].map((o) => ({ text: o.text, title: o.getAttribute("title") })),
      }));
    return {
      tags,
      ownerHeads: heads.filter((h) => h === "담당").length,
      selects,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
}

function check(label, m, admin) {
  if (!admin) {
    if (m.tags.length !== 0) fail(`${label}: 관리자 아님인데 딱지 ${m.tags.length}개`);
    if (m.ownerHeads !== 0) fail(`${label}: 관리자 아님인데 «담당» 머리 ${m.ownerHeads}개`);
    for (const s of m.selects) {
      if (s.title !== null) fail(`${label}: 관리자 아님인데 상자 title «${s.title}»`);
      if (s.options.some((o) => o.title !== null || o.text.includes(" · "))) fail(`${label}: 관리자 아님인데 option 에 담당`);
    }
    return;
  }
  if (m.tags.length === 0) fail(`${label}: 딱지가 하나도 없다`);
  if (m.ownerHeads !== 3) fail(`${label}: «담당» 머리 ${m.ownerHeads}개(반 표 · 반별 표 · 개념 판 = 3)`);
  for (const t of m.tags) {
    const want = { ...SPEC.common, ...SPEC[t.kind] };
    for (const [k, v] of Object.entries(want))
      if (t.style[k] !== v) fail(`${label}: ${t.frame} «${t.text}» ${k} ${t.style[k]} ≠ ${v}`);
    if (!t.inButton && t.style.cursor === "pointer") fail(`${label}: ${t.frame} «${t.text}» 손가락 커서(D-30)`);
    if (t.style.whiteSpace !== "nowrap") fail(`${label}: ${t.frame} «${t.text}» 줄바꿈 허용`);
    if (!["0px", "normal"].includes(t.style.letterSpacing)) fail(`${label}: ${t.frame} «${t.text}» 자간 ${t.style.letterSpacing}`);
  }
  for (const s of m.selects.filter((x) => x.options.length > 2)) {
    const last = s.options.find((o) => o.text.startsWith("이어반"));
    if (!last || last.text !== "이어반 · 이어하기선생") fail(`${label}: 상자 글자 «${last?.text}»`);
    if (!last || last.title !== "이어반 · 이어하기선생님") fail(`${label}: option title «${last?.title}»`);
  }
}

const RUNS = [
  { key: "admin", query: "", admin: true, widths: [1536, 400] },
  { key: "plain", query: "admin=0", admin: false, widths: [1536] },
];

for (const run of RUNS) {
  for (const width of run.widths) {
    const label = `${run.key}-${width}`;
    const page = await open(width, run.query);
    // 장바구니 상자에서 가장 긴 담당의 반을 고른다 — 닫힌 상자 title 이 그 반 전체로 바뀌는지
    const basket = page.getByRole("region", { name: "출제 · 장바구니 › 반 고르기" }).getByLabel("반");
    const lastValue = await basket.evaluate((s) => [...s.options].find((o) => o.text.startsWith("이어반"))?.value ?? "");
    await basket.selectOption(lastValue);
    const m = await measure(page);
    m.basketTitleAfterPick = await basket.getAttribute("title");
    if (run.admin && m.basketTitleAfterPick !== "이어반 · 이어하기선생님") fail(`${label}: 고른 뒤 닫힌 상자 title «${m.basketTitleAfterPick}»`);
    if (!run.admin && m.basketTitleAfterPick !== null) fail(`${label}: 관리자 아님 닫힌 상자 title «${m.basketTitleAfterPick}»`);
    if (m.scrollWidth > m.innerWidth) fail(`${label}: 페이지 가로 넘침 ${m.scrollWidth} > ${m.innerWidth}`);
    check(label, m, run.admin);
    results.push({ label, ...m });
    await page.screenshot({ path: path.join(OUT, `impl-${label}.png`), fullPage: true });
    if (run.admin && width === 1536) {
      // 딱지 가까이 — 반 표 · 반별 표 · 개념 판 첫 줄
      for (const [name, file] of [
        ["수업 · 학생 관리 › 반 · 학생 관리", "zoom-class-table"],
        ["오늘의 작업 › 반별 표 (앞 다섯 줄)", "zoom-ledger"],
        ["오늘의 작업 › 카드 · 끝난 반 한 줄 · 진도 입력 ★", "zoom-cards"],
        ["작업실 개요 › 최근 등록한 반", "zoom-overview"],
        ["시험지 검토 머리", "zoom-review"],
      ])
        await page.getByRole("region", { name }).screenshot({ path: path.join(OUT, `${file}.png`) });
    }
    await page.close();
  }
}

// 시안 3 탭 — 같은 폭에서
for (const width of [1536, 400]) {
  const mock = await browser.newPage({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1 });
  await mock.goto(pathToFileURL(MOCKUP).href, { waitUntil: "load", timeout: 30_000 }).catch(() => {});
  await mock.getByRole("tab", { name: /꼬리표/ }).click();
  await mock.waitForTimeout(800);
  await mock.locator('[data-panel="3"]').screenshot({ path: path.join(OUT, `mockup3-${width}.png`) });
  await mock.close();
}

// 나란히 — 왼쪽 시안 3 탭, 오른쪽 구현
const img = (file) => `data:image/png;base64,${fs.readFileSync(path.join(OUT, file)).toString("base64")}`;
for (const [width, pairWidth] of [[1536, 3160], [400, 900]]) {
  const pair = await browser.newPage({ viewport: { width: pairWidth, height: 900 }, deviceScaleFactor: 1 });
  await pair.setContent(`<!doctype html><meta charset="utf-8">
<style>body{margin:0;display:flex;align-items:flex-start;gap:20px;padding:20px;background:#e9edf3;font:14px system-ui}
figure{margin:0;display:grid;gap:8px}figcaption{font-weight:700;color:#161616}img{display:block;border:1px solid #b9b9b6;background:#fff}</style>
<figure><figcaption>시안 Hi-fi 3 «꼬리표» (hifi-d132) · ${width}</figcaption><img src="${img(`mockup3-${width}.png`)}"></figure>
<figure><figcaption>구현 — /dev/class-owner-hifi (관리자) · ${width}</figcaption><img src="${img(`impl-admin-${width}.png`)}"></figure>`);
  await pair.screenshot({ path: path.join(OUT, `side-by-side-${width}.png`), fullPage: true });
  await pair.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "layout.json"), `${JSON.stringify({ base: BASE, results, failures }, null, 2)}\n`);
if (failures.length) {
  console.error(`\n✗ ${failures.length}건\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`\n✓ 전부 통과 — ${results.length}회 계측 · 캡처 ${OUT}`);
