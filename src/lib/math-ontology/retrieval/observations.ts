import { DataFactory, Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql";
import { MATH_ONTOLOGY_VOCAB as TM } from "@/contracts/mathOntology.contract";
import { buildInsightV2Snapshot } from "@/lib/math-insight/v2Snapshot";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import { ontologyDigest } from "../compiler/canonical";
import { validateOntologyCore } from "../validation/core";
import type { MathOntologyRuntime } from "../runtime/artifact";
const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  XSD = "http://www.w3.org/2001/XMLSchema#";
const { namedNode, literal } = DataFactory;
export function retainedOntologyObservations(
  course: StoredCourse,
  revision: number,
  asOf: Date,
  context: { studentId: string; classId: string; branchId: string | null },
) {
  const snapshot = buildInsightV2Snapshot(
    course,
    revision,
    asOf,
    context,
    null,
  );
  return {
    revision,
    asOf: asOf.toISOString(),
    retention: snapshot.scope,
    observations: snapshot.observations,
  };
}
export type RetainedOntologyObservations = ReturnType<
  typeof retainedOntologyObservations
>;
export async function queryOntologyObservations(
  runtime: MathOntologyRuntime,
  snapshot: RetainedOntologyObservations,
  scope: string,
  opaqueContext: string,
) {
  const data = new Store();
  for (const o of snapshot.observations) {
    const event = namedNode(
      `urn:todaymath:observation:${ontologyDigest(opaqueContext + ":" + o.id).slice(7)}`,
    );
    for (const [p, v] of [
      ["scope", scope],
      ["sourceKind", o.source],
      ["sectionId", o.sectionId],
    ] as const)
      data.addQuad(event, namedNode(TM + p), literal(v));
    data.addQuad(
      event,
      namedNode(RDF + "type"),
      namedNode(TM + "LearningObservation"),
    );
    data.addQuad(
      event,
      namedNode(TM + "recordRevision"),
      literal(String(snapshot.revision), namedNode(XSD + "integer")),
    );
    data.addQuad(
      event,
      namedNode(TM + "observedAt"),
      literal(
        o.completedAt ?? o.startedAt ?? snapshot.asOf,
        namedNode(XSD + "dateTime"),
      ),
    );
    data.addQuad(
      event,
      namedNode(TM + "included"),
      literal(String(o.included), namedNode(XSD + "boolean")),
    );
    for (const [p, v] of [
      ["independentCorrect", o.independentCorrect],
      ["independentIncorrect", o.independentIncorrect],
    ] as const)
      data.addQuad(
        event,
        namedNode(TM + p),
        literal(String(v), namedNode(XSD + "integer")),
      );
  }
  const report = await validateOntologyCore(data, runtime.shapes);
  if (!report.conforms || report.incomplete)
    throw new Error("OBSERVATION_SHACL");
  const engine = new QueryEngine();
  const stream = await engine.queryBindings(
    `SELECT ?event ?sourceKind ?sectionId ?observedAt ?included ?independentCorrect ?independentIncorrect WHERE { ?event a <${TM}LearningObservation> ; <${TM}sourceKind> ?sourceKind ; <${TM}sectionId> ?sectionId ; <${TM}observedAt> ?observedAt ; <${TM}included> ?included ; <${TM}independentCorrect> ?independentCorrect ; <${TM}independentIncorrect> ?independentIncorrect } ORDER BY ?event LIMIT 301`,
    {
      sources: [data],
      readOnly: true,
      fetch: async () => {
        throw new Error("REMOTE_RDF_DISABLED");
      },
    },
  );
  const rows: Record<string, string>[] = [];
  for await (const row of stream)
    rows.push(Object.fromEntries([...row].map(([k, v]) => [k.value, v.value])));
  if (rows.length > 300) throw new Error("OBSERVATION_BUDGET");
  return {
    rows,
    validation: {
      engine: report.engine,
      conforms: report.conforms,
      focusNodeCount: report.focusNodeCount,
    },
    retention: snapshot.retention,
    scope: "authorized-student-retained-course",
    unknown:
      "Retained observations do not establish mastery, causality or all past learning.",
  };
}
