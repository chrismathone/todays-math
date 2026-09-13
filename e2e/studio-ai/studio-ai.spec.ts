import { expect, test, type Page } from "@playwright/test";
import type { DevAiRequest } from "../../src/lib/dev-ai/contracts";

const content = String.raw`$\frac{7}{3}$ + 1의 값을 구하세요.`;
async function mockAi(page: Page) {
  const posts: DevAiRequest[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let failNext = false;
  let release: (() => void) | null = null;
  let holdNext = false;
  await page.route("**/api/dev/unified/ai", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          enabled: true,
          defaultProvider: "codex",
          mode: "subscription-cli",
          providers: [
            {
              id: "codex",
              label: "Codex",
              status: "ready",
              detail: "구독 CLI 응답 확인",
              image: true,
            },
            {
              id: "claude",
              label: "Claude",
              status: "login-required",
              detail: "Claude CLI에서 로그인해 주세요.",
              image: true,
            },
          ],
        },
      });
      return;
    }
    const request = route.request().postDataJSON() as DevAiRequest;
    posts.push(request);
    if (holdNext) {
      holdNext = false;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    if (failNext) {
      failNext = false;
      await route.fulfill({
        status: 502,
        json: { error: "도구 응답 지연 · 다시 시도해 주세요." },
      });
      return;
    }
    await route
      .fulfill({
        json: {
          provider: request.provider,
          action: request.action,
          result: {
            content,
            answer: String.raw`$\frac{10}{3}$`,
            solution: "1을 더해서 구합니다.",
            warnings: ["그림과 보기를 원본과 확인하세요."],
            figures: [
              { bbox: { left: 200, top: 200, width: 300, height: 400 } },
            ],
            problems: [
              {
                content,
                answer: "",
                bbox: { left: 80, top: 180, width: 840, height: 145 },
              },
              {
                content: "직사각형의 넓이를 구하세요.",
                answer: "40",
                bbox: { left: 80, top: 350, width: 840, height: 260 },
                figures: [
                  { bbox: { left: 200, top: 420, width: 220, height: 100 } },
                ],
              },
            ],
          },
        },
      })
      .catch(() => {});
  });
  return {
    posts,
    errors,
    fail: () => {
      failNext = true;
    },
    hold: () => {
      holdNext = true;
    },
    release: () => {
      release?.();
      release = null;
    },
  };
}

test("image file import keeps its resolution and background recognition does not switch the new source", async ({
  page,
}) => {
  const mock = await mockAi(page);
  await page.goto("/");
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 512, 768);
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.fillText("125 + 348 =", 50, 200);
    return canvas.toDataURL("image/png");
  });
  const payload = {
    name: "imported-source.png",
    mimeType: "image/png",
    buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
  };
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles(payload);
  const sourceImage = page.getByRole("img", {
    name: "imported-source.png, 1쪽 원본",
    exact: true,
  });
  await expect(sourceImage).toBeVisible();
  expect(
    await sourceImage.evaluate((image: HTMLImageElement) => [
      image.naturalWidth,
      image.naturalHeight,
    ]),
  ).toEqual([512, 768]);
  expect(mock.posts).toHaveLength(0);
  mock.hold();
  await page.getByRole("button", { name: "페이지 자동 인식" }).click();
  await expect.poll(() => mock.posts.length).toBe(1);
  await page
    .getByLabel("PDF 또는 이미지 파일 가져오기")
    .setInputFiles({ ...payload, name: "replacement.png" });
  mock.release();
  await expect(
    page.getByRole("img", { name: "replacement.png, 1쪽 원본", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "AI 작업 취소" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "문제 내용" }),
  ).not.toBeVisible();
  expect(mock.errors).toEqual([]);
});

test("page detection, editable OCR, solution retry, source retention, cancel and restart", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const mock = await mockAi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "페이지 자동 인식" }),
  ).toBeEnabled();
  expect(mock.posts).toHaveLength(0);
  await page.getByRole("button", { name: "페이지 자동 인식" }).click();
  await expect(page.getByRole("textbox", { name: "문제 내용" })).toHaveValue(
    content,
  );
  await expect(
    page.getByRole("radio", { name: "원본 이미지", exact: true }),
  ).toBeChecked();
  const dimensions = await page
    .getByRole("img", { name: "검수할 자른 원본 문제" })
    .evaluate((image: HTMLImageElement) => [
      image.naturalWidth,
      image.naturalHeight,
    ]);
  expect(dimensions).toEqual([1008, 232]);
  await page
    .getByRole("textbox", { name: "문제 내용" })
    .fill("검수한 문제 내용");
  mock.fail();
  await page.getByRole("button", { name: "해설 생성", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("도구 응답 지연");
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "풀이" })).toHaveValue(
    "1을 더해서 구합니다.",
  );
  expect(mock.posts.at(-1)).toMatchObject({
    action: "solution",
    content: "검수한 문제 내용",
    grade: "초5",
  });
  expect(
    mock.posts.at(-1)?.imageDataUrl?.startsWith("data:image/png;base64,"),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("studio-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "2문항 담기", exact: true }).click();
  const added = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent()) ?? "[]",
  );
  expect(added).toHaveLength(2);
  expect(
    added.every((problem: { croppedImage: string }) =>
      problem.croppedImage.startsWith("data:image/png;base64,"),
    ),
  ).toBe(true);

  mock.hold();
  await page.getByRole("button", { name: "문제 다시 읽기" }).click();
  await expect(
    page.getByRole("button", { name: "AI 작업 취소" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "문제 내용" })
    .fill("요청 중 직접 수정");
  mock.release();
  await expect(
    page.getByRole("button", { name: "AI 작업 취소" }),
  ).not.toBeVisible();
  await expect(page.getByRole("textbox", { name: "문제 내용" })).toHaveValue(
    "요청 중 직접 수정",
  );

  mock.hold();
  await page.getByRole("button", { name: "문제 다시 읽기" }).click();
  await expect(
    page.getByRole("button", { name: "AI 작업 취소" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새로 시작", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "취소", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "AI 작업 취소" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새로 시작", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "새로 시작", exact: true })
    .click();
  mock.release();
  await expect(
    page.getByRole("button", { name: "예제로 시작", exact: true }),
  ).toBeVisible();
  expect(
    JSON.parse(
      (await page.getByLabel("시험지 담은 문제").textContent()) ?? "[]",
    ),
  ).toHaveLength(2);
  expect(mock.errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("studio-reset.png"),
    fullPage: true,
  });
});

test("mobile manual crop, compact controls, focus/panel toggles and fraction preview", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mock = await mockAi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await page
    .getByRole("button", { name: "키보드로 영역 지정", exact: true })
    .click();
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await area.press("ArrowRight");
  await area.press("Enter");
  await expect(
    page.getByRole("img", { name: "검수할 자른 원본 문제" }),
  ).toBeVisible();
  expect(mock.posts).toHaveLength(0);
  await page.getByRole("button", { name: "문자 인식", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "문제 내용" })).toHaveValue(
    content,
  );
  await page.getByRole("radio", { name: "입력한 텍스트" }).check();
  await page
    .getByRole("button", { name: "출력 미리보기", exact: true })
    .click();
  await expect(page.locator("article annotation").first()).toContainText(
    String.raw`2\dfrac{1}{3}`,
  );
  await expect(page.getByRole("textbox", { name: "문제 내용" })).toHaveValue(
    content,
  );
  await page
    .getByRole("combobox", { name: "시험지 학년", exact: true })
    .selectOption("중1");
  await expect(page.locator("article annotation").first()).toContainText(
    String.raw`\dfrac{7}{3}`,
  );
  await page.getByRole("button", { name: "검수 패널 접기" }).click();
  await expect(
    page.getByRole("complementary", { name: "자른 문제 검수" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "검수 패널 열기" }).click();
  await page.getByRole("button", { name: "작업 영역 확대" }).click();
  await page.getByRole("button", { name: "확대 종료" }).press("Escape");
  await expect(
    page.getByRole("button", { name: "작업 영역 확대" }),
  ).toBeVisible();
  const sizing = await page
    .getByRole("button", { name: "페이지 자동 인식" })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        height: button.getBoundingClientRect().height,
        font: style.fontSize,
        radius: style.borderRadius,
      };
    });
  expect(sizing).toEqual({ height: 44, font: "14px", radius: "8px" });
  expect(
    await page
      .getByRole("button", { name: "페이지 자동 인식" })
      .evaluate((button) => button.scrollWidth <= button.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(mock.errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("studio-mobile.png"),
    fullPage: true,
  });
});

test("page recognition blocks manual selection, restores it after cancel/error/success, and right click cancels only the pending rectangle", async ({
  page,
}) => {
  const mock = await mockAi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  const recognize = page.getByRole("button", { name: "페이지 자동 인식" });
  const save = page.getByRole("button", {
    name: "선택 영역 자르기",
    exact: true,
  });
  const keyboard = page.getByRole("button", {
    name: "키보드로 영역 지정",
    exact: true,
  });
  await keyboard.click();
  await expect(save).toBeEnabled();
  const pending = area.getByText("선택 영역", { exact: true }).locator("..");
  const before = await pending.getAttribute("style");
  mock.hold();
  await recognize.click();
  await expect.poll(() => mock.posts.length).toBe(1);
  await expect(area).toHaveCSS("cursor", "progress");
  await expect(save).toBeDisabled();
  await expect(keyboard).toBeDisabled();
  // DOM keyboard events still reach an aria-disabled group; guard the handlers too.
  await area.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  const bounds = (await area.boundingBox())!;
  await page.mouse.move(bounds.x + 20, bounds.y + 30);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + 110);
  await page.mouse.up();
  await expect(pending).toHaveAttribute("style", before!);
  await expect(
    page.getByRole("img", { name: "검수할 자른 원본 문제" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "AI 작업 취소" }).click();
  mock.release();
  await expect(area).toHaveCSS("cursor", "crosshair");
  await expect(save).toBeEnabled();
  await expect(pending).toHaveAttribute("style", before!);
  await area.click({ button: "right", position: { x: 40, y: 50 } });
  await expect(pending).toHaveCount(0);
  await expect(save).toBeDisabled();
  // Right-click while the left button is held must release the drag, even on later movement.
  await page.mouse.move(bounds.x + 20, bounds.y + 30);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + 110);
  await page.mouse.click(bounds.x + 100, bounds.y + 110, { button: "right" });
  await page.mouse.move(bounds.x + 150, bounds.y + 140);
  await page.mouse.up();
  await expect(pending).toHaveCount(0);
  mock.fail();
  await recognize.click();
  await expect(page.getByRole("alert")).toContainText("도구 응답 지연");
  await expect(area).toHaveCSS("cursor", "crosshair");
  await recognize.click();
  await expect(page.getByRole("textbox", { name: "문제 내용" })).toHaveValue(
    content,
  );
  await expect(area).toHaveCSS("cursor", "default");
  await keyboard.click();
  await area.click({ button: "right", position: { x: 40, y: 50 } });
  await expect(pending).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "2문항 담기", exact: true }),
  ).toBeEnabled();
  expect(mock.errors).toEqual([]);
});

test("problem and inner figure review edits source pixels, supports sequential review and keeps figures in text export", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1440, height: 923 });
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await page
    .getByRole("combobox", { name: "원본 확대 비율" })
    .selectOption("0");
  await page.getByRole("button", { name: "페이지 자동 인식" }).click();
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  const problems = area.locator('[data-crop-kind="problem"]');
  const figures = area.locator('[data-crop-kind="figure"]');
  await expect(problems).toHaveCount(2);
  await expect(figures).toHaveCount(1);
  const problem = problems.nth(1);
  await problem.click({ position: { x: 12, y: 30 } });
  await expect(problem).toHaveAttribute("aria-pressed", "true");
  const imageBefore = await page
    .getByRole("img", { name: "검수할 자른 원본 문제" })
    .getAttribute("src");
  const rectBefore = await problem.getAttribute("style");
  const bounds = (await problem.boundingBox())!;
  await page.mouse.move(bounds.x + 15, bounds.y + 35);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 23, bounds.y + 43);
  await page.mouse.up();
  await expect(problem).not.toHaveAttribute("style", rectBefore!);
  await expect(
    page.getByRole("img", { name: "검수할 자른 원본 문제" }),
  ).not.toHaveAttribute("src", imageBefore!);
  // Cancelling a second drag preserves the last committed image and rectangle.
  const committedRect = await problem.getAttribute("style");
  const movedBounds = (await problem.boundingBox())!;
  await page.mouse.move(movedBounds.x + 15, movedBounds.y + 35);
  await page.mouse.down();
  await page.mouse.move(movedBounds.x + 30, movedBounds.y + 45);
  await page.mouse.click(movedBounds.x + 30, movedBounds.y + 45, {
    button: "right",
  });
  await page.mouse.up();
  await expect(problem).toHaveAttribute("style", committedRect!);
  const figure = figures.first();
  await figure.click();
  const handle = figure.locator('[data-corner="se"]');
  const handleBounds = (await handle.boundingBox())!;
  await page.mouse.move(
    handleBounds.x + handleBounds.width / 2,
    handleBounds.y + handleBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    movedBounds.x + movedBounds.width + 35,
    movedBounds.y + movedBounds.height + 35,
  );
  await page.mouse.up();
  const resized = (await figure.boundingBox())!;
  const parent = (await problem.boundingBox())!;
  expect(resized.x + resized.width).toBeLessThanOrEqual(
    parent.x + parent.width + 1,
  );
  expect(resized.y + resized.height).toBeLessThanOrEqual(
    parent.y + parent.height + 1,
  );
  await page.getByRole("button", { name: "도형 추가", exact: true }).click();
  await area.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(figures).toHaveCount(2);
  await expect(problems).toHaveCount(2);
  await page.getByRole("button", { name: "도형 2 삭제", exact: true }).click();
  await expect(figures).toHaveCount(1);
  await page
    .getByRole("button", { name: "그림 다시 찾기", exact: true })
    .click();
  await expect.poll(() => mock.posts.at(-1)?.action).toBe("figures");
  await expect(figures).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "문제 내용" })).toHaveValue(
    "직사각형의 넓이를 구하세요.",
  );
  await page.screenshot({
    path: testInfo.outputPath("studio-box-review.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "영역 확인 · 문항 검수", exact: true })
    .click();
  const nav = page.getByLabel("문항 검수 이동");
  await expect(nav).toContainText("문제 1 / 2");
  await expect(
    page.getByRole("button", { name: "이전 문제 검수" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "검수 완료 · 다음", exact: true })
    .click();
  await expect(nav).toContainText("문제 2 / 2");
  await expect(nav).toContainText("1문항 검수 완료");
  await expect(
    page.getByRole("button", { name: "다음 문제 검수" }),
  ).toBeDisabled();
  await page.getByRole("radio", { name: "입력한 텍스트" }).check();
  await page.getByRole("button", { name: "검수 완료", exact: true }).click();
  await expect(nav).toContainText("2문항 검수 완료");
  await page
    .getByRole("textbox", { name: "문제 내용" })
    .fill("도형을 보고 넓이를 구하세요.");
  await expect(nav).toContainText("1문항 검수 완료");
  await page.getByRole("button", { name: "2문항 담기", exact: true }).click();
  const added = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent()) ?? "[]",
  );
  expect(added[1].figureUrls).toHaveLength(1);
  expect(added[1].figureUrls[0]).toMatch(/^data:image\/png;base64,/);
  expect(added[1].content).toBe("도형을 보고 넓이를 구하세요.");
  expect(added[1].croppedImage).toBeUndefined();
  expect(mock.errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("studio-sequential-review.png"),
    fullPage: true,
  });
});
