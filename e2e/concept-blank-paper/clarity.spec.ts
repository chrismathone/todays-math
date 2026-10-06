import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { splitBlankSentence } from "../../src/contracts/conceptBlank.contract";
import remediation from "../../docs/planning/tracks/reports/concept-cloze-fix-all-20261006/applied-changes.json";
import { claritySheets } from "./clarity";
import { measurePages, openSet } from "./measure";
import type { RealGrade } from "./grades";

const grades: RealGrade[] = ["e3", "e4", "e5", "e6", "m1", "m2", "m3"];
for (const grade of grades) {
  test(`${grade}: every corrected C sentence and answer prints with matching blanks`, async ({
    page,
  }) => {
    const sheets = claritySheets(grade);
    const entries = sheets.flatMap((sheet) =>
      sheet.form === "cloze" ? sheet.sentences : [],
    );
    const changedIds = remediation.changes
      .map((change: { id: string }) => change.id)
      .filter((id) => id.startsWith(`${grade}-`));
    expect(changedIds.length).toBeGreaterThan(0);
    expect(entries.map((entry) => entry.id).sort()).toEqual(
      [...changedIds].sort(),
    );
    const blanks = entries.reduce(
      (n, entry) =>
        n +
        splitBlankSentence(entry.definition).filter(
          (piece) => piece.kind === "key",
        ).length,
      0,
    );

    await openSet(page, `clarity-${grade}`);
    await expect(page.locator('[data-cb-item="sentence"]')).toHaveCount(
      entries.length,
    );
    await expect(page.locator('[data-cb-key-row="concept"]')).toHaveCount(
      entries.length,
    );
    await expect(
      page.locator('[data-cb-item="sentence"] [data-cb-blank]'),
    ).toHaveCount(blanks);
    const reports = await measurePages(page);
    const directory = path.join(
      process.cwd(),
      "test-results/concept-blank-paper/clarity-all",
      grade,
    );
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      path.join(directory, "report.json"),
      JSON.stringify(
        {
          grade,
          ids: entries.map((entry) => entry.id),
          blanks,
          reports,
        },
        null,
        2,
      ),
      "utf8",
    );
    expect(reports.some((r) => r.part === "student")).toBe(true);
    expect(reports.some((r) => r.part === "key")).toBe(true);
    for (const report of reports) {
      const at = `${grade} ${report.part} ${report.page}`;
      expect(report.overflowPx, at).toBeLessThanOrEqual(0.5);
      expect(report.mathErrors, at).toBe(0);
      expect(report.leaks, at).toEqual([]);
      expect(Math.round(report.widthPx), at).toBe(794);
      expect(Math.round(report.heightPx), at).toBe(1123);
    }
    for (const part of ["student", "key"]) {
      const index = reports.findIndex((r) => r.part === part);
      await page
        .locator("[data-print-page]")
        .nth(index)
        .screenshot({ path: path.join(directory, `${part}.png`) });
    }
  });
}
