import { test, expect } from "@playwright/test";
import { classes } from "./workbenchFixtures";

for (const width of [320, 390, 1440]) {
  test(`complete filters and explicit global theme apply at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    let puts = 0;
    let theme = "classic";
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      if (
        new URL(route.request().url()).pathname !== "/api/admin/journey-theme"
      ) {
        errors.push(`Unexpected API: ${route.request().url()}`);
        return route.fulfill({ status: 404, json: {} });
      }
      if (route.request().method() === "PUT") {
        puts++;
        theme = route.request().postDataJSON().theme;
      }
      return route.fulfill({ json: { data: { theme, updatedAt: null } } });
    });
    await page.goto("/e2e/admin-accounts/index.html?view=workbench");
    const classes = page.getByRole("region", {
      name: "수업 관리 필터",
      exact: true,
    });
    await classes
      .getByRole("combobox", { name: "학년", exact: true })
      .selectOption("초5");
    await expect(
      classes.getByRole("button", { name: "초등M 초5 JJ1A", exact: true }),
    ).toBeVisible();
    await expect(
      classes.getByRole("button", { name: "중등M 중2 JJPS", exact: true }),
    ).toHaveCount(0);
    await expect(classes.getByRole("status")).toContainText(
      "선택은 유지됩니다",
    );
    await classes
      .getByRole("combobox", { name: "학년", exact: true })
      .selectOption("");
    await classes
      .getByRole("textbox", { name: "반 검색", exact: true })
      .fill("김예시");
    await expect(classes.getByText("1 / 2개", { exact: false })).toBeVisible();
    await classes
      .getByRole("textbox", { name: "반 검색", exact: true })
      .fill("");
    await expect(
      classes.getByRole("button", { name: "중등M 중2 JJPS", exact: true }),
    ).toHaveAttribute("aria-current", "true");

    const themes = page.getByRole("region", {
      name: "진도판 테마",
      exact: true,
    });
    const sea = themes.getByRole("radio", {
      name: "바다 항해 돛단배",
      exact: true,
    });
    await expect(
      themes.getByRole("radio", { name: "기본 판 지금 판", exact: true }),
    ).toBeChecked();
    await sea.click();
    expect(puts).toBe(0);
    await sea.press("ArrowRight");
    expect(puts).toBe(0);
    await expect(sea).toBeChecked();
    await themes
      .getByRole("button", { name: "전체 학생에게 적용", exact: true })
      .click();
    await expect(themes.getByRole("status")).toContainText("저장했습니다");
    expect(puts).toBe(1);
    expect(theme).toBe("sea");

    const units = page.getByRole("region", { name: "전체 차시", exact: true });
    await units
      .getByRole("combobox", { name: "학년", exact: true })
      .selectOption("중1");
    await units
      .getByRole("textbox", { name: "차시 검색", exact: true })
      .fill("소인수분해");
    await expect(
      units.getByRole("button", { name: "소인수분해", exact: true }),
    ).toBeVisible();
    await expect(units.getByText(/\/ 735차시/)).toBeVisible();
    await units
      .getByRole("button", { name: "소인수분해", exact: true })
      .click();
    await units
      .getByRole("textbox", { name: "차시 검색", exact: true })
      .fill("찾을 수 없는 차시");
    await expect(
      units.getByText("검색 조건에 맞는 차시가 없습니다.", { exact: true }),
    ).toBeVisible();
    await expect(
      units.getByText(
        "선택한 차시가 현재 필터에 없습니다. 선택은 유지됩니다.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`workbench-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 1440]) {
  test(`teaching-only dashboard paints before progress and isolates reads at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const forbidden: string[] = [];
    const errors: string[] = [];
    const progressReads = new Map<string, number>();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/classes")
        return route.fulfill({
          json: { data: classes, meta: { page: 1, pageSize: 100, total: 2 } },
        });
      if (url.pathname === "/api/units")
        return route.fulfill({
          json: {
            data: [
              {
                id: "40000000-0000-4000-8000-000000000001",
                grade: "중2",
                chapter: "1. 유리수와 순환소수",
                section: "유리수와 순환소수",
                orderIndex: 1,
              },
            ],
          },
        });
      if (url.pathname === "/api/progress") {
        const id = url.searchParams.get("classId")!;
        const count = (progressReads.get(id) ?? 0) + 1;
        progressReads.set(id, count);
        if (count === 1) await barrier;
        return route.fulfill({
          status: id === classes[0].id && count === 1 ? 503 : 204,
          body: "",
        });
      }
      if (url.pathname === "/api/progress/suggest")
        return route.fulfill({ status: 404, json: {} });
      forbidden.push(url.pathname);
      return route.fulfill({ status: 403, json: {} });
    });
    await page.goto("/e2e/admin-accounts/index.html?view=dashboard");
    try {
      await expect(
        page.getByRole("button", { name: /중등M 중2 JJPS/ }),
      ).toBeVisible();
      await expect(page.getByText("진도를 불러오는 중…").first()).toBeVisible();
      expect(forbidden).toEqual([]);
    } finally {
      release();
    }
    await expect(
      page.getByRole("button", { name: "진도 다시 조회", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /초등M 초5 JJ1A/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "진도 다시 조회", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "진도 다시 조회", exact: true }),
    ).toHaveCount(0);
    expect(progressReads.get(classes[0].id)).toBe(2);
    expect(progressReads.get(classes[1].id)).toBe(1);
    expect(forbidden).toEqual([]);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-teaching-${width}.png`),
      fullPage: true,
    });
  });
}
