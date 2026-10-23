import { describe, expect, it } from "vitest";
import {
  ontologyPlanArgsSchema,
  ontologyActionBindingSchema,
} from "@/contracts/mathOntologyAction.contract";
import { canonicalBytes, digest } from "@/lib/math-ontology/actions/canonical";
const h = `sha256:${"a".repeat(64)}`;
describe("ontology action argument and byte bindings", () => {
  it("uses the established course-plan domain but never lets model args carry a revision or action", () => {
    const args = {
      startSectionId: "5-1-5-3",
      dailyQuestionCount: 10,
      enabled: true,
    };
    expect(ontologyPlanArgsSchema.parse(args)).toEqual(args);
    for (const extra of [
      { expectedRevision: 2 },
      { action: "grade" },
      { dailyQuestionCount: 7 },
      { startSectionId: "invented" },
    ])
      expect(() =>
        ontologyPlanArgsSchema.parse({ ...args, ...extra }),
      ).toThrow();
  });
  it("canonicalizes object keys while preserving meaningful array order and UTF-8 bytes", () => {
    expect(canonicalBytes({ b: [2, 1], a: "기준" })).toBe(
      '{"a":"기준","b":[2,1]}',
    );
    expect(digest(canonicalBytes({ a: 1, b: 2 }))).toBe(
      digest(canonicalBytes({ b: 2, a: 1 })),
    );
    expect(digest(canonicalBytes([1, 2]))).not.toBe(
      digest(canonicalBytes([2, 1])),
    );
    for (const bad of [
      NaN,
      Infinity,
      undefined,
      new Date(),
      { x: undefined },
      { x: BigInt(1) },
      { x: -0 },
      { x: Number.MAX_SAFE_INTEGER + 1 },
    ])
      expect(() => canonicalBytes(bad)).toThrow();
  });
  it("orders integer-looking keys by UTF-16 code units and refuses array getters without invoking them", () => {
    expect(canonicalBytes({ "2": "b", "10": "a" })).toBe('{"10":"a","2":"b"}');
    let invoked = false;
    const array = [1];
    Object.defineProperty(array, "0", {
      enumerable: true,
      get: () => {
        invoked = true;
        return 1;
      },
    });
    expect(() => canonicalBytes(array)).toThrow();
    expect(invoked).toBe(false);
  });
  it("binds a server-confirmed opaque graph identity separately from canonical args/evidence/source bytes", () => {
    const binding = {
      version: 1,
      actionId: "course.plan.set/v1",
      graphVersion: "opaque:release-7",
      sourceSnapshotId: "opaque:snapshot-9",
      sourceSnapshotHash: h,
      argumentHash: h,
      evidencePacketHash: h,
      previewHash: h,
      contextHash: h,
      expectedStudentRevision: 0,
    };
    expect(ontologyActionBindingSchema.parse(binding).graphVersion).toBe(
      "opaque:release-7",
    );
    expect(() =>
      ontologyActionBindingSchema.parse({ ...binding, fsrs: "write" }),
    ).toThrow();
    expect(() =>
      ontologyActionBindingSchema.parse({
        ...binding,
        evidencePacketHash: "self-declared",
      }),
    ).toThrow();
  });
});
