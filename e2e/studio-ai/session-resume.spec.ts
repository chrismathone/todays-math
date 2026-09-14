import { expect, test } from "@playwright/test";

test("뒤집힌 페이지는 한 번만 자동 회전하며 재인식 완료 상태를 복원한다", async ({
  page,
}) => {
  const pageImages: string[] = [];
  let ocrCount = 0;
  await page.route("**/api/dev/unified/ai", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          enabled: true,
          mode: "subscription-cli",
          defaultProvider: "codex",
          providers: [
            {
              id: "codex",
              label: "Codex",
              status: "ready",
              detail: "연결됨",
              image: true,
            },
          ],
        },
      });
      return;
    }
    const input = route.request().postDataJSON();
    if (input.action === "page-ocr") pageImages.push(input.imageDataUrl);
    else ocrCount++;
    await route.fulfill({
      json: {
        action: input.action,
        provider: input.provider,
        result:
          input.action === "page-ocr"
            ? {
                content: "",
                answer: "",
                solution: "",
                warnings: [],
                detectionOnly: true,
                problems: [
                  {
                    content: "",
                    answer: "",
                    number: 1,
                    bbox: { left: 80, top: 180, width: 840, height: 145 },
                  },
                ],
              }
            : {
                content: "방향을 확인한 문제 $2+3$",
                answer: "5",
                solution: "",
                warnings: [],
                figures: [],
                upsideDown: ocrCount === 1,
              },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await page
    .getByRole("button", { name: "페이지 자동 인식", exact: true })
    .click();
  await expect.poll(() => ocrCount).toBe(2);
  await expect(
    page.getByText("인식 1 / 1쪽 완료", { exact: true }),
  ).toBeVisible();
  expect(pageImages).toHaveLength(2);
  expect(pageImages[0]).not.toBe(pageImages[1]);
  await page.getByRole("button", { name: /^OCR · 디지털화 1/ }).click();
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "문제 1 인식 결과", exact: true }),
  ).toContainText("방향을 확인한 문제");
  await expect(
    page.getByText("인식 1 / 1쪽 완료", { exact: true }),
  ).toBeVisible();
  expect(ocrCount).toBe(2);
  expect(pageImages).toHaveLength(2);
});

test("수동 90도 회전한 원본 크기와 방향을 새로고침 뒤 유지한다", async ({
  page,
}) => {
  await page.route("**/api/dev/unified/ai", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await page.getByRole("button", { name: "현재 페이지 90도 회전" }).click();
  const original = page.locator('img[alt$="1쪽 원본"]');
  await expect
    .poll(() =>
      original.evaluate((image: HTMLImageElement) => [
        image.naturalWidth,
        image.naturalHeight,
      ]),
    )
    .toEqual([1600, 1200]);
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.reload();
  await expect
    .poll(() =>
      original.evaluate((image: HTMLImageElement) => [
        image.naturalWidth,
        image.naturalHeight,
      ]),
    )
    .toEqual([1600, 1200]);
});

test("보관한 문제 크롭을 독립 원본으로 다시 열어 편집하고 복원한다", async ({
  page,
}) => {
  await page.route("**/api/dev/unified/ai", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await page
    .getByRole("combobox", { name: "원본 확대 비율" })
    .selectOption("0");
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  const box = (await area.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.35);
  await page.mouse.up();
  await expect(area.locator('[data-crop-kind="problem"]')).toHaveCount(1);
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.evaluate(async () => {
    const crops = await new Promise<unknown[]>((resolve, reject) => {
      const request = indexedDB.open("today-math-studio-v1", 1);
      request.onsuccess = () => {
        const db = request.result;
        const read = db
          .transaction("session")
          .objectStore("session")
          .get("active");
        read.onsuccess = () => {
          resolve(read.result.data.crops);
          db.close();
        };
        read.onerror = () => {
          reject(read.error);
          db.close();
        };
      };
      request.onerror = () => reject(request.error);
    });
    sessionStorage.setItem("studio-test-archive", JSON.stringify(crops));
  });
  await page.getByRole("button", { name: "새로 시작", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "새로 시작", exact: true })
    .click();
  await page.getByRole("button", { name: "보관한 원본 다시 열기" }).click();
  const card = page.getByRole("article", {
    name: "문제 1 인식 결과",
    exact: true,
  });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "내용 수정", exact: true }).click();
  await card
    .getByRole("textbox", { name: "문제 내용" })
    .fill("보관함에서 재편집한 문제 $1+1$");
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.reload();
  await expect(card).toContainText("보관함에서 재편집한 문제");
  const restoredImage = page.getByRole("img", {
    name: "1쪽 검수 원본",
    exact: true,
  });
  await expect(restoredImage).toBeVisible();
  expect(
    await restoredImage.evaluate(
      (image: HTMLImageElement) => image.naturalWidth,
    ),
  ).toBeLessThan(1200);
});

test("원본·OCR 수정·검수 위치를 새로고침 뒤 복원하고 새로 시작하면 제거한다", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/dev/unified/ai", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          enabled: true,
          mode: "subscription-cli",
          defaultProvider: "codex",
          providers: [
            {
              id: "codex",
              label: "Codex",
              status: "ready",
              detail: "연결됨",
              image: true,
            },
          ],
        },
      });
      return;
    }
    calls++;
    const input = route.request().postDataJSON();
    await route.fulfill({
      json: {
        action: input.action,
        provider: input.provider,
        result: {
          content: "",
          answer: "",
          solution: "",
          warnings: [],
          problems: [
            {
              content: "$2+3$의 값을 구하시오.",
              answer: "5",
              questionType: "short-answer",
              bbox: { left: 80, top: 180, width: 840, height: 145 },
              figures: [],
            },
          ],
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
  await page
    .getByRole("button", { name: "페이지 자동 인식", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^OCR · 디지털화 1/ }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /^OCR · 디지털화 1/ }).click();
  const card = page.getByRole("article", {
    name: "문제 1 인식 결과",
    exact: true,
  });
  await card.getByRole("button", { name: "내용 수정", exact: true }).click();
  await card
    .getByRole("textbox", { name: "문제 내용" })
    .fill("검수한 원문 $2+3$의 값은?");
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.reload();
  await expect(card).toContainText("검수한 원문");
  await expect(card).toContainText("5");
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "새로 시작", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "새로 시작", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "예제로 시작", exact: true }),
  ).toBeVisible();
  await expect(card).toHaveCount(0);
  expect(calls).toBe(1);
});

test("파일 원본 Blob을 복원하며 다른 창의 최신 학년을 덮어쓰지 않는다", async ({
  page,
  context,
}) => {
  await context.route("**/api/dev/unified/ai", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        mode: "subscription-cli",
        defaultProvider: "codex",
        providers: [],
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "예제로 시작", exact: true }),
  ).toBeEnabled();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 480, 640);
    ctx.fillStyle = "black";
    ctx.font = "24px sans-serif";
    ctx.fillText("SOURCE 123", 40, 80);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: "saved-source.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  const image = page.getByRole("img", {
    name: "saved-source.png, 1쪽 원본",
    exact: true,
  });
  await expect(image).toBeVisible();
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByRole("img", {
      name: "saved-source.png, 1쪽 원본",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    second.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await page.getByRole("combobox", { name: "시험지 학년" }).selectOption("중2");
  await expect(
    page.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장됨");
  await second
    .getByRole("combobox", { name: "시험지 학년" })
    .selectOption("초4");
  await expect(
    second.getByRole("status", { name: "자료 제작 저장 상태" }),
  ).toHaveText("저장 실패");
  await expect(
    second.getByText(/다른 창에서 자료 제작 작업이 변경/),
  ).toBeVisible();
  second.on("dialog", (dialog) => dialog.accept());
  await second.reload();
  await expect(
    second.getByRole("combobox", { name: "시험지 학년" }),
  ).toHaveValue("중2");
  await expect(
    second.getByRole("img", {
      name: "saved-source.png, 1쪽 원본",
      exact: true,
    }),
  ).toBeVisible();
});
