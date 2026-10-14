import { test, expect } from "@playwright/test";
import { pendingAccount } from "../../src/__tests__/components/adminFixtures";

for (const width of [320, 390, 1440]) {
  test(`audit tabs ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    const unexpected: string[] = [];
    const auditQueries: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    // No provider, authentication service or database is contacted.
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        url.origin !== "http://127.0.0.1:4318" ||
        route.request().method() !== "GET"
      ) {
        unexpected.push(url.href);
        return route.abort();
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      const respond = (data: unknown) => route.fulfill({ json: data });
      if (url.pathname === `/api/admin/users/${pendingAccount.id}`)
        return respond({ data: pendingAccount });
      if (url.pathname === "/api/admin/branches") return respond({ data: [] });
      if (url.pathname.endsWith("/documents"))
        return respond({ data: [], meta: { page: 1, pageSize: 20, total: 0 } });
      if (url.pathname.endsWith("/audit")) {
        auditQueries.push(url.search);
        const category = url.searchParams.get("category");
        const pageNumber = Number(url.searchParams.get("page"));
        const access = category === "admin-access";
        const data = Array.from({ length: access ? 32 : 31 }, (_, index) => ({
          id: `${category}-${index}`,
          action: access
            ? "admin.private_material_view"
            : "account.settings_changed",
          outcome: access ? "requested" : "success",
          actorName: access ? "최고관리자" : "담당 관리자",
          createdAt: pendingAccount.updatedAt,
          details: access
            ? { path: `/api/admin/users/${pendingAccount.id}/documents` }
            : {
                previousBranchId: null,
                branchId: "historical-branch-uuid",
                previousMenus: ["library", "english"],
                menus: ["library", "conceptBlank"],
              },
        }));
        return respond({
          data: data.slice((pageNumber - 1) * 30, pageNumber * 30),
          meta: { page: pageNumber, pageSize: 30, total: data.length },
        });
      }
      unexpected.push(url.href);
      return route.abort();
    });
    await page.goto("/e2e/admin-accounts/index.html?view=detail");
    await page.getByRole("button", { name: "활동 기록", exact: true }).click();
    const activity = page.getByRole("tab", { name: "활동", exact: true });
    const access = page.getByRole("tab", { name: "관리자 접근", exact: true });
    const panel = page
      .getByRole("region", { name: "계정 활동 기록", exact: true })
      .getByRole("tabpanel");
    await expect(activity).toHaveAttribute("aria-selected", "true");
    await expect(panel.getByText("계정 설정 변경").first()).toBeVisible();
    await expect(
      panel.getByText("오늘 영어 전체", { exact: false }).first(),
    ).toBeVisible();
    await expect(panel.getByText("총 31개")).toBeVisible();
    await expect(panel.locator("details[open]")).toHaveCount(0);
    await activity.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`activity-${width}.png`),
    });
    await panel.getByRole("button", { name: "다음", exact: true }).click();
    await expect(panel.getByText("2 / 2")).toBeVisible();
    await access.click();
    await expect(panel).toHaveAccessibleName("관리자 접근");
    await expect(
      panel.getByText("관리자 계정 자료 목록 조회 요청").first(),
    ).toBeVisible();
    await expect(panel.getByText("계정 설정 변경")).toHaveCount(0);
    await expect(panel.getByText("1 / 2")).toBeVisible();
    await expect(panel.getByText("총 32개")).toBeVisible();
    await access.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`admin-access-${width}.png`),
    });
    await access.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(activity).toBeFocused();
    await expect(activity).toHaveAttribute("aria-selected", "true");
    await expect(panel.getByText("1 / 2")).toBeVisible();
    await page.keyboard.press("End");
    await expect(access).toBeFocused();
    await expect(access).toHaveAttribute("aria-selected", "true");
    await expect(
      panel.getByText("관리자 계정 자료 목록 조회 요청").first(),
    ).toBeVisible();
    expect(auditQueries.slice(0, 5)).toEqual([
      "?page=1&pageSize=30&category=activity",
      "?page=2&pageSize=30&category=activity",
      "?page=1&pageSize=30&category=admin-access",
      "?page=1&pageSize=30&category=activity",
      "?page=1&pageSize=30&category=admin-access",
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
