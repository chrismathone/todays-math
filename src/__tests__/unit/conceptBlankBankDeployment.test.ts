import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BANK_PARTS } from "@/lib/concept-blank/bank";

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
});
