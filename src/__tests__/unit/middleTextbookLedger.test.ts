import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { registeredTypes, generateMiddleProblem } from "@/lib/middle/generate";
import { createHash } from "node:crypto";

type Row = {
  id: string;
  problemCode: string;
  groupId: string;
  typeKey?: string;
  recordSha256: string;
  reviewFile: string;
  reason: string;
};
const root = "docs/planning/tracks/reports/";
const read = (file: string): Row[] =>
  readFileSync(root + "textbook-engine-t1/" + file, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

describe("T1 replacement ledger", () => {
  it("partitions exactly the 544 census candidates without changing source identity", () => {
    const accepted = read("replacement-ledger.jsonl"),
      deferred = read("deferred.jsonl");
    const decisions = JSON.parse(
      readFileSync(root + "textbook-engine-t1/decisions.json", "utf8"),
    ) as {
      groupId: string;
      sourceRows: number;
      acceptedRows: number;
      deferredRows: number;
    }[];
    expect(decisions).toHaveLength(64);
    const groups = new Set(decisions.map((g) => g.groupId));
    const census = readFileSync(
      root + "textbook-engine-census/rows.jsonl",
      "utf8",
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter((row) => groups.has(row.group));
    const all = [...accepted, ...deferred];
    expect(all).toHaveLength(544);
    expect(new Set(all.map((r) => r.id)).size).toBe(544);
    expect(new Set(all.map((r) => r.id))).toEqual(
      new Set(census.map((r) => r.id)),
    );
    for (const row of all) {
      const source = census.find((r) => r.id === row.id)!;
      expect(row.problemCode).toBe(source.problem_code);
      expect(row.recordSha256).toBe(source.record_sha256);
      expect(row.groupId).toBe(source.group);
      expect(row.reason.length).toBeGreaterThan(10);
    }
    for (const group of decisions) {
      expect(accepted.filter((r) => r.groupId === group.groupId)).toHaveLength(
        group.acceptedRows,
      );
      expect(deferred.filter((r) => r.groupId === group.groupId)).toHaveLength(
        group.deferredRows,
      );
      expect(group.acceptedRows + group.deferredRows).toBe(group.sourceRows);
    }
  });
  it("admits only reviewed, registered types with three clean preview samples", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    const preview = JSON.parse(
      readFileSync(root + "textbook-engine-t1/preview.json", "utf8"),
    );
    for (const row of read("replacement-ledger.jsonl")) {
      expect(keys.has(row.typeKey!)).toBe(true);
      const review = JSON.parse(
        readFileSync(root + "textbook-engine-t1/" + row.reviewFile, "utf8"),
      );
      expect(
        review.rows.some(
          (r: Row) => r.id === row.id && r.typeKey === row.typeKey,
        ),
      ).toBe(true);
      const sample = preview.results.find(
        (r: { key: string }) => r.key === row.typeKey,
      );
      expect(sample).toBeDefined();
      const actual = sample.seeds.map((seed: number) =>
        generateMiddleProblem(row.typeKey!, seed),
      );
      expect(
        createHash("sha256").update(JSON.stringify(actual)).digest("hex"),
      ).toBe(sample.contentSha256);
      expect(sample.seeds).toHaveLength(3);
      expect(sample.strictErrors).toBe(0);
      for (const measurement of sample.measurements) {
        expect(measurement.katexErrors).toBe(0);
        expect(measurement.overflows).toEqual([]);
        expect(measurement.fontsFailed).toEqual([]);
        expect(measurement.bodyFontLoaded).toBe(true);
      }
    }
  });
});
