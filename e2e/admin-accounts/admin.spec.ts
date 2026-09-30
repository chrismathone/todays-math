import { test, expect, type Page } from "@playwright/test";
import {
  accountsResponse,
  adminAccount,
  approvedAccount,
  pendingAccount,
  rejectedAccount,
} from "../../src/__tests__/components/adminFixtures";
import type { ManagedAccount } from "../../src/contracts/accountAccess.contract";

async function installApi(page: Page) {
  const users: ManagedAccount[] = [
    structuredClone(pendingAccount),
    approvedAccount,
    adminAccount,
    rejectedAccount,
  ];
  const requests: {
    path: string;
    method: string;
    body: Record<string, unknown> | null;
  }[] = [];
  const unexpected: string[] = [];
  let conflict = false;
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:4318") {
      unexpected.push(url.href);
      await route.abort();
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      await route.continue();
      return;
    }
    const method = route.request().method();
    const body = method === "PATCH" ? route.request().postDataJSON() : null;
    requests.push({ path: url.pathname + url.search, method, body });
    const respond = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (url.pathname === "/api/admin/users") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const status = url.searchParams.get("status");
      const selected = users.filter(
        (user) =>
          `${user.name} ${user.email}`.toLowerCase().includes(q) &&
          (status === "all" || status === user.approvalStatus),
      );
      await respond(accountsResponse(selected));
      return;
    }
    if (url.pathname === `/api/admin/users/${pendingAccount.id}`) {
      if (method === "PATCH") {
        if (conflict) {
          conflict = false;
          users[0] = {
            ...users[0],
            menus: ["home"],
            updatedAt: "2026-09-14T11:00:00.000Z",
          };
          await respond({ message: "stale version" }, 409);
          return;
        }
        users[0] = {
          ...users[0],
          ...body,
          updatedAt: "2026-09-14T12:00:00.000Z",
        };
      }
      await respond({ data: users[0] });
      return;
    }
    if (url.pathname === "/api/account/access") {
      await respond({ data: { ...users[0], approvalStatus: "approved" } });
      return;
    }
    const draft = {
      id: "draft-1",
      kind: "draft",
      title: "중1 · 일차방정식 확인 학습",
      revision: 3,
      createdAt: pendingAccount.createdAt,
      updatedAt: pendingAccount.updatedAt,
      payload: {
        problems: [
          {
            content: "일차방정식 $3x+2=14$를 풀어 보세요.",
            answer: "$x=4$",
            solution: "양변에서 2를 빼고, 3으로 나눕니다.",
            grade: "중1",
          },
          {
            content:
              "다음 중 해가 $x=2$인 방정식을 고르세요.\n① $x+1=4$\n② $2x=4$\n③ $x-1=3$",
            answer: "②",
            grade: "중1",
          },
        ],
      },
    };
    if (url.pathname.endsWith("/documents")) {
      await respond({
        data: [draft],
        meta: { page: 1, pageSize: 20, total: 1 },
      });
      return;
    }
    if (url.pathname.endsWith("/documents/draft-1")) {
      await respond({ data: draft });
      return;
    }
    if (url.pathname.endsWith("/audit")) {
      await respond({
        data: [
          {
            id: "event-1",
            action: "material.saved",
            outcome: "success",
            actorName: "김하늘",
            createdAt: pendingAccount.updatedAt,
            details: { title: draft.title, revision: 3, problemCount: 2 },
          },
        ],
        meta: { page: 1, pageSize: 30, total: 1 },
      });
      return;
    }
    unexpected.push(`${method} ${url.pathname}`);
    await respond({ message: "Unmocked API" }, 500);
  });
  return {
    requests,
    unexpected,
    conflict: () => {
      conflict = true;
    },
  };
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

for (const width of [320, 390, 1440]) {
  test(`account management ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await installApi(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/e2e/admin-accounts/index.html");
    await expect(
      page.getByRole("button", { name: "김하늘 계정 검토" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "김하늘 계정 검토" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "김하늘", exact: true }),
    ).toBeFocused();
    await page.getByLabel("문제 추출", { exact: true }).check();
    expect(
      api.requests.filter((request) => request.method === "PATCH"),
    ).toHaveLength(0);
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`admin-${width}.png`),
      fullPage: true,
    });
    api.conflict();
    await page.getByRole("button", { name: "메뉴 변경 저장" }).click();
    await expect(page.getByRole("alert")).toContainText("다른 관리자가");
    await expect(
      page.getByRole("button", { name: "계정 승인 · 메뉴 저장" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "최신 정보 불러오기" }).click();
    await expect(
      page.getByLabel("문제은행", { exact: true }),
    ).not.toBeChecked();
    await page.getByLabel("문제 추출", { exact: true }).check();
    await page.getByRole("button", { name: "계정 승인 · 메뉴 저장" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "계정을 승인하고" }),
    ).toBeVisible();
    expect(
      api.requests.filter((request) => request.method === "PATCH").at(-1)?.body,
    ).toMatchObject({
      expectedUpdatedAt: "2026-09-14T11:00:00.000Z",
      approvalStatus: "approved",
      menus: ["home", "studio"],
    });
    await noOverflow(page);
    expect(api.unexpected).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`pending and rejected ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await installApi(page);
    await page.goto("/e2e/admin-accounts/index.html?view=pending");
    await expect(page.getByText("haneul@example.com")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`pending-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "승인 상태 새로고침" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-destination", "/");
    await page.goto("/e2e/admin-accounts/index.html?view=rejected");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "거절되었습니다.",
    );
    await noOverflow(page);
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-signed-out",
      "true",
    );
    expect(api.unexpected).toEqual([]);
  });

  test(`private documents and audit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await installApi(page);
    await page.goto("/e2e/admin-accounts/index.html?view=detail");
    await page.getByRole("button", { name: /일차방정식 확인 학습/ }).click();
    await expect(
      page.getByRole("heading", { name: "문항 1 중1" }),
    ).toBeVisible();
    await expect(page.locator(".katex").first()).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`documents-${width}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "활동 기록", exact: true }).click();
    await expect(page.getByText("자료 저장")).toBeVisible();
    await noOverflow(page);
    expect(api.unexpected).toEqual([]);
    expect(api.requests.every((request) => request.method === "GET")).toBe(
      true,
    );
  });
}
