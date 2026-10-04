import { test, expect } from "@playwright/test";

const id = (n: number) =>
  `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const branchId = id(10),
  classId = id(1),
  studentId = id(2);
const date = "2026-10-04T10:00:00.000Z";
for (const width of [320, 1440]) {
  test(`branch student management and retained issuance results at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const html = await (
      await page.request.get("/e2e/admin-accounts/index.html")
    ).text();
    await page.route(
      (url) => url.pathname.startsWith("/admin/branches/"),
      (route) => route.fulfill({ contentType: "text/html", body: html }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let disabled = false,
      issued = false,
      directoryReads = 0,
      accountWrites = 0,
      bulkWrites = 0;
    const queries: URL[] = [];
    const account = () => ({
      studentId,
      loginId: "김학생",
      issuedAt: date,
      issuedByViewer: false,
      lastLoginAt: null,
      passwordChangedAt: null,
      disabledAt: disabled ? date : null,
      mustChangePassword: true,
      locked: false,
      lockedUntil: null,
    });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const respond = (body: unknown) => route.fulfill({ json: body });
      if (url.pathname === `/api/admin/branches/${branchId}`)
        return respond({
          data: {
            id: branchId,
            name: "테스트 지점",
            createdAt: date,
            menuRevision: 1,
            menus: ["teaching", "srs"],
            pendingCount: 0,
            _count: { users: 1 },
            users: [],
          },
        });
      if (url.pathname === `/api/admin/branches/${branchId}/learning`) {
        queries.push(url);
        directoryReads++;
        const kind = url.searchParams.get("kind");
        const filters = { classes: [{ id: classId, name: "수학반" }] };
        const meta = { page: 1, pageSize: 20, total: 1 };
        if (kind === "classes")
          return respond({
            kind,
            filters,
            meta,
            data: [
              {
                id: classId,
                name: "수학반",
                grade: "중2",
                active: true,
                sourceManaged: true,
                teachers: ["담임 선생님"],
                enrolledCount: 2,
                issuanceSummary: {
                  total: 2,
                  issued: issued ? 2 : 1,
                  unissued: issued ? 0 : 1,
                },
              },
            ],
          });
        return respond({
          kind,
          filters,
          meta,
          data: [
            {
              id: studentId,
              name: "김학생",
              grade: "중2",
              classId,
              useIndividualProgress: false,
              sourceManaged: true,
              withdrawn: false,
              createdAt: date,
              updatedAt: date,
              login: disabled ? "disabled" : "enabled",
              account: {
                loginId: "김학생",
                status: disabled ? "disabled" : "enabled",
                issuedAt: date,
                lastLoginAt: null,
              },
              classes: [
                { id: classId, name: "수학반", membership: "enrolled" },
                { id: id(3), name: "보충반", membership: "enrolled" },
              ],
            },
          ],
        });
      }
      if (url.pathname === `/api/students/${studentId}/account`) {
        if (route.request().method() === "PATCH") {
          accountWrites++;
          disabled = true;
          return respond({ data: account() });
        }
        return respond({ data: { withdrawn: false, account: account() } });
      }
      if (url.pathname === `/api/classes/${classId}/student-accounts`) {
        const post = route.request().method() === "POST";
        if (post) {
          bulkWrites++;
          issued = true;
        }
        return respond({
          data: {
            classId,
            className: "수학반",
            total: 2,
            issued: post ? 1 : 0,
            existing: 1,
            ready: post ? 0 : 1,
            skipped: 0,
            students: [
              {
                studentId,
                name: "김학생",
                loginId: "김학생",
                status: "existing",
              },
              {
                studentId: id(4),
                name: "이학생",
                loginId: "이학생",
                status: post ? "issued" : "ready",
              },
            ],
          },
        });
      }
      return route.fulfill({
        status: 404,
        json: { error: { message: "테스트에서 허용하지 않은 요청" } },
      });
    });
    await page.goto(`/admin/branches/${branchId}?tab=students`);
    await expect(
      page.getByRole("button", { name: "학생 계정", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("row", { name: /김학생/ })).toHaveCount(1);
    await page.getByRole("button", { name: "김학생 학생 계정 관리" }).click();
    const review = page.getByRole("complementary", {
      name: "김학생 학생 관리",
    });
    await expect(
      review.getByRole("heading", { name: "학생 로그인 계정" }),
    ).toBeVisible();
    await expect(
      review.getByRole("link", { name: "학생 학습 설정·진도 확인" }),
    ).toHaveAttribute(
      "href",
      `/admin/math-srs?branchId=${branchId}&classId=${classId}&studentId=${studentId}`,
    );
    const reads = directoryReads;
    await review.getByRole("button", { name: "계정 끄기" }).click();
    await expect(review.getByText("계정 꺼짐 — 로그인 막힘")).toBeVisible();
    await expect.poll(() => directoryReads).toBeGreaterThan(reads);
    await expect(page.getByRole("row", { name: /김학생/ })).toContainText(
      "사용 중지",
    );
    expect(accountWrites).toBe(1);
    await page.getByRole("button", { name: "반 관리", exact: true }).click();
    await expect(page.getByRole("row", { name: /수학반/ })).toContainText(
      "일부 발급",
    );
    const trigger = page.getByRole("button", { name: "수학반 발급 대상 확인" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const dialogElement = await dialog.elementHandle();
    await dialog.getByRole("button", { name: "선택한 학생 계정 생성" }).click();
    await expect(dialog).toBeVisible();
    expect(
      await dialogElement?.evaluate(
        (element) =>
          element.isConnected && element === document.querySelector("dialog"),
      ),
    ).toBe(true);
    await expect(dialog).toContainText("생성 1명");
    await expect(
      dialog.getByRole("list", { name: /학생 계정 생성 결과/ }),
    ).toContainText("이학생");
    await expect(dialog).toContainText("생성 완료");
    await expect(page.getByRole("row", { name: /수학반/ })).toContainText(
      "발급 완료",
    );
    expect(bulkWrites).toBe(1);
    await page.screenshot({
      path: testInfo.outputPath(`branch-issuance-result-${width}.png`),
      fullPage: true,
    });
    await dialog.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.reload();
    await expect(page.getByRole("row", { name: /수학반/ })).toContainText(
      "발급 완료",
    );
    expect(bulkWrites).toBe(1);
    expect(queries.every((q) => q.pathname.includes(branchId))).toBe(true);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
