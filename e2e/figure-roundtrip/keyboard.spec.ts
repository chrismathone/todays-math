import { expect, test } from "@playwright/test";

// Real browser keyboard input; the existing isolated editor harness has no DB/API writes.
for (const group of ["선", "도형"] as const) {
  for (const backwards of [false, true]) {
    test(`${group} submenu ${backwards ? "Shift+Tab" : "Tab"} resumes toolbar focus order`, async ({
      page,
    }) => {
      await page.goto("/?fixture=no-fe&view=editor");
      const toolbar = page.getByRole("toolbar", { name: "도형 편집 도구" });
      const opener = toolbar.getByRole("button", {
        name: `${group} 도구 고르기`,
      });
      await opener.focus();
      await page.keyboard.press("ArrowUp");
      const menu = page.getByRole("menu", {
        name: `${group} 도구`,
        exact: true,
      });
      await expect(menu).toBeVisible();
      await expect(
        menu.getByRole("menuitemradio", {
          name: group === "선" ? "곡선" : "다각형",
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
      await expect(menu).toHaveCount(0);
      await expect(opener).toHaveAttribute("aria-expanded", "false");
      const expected = backwards
        ? group === "선"
          ? "선분"
          : "원"
        : group === "선"
          ? "원"
          : "글자";
      await expect(
        toolbar.getByRole("button", { name: expected, exact: true }),
      ).toBeFocused();
      await expect(
        toolbar.getByRole("button", { name: "선택·이동" }),
      ).toHaveAttribute("aria-pressed", "true");
    });
  }
}

test("submenu arrows wrap internally, Escape returns, Enter selects and Tab follows the changed face", async ({
  page,
}) => {
  await page.goto("/?fixture=no-fe&view=editor");
  const toolbar = page.getByRole("toolbar", { name: "도형 편집 도구" });
  const opener = toolbar.getByRole("button", { name: "선 도구 고르기" });
  await opener.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitemradio", { name: "선분", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("menuitemradio", { name: "곡선", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitemradio", { name: "선분", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const arrow = toolbar.getByRole("button", { name: "화살표", exact: true });
  await expect(arrow).toBeFocused();
  await expect(arrow).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await expect(opener).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Shift+Tab");
  await expect(arrow).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
});
