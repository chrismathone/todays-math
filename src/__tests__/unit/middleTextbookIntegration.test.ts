import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import baseline from "../../../docs/planning/tracks/reports/textbook-engine-t1/legacy-baseline.json";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import { M1_TEXTBOOK_CALC } from "@/lib/middle/m1TextbookCalc";
import { M1_TEXTBOOK_NUMBER } from "@/lib/middle/m1TextbookNumber";
import { M1_TEXTBOOK_ORDER } from "@/lib/middle/m1TextbookOrder";
import { M1_TEXTBOOK_FACTOR } from "@/lib/middle/m1TextbookFactor";
import {
  filterEntries,
  nonCatalogEntries,
} from "../../../scripts/middle/listing";
import { middlePreviewHtml } from "../../../scripts/middle/preview";

describe("T1 registry and compatibility", () => {
  it("keeps subquestion line boundaries in the CLI review preview", async () => {
    const p = generateMiddleProblem("1-1|교과서 수와 연산|C01", 20261125);
    const { html } = await middlePreviewHtml([p], 20261125);
    expect(html).toContain("계산하시오.<br/>");
  });
  it("exposes new types to the public generator and searchable listing", () => {
    const listed = filterEntries(registeredTypes(), { q: "교과서 수와 연산" });
    for (const e of [
      ...M1_TEXTBOOK_CALC,
      ...M1_TEXTBOOK_NUMBER,
      ...M1_TEXTBOOK_ORDER,
      ...M1_TEXTBOOK_FACTOR,
    ]) {
      expect(listed.map((x) => x.key)).toContain(e.key);
      for (const seed of baseline.seeds)
        expect(generateMiddleProblem(e.key, seed).rpmType).toBe(e.rpmType);
    }
  });
  it("reports extra registered types separately from the RPM denominator", () => {
    const entries = M1_TEXTBOOK_CALC;
    expect(nonCatalogEntries(entries, new Set([entries[0]!.key]))).toEqual(
      entries.slice(1),
    );
    expect(nonCatalogEntries([], new Set())).toEqual([]);
  });
  it("preserves all 1517 existing keys at three frozen seeds", () => {
    for (const row of baseline.rows) {
      const hash = createHash("sha256")
        .update(
          JSON.stringify(
            baseline.seeds.map((seed) => generateMiddleProblem(row.key, seed)),
          ),
        )
        .digest("hex");
      expect(hash, row.key).toBe(row.sha256);
    }
  });
});
