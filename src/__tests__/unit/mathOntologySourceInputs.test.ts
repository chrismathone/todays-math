import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRepoSourceReadPort,
  readSourceInputManifest,
  verifySourceInputManifest,
} from "../../../scripts/ontology/census/inputs";
describe("actual source input failpoints", () => {
  it("rejects changed actual bytes, missing files and duplicate input paths", () => {
    const root = mkdtempSync(join(tmpdir(), "ontology-source-"));
    try {
      mkdirSync(join(root, "src"));
      writeFileSync(join(root, "src", "data.json"), "one");
      const port = createRepoSourceReadPort(root);
      const receipt = readSourceInputManifest(port, ["src/data.json"]);
      expect(verifySourceInputManifest(port, receipt)).toEqual(receipt);
      writeFileSync(join(root, "src", "data.json"), "two");
      expect(() => verifySourceInputManifest(port, receipt)).toThrow(
        /hash|byte/i,
      );
      expect(() =>
        readSourceInputManifest(port, ["src/data.json", "src/data.json"]),
      ).toThrow(/duplicate/i);
      expect(() =>
        readSourceInputManifest(port, ["src/missing.json"]),
      ).toThrow();
      expect(() => port.read("../outside")).toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
