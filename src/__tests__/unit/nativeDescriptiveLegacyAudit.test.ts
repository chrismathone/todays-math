import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  parseNativeExternalId,
  parseNativeDescriptiveProblem,
} from "@/contracts/nativeDescriptive.contract";
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinitions,
} from "@/lib/engine/nativeDescriptive20261018";
import { verifyNativePrinted } from "@/lib/engine/nativeDescriptiveGates";
import { legacyNativeVerifiers } from "@/lib/engine/descriptiveVerification/legacy";
import { auditLegacyNativeDefinitions } from "@/lib/engine/nativeDescriptiveLegacyAudit";

describe("legacy authored definitions inspected without repair", () => {
  it("all 30 read-only database payloads remain byte-identical after r2", () => {
    const fixture = JSON.parse(
      readFileSync(
        "docs/planning/tracks/reports/descriptive-core-20261020/legacy-db30.json",
        "utf8",
      ),
    );
    expect(fixture.readOnly).toBe(true);
    expect(fixture.rows).toHaveLength(30);
    for (const row of fixture.rows) {
      const id = parseNativeExternalId(row.externalId)!;
      expect(id).not.toBeNull();
      const p = generateNativeDescriptive(id.definitionId, id.seed, id.variant);
      expect(parseNativeDescriptiveProblem(p)).toBe(p);
      const digest = createHash("sha256")
        .update(JSON.stringify([p.content, p.answer, p.solution, null]))
        .digest("hex");
      expect(digest, row.externalId).toBe(row.payloadSha256);
    }
  });
  it("independent oracles check every legacy scored criterion from printed text", () => {
    for (const d of nativeDescriptiveDefinitions())
      for (const seed of [0, 1, 99, -2147483648, 2147483647])
        for (const variant of [0, 1]) {
          const p = generateNativeDescriptive(d.definitionId, seed, variant);
          expect(
            verifyNativePrinted(p, legacyNativeVerifiers[d.definitionId]!)
              .issues,
            `${d.definitionId}/${seed}/${variant}`,
          ).toEqual([]);
        }
  });
  it("reports missing r2 proof as failed gates while preserving all six definitions", () => {
    const results = auditLegacyNativeDefinitions();
    expect(results).toHaveLength(6);
    for (const row of results) {
      expect(row.passed).toBe(false);
      expect(row.gates.filter((g) => !g.passed).map((g) => g.id)).toEqual(
        row.definitionId === "e4-trapezoid-sufficiency-r1"
          ? ["G1", "G2", "G4", "G5", "G6"]
          : ["G1", "G2", "G4", "G6"],
      );
      expect(row.coverage.every((c) => c.missing.length === 0)).toBe(true);
      expect(row.mutations.every((m) => m.detected)).toBe(true);
    }
  });
});
