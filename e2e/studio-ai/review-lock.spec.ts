import { expect, test } from "@playwright/test";

/** 그 문항을 «바꾸는» 것 전부. 보기만 하는 것(문제 번호·배점 표시)은 여기 없다. */
const EDITORS = [
  "다시 인식",
  "내용 수정",
  "그림 다시 찾기",
  "SVG 생성",
  "해설 생성",
];

test("검수 완료된 문항은 잠기고, 같은 자리에서 푼다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?review-lock-fixture");
  const locked = page.getByRole("article", { name: "문제 1 인식 결과" });
  const open = page.getByRole("article", { name: "문제 2 인식 결과" });
  await expect(locked).toContainText("검수 완료");
  for (const name of EDITORS)
    await expect(
      locked.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  await expect(
    locked.getByRole("combobox", { name: "문제 1 출력 방식" }),
  ).toBeDisabled();
  await expect(locked).toContainText("수정하려면 검수 완료를 취소하세요.");
  // D-30 — 잠근 것은 진짜 `:disabled` 여야 한다. 손가락 커서를 막는 전역 규칙
  // (`src/app/globals.css` 의 `:disabled { cursor: not-allowed }`)이 이 선택자에 걸린다.
  // 이 픽스처는 globals.css 를 안 싣는다(Tailwind @import) — 계산된 커서를 여기서 재면
  // 내가 복사해 둔 규칙을 재는 셈이라 아무것도 증명하지 못한다.
  for (const name of EDITORS)
    expect(
      await locked
        .getByRole("button", { name, exact: true })
        .evaluate((el) => el.matches(":disabled")),
    ).toBe(true);
  // 다른 문항은 그대로 — 축이 하나면 «전부 잠김»도 초록이다.
  for (const name of EDITORS)
    await expect(open.getByRole("button", { name, exact: true })).toBeEnabled();
  expect(
    await open
      .getByRole("button", { name: "내용 수정", exact: true })
      .evaluate((el) => el.matches(":disabled")),
  ).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("review-locked.png") });

  // 푸는 길 — 잠근 자리에서 푼다.
  await locked.getByRole("button", { name: "검수 완료 취소" }).click();
  await expect(page.getByLabel("검수 동작 결과")).toHaveText(
    'c1 {"reviewed":false}',
  );
  for (const name of EDITORS)
    await expect(
      locked.getByRole("button", { name, exact: true }),
    ).toBeEnabled();
  await expect(locked).not.toContainText("수정하려면 검수 완료를 취소하세요.");
  await page.screenshot({ path: testInfo.outputPath("review-unlocked.png") });
  await locked.getByRole("button", { name: "이 문제 검수 완료" }).click();
  await expect(page.getByLabel("검수 동작 결과")).toHaveText(
    'c1 {"reviewed":true}',
  );
  expect(errors).toEqual([]);
});
