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
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><circle cx="180" cy="140" r="80" fill="none" stroke="black" stroke-width="2"/><line x1="40" y1="140" x2="340" y2="140" stroke="black"/></svg>',
            content,
            answer: String.raw`$\frac{10}{3}$`,
            solution: "1을 더해서 구합니다.",
            detectedGrade: {
              grade: "초5",
              confidence: "high",
              evidence: "초등학교 5학년 예제",
            },
            warnings: ["그림과 보기를 원본과 확인하세요."],
            figures: [
              { bbox: { left: 200, top: 200, width: 300, height: 400 } },
            ],
            problems: [
              {
                content,
                questionType: "short-answer",
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

async function sample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "예제로 시작", exact: true }).click();
}
async function detect(page: Page) {
  await page
    .getByRole("button", { name: "페이지 자동 인식", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "다음: OCR · 디지털화", exact: true }),
  ).toBeEnabled();
}
async function review(page: Page) {
  await page.getByRole("button", { name: /^OCR · 디지털화 \d/ }).click();
  await expect(page.getByLabel("원본과 인식 결과 비교")).toBeVisible();
}
const card = (page: Page, number: number) =>
  page.getByRole("article", { name: `문제 ${number} 인식 결과`, exact: true });

test("wide rendered review, scoped solution retry, edit guards and restart", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await sample(page);
  await detect(page);
  await review(page);
  const first = card(page, 1);
  await expect(first.locator(".katex").first()).toBeVisible();
  await expect(first.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "시험지 학년" })).toHaveValue(
    "auto",
  );
  // 자동 인식이 선 학년은 조용히 학년만 적는다(원장님 2026-09-21 ⑺ — «(자동 인식)» 은 뺐다).
  // 직접 고르는 목록에도 «초5» 가 있으므로 auto 칸을 값으로 집는다.
  await expect(page.locator('option[value="auto"]')).toHaveText("초5");
  await expect(page.locator("[data-grade]")).toHaveAttribute(
    "data-grade",
    "quiet",
  );
  await first.getByRole("button", { name: "내용 수정", exact: true }).click();
  await first
    .getByRole("textbox", { name: "문제 내용" })
    .fill("검수한 문제 내용");
  await expect(
    first.getByRole("button", { name: "해설 생성", exact: true }),
  ).toBeDisabled();
  await first.getByRole("button", { name: "저장", exact: true }).click();
  mock.fail();
  await first.getByRole("button", { name: "해설 생성", exact: true }).click();
  await expect(first.getByRole("alert")).toContainText("도구 응답 지연");
  await first.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(first).toContainText("1을 더해서 구합니다.");
  expect(mock.posts.at(-1)).toMatchObject({
    action: "solution",
    content: "검수한 문제 내용",
    grade: "초5",
  });
  await page.getByRole("button", { name: "2문항 담기", exact: true }).click();
  expect(
    JSON.parse((await page.getByLabel("시험지 담은 문제").textContent())!),
  ).toHaveLength(2);
  mock.hold();
  await first.getByRole("button", { name: "다시 인식", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "취소", exact: true }),
  ).toBeVisible();
  await expect(
    first.getByRole("button", { name: "내용 수정", exact: true }),
  ).toBeDisabled();
  await first.getByRole("button", { name: "취소", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "취소", exact: true }),
  ).not.toBeVisible();
  await first.getByRole("button", { name: "내용 수정", exact: true }).click();
  await first
    .getByRole("textbox", { name: "문제 내용" })
    .fill("요청 취소 후 직접 수정");
  await first.getByRole("button", { name: "저장", exact: true }).click();
  mock.release();
  await expect(first).toContainText("요청 취소 후 직접 수정");
  await page.screenshot({
    path: testInfo.outputPath("wide-rendered-review.png"),
    fullPage: true,
  });
  mock.hold();
  await first.getByRole("button", { name: "다시 인식", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "취소", exact: true }),
  ).toBeVisible();
  // 확인 대화상자는 이름으로 잡는다 — 검수는 확대로 들어와(시안 B) 작업실 자체가 role="dialog" 라,
  // 이름 없이 찾으면 카드의 «취소»·띠의 «새로 시작»까지 같이 잡힌다.
  const restartDialog = page.getByRole("dialog", { name: "새로 시작할까요?" });
  await page.getByRole("button", { name: "새로 시작", exact: true }).click();
  await restartDialog
    .getByRole("button", { name: "취소", exact: true })
    .click();
  await expect(
    first.getByRole("button", { name: "취소", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "새로 시작", exact: true }).click();
  await restartDialog
    .getByRole("button", { name: "새로 시작", exact: true })
    .click();
  mock.release();
  await expect(
    page.getByRole("button", { name: "예제로 시작", exact: true }),
  ).toBeVisible();
  expect(mock.errors).toEqual([]);
});

test("continuous drag saves each region, selection deletion and right-click cancel", async ({
  page,
}) => {
  const mock = await mockAi(page);
  await sample(page);
  await page
    .getByRole("combobox", { name: "원본 확대 비율" })
    .selectOption("0");
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  const box = (await area.boundingBox())!;
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(
      box.x + box.width * 0.1,
      box.y + box.height * (0.2 + i * 0.2),
    );
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width * 0.65,
      box.y + box.height * (0.3 + i * 0.2),
    );
    await page.mouse.up();
    await expect(area.locator('[data-crop-kind="problem"]')).toHaveCount(i + 1);
  }
  await area.click({ position: { x: box.width * 0.2, y: box.height * 0.23 } });
  const selected = area.locator(
    '[data-crop-kind="problem"][aria-pressed="true"]',
  );
  await selected.getByRole("button", { name: /영역 삭제/ }).click();
  await expect(area.locator('[data-crop-kind="problem"]')).toHaveCount(2);
  await page.getByRole("button", { name: "문제 추가", exact: true }).click();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.3);
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.3, {
    button: "right",
  });
  await page.mouse.up();
  await expect(area.getByText("선택 영역", { exact: true })).toHaveCount(0);
  await expect(area.locator('[data-crop-kind="problem"]')).toHaveCount(2);
  expect(mock.posts).toHaveLength(0);
  expect(mock.errors).toEqual([]);
});

test("problem OCR continues through selecting another problem and crop/review navigation", async ({
  page,
}) => {
  const mock = await mockAi(page);
  await sample(page);
  await detect(page);
  await review(page);
  mock.hold();
  await card(page, 1)
    .getByRole("button", { name: "다시 인식", exact: true })
    .click();
  await expect(
    card(page, 1).getByRole("button", { name: "취소", exact: true }),
  ).toBeVisible();
  await card(page, 2)
    .getByRole("button", { name: "문제 2", exact: true })
    .click();
  await card(page, 2)
    .getByRole("button", { name: "다시 인식", exact: true })
    .click();
  await expect
    .poll(() => mock.posts.filter((p) => p.action === "ocr").length)
    .toBe(2);
  await page
    .getByRole("button", { name: "문제&도형 잘라내기", exact: true })
    .click();
  await review(page);
  await expect(
    card(page, 1).getByRole("button", { name: "취소", exact: true }),
  ).toBeVisible();
  mock.release();
  await expect(
    card(page, 1).getByRole("button", { name: "취소", exact: true }),
  ).not.toBeVisible();
  await expect(card(page, 1).locator(".katex").first()).toBeVisible();
  expect(mock.errors).toEqual([]);
});

test("manual mobile crop, mixed fraction only for elementary grades, and no horizontal overflow", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  await page.getByRole("combobox", { name: "시험지 학년" }).selectOption("초5");
  await page
    .getByRole("button", { name: "키보드로 영역 지정", exact: true })
    .click();
  await page.getByRole("group", { name: "문제 자르기 영역" }).press("Enter");
  await expect(
    page.getByRole("img", { name: "검수할 자른 원본 문제" }),
  ).toBeVisible();
  await review(page);
  await card(page, 1)
    .getByRole("button", { name: "문자 인식", exact: true })
    .click();
  // 가짜 OCR 원문은 \frac{7}{3}. 대분수는 초등만(트랙 12·14 확정, `fractionDisplay.ts`) — 초5 는 2⅓,
  // 중1 로 바꾸면 원문 7/3 으로 돌아온다.
  await expect(card(page, 1).locator(".katex").first()).toHaveAttribute(
    "data-export-tex",
    /2%5Cd?frac%7B1%7D%7B3%7D/,
  );
  await page.getByRole("combobox", { name: "시험지 학년" }).selectOption("중1");
  await expect(card(page, 1).locator(".katex").first()).toHaveAttribute(
    "data-export-tex",
    /%5Cd?frac%7B7%7D%7B3%7D/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-review.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "문제&도형 잘라내기", exact: true })
    .click();
  await page.getByRole("button", { name: "검수 패널 접기" }).click();
  await expect(
    page.getByRole("complementary", { name: "자른 문제 검수" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "검수 패널 열기" }).click();
  await page.getByRole("button", { name: "편집창 확대", exact: true }).click();
  await page
    .getByRole("button", { name: "편집창 축소", exact: true })
    .press("Escape");
  expect(mock.errors).toEqual([]);
});

// 원장님 2026-09-19 «축소 확대 버튼을 눈에 잘 띄도록 [검수 완료 · 다음] 색상 맞춰주고» — jsdom 은 CSS 를 안 돌아,
// 클래스가 같아도 위 띠의 단추 규칙(흰 바탕·눌림 색)이 그 색을 덮는지는 못 본다. 계산된 모양을 여기서 잰다.
test("edit-window zoom button is painted like the review next button in both states", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1680, height: 920 });
  await sample(page);
  await detect(page);
  await review(page);
  const band = page.locator("[data-studio-band]");
  const look = (button: ReturnType<Page["getByRole"]>) =>
    button.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        border: `${style.borderTopWidth} ${style.borderTopColor}`,
        radius: style.borderTopLeftRadius,
        weight: style.fontWeight,
        size: style.fontSize,
        shadow: style.boxShadow,
      };
    });
  // 마우스가 단추 위에 남으면 hover 색으로 잰다 — 빈 가장자리로 치우고, 색 전환(0.15s)은 poll 로 기다린다.
  const settle = () => page.mouse.move(2, 918);
  /*
   * 견주던 «검수 완료 · 다음»은 없앴다(원장님 2026-09-21 ⑹). 기준을 값으로 못 박는다 —
   * 빈 값끼리 같아서 초록이 되지 않게 파란 바탕·흰 글자를 함께 적는다. 이 시험이 무는 것은
   * 띠 단추 규칙(흰 바탕·눌림 색)이 채운 단추의 색을 덮는 경우다.
   */
  // 검수는 확대로 들어온다(시안 B) — 확대 중.
  const zoomOut = band.getByRole("button", {
    name: "편집창 축소",
    exact: true,
  });
  await expect(zoomOut).toHaveAttribute("aria-pressed", "true");
  await settle();
  const expected = await look(zoomOut);
  expect(expected.background).toBe("rgb(49, 89, 223)");
  expect(expected.color).toBe("rgb(255, 255, 255)");
  expect(expected.border).toBe("1px rgb(49, 89, 223)");
  await band.screenshot({ path: testInfo.outputPath("zoom-band-focus.png") });

  // 확대 전.
  await zoomOut.click();
  await settle();
  const zoomIn = band.getByRole("button", { name: "편집창 확대", exact: true });
  await expect(zoomIn).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => look(zoomIn)).toEqual(expected);
  await band.screenshot({ path: testInfo.outputPath("zoom-band.png") });

  // 잘라내기 단계도 같은 띠의 같은 단추다.
  await page
    .getByRole("button", { name: "문제&도형 잘라내기", exact: true })
    .click();
  await settle();
  await expect
    .poll(() =>
      look(band.getByRole("button", { name: "편집창 확대", exact: true })),
    )
    .toEqual(expected);
  expect(mock.errors).toEqual([]);
});

// 원장님 2026-09-21 «파일명을 그만큼 공간에 배정» — 쪽 이동과 전체 작업 셋이 둘째 줄로 내려간 자리를
// 파일 이름이 쓴다(기본 200px, 남으면 460px 까지). 2026-09-19 의 108px 은 그 셋이 제목 줄에 함께 있을 때의
// 값이었다. 제목 줄이 한 줄로 남는지는 그때와 같은 폭 1516 에서 잰다 — jsdom 은 flex 줄바꿈을 안 돈다.
test("review band stays on one row with a wider file picker", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1516, height: 920 });
  await sample(page);
  await detect(page);
  await review(page);
  const band = page.locator("[data-studio-band]");
  const studio = page.locator('section[aria-label="문제 제작 스튜디오"]');
  const picker = band.getByRole("combobox", { name: "원본 파일", exact: true });
  const basis = () =>
    picker.evaluate(
      (select) => getComputedStyle(select.parentElement!).flexBasis,
    );
  const height = () => band.evaluate((element) => element.offsetHeight);
  const bandVar = () =>
    studio.evaluate((element) =>
      element.style.getPropertyValue("--studio-band-height"),
    );
  expect(await basis()).toBe("200px");
  // 검수 확대 중
  await expect.poll(height).toBe(44);
  // 검수 확대 풀림 — 두 줄이던 자리
  await band.getByRole("button", { name: "편집창 축소", exact: true }).click();
  await expect(
    band.getByRole("button", { name: "편집창 확대", exact: true }),
  ).toBeVisible();
  expect(await basis()).toBe("200px");
  await expect.poll(height).toBe(44);
  await expect.poll(bandVar).toBe("44px");
  // 칸이 좁아 파일 이름이 잘려도 title 로 다 보인다
  const name = await picker.evaluate(
    (select: HTMLSelectElement) => select.selectedOptions[0]?.text,
  );
  expect(name).toBeTruthy();
  await expect(picker).toHaveAttribute("title", name!);
  const fit = await picker.evaluate((select: HTMLSelectElement) => {
    const style = getComputedStyle(select);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const text = select.selectedOptions[0]?.text ?? "";
    const inner =
      select.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    let shown = 0;
    while (
      shown < text.length &&
      context.measureText(text.slice(0, shown + 1)).width <= inner
    )
      shown++;
    return {
      전체글자: text.length,
      보이는글자: shown,
      글자자리: Math.round(inner),
    };
  });

  console.log("[파일 이름 칸]", JSON.stringify(fit));
  expect(fit.보이는글자).toBeGreaterThan(0);
  await band.screenshot({ path: testInfo.outputPath("band-name.png") });
  expect(mock.errors).toEqual([]);
});

test("recognized figure is visible beside rendered text and exported with text mode", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1440, height: 923 });
  await sample(page);
  await detect(page);
  await expect(
    page
      .getByRole("group", { name: "문제 자르기 영역" })
      .locator('[data-crop-kind="figure"]'),
  ).toHaveCount(1);
  await review(page);
  const second = card(page, 2);
  await expect(
    second.getByRole("button", { name: /^그림 1 편집/ }),
  ).toBeVisible();
  // SVG 가 끝난 도형은 도형 줄에 아무것도 안 남는다(2026-09-19) — 본문 그림이 SVG 로 그려졌는지 본다.
  await expect(second.locator('[data-figure-index="0"] svg')).toBeVisible();
  await expect(second.getByText(/SVG 미생성/)).toHaveCount(0);
  await second
    .getByRole("combobox", { name: "문제 2 출력 방식" })
    .selectOption("text");
  await second.getByRole("button", { name: "내용 수정", exact: true }).click();
  await second
    .getByRole("textbox", { name: "문제 내용" })
    .fill("도형을 보고 넓이를 구하세요.");
  await second.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("button", { name: "2문항 담기", exact: true }).click();
  const added = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent())!,
  );
  expect(added[1].figureUrls).toHaveLength(1);
  expect(added[1].croppedImage).toBeUndefined();
  expect(added[1].content).toBe("도형을 보고 넓이를 구하세요.");
  expect(mock.errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("figure-review.png"),
    fullPage: true,
  });
});

test("crop next stage digitizes text and diagrams before exporting without output-mode setup", async ({
  page,
}) => {
  const mock = await mockAi(page);
  await sample(page);
  await page
    .getByRole("button", { name: "키보드로 영역 지정", exact: true })
    .click();
  await page.getByRole("group", { name: "문제 자르기 영역" }).press("Enter");
  expect(mock.posts).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "담고 내보내기", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "다음: OCR · 디지털화", exact: true })
    .click();
  const first = card(page, 1);
  // SVG 가 끝난 도형은 도형 줄에 아무것도 안 남는다(2026-09-19) — 본문 그림이 SVG 로 그려졌는지 본다.
  await expect(first.locator('[data-figure-index="0"] svg')).toBeVisible();
  await expect(first.getByText(/SVG 미생성/)).toHaveCount(0);
  await expect(
    first.getByRole("combobox", { name: "문제 1 출력 방식" }),
  ).toHaveValue("text");
  expect(mock.posts.map((post) => post.action)).toEqual([
    "ocr",
    "figure-redraw",
  ]);
  await page.getByRole("button", { name: "1문항 담기", exact: true }).click();
  const [problem] = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent())!,
  );
  expect(problem.croppedImage).toBeUndefined();
  expect(problem.content).toBe(content);
  expect(problem.figureUrls[0]).toMatch(/^data:image\/svg\+xml/);
  expect(mock.errors).toEqual([]);
});

test("Mathgen figure editor redraw, manual geometry, save and reopen through Studio", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await sample(page);
  await detect(page);
  await review(page);
  const second = card(page, 2);
  await second.getByRole("button", { name: /^그림 1 편집/ }).click();
  const editor = page.getByRole("dialog", { name: "도형 2-1 편집기" });
  await expect(editor).toBeVisible({ timeout: 15000 });
  await expect(
    editor.getByRole("img", { name: "도형 원본", exact: true }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "원본으로 다시 그리기", exact: true })
    .click();
  const circle = editor.locator("#figure-editor-canvas circle");
  await expect(circle).toHaveCount(1);
  expect(mock.posts.at(-1)?.action).toBe("figure-redraw");
  await editor.getByRole("button", { name: "사각형", exact: true }).click();
  const bounds = (await editor
    .getByLabel("도형 편집 캔버스", { exact: true })
    .boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.4,
    bounds.y + bounds.height * 0.4,
  );
  await page.mouse.up();
  await expect(
    editor.locator("#figure-editor-canvas rect[data-object-id]"),
  ).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("mathgen-figure-editor.png"),
  });
  await editor.getByRole("button", { name: "도형 적용", exact: true }).click();
  await expect(editor).not.toBeVisible();
  // SVG 가 끝난 도형은 도형 줄에 아무것도 안 남는다(2026-09-19) — 본문 그림이 SVG 로 그려졌는지 본다.
  await expect(second.locator('[data-figure-index="0"] svg')).toBeVisible();
  await expect(second.getByText(/SVG 미생성/)).toHaveCount(0);
  await expect(
    second.getByRole("combobox", { name: "문제 2 출력 방식" }),
  ).toHaveValue("text");
  await second.getByRole("button", { name: /^그림 1 편집/ }).click();
  await expect(editor.locator("#figure-editor-canvas circle")).toHaveCount(1);
  await expect(
    editor.locator("#figure-editor-canvas rect[data-object-id]"),
  ).toHaveCount(1);
  await editor.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: "2문항 담기", exact: true }).click();
  const added = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent())!,
  );
  expect(added[1].figureUrls[0]).toMatch(/^data:image\/svg\+xml/);
  expect(mock.errors).toEqual([]);
});

// 원장님 2026-09-20 «상단 열을 줄여서 «전체 해설 생성» 버튼 추가. 순서대로 해설 생성».
// 줄이 꺾이는지는 CSS 가 정한다 — jsdom 은 못 본다.
test("검수 줄은 «전체 해설 생성»이 늘어도 한 줄로 남고 차례대로 부른다", async ({
  page,
}, testInfo) => {
  const mock = await mockAi(page);
  await page.setViewportSize({ width: 1516, height: 920 });
  await sample(page);
  await detect(page);
  await review(page);
  const row = page.getByLabel("문항 검수 이동");
  const bulk = row.getByRole("button", { name: "전체 해설 생성", exact: true });
  await expect(bulk).toBeVisible();
  // 자리를 만든 방법 — 띠의 «작업 중/작업 결과»와 «상세» 글자를 뺐다(점·화살표는 남는다).
  await expect(row.locator("[data-strip-overall]")).toBeHidden();
  await expect(row.locator("[data-strip-detail]")).toBeHidden();
  await expect(row.locator("[data-studio-progress]")).toBeVisible();
  // 한 줄인가 — flex 항목의 세로 중심이 한 값이면 한 줄이다(글자 칸과 단추는 높이가 달라
  // top 이 서로 다르다). 이 자(尺)는 1100px 에서 1, 900px 에서 2 를 낸다 — 물 수 있는 자다.
  const lines = () =>
    row.evaluate(
      (element) =>
        new Set(
          [...element.children].map((child) => {
            const box = child.getBoundingClientRect();
            return Math.round(box.top + box.height / 2);
          }),
        ).size,
    );
  expect(await lines()).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("review-row-bulk.png") });
  await bulk.click();
  await expect
    .poll(() => mock.posts.filter((post) => post.action === "solution").length)
    .toBe(2);
  expect(
    mock.posts
      .filter((post) => post.action === "solution")
      .map((post) => post.content),
  ).toEqual([content, "직사각형의 넓이를 구하세요."]);
  expect(mock.errors).toEqual([]);
});
