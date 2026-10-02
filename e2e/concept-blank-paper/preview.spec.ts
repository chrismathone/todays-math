import { expect, test } from "@playwright/test";

test("페이지 수와 무관한 축소, 내부 스크롤과 확대 페이지 이동", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?preview&view=student");
  const desk = page.getByRole("region", { name: "지면 미리보기", exact: true });
  const pages = desk.locator("[data-print-page]");
  await expect(pages.first()).toBeVisible();
  const count = await pages.count();
  expect(count).toBeGreaterThan(2);
  const widths = await pages.evaluateAll((nodes) =>
    nodes.map((el) => el.getBoundingClientRect().width),
  );
  expect(widths.every((width) => width > 450 && width < 465)).toBeTruthy();
  const initial = await desk.evaluate((el) => ({
    height: el.clientHeight,
    content: el.scrollHeight,
  }));
  expect(initial.height).toBeLessThanOrEqual(612);
  expect(initial.content).toBeGreaterThan(initial.height);
  await expect(desk.locator("..").locator('[data-visible="true"]')).toHaveCount(
    1,
  );

  const opener = page.getByRole("button", { name: "2쪽 확대", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "지면 확대 보기" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(`2 / ${count}쪽`, { exact: true }),
  ).toBeVisible();
  const enlarged = dialog.getByRole("region", { name: "확대한 지면" });
  const bigWidth = await enlarged
    .locator("[data-print-page]")
    .first()
    .evaluate((el) => el.getBoundingClientRect().width);
  expect(bigWidth).toBeGreaterThan(780);
  await dialog.getByRole("button", { name: "다음 페이지" }).click();
  await expect(
    dialog.getByText(`3 / ${count}쪽`, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    dialog.getByText(`2 / ${count}쪽`, { exact: true }),
  ).toBeVisible();
  await enlarged.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    dialog.getByText(`${count} / ${count}쪽`, { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "다음 페이지" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.screenshot({
    path: "test-results/concept-blank-paper/preview-desktop.png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      desk.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    )
    .toBe(true);
  await opener.click();
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () =>
      enlarged.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    )
    .toBe(true);
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(opener).toBeFocused();
});
