import { expect, test, type Page } from "@playwright/test";

async function canvasPoint(page: Page, x: number, y: number) {
  return page.evaluate(
    (point) => {
      const svg = document.querySelector<SVGSVGElement>(
        "#figure-editor-canvas > svg",
      )!;
      const at = new DOMPoint(point.x, point.y).matrixTransform(
        (svg as SVGSVGElement).getScreenCTM()!,
      );
      return { x: at.x, y: at.y };
    },
    { x, y },
  );
}
async function linePoints(page: Page) {
  return page.evaluate(() => {
    const line = document.querySelector<SVGLineElement>(
        "#figure-editor-canvas line",
      )!,
      matrix = line.getScreenCTM()!;
    const a = new DOMPoint(
      line.x1.baseVal.value,
      line.y1.baseVal.value,
    ).matrixTransform(matrix);
    const b = new DOMPoint(
      line.x2.baseVal.value,
      line.y2.baseVal.value,
    ).matrixTransform(matrix);
    return { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } };
  });
}
async function expectSnapped(
  page: Page,
  direction: "horizontal" | "vertical" | "diagonal",
) {
  await expect
    .poll(async () => {
      const { a, b } = await linePoints(page),
        dx = Math.abs(a.x - b.x),
        dy = Math.abs(a.y - b.y);
      return direction === "horizontal"
        ? dy
        : direction === "vertical"
          ? dx
          : Math.abs(dx - dy);
    })
    .toBeLessThan(0.1);
}

for (const tool of ["선분", "화살표"]) {
  test(`${tool}: live Shift snapping in all eight directions, release, and one-step undo`, async ({
    page,
  }) => {
    await page.goto("/?figure");
    await page.getByRole("button", { name: tool, exact: true }).click();
    const start = await canvasPoint(page, 240, 180);
    await page.mouse.move(start.x, start.y);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    for (const [dx, dy, direction] of [
      [100, 20, "horizontal"],
      [20, 100, "vertical"],
      [100, 80, "diagonal"],
      [-100, 20, "horizontal"],
      [20, -100, "vertical"],
      [-100, 80, "diagonal"],
      [-100, -80, "diagonal"],
      [100, -80, "diagonal"],
    ] as const) {
      const pointer = await canvasPoint(page, 240 + dx, 180 + dy);
      await page.mouse.move(pointer.x, pointer.y);
      await expectSnapped(page, direction);
      await page.keyboard.up("Shift");
      await expect
        .poll(
          async () =>
            Math.abs((await linePoints(page)).b.x - pointer.x) +
            Math.abs((await linePoints(page)).b.y - pointer.y),
        )
        .toBeLessThan(0.1);
      await page.keyboard.down("Shift");
      await expectSnapped(page, direction);
    }
    await page.mouse.up();
    await page.keyboard.up("Shift");
    await expectSnapped(page, "diagonal");
    if (tool === "화살표")
      await expect(page.locator("#figure-editor-canvas line")).toHaveAttribute(
        "marker-end",
        /url\(#/,
      );
    await page.getByRole("button", { name: /되돌리기/ }).click();
    await expect(page.locator("#figure-editor-canvas line")).toHaveCount(0);
    await page.getByRole("button", { name: /다시 실행/ }).click();
    await expectSnapped(page, "diagonal");
  });
}

for (const endpoint of ["start", "end"] as const) {
  for (const transformed of [false, true]) {
    test(`${endpoint} endpoint${transformed ? " after rotation" : ""}: Shift toggles without pointer motion`, async ({
      page,
    }) => {
      await page.goto(`/?figure&endpoint${transformed ? "&transformed" : ""}`);
      await page.locator('[data-figure-list-number="1"]').click();
      const before = await linePoints(page);
      const fixed = endpoint === "start" ? before.b : before.a;
      const handle = page.locator(`[data-figure-handle="${endpoint}"]`);
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      for (const [dx, dy, direction] of [
        [100, 17, "horizontal"],
        [15, -100, "vertical"],
        [-100, -80, "diagonal"],
      ] as const) {
        const pointer = { x: fixed.x + dx, y: fixed.y + dy };
        await page.mouse.move(pointer.x, pointer.y);
        await page.keyboard.down("Shift");
        await expectSnapped(page, direction);
        await page.keyboard.up("Shift");
        const points = await linePoints(page),
          moving = endpoint === "start" ? points.a : points.b,
          anchor = endpoint === "start" ? points.b : points.a;
        expect(
          Math.abs(moving.x - pointer.x) + Math.abs(moving.y - pointer.y),
        ).toBeLessThan(0.1);
        expect(anchor.x).toBeCloseTo(fixed.x, 1);
        expect(anchor.y).toBeCloseTo(fixed.y, 1);
      }
      await page.mouse.up();
      await page.getByRole("button", { name: /되돌리기/ }).click();
      expect(await linePoints(page)).toEqual(before);
    });
  }
}

for (const mobile of [false, true]) {
  test(`aligned Mathgen option controls ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const colors = page.getByRole("group", { name: "강조 색상" });
    const widths = await colors
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().width),
      );
    expect(widths).toHaveLength(9);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    await colors.getByRole("button", { name: "보라", exact: true }).click();
    await expect(
      colors.getByRole("button", { name: "보라", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const layout = page.getByRole("group", { name: "세로 배치" });
    await layout
      .getByRole("button", { name: "여백 지정", exact: true })
      .click();
    const presets = layout
      .getByRole("button")
      .filter({ hasText: /^(최소|좁게|보통|넓게|최대)$/ });
    const rects = await presets.evaluateAll((buttons) =>
      buttons.map((button) => ({
        width: button.getBoundingClientRect().width,
        top: button.getBoundingClientRect().top,
      })),
    );
    expect(rects).toHaveLength(5);
    expect(
      Math.max(...rects.map((r) => r.width)) -
        Math.min(...rects.map((r) => r.width)),
    ).toBeLessThan(1);
    expect(new Set(rects.map((r) => r.top)).size).toBe(1);
    await expect(
      page.getByRole("spinbutton", { name: "문항 간 여백 (px)" }),
    ).toHaveCount(0);
    await layout.getByRole("button", { name: "넓게", exact: true }).click();
    await expect(
      layout.getByRole("button", { name: "넓게", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await layout.screenshot({
      path: test.info().outputPath("spacing-controls.png"),
    });
    await colors.screenshot({
      path: test.info().outputPath("color-controls.png"),
    });
  });

  test(`horizontal preview ${mobile ? "mobile" : "desktop"}: controls, scrolling, zoom, repagination and print`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "인쇄 / PDF 저장", exact: true }),
    ).toBeEnabled();
    const viewport = page.getByRole("region", { name: "시험지 미리보기" });
    await viewport.scrollIntoViewIfNeeded();
    const papers = page.locator("[data-unified-paper]"),
      total = await papers.count();
    expect(total).toBeGreaterThan(4);
    const first = (await papers.nth(0).boundingBox())!,
      second = (await papers.nth(1).boundingBox())!;
    expect(second.y).toBeCloseTo(first.y, 0);
    expect(second.x).toBeGreaterThan(first.x + first.width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const navigation = page.getByRole("navigation", {
      name: "미리보기 페이지 이동",
    });
    await expect(navigation.getByRole("status")).toHaveText(`1 / ${total}쪽`);
    await expect(
      page.getByRole("button", { name: "이전 페이지", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "다음 페이지", exact: true })
      .click();
    await expect(navigation.getByRole("status")).toHaveText(`2 / ${total}쪽`);
    await viewport.focus();
    await page.keyboard.press("End");
    await expect(navigation.getByRole("status")).toHaveText(
      `${total} / ${total}쪽`,
    );
    await expect(
      page.getByRole("button", { name: "다음 페이지", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("combobox", { name: "미리보기 확대" })
      .selectOption("1.25");
    await expect(navigation.getByRole("status")).toHaveText(
      `${total} / ${total}쪽`,
    );
    await expect
      .poll(async () =>
        Math.abs(
          (await papers.last().boundingBox())!.x -
            (await viewport.boundingBox())!.x,
        ),
      )
      .toBeLessThan(2);
    await viewport.focus();
    await page.keyboard.press("Home");
    await page
      .getByRole("combobox", { name: "미리보기 확대" })
      .selectOption("fit");
    // Browser wheel scrolling exercises the native horizontal track and live count.
    await viewport.hover();
    await page.mouse.wheel(second.x - first.x, 0);
    await expect(navigation.getByRole("status")).toHaveText(`2 / ${total}쪽`);
    const kinds = await papers.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-page-kind")),
    );
    await page.emulateMedia({ media: "print" });
    await expect(navigation).toBeHidden();
    const printed = await papers.evaluateAll((nodes) =>
      nodes.map((node) => ({
        x: node.getBoundingClientRect().x,
        y: node.getBoundingClientRect().y,
        width: node.getBoundingClientRect().width,
        zoom: getComputedStyle(node).zoom,
        breakAfter: getComputedStyle(node).breakAfter,
      })),
    );
    expect(printed[1].x).toBeCloseTo(printed[0].x, 1);
    expect(printed[1].y).toBeGreaterThan(printed[0].y);
    expect(
      printed.every(
        (sheet) => Math.abs(sheet.width - 793.7) < 1 && sheet.zoom === "1",
      ),
    ).toBe(true);
    expect(
      printed.slice(0, -1).every((sheet) => sheet.breakAfter === "page"),
    ).toBe(true);
    expect(
      await papers.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-page-kind")),
      ),
    ).toEqual(kinds);
    await page.emulateMedia({ media: "screen" });
    await viewport.focus();
    await page.keyboard.press("End");
    await page
      .getByRole("button", { name: "문제 수 줄이기", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "인쇄 / PDF 저장", exact: true }),
    ).toBeEnabled();
    await expect.poll(() => papers.count()).toBe(2);
    await expect(navigation.getByRole("status")).toHaveText("2 / 2쪽");
    await page
      .getByRole("button", { name: "이전 페이지", exact: true })
      .click();
    await expect(navigation.getByRole("status")).toHaveText("1 / 2쪽");
    await page
      .getByRole("navigation", { name: "제작 단계 이동" })
      .getByRole("button", { name: /^OCR · 디지털화/ })
      .click();
    await expect(page.getByText("검토 단계로 돌아왔습니다.")).toBeVisible();
  });
}
