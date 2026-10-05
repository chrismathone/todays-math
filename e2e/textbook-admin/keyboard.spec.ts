import { expect, test } from "@playwright/test";
import { HARNESS, installTextbookApi } from "./fixtures";

for (const width of [320, 390, 1440]) {
  test(`textbook editing retains responsive pane and keyboard behavior at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await installTextbookApi(page, "http://127.0.0.1:4335");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(HARNESS);
    await page.getByRole("button", { name: "열기", exact: true }).click();
    await page.getByRole("button", { name: "세부 편집", exact: true }).click();
    const tabs = page.getByRole("tablist", { name: "편집 칸" });
    if (width < 800) {
      const manuscript = tabs.getByRole("tab", { name: "원고" });
      const preview = tabs.getByRole("tab", { name: "미리보기" });
      await manuscript.focus();
      await manuscript.press("ArrowRight");
      await expect(preview).toBeFocused();
      await expect(
        page.getByRole("tabpanel", { name: "미리보기" }),
      ).toBeVisible();
      await expect(
        page.getByRole("tabpanel", { name: "원고" }),
      ).not.toBeVisible();
      await preview.press("Tab");
      await expect(manuscript).not.toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(preview).toBeFocused();
      await preview.press("Home");
      await expect(manuscript).toBeFocused();
      await expect(page.getByRole("tabpanel", { name: "원고" })).toBeVisible();
      await manuscript.press("End");
      await expect(preview).toBeFocused();
      await preview.press("ArrowLeft");
      await expect(manuscript).toBeFocused();
      await expect(manuscript).toHaveAttribute("tabindex", "0");
      await expect(preview).toHaveAttribute("tabindex", "-1");
    } else {
      await expect(tabs).not.toBeVisible();
      await expect(
        page.getByRole("region", { name: "미리보기", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "본문", exact: true }),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `C:/Users/user/orca/artifacts/impeccable-20261005/textbook-tabs-${width}.png`,
    });
  });
}
