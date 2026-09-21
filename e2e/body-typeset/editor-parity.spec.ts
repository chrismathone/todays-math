import { expect, test, type Page } from "@playwright/test";
import { open, panel } from "./paperProbe";

/**
 * «내용 수정» 편집기가 검수 카드와 **같은 모양**으로 서는가 — 원장님 2026-09-21 두 건.
 *
 * ① «2열로 하니까 이렇게 나오는데»: 〈보기〉 의 «ㄱ. [그림]» 한 칸이 편집기에서만 `문단` · `그림` · `빈 문단`
 *    세 칸으로 쪼개져 2열 격자에서 계단처럼 엇갈렸다(`prepareVisualDocument` 가 상자 안 그림을 블록으로 바꿨다).
 * ② «내용 수정할때 표 크기와 실제 렌더링 될때의 표 크기가 너무 다름»: 편집기의 표만 `width:100%` · `table-layout:fixed` 였다.
 *
 * jsdom 은 CSS 를 안 돈다(20번 2026-09-16) — 실제 Chromium 에서 **칸의 자리와 표의 폭**을 잰다.
 */

/** 편집기 〈보기〉 의 칸들(머리 뺀 것) — 자리 · 든 것. */
async function editorBoxCells(page: Page) {
  return panel(page, "editor")
    .locator(".visual-condition-cells")
    .evaluate((cells) => {
      const tracks = getComputedStyle(cells).gridTemplateColumns.split(" ");
      return {
        tracks: tracks.length,
        cells: ([...cells.children] as HTMLElement[]).slice(1).map((cell) => {
          const rect = cell.getBoundingClientRect();
          return {
            text: (cell.textContent ?? "").replace(/\s+/g, ""),
            // 그림 노드 하나 = 가장 바깥 `.visual-figure` 하나(노드 뷰 안쪽에도 같은 이름의 겹이 있다)
            figures: [...cell.querySelectorAll(".visual-figure")].filter(
              (figure) => !figure.parentElement?.closest(".visual-figure"),
            ).length,
            left: Math.round(rect.left),
            top: Math.round(rect.top),
          };
        }),
      };
    });
}

test.describe("〈보기〉 그림 칸 — 편집기에서도 «ㄱ. [그림]» 이 한 칸", () => {
  test("문제 22: 2열 · 네 칸 · 칸마다 라벨과 그림 · ㄱㄴ 이 한 행, ㄷㄹ 이 아래 행", async ({
    page,
  }) => {
    await open(page, "q22");
    const box = await editorBoxCells(page);
    expect(box.tracks, "원본 그림 자리로 2열").toBe(2);
    expect(
      box.cells.map((cell) => cell.text),
      "빈 칸·그림만 든 칸이 없다",
    ).toEqual(["ㄱ.", "ㄴ.", "ㄷ.", "ㄹ."]);
    expect(box.cells.map((cell) => cell.figures)).toEqual([1, 1, 1, 1]);
    const [a, b, c, d] = box.cells;
    expect(a!.top, "ㄱ·ㄴ 한 행").toBe(b!.top);
    expect(c!.top, "ㄷ·ㄹ 한 행").toBe(d!.top);
    expect(c!.top).toBeGreaterThan(a!.top);
    expect(a!.left).toBe(c!.left);
    expect(b!.left).toBe(d!.left);
    expect(b!.left).toBeGreaterThan(a!.left);
    // 검수 카드도 같은 네 칸이다 — 편집기만 다르던 것이 결함이었다.
    const cardCells = await panel(page, "card")
      .locator("[data-condition-box] .grid > *")
      .count();
    expect(cardCells).toBe(4);
  });
});

/** 표의 폭과 그 표가 선 자리의 폭. */
async function tableWidths(page: Page, name: "editor" | "card") {
  return panel(page, name)
    .locator("table")
    .first()
    .evaluate((table) => {
      const style = getComputedStyle(table);
      const cell = getComputedStyle(table.querySelector("td")!);
      return {
        table: Math.round(table.getBoundingClientRect().width),
        height: Math.round(table.getBoundingClientRect().height),
        room: Math.round(
          (
            table.closest(".tableWrapper") ?? table
          ).parentElement!.getBoundingClientRect().width,
        ),
        layout: style.tableLayout,
        fontSize: style.fontSize,
        verticalAlign: cell.verticalAlign,
      };
    });
}

test.describe("표 — 편집기의 폭이 검수 카드와 같다", () => {
  test("양초 표(7칸): 편집기가 자리를 가득 채우지 않고, 카드와 같은 폭·같은 글자 크기로 선다", async ({
    page,
  }) => {
    await open(page, "candleTable");
    const editor = await tableWidths(page, "editor");
    const card = await tableWidths(page, "card");
    // 전제 — 카드의 표는 내용만큼이다(자리보다 한참 좁다). 이게 거짓이면 아래 비교가 헛돈다.
    expect(card.table, "카드 표는 자리보다 좁다").toBeLessThan(card.room * 0.7);
    expect(editor.layout).toBe(card.layout);
    expect(editor.fontSize).toBe(card.fontSize);
    expect(editor.verticalAlign).toBe(card.verticalAlign);
    expect(
      Math.abs(editor.table - card.table),
      `편집기 ${editor.table}px · 카드 ${card.table}px`,
    ).toBeLessThanOrEqual(Math.round(card.table * 0.15));
    // 행 높이도 — 편집기의 칸은 문단을 품어서 위아래 여백만큼 행이 높았다.
    expect(
      Math.abs(editor.height - card.height),
      `편집기 ${editor.height}px · 카드 ${card.height}px`,
    ).toBeLessThanOrEqual(Math.round(card.height * 0.15));
  });
});
