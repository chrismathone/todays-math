import { DataFactory, Parser, Store } from "n3";
import SHACLValidator from "rdf-validate-shacl";
import type { MathOntologyValidation } from "@/contracts/mathOntology.contract";
export async function validateOntologyCore(
  data: Store,
  shapesText: string,
  focus?: { id: string; shape: string },
): Promise<MathOntologyValidation> {
  const shapes = new Store(
    new Parser({ format: "text/turtle" }).parse(shapesText),
  );
  if (
    shapes.countQuads(
      null,
      DataFactory.namedNode("http://www.w3.org/ns/shacl#sparql"),
      null,
      null,
    ) ||
    shapes.countQuads(
      null,
      DataFactory.namedNode("http://www.w3.org/2002/07/owl#imports"),
      null,
      null,
    )
  )
    throw new Error("UNSUPPORTED_RUNTIME_SHAPE");
  const validator = new SHACLValidator(shapes);
  const report = focus
    ? await validator.validateNode(
        data,
        DataFactory.namedNode(focus.id),
        DataFactory.namedNode(focus.shape),
      )
    : await validator.validate(data);
  const results = report.results.map((r) => ({
    focus: r.focusNode?.value ?? "",
    shape: r.sourceShape?.value ?? "",
    component: r.sourceConstraintComponent?.value ?? "",
    path: r.path?.value ?? "",
    severity: r.severity?.value ?? "",
  }));
  return {
    engine: "rdf-validate-shacl@0.6.5",
    conforms: report.conforms,
    incomplete: false,
    report: JSON.stringify(results),
    focusNodeCount: focus
      ? 1
      : new Set(
          [
            ...data.match(
              null,
              DataFactory.namedNode(
                "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              ),
              null,
              null,
            ),
          ]
            .filter((q) =>
              [
                "Assertion",
                "SourceEntity",
                "SourceAssertion",
                "SourceCoverage",
                "LearningObservation",
              ].some((c) => q.object.value === `urn:todaymath:vocab:${c}`),
            )
            .map((q) => q.subject.value),
        ).size,
    results,
  };
}
