import { expect, test } from "@playwright/test";

test("progress stays one row and anchored details escape canvas clipping", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?progress-fixture");
  const bar = page.locator("[data-studio-progress] > button");
  const panel = page.getByRole("region", { name: "작업별 진행 상황" });
  for (const width of [1440, 768, 390, 336]) {
    await page.setViewportSize({ width, height: 900 });
    await page.mouse.move(width - 1, 880);
    const initial = await page.locator("[data-canvas]").boundingBox();
    await page.getByRole("button", { name: "긴 경고 전환" }).click();
    await expect(bar).toContainText("확인 필요");
    expect((await bar.boundingBox())!.height).toBe(44);
    expect((await page.locator("[data-canvas]").boundingBox())!.y).toBe(
      initial!.y,
    );
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await bar.hover();
    await expect(panel).toBeVisible();
    await expect(
      panel.getByText("SVG 도형 생성 중", { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText("문제 인식 중", { exact: true }),
    ).toBeVisible();
    const barBox = (await bar.boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    expect(panelBox.x).toBeCloseTo(barBox.x, 0);
    await expect
      .poll(async () => (await panel.boundingBox())!.y)
      .toBeCloseTo(barBox.y + barBox.height, 0);
    await panel.locator("summary").click();
    const pageButton = panel.getByRole("button", { name: "4쪽 인식 중" });
    await pageButton.click();
    await expect(page.getByLabel("진행 동작 결과")).toHaveText("4쪽 이동");
    await panel.getByRole("button", { name: "도형 생성 취소" }).click();
    await expect(page.getByLabel("진행 동작 결과")).toHaveText("도형 취소");
    await page.screenshot({
      path: testInfo.outputPath(`progress-${width}.png`),
    });
    // 상세 창 안(취소 단추 위)에 마우스를 둔 채 Esc — 창이 DOM 에서 빠져 크롬이 띠의 pointerleave 를
    // 안 보낸다. 다음 폭에서 bar.hover() 로 상세가 다시 열려야 한다(main 부터 여기서 빨갰다, 2026-09-19).
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(bar).toBeFocused();
    await page.getByRole("button", { name: "긴 경고 전환" }).click();
  }
  expect(errors).toEqual([]);
});

test("progress details support click pinning, outside dismissal and keyboard focus", async ({
  page,
}) => {
  await page.goto("/?progress-fixture");
  const bar = page.locator("[data-studio-progress] > button");
  const panel = page.getByRole("region", { name: "작업별 진행 상황" });
  await bar.click();
  await page.mouse.move(1200, 800);
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "외부 버튼" }).click();
  await expect(panel).not.toBeVisible();
  await bar.focus();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    panel.getByRole("button", { name: "AI 작업 취소" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("진행 동작 결과")).toHaveText("페이지 취소");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await bar.press("Enter");
  await expect(panel).toBeVisible();
  await bar.press("Enter");
  await expect(panel).not.toBeVisible();
});
