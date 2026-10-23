import { describe, expect, it } from "vitest";
import {
  mathOntologySourceRecordSchema,
  mathOntologySourceAssertionSchema,
} from "@/contracts/mathOntologySource.contract";
const digest = `sha256:${"a".repeat(64)}`;
const locator = {
  repositoryPath: "prisma/seed-data/units.ts",
  pointer: "/CURRICULUM_UNITS/0",
  byteHash: digest,
  extractorVersion: "repo-sources-1",
};
const record = {
  namespace: "curriculum-section",
  scope: "global",
  sourceProvenance: "native-source",
  nativeId: "초3::1-1 덧셈과 뺄셈::1-1-1",
  kind: "Section",
  origin: locator,
  distribution: "native-metadata",
  edition: "unknown",
  metadata: { grade: "초3", order: 1 },
};
describe("source metadata boundary", () => {
  it("keeps native identity and unknown edition without inferring 2022", () => {
    expect(mathOntologySourceRecordSchema.parse(record)).toEqual(record);
  });
  it("rejects content, answer, images and student payload even under metadata", () => {
    for (const key of [
      "content",
      "answer",
      "image",
      "studentId",
      "definition",
      "prompt",
    ])
      expect(() =>
        mathOntologySourceRecordSchema.parse({
          ...record,
          metadata: { ...record.metadata, [key]: "private" },
        }),
      ).toThrow();
  });
  it("requires a real byte digest and source coordinate", () => {
    expect(() =>
      mathOntologySourceRecordSchema.parse({
        ...record,
        origin: { ...locator, byteHash: "2022" },
      }),
    ).toThrow();
    expect(() =>
      mathOntologySourceRecordSchema.parse({
        ...record,
        origin: { ...locator, repositoryPath: "../private" },
      }),
    ).toThrow();
  });
  it("does not accept approved/official promotion of an authored inference", () => {
    const a = {
      nativeId: "edge/1",
      originKind: "authored",
      supportKind: "editorial-judgment",
      publicationState: "unpublished",
      subject: { namespace: "graph-unit", scope: "global", nativeId: "a" },
      predicate: "editorialPrerequisite",
      object: { namespace: "graph-unit", scope: "global", nativeId: "b" },
      origin: locator,
      evidenceKind: "authored-inference",
      reviewState: "unreviewed",
      partial: false,
    };
    expect(mathOntologySourceAssertionSchema.parse(a)).toEqual(a);
    expect(() =>
      mathOntologySourceAssertionSchema.parse({
        ...a,
        reviewState: "approved",
      }),
    ).toThrow();
    expect(() =>
      mathOntologySourceAssertionSchema.parse({ ...a, predicate: "sameAs" }),
    ).toThrow();
  });
});
