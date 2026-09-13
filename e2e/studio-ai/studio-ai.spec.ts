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

test("image file import keeps its resolution and a new source fences page recognition", async ({
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
  await page.getByRole("button", { name: "중·고등", exact: true }).click();
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
