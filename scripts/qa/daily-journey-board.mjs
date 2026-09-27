// 진도판 검수 — dev 서버(`/dev/daily-journey-qa`)에 붙어 돈다. DB 를 쓰지 않는다.
//   node scripts/qa/daily-journey-board.mjs            (BASE 기본 http://localhost:3000)
//   QA_OUTPUT=…  QA_SIZES=320,390,800,1280  QA_ENGINES=chromium,webkit
// ⑴ 판에 나올 수 있는 이름 전부(단원 · 소단원 · 대단원 · 기억 복습)를 예정 · 완료 · 오늘 칸에 올려 폭마다
//    잘림(세 줄 넘침) · 낱말 쪼개짐(낱말 하나가 두 줄에 걸침) · 칸 넘침 · 가로 스크롤이 0 인지 (D-142).
// ⑵ 실제 중2 · 초4 목록 판(map · full)을 찍고, full 판의 되풀기 · 말 이동 흐름을 지금처럼 확인.
import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.BASE ?? "http://localhost:3000";
const out = process.env.QA_OUTPUT ?? ".qa-artifacts/daily-journey-board";
const sizes = (process.env.QA_SIZES ?? "320,390,800,1280").split(",").map(Number);
const engines = { chromium, webkit };
await mkdir(out, { recursive: true });

// 눈에 보이는 결함만 — 칸 글이 세 줄 밖으로 가려졌나, 낱말 하나가 두 줄에 걸쳤나, 칸 밖으로 넘쳤나.
function inspect() {
  const bad = { clipped: [], split: [], overflow: [], names: 0 };
  for (const el of document.querySelectorAll("[data-tile-title], [data-journey-progress] p")) {
    bad.names++;
    if (getComputedStyle(el).overflow !== "visible" && el.scrollHeight > el.clientHeight + 1) bad.clipped.push(el.textContent);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      let at = 0;
      for (const word of node.textContent.split(" ")) {
        if (word.length > 1) {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + word.length);
          const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0.5).map((r) => Math.round(r.top)));
          if (lines.size > 1) bad.split.push(`${el.textContent} → ${word}`);
        }
        at += word.length + 1;
      }
    }
  }
  for (const centre of document.querySelectorAll("[data-journey-progress]"))
    if (centre.scrollHeight > centre.clientHeight + 1 || centre.scrollWidth > centre.clientWidth + 1)
      bad.overflow.push("가운데: " + centre.innerText.replace(/\s+/g, " "));
  for (const tile of document.querySelectorAll("[data-day-step] > *"))
    if (tile.scrollWidth > tile.clientWidth + 1 || tile.scrollHeight > tile.clientHeight + 1)
      bad.overflow.push(tile.getAttribute("aria-label"));
  bad.pageOverflow = document.documentElement.scrollWidth > innerWidth + 1;
  bad.boardWidth = Math.round(document.querySelector("[data-journey-page]").getBoundingClientRect().width);
  return bad;
}

const report = [];
for (const name of (process.env.QA_ENGINES ?? "chromium,webkit").split(",")) {
  const browser = await engines[name].launch({ headless: true });
  for (const width of sizes) {
    const mobile = width < 600;
    const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile });
    // ⑴ 이름 전부
    await page.goto(`${base}/dev/daily-journey-qa?set=all&variant=map`);
    await page.waitForSelector("[data-qa-ready=true]");
    await page.evaluate(() => document.fonts.ready);
    const all = await page.evaluate(inspect);
    report.push({ engine: name, width, ...all });
    console.log(name, width, "판", all.boardWidth, "이름", all.names, "잘림", all.clipped.length, "쪼개짐", all.split.length, "칸 넘침", all.overflow.length, "가로 스크롤", all.pageOverflow);
    if (!process.env.QA_SOFT) {
      assert.deepEqual(all.clipped, [], `${name} ${width}: 잘린 이름`);
      assert.deepEqual(all.split, [], `${name} ${width}: 쪼개진 낱말`);
      assert.deepEqual(all.overflow, [], `${name} ${width}: 칸 넘침`);
      assert.equal(all.pageOverflow, false, `${name} ${width}: 가로 스크롤`);
    } else continue;
    // ⑵ 실제 목록 판
    for (const [set, variant] of [["middle", "map"], ["elementary", "map"], ["middle", "full"]]) {
      await page.goto(`${base}/dev/daily-journey-qa?days=2&set=${set}&variant=${variant}`);
      await page.waitForSelector("[data-qa-ready=true]");
      await page.evaluate(() => document.fonts.ready);
      const one = await page.evaluate(inspect);
      assert.deepEqual([one.clipped, one.split, one.overflow, one.pageOverflow], [[], [], [], false], `${name} ${width} ${set} ${variant}`);
      await page.locator("[data-daily-journey]").screenshot({ path: `${out}/${name}-${width}-${set}-${variant}.png` });
    }
    // 흐름: 지난 칸 되풀기 · 문제 하나로는 말이 안 움직임 · 하루를 마치면 한 칸
    await page.goto(`${base}/dev/daily-journey-qa?days=17`);
    await page.waitForSelector("[data-qa-ready=true]");
    await page.getByRole("button", { name: "이전 진도판" }).click();
    await page.getByRole("button", { name: /^1일차, .*다시 풀기/ }).click();
    if ((await page.getByLabel("검수 복습 일차").textContent()) !== "qa-day-1") throw new Error("Wrong replay day");
    await page.getByRole("button", { name: "현재 위치로" }).click();
    const before = await page.getByLabel("내 말, 17일 학습 완료").getAttribute("style");
    await page.getByRole("button", { name: /이어서 학습하기/ }).click();
    if ((await page.getByLabel("내 말, 17일 학습 완료").getAttribute("style")) !== before) throw new Error("Moved on individual answer");
    await page.getByRole("button", { name: "검수: 하루 완료" }).click();
    await page.getByLabel("내 말, 18일 학습 완료").waitFor();
    await page.close();
  }
  await browser.close();
}
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log("통과 —", report.length, "화면");
