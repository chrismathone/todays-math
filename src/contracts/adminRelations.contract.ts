import { z } from "zod";

const positiveQuery = (maximum: number, fallback: string) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .default(fallback)
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum));

/** GET /api/admin/users/[id]/relations. An explicit branch is always required. */
export const adminRelationsQuerySchema = z.strictObject({
  branchId: z.union([z.uuid(), z.literal("unassigned")]),
  kind: z.enum(["classes", "students"]),
  page: positiveQuery(100000, "1"),
  pageSize: positiveQuery(50, "20"),
});
export type AdminRelationsQuery = z.infer<typeof adminRelationsQuerySchema>;

export const relationSyncSchema = z.enum([
  "local",
  "legacy",
  "active",
  "paused",
  "unverified",
]);
const membershipRoleSchema = z.enum(["homeroom", "slot", "delegate"]);
export const connectedClassSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  grade: z.string(),
  active: z.boolean(),
  owner: z.boolean(),
  memberships: z.array(membershipRoleSchema),
  sync: relationSyncSchema,
});
export type ConnectedClass = z.infer<typeof connectedClassSchema>;
export const connectedStudentSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  grade: z.string().nullable(),
  sync: relationSyncSchema,
  login: z.enum(["unissued", "disabled", "locked", "enabled"]),
  classes: z.array(
    z.strictObject({
      id: z.uuid(),
      name: z.string(),
      membership: z.enum(["legacy", "enrolled", "on-hold"]),
    }),
  ),
});
export type ConnectedStudent = z.infer<typeof connectedStudentSchema>;
const metaSchema = z.strictObject({
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
});
export const adminRelationsResponseSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("classes"),
    data: z.array(connectedClassSchema),
    meta: metaSchema,
  }),
  z.strictObject({
    kind: z.literal("students"),
    data: z.array(connectedStudentSchema),
    meta: metaSchema,
  }),
]);
export type AdminRelationsResponse = z.infer<
  typeof adminRelationsResponseSchema
>;
