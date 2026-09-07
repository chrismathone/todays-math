import { expect, test } from "@playwright/test";

import {
  E2E_ACCOUNTS,
  E2E_NEXT_SECTION,
  E2E_TARGET_GRADE,
  E2E_TARGET_SECTION,
} from "./env";
import { completeOnboarding, loginViaUi, signupViaUi } from "./helpers/auth";
import {
  approvePendingProblems,
  currentClassAndUnit,
  seedApprovedProblemsViaApi,
} from "./helpers/bank";

test.describe.configure({ timeout: 120_000 });

test.describe("T6.1 여정 A — 신규 가입부터 인쇄 미리보기", () => {
  test("가입 → 온보딩 → 출제 → 검수 → 인쇄 미리보기", async ({ page }) => {
    const email = `e2e.signup.${Date.now()}@todaysmath.test`;
    await signupViaUi(page, {
      email,
      password: "password1",
      name: "신규원장",
    });
    await completeOnboarding(page, {
      className: "중2 신규반",
      grade: E2E_TARGET_GRADE,
      studentName: "이학생",
      unitLabel: `${E2E_TARGET_GRADE} · ${E2E_TARGET_SECTION}`,
    });

    await expect(
      page.getByRole("article", { name: "중2 신규반" }),
    ).toBeVisible();
    const { unitId } = await currentClassAndUnit(page.request);
    await seedApprovedProblemsViaApi(page.request, unitId);

    await page.getByRole("link", { name: "출제" }).click();
    await expect(
      page.getByRole("heading", { name: "출제 설정" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "출제" }).click();

    await page.waitForURL(/\/tests\/[0-9a-f-]{36}$/i);
    await expect(page.getByRole("heading", { name: "검수" })).toBeVisible();
    await expect(page.getByRole("article", { name: "문 1" })).toBeVisible();
    await expect(page.getByText("8문항")).toBeVisible();

    // 🔴 **확정해야 인쇄가 선다.** draft 일 때 「인쇄」는 링크가 아니라 잠긴 버튼이다
    //    (`TestReview`). 예전 이 여정은 확정 없이 링크를 찾아 그 자리에서 죽었다.
    await page.getByRole("button", { name: "확정" }).click();
    await expect(page.getByRole("button", { name: "확정" })).toBeDisabled();

    await page.getByRole("link", { name: "인쇄" }).click();
    await page.waitForURL(/\/tests\/[0-9a-f-]{36}\/print$/i);
    await expect(page.getByText("PRINT PREVIEW")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /일일테스트/ }).first(),
    ).toBeVisible();
    await expect(page.getByText("중2 신규반 · 8문항")).toBeVisible();
  });
});

test.describe("T6.1 여정 B — 일상 루프", () => {
  test("로그인 → 준비된 테스트 → 교체 1회 → 확정 → 인쇄 → 진도 갱신", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.print = () => {
        (window as unknown as { __e2ePrinted?: boolean }).__e2ePrinted = true;
      };
    });

    await loginViaUi(page, E2E_ACCOUNTS.daily);
    await expect(
      page.getByRole("article", { name: E2E_ACCOUNTS.daily.className }),
    ).toBeVisible();
    await expect(page.getByText("준비됨")).toBeVisible();

    await page.getByRole("link", { name: "검수" }).click();
    await page.waitForURL(/\/tests\/[0-9a-f-]{36}$/i);
    const first = page.getByRole("article", { name: "문 1" });
    await expect(first).toBeVisible();
    const before = (await first.innerText()).trim();

    await first.getByRole("button", { name: "교체" }).click();
    await expect(page.getByText("교체 1")).toBeVisible();
    await expect(first).not.toHaveText(before);

    await page.getByRole("button", { name: "확정" }).click();
    await expect(page.getByRole("button", { name: "확정" })).toBeDisabled();

    await page.getByRole("link", { name: "인쇄" }).click();
    await page.waitForURL(/\/tests\/[0-9a-f-]{36}\/print$/i);
    await expect(page.getByText("PRINT PREVIEW")).toBeVisible();
    await page.getByRole("button", { name: "인쇄하기" }).click();
    await expect(
      page.getByText("확정된 테스트만 인쇄할 수 있습니다."),
    ).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as unknown as { __e2ePrinted?: boolean }).__e2ePrinted ===
            true,
        ),
      )
      .toBe(true);

    await page.goto("/");
    await expect(page.getByLabel("현재 소단원")).toHaveText(E2E_TARGET_SECTION);
    // 🔴 화살표는 **열람만** 한다 — 진도는 아래 버튼으로 명시적으로 커밋한다
    //    (2026-08-14 원장 관찰: 예전엔 화살표마다 진도가 쌓였다).
    //    예전 이 여정은 없는 이름(「다음 차시로」)을 찾고 있었다.
    await page.getByRole("button", { name: "다음 차시" }).click();
    await page.getByRole("button", { name: "이 차시로 진도 기록" }).click();
    await expect(page.getByLabel("현재 소단원")).toHaveText(E2E_NEXT_SECTION);
  });
});

test.describe("T6.1 여정 C — 문제 부족 후 AI 생성(모킹)", () => {
  test("문제 부족 → AI 생성(모킹) → 출제 완료", async ({ page }) => {
    await loginViaUi(page, E2E_ACCOUNTS.shortfall);
    await page.getByRole("link", { name: "출제" }).click();
    await expect(
      page.getByRole("heading", { name: "출제 설정" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "출제" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "문제가 부족합니다" }),
    ).toBeVisible();
    await expect(page.getByText(/가용 2/)).toBeVisible();
    await expect(page.getByText(/필요 8/)).toBeVisible();

    // 🔴 **검수가 이 화면으로 옮겨 왔다** (원장님 지적 2026-08-26). 예전에는
    //    「문제은행에서 승격한 뒤 다시 출제하세요」라는 안내만 하고 원장을 내보냈다 —
    //    그 문구는 지금 없다. 이 여정은 그 사라진 글자를 기다리다 죽고 있었다.
    await page.getByRole("button", { name: "AI 생성" }).click();
    await expect(
      page.getByRole("region", { name: "생성한 문항 검수" }),
    ).toBeVisible();

    // 그 자리에서 승인한다. D-22 는 그대로다 — 승인 전에는 출제 풀에 안 들어간다.
    await approvePendingProblems(page.request);
    await page.getByRole("button", { name: "출제" }).click();
    await page.waitForURL(/\/tests\/[0-9a-f-]{36}$/i);
    await expect(page.getByRole("heading", { name: "검수" })).toBeVisible();
    await expect(page.getByRole("article", { name: "문 1" })).toBeVisible();
    await expect(page.getByText("8문항")).toBeVisible();
  });
});

/**
 * 🔴 **여정 D — 문제은행에서 그 자리에서 골라 바로 인쇄** (원장님 방향 2026-09-07:
 * 「반별 확인테스트 뿐만 아니라 그 자리에서도 즉시 문제들을 뽑아서 출력하는 문제은행까지」).
 *
 * 이 길은 자동 출제 옆에 난 **손으로 짜는 길**이다. 진도·난이도 배분·D-20 을 하나도 안 본다.
 * 대신 **출제 자격**(공유·approved·출제허용·정답)은 서버가 담기와 시험지 양쪽에서 건다 —
 * 안 걸면 그림이 유실돼 잠긴 문항이 그림 없이 종이로 나간다(2026-09-07 실측 1,751건).
 */
test.describe("여정 D — 문제은행에서 담아 바로 시험지·인쇄", () => {
  test("담기 → 시험지 만들기 → 확정 → 인쇄 미리보기", async ({ page }) => {
    await page.addInitScript(() => {
      window.print = () => {
        (window as unknown as { __e2ePrinted?: boolean }).__e2ePrinted = true;
      };
    });
    await loginViaUi(page, E2E_ACCOUNTS.daily);

    await page.getByRole("link", { name: "문제은행" }).click();
    await expect(page.getByRole("heading", { name: "문제은행" })).toBeVisible();

    // 담기 — 자격이 있는 카드만 버튼이 살아 있다.
    const add = page.getByRole("button", { name: "담기", exact: true });
    await expect(add.first()).toBeEnabled();
    for (let i = 0; i < 3; i += 1) {
      await add.nth(i).click();
      await expect(page.getByText(`담은 문항 ${i + 1}개`)).toBeVisible();
    }

    // 🔴 바구니 패널의 CTA 가 **눌려야** 한다 — 하단 바가 그 줄을 덮고 있던 자리다.
    await page.getByRole("button", { name: "시험지 만들기" }).click();
    await page
      .getByRole("button", { name: "이 문항들로 시험지 만들기" })
      .click();
    await page.getByRole("link", { name: "시험지 보기" }).click();

    await page.waitForURL(/\/tests\/[0-9a-f-]{36}$/i);
    await expect(page.getByRole("heading", { name: "검수" })).toBeVisible();
    await expect(page.getByText("3문항")).toBeVisible();

    await page.getByRole("button", { name: "확정" }).click();
    await page.getByRole("link", { name: "인쇄" }).click();
    await page.waitForURL(/\/tests\/[0-9a-f-]{36}\/print$/i);
    await expect(page.getByText("PRINT PREVIEW")).toBeVisible();
    await page.getByRole("button", { name: "인쇄하기" }).click();
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as unknown as { __e2ePrinted?: boolean }).__e2ePrinted ===
            true,
        ),
      )
      .toBe(true);
  });
});
