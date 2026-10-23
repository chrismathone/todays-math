import { describe, expect, it } from "vitest";
import {
  sourceEntityIri,
  sourceEntityVersionIri,
  sourceAssertionIri,
  sourceAssertionVersionIri,
} from "@/lib/math-ontology/ids";
const ref = {
  namespace: "bank-definition",
  nativeId: " 같은 이름Ⅰ / !*'() ",
  scope: "global",
};
const a = `sha256:${"a".repeat(64)}`,
  b = `sha256:${"b".repeat(64)}`;
describe("lossless source identity", () => {
  it("separates stable ID from immutable byte version", () => {
    expect(sourceEntityIri(ref)).toBe(sourceEntityIri({ ...ref }));
    expect(sourceEntityVersionIri(ref, a)).not.toBe(
      sourceEntityVersionIri(ref, b),
    );
    expect(sourceEntityVersionIri(ref, a)).toContain(sourceEntityIri(ref));
  });
  it("never collapses homonyms, scopes, roman numerals, spaces or Unicode forms", () => {
    for (const delta of [
      { namespace: "fading-group" },
      { scope: "another-source" },
      { nativeId: ref.nativeId.trim() },
      { nativeId: ref.nativeId.replace("Ⅰ", "I") },
      { nativeId: "é" },
      { nativeId: "e\u0301" },
    ])
      expect(sourceEntityIri({ ...ref, ...delta })).not.toBe(
        sourceEntityIri(ref),
      );
    expect(sourceEntityIri({ ...ref, nativeId: "é" })).not.toBe(
      sourceEntityIri({ ...ref, nativeId: "e\u0301" }),
    );
  });
  it("uses RFC3986 uppercase pct encoding with no unescaped punctuation", () => {
    const iri = sourceEntityIri(ref);
    expect(iri).toContain("%21%2A%27%28%29");
    expect(decodeURIComponent(iri.split(":").at(-1)!)).toBe(ref.nativeId);
    expect(() => sourceEntityIri({ ...ref, nativeId: "\ud800" })).toThrow();
  });
  it("assertion identity is distinct and versions are immutable", () => {
    expect(
      sourceAssertionIri({ scope: ref.scope, nativeId: ref.nativeId }),
    ).not.toBe(sourceEntityIri(ref));
    expect(
      sourceAssertionVersionIri(
        { scope: ref.scope, nativeId: ref.nativeId },
        a,
      ),
    ).not.toBe(
      sourceAssertionVersionIri(
        { scope: ref.scope, nativeId: ref.nativeId },
        b,
      ),
    );
    expect(() => sourceEntityVersionIri(ref, "sha256:lie")).toThrow();
  });
});
