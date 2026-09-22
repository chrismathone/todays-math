import { expect, test, type Locator, type Page } from "@playwright/test";
import { hwpxLines, open, panel, settle } from "./paperProbe";

/**
 * «나란히» 칸 묶음 — 원장님 2026-09-22 확정(«이런 보기들도 2열 4열 등으로 배치가능하게. 1열 고정같은데»).
 *
 * 서답형 소문항 (1)~(4) 가 그림을 달고 세로로만 쌓이던 것을 `> <나란히:cols=N>` 칸 묶음으로 세운다 —
 * 제목·테두리 없이, 〈보기〉 상자의 칸 규칙(한 줄 = 한 칸) 그대로. 실제 Chromium 에서 편집기 · 검수 카드 ·
 * 지면이 **같은 칸 수·같은 열 수**로 서는지, 칸 안 그림이 칸을 넘지 않는지, HWPX 가 칸 차례대로인지 잰다.
 */

const SHOTS = process.env.BODY_TYPESET_SHOTS;

/** 한 자리의 묶음 모양 — 격자 트랙 수 · 칸 · 칸마다 그림이 칸 안에 드는가 · 테두리 굵기. */
async function groupShape(root: Locator, group: string, grid: string) {
  return root.evaluate(
    (element, { group, grid }) => {
      const box = element.querySelector<HTMLElement>(group);
      const cells = box
        ? ([...box.querySelectorAll<HTMLElement>(grid)] as HTMLElement[])
        : [];
      const container = cells[0]?.parentElement ?? null;
      const style = container ? getComputedStyle(container) : null;
      return {
        found: !!box,
        tracks:
          style && style.display === "grid"
            ? style.gridTemplateColumns.split(" ").length
            : 1,
        cells: cells.length,
        texts: cells.map((cell) =>
          (cell.textContent ?? "").replace(/\s+/g, " ").trim(),
        ),
        figuresInside: cells.map((cell) => {
          const frame = cell.getBoundingClientRect();
          const figures = [
            ...cell.querySelectorAll<HTMLElement>(
              "img:not(.ProseMirror-separator), svg:not(.katex svg)",
            ),
          ].filter((figure) => figure.getBoundingClientRect().width > 0);
          return (
            figures.length > 0 &&
            figures.every((figure) => {
              const rect = figure.getBoundingClientRect();
              return (
                rect.left >= frame.left - 1 && rect.right <= frame.right + 1
              );
            })
          );
        }),
        border: box ? getComputedStyle(box).borderTopWidth : "",
      };
    },
    { group, grid },
  );
}

const editorShape = (page: Page) =>
  groupShape(
    panel(page, "editor"),
    ".visual-condition[data-side-by-side]",
    ".visual-condition-cells > *",
  );
const cardShape = (page: Page) =>
  groupShape(
    panel(page, "card"),
    "[data-side-by-side]",
    "[data-box-cells] > *",
  );
const paperShape = (page: Page) =>
  groupShape(
    panel(page, "paper"),
    "[data-box-card][data-side-by-side]",
    "[data-box-item]",
  );

async function shot(page: Page, name: string) {
  if (SHOTS)
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

test("2열: 편집기·검수 카드·지면이 같은 칸 넷 · 두 열 · 그림은 칸 안 · 테두리 없음", async ({
  page,
}) => {
  await open(page, "side2");
  await expect(
    panel(page, "editor").locator(".visual-condition[data-side-by-side]"),
  ).toBeVisible();
  await settle(page);
  await shot(page, "side2");
  for (const shape of [
    await editorShape(page),
    await cardShape(page),
    await paperShape(page),
  ]) {
    expect(shape.found).toBe(true);
    expect(shape.cells).toBe(4);
    expect(shape.tracks).toBe(2);
    expect(shape.figuresInside).toEqual([true, true, true, true]);
    expect(shape.texts.map((text) => text.slice(0, 3))).toEqual([
      "(1)",
      "(2)",
      "(3)",
      "(4)",
    ]);
  }
  expect((await cardShape(page)).border).toBe("0px");
  expect((await paperShape(page)).border).toBe("0px");
  // 제목 글자(〈나란히〉 · cols)가 어디에도 안 찍힌다.
  for (const name of ["card", "paper"] as const)
    await expect(panel(page, name)).not.toContainText(/나란히|cols/);
});

test("4열: 좁은 단(88mm)에서도 칸 글이 한 줄에 들면 네 열 — 그림은 칸 폭으로 줄어 옆 칸을 안 덮는다", async ({
  page,
}) => {
  await open(page, "side4");
  await settle(page);
  await shot(page, "side4");
  const paper = await paperShape(page);
  expect(paper.cells).toBe(4);
  expect(paper.tracks).toBe(4);
  expect(paper.figuresInside).toEqual([true, true, true, true]);
  expect((await cardShape(page)).tracks).toBe(4);
  expect((await editorShape(page)).tracks).toBe(4);
});

test("HWPX: 2열 묶음이 한글에서 칸 차례대로 — (1)(2) 한 행, (3)(4) 한 행", async ({
  page,
}) => {
  await open(page, "side2");
  const lines = await hwpxLines(page);
  const labels = lines
    .filter((line) => /\(\d\)/.test(line))
    .map((line) => line.match(/\(\d\)/g)!.join(""));
  expect(labels).toEqual(["(1)(2)", "(3)(4)"]);
});

test("[나란히]: 인식 그대로의 소문항을 (1) 부터 끝까지 고르고 누르면 칸 넷 · 2열 · 저장 원문", async ({
  page,
}) => {
  await open(page, "sideRaw");
  const editor = panel(page, "editor");
  // «(1)» 앞에 커서를 두고(DOM 선택 → ProseMirror), 문서 끝까지 늘려 고른다.
  await editor.evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode()))
      if (node.textContent?.includes("(1)")) break;
    const at = node!.textContent!.indexOf("(1)");
    (root as HTMLElement).focus();
    document.getSelection()!.setBaseAndExtent(node!, at, node!, at);
  });
  await settle(page);
  await page.keyboard.press("Control+Shift+End");
  await page.getByRole("button", { name: "나란히", exact: true }).click();
  await settle(page);
  await shot(page, "sideRaw-wrapped");
  const shape = await editorShape(page);
  expect(shape.cells).toBe(4);
  expect(shape.tracks).toBe(2);
  const draft = JSON.parse(
    (await page.locator("[data-draft]").textContent()) ?? '""',
  ) as string;
  expect(draft).toContain(
    "> <나란히:cols=2>\n> (1) [그림1] \\[2점\\]\n> (2) [그림2] \\[2점\\]\n> (3) [그림3] \\[2점\\]\n> (4) [그림4]",
  );
  // 묶음 위 열 단추 — 4열을 누르면 원문 머리가 바뀐다.
  await page
    .locator('[data-panel="editor"] .visual-condition-cols')
    .getByRole("button", { name: "4열" })
    .click();
  await expect(page.locator("[data-draft]")).toContainText("<나란히:cols=4>");
});
