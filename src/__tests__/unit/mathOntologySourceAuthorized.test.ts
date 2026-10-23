import { describe, expect, it } from "vitest";
import { readAuthorizedMathOntologySources } from "@/lib/math-ontology/sources/authorized";
import { sourceEntityIri } from "@/lib/math-ontology/ids";
import cases from "../../../scripts/ontology/census/fixtures/identity.json";
const context = {
  opaqueSnapshotId: "opaque",
  contextHash: `sha256:${"a".repeat(64)}` as const,
  authorizationStamp: `sha256:${"b".repeat(64)}` as const,
  asOf: "2026-10-23T00:00:00Z",
  sourceWatermarks: { course: "4" },
};
describe("authorized source integration port", () => {
  it("binds the exact existing authorization context and watermark without inventing authorization", async () => {
    const good = {
      read: async () => ({
        context,
        watermark: "4",
        rows: [{ nativeId: "safe-source" }],
      }),
    };
    expect(
      (await readAuthorizedMathOntologySources(good, context, "4")).rows,
    ).toEqual([{ nativeId: "safe-source" }]);
    await expect(
      readAuthorizedMathOntologySources(
        {
          read: async () => ({
            context: {
              ...context,
              authorizationStamp: `sha256:${"c".repeat(64)}` as const,
            },
            watermark: "4",
            rows: [],
          }),
        },
        context,
        "4",
      ),
    ).rejects.toThrow(/context/i);
    await expect(
      readAuthorizedMathOntologySources(good, context, "5"),
    ).rejects.toThrow(/watermark/i);
  });
  it("matches actual Python urllib.parse.quote cross-language fixtures", () => {
    for (const x of cases.cases) expect(sourceEntityIri(x)).toBe(x.stableIri);
  });
});
