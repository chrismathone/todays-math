import { expect, test } from "@playwright/test";

test("progress stays one row and anchored details escape canvas clipping", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?progress-fixture");
  const bar = page.locator("[data-studio-progress] > button");
  const panel = page.getByRole("region", { name: "작업별 진행 상황" });
  for (const width of [1440, 768, 390, 336]) {
    await page.setViewportSize({ width, height: 900 });
    await page.mouse.move(width - 1, 880);
    const initial = await page.locator("[data-canvas]").boundingBox();
    await page.getByRole("button", { name: "긴 경고 전환" }).click();
    await expect(bar).toContainText("확인 필요");
    expect((await bar.boundingBox())!.height).toBe(44);
    expect((await page.locator("[data-canvas]").boundingBox())!.y).toBe(
      initial!.y,
    );
    expect(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await bar.hover();
    await expect(panel).toBeVisible();
    // 짧은 이름표가 보이고 긴 이름은 읽는 이름으로 남는다(원장님 2026-09-21).
    await expect(
      panel.getByRole("progressbar", { name: "SVG 도형 생성 중" }),
    ).toBeAttached();
    await expect(
      panel.getByRole("progressbar", { name: "문제 인식 중" }),
    ).toBeAttached();
    await expect(panel.getByText("도형", { exact: true })).toBeVisible();
    await expect(panel.getByText("문제", { exact: true })).toBeVisible();
    const barBox = (await bar.boundingBox())!;
    const panelBox = (await panel.boundingBox())!;
    // 띠와 겹치게 매달리고, 화면 좌우 8px 안에 머문다(좁은 화면에서는 화면 폭 - 16px).
    expect(panelBox.x).toBeGreaterThanOrEqual(8);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width - 8 + 0.5);
    expect(panelBox.x).toBeLessThan(barBox.x + barBox.width);
    expect(panelBox.x + panelBox.width).toBeGreaterThan(barBox.x);
    expect(panelBox.width).toBeGreaterThanOrEqual(
      Math.min(480, width - 16) - 0.5,
    );
    await expect
      .poll(async () => (await panel.boundingBox())!.y)
      .toBeCloseTo(barBox.y + barBox.height, 0);
    // 쪽별 진행은 접히지 않는다 — 원장님 2026-09-20. 펼치는 동작 없이 바로 누른다.
    await expect(panel.locator("details")).toHaveCount(0);
    const pageButton = panel.getByRole("button", { name: "4쪽 인식 중" });
    await pageButton.click();
    await expect(page.getByLabel("진행 동작 결과")).toHaveText(
      "source 4쪽 이동",
    );
    await panel.getByRole("button", { name: "SVG 도형 생성 취소" }).click();
    await expect(page.getByLabel("진행 동작 결과")).toHaveText("도형 취소");
    await page.screenshot({
      path: testInfo.outputPath(`progress-${width}.png`),
    });
    // 상세 창 안(취소 단추 위)에 마우스를 둔 채 Esc — 창이 DOM 에서 빠져 크롬이 띠의 pointerleave 를
    // 안 보낸다. 다음 폭에서 bar.hover() 로 상세가 다시 열려야 한다(main 부터 여기서 빨갰다, 2026-09-19).
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(bar).toBeFocused();
    await page.getByRole("button", { name: "긴 경고 전환" }).click();
  }
  expect(errors).toEqual([]);
});

test("progress details support click pinning, outside dismissal and keyboard focus", async ({
  page,
}) => {
  await page.goto("/?progress-fixture");
  const bar = page.locator("[data-studio-progress] > button");
  const panel = page.getByRole("region", { name: "작업별 진행 상황" });
  await bar.click();
  await page.mouse.move(1200, 800);
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "외부 버튼" }).click();
  await expect(panel).not.toBeVisible();
  await bar.focus();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    panel.getByRole("button", { name: "페이지 자동 인식 취소" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("진행 동작 결과")).toHaveText("페이지 취소");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await bar.press("Enter");
  await expect(panel).toBeVisible();
  await bar.press("Enter");
  await expect(panel).not.toBeVisible();
});

test("쪽이 많아도 한 줄로 흐르고 실패한 도형은 하나씩 눌러 간다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?progress-fixture");
  const bar = page.locator("[data-studio-progress] > button");
  const panel = page.getByRole("region", { name: "작업별 진행 상황" });
  const list = panel.getByLabel("쪽별 진행 목록");
  /** 칩들이 몇 줄에 걸쳐 있는가 — 1 이면 한 줄, 2 이상이면 줄이 터진 것이다. */
  const rows = () =>
    list.evaluate(
      (element) =>
        new Set(
          [...element.querySelectorAll("button")].map((button) =>
            Math.round(button.getBoundingClientRect().top),
          ),
        ).size,
    );
  await bar.click();
  await expect(panel).toBeVisible();
  await expect(list.getByRole("button", { name: "1쪽 완료" })).toBeVisible();
  expect(await rows()).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("pages-five.png") });

  // 파일 둘에 걸친 40쪽 — 줄바꿈 없이 목록 안에서만 가로로 구른다.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "쪽 많이 전환" }).click();
  await bar.click();
  await expect(
    list.getByRole("button", { name: "1번 파일 · 1쪽 완료" }),
  ).toBeVisible();
  expect(await list.locator("button").count()).toBe(40);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await rows()).toBe(1);
    expect(
      await list.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);
    // 넘침은 목록 안에 갇힌다 — 상세 창도 문서도 가로로 안 터진다.
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await list.getByRole("button", { name: "2번 파일 · 1쪽 대기" }).click();
  await expect(page.getByLabel("진행 동작 결과")).toHaveText("second 1쪽 이동");
  await page.screenshot({ path: testInfo.outputPath("pages-forty.png") });

  // 실패한 도형 — 셈만 있던 자리에 이름이 하나씩, 누르면 그 문항으로 간다.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "쪽 많이 전환" }).click();
  await page.getByRole("button", { name: "도형 실패 전환" }).click();
  await bar.click();
  const failures = panel.getByLabel("실패한 도형 목록");
  await expect(failures.locator("button")).toHaveCount(2);
  await expect(
    failures.getByRole("button", { name: "도형 1-1" }),
  ).toHaveAttribute("title", /SVG 생성에 실패했습니다/);
  await page.screenshot({ path: testInfo.outputPath("figure-failures.png") });
  await failures.getByRole("button", { name: "도형 3-2" }).click();
  await expect(page.getByLabel("진행 동작 결과")).toHaveText("c3 검수 이동");
  expect(errors).toEqual([]);
});

/**
 * 원장님 2026-09-21 — 검수 줄의 띠(줄 오른쪽 끝 268px)에서 «SVG 도형 생성 중»·«문제 인식 중» 이
 * 한 글자씩 세로로 쪼개졌다(1516px 화면 실측: 이름 칸 폭 0px, 5줄). 짧은 이름표로 바꾸고,
 * 상세 창은 «원본 영역보다 커도 된다» — 띠보다 넓게 펴되 화면 밖으로는 안 나간다.
 * 줄 수와 폭은 계산된 레이아웃으로 잰다(jsdom 은 CSS 를 안 돈다).
 */
test("좁은 띠의 상세 창 — 이름표는 한 줄, 창은 띠보다 넓고 화면 안", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?progress-fixture");
  await page.getByRole("button", { name: "좁은 띠 전환" }).click();
  await page.getByRole("button", { name: "원문 대조 경고 전환" }).click();
  const bar = page.locator("[data-studio-progress] > button");
  const panel = page.getByRole("region", { name: "작업별 진행 상황" });
  for (const [width, height] of [
    [1516, 900],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await page.keyboard.press("Escape");
    await bar.click();
    await expect(panel).toBeVisible();
    const barBox = (await bar.boundingBox())!;
    expect(barBox.width).toBeCloseTo(268, 0);
    const panelBox = (await panel.boundingBox())!;
    // 띠(268px)보다 넓게 — 오른쪽 끝을 띠에 맞추고 왼쪽으로 편다.
    expect(panelBox.width).toBeCloseTo(480, 0);
    expect(panelBox.x + panelBox.width).toBeCloseTo(barBox.x + barBox.width, 0);
    expect(panelBox.x).toBeGreaterThanOrEqual(8);
    // 이름표마다 한 줄 — 높이가 줄 높이를 넘지 않는다.
    const tags = await panel.evaluate((element) =>
      [...element.querySelectorAll("[title]")]
        .filter((node) => node.querySelector('[aria-hidden="true"]'))
        .map((node) => {
          const style = getComputedStyle(node);
          return {
            text: node.querySelector('[aria-hidden="true"]')!.textContent,
            height: node.getBoundingClientRect().height,
            lineHeight: parseFloat(style.lineHeight),
            whiteSpace: style.whiteSpace,
            clipped: node.scrollWidth > node.clientWidth + 1,
          };
        }),
    );
    expect(tags.map((tag) => tag.text)).toEqual(["페이지", "도형", "문제"]);
    for (const tag of tags) {
      expect(tag.whiteSpace).toBe("nowrap");
      expect(tag.height).toBeLessThanOrEqual(tag.lineHeight + 0.5);
      expect(tag.clipped).toBe(false);
    }
    // 빠진 낱말이 마우스 올림 없이 보인다.
    await expect(
      panel.getByText(/^빠진 낱말: 경신중학교, 평행사변형/),
    ).toBeVisible();
    // 창도 문서도 가로로 안 터진다.
    expect(
      await panel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`narrow-strip-${width}.png`),
    });
  }
  expect(errors).toEqual([]);
});
