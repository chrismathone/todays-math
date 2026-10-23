import { z } from "zod";
import { MATH_ONTOLOGY_SOURCE_PREDICATES } from "./mathOntologySource.contract";

export const MATH_ONTOLOGY_PROFILE = "tm-owlrl-1" as const;
export const MATH_ONTOLOGY_VOCAB = "urn:todaymath:vocab:" as const;
export const mathOntologyDigestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);
export const mathOntologyIriSchema = z
  .string()
  .min(1)
  .max(16000)
  .regex(/^urn:todaymath:[^\s<>"{}|\\^`]+$/u);
export const mathOntologyScopeSchema = z.union([
  z.literal("global"),
  z.string().regex(/^(?:branch|owner|student):[a-zA-Z0-9_-]{1,100}$/),
]);
export const MATH_ONTOLOGY_HASH_KEYS = [
  "source",
  "registry",
  "asserted",
  "closure",
  "review",
  "ontology",
  "shapes",
  "rules",
  "proof",
  "engine",
  "report",
  "coverage",
] as const;
export const mathOntologyGraphIdentitySchema = z.strictObject({
  schemaVersion: z.literal(1),
  profile: z.literal(MATH_ONTOLOGY_PROFILE),
  graphVersion: mathOntologyDigestSchema,
  hashes: z.record(z.enum(MATH_ONTOLOGY_HASH_KEYS), mathOntologyDigestSchema),
});
export type MathOntologyGraphIdentity = z.infer<
  typeof mathOntologyGraphIdentitySchema
>;
export const MATH_ONTOLOGY_RELATIONS = [
  ...new Set([
    "partOf",
    "covers",
    "projectsSourceSection",
    "directPedagogicalPrerequisite",
    "supports",
    "observedIn",
    ...MATH_ONTOLOGY_SOURCE_PREDICATES,
  ]),
] as [string, ...string[]];
export const mathOntologyAssertionSchema = z
  .strictObject({
    id: mathOntologyIriSchema,
    subject: mathOntologyIriSchema,
  predicate: z.enum([
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
    ...MATH_ONTOLOGY_RELATIONS.map((p) => `${MATH_ONTOLOGY_VOCAB}${p}`),
  ]),
    object: mathOntologyIriSchema,
    scope: mathOntologyScopeSchema,
    sourceRevision: mathOntologyIriSchema,
    sourceDigest: mathOntologyDigestSchema,
    locator: z.string().min(1).max(4000),
    provenance: z.enum([
      "official-document",
      "native-product",
      "other",
      "unknown",
    ]),
    origin: z.enum(["source-projection", "authored", "model-proposal"]),
    support: z.enum(["direct", "indirect", "missing", "unknown"]),
    review: z.enum(["unreviewed", "candidate", "approved", "rejected"]),
    publication: z.enum(["unpublished", "published", "retired"]),
    distribution: z.enum(["allowed", "restricted", "unknown"]),
    revision: z.number().int().positive(),
    approvalId: mathOntologyIriSchema.optional(),
  })
  .superRefine((a, ctx) => {
    if (
      (a.review === "approved" && !a.approvalId) ||
      (a.publication === "published" && a.review !== "approved")
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Approval binds a specific assertion revision before publication",
      });
  });
export type MathOntologyAssertion = z.infer<typeof mathOntologyAssertionSchema>;
export const mathOntologyCompileInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  profile: z.literal(MATH_ONTOLOGY_PROFILE),
  scope: mathOntologyScopeSchema,
  registryNquads: z.string().max(64 * 1024 * 1024),
  assertions: z.array(mathOntologyAssertionSchema).max(200000),
  sourceManifest: z.string().max(8 * 1024 * 1024),
});
export type MathOntologyCompileInput = z.infer<
  typeof mathOntologyCompileInputSchema
>;
export const mathOntologyProofSchema = z.strictObject({
  id: mathOntologyDigestSchema,
  conclusion: z.tuple([z.string(), z.string(), z.string()]),
  rule: z.enum([
    "asserted",
    "cax-sco",
    "prp-spo1",
    "prp-dom",
    "prp-rng",
    "prp-trp",
  ]),
  premises: z.array(mathOntologyDigestSchema).max(2),
  assertionIds: z.array(mathOntologyIriSchema).max(1000),
  scope: mathOntologyScopeSchema,
});
export type MathOntologyProof = z.infer<typeof mathOntologyProofSchema>;
export const mathOntologyValidationSchema = z.strictObject({
  engine: z.string(),
  conforms: z.boolean(),
  incomplete: z.boolean(),
  report: z.string(),
  focusNodeCount: z.number().int().nonnegative(),
  results: z.array(
    z.strictObject({
      focus: z.string(),
      shape: z.string(),
      component: z.string(),
      path: z.string(),
      severity: z.string(),
    }),
  ),
});
export type MathOntologyValidation = z.infer<
  typeof mathOntologyValidationSchema
>;
export const mathOntologyArtifactSchema = z.strictObject({
  identity: mathOntologyGraphIdentitySchema,
  files: z.record(z.enum(MATH_ONTOLOGY_HASH_KEYS), z.string()),
});
export type MathOntologyArtifact = z.infer<typeof mathOntologyArtifactSchema>;
export const mathOntologyQuerySchema = z.strictObject({
  kind: z.enum(["catalog", "neighbors", "path", "evidence"]),
  entityId: mathOntologyIriSchema.optional(),
  targetId: mathOntologyIriSchema.optional(),
  q: z.string().max(120).optional(),
  relation: z.enum(MATH_ONTOLOGY_RELATIONS).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().max(64000).optional(),
});
export type MathOntologyQuery = z.infer<typeof mathOntologyQuerySchema>;
export interface MathOntologyCompilePort {
  compile(
    input: MathOntologyCompileInput,
    job: {
      jobId: string;
      inputHash: string;
      leaseGeneration: number;
      expiresAt: string;
    },
  ): Promise<MathOntologyArtifact>;
}
export interface MathOntologyReleasePort {
  readActive(
    scope: string,
  ): Promise<{ generation: number; artifact: MathOntologyArtifact } | null>;
}
