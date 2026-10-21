// 한 걸음 문항 시안(/dev/quick-items) — 폰 폭 넘침·잘림 실측 (트랙 B1 · 2026-09-27).
//
// 저장소 뿌리에서, 워크트리 개발 서버를 띄운 뒤:
//   node scripts/qa/quick-items-qa.mjs
// 환경 변수(모두 선택):
//   BASE        개발 서버 (기본 http://localhost:3101 — 🔴 3000 은 원장님 것이라 쓰지 않는다)
//   QA_OUTPUT   스크린샷·요약 폴더 (기본 .qa-artifacts/quick-items)
//   QA_ENGINES  chromium,webkit
//   QA_SIZES    320x568,390x844
//   QA_POOL     넘침 측정 표본 폭 (모양 × 난이도마다 씨앗 수, 기본 120)
//
// 재는 것 — 폭마다:
//   ⑴ 문서 가로 넘침(가로 스크롤) 0
//   ⑵ 보기 칸: 수식이 칸 안에서 가로로 잘리지 않고(스크롤 없음) 세로로도 잘리지 않음, 줄 수 ≤ 2
//      (B2 실측: 320px 에서 세 줄부터는 칸 높이가 고정이라 앞부분이 잘린다)
//   ⑶ 발문 줄 수 ≤ 2 (브리프: 320px 에서 두 줄 이내)
//   ⑷ 폰 한 화면(frame)에서 문제 칸이 세로로 넘쳐 스크롤이 필요하지 않음
//
// 🔴 격리: 이 스크립트는 한 걸음 생성기를 import 하지 않는다 — 화면만 연다.
//    `/api/**` 는 전부 가로막는다(DB·로그인 없음).
import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.BASE ?? "http://localhost:3101";
const output = resolve(process.env.QA_OUTPUT ?? ".qa-artifacts/quick-items");
const engines = (process.env.QA_ENGINES ?? "chromium,webkit").split(",");
const sizes = (process.env.QA_SIZES ?? "320x568,390x844")
  .split(",")
  .map((s) => s.split("x").map(Number));
const pool = Number(process.env.QA_POOL ?? 120);
await mkdir(output, { recursive: true });

const launchers = { chromium, webkit };

/** 브라우저 안에서 — 요소 안 글자·수식이 몇 줄로 놓였나 */
const MEASURE = `
window.__qaLines = (root) => {
  const rects = [];
  // 조사가 붙은 긴 식은 마지막 조각이 nowrap 상자 안에 있다(rehypeMathNowrap 의 pinLastPiece).
  for (const base of root.querySelectorAll('.katex-html > .katex-base, .katex-html > span > .katex-base')) {
    for (const r of base.getClientRects()) if (r.width > 0.5 && r.height > 0.5) rects.push(r);
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || n.parentElement.closest('.katex')) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 0.5) rects.push(r);
  }
  rects.sort((a, b) => a.top - b.top);
  const lines = [];
  for (const r of rects) {
    const last = lines[lines.length - 1];
    const overlap = last ? Math.min(last.bottom, r.bottom) - Math.max(last.top, r.top) : -1;
    if (last && overlap > 0.3 * Math.min(r.height, last.bottom - last.top)) {
      last.top = Math.min(last.top, r.top);
      last.bottom = Math.max(last.bottom, r.bottom);
    } else lines.push({ top: r.top, bottom: r.bottom });
  }
  return lines.length;
};
window.__qaCard = (card) => {
  const prompt = card.querySelector('[data-quick-prompt]');
  const scroll = prompt.parentElement;
  const choices = [...card.querySelectorAll('[data-quick-choice]')].map((btn) => {
    const math = btn.lastElementChild;
    const b = btn.getBoundingClientRect();
    // 🔴 인라인 span 의 상자는 글꼴 높이뿐이라 큰 분수(\dfrac)가 삐져나와도 안 보인다 —
    //    KaTeX 조각(.katex-base, inline-block)의 상자를 합쳐 잰다
    const bases = [...math.querySelectorAll('.katex-html > .katex-base, .katex-html > span > .katex-base')].map((e) => e.getBoundingClientRect());
    const m = bases.length
      ? { top: Math.min(...bases.map((r) => r.top)), bottom: Math.max(...bases.map((r) => r.bottom)), width: Math.max(...bases.map((r) => r.right)) - Math.min(...bases.map((r) => r.left)) }
      : math.getBoundingClientRect();
    const border = 2;
    return {
      text: math.textContent,
      lines: window.__qaLines(math),
      overflowX: Math.max(0, math.scrollWidth - math.clientWidth),
      clipY: Math.max(0, b.top + border - m.top, m.bottom - (b.bottom - border)),
      width: Math.round(m.width),
    };
  });
  const eqWrap = card.querySelector('[data-quick-equation]');
  const eq = eqWrap ? eqWrap.firstElementChild : null;
  return {
    promptLines: window.__qaLines(prompt.firstElementChild),
    promptOverflowX: Math.max(0, prompt.scrollWidth - prompt.clientWidth),
    equationLines: eq ? window.__qaLines(eq) : 0,
    equationOverflowX: eq ? Math.max(0, eq.scrollWidth - eq.clientWidth) : 0,
    equationWidth: eq ? Math.round(Math.max(0, ...[...eq.querySelectorAll('.katex-html > .katex-base, .katex-html > span > .katex-base')].map((e) => e.getBoundingClientRect().right)) - eq.getBoundingClientRect().left) : 0,
    scrollOverflowY: Math.max(0, scroll.scrollHeight - scroll.clientHeight),
    choices,
  };
};
`;

async function ready(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => document.querySelectorAll(".katex").length > 0,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ content: MEASURE });
}

const summary = { base, pool, runs: [] };
const problems = [];

// 시안 화면에서 폰 틀 주소를 모은다(생성기를 import 하지 않으려고 화면에서 읽는다)
const desk = await chromium.launch();
const deskPage = await desk.newPage({ viewport: { width: 1400, height: 900 } });
await deskPage.route("**/api/**", (r) =>
  r.fulfill({ status: 404, body: "{}" }),
);
await deskPage.goto(`${base}/dev/quick-items`, { timeout: 240_000 });
await deskPage.waitForLoadState("domcontentloaded");
const frames = [
  ...new Set(
    await deskPage.$$eval("iframe", (els) =>
      els.map((e) => e.getAttribute("src")),
    ),
  ),
];
const shapeCount = await deskPage.$$eval(
  "[data-quick-shape]",
  (els) => els.length,
);
await deskPage.screenshot({ path: resolve(output, "board-top.png") });
await deskPage.locator("#distribute").scrollIntoViewIfNeeded();
await deskPage.waitForTimeout(1500);
await deskPage.screenshot({ path: resolve(output, "board-distribute.png") });
await desk.close();
console.log(`시안: 모양 ${shapeCount} · 폰 틀 주소 ${frames.length}`);

for (const engineName of engines) {
  const browser = await launchers[engineName].launch();
  for (const [width, height] of sizes) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await context.route("**/api/**", (r) =>
      r.fulfill({ status: 404, body: "{}" }),
    );
    const page = await context.newPage();
    const run = { engine: engineName, width, height, stress: null, frames: [] };

    // ⑴⑵⑶ 넘침 측정 — 가장 빡빡한 표본을 줄지어
    await page.goto(`${base}/dev/quick-items/stress?pool=${pool}`, {
      timeout: 240_000,
    });
    await ready(page);
    const stress = await page.evaluate(() => ({
      docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
      cards: [...document.querySelectorAll("[data-quick-stress]")].map(
        (wrap) => ({
          key: wrap.getAttribute("data-quick-stress"),
          ...window.__qaCard(wrap.querySelector("[data-quick-card]")),
        }),
      ),
    }));
    const choiceLines = { 1: 0, 2: 0, 3: 0 };
    for (const card of stress.cards) {
      for (const c of card.choices) {
        choiceLines[Math.min(3, c.lines)] += 1;
        if (c.lines > 2 || c.overflowX > 0.5 || c.clipY > 0.5)
          problems.push(
            `${engineName} ${width} 보기 ${JSON.stringify(c)} — ${card.key}`,
          );
      }
      if (card.promptLines > 2 || card.promptOverflowX > 0.5)
        problems.push(
          `${engineName} ${width} 발문 ${card.promptLines}줄 넘침 ${card.promptOverflowX} — ${card.key}`,
        );
      // 식 칸은 한 줄(원장님 확정 — 발문 아래 줄에 따로 크게)
      if (card.equationLines > 1 || card.equationOverflowX > 0.5)
        problems.push(
          `${engineName} ${width} 식 칸 ${card.equationLines}줄 넘침 ${card.equationOverflowX} — ${card.key}`,
        );
    }
    if (stress.docOverflowX > 0)
      problems.push(
        `${engineName} ${width} 넘침 측정 화면 가로 넘침 ${stress.docOverflowX}px`,
      );
    const twoLine = stress.cards.flatMap((card) =>
      card.choices.filter((c) => c.lines === 2).map((c) => c.text),
    );
    run.stress = {
      cards: stress.cards.length,
      docOverflowX: stress.docOverflowX,
      choiceLines,
      promptLines: stress.cards.reduce(
        (acc, c) => ({
          ...acc,
          [c.promptLines]: (acc[c.promptLines] ?? 0) + 1,
        }),
        {},
      ),
      widestEquationPx: Math.max(...stress.cards.map((c) => c.equationWidth)),
      equationLines: stress.cards.reduce(
        (acc, c) => ({
          ...acc,
          [c.equationLines]: (acc[c.equationLines] ?? 0) + 1,
        }),
        {},
      ),
      widestChoicePx: Math.max(
        ...stress.cards.flatMap((c) => c.choices.map((x) => x.width)),
      ),
      twoLineChoices: [...new Set(twoLine)].slice(0, 40),
    };

    // ⑷ 폰 한 화면
    for (const src of frames) {
      await page.goto(`${base}${src}`, { timeout: 240_000 });
      await ready(page);
      const m = await page.evaluate(() => ({
        docOverflowX: document.documentElement.scrollWidth - window.innerWidth,
        ...window.__qaCard(document.querySelector("[data-quick-card]")),
      }));
      const tag = new URL(`${base}${src}`).searchParams;
      const name = `${tag.get("t").replace(/[:]/g, "_")}-d${tag.get("d")}`;
      if (m.docOverflowX > 0)
        problems.push(
          `${engineName} ${width} ${name} 가로 넘침 ${m.docOverflowX}`,
        );
      if (m.scrollOverflowY > 0.5)
        problems.push(
          `${engineName} ${width} ${name} 문제 칸 세로 넘침 ${m.scrollOverflowY}px`,
        );
      if (m.promptLines > 2)
        problems.push(`${engineName} ${width} ${name} 발문 ${m.promptLines}줄`);
      if (m.equationLines > 1 || m.equationOverflowX > 0.5)
        problems.push(
          `${engineName} ${width} ${name} 식 칸 ${m.equationLines}줄 넘침 ${m.equationOverflowX}`,
        );
      for (const c of m.choices)
        if (c.lines > 2 || c.overflowX > 0.5 || c.clipY > 0.5)
          problems.push(
            `${engineName} ${width} ${name} 보기 ${JSON.stringify(c)}`,
          );
      run.frames.push({
        name,
        ...m,
        choices: m.choices.map((c) => `${c.text}:${c.lines}`),
      });
      if (engineName === "chromium" || src === frames[0])
        await page.screenshot({
          path: resolve(output, `${engineName}-${width}-${name}.png`),
        });
    }

    // 누르면 맞음·틀림이 보이나(시안의 손맛) — 첫 틀에서 한 번
    await page.goto(`${base}${frames[0]}`);
    await ready(page);
    await page.locator("[data-quick-choice]").first().tap();
    const pressed = await page.$$eval("[data-quick-choice]", (els) =>
      els.map((e) => e.getAttribute("data-result")),
    );
    if (!pressed.includes("correct"))
      problems.push(
        `${engineName} ${width} 보기를 눌러도 정답 표시가 없다 ${pressed}`,
      );
    run.tap = pressed;

    summary.runs.push(run);
    console.log(
      `${engineName} ${width}×${height}: 넘침 표본 ${run.stress.cards}장 · 보기 줄 ${JSON.stringify(run.stress.choiceLines)} · 발문 줄 ${JSON.stringify(run.stress.promptLines)} · 가장 넓은 보기 ${run.stress.widestChoicePx}px · 식 칸 줄 ${JSON.stringify(run.stress.equationLines)} · 가장 넓은 식 ${run.stress.widestEquationPx}px · 폰 화면 ${run.frames.length}장`,
    );
    await context.close();
  }
  await browser.close();
}

summary.problems = problems;
await writeFile(
  resolve(output, "summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(
  problems.length
    ? `문제 ${problems.length}건:\n${problems.slice(0, 40).join("\n")}`
    : "문제 0건",
);
process.exit(problems.length ? 1 : 0);
