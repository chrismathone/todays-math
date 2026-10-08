import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import fixtures from "./student-clear-fixtures.json";
import { measurePages, openSet } from "./measure";

test("new question maps fit two branches at contract limits and keep numbering and writing space", async ({
  page,
}) => {
  await openSet(page, "student-clear-map");
  await expect(page.locator('[data-cb-part="student"]')).toHaveCount(2);
  await expect(page.locator("[data-cb-node]")).toHaveCount(3);
  await expect(page.locator('[data-cb-key-row="concept"]')).toHaveCount(3);
  const students = page.locator('[data-cb-part="student"]');
  await expect(students.nth(0)).toContainText("문 1");
  await expect(students.nth(0)).toContainText("문 2");
  await expect(students.nth(1)).toContainText("문 3");
  const reports = await measurePages(page);
  for (const report of reports) {
    expect(
      report.overflowPx,
      `${report.part} ${report.page}`,
    ).toBeLessThanOrEqual(0.5);
    expect(report.mathErrors).toBe(0);
    expect(report.leaks).toEqual([]);
  }
  const directory = path.join(
    process.cwd(),
    "test-results/concept-blank-paper/student-clear-map",
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "report.json"),
    JSON.stringify(
      { purpose: "지도 계약 상한 배치 검사; 학습 문항 아님", reports },
      null,
      2,
    ),
  );
  await students
    .nth(0)
    .screenshot({ path: path.join(directory, "student.png") });
  await page
    .locator('[data-cb-part="key"]')
    .first()
    .screenshot({ path: path.join(directory, "key.png") });
});

test("seven-grade B/C structure prints explicit questions, adequate writing lines and matched keys", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await openSet(page, "student-clear-fixtures");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(page.locator('[data-cb-item="term"]')).toHaveCount(
    fixtures.entries.length,
  );
  for (const [index, entry] of fixtures.entries.entries()) {
    const prompt = page.locator('[data-cb-item="term"]').nth(index);
    await expect(prompt).toHaveCount(1);
    const visible = (await prompt.textContent())!.replace(/\s+/g, "");
    for (const fragment of entry.bQuestion.prompt
      .split(/\$[^$]*\$/)
      .filter((text) => text.trim().length >= 4))
      expect(visible).toContain(fragment.replace(/\s+/g, ""));
    expect(await prompt.textContent()).not.toContain(entry.bQuestion.answer);
    const lines = await prompt
      .locator("[data-cb-ruled]")
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          height: element.getBoundingClientRect().height,
          minimum: parseFloat(style.minHeight),
        };
      });
    expect(lines.height).toBeGreaterThanOrEqual(lines.minimum - 0.5);
  }
  const reports = await measurePages(page);
  const directory = path.join(
    process.cwd(),
    "test-results/concept-blank-paper/student-clear-structure",
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "report.json"),
    JSON.stringify(
      { purpose: fixtures.purpose, reports, consoleErrors: errors },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  for (const report of reports) {
    expect(
      report.overflowPx,
      `${report.form} ${report.part} ${report.page}`,
    ).toBeLessThanOrEqual(0.5);
    expect(report.mathErrors).toBe(0);
    expect(report.leaks).toEqual([]);
  }
  const pages = page.locator("[data-print-page]");
  for (let index = 0; index < reports.length; index++)
    await pages.nth(index).screenshot({
      path: path.join(
        directory,
        `page-${String(index + 1).padStart(2, "0")}.png`,
      ),
    });
});
