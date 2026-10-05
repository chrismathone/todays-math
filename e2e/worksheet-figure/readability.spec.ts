import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`paper numbers stay readable across templates and light accents at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(
      page
        .locator('[data-page-kind="questions"] [data-problem-header]')
        .first(),
    ).toBeVisible();
    for (const template of [
      "평가원",
      "정통",
      "모던",
      "워크북",
      "자습",
      "유형",
    ]) {
      await page
        .getByRole("button", { name: new RegExp(`^${template}(?:\\s|$)`) })
        .click();
      await expect(
        page
          .locator('[data-page-kind="questions"] [data-problem-header]')
          .first(),
      ).toBeVisible();
      const before = await page.locator('[data-page-kind="questions"]').count();
      for (const accent of ["사이언", "주황", "노랑", "기본 남색"]) {
        await page.getByRole("button", { name: accent, exact: true }).click();
        await expect(
          page.getByRole("button", { name: accent, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        const ratios = await page
          .locator(
            '[data-page-kind="questions"] [data-problem-header] > span:first-child > span',
          )
          .evaluateAll((elements) => {
            const rgb = (color: string) =>
              color
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number);
            const light = (color: string) =>
              rgb(color)
                .map((value) => {
                  const channel = value / 255;
                  return channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4;
                })
                .reduce(
                  (sum, value, index) =>
                    sum + value * [0.2126, 0.7152, 0.0722][index],
                  0,
                );
            return elements.map((element) => {
              let parent: Element | null = element;
              let background = "rgb(255, 255, 255)";
              while (parent) {
                const candidate = getComputedStyle(parent).backgroundColor;
                if (
                  candidate.startsWith("rgb(") ||
                  (candidate.startsWith("rgba(") && candidate.endsWith(", 1)"))
                ) {
                  background = candidate;
                  break;
                }
                parent = parent.parentElement;
              }
              const values = [
                light(getComputedStyle(element).color),
                light(background),
              ].sort((a, b) => b - a);
              return (values[0] + 0.05) / (values[1] + 0.05);
            });
          });
        expect(ratios.length).toBeGreaterThan(0);
        expect(
          Math.min(...ratios),
          `${template} / ${accent}`,
        ).toBeGreaterThanOrEqual(4.5);
        await expect(page.locator('[data-page-kind="questions"]')).toHaveCount(
          before,
        );
      }
    }
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `C:/Users/user/orca/artifacts/impeccable-20261005/paper-${width}.png`,
    });
  });

  test(`English material tabs follow native keyboard focus at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", (route) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method()))
        writes.push(route.request().method());
      return route.abort();
    });
    await page.goto("/english-material.html");
    const add = page.getByRole("button", { name: "자료 추가", exact: true });
    await add.click();
    const dialog = page.getByRole("dialog", { name: "자료 추가" });
    const file = dialog.getByRole("tab", { name: "파일 업로드" });
    const text = dialog.getByRole("tab", { name: "지문 직접 입력" });
    await file.focus();
    await file.press("ArrowRight");
    await expect(text).toBeFocused();
    await expect(
      dialog.getByRole("tabpanel", { name: "지문 직접 입력" }),
    ).toBeVisible();
    await text.press("Tab");
    await expect(
      dialog.getByRole("textbox", { name: "자료 이름" }),
    ).toBeFocused();
    await dialog.getByRole("textbox", { name: "자료 이름" }).press("Shift+Tab");
    await expect(text).toBeFocused();
    await text.press("Home");
    await expect(file).toBeFocused();
    await file.press("End");
    await expect(text).toBeFocused();
    await text.press("ArrowLeft");
    await expect(file).toBeFocused();
    await dialog.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(add).toBeFocused();
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
  });
}
