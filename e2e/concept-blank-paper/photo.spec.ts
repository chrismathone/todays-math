import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { CONCEPT_BLANK_BANK } from "../../src/lib/concept-blank/bank";
import { decodeSheetCode } from "../../src/lib/concept-blank/sheetCode";
import { measurePages, openSet } from "./measure";
import { PHOTO_CLOZE_CODE, PHOTO_CLOZE_SELECTION, photoCode } from "./photo";

test("교실 사진의 빈칸 문항: 조건은 보이고 옛 시험지 코드와 구분된다", async ({
  page,
}) => {
  const old = decodeSheetCode(PHOTO_CLOZE_CODE, CONCEPT_BLANK_BANK);
  expect(old?.selection).toEqual(PHOTO_CLOZE_SELECTION);
  expect(old?.bankChanged).toBe(true);
  expect(decodeSheetCode(photoCode(), CONCEPT_BLANK_BANK)?.bankChanged).toBe(
    false,
  );

  await openSet(page, "photo-cloze");
  const questions = page.locator('[data-cb-item="sentence"]');
  await expect(questions).toHaveCount(10);
  await expect(page.locator('[data-cb-item="apply"]')).toHaveCount(3);
  await expect(
    page
      .getByText("빈칸에 알맞은 말이나 수를 쓰시오.", { exact: false })
      .first(),
  ).toBeVisible();

  // 사진 8번: 비교하는 양과 제수의 범위를 학생에게 주고, 관계 하나만 묻는다.
  const comparison = questions.nth(7);
  await expect(comparison.locator("[data-cb-blank]")).toHaveCount(1);
  await expect(comparison).toContainText("보다 큰 수");
  await expect(comparison).toContainText("보다 작은 분수");
  await expect(comparison).not.toContainText("크다");
  await expect(page.locator('[data-cb-key-row="concept"]')).toHaveCount(10);
  await expect(page.locator('[data-cb-key-row="apply"]')).toHaveCount(3);
  const blanks = await questions.locator("[data-cb-blank]").count();
  await expect(page.locator("[data-cb-notes]").last()).toContainText(
    `빈칸 하나가 한 개(${blanks}개)`,
  );

  const reports = await measurePages(page);
  const directory = path.join(
    process.cwd(),
    "test-results/concept-blank-paper/photo-cloze",
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "report.json"),
    JSON.stringify(reports, null, 2),
  );
  for (const [index, report] of reports.entries()) {
    const at = `${report.part} ${report.page}`;
    expect(report.overflowPx, at).toBeLessThanOrEqual(0.5);
    expect(report.mathErrors, at).toBe(0);
    expect(report.leaks, at).toEqual([]);
    expect(Math.round(report.widthPx), at).toBe(794);
    expect(Math.round(report.heightPx), at).toBe(1123);
    await page
      .locator("[data-print-page]")
      .nth(index)
      .screenshot({
        path: path.join(directory, `${index + 1}-${report.part}.png`),
      });
  }
});
