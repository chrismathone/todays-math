import { expect, test } from "@playwright/test";

test("school metadata updates in the table without a duplicate summary line", async ({
  page,
}, testInfo) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
  await page.goto("/?template=jeongtong&columns=2");
  const ready = page.getByRole("button", { name: "PDF 내려받기" });
  await expect(ready).toBeEnabled();
  const paper = page
    .locator("[data-mathgen-document] [data-unified-paper]")
    .first();
  const sheet = await paper.elementHandle();
  await expect(paper.locator("[data-exam-details]")).toHaveCount(0);
  for (const [label, value] of [
    ["제목", "학교 시험지"],
    ["학교/기관명", "한빛중학교"],
    ["학기", "2학기"],
  ]) {
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
    await expect(paper.locator("table").first()).toContainText(value);
    await expect(ready).toBeEnabled();
    expect(await sheet!.evaluate((element) => element.isConnected)).toBe(true);
    expect((await paper.textContent())!.split(value).length - 1).toBe(1);
  }
  await page.screenshot({
    path: testInfo.outputPath("header.png"),
    fullPage: true,
  });
});
