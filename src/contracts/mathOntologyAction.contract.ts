import { z } from "zod";
import { isoDateTimeSchema, uuidSchema } from "./common.contract";
import {
  coursePlanInputSchema,
  coursePlanSchema,
} from "./mathSrsCourse.contract";

/** Independent of graph internals: graph identity is resolved by the server. */
export const ontologyOpaqueIdentitySchema = z.string().min(1).max(512);
export const ontologyActionDigestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);
export const ontologyPlanArgsSchema = coursePlanInputSchema.omit({
  expectedRevision: true,
});
export type OntologyPlanArgs = z.infer<typeof ontologyPlanArgsSchema>;
export const ontologyActionTargetSchema = z.strictObject({
  studentId: uuidSchema,
  classId: uuidSchema,
  branchId: uuidSchema.nullable(),
});
export type OntologyActionTarget = z.infer<typeof ontologyActionTargetSchema>;
export const ontologyActionBindingSchema = z.strictObject({
  version: z.literal(1),
  actionId: z.literal("course.plan.set/v1"),
  graphVersion: ontologyOpaqueIdentitySchema,
  sourceSnapshotId: ontologyOpaqueIdentitySchema,
  sourceSnapshotHash: ontologyActionDigestSchema,
  argumentHash: ontologyActionDigestSchema,
  evidencePacketHash: ontologyActionDigestSchema,
  previewHash: ontologyActionDigestSchema,
  contextHash: ontologyActionDigestSchema,
  expectedStudentRevision: z.number().int().nonnegative(),
});
export type OntologyActionBinding = z.infer<typeof ontologyActionBindingSchema>;
export const ontologyActionApprovalInputSchema = z.strictObject({
  proposalId: uuidSchema,
  sealHash: ontologyActionDigestSchema,
});
export const ontologyActionExecutionInputSchema =
  ontologyActionApprovalInputSchema.extend({ approvalId: uuidSchema });
export const ontologyActionReceiptSchema = z.strictObject({
  id: uuidSchema,
  proposalId: uuidSchema,
  approvalId: uuidSchema,
  outcome: z.enum(["applied", "no-op"]),
  beforeRevision: z.number().int().nonnegative(),
  afterRevision: z.number().int().nonnegative(),
  plan: coursePlanSchema.nullable(),
  committedAt: isoDateTimeSchema,
  binding: ontologyActionBindingSchema,
});
export type OntologyActionReceipt = z.infer<typeof ontologyActionReceiptSchema>;
export const ontologyActionFeedbackInputSchema = z.strictObject({
  receiptId: uuidSchema,
  sourceSnapshotId: ontologyOpaqueIdentitySchema,
});

/** Lifecycle labels are operational state, never educational truth. */
export const ontologyOperationStatusSchema = z.enum([
  "draft",
  "approved",
  "executed",
  "rejected",
  "expired",
]);
