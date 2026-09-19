import { expect, test, type Page } from "@playwright/test";

/**
 * 도형 데이터가 오가며 깨지던 두 자리를 **실제 브라우저**에서 본다(2026-09-19 원장님).
 * ① 계정 저장 → 다시 열기에서 SVG 데이터 주소가 첫 `)` 에서 잘려 `blob:…)%20translate(…)` → ERR_FILE_NOT_FOUND.
 * ② 검수 카드에만 F–E 가 보이고 도형 편집기에는 없었다(검수 카드가 끝이 남은 두 점을 이어 선을 지어 그었다).
 * jsdom 은 그림을 그리지 않는다 — 그림이 떴는지(naturalWidth)와 요청 실패는 여기서만 보인다.
 */
type Opened = {
  failures: string[];
  figure: { svg: string; image: string };
  stored: { image: string };
  resaved?: { image: string };
};

async function open(page: Page, query: string): Promise<Opened> {
  const failures: string[] = [];
  page.on("requestfailed", (request) =>
    failures.push(
      `${request.url().slice(0, 120)} ${request.failure()?.errorText}`,
    ),
  );
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text().slice(0, 160));
  });
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => "__figure" in window);
  await expect
    .poll(() =>
      page
        .locator("#figure-image")
        .evaluate((img: HTMLImageElement) => img.complete),
    )
    .toBe(true);
  const value = await page.evaluate(
    () =>
      (window as unknown as { __figure: Omit<Opened, "failures"> }).__figure,
  );
  return { failures, ...value };
}
const shown = (page: Page) =>
  page
    .locator("#figure-image")
    .evaluate((img: HTMLImageElement) => img.naturalWidth);
const cardLines = (page: Page) =>
  page.locator('#review-card [data-figure-index="0"] svg line').count();
async function editorLines(page: Page, query: string) {
  await page.goto(`/?${query}&view=editor`);
  const canvas = page.locator("#figure-editor-canvas > svg");
  await expect(canvas).toBeVisible();
  return canvas.locator("line").count();
}
const ASSET = /^\/api\/library\/assets\/[a-f0-9]{64}$/;

test("② F–E 가 없는 그림은 검수 카드·저장 그림·편집기 모두 선 6개", async ({
  page,
}) => {
  const opened = await open(page, "fixture=no-fe");
  expect(opened.failures).toEqual([]);
  expect(await cardLines(page)).toBe(6);
  expect(await shown(page)).toBeGreaterThan(0);
  expect(await editorLines(page, "fixture=no-fe")).toBe(6);
});

test("① 새 주소로 저장 → 다시 열기 — 자산 주소에 꼬리가 없고 그림이 뜬다", async ({
  page,
}) => {
  const opened = await open(page, "roundtrip");
  expect(opened.stored.image).toMatch(ASSET);
  expect(opened.figure.image).toMatch(/^blob:/);
  expect(await shown(page)).toBeGreaterThan(0);
  expect(opened.failures).toEqual([]);
});

test("① 옛 주소(괄호가 날것)도 새 주소와 같은 자산 하나로 저장된다", async ({
  page,
}) => {
  const fresh = await open(page, "roundtrip");
  const legacy = await open(page, "roundtrip&legacy");
  expect(legacy.stored.image).toBe(fresh.stored.image);
  expect(await shown(page)).toBeGreaterThan(0);
  expect(legacy.failures).toEqual([]);
});

test("① 이미 잘려 저장된 그림은 다시 열면 보이고, 다시 저장하면 온전한 자산이 된다", async ({
  page,
}) => {
  const fresh = await open(page, "roundtrip");
  const broken = await open(page, "broken");
  expect(broken.stored.image).toMatch(
    /^\/api\/library\/assets\/[a-f0-9]{64}\)%20/,
  );
  expect(broken.figure.image).toMatch(/^data:image\/svg\+xml/);
  expect(await shown(page)).toBeGreaterThan(0);
  expect(broken.resaved?.image).toBe(fresh.stored.image);
  expect(broken.failures).toEqual([]);
});
