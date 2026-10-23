import { z } from "zod";

/** Source census contracts, not the formal ontology/SHACL or action contracts. */
export const MATH_ONTOLOGY_SOURCE_ADAPTER_VERSION = "repo-sources-1" as const;
export const MATH_ONTOLOGY_SOURCE_NAMESPACES = [
  "curriculum-grade",
  "curriculum-chapter",
  "curriculum-section",
  "bank-definition",
  "bank-assessment",
  "bank-ox",
  "bank-apply",
  "bank-figure",
  "course-section",
  "explorer-unit",
  "explorer-card",
  "fading-group",
  "graph-unit",
  "graph-topic",
  "graph-course",
  "arithmetic-skill",
  "arithmetic-v2-type",
  "algebra-srs-concept",
  "textbook-script",
  "textbook-script-turn",
  "elementary-form",
  "middle-type",
  "high-type",
  "high-hold",
  "native-descriptive-definition",
  "elementary-combo",
  "exam-study-family",
  "exam-study-requirement",
  "rpm-index-type",
  "textbook-reference-term",
  "textbook-reference-source",
  "rpm-source",
  "lab-unit",
  "lab-source",
  "source-exam",
  "source-exam-question",
  "import-replay",
  "official-standard",
  "official-source",
  "operational-model",
] as const;
export const mathOntologySourceNamespaceSchema = z.enum(
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
);
export const mathOntologySourceDigestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);
export const mathOntologySourcePathSchema = z
  .string()
  .min(1)
  .max(1000)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      value
        .split("/")
        .every((part) => part !== ".." && part !== "." && part.length > 0),
    "A repository-relative source path is required",
  );
export const mathOntologySourceLocatorSchema = z.strictObject({
  repositoryPath: mathOntologySourcePathSchema,
  pointer: z.string().min(1).max(4000),
  byteHash: mathOntologySourceDigestSchema,
  extractorVersion: z.literal(MATH_ONTOLOGY_SOURCE_ADAPTER_VERSION),
  upstreamByteHash: mathOntologySourceDigestSchema.optional(),
  publicSourceIri: z
    .url()
    .refine((value) => value.startsWith("https://www.moe.go.kr/"))
    .optional(),
});
const metadataScalar = z.union([
  z.string().max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
/** Closed keys prevent accidental propagation of bodies, answers, images or student data. */
export const mathOntologySourceMetadataSchema = z.strictObject({
  grade: metadataScalar.optional(),
  semester: metadataScalar.optional(),
  order: metadataScalar.optional(),
  level: metadataScalar.optional(),
  entryKind: metadataScalar.optional(),
  sourceKind: metadataScalar.optional(),
  nativeKind: metadataScalar.optional(),
  version: metadataScalar.optional(),
  count: metadataScalar.optional(),
  questionNumber: metadataScalar.optional(),
  bQuestionAvailable: z.boolean().optional(),
  clozeAvailable: z.boolean().optional(),
  questionRevision: metadataScalar.optional(),
  partial: z.boolean().optional(),
  licenseStatus: z
    .enum(["unknown", "not-declared", "public-official-metadata"])
    .optional(),
  originalHashKnown: z.boolean().optional(),
  actualInstances: z.null().optional(),
  populationKind: z
    .enum([
      "finite-family",
      "materialized-source-record",
      "structural",
      "contract-only",
    ])
    .optional(),
  educationEvidence: z
    .enum([
      "unknown",
      "observed-structure",
      "authored-inference",
      "official-source",
    ])
    .optional(),
});
export const mathOntologySourceRecordSchema = z.strictObject({
  namespace: mathOntologySourceNamespaceSchema,
  scope: z.string().min(1).max(1000),
  nativeId: z.string().min(1).max(4000),
  kind: z.enum([
    "Grade",
    "Chapter",
    "Section",
    "Definition",
    "AssessmentEntry",
    "QuestionRepresentation",
    "LearningUnit",
    "Card",
    "RecallGroup",
    "EditorialUnit",
    "EditorialTopic",
    "Course",
    "CourseExpression",
    "Skill",
    "GeneratorFamily",
    "Requirement",
    "TeachingScript",
    "ScriptTurn",
    "SourceReference",
    "LabUnit",
    "SourceQuestion",
    "OfficialStandard",
    "OperationalModel",
  ]),
  origin: mathOntologySourceLocatorSchema,
  sourceProvenance: z.enum([
    "native-source",
    "official-document",
    "imported-source",
    "unknown",
  ]),
  distribution: z.enum([
    "native-metadata",
    "public-official-metadata",
    "quarantine-reference",
  ]),
  edition: z.enum(["unknown", "2015", "2022"]),
  metadata: mathOntologySourceMetadataSchema,
  labels: z
    .array(
      z.strictObject({
        value: z.string().min(1).max(800),
        language: z.enum(["ko", "en", ""]),
        sourceField: z.enum([
          "term",
          "title",
          "section",
          "chapter",
          "label",
          "name",
          "code",
          "model",
        ]),
        sourceTextHash: mathOntologySourceDigestSchema,
        origin: mathOntologySourceLocatorSchema,
      }),
    )
    .max(5)
    .optional(),
  nativeReferences: z
    .array(
      z.strictObject({
        namespace: z.enum([
          "db-unit",
          "engine-family",
          "source-external-id",
          "declared-unit-section",
          "declared-family",
        ]),
        nativeId: z.string().min(1).max(4000),
        resolution: z.literal("unverified"),
        origin: mathOntologySourceLocatorSchema,
      }),
    )
    .max(5000)
    .optional(),
});
export const MATH_ONTOLOGY_SOURCE_PREDICATES = [
  "partOf",
  "orderedBefore",
  "assessesDefinition",
  "containsProposition",
  "cardInUnit",
  "authoredPrerequisiteRecommendation",
  "editorialPrerequisite",
  "editorialSupport",
  "editorialContains",
  "courseSequence",
  "courseAlternativeTrack",
  "courseRecommendedFoundation",
  "courseRecommendedBeforeOrConcurrent",
  "projectsSourceSection",
  "coversSourceSection",
  "representativeCard",
  "scriptUsesDefinition",
  "referencesSource",
  "partialCourseMapping",
  "generatesForSection",
] as const;
export const mathOntologySourceRefSchema = z.strictObject({
  namespace: mathOntologySourceNamespaceSchema,
  scope: z.string().min(1).max(1000),
  nativeId: z.string().min(1).max(4000),
});
export const mathOntologySourceAssertionSchema = z
  .strictObject({
    nativeId: z.string().min(1).max(8000),
    subject: mathOntologySourceRefSchema,
    predicate: z.enum(MATH_ONTOLOGY_SOURCE_PREDICATES),
    object: mathOntologySourceRefSchema,
    origin: mathOntologySourceLocatorSchema,
    originKind: z.enum(["source-projection", "authored", "model-proposal"]),
    supportKind: z.enum([
      "direct-source-structure",
      "editorial-judgment",
      "unverified",
    ]),
    publicationState: z.literal("unpublished"),
    mappingReviewStatus: z
      .enum(["source-marked-verified", "unknown"])
      .optional(),
    evidenceKind: z.enum([
      "observed",
      "authored-inference",
      "official-source",
      "unknown",
    ]),
    reviewState: z.enum(["unreviewed", "candidate"]),
    partial: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (
      [
        "editorialPrerequisite",
        "editorialSupport",
        "authoredPrerequisiteRecommendation",
      ].includes(value.predicate) &&
      value.evidenceKind !== "authored-inference"
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Authored educational relationships cannot be promoted to official facts",
      });
    if (value.predicate === "partialCourseMapping" && !value.partial)
      ctx.addIssue({
        code: "custom",
        message: "Existing pilot course mappings remain partial",
      });
  });
export const mathOntologySourceInputSchema = z.strictObject({
  path: mathOntologySourcePathSchema,
  byteHash: mathOntologySourceDigestSchema,
  bytes: z.number().int().nonnegative(),
});
export const mathOntologySourceCoverageSchema = z.strictObject({
  namespace: mathOntologySourceNamespaceSchema,
  expected: z.number().int().nonnegative(),
  registered: z.number().int().nonnegative(),
  rdfEligible: z.number().int().nonnegative(),
  quarantined: z.number().int().nonnegative(),
  sourceLinked: z.number().int().nonnegative(),
  reviewedEducationalRelations: z.number().int().nonnegative(),
  officialStandardMappings: z.number().int().nonnegative(),
  actualInstances: z.null(),
  populationKind: z.enum([
    "finite-family",
    "materialized-source-record",
    "structural",
    "contract-only",
  ]),
});
export const mathOntologySourcePayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  adapterVersion: z.literal(MATH_ONTOLOGY_SOURCE_ADAPTER_VERSION),
  inputs: z.array(mathOntologySourceInputSchema),
  versions: z.array(
    z.strictObject({
      namespace: mathOntologySourceNamespaceSchema,
      sourceVersion: mathOntologySourceDigestSchema,
    }),
  ),
  records: z.array(mathOntologySourceRecordSchema),
  assertions: z.array(mathOntologySourceAssertionSchema),
  expectedCoverage: z.array(
    z.strictObject({
      namespace: mathOntologySourceNamespaceSchema,
      expected: z.number().int().nonnegative(),
    }),
  ),
});
export const mathOntologySourceEnvelopeSchema = z.strictObject({
  payloadHash: mathOntologySourceDigestSchema,
  payload: mathOntologySourcePayloadSchema,
});
export type MathOntologySourceNamespace = z.infer<
  typeof mathOntologySourceNamespaceSchema
>;
export type MathOntologySourceDigest = z.infer<
  typeof mathOntologySourceDigestSchema
>;
export type MathOntologySourceLocator = z.infer<
  typeof mathOntologySourceLocatorSchema
>;
export type MathOntologySourceRecord = z.infer<
  typeof mathOntologySourceRecordSchema
>;
export type MathOntologySourceAssertion = z.infer<
  typeof mathOntologySourceAssertionSchema
>;
export type MathOntologySourceRef = z.infer<typeof mathOntologySourceRefSchema>;
export type MathOntologySourceInput = z.infer<
  typeof mathOntologySourceInputSchema
>;
export type MathOntologySourceCoverage = z.infer<
  typeof mathOntologySourceCoverageSchema
>;
export type MathOntologySourcePayload = z.infer<
  typeof mathOntologySourcePayloadSchema
>;
export type MathOntologySourceEnvelope = z.infer<
  typeof mathOntologySourceEnvelopeSchema
>;
export type MathOntologySourceEntity = Readonly<
  MathOntologySourceRecord & {
    stableIri: string;
    iri: string;
    sourceVersion: MathOntologySourceDigest;
  }
>;
export type MathOntologySourceStatement = Readonly<
  MathOntologySourceAssertion & {
    stableIri: string;
    iri: string;
    subjectIri: string;
    objectIri: string;
    sourceVersion: MathOntologySourceDigest;
  }
>;
export interface MathOntologySourceDataset {
  readonly payloadHash: MathOntologySourceDigest;
  readonly entities: readonly MathOntologySourceEntity[];
  readonly assertions: readonly MathOntologySourceStatement[];
  readonly coverage: readonly MathOntologySourceCoverage[];
  readonly inputManifest: readonly MathOntologySourceInput[];
}
/** Actual private rows must come only from the caller's existing authorization helper and current transaction/snapshot. */
export interface MathOntologyAuthorizedSourceContext {
  readonly opaqueSnapshotId: string;
  readonly contextHash: MathOntologySourceDigest;
  readonly authorizationStamp: MathOntologySourceDigest;
  readonly asOf: string;
  readonly sourceWatermarks: Readonly<Record<string, string>>;
}
export interface MathOntologyAuthorizedSourcePort<Row> {
  read(context: MathOntologyAuthorizedSourceContext): Promise<{
    readonly context: MathOntologyAuthorizedSourceContext;
    readonly watermark: string;
    readonly rows: readonly Row[];
  }>;
}
/** RDF/JS-compatible term/quad transport; formal worker owns vocabulary semantics and validation. */
export type MathOntologySourceRdfTerm =
  | { termType: "NamedNode"; value: string }
  | {
      termType: "Literal";
      value: string;
      datatype: { termType: "NamedNode"; value: string };
      language: string;
    };
export interface MathOntologySourceQuad {
  subject: { termType: "NamedNode"; value: string };
  predicate: { termType: "NamedNode"; value: string };
  object: MathOntologySourceRdfTerm;
  graph: { termType: "NamedNode"; value: string };
}
