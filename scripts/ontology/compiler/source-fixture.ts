import {
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
  type MathOntologySourceRecord,
  type MathOntologySourceAssertion,
} from "../../../src/contracts/mathOntologySource.contract";
import {
  sealMathOntologySourcePayload,
  assembleMathOntologySources,
} from "../../../src/lib/math-ontology/sources/assembler";
import { projectMathOntologyPublicSources } from "../../../src/lib/math-ontology/sources/publicProjection";
import { prepareSourceProjectionCompileInput } from "../../../src/lib/math-ontology/compiler/sourceProjection";
import { sourceByteDigest } from "../../../src/lib/math-ontology/sources/canonical";
const hash = `sha256:${"a".repeat(64)}` as const;
const origin = {
  repositoryPath: "synthetic/source.ts",
  pointer: "/records",
  byteHash: hash,
  extractorVersion: "repo-sources-1" as const,
};
const records: MathOntologySourceRecord[] = [
  {
    namespace: "bank-assessment",
    nativeId: "assessment",
    kind: "AssessmentEntry",
  },
  { namespace: "bank-definition", nativeId: "definition", kind: "Definition" },
  { namespace: "curriculum-section", nativeId: "section", kind: "Section" },
  { namespace: "curriculum-chapter", nativeId: "chapter", kind: "Chapter" },
].map((r) => ({
  ...r,
  scope: "global",
  sourceProvenance: "native-source",
  origin,
  distribution: "native-metadata",
  edition: "unknown",
  metadata: {},
  labels: [
    {
      value: r.nativeId,
      language: "en",
      sourceField: "title",
      sourceTextHash: sourceByteDigest(r.nativeId),
      origin,
    },
  ],
})) as MathOntologySourceRecord[];
const refs = records.map((r) => ({
  namespace: r.namespace,
  nativeId: r.nativeId,
  scope: r.scope,
}));
const assertions: MathOntologySourceAssertion[] = [
  {
    nativeId: "assessment-definition",
    subject: refs[0],
    predicate: "assessesDefinition",
    object: refs[1],
  },
  {
    nativeId: "definition-section",
    subject: refs[1],
    predicate: "partOf",
    object: refs[2],
  },
  {
    nativeId: "section-chapter",
    subject: refs[2],
    predicate: "partOf",
    object: refs[3],
  },
  {
    nativeId: "editorial-candidate",
    subject: refs[0],
    predicate: "editorialPrerequisite",
    object: refs[3],
    originKind: "authored",
    supportKind: "editorial-judgment",
    evidenceKind: "authored-inference",
    reviewState: "candidate",
  },
].map((a) => ({
  origin,
  originKind: "source-projection",
  supportKind: "direct-source-structure",
  evidenceKind: "observed",
  reviewState: "unreviewed",
  publicationState: "unpublished",
  partial: false,
  ...a,
})) as MathOntologySourceAssertion[];
export function sourceFixture() {
  const envelope = sealMathOntologySourcePayload({
    schemaVersion: 1,
    adapterVersion: "repo-sources-1",
    inputs: [{ path: origin.repositoryPath, byteHash: hash, bytes: 10 }],
    records,
    assertions,
    expectedCoverage: MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
      namespace,
      expected: records.filter((r) => r.namespace === namespace).length,
    })),
  });
  return assembleMathOntologySources(envelope, {
    expectedPayloadHash: envelope.payloadHash,
  });
}
export async function sourceCompileFixture() {
  const dataset = sourceFixture(),
    projection = projectMathOntologyPublicSources(dataset);
  return prepareSourceProjectionCompileInput(dataset, {
    decisionId: "urn:todaymath:decision:synthetic-source-release",
    scope: "global",
    expectedProjectionHash: projection.projectionHash,
    verify: async () => ({
      isSuperAdmin: true,
      active: true,
      approvedProjectionHash: projection.projectionHash,
      decisionId: "urn:todaymath:decision:synthetic-source-release",
    }),
  });
}
