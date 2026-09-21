import { expect, test, type Page } from "@playwright/test";
import { baselines, hwpxLines, open, panel, settle } from "./paperProbe";

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
    await expect(page.locator("[data-stored]")).toContainText("<보기:cols=3>");
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

  test("검수 카드·편집기도 같은 맞춤 — (가)(나)(다) 앞말의 글자 바닥이 한 줄(모든 화면 일치)", async ({
    page,
  }) => {
    await open(page, "box9cols3", "&paperWidth=180mm");
    for (const [where, cells] of [
      ["card", '[data-panel="card"] [data-condition-box] .grid > *'],
      ["editor", '[data-panel="editor"] .visual-condition-cells > p'],
    ] as const) {
      // 같은 글꼴의 앞말끼리는 글자 상자 바닥의 차가 곧 기준선의 차다.
      const bottoms = await page.evaluate((selector) => {
        const found: number[] = [];
        for (const cell of document.querySelectorAll(selector)) {
          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const at = (node.textContent ?? "").search(/\((가|나|다)\)/);
            if (at < 0) continue;
            const range = document.createRange();
            range.setStart(node, at);
            range.setEnd(node, at + 3);
            found.push(range.getBoundingClientRect().bottom);
            break;
          }
        }
        return found.slice(0, 3);
      }, cells);
      expect(bottoms, where).toHaveLength(3);
      expect(
        Math.abs(bottoms[1]! - bottoms[0]!),
        `${where} (가)·(나)`,
      ).toBeLessThan(1);
      expect(
        Math.abs(bottoms[2]! - bottoms[1]!),
        `${where} (나)·(다)`,
      ).toBeLessThan(1);
    }
  });

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

/* ── 작업실 원문 편집기 — 열 수 손잡이(안 C) · 상자 안 Tab ─────────────────────────────────── */

const editorBox = (page: Page) =>
  page.locator('[data-panel="editor"] .visual-condition');
const handle = (page: Page) =>
  editorBox(page).locator(".visual-condition-cols");
const draft = async (page: Page) =>
  JSON.parse(
    (await page.locator("[data-draft]").textContent()) ?? '""',
  ) as string;

/**
 * 편집기 글 `needle` 바로 앞에 커서를 둔다. 먼저 수식이 없는 첫 줄을 눌러 편집기에 초점을 준다 —
 * 칸 가운데를 누르면 수식을 눌러 수식 칸이 열린다.
 */
async function caretBefore(page: Page, needle: string) {
  if (
    !(await page.evaluate(() =>
      document.activeElement?.classList.contains("visual-document"),
    ))
  )
    await page
      .locator('[data-panel="editor"] .visual-document')
      .getByText("다음 이차함수")
      .click();
  await page.evaluate((wanted) => {
    const root = document.querySelector(
      '[data-panel="editor"] .visual-document',
    )!;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = (node.textContent ?? "").indexOf(wanted);
      if (at < 0) continue;
      document.getSelection()!.collapse(node, at);
      return;
    }
    throw new Error(`없는 글: ${wanted}`);
  }, needle);
  await settle(page);
}

test.describe("편집기 〈보기〉 — 열 수 손잡이와 상자 안 Tab", () => {
  test("손잡이는 커서가 상자 안일 때만 — 3열을 누르면 원문이 `<보기:cols=3>` + 한 줄에 한 칸, 편집기도 3열", async ({
    page,
  }) => {
    await open(page, "box9");
    await expect(handle(page)).toBeHidden();
    await caretBefore(page, "(가)");
    await expect(handle(page)).toBeVisible();
    await expect(editorBox(page)).toHaveClass(/has-caret/);
    await expect(
      handle(page).getByRole("button", { name: "1열" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".visual-editor-help")).toContainText(
      "상자 안에서 Tab 다음 칸",
    );
    await expect(
      editorBox(page).locator(".visual-condition-tabhint"),
    ).toBeVisible();
    // 손잡이 모양(시안): 눌린 열은 짙은 남색 바탕, 버튼만 손가락 커서(D-30).
    const look = await handle(page).evaluate((group) => {
      const [one] = group.querySelectorAll("button");
      const box = group.closest(".visual-condition")!;
      return {
        pressedBg: getComputedStyle(
          group.querySelector('[aria-pressed="true"]')!,
        ).backgroundColor,
        buttonCursor: getComputedStyle(one!).cursor,
        boxCursor: getComputedStyle(box).cursor,
      };
    });
    expect(look.pressedBg).toBe("rgb(30, 58, 138)");
    expect(look.buttonCursor).toBe("pointer");
    expect(look.boxCursor).not.toBe("pointer");
    if (SHOTS)
      await page.screenshot({
        path: `${SHOTS}/editor-handle.png`,
        fullPage: true,
      });

    await handle(page).getByRole("button", { name: "3열" }).click();
    await expect.poll(() => draft(page)).toContain("<보기:cols=3>");
    const lines = (await draft(page))
      .split("\n")
      .filter((line) => line.startsWith(">"));
    expect(lines).toEqual([
      "> <보기:cols=3>",
      "> (가) $y = 3x^2$",
      "> (나) $y = -\\frac{2}{3}x^2$",
      "> (다) $y = -3x^2$",
      "> (라) $y = \\frac{4}{3}x^2$",
      "> (마) $y = \\frac{3}{4}x^2$",
      "> (바) $y = -5x^2$",
    ]);
    // 편집기 격자도 3열 — 저장 뒤 검수 카드·지면과 같은 칸.
    const tracks = await editorBox(page)
      .locator(".visual-condition-cells")
      .evaluate(
        (cells) =>
          getComputedStyle(cells).gridTemplateColumns.split(" ").length,
      );
    expect(tracks).toBe(3);
    if (SHOTS)
      await page.screenshot({
        path: `${SHOTS}/editor-cols3.png`,
        fullPage: true,
      });

    // 상자 밖을 누르면 손잡이가 사라진다.
    await page
      .locator('[data-panel="editor"] .visual-document')
      .getByText("다음 이차함수")
      .click();
    await expect(handle(page)).toBeHidden();
    await expect(page.locator(".visual-editor-help")).toContainText(
      "글은 바로 입력하고",
    );
  });

  test("상자 안 Tab — (나) 앞에서 누르면 그 자리에서 칸이 갈리고, Esc 뒤 Tab 은 상자 다음 문단", async ({
    page,
  }) => {
    await open(page, "box9");
    await caretBefore(page, "(가)");
    await caretBefore(page, "(나)");
    await page.keyboard.press("Tab");
    await expect
      .poll(async () =>
        (await draft(page)).split("\n").filter((line) => line.startsWith(">")),
      )
      .toEqual([
        "> <보기>",
        "> (가) $y = 3x^2$",
        "> (나) $y = -\\frac{2}{3}x^2$ (다) $y = -3x^2$",
        expect.stringMatching(/^> \(라\) /),
      ]);
    // 초점은 편집기에 그대로(Tab 이 초점을 밖으로 옮기지 않았다).
    expect(
      await page.evaluate(() =>
        document.activeElement?.classList.contains("visual-document"),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Z");
    await expect
      .poll(() => draft(page))
      .toContain("Z① 모두 원점이 꼭짓점이다.");
    await expect(handle(page)).toBeHidden();
  });

  test("상자 밖 Tab 은 예전 그대로 — 원문은 안 바뀌고 브라우저가 초점을 옮긴다", async ({
    page,
  }) => {
    await open(page, "box9");
    const before = await draft(page);
    await page
      .locator('[data-panel="editor"] .visual-document')
      .getByText("다음 이차함수")
      .click();
    await page.evaluate(() => {
      window.addEventListener(
        "keydown",
        (event) => {
          (window as unknown as { tabPrevented: boolean }).tabPrevented =
            event.defaultPrevented;
        },
        { once: true },
      );
    });
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => (window as unknown as { tabPrevented: boolean }).tabPrevented,
      ),
    ).toBe(false);
    expect(await draft(page)).toBe(before);
  });
});
