/**
 * **판정형 보기의 폭 · 접힘 실측** — 제품의 지면 컴포넌트를 Chromium 으로 띄워 문항마다
 *   ⑴ 제품이 고른 보기 열 수  ⑵ 보기 수식이 칸 안에서 접혔나  ⑶ 수식이 한 줄일 때의 폭(px)  ⑷ 칸의 폭
 * 을 잰다 (2026-10-08 엔진 보강 2단계).
 *
 * 왜 있나: 판정형의 보기는 «식»이라 넓다. 값이 맞는지를 보는 시험 · 변이 · 정답지 자는 전부 초록인데 문제지에서
 * 식이 2열 칸에 안 들어가 접혔다. 등록부의 지면 관문(`src/lib/middle/judge/paper.ts`)은 폭을 **계산**하므로,
 * 그 계산과 칸 치수가 실제와 맞는지는 여기서 잰다. 제품의 지면 치수 · 글꼴 · 보기 배치 규칙이 바뀌면 다시 돌린다.
 *
 *   npx tsx scripts/qa/judge-paper/samples.ts measure 60                 # 표본(등록 + 보류)
 *   npx vite --config scripts/qa/judge-paper/vite.config.mts             # 다른 창에서 띄워 둔다(127.0.0.1:4237)
 *   node scripts/qa/judge-paper/measure.mjs worksheet <출력.json> w-calc-mul2 w-odd-div2 …
 *   node scripts/qa/judge-paper/measure.mjs daily     <출력.json> w-calc-mul2 …
 *
 * 지면: `worksheet` = 통합 시험지 2단(`WorksheetEditor`) · `daily` = 일일테스트(`TestPrint`).
 * 접힘은 «수식 조각의 왼쪽 끝이 앞 조각의 오른쪽 끝보다 왼쪽에 있다»로 본다(KaTeX 는 조각 사이에서만 줄을 바꾼다).
 * 상자의 위 · 아래로 재면 분수와 연산자의 높이가 달라 한 줄짜리도 «여러 줄»로 읽힌다.
 */
import { writeFileSync } from "node:fs";

import { chromium } from "@playwright/test";

const [paper, out, ...sets] = process.argv.slice(2);
if (!["worksheet", "daily"].includes(paper) || !out || sets.length === 0) {
  console.error("쓰는 법: measure.mjs <worksheet|daily> <출력.json> <묶음 …>");
  process.exit(2);
}
const url = (set) =>
  paper === "worksheet"
    ? `http://127.0.0.1:4237/worksheet.html?set=${set}`
    : `http://127.0.0.1:4237/?mode=questions&set=${set}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
page.setDefaultTimeout(240000);
// 글꼴 응답이 200 이어도 내용이 HTML 일 수 있다(2026-10-03) — 첫 바이트를 본다. 대체 글꼴로 재면 폭이 다 틀린다.
const badFonts = [];
page.on("response", async (r) => {
  if (!/\.(woff2?|ttf)(\?|$)/.test(r.url()) || r.status() !== 200) return;
  const head = (await r.body().catch(() => Buffer.alloc(0)))
    .subarray(0, 4)
    .toString("latin1");
  if (!/^(wOF2|wOFF)/.test(head)) badFonts.push(r.url().split("/").pop());
});

/** 브라우저 안 — 마커 ①~⑤ 를 자식으로 갖는 보기 격자를 찾아 칸마다 잰다. */
function measure() {
  const MARKS = ["①", "②", "③", "④", "⑤"];
  const grids = [...document.querySelectorAll("*")].filter(
    (el) =>
      getComputedStyle(el).display === "grid" &&
      el.children.length === 5 &&
      [...el.children].every((c, i) =>
        c.textContent.trim().startsWith(MARKS[i]),
      ),
  );
  const rows = grids.map((grid) => {
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    const cells = [...grid.children].map((cell) => {
      const katex = cell.querySelector(".katex-html");
      const box = cell.getBoundingClientRect();
      // 제품은 KaTeX 클래스에 접두사를 붙인다(`katex-base`). 맨 KaTeX(`base`)도 같이 본다.
      // 식 뒤에 조사가 붙은 긴 식은 마지막 조각이 nowrap 상자 안에 있다(`rehypeMathNowrap` 의 `pinLastPiece`).
      const bases = katex
        ? [...katex.querySelectorAll(":scope > .katex-base, :scope > span > .katex-base, :scope > .base")]
        : [];
      if (bases.length === 0)
        return { tex: "", width: 0, room: 0, wrapped: false };
      const rects = bases.map((b) => b.getBoundingClientRect());
      return {
        tex: (cell.querySelector("annotation")?.textContent ?? "").replace(
          /^\\displaystyle\s*/,
          "",
        ),
        width: Math.round(rects.reduce((acc, r) => acc + r.width, 0) * 10) / 10,
        room: Math.round((box.right - rects[0].left) * 10) / 10,
        wrapped: rects.some((r, i) => i > 0 && r.left < rects[i - 1].right - 1),
      };
    });
    return { cols, cells };
  });
  return {
    rows,
    font: grids[0] ? getComputedStyle(grids[0]).fontSize : null,
  };
}

const result = {};
const pct = (n, d) => (d === 0 ? "-" : `${Math.round((100 * n) / d)}%`);
for (const set of sets) {
  const expected = await (
    await fetch(`http://127.0.0.1:4237/samples-${set}.json`)
  ).json();
  await page.goto(url(set), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (document.body.innerText.match(/①/g) ?? []).length >= 5,
  );
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(measure);
  // 통합 시험지 화면은 같은 지면을 두 벌 그린다(미리보기 · 인쇄) — 문항 수로 벌 수를 센다.
  const copies = m.rows.length / expected.samples.length;
  const unread = m.rows.flatMap((r) => r.cells).filter((c) => c.width === 0);
  const two = m.rows.filter((r) => r.cols === 2);
  const folded = m.rows.filter((r) => r.cells.some((c) => c.wrapped));
  const widths = m.rows
    .flatMap((r) => r.cells.map((c) => c.width))
    .sort((a, b) => a - b);
  const room = (cols) =>
    m.rows.find((r) => r.cols === cols)?.cells[0]?.room ?? null;
  result[set] = { paper, font: m.font, copies, rows: m.rows };
  console.log(
    JSON.stringify({
      paper,
      set,
      font: m.font,
      problems: expected.samples.length,
      copies,
      unread: unread.length,
      twoColumn: pct(two.length, m.rows.length),
      folded: pct(folded.length, m.rows.length),
      foldedCount: folded.length / copies,
      room2: room(2),
      room1: room(1),
      width: [widths[0], widths[widths.length >> 1], widths.at(-1)],
    }),
  );
}
if (badFonts.length > 0)
  console.error(
    `🛑 글꼴이 글꼴이 아니다 — 대체 글꼴로 쟀다: ${[...new Set(badFonts)].join(", ")}`,
  );
writeFileSync(out, JSON.stringify(result));
await browser.close();
process.exit(badFonts.length > 0 ? 1 : 0);
