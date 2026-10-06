import { expect, test } from "@playwright/test";

test("단원 오버레이가 문항 수 표를 늘리지 않고 선택을 유지한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?builder");
  const table = page.getByRole("table");
  const before = await table.boundingBox();
  const opener = page.getByRole("button", { name: "단원 고르기 열기" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "단원 선택" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^초5/ }).click();
  const after = await table.boundingBox();
  expect(after?.height).toBeCloseTo(before!.height, 0);
  expect(after?.width).toBeCloseTo(before!.width, 0);
  await dialog
    .getByRole("checkbox", { name: "2-3 합동과 대칭", exact: true })
    .check();
  await dialog.getByRole("button", { name: "선택 완료" }).click();
  await expect(opener).toBeFocused();
  await expect(
    page.getByRole("spinbutton", { name: "개념 질문 ○× 중" }),
  ).toBeEnabled();
  await page.getByRole("spinbutton", { name: "개념 질문 ○× 중" }).fill("0");
  await opener.click();
  await expect(
    dialog.getByRole("checkbox", { name: "2-3 합동과 대칭", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("spinbutton", { name: "개념 질문 ○× 중" }),
  ).toHaveValue("0");
  await page.screenshot({
    path: "test-results/concept-blank-paper/builder-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const tableRegion = page.getByRole("region", {
    name: "형식별 문항 수 표",
    exact: true,
  });
  expect(
    await tableRegion.evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await opener.click();
  await expect(dialog).toBeVisible();
  const rect = await dialog.boundingBox();
  expect(rect!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/concept-blank-paper/units-mobile.png",
  });
});

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
  // 미리보기는 가로 띠다(`13db4fca1` — 배율 0.46 · A4 794px → 365px). 쪽이 늘어도 배율은 그대로이고 옆으로만 넘긴다.
  expect(widths.every((width) => width > 360 && width < 370)).toBeTruthy();
  const initial = await desk.evaluate((el) => ({
    width: el.clientWidth,
    content: el.scrollWidth,
    height: el.clientHeight,
    tall: el.scrollHeight,
  }));
  expect(initial.content).toBeGreaterThan(initial.width);
  expect(initial.tall).toBeLessThanOrEqual(initial.height + 1);
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

  // 좁은 화면 — 한 쪽이 띠의 폭 안에 다 들어오게 줄고(좌우 16px), 띠 밖으로 화면이 옆으로 밀리지 않는다.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      desk.evaluate(
        (el) =>
          el.querySelector("[data-print-page]")!.getBoundingClientRect()
            .width <=
            el.clientWidth - 32 + 1 &&
          document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
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
