/* Local authored fixture only. Start next dev separately; no API/DB writes. */
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");

const output = path.resolve(
  "docs/planning/tracks/reports/math-question-formats-20261018/ui-qa",
);
const origin = process.argv[2] || "http://127.0.0.1:3198";
const results = [];
const failureFlows = [];

async function metrics(page) {
  return page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    focus: document.activeElement?.textContent?.slice(0, 100),
    count: document.querySelector('[aria-label="실제 선택"]')?.textContent,
  }));
}
async function run() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.platform === "darwin" ? { channel: "chrome" } : {}),
  });
  try {
    for (const [width, height] of [
      [320, 600],
      [390, 600],
      [1280, 800],
      [1280, 600],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      const writes = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (request.method() !== "GET" && request.method() !== "HEAD")
          writes.push({ method: request.method(), url: request.url() });
      });
      await page.goto(`${origin}/dev/question-formats`);
      await expect(
        page.getByRole("button", { name: "형식 변경 · 단답형", exact: true }),
      ).toBeEnabled();
      const before = await metrics(page);
      expect(before.scrollWidth).toBeLessThanOrEqual(width);
      await page
        .getByRole("button", { name: "형식 변경 · 단답형", exact: true })
        .click();
      let picker = page.getByRole("dialog", {
        name: "출제 형식 변경",
        exact: true,
      });
      await expect(picker.getByRole("radio", { name: /단답형/ })).toBeFocused();
      await expect(picker.getByRole("radio", { name: /서술형/ })).toHaveCount(
        0,
      );
      await page.keyboard.press("ArrowRight");
      await expect(
        picker.getByRole("radio", { name: "객관식", exact: true }),
      ).toBeChecked();
      await expect(picker.getByText("⑤", { exact: true })).toBeVisible();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(
        picker.getByRole("button", { name: "이 형식으로 변경", exact: true }),
      ).toBeFocused();
      const action = await picker
        .getByRole("button", { name: "이 형식으로 변경", exact: true })
        .boundingBox();
      expect(action.y + action.height).toBeLessThanOrEqual(height);
      expect(action.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({
        path: path.join(output, `picker-${width}x${height}-keyboard.png`),
      });
      await page.keyboard.press("Enter");
      await expect(picker).toHaveCount(0);
      await expect(page.getByLabel("실제 선택")).toHaveText(
        /담은 수 1.*검증-2.*답 ③/,
      );
      await expect(
        page.getByRole("button", { name: "형식 변경 · 객관식", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "형식 변경 · 객관식", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "형식 변경 · 객관식", exact: true }),
      ).toBeFocused();

      await page
        .getByRole("button", { name: "+ 문항 추가", exact: true })
        .click();
      const list = page.getByRole("dialog", { name: "문항 추가", exact: true });
      await expect(list.locator("article")).toHaveCount(3);
      await expect(
        list.getByText("3문항 · 전체 난이도", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: path.join(output, `candidates-${width}x${height}.png`),
      });
      await list.locator("article").nth(0).getByRole("button").click();
      picker = page.getByRole("dialog", {
        name: "출제 형식 선택",
        exact: true,
      });
      await expect(
        picker.getByRole("button", { name: "이 형식으로 담기", exact: true }),
      ).toBeEnabled();
      await picker
        .getByRole("button", { name: "이 형식으로 담기", exact: true })
        .click();
      await expect(
        list.locator("article").nth(0).getByRole("button"),
      ).toBeDisabled();
      await list.locator("article").nth(1).getByRole("button").click();
      await expect(
        page.getByRole("dialog", { name: "출제 형식 선택", exact: true }),
      ).toHaveCount(0);
      await list.locator("article").nth(2).getByRole("button").click();
      picker = page.getByRole("dialog", {
        name: "출제 형식 선택",
        exact: true,
      });
      await expect(
        picker.getByRole("radio", { name: /객관식/ }),
      ).toBeDisabled();
      await expect(
        picker.getByText("출제 잠금(사유 미기록)", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: path.join(output, `blocked-${width}x${height}.png`),
      });
      await page.keyboard.press("Escape");
      await expect(list).toBeVisible();
      await list.getByRole("button", { name: "완료", exact: true }).click();
      await expect(page.getByLabel("실제 선택")).toHaveText(/담은 수 3/);
      await expect(page.locator("[data-exam-question]")).toHaveCount(3);
      await page.screenshot({
        path: path.join(output, `review-${width}x${height}.png`),
        fullPage: true,
      });

      await page
        .getByRole("checkbox", { name: "선택 후 개정 충돌", exact: true })
        .check();
      await page
        .getByRole("button", { name: "형식 변경 · 객관식", exact: true })
        .click();
      picker = page.getByRole("dialog", {
        name: "출제 형식 변경",
        exact: true,
      });
      await expect(picker.getByRole("alert")).toHaveText(/변경되었습니다/);
      await expect(
        picker.getByRole("button", { name: "이 형식으로 변경", exact: true }),
      ).toBeDisabled();
      await page.screenshot({
        path: path.join(output, `revision-conflict-${width}x${height}.png`),
      });
      await page.keyboard.press("Escape");
      await page
        .getByRole("checkbox", { name: "선택 후 개정 충돌", exact: true })
        .uncheck();
      await expect(page.getByLabel("실제 선택")).toHaveText(/담은 수 3/);

      await page
        .getByRole("button", { name: "과거 중복 저장본 열기", exact: true })
        .click();
      await expect(page.getByLabel("실제 선택")).toHaveText(
        /담은 수 2.*답 5.*답 ③/,
      );
      await expect(
        page.getByRole("button", {
          name: "사본으로 새 시험지 만들기",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: path.join(output, `saved-output-${width}x${height}.png`),
      });
      await page
        .getByRole("button", { name: "사본으로 새 시험지 만들기", exact: true })
        .click();
      const conflict = page
        .getByRole("alert")
        .filter({ hasText: "저장된 목록에 같은 문항의 형식" });
      await expect(conflict).toBeVisible();
      await page.screenshot({
        path: path.join(output, `saved-edit-conflict-${width}x${height}.png`),
      });
      await conflict.getByRole("button", { name: /단답형.*유지/ }).click();
      await expect(page.getByLabel("실제 선택")).toHaveText(/담은 수 1.*답 5/);
      const after = await metrics(page);
      expect(after.scrollWidth).toBeLessThanOrEqual(width);
      expect(errors).toEqual([]);
      expect(writes).toEqual([]);
      results.push({
        viewport: { width, height },
        before,
        after,
        nativeRadio: true,
        completeActualSwitch: true,
        focusReturned: true,
        nestedEscape: true,
        candidateCount: 3,
        blockedSibling: true,
        revisionPreservesInput: true,
        storedOutputPreserved: true,
        explicitConflictResolution: true,
        errors,
        networkWrites: writes,
      });
      await page.close();
    }
    const page = await browser.newPage({
      viewport: { width: 1280, height: 600 },
    });
    await page.goto(`${origin}/dev/question-formats`);
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await page
      .getByRole("button", { name: "1 범위 설정", exact: true })
      .click();
    await page.getByLabel("덧셈과 짝수 구성 수", { exact: true }).fill("4");
    await page.getByRole("button", { name: "구성 조건", exact: true }).click();
    const conditions = page.getByRole("dialog", {
      name: "구성 조건",
      exact: true,
    });
    await conditions.getByLabel("객관식 문항 수", { exact: true }).fill("4");
    await conditions.getByLabel("단답형 문항 수", { exact: true }).fill("0");
    await conditions.getByLabel("서술형 문항 수", { exact: true }).fill("0");
    await conditions.getByRole("button", { name: "적용", exact: true }).click();
    await page
      .getByRole("button", { name: "문항 구성 →", exact: true })
      .click();
    await expect(page.getByLabel("실제 선택")).toHaveText(/담은 수 2/);
    await expect(
      page.locator("[data-exam-builder]").getByRole("alert"),
    ).toHaveText(/총 4문항 지정 · 현재 2문항/);
    await expect(
      page.locator("[data-exam-builder]").getByRole("alert"),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("button", { name: "3 양식 구성·출력", exact: true }),
    ).toBeDisabled();
    await expect(page.locator("[data-exam-question]")).toHaveCount(2);
    await expect(page.getByLabel("실제 선택")).not.toHaveText(
      /descriptive|short-answer/,
    );
    await page.screenshot({
      path: path.join(output, "quota-shortage-1280x600.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "범위 설정 고치기", exact: true })
      .click();
    await expect(
      page.getByLabel("덧셈과 짝수 구성 수", { exact: true }),
    ).toHaveValue("4");
    await page.getByRole("button", { name: "구성 조건", exact: true }).click();
    await expect(
      conditions.getByLabel("객관식 문항 수", { exact: true }),
    ).toHaveValue("4");
    await expect(
      conditions.getByLabel("서술형 문항 수", { exact: true }),
    ).toHaveValue("0");
    await page.keyboard.press("Escape");
    failureFlows.push({
      kind: "quota-shortage",
      actual: 2,
      requested: 4,
      forbiddenFormatsAbsent: true,
      outputBlocked: true,
      inputsPreserved: true,
    });
    await page
      .getByRole("button", { name: "기본 검토로", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "문항 조회 실패", exact: true })
      .check();
    await page
      .getByRole("button", { name: "형식 변경 · 단답형", exact: true })
      .click();
    const failedPicker = page.getByRole("dialog", {
      name: "출제 형식 변경",
      exact: true,
    });
    await expect(failedPicker.getByRole("alert")).toHaveText(
      /문항 단위 조회에 실패/,
    );
    await expect(
      failedPicker.getByRole("radio", { name: /단답형/ }),
    ).toBeChecked();
    await expect(
      failedPicker.getByRole("button", {
        name: "이 형식으로 변경",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(page.getByLabel("실제 선택")).toHaveText(/담은 수 1.*답 5/);
    await page.screenshot({
      path: path.join(output, "query-failure-1280x600.png"),
    });
    failureFlows.push({
      kind: "query-failure",
      selectionPreserved: true,
      rawRowCountFallback: false,
      commitBlocked: true,
    });
    await page.close();
  } finally {
    await browser.close();
  }
  await fs.writeFile(
    path.join(output, "browser-results.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        origin,
        scope: "authored local fixture; no production API or DB verification",
        results,
        failureFlows,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passedViewports: results.map((item) => item.viewport),
      pageErrors: 0,
      networkWrites: 0,
      output,
    }),
  );
}
run().catch(async (error) => {
  await fs.writeFile(
    path.join(output, "browser-failure.txt"),
    String(error.stack || error),
  );
  console.error(error);
  process.exitCode = 1;
});
