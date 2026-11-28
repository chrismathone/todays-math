import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONCEPT_BLANK_FORMS,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { BANK_PARTS, CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import {
  createConceptBlankBankReader,
  getConceptBlankBank,
  getConceptBlankBankForSections,
} from "@/lib/concept-blank/bank/runtime";
import { composeSheets } from "@/lib/concept-blank/compose";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";

const root = "data/concept-blank";
const sha256 = (data: string) =>
  createHash("sha256").update(data).digest("hex");

describe("concept blank deployment data", () => {
  it("publishes all authored parts and their exact runtime output", () => {
    const manifest: {
      version: string;
      parts: Record<string, string>;
    } = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8"));

    expect(Object.keys(manifest.parts)).toEqual(Object.keys(BANK_PARTS));
    expect(manifest.version).toBe(sha256(JSON.stringify(manifest.parts)));
    for (const [part, bank] of Object.entries(BANK_PARTS)) {
      const bytes = readFileSync(`${root}/${part}.json`, "utf8");
      expect(bytes, part).toBe(JSON.stringify(bank));
      expect(manifest.parts[part], part).toBe(sha256(bytes));
    }
  });

  it("returns every concept ID and every assessment entry in original order", () => {
    const bank = getConceptBlankBank();
    expect(JSON.stringify(bank)).toBe(JSON.stringify(CONCEPT_BLANK_BANK));
    expect(getConceptBlankBank()).toBe(bank);
  });

  it("retains print and scan output when loading only selected grades", () => {
    const selection: ConceptBlankSelection = {
      sections: [
        BANK_PARTS.m1.figures[0].section,
        BANK_PARTS.e5.figures[0].section,
      ],
      forms: CONCEPT_BLANK_FORMS.map((form) => ({
        form,
        counts: { 하: 2, 중: 2, 상: 2 },
        extras: { 하: 2, 중: 2, 상: 2 },
      })),
    };
    const bank = getConceptBlankBankForSections(selection.sections);
    const issued = createScanSnapshot(selection, CONCEPT_BLANK_BANK);
    expect(issued.pages.length).toBeGreaterThan(0);
    expect(composeSheets(selection, bank)).toStrictEqual(
      composeSheets(selection, CONCEPT_BLANK_BANK),
    );
    expect(JSON.stringify(createScanSnapshot(selection, bank))).toBe(
      JSON.stringify(issued),
    );
  });

  it("only opens the requested grade and rejects a changed pack on a fresh read", () => {
    const folder = mkdtempSync(join(tmpdir(), "concept-blank-bank-"));
    try {
      const gradeFile = join(folder, "e5plus.json");
      cpSync(join(root, "manifest.json"), join(folder, "manifest.json"));
      cpSync(join(root, "e5.json"), join(folder, "e5.json"));
      cpSync(join(root, "e5plus.json"), gradeFile);
      const reader = createConceptBlankBankReader(folder);
      const bank = reader.getGrade("초5");
      expect(bank.concepts).toHaveLength(1430);
      writeFileSync(gradeFile, "[]");
      expect(reader.getGrade("초5")).toBe(bank);
      expect(() =>
        createConceptBlankBankReader(folder).getGrade("초5"),
      ).toThrow("Invalid concept blank bank part: e5plus");
      expect(() => reader.getGrade("초6")).toThrow(/ENOENT/);
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
