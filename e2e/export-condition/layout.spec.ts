import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const templates = [
  "jeongtong",
  "pyeongga",
  "modern",
  "workbook",
  "jaseup",
  "yuhyung",
];
test("long metadata remains one line and sidebar action labels fit", async ({
  page,
}) => {
  await page.goto("/?long");
  await expect(
    page.getByRole("button", { name: "PDF 내려받기" }),
  ).toBeEnabled();
  const metadata = page
    .locator("[data-mathgen-document] [data-problem-metadata]")
    .first();
  expect(
    await metadata.evaluate(
      (el) =>
        el.getBoundingClientRect().height /
        parseFloat(getComputedStyle(el).fontSize),
    ),
  ).toBeLessThan(2);
  await expect(metadata).toContainText("기본");
  for (const width of [1440, 1100, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    const add = page.getByRole("button", { name: "문제 더 담기" });
    const download = page.getByRole("button", { name: "작업 파일 내보내기" });
    expect((await add.boundingBox())!.y).toBeCloseTo(
      (await download.boundingBox())!.y,
      1,
    );
    for (const button of [add, download])
      expect(
        await button.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
  }
});
for (const template of templates)
  for (const columns of [1, 2]) {
    test(`${template} ${columns} columns has a compact condition and two-row problem header`, async ({
      page,
    }, testInfo) => {
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        return url.hostname === "127.0.0.1" || url.protocol === "data:"
          ? route.continue()
          : route.abort();
      });
      await page.goto(`/?template=${template}&columns=${columns}`);
      await expect(
        page.getByRole("button", { name: "PDF 내려받기" }),
      ).toBeEnabled();
      await page
        .getByRole("combobox", { name: "미리보기 확대" })
        .selectOption("1");
      const paper = page
        .locator("[data-mathgen-document] [data-unified-paper]")
        .first();
      const measure = () =>
        paper.evaluate((root) => {
          const rect = (selector: string) =>
            root.querySelector(selector)!.getBoundingClientRect().toJSON();
          const style = (selector: string) => {
            const s = getComputedStyle(root.querySelector(selector)!);
            return {
              weight: s.fontWeight,
              align: s.textAlign,
              size: parseFloat(s.fontSize),
            };
          };
          const heading = root.querySelector("[data-box-header]")!;
          const range = document.createRange();
          range.selectNodeContents(heading);
          return {
            number: rect("[data-problem-header] > span"),
            metadata: rect("[data-problem-metadata]"),
            header: rect("[data-problem-header]"),
            body: rect("[data-problem-body]"),
            box: rect("[data-box-card]"),
            heading: rect("[data-box-header]"),
            headingText: range.getBoundingClientRect().toJSON(),
            items: [...root.querySelectorAll("[data-box-item]")].map((el) => ({
              rect: el.getBoundingClientRect().toJSON(),
              text: el.textContent,
              weight: getComputedStyle(el.querySelector("p")!).fontWeight,
              align: getComputedStyle(el.querySelector("p")!).textAlign,
            })),
            headingStyle: style("[data-box-header]"),
          };
        });
      const screen = await measure();
      expect(screen.metadata.y).toBeLessThan(screen.header.bottom);
      expect(screen.metadata.bottom).toBeGreaterThan(screen.number.y);
      expect(screen.body.y).toBeGreaterThanOrEqual(screen.header.bottom);
      expect(screen.items).toHaveLength(2);
      expect(screen.headingStyle.weight).toBe("400");
      expect(screen.headingStyle.align).toBe("center");
      expect(screen.heading.height).toBeLessThan(22);
      expect(
        Math.abs(
          screen.headingText.x +
            screen.headingText.width / 2 -
            (screen.box.x + screen.box.width / 2),
        ),
      ).toBeLessThan(1);
      for (const item of screen.items) {
        expect(item.weight).toBe("400");
        expect(item.align).toBe("left");
        expect(item.text).toMatch(/^•/);
        expect(item.rect.y).toBeGreaterThanOrEqual(screen.heading.bottom);
        expect(item.rect.right).toBeLessThanOrEqual(screen.box.right);
      }
      const add = await page
        .getByRole("button", { name: "문제 더 담기" })
        .boundingBox();
      const download = await page
        .getByRole("button", { name: "작업 파일 내보내기" })
        .boundingBox();
      expect(add!.y).toBeCloseTo(download!.y, 1);
      expect(add!.x + add!.width).toBeLessThanOrEqual(download!.x);
      await paper.screenshot({ path: testInfo.outputPath("preview.png") });
      await page.emulateMedia({ media: "print" });
      const print = await measure();
      expect(print.heading.height).toBeCloseTo(screen.heading.height, 1);
      expect(print.items[0].rect.height).toBeCloseTo(
        screen.items[0].rect.height,
        1,
      );
      expect(print.body.y).toBeGreaterThanOrEqual(print.header.bottom);
      await writeFile(
        testInfo.outputPath("geometry.json"),
        JSON.stringify({ template, columns, screen, print }, null, 2),
      );
      if (template === "jeongtong" && columns === 2)
        await page.pdf({
          path: testInfo.outputPath("condition.pdf"),
          preferCSSPageSize: true,
          printBackground: true,
        });
    });
  }

test("workspace and export notifications overlay without moving content", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const exportButton = page.getByRole("button", { name: "PDF 내려받기" });
  await expect(exportButton).toBeEnabled();
  const heading = page.getByRole("heading", { name: "시험지 설정" });
  const before = await heading.boundingBox();
  await page.getByRole("button", { name: "작업 저장", exact: true }).click();
  await expect(page.getByText("검증용 저장 알림입니다.")).toBeVisible();
  expect(await heading.boundingBox()).toEqual(before);
  await page.getByRole("button", { name: "알림 닫기", exact: true }).click();
  await page.route("**/api/exports/pdf", (route) =>
    route.fulfill({ status: 500, json: { error: "검증용 PDF 오류입니다." } }),
  );
  await exportButton.click();
  await expect(page.getByRole("alert")).toHaveText("검증용 PDF 오류입니다.");
  expect(await heading.boundingBox()).toEqual(before);
  await page.screenshot({
    path: testInfo.outputPath("notification.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "내보내기 알림 닫기" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await heading.boundingBox()).toEqual(before);
});
