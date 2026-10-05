import { expect, test, type Page } from "@playwright/test";

async function startDrag(page: Page) {
  await page.goto("/?fixture=no-fe&view=editor");
  const surface = page.getByLabel("도형 편집 캔버스");
  await expect(surface).toHaveAttribute("aria-busy", "false");
  const line = page
    .locator("#figure-editor-canvas line[data-object-id]")
    .first();
  await expect(line).toBeVisible();
  const start = await line.evaluate((node: SVGLineElement) => {
    const point = new DOMPoint(
      (node.x1.baseVal.value + node.x2.baseVal.value) / 2,
      (node.y1.baseVal.value + node.y2.baseVal.value) / 2,
    ).matrixTransform(node.getScreenCTM()!);
    return { x: point.x, y: point.y };
  });
  await surface.evaluate((node) =>
    node.addEventListener(
      "pointerdown",
      (event) => {
        node.setAttribute("data-test-pointer-id", String(event.pointerId));
      },
      { once: true },
    ),
  );
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y);
  await expect(line).toHaveAttribute("transform", /^translate/);
  const pointerId = Number(await surface.getAttribute("data-test-pointer-id"));
  expect(
    await surface.evaluate((node, id) => node.hasPointerCapture(id), pointerId),
  ).toBe(true);
  return { surface, line, start, pointerId };
}

test("native mouse drag keeps capture and ignores a synthetic second pointer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { surface, line, start, pointerId } = await startDrag(page);
  const firstMove = await line.getAttribute("transform");
  const other = {
    pointerId: pointerId + 100,
    pointerType: "pen",
    isPrimary: true,
    button: 0,
    clientX: start.x + 200,
    clientY: start.y,
    bubbles: true,
  };
  await page
    .locator("#figure-editor-canvas line[data-object-id]")
    .nth(1)
    .dispatchEvent("pointerdown", other);
  for (const type of [
    "pointermove",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ])
    await surface.dispatchEvent(type, other);
  await expect(line).toHaveAttribute("transform", firstMove!);
  await expect(page.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
  expect(
    await surface.evaluate((node, id) => node.hasPointerCapture(id), pointerId),
  ).toBe(true);
  await page.mouse.move(start.x + 60, start.y);
  const finalMove = await line.getAttribute("transform");
  expect(finalMove).not.toBe(firstMove);
  await page.mouse.up();
  await expect(line).toHaveAttribute("transform", finalMove!);
  expect(
    await surface.evaluate((node, id) => node.hasPointerCapture(id), pointerId),
  ).toBe(false);
  await page.getByRole("button", { name: /되돌리기/ }).click();
  await expect(line).not.toHaveAttribute("transform");
  await expect(page.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
  expect(errors).toEqual([]);
});

for (const kind of ["cancel", "lostcapture"] as const) {
  test(`native capture ${kind} restores the figure and allows a fresh drag`, async ({
    page,
  }) => {
    const { surface, line, start, pointerId } = await startDrag(page);
    if (kind === "cancel") {
      // Cancellation is synthetic; capture itself is from a native mouse down.
      await surface.dispatchEvent("pointercancel", {
        pointerId,
        pointerType: "mouse",
        bubbles: true,
      });
    } else {
      // Browser emits lostpointercapture when the actual capture is released.
      await surface.evaluate(
        (node, id) => node.releasePointerCapture(id),
        pointerId,
      );
    }
    await page.mouse.move(start.x + 40, start.y);
    await expect(line).not.toHaveAttribute("transform");
    await expect(page.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
    expect(
      await surface.evaluate(
        (node, id) => node.hasPointerCapture(id),
        pointerId,
      ),
    ).toBe(false);
    await page.mouse.up();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 25, start.y);
    await page.mouse.up();
    await expect(line).toHaveAttribute("transform", /^translate/);
    await expect(page.getByRole("button", { name: /되돌리기/ })).toBeEnabled();
  });
}
