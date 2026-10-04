import { test, expect, type Page } from "@playwright/test";
import { CLASS_A, CLASS_B, STUDENT_A, STUDENT_B } from "./fixture";
const base = "/e2e/admin-srs/index.html";
for (const width of [320, 1440]) {
  test(`branch explorer target settings are saved and restored at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const branchId = "60000000-0000-4000-8000-000000000001";
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `${base}?branchId=${branchId}&classId=${CLASS_A}&studentId=${STUDENT_A}`,
    );
    const setting = page.getByRole("region", {
      name: "탐험 학년과 목표 단원 설정",
    });
    await expect(setting.getByLabel("탐험 학년")).toHaveValue("3");
    await setting.getByLabel("탐험 학년").selectOption("4");
    await setting.getByLabel("목표 단원").selectOption("fixture-grade4");
    await setting.getByRole("button", { name: "탐험 설정 저장" }).click();
    await expect(setting.getByRole("status")).toContainText(
      "학생이 다음 탐험에서 이어갑니다.",
    );
    expect(await page.evaluate(() => window.srsFixture.explorerSaves)).toEqual([
      {
        studentId: STUDENT_A,
        classId: CLASS_A,
        branchId,
        input: {
          expectedRevision: 1,
          courseGrade: 4,
          goalUnitId: "fixture-grade4",
        },
      },
    ]);
    await page.screenshot({
      path: testInfo.outputPath(`explorer-settings-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await expect(setting.getByLabel("탐험 학년")).toHaveValue("4");
    await expect(setting.getByLabel("목표 단원")).toHaveValue("fixture-grade4");
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
async function dashboard(page: Page, query = "") {
  await page.goto(base + query);
  await expect(
    page.getByRole("button", { name: "김하늘 상세 보기" }).first(),
  ).toBeVisible();
}
async function plan(page: Page, index = 0) {
  await page
    .getByRole("button", { name: "김하늘 상세 보기" })
    .nth(index)
    .click();
  await page.getByRole("button", { name: "학습 설정", exact: true }).click();
  await expect(page.getByLabel("하루 학습량")).toHaveValue("10");
}
test("duplicate registration identity, class links, unique targets and shared plan metadata", async ({
  page,
}) => {
  await dashboard(page);
  await expect(page.getByText(/전체 학생 2명 · 등록 3건/)).toBeVisible();
  const links = page.getByRole("link", {
    name: "계정 확인 필요 · 계정 관리 ↗",
  });
  await expect(links.nth(0)).toHaveAttribute(
    "href",
    new RegExp(`classId=${CLASS_A}&studentId=${STUDENT_A}`),
  );
  await expect(links.nth(1)).toHaveAttribute(
    "href",
    new RegExp(`classId=${CLASS_B}&studentId=${STUDENT_A}`),
  );
  await plan(page, 1);
  await expect(page.locator('tr[data-selected="true"]')).toContainText(
    "중2 등록 반",
  );
  await page.getByLabel("하루 학습량").selectOption("20");
  await page.getByRole("button", { name: "학습 계획 저장" }).click();
  await expect(
    page.getByRole("button", { name: "학습 계획 저장" }),
  ).toBeEnabled();
  const learnerRows = page
    .getByRole("table", { name: "학생별 계정, 학습 진도, 오늘의 진행 상황" })
    .getByRole("row")
    .filter({ hasText: "김하늘" });
  await expect(learnerRows.nth(0)).toContainText("5 / 20");
  await expect(learnerRows.nth(1)).toContainText("5 / 20");
  await expect(learnerRows.nth(0)).toContainText("초3 등록 반");
  await expect(learnerRows.nth(1)).toContainText("중2 등록 반");
  expect(await page.evaluate(() => window.srsFixture.saves[0])).toMatchObject({
    studentId: STUDENT_A,
    classId: CLASS_B,
    input: { dailyQuestionCount: 20 },
  });
  await page.getByRole("button", { name: "학생 상세 닫기" }).click();
  await page.getByRole("button", { name: /보충 \/ 학년 확인 필요/ }).click();
  await expect(
    page.getByRole("button", { name: "김하늘 상세 보기" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "이바다 진도 설정" }).click();
  await expect(page.getByText(/보충학습 계획을 저장하면/)).toBeVisible();
  await page
    .getByRole("combobox", { name: "학년", exact: true })
    .selectOption("3");
  await page
    .getByRole("combobox", { name: "학기", exact: true })
    .selectOption("1");
  await page
    .getByRole("combobox", { name: "단원", exact: true })
    .selectOption({ index: 1 });
  await page
    .getByRole("combobox", { name: "소단원", exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "학습 계획 저장" }).click();
  await expect(page.getByText(/계획 대상 2명/)).toBeVisible();
  expect(
    await page.evaluate(() => window.srsFixture.saves.at(-1)),
  ).toMatchObject({ studentId: STUDENT_B, classId: CLASS_B });
});
test("dirty Escape, same student other class, tabs, discard and original-target save", async ({
  page,
}) => {
  await dashboard(page);
  await plan(page);
  await page.getByLabel("하루 학습량").selectOption("15");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "계속 편집" }).click();
  await expect(page.getByLabel("하루 학습량")).toHaveValue("15");
  await page.getByRole("button", { name: "김하늘 상세 보기" }).nth(1).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "계속 편집" }).click();
  await page.getByRole("button", { name: "개요", exact: true }).click();
  await page.getByRole("button", { name: "버리고 이동" }).click();
  await page.getByRole("button", { name: "학습 설정", exact: true }).click();
  await expect(page.getByLabel("하루 학습량")).toHaveValue("10");
  await page.getByLabel("하루 학습량").selectOption("20");
  await page.getByRole("button", { name: "김하늘 상세 보기" }).nth(1).click();
  await page.getByRole("button", { name: "저장하고 이동" }).click();
  await expect(page.locator('tr[data-selected="true"]')).toContainText(
    "중2 등록 반",
  );
  expect(await page.evaluate(() => window.srsFixture.saves[0])).toMatchObject({
    studentId: STUDENT_A,
    classId: CLASS_A,
  });
});
test("production workspace keyboard and hash navigation protect dirty state", async ({
  page,
}) => {
  await dashboard(page, "?view=shell#srs");
  await plan(page);
  await page.getByLabel("하루 학습량").selectOption("20");
  const home = page.getByRole("button", { name: "오늘의 작업", exact: true });
  await home.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "계속 편집" }).click();
  await expect(page).toHaveURL(/#srs$/);
  await page.evaluate(() => {
    location.hash = "home";
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/#srs$/);
  await page.getByRole("button", { name: "버리고 이동" }).click();
  await expect(page).not.toHaveURL(/#srs$/);
  await expect(home).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "오늘의 기억 · SRS", exact: true })
    .click();
  await plan(page);
  await page.getByLabel("하루 학습량").selectOption("15");
  await home.click();
  await page.getByRole("button", { name: "저장하고 이동" }).click();
  await expect(home).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => window.srsFixture.saves[0])).toMatchObject({
    studentId: STUDENT_A,
    classId: CLASS_A,
  });
});
test("native beforeunload retains the draft when canceled and busy saving locks row changes", async ({
  page,
}) => {
  await dashboard(page);
  await plan(page);
  await page.getByLabel("하루 학습량").selectOption("15");
  let dialogType = "";
  page.once("dialog", async (dialog) => {
    dialogType = dialog.type();
    await dialog.dismiss();
  });
  await page.reload({ timeout: 10000 }).catch(() => undefined);
  expect(dialogType).toBe("beforeunload");
  await expect(page.getByLabel("하루 학습량")).toHaveValue("15");
  await page.evaluate(() => {
    window.srsFixture.slowSave = true;
  });
  await page.getByRole("button", { name: "학습 계획 저장" }).click();
  await page.getByRole("button", { name: "김하늘 상세 보기" }).nth(1).click();
  await page.keyboard.press("Escape");
  await expect(page.locator('tr[data-selected="true"]')).toContainText(
    "초3 등록 반",
  );
  await expect(
    page.getByRole("button", { name: "학습 계획 저장" }),
  ).toBeEnabled();
  expect(await page.evaluate(() => window.srsFixture.saves[0])).toMatchObject({
    studentId: STUDENT_A,
    classId: CLASS_A,
  });
});
test("deep links and refresh retain class/student, safe return and role destinations", async ({
  page,
  request,
}) => {
  await page.route(/\/classes\/manage\?/, async (route) => {
    const html = await request.get(base);
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: await html.text(),
    });
  });
  await dashboard(page);
  await page
    .getByRole("link", { name: "계정 확인 필요 · 계정 관리 ↗" })
    .nth(1)
    .click();
  await expect(page.getByText("중2 등록 반 · 중2").first()).toBeVisible();
  await expect(page.getByText(/선택 학생: 김하늘/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/선택 학생: 김하늘/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "이전 화면으로 돌아가기" }),
  ).toHaveAttribute(
    "href",
    `/admin/math-srs?classId=${CLASS_B}&studentId=${STUDENT_A}&teachingTab=classes`,
  );
  for (const actor of ["manager", "super", "srs-only"]) {
    await dashboard(page, `?actor=${actor}`);
    const link = page
      .getByRole("link", { name: "계정 확인 필요 · 계정 관리 ↗" })
      .first();
    if (actor === "srs-only") await expect(link).toHaveCount(0);
    else
      await expect(link).toHaveAttribute(
        "href",
        new RegExp(actor === "manager" ? "^/branch\\?" : "^/classes/manage\\?"),
      );
  }
  for (const value of [
    "//evil.example/",
    "/admin/branches/foreign?tab=accounts",
    "/admin/branches/unassigned?returnTo=%2Fbranch",
  ]) {
    await page.goto(
      `${base}?view=return&returnTo=${encodeURIComponent(value)}`,
    );
    await expect(
      page.getByRole("link", { name: "미소속 계정 목록" }),
    ).toHaveAttribute("href", "/admin/branches/unassigned?tab=accounts");
  }
});
test("mobile/table scroll remains inside the page and no browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await dashboard(page);
    await plan(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/admin-srs/srs-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
