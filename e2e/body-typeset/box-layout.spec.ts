import { expect, test, type Locator } from "@playwright/test";
import { hwpxLines, open, panel } from "./paperProbe";

/**
 * 트랙 46 — 〈보기〉 배치가 원본을 따른다: 검수 카드 · 지면 · HWPX 가 한 배치.
 *
 * 원장님 2026-09-21 «그림이 이상하게 배열되고 있네. 문제 안에 여러 그림이 있을 경우 원본을 어기고».
 * 문제 22 는 원본 〈보기〉 가 그림 넷의 2열 2행인데 검수 화면에서 한 열로 쌓였다. 같은 뿌리로
 * HWPX 는 9번 저장본의 격자를 풀며 (바)를 (마)보다 먼저 적었다.
 *
 * 실제 Chromium 에서 그림·라벨의 자리를 재고, 지면을 HWPX 로 수집해 서버와 같은 스키마 →
 * 파이썬 writer 까지 돌려 한글 문단의 차례를 읽는다(한글 자체는 안 연다 — 절대 규칙 9).
 */

const SHOTS = process.env.BODY_TYPESET_SHOTS;

/** 한 자리 안 그림들의 화면 자리(그림 번호 차례). */
async function figureBoxes(root: Locator) {
  return root.evaluate((element) =>
    [...element.querySelectorAll("img")]
      .map((img) => img.getBoundingClientRect())
      .filter((rect) => rect.width > 4)
      .map(({ left, top, right, bottom }) => ({ left, top, right, bottom })),
  );
}

/** 글자들의 화면 자리 — 첫 번째로 나온 곳. */
async function labelBoxes(root: Locator, labels: string[]) {
  return root.evaluate((element, wanted) => {
    const found: Record<string, { left: number; top: number }> = {};
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const value = node.textContent ?? "";
      for (const label of wanted) {
        const at = value.indexOf(label);
        if (at < 0 || found[label]) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + label.length);
        const { left, top } = range.getBoundingClientRect();
        found[label] = { left, top };
      }
    }
    return wanted.map((label) => found[label] ?? null);
  }, labels);
}

test.describe("문제 22 — 그림 넷이 원본처럼 2열 2행", () => {
  for (const name of ["q22", "q22edited"]) {
    test(`${name}: 검수 카드·지면·편집기가 같은 2×2`, async ({ page }) => {
      await open(page, name);
      for (const where of ["card", "paper", "editor"] as const) {
        const boxes = await figureBoxes(panel(page, where));
        expect(boxes, `${where}: 그림 넷`).toHaveLength(4);
        const [a, b, c, d] = boxes;
        // 윗줄 ㄱ·ㄴ 은 한 행(위쪽 끝이 겹친다), ㄴ 은 ㄱ 의 오른쪽.
        expect(b!.top, `${where}: ㄴ 이 ㄱ 과 한 행`).toBeLessThan(a!.bottom);
        expect(b!.left, `${where}: ㄴ 이 ㄱ 오른쪽`).toBeGreaterThan(a!.right);
        // 아랫줄 ㄷ·ㄹ 은 윗줄 아래, ㄷ 은 ㄱ 과 같은 열.
        expect(c!.top, `${where}: ㄷ 이 아랫줄`).toBeGreaterThanOrEqual(
          a!.bottom,
        );
        expect(
          Math.abs(c!.left - a!.left),
          `${where}: ㄷ 이 ㄱ 과 같은 열`,
        ).toBeLessThan(a!.right - a!.left);
        expect(d!.left, `${where}: ㄹ 이 ㄷ 오른쪽`).toBeGreaterThan(c!.right);
        expect(d!.top, `${where}: ㄹ 이 ㄷ 과 한 행`).toBeLessThan(c!.bottom);
      }
      if (SHOTS)
        await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
    });
  }

  test("q22: HWPX 도 한 행 한 문단 — ㄱ·ㄴ, 그림1·그림2, ㄷ·ㄹ, 그림3·그림4", async ({
    page,
  }) => {
    await open(page, "q22");
    const lines = await hwpxLines(page);
    const box = lines.slice(
      lines.indexOf("〈보기〉") + 1,
      lines.indexOf("〈보기〉") + 5,
    );
    expect(box).toEqual([
      "ㄱ. ⇥ ㄴ.",
      "[image1] ⇥ [image2]",
      "ㄷ. ⇥ ㄹ.",
      "[image3] ⇥ [image4]",
    ]);
  });
});

test.describe("원장님 9번 — (가)~(바) 가 원문 차례", () => {
  test("열 수가 없는 저장본: 검수 카드·지면 모두 두 줄, HWPX 도 (가)…(바) 차례", async ({
    page,
  }) => {
    await open(page, "box9crop");
    for (const where of ["card", "paper"] as const) {
      const [ga, na, da, ra] = await labelBoxes(panel(page, where), [
        "(가)",
        "(나)",
        "(다)",
        "(라)",
      ]);
      // 한 줄에 (가)(나)(다), 다음 줄에 (라) — 원본의 행 그대로(검수 카드와 지면이 같다).
      expect(Math.abs(na!.top - ga!.top), `${where}: (나)`).toBeLessThan(8);
      expect(Math.abs(da!.top - ga!.top), `${where}: (다)`).toBeLessThan(8);
      expect(ra!.top - ga!.top, `${where}: (라) 는 다음 줄`).toBeGreaterThan(
        10,
      );
    }
    const labels = (await hwpxLines(page)).join(" ").match(/\([가-바]\)/g);
    expect(labels!.slice(0, 6)).toEqual([
      "(가)",
      "(나)",
      "(다)",
      "(라)",
      "(마)",
      "(바)",
    ]);
  });

  test("`<보기:cols=3>` 을 적으면 3열 2행 — 검수 카드·지면이 같고, HWPX 는 두 문단에 탭", async ({
    page,
  }) => {
    // 넓은 단(1단 지면)에서 — 88mm 단은 칸이 좁아 지면이 열을 줄여 그린다(트랙 51, `box-cols.spec.ts`).
    await open(page, "box9cols3", "&paperWidth=180mm");
    for (const where of ["card", "paper"] as const) {
      const at = await labelBoxes(panel(page, where), [
        "(가)",
        "(나)",
        "(다)",
        "(라)",
        "(마)",
        "(바)",
      ]);
      const [ga, na, da, ra, ma, ba] = at.map((box) => box!);
      for (const [left, right] of [
        [ga, na],
        [na, da],
        [ra, ma],
        [ma, ba],
      ])
        expect(right!.left, where).toBeGreaterThan(left!.left + 20);
      expect(Math.abs(ra!.left - ga!.left), where).toBeLessThan(4);
      expect(ra!.top, where).toBeGreaterThan(ga!.top + 10);
    }
    const lines = await hwpxLines(page);
    const rows = lines.filter(
      (line) => /\((가|라)\)/.test(line) && line.includes("⇥"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/^\(가\) .*⇥ \(나\) .*⇥ \(다\) /);
    expect(rows[1]).toMatch(/^\(라\) .*⇥ \(마\) .*⇥ \(바\) /);
    if (SHOTS)
      await page.screenshot({ path: `${SHOTS}/box9cols3.png`, fullPage: true });
  });
});

test.describe("보기 번호 격자 — 분수 보기가 번호와 한 줄", () => {
  for (const name of ["choicesFrac", "bankFrac"]) {
    test(`${name}: HWPX 에서 ① 옆에 그 보기`, async ({ page }) => {
      await open(page, name);
      const lines = await hwpxLines(page);
      for (const [mark, value] of [
        ["①", "\\dfrac{5}{2}"],
        ["③", "\\dfrac{1}{3}"],
        ["⑤", "\\dfrac{7}{4}"],
      ]) {
        const line = lines.find((entry) => entry.includes(mark));
        expect(line, `${mark} 줄`).toContain(`${mark} $${value}$`);
      }
    });
  }
});

test("친 네 칸 — HWPX 에서 한 칸으로 접히지 않고 미리보기 간격의 탭이 된다", async ({
  page,
}) => {
  await open(page, "typed").catch(() => undefined);
  await expect(panel(page, "paper")).toContainText("갑");
  const lines = await hwpxLines(page);
  expect(lines).toContain("갑 ⇥ 을");
});
