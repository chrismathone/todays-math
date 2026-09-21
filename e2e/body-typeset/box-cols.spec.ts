import { expect, test, type Page } from "@playwright/test";
import { baselines, hwpxLines, open, panel } from "./paperProbe";

/**
 * 트랙 51 — 원장님 2026-09-21 확정(«추천대로 가»).
 *
 * ① 좁은 단의 3열: 88mm 단에서 `y = −⅔x²` 가 칸 안에서 접혔다. 먼저 상자 안쪽 여백·칸 사이 간격을 줄여
 *    원본처럼 한 줄에 세우고, 그래도 안 들어가면 **그리는** 열 수를 줄인다(적힌 `cols=3` 은 그대로).
 *    지면·HWPX 가 같은 결과(HWPX 는 지면을 베낀다).
 * ② 격자 칸 세로 맞춤: 글 칸은 기준선 맞춤(분수 칸 옆 글이 몇 px 높게 서던 것 — 한글과 같아진다),
 *    그림 칸은 위쪽 그대로.
 *
 * 실제 Chromium 에서 잰다 — 칸 폭·수식 조각의 줄·기준선 자리, 그리고 HWPX 문단.
 */

const SHOTS = process.env.BODY_TYPESET_SHOTS;

/** 지면 〈보기〉 격자의 모양 — 그린 열 수, 여백, 칸마다 한 줄인가. */
async function paperBox(page: Page) {
  return panel(page, "paper").evaluate((root) => {
    const card = root.querySelector<HTMLElement>("[data-box-card]")!;
    const grid = card.querySelector<HTMLElement>("[data-hwpx-grid]")!;
    const cells = [...grid.children] as HTMLElement[];
    const oneLine = cells.map((cell) => {
      // 앞말(«(가)») 한 줄의 가운데를 수식 조각이 모두 지나가면 한 줄이다.
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode() as Text;
      const range = document.createRange();
      range.setStart(first, 0);
      range.setEnd(first, Math.min(3, first.length));
      const label = range.getBoundingClientRect();
      const middle = (label.top + label.bottom) / 2;
      return [...cell.querySelectorAll(".katex-html > .base")].every((base) => {
        const rect = base.getBoundingClientRect();
        return rect.top < middle && rect.bottom > middle;
      });
    });
    const style = getComputedStyle(grid);
    return {
      tracks: style.gridTemplateColumns.split(" ").length,
      gap: style.columnGap,
      padding: getComputedStyle(card).paddingLeft,
      oneLine,
    };
  });
}

/** HWPX 에서 〈보기〉 칸이 선 문단들 — «(가)…» 로 시작하는 탭 문단. */
async function hwpxBoxRows(page: Page) {
  return (await hwpxLines(page)).filter((line) =>
    /^\((가|나|다|라|마|바)\)/.test(line),
  );
}

test.describe("좁은 단의 3열 — 식이 칸 안에서 접히지 않는다", () => {
  test("88mm·10.5pt: 여백을 줄여도 안 들어가 2열로 그린다 — 식은 한 줄, HWPX 도 2열, 카드는 3열 그대로", async ({
    page,
  }) => {
    await open(page, "box9cols3");
    const box = await paperBox(page);
    expect(box.tracks, "지면은 2열로 그린다").toBe(2);
    expect(box.oneLine, "칸마다 한 줄").toEqual(Array(6).fill(true));
    // 원문의 열 수는 그대로 — 검수 카드(넓은 칸)는 3열.
    expect(page.locator("[data-stored]")).toContainText("<보기:cols=3>");
    const cardTracks = await panel(page, "card")
      .locator("[data-condition-box] .grid")
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      );
    expect(cardTracks).toBe(3);
    const rows = await hwpxBoxRows(page);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatch(/^\(가\) .*⇥ \(나\) /);
    expect(rows[1]).toMatch(/^\(다\) .*⇥ \(라\) /);
    expect(rows[2]).toMatch(/^\(마\) .*⇥ \(바\) /);
    if (SHOTS)
      await page.screenshot({
        path: `${SHOTS}/narrow-14px.png`,
        fullPage: true,
      });
  });

  test("88mm·시험지 글자(13.2px): 여백·간격만 줄여 3열 한 줄 — HWPX 도 3열", async ({
    page,
  }) => {
    await open(page, "box9cols3", "&paperFont=13.2px");
    const box = await paperBox(page);
    expect(box.tracks).toBe(3);
    expect(box.padding).toBe("6px");
    expect(box.gap).toBe("10px");
    expect(box.oneLine).toEqual(Array(6).fill(true));
    const rows = await hwpxBoxRows(page);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^\(가\) .*⇥ \(나\) .*⇥ \(다\) /);
    expect(rows[1]).toMatch(/^\(라\) .*⇥ \(마\) .*⇥ \(바\) /);
    if (SHOTS)
      await page.screenshot({
        path: `${SHOTS}/narrow-13px.png`,
        fullPage: true,
      });
  });

  test("넓은 단(1단 지면 180mm): 적힌 3열 그대로, 여백도 그대로", async ({
    page,
  }) => {
    await open(page, "box9cols3", "&paperWidth=180mm");
    const box = await paperBox(page);
    expect(box.tracks).toBe(3);
    expect(box.padding).toBe("16px");
    expect(box.gap).toBe("24px");
    expect(box.oneLine).toEqual(Array(6).fill(true));
  });
});

test.describe("격자 칸 세로 맞춤 — 글 칸은 기준선, 그림 칸은 위쪽", () => {
  test("〈보기〉 3열: 분수 칸 (나) 옆 (가)·(다) 의 앞말이 같은 기준선", async ({
    page,
  }) => {
    await open(page, "box9cols3", "&paperWidth=180mm");
    const [ga, na, da] = await baselines(
      panel(page, "paper"),
      "[data-box-item]",
      "before-math",
    );
    expect(Math.abs(na! - ga!), "(가)·(나)").toBeLessThan(1);
    expect(Math.abs(da! - na!), "(나)·(다)").toBeLessThan(1);
  });

  for (const [name, cells] of [
    ["choicesFrac", "[data-native-choice]"],
    ["bankFrac", "[data-hwpx-grid] > *"],
  ] as const) {
    test(`${name}: 보기 번호와 분수가 한 기준선, 한 행의 번호끼리도 같은 기준선`, async ({
      page,
    }) => {
      await open(page, name);
      const paper = panel(page, "paper");
      const marks = await baselines(paper, cells, "in-first");
      const values = await baselines(paper, cells, "after-math");
      // ① 5/2 — 번호 «①» 가 분수의 기준선에 선다(위쪽 정렬이면 6px 높았다).
      expect(Math.abs(marks[0]! - values[0]!), "① 과 5/2").toBeLessThan(1);
      // ① 과 ② 는 한 행 — 분수가 든 칸 옆의 «② −3» 도 같은 기준선.
      expect(Math.abs(marks[1]! - marks[0]!), "① 과 ②").toBeLessThan(1);
      expect(Math.abs(values[1]! - marks[1]!), "② 와 −3").toBeLessThan(1);
    });
  }

  test("그림 칸은 위쪽 정렬 그대로 — 문제 22", async ({ page }) => {
    await open(page, "q22");
    const aligns = await panel(page, "paper")
      .locator("[data-box-item]")
      .evaluateAll((cells) =>
        cells.map((cell) => getComputedStyle(cell).alignSelf),
      );
    // Tailwind `self-start` 는 `align-self: flex-start` — 격자에서도 위쪽 끝이다.
    expect(aligns).toEqual(Array(4).fill("flex-start"));
    // 글 칸 격자는 기준선 맞춤.
    const gridAlign = await panel(page, "paper")
      .locator("[data-box-card] [data-hwpx-grid]")
      .evaluate((grid) => getComputedStyle(grid).alignItems);
    expect(gridAlign).toBe("baseline");
  });
});
