import { expect, test } from "@playwright/test";

test("preview notices can close without moving the preview", async ({
  page,
}) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
  await page.goto("/?oversize");
  await expect(
    page.getByRole("button", { name: "PDF 내려받기" }),
  ).toBeEnabled();
  await expect(
    page.getByText(
      "한 쪽보다 긴 문제는 내용이 잘리지 않도록 해당 문제만 축소했습니다.",
    ),
  ).toBeVisible();
  const preview = page.locator("#worksheet-preview");
  const before = await preview.boundingBox();
  await page
    .getByRole("button", { name: "미리보기 안내 닫기", exact: true })
    .click({ timeout: 5000 });
  await expect(
    page.getByText(
      "한 쪽보다 긴 문제는 내용이 잘리지 않도록 해당 문제만 축소했습니다.",
    ),
  ).toHaveCount(0);
  expect(await preview.boundingBox()).toEqual(before);
});
