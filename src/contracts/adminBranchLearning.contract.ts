import { z } from "zod";
import { isoDateTimeSchema } from "./common.contract";

const positiveQuery = (maximum: number, fallback: string) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .default(fallback)
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum));

/** GET /api/admin/branches/[id]/learning; the path is the canonical branch scope. */
export const adminBranchLearningQuerySchema = z.strictObject({
  kind: z.enum(["students", "classes"]),
  page: positiveQuery(100000, "1"),
  pageSize: positiveQuery(50, "20"),
  q: z.string().trim().max(100).default(""),
  classId: z.uuid().optional(),
  login: z
    .enum(["all", "issued", "unissued", "disabled", "locked", "enabled"])
    .default("all"),
});
export type AdminBranchLearningQuery = z.infer<
  typeof adminBranchLearningQuerySchema
>;

/** Stored accounts count as issued even when disabled or temporarily locked. */
export const classIssuanceSummarySchema = z
  .strictObject({
    total: z.number().int().nonnegative(),
    issued: z.number().int().nonnegative(),
    unissued: z.number().int().nonnegative(),
  })
  .refine((value) => value.issued + value.unissued === value.total);
export type ClassIssuanceSummary = z.infer<typeof classIssuanceSummarySchema>;

export const adminBranchLearningStudentSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  grade: z.string().nullable(),
  /** Current in-branch management context; never a foreign compatibility pointer. */
  classId: z.uuid().nullable(),
  useIndividualProgress: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  sourceManaged: z.boolean(),
  withdrawn: z.boolean(),
  login: z.enum(["unissued", "disabled", "locked", "enabled"]),
  account: z
    .strictObject({
      loginId: z.string(),
      status: z.enum(["disabled", "locked", "enabled"]),
      issuedAt: isoDateTimeSchema,
      lastLoginAt: isoDateTimeSchema.nullable(),
    })
    .nullable(),
  classes: z.array(
    z.strictObject({
      id: z.uuid(),
      name: z.string(),
      membership: z.enum(["legacy", "enrolled", "on-hold"]),
    }),
  ),
});
export type AdminBranchLearningStudent = z.infer<
  typeof adminBranchLearningStudentSchema
>;

export const adminBranchLearningClassSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  grade: z.string(),
  active: z.boolean(),
  sourceManaged: z.boolean(),
  teachers: z.array(z.string()),
  enrolledCount: z.number().int().nonnegative(),
  issuanceSummary: classIssuanceSummarySchema,
});
export type AdminBranchLearningClass = z.infer<
  typeof adminBranchLearningClassSchema
>;

const meta = z.strictObject({
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
});
const filters = z.strictObject({
  classes: z.array(z.strictObject({ id: z.uuid(), name: z.string() })),
});
export const adminBranchLearningResponseSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("students"),
    data: z.array(adminBranchLearningStudentSchema),
    meta,
    filters,
  }),
  z.strictObject({
    kind: z.literal("classes"),
    data: z.array(adminBranchLearningClassSchema),
    meta,
    filters,
  }),
]);
export type AdminBranchLearningResponse = z.infer<
  typeof adminBranchLearningResponseSchema
>;
