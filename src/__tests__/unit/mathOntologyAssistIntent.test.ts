import { describe, it, expect } from "vitest";
import {
  ontologyIntentPrompt,
  parseOntologyIntent,
} from "@/lib/math-ontology/retrieval/intent";
describe("typed natural language front door", () => {
  it("routes short requests through bounded intent rather than exposing query or writer primitives", () => {
    const value = parseOntologyIntent(
      JSON.stringify({
        intent: "plan-draft",
        searchTerms: ["약수와 배수"],
        context: "selected-student",
      }),
      false,
    );
    expect(value.requiresStudent).toBe(true);
    expect(
      ontologyIntentPrompt("약수와 배수부터 하루10개로 계획해줘", true),
    ).toContain("신뢰하지 않는 데이터");
  });
  it("refuses free queries/remote paths and unknown model fields", () => {
    for (const term of [
      "SELECT ?x WHERE{}",
      "https://foreign.invalid/",
      "urn:foreign:graph",
      "../../secret",
    ])
      expect(() =>
        parseOntologyIntent(
          JSON.stringify({
            intent: "explain",
            searchTerms: [term],
            context: "global",
          }),
          false,
        ),
      ).toThrow();
    expect(() =>
      parseOntologyIntent(
        JSON.stringify({
          intent: "explain",
          searchTerms: ["약수"],
          context: "global",
          sql: "update",
        }),
        true,
      ),
    ).toThrow();
  });
});
