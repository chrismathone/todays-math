import { test, expect } from "@playwright/test";
import { pendingAccount } from "../../src/__tests__/components/adminFixtures";

const id = (n: number) =>
  `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const branchId = id(10);
for (const width of [320, 390, 1440, 1920]) {
  test(`separate class/student panels, explicit bulk generation and filters at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const extraStudents =
      width === 320
        ? Array.from({ length: 30 }, (_, index) => ({
            studentId: id(index + 100),
            name: `학생${index + 100}`,
            loginId: `학생${index + 100}`,
            status: "existing",
          }))
        : [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const queries: URL[] = [];
    let issued = 0;
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const respond = (body: unknown) => route.fulfill({ json: body });
      if (url.pathname === `/api/admin/users/${pendingAccount.id}`) {
        return respond({
          data: {
            ...pendingAccount,
            branchId,
            branchName: "인재원 침산",
            branchRole: "teacher",
            branchAssignmentLocked: true,
          },
        });
      }
      if (url.pathname === "/api/admin/branches")
        return respond({
          data: [{ id: branchId, name: "인재원 침산", active: true }],
        });
      if (url.pathname.endsWith("/documents"))
        return respond({ data: [], meta: { page: 1, pageSize: 20, total: 0 } });
      if (url.pathname.endsWith("/relations")) {
        queries.push(url);
        if (url.searchParams.get("kind") === "classes")
          return respond({
            kind: "classes",
            meta: { page: 1, pageSize: 20, total: 1 },
            data: [
              {
                id: id(1),
                name: "중등M 중2 JJPS",
                grade: "중2",
                active: true,
                owner: true,
                memberships: ["homeroom"],
                sync: "active",
              },
            ],
          });
        const filtered = url.searchParams.get("login") === "unissued";
        return respond({
          kind: "students",
          meta: { page: 1, pageSize: 20, total: filtered ? 0 : 2 },
          filters: {
            classes: [{ id: id(1), name: "중등M 중2 JJPS" }],
            grades: ["중2"],
          },
          data: filtered
            ? []
            : [
                {
                  id: id(2),
                  name: "김하늘",
                  grade: "중2",
                  sync: "active",
                  login: issued ? "enabled" : "unissued",
                  classes: [
                    {
                      id: id(1),
                      name: "중등M 중2 JJPS",
                      membership: "enrolled",
                    },
                  ],
                },
                {
                  id: id(3),
                  name: "박지우",
                  grade: "중2",
                  sync: "active",
                  login: "enabled",
                  classes: [
                    {
                      id: id(1),
                      name: "중등M 중2 JJPS",
                      membership: "enrolled",
                    },
                  ],
                },
              ],
        });
      }
      if (url.pathname === `/api/classes/${id(1)}/student-accounts`) {
        if (route.request().method() === "GET")
          return respond({
            data: {
              classId: id(1),
              className: "중등M 중2 JJPS",
              total: 2 + extraStudents.length,
              ready: 1,
              issued: 0,
              existing: 1 + extraStudents.length,
              skipped: 0,
              students: [
                {
                  studentId: id(2),
                  name: "김하늘",
                  loginId: "김하늘",
                  status: "ready",
                },
                {
                  studentId: id(3),
                  name: "박지우",
                  loginId: "박지우",
                  status: "existing",
                },
                ...extraStudents,
              ],
            },
          });
        expect(route.request().method()).toBe("POST");
        expect(route.request().postDataJSON()).toEqual({ studentIds: [id(2)] });
        issued++;
        return respond({
          data: {
            classId: id(1),
            className: "중등M 중2 JJPS",
            total: 2,
            ready: 0,
            issued: 1,
            existing: 1,
            skipped: 0,
            students: [
              {
                studentId: id(2),
                name: "김하늘",
                loginId: "김하늘",
                status: "issued",
              },
              {
                studentId: id(3),
                name: "박지우",
                loginId: "박지우",
                status: "existing",
              },
            ],
          },
        });
      }
      errors.push(`Unexpected API ${url.pathname}`);
      return route.fulfill({
        status: 404,
        json: { error: { message: "Unexpected fixture API" } },
      });
    });
    await page.goto(
      `/e2e/admin-accounts/index.html?view=detail&branchId=${branchId}`,
    );
    await expect(
      page.getByRole("heading", {
        name: pendingAccount.name,
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
    expect(issued).toBe(0);
    const back = page.getByRole("link", {
      name: /인재원 침산 계정 목록/,
      exact: true,
    });
    await expect(back).toBeVisible();
    expect(
      await back.evaluate((el) => getComputedStyle(el).borderTopStyle),
    ).toBe("solid");
    await page.getByRole("button", { name: "반", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "연결된 반", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "연결된 학생", exact: true }),
    ).toHaveCount(0);
    expect(issued).toBe(0);
    await page
      .getByRole("button", {
        name: "중등M 중2 JJPS 발급 대상 확인",
        exact: true,
      })
      .click();
    const preview = page.getByRole("dialog", {
      name: "중등M 중2 JJPS 발급 대상",
      exact: true,
    });
    await expect(preview).toBeVisible();
    await expect(preview).toHaveJSProperty("open", true);
    expect(await preview.evaluate((el) => el.matches(":modal"))).toBe(true);
    const bounds = await preview.boundingBox();
    expect(bounds).not.toBeNull();
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    expect(Math.abs(bounds!.y + bounds!.height / 2 - 500)).toBeLessThan(2);
    expect(bounds!.x).toBeGreaterThanOrEqual(12);
    expect(bounds!.y).toBeGreaterThanOrEqual(12);
    if (extraStudents.length) {
      const roster = preview.getByRole("list");
      expect(
        await roster.evaluate((el) => el.scrollHeight > el.clientHeight),
      ).toBe(true);
      await expect(
        preview.getByRole("button", { name: "취소", exact: true }),
      ).toBeInViewport();
    }
    await page.screenshot({
      path: testInfo.outputPath(`student-issue-dialog-${width}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    const trigger = page.getByRole("button", {
      name: "중등M 중2 JJPS 발급 대상 확인",
      exact: true,
    });
    await expect(trigger).toBeFocused();
    expect(issued).toBe(0);
    await trigger.click();
    await expect(preview).toBeVisible();
    expect(issued).toBe(0);
    await expect(
      preview.getByRole("checkbox", { name: /김하늘/ }),
    ).toBeChecked();
    await expect(
      preview.getByRole("checkbox", { name: /박지우/ }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await preview
      .getByRole("button", { name: "선택한 학생 계정 생성", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "생성 1명" }),
    ).toBeVisible();
    expect(issued).toBe(1);
    await page.getByRole("button", { name: "학생", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "연결된 반", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "연결된 학생", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "정렬", exact: true }),
    ).toHaveValue("class");
    await page
      .getByRole("combobox", { name: "반", exact: true })
      .selectOption(id(1));
    await page
      .getByRole("combobox", { name: "로그인 상태", exact: true })
      .selectOption("unissued");
    await expect(page.getByText("조건에 맞는 학생이 없습니다.")).toBeVisible();
    const query = queries.at(-1)!;
    expect(query.searchParams.get("classId")).toBe(id(1));
    expect(query.searchParams.get("login")).toBe("unissued");
    expect(query.searchParams.get("page")).toBe("1");
    await page.getByRole("button", { name: "필터 초기화" }).click();
    await expect(
      page
        .getByRole("region", { name: "연결된 학생", exact: true })
        .getByText("김하늘", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width >= 1440)
      expect(
        await page
          .locator("main")
          .evaluate((el) => innerWidth - el.getBoundingClientRect().right),
      ).toBeLessThanOrEqual(30);
    await page.screenshot({
      path: testInfo.outputPath(`admin-students-${width}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
