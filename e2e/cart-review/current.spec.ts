import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 담은 문항 — **고친 뒤의 모습**을 진짜 작업실에서 재는 시험(트랙 44).
 * 원장님 2026-09-21 «담은걸 확인하거나 빼거나 어떤걸 담았는지 체크할 수 있는기능이 없는듯» →
 * 트랙 41 안 D 확정(«추천대로»).
 *
 * 🔴 트랙 41 의 이 시험은 **어긋남을 단정했다**(④ 에서 빼도 작업실은 «담음»·«모두 담았습니다»로 잠김,
 *    새 시험지에도 옛 «담음», 검수 완료만 눌러도 «담음»이 풀림). 장부를 시험지 목록 하나로 합치면서
 *    그 단정을 **뒤집었다** — 이제 이 시험이 초록이면 어긋남이 **없다**는 뜻이다. 옛 단정으로 되돌리지 말 것.
 *
 * 화면은 **진짜 `UnifiedWorkspace`**(`current.tsx`) — 작업실·④ 시험지 구성·문제은행·새 시험지가 다 진짜다.
 * 유료 AI 는 부르지 않는다 — POST 는 막는다.
 */

/** step-header.spec.ts 와 같은 다섯 쪽 PDF. 거기 것을 내보내지 않아 여기 다시 둔다. */
function examPdf(pages: number) {
  const fontId = 3 + pages * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${3 + i * 2} 0 R`).join(" ")}] >>`,
  ];
  for (let i = 0; i < pages; i++) {
    const stream = `BT /F1 24 Tf 40 500 Td (EXAM PAGE ${i + 1}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`,
    );
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}

const FILE_NAME = "[경신중][2][25-2-중간][미래엔][1학기 전범위].pdf";

async function stubNetwork(page: Page) {
  await page.route("**/api/studio/pdf-worker?*", (route) =>
    route.fulfill({
      body: readFileSync(
        resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
      ),
      contentType: "text/javascript",
    }),
  );
  await page.route("**/api/studio/pdf-assets/**", (route) => {
    const parts = new URL(route.request().url()).pathname.split("/").slice(-2);
    return route.fulfill({
      body: readFileSync(resolve("node_modules/pdfjs-dist", ...parts)),
      contentType: parts[1].endsWith(".wasm")
        ? "application/wasm"
        : "application/octet-stream",
    });
  });
  await page.route("**/api/dev/unified/ai", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          json: { error: "시험은 AI 를 안 부른다" },
        })
      : route.fulfill({
          json: {
            enabled: true,
            mode: "subscription-cli",
            defaultProvider: "codex",
            providers: [
              {
                id: "codex",
                label: "Codex",
                status: "ready",
                detail: "사용 가능",
                image: true,
              },
            ],
          },
        }),
  );
}

const stepTab = (page: Page, name: RegExp) =>
  page
    .getByRole("navigation", { name: "제작 단계 이동" })
    .getByRole("button", { name });
const menu = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "작업실 메뉴" }).getByRole("button", {
    name,
  });
const footer = (page: Page) =>
  page.locator('footer[aria-label="문제 제작 주요 작업"]');
const addButton = (page: Page) =>
  footer(page).getByRole("button", {
    name: /문항 담기|모두 담았습니다|시험지에 담기/,
  });
const cartToggle = (page: Page) =>
  footer(page).getByRole("button", { name: /^담은 문항/ });
const panel = (page: Page) =>
  page.getByRole("region", { name: "담은 문항 목록" });
const card = (page: Page, n: number) =>
  page.getByRole("article", { name: `문제 ${n} 인식 결과` });
/** 검수 카드의 «담음» 표시 — 카드 바닥 줄 끝(D@foot). */
const chips = (page: Page) =>
  page.getByLabel("원본과 인식 결과 비교").locator("[data-studio-cart-chip]");
const topBadge = (page: Page) =>
  page.getByRole("button", { name: /^담은 문제 \d+$/ });

/** 지금 시험지(localStorage 의 활성 초안)의 담은 문항 — 제품 저장소를 그대로 읽는다. */
const savedWorksheet = (page: Page) =>
  page.evaluate(() => {
    const envelope = JSON.parse(
      localStorage.getItem("today-math-workspace-drafts-v1") ?? "null",
    ) as {
      activeId: string;
      drafts: {
        id: string;
        problems: {
          id: string;
          studioCrop?: {
            revision?: number;
            reviewed?: boolean;
            ocr?: { topic?: string };
          };
        }[];
      }[];
    } | null;
    const draft = envelope?.drafts.find(
      (item) => item.id === envelope.activeId,
    );
    return (draft?.problems ?? []).map((problem) => ({
      id: problem.id,
      revision: problem.studioCrop?.revision ?? 0,
      reviewed: problem.studioCrop?.reviewed ?? false,
      topic: problem.studioCrop?.ocr?.topic ?? null,
    }));
  });

/** 칸의 폭·높이와 줄 수(자식 세로 중심의 가짓수 — 한 줄이면 1). */
const lineBox = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const children = [...element.children]
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width && rect.height);
      return {
        폭: Math.round(element.getBoundingClientRect().width),
        높이: Math.round(element.getBoundingClientRect().height),
        줄수: new Set(
          children.map((rect) => Math.round(rect.top + rect.height / 2)),
        ).size,
      };
    });

/** 한 칸 높이 0.18 — 세 칸(0.05·0.30·0.55)이 서로 겹치지 않는다. */
async function dragBox(page: Page, top: number) {
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await expect(area).toBeVisible();
  const rect = (await area.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.1, rect.y + rect.height * top);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.85,
    rect.y + rect.height * (top + 0.18),
    { steps: 6 },
  );
  await page.mouse.up();
}

/** 원본을 올리고 세 문제를 잘라 ③ OCR · 디지털화로 간다(AI 없이 — 단계 탭은 단계만 바꾼다). */
async function toReview(page: Page) {
  await stubNetwork(page);
  await page.setViewportSize({ width: 1516, height: 940 });
  await page.goto("/#studio");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: FILE_NAME,
    mimeType: "application/pdf",
    buffer: examPdf(5),
  });
  // 지면이 다 그려진 뒤에 끈다 — 먼저 끌면 첫 칸이 조용히 안 잘린다.
  await expect(
    page.getByRole("button", { name: "키보드로 영역 지정" }),
  ).toBeEnabled();
  for (const top of [0.05, 0.3, 0.55]) await dragBox(page, top);
  await stepTab(page, /OCR · 디지털화/).click();
  await expect(page.getByLabel("문항 검수 이동")).toBeVisible();
  // 끌기 셋이 늘 셋을 자르지는 않는다(자른 뒤 도구가 바뀐다) — 몇 개인지는 탭 배지로 읽는다.
  const count = Number(
    (await stepTab(page, /OCR · 디지털화/)
      .locator("b")
      .textContent()) ?? 0,
  );
  expect(count).toBeGreaterThanOrEqual(2);
  return count;
}

test("③ 에서 담으면 카드마다 «담음» · 목록으로 보고 뺀다 — ④·문제은행·새 시험지와 한 장부", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);

  // 담기 전: «N문항 담기», 표시 없음, 목록 단추는 흐림(담은 것도 뺀 것도 없다).
  await expect(addButton(page)).toHaveText(`${n}문항 담기`);
  await expect(chips(page)).toHaveCount(0);
  await expect(cartToggle(page)).toBeDisabled();
  const 잰값: Record<string, unknown> = { 자른문항: n };
  const 머리_담기전: Record<number, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    머리_담기전[width] = await lineBox(
      page,
      'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
    );
  }

  // 담는다.
  await page.setViewportSize({ width: 1516, height: 940 });
  await addButton(page).click();
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(addButton(page)).toBeDisabled();
  await expect(chips(page)).toHaveCount(n);
  await expect(chips(page)).toHaveText(Array(n).fill("담음"));
  await expect(cartToggle(page)).toHaveText(new RegExp(`담은 문항\\s*${n}`));
  await expect(stepTab(page, /시험지 구성/)).toHaveText(
    new RegExp(`시험지 구성\\s*${n}$`),
  );
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);

  // D@foot — 표시가 카드 바닥 줄 끝에 서서 1280 에서도 카드 머리가 한 줄 그대로다.
  const 머리_담은뒤: Record<number, { 줄수: number; 높이: number }> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    머리_담은뒤[width] = await lineBox(
      page,
      'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
    );
    expect(머리_담은뒤[width].줄수).toBe(1);
    expect(머리_담은뒤[width]).toEqual(머리_담기전[width]);
    const chip = card(page, 1).locator("[data-studio-cart-chip]");
    const cardFooter = card(page, 1).locator('[class*="cardFooter"]');
    expect(
      await chip.evaluate(
        (element, footerElement) => element.parentElement === footerElement,
        await cardFooter.elementHandle(),
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`담은뒤-3단계-${width}.png`),
    });
    await cartToggle(page).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole("listitem")).toHaveCount(n);
    await page.screenshot({
      path: testInfo.outputPath(`목록-펼침-${width}.png`),
    });
    잰값[`목록_${width}`] = await panel(page).evaluate((element) => {
      const box = element.getBoundingClientRect();
      const results = document
        .querySelector('[aria-label="문자·도형 인식 결과"]')!
        .getBoundingClientRect();
      return {
        폭: Math.round(box.width),
        높이: Math.round(box.height),
        결과칸_가림_비율: Number(
          (
            Math.max(
              0,
              Math.min(box.right, results.right) -
                Math.max(box.left, results.left),
            ) / results.width
          ).toFixed(2),
        ),
      };
    });
    await cartToggle(page).click();
    await expect(panel(page)).toHaveCount(0);
  }
  잰값.카드머리 = { 담기전: 머리_담기전, 담은뒤: 머리_담은뒤 };

  // ④ 에서 첫 문제를 뺀다 → 작업실도 안다(어긋남 1 이 사라졌다).
  await page.setViewportSize({ width: 1516, height: 940 });
  await menu(page, "시험지 · 내보내기").click();
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  const order = page.getByRole("tabpanel", { name: /문제 순서/ });
  await expect(order.getByRole("listitem")).toHaveCount(n);
  const firstRow = await order.getByRole("listitem").first().textContent();
  await page.getByRole("button", { name: "1번 문제 빼기" }).click();
  await expect(order.getByRole("listitem")).toHaveCount(n - 1);
  await menu(page, "자료 제작").click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "뺌",
  );
  await expect(chips(page).filter({ hasText: /^담음$/ })).toHaveCount(n - 1);
  // 뺀 것은 한꺼번에 담기가 건너뛴다(확정 «안 넣는다») — 잠김이 아니라 «다시 담기»가 따로 있다.
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(cartToggle(page)).toHaveText(
    new RegExp(`담은 문항\\s*${n - 1}`),
  );
  await cartToggle(page).click();
  const removedRow = panel(page).locator('li[data-removed="true"]');
  await expect(removedRow).toHaveCount(1);
  await expect(removedRow).toContainText("뺐습니다");
  await page.screenshot({
    path: testInfo.outputPath("4단계에서-뺀뒤-작업실-목록.png"),
  });
  await removedRow.getByRole("button", { name: "문제 01 다시 담기" }).click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);
  await menu(page, "시험지 · 내보내기").click();
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  // 뺀 자리(첫째)로 돌아왔다.
  await expect(order.getByRole("listitem").first()).toHaveText(firstRow!);

  // 문제은행에서 하나 더 담는다 → 작업실 목록은 시험지 전체(출처 «문제은행»).
  await menu(page, "문제은행").click();
  await page
    .getByRole("button", { name: /번 문제 담기$/ })
    .first()
    .click();
  await expect(
    page.getByRole("status", { name: `담은 문제 ${n + 1}문항` }),
  ).toBeAttached();
  await menu(page, "자료 제작").click();
  await expect(cartToggle(page)).toHaveText(
    new RegExp(`담은 문항\\s*${n + 1}`),
  );
  await cartToggle(page).click();
  await expect(panel(page).getByRole("listitem")).toHaveCount(n + 1);
  await expect(panel(page).getByRole("listitem").last()).toContainText(
    "문제은행",
  );
  await expect(panel(page)).toContainText(`이 원본 ${n} · 다른 곳 1`);
  // 모든 화면 일치 — 작업실 «담음» 수 · 목록 · 탭 배지 · 위 띠 · 왼쪽 메뉴 배지가 같은 장부.
  await expect(chips(page).filter({ hasText: /^담음$/ })).toHaveCount(n);
  await expect(stepTab(page, /시험지 구성/)).toHaveText(
    new RegExp(`시험지 구성\\s*${n + 1}$`),
  );
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n + 1}`);
  await expect(menu(page, "시험지 · 내보내기")).toContainText(String(n + 1));
  await page.screenshot({
    path: testInfo.outputPath("목록-문제은행-포함.png"),
  });
  await cartToggle(page).click();

  // 새 시험지 → 옛 «담음»이 풀리고 다시 담을 수 있다(어긋남 2 가 사라졌다).
  await page.getByRole("button", { name: "새 시험지 만들기" }).click();
  await page.getByRole("button", { name: /내 자료로 만들기/ }).click();
  await expect(topBadge(page)).toHaveAccessibleName("담은 문제 0");
  await expect(chips(page)).toHaveCount(0);
  await expect(addButton(page)).toHaveText(`${n}문항 담기`);
  await expect(addButton(page)).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath("새시험지-3단계.png") });
  await addButton(page).click();
  await expect(chips(page)).toHaveText(Array(n).fill("담음"));
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);

  console.log(`[잰 값] ${JSON.stringify(잰값)}`);
  await testInfo.attach("잰 값", {
    body: JSON.stringify(잰값, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("검수 완료만 눌러도 «담음» 그대로 — 고치면 «반영 전», «반영»이 같은 자리에 넣는다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);
  await addButton(page).click();
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect.poll(() => savedWorksheet(page)).toHaveLength(n);
  const before = await savedWorksheet(page);

  // 검수 완료 — 상태라 판이 그대로, «담음» 그대로(어긋남 3 이 사라졌다).
  await card(page, 1)
    .getByRole("button", { name: "이 문제 검수 완료" })
    .click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(addButton(page)).toBeDisabled();
  // 시험지 판은 같은 자리·같은 판에 상태만 따라온다.
  await expect
    .poll(async () => (await savedWorksheet(page))[0])
    .toEqual({
      ...before[0],
      reviewed: true,
    });
  expect((await savedWorksheet(page)).map((row) => row.id)).toEqual(
    before.map((row) => row.id),
  );
  await page.screenshot({
    path: testInfo.outputPath("검수완료뒤-3단계.png"),
  });

  // 내용을 고친다(토픽) → «담음 · 고친 내용 반영 전» + «반영».
  await card(page, 1).getByRole("button", { name: "검수 완료 취소" }).click();
  await card(page, 1).getByRole("button", { name: "내용 수정" }).click();
  await card(page, 1).getByLabel("토픽").fill("일차방정식");
  await card(page, 1).getByRole("button", { name: "저장" }).click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음 · 고친 내용 반영 전",
  );
  // 고친 것은 한꺼번에 담기의 일이 아니다 — «N문항 담기»에 안 잡힌다.
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  expect((await savedWorksheet(page))[0].topic).toBeNull();
  await page.screenshot({
    path: testInfo.outputPath("고친뒤-반영전-3단계.png"),
  });
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    expect(
      (
        await lineBox(
          page,
          'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
        )
      ).줄수,
    ).toBe(1);
    await page.screenshot({
      path: testInfo.outputPath(`고친뒤-반영전-${width}.png`),
    });
  }
  await page.setViewportSize({ width: 1516, height: 940 });
  await card(page, 1)
    .getByRole("button", { name: "문제 1 고친 내용 반영" })
    .click();
  await expect(card(page, 1).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  await expect
    .poll(async () => (await savedWorksheet(page))[0].topic)
    .toBe("일차방정식");
  const after = await savedWorksheet(page);
  expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
  expect(after[0].revision).toBeGreaterThan(before[0].revision);
  expect(errors).toEqual([]);
});

test("편집창 확대 중 — 목록에서 빼고 되돌리고, 뺀 것은 «담고 내보내기»가 안 되넣는다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);
  await addButton(page).click();
  await page.getByRole("button", { name: "편집창 확대" }).click();
  await cartToggle(page).click();
  await panel(page).getByRole("button", { name: "문제 02 빼기" }).click();
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "뺌",
  );
  // 위 알림 줄의 «되돌리기»는 확대 중 inert 에 덮인다 — 되돌리기는 목록 안에 있다(공통 ③).
  const topUndo = page.getByRole("button", { name: "되돌리기" });
  if (await topUndo.count())
    expect(
      await topUndo.evaluate((element) => Boolean(element.closest("[inert]"))),
    ).toBe(true);
  const restore = panel(page).getByRole("button", {
    name: "문제 02 다시 담기",
  });
  expect(
    await restore.evaluate((element) => Boolean(element.closest("[inert]"))),
  ).toBe(false);
  await expect(restore).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("확대중-목록-뺀뒤.png"),
  });
  await restore.click();
  await expect(card(page, 2).locator("[data-studio-cart-chip]")).toHaveText(
    "담음",
  );
  // 다시 빼고, 확대를 풀고, 새 문제를 하나 더 잘라 «담고 내보내기» — 뺀 02 는 안 들어간다.
  await panel(page).getByRole("button", { name: "문제 02 빼기" }).click();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "편집창 축소" })).toBeVisible();
  await page.getByRole("button", { name: "편집창 축소" }).click();
  await stepTab(page, /잘라내기/).click();
  // 키보드 영역 지정 + Enter — 끌기보다 확실하게 한 칸을 더 자른다.
  await page.getByRole("button", { name: "키보드로 영역 지정" }).click();
  await page.getByRole("group", { name: "문제 자르기 영역" }).press("Enter");
  await expect(stepTab(page, /OCR · 디지털화/).locator("b")).toHaveText(
    String(n + 1),
  );
  await stepTab(page, /OCR · 디지털화/).click();
  await expect(addButton(page)).toHaveText(/1문항 담기/);
  await footer(page)
    .getByRole("button", { name: /담고 내보내기/ })
    .click();
  const order = page.getByRole("tabpanel", { name: /문제 순서/ });
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  await expect(order.getByRole("listitem")).toHaveCount(n);
  // 저장소에도 n — 뺀 02 는 없고 새로 자른 것이 있다(자동 저장은 조금 늦게 쓴다).
  await expect.poll(async () => (await savedWorksheet(page)).length).toBe(n);
  await expect(topBadge(page)).toHaveAccessibleName(`담은 문제 ${n}`);
  expect(errors).toEqual([]);
});

test("시안 안 D 와 같은 모양 — 목록·카드 표시의 계산된 값", async ({
  page,
}) => {
  const n = await toReview(page);
  await addButton(page).click();
  await card(page, 1)
    .getByRole("button", { name: "이 문제 검수 완료" })
    .click();
  const measure = () =>
    page.evaluate(() => {
      const style = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const s = getComputedStyle(element);
        return {
          background: s.backgroundColor,
          color: s.color,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          padding: s.padding,
          borderRadius: s.borderRadius,
        };
      };
      const panel = document.querySelector(
        'section[aria-label="담은 문항 목록"]',
      )!;
      const ps = getComputedStyle(panel);
      const row = panel.querySelector("li")!;
      return {
        panel: {
          width: Math.round(panel.getBoundingClientRect().width),
          borderRadius: ps.borderRadius,
          boxShadow: ps.boxShadow,
          borderColor: ps.borderTopColor,
        },
        rowGrid: getComputedStyle(row).gridTemplateColumns.split(" ")[0],
        rowMinHeight: getComputedStyle(row).minHeight,
        heading: style('section[aria-label="담은 문항 목록"] h3'),
      };
    });
  await cartToggle(page).click();
  const product = await measure();
  const productChip = await card(page, 1)
    .locator("[data-studio-cart-chip]")
    .evaluate((element) => {
      const s = getComputedStyle(element);
      return {
        background: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        borderRadius: s.borderRadius,
      };
    });
  const productSource = await panel(page)
    .locator("li")
    .first()
    .locator("span")
    .nth(1)
    .evaluate((element) => getComputedStyle(element).fontSize);

  await page.goto("/wire.html?plan=D&open=1&at=foot");
  const wire = await measure();
  const wireChip = await page
    .locator(".wireChip")
    .first()
    .evaluate((element) => {
      const s = getComputedStyle(element);
      return {
        background: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        padding: s.padding,
        borderRadius: s.borderRadius,
      };
    });
  console.log(
    `[잰 값] ${JSON.stringify({ 자른문항: n, product, wire, productChip, wireChip, productSource })}`,
  );
  expect(product.panel).toEqual(wire.panel);
  expect(product.rowGrid).toBe(wire.rowGrid);
  expect(product.rowMinHeight).toBe(wire.rowMinHeight);
  expect(product.heading).toEqual(wire.heading);
  expect(productChip).toEqual(wireChip);
  // 하나만 다르다 — 출처 딱지는 작업실 글자 바닥(12px)으로 올렸다(시안 11px).
  expect(productSource).toBe("12px");
});
