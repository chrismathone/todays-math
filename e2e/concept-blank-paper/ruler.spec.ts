import { expect, test, type Page } from "@playwright/test";

import { measurePages, openSet, type PageReport } from "./measure";

/**
 * 자가 무는가 — `measure.ts` 의 자는 멀쩡한 지면에서 거의 다 **0** 을 낸다. 0 은 «어긋남이 없다»일 수도, «못 센다»일 수도
 * 있다(교훈 2026-08-21 «가드가 0을 내면 …»). 그래서 지면을 일부러 망가뜨리고(CSS 한 줄) 그 자만 움직이는지 본다.
 * 망가뜨리기 전에는 0 이고, 망가뜨리면 0 이 아니어야 그 자가 재고 있는 것이다.
 */
const max = (reports: PageReport[], pick: (r: PageReport) => number) =>
  Math.max(0, ...reports.map(pick));

async function broken(page: Page, css: string) {
  const tag = await page.addStyleTag({ content: css });
  const reports = await measurePages(page);
  await tag.evaluate((el) => (el as Element).remove());
  return reports;
}

test("자가 문다 — 지면을 망가뜨리면 그 자만 움직인다", async ({ page }) => {
  await openSet(page, "counts");
  const clean = await measurePages(page);
  const student = (rs: PageReport[]) => rs.filter((r) => r.part === "student");

  // 멀쩡한 지면 — 모두 0
  expect(max(clean, (r) => r.overflowPx)).toBe(0);
  expect(max(student(clean), (r) => r.emptyPx)).toBeLessThan(40);
  expect(max(clean, (r) => r.align.qnBaseline)).toBe(0);
  expect(max(clean, (r) => r.align.qnLeftSpread)).toBe(0);
  expect(max(clean, (r) => r.align.zoneTop)).toBe(0);
  expect(max(clean, (r) => r.align.zoneBottom)).toBe(0);
  expect(max(clean, (r) => r.align.pairTop)).toBe(0);
  expect(max(clean, (r) => r.align.pairHeight)).toBe(0);

  // ① 넘침 — 문항마다 아래 여백을 크게
  const overflow = await broken(
    page,
    "[data-cb-item]{padding-bottom:90px !important}",
  );
  expect(max(overflow, (r) => r.overflowPx)).toBeGreaterThan(20);

  // ② 빈 틈 — 늘어나 채우기를 끈다(칸 · 문항 · 가지 · 카드가 제 높이만 쓴다)
  const empty = await broken(
    page,
    "[data-cb-fit]{display:block !important} [data-cb-fit] *{flex-grow:0 !important}",
  );
  expect(max(student(empty), (r) => r.emptyPx)).toBeGreaterThan(281);

  // ③ 번호 · 첫 줄 기준선 — 번호만 3px 내린다
  const baseline = await broken(
    page,
    "[data-cb-qn]{position:relative;top:3px}",
  );
  expect(max(baseline, (r) => r.align.qnBaseline)).toBeCloseTo(3, 0);

  // ④ 번호 열 폭 — 고정 폭을 풀면 자릿수마다 폭이 달라진다
  const width = await broken(page, "[data-cb-qn]{width:auto !important}");
  expect(
    Math.max(...width.map((r) => r.align.qnWidths.length)),
  ).toBeGreaterThan(1);

  // ⑤ 줄 긋기 간격 — 한 값이 아니게
  const pitch = await broken(
    page,
    "[data-cb-ruled]{background-size:100% 28px !important}",
  );
  expect(pitch.some((r) => r.align.rulePitch.includes("28px"))).toBe(true);

  // ⑥ A 좌우 칸 — 오른쪽 칸을 5px 내리고, 아랫변 맞춤을 푼다
  const zone = await broken(
    page,
    "[data-cb-box]{margin-top:5px;height:calc(100% - 7px) !important}",
  );
  expect(max(zone, (r) => r.align.zoneTop)).toBeCloseTo(5, 0);
  expect(max(zone, (r) => r.align.zoneBottom)).toBeGreaterThan(0.5);

  // ⑦ 나란한 칸 — 오른쪽 카드 · 오른쪽 가지 기둥을 내린다
  const pair = await broken(
    page,
    '[data-cb-card="narrow"]:nth-child(2){margin-top:6px} [data-cb-side="right"]{padding-top:6px}',
  );
  expect(max(pair, (r) => r.align.pairTop)).toBeCloseTo(6, 0);
  expect(max(pair, (r) => r.align.pairHeight)).toBeGreaterThan(1);

  // ⑧ 채점표 열 폭
  const cols = await broken(page, "table col:first-child{width:60px}");
  expect(cols.some((r) => r.part === "key" && r.align.keyCols[0] !== 44)).toBe(
    true,
  );

  // ⑨ 빈칸 밑줄 깊이 — 기준선에 그대로 앉히면 0
  const blank = await broken(
    page,
    "[data-cb-blank]{vertical-align:baseline !important}",
  );
  const drops = blank
    .map((r) => r.align.blankDrop)
    .filter((d): d is [number, number] => d !== null);
  expect(drops.length).toBeGreaterThan(0);
  expect(Math.max(...drops.map((d) => d[1]))).toBeLessThan(0.05);

  // 망가뜨린 것을 걷으면 다시 멀쩡하다
  const again = await measurePages(page);
  expect(max(again, (r) => r.overflowPx)).toBe(0);
  expect(max(again, (r) => r.align.qnBaseline)).toBe(0);
});

test("자가 문다 — KaTeX 기준선", async ({ page }) => {
  await openSet(page, "math");
  const clean = await measurePages(page);
  expect(clean.reduce((n, r) => n + r.align.katex, 0)).toBeGreaterThan(10);
  expect(max(clean, (r) => r.align.katexBaseline)).toBe(0);
  // 수식만 2px 내린다 — 옆 글과 기준선이 어긋난다
  const shifted = await broken(page, ".katex{position:relative;top:2px}");
  expect(max(shifted, (r) => r.align.katexBaseline)).toBeCloseTo(2, 0);
});
