import { z } from "zod";
import { WORKSPACE_MENUS, type WorkspaceMenu } from "./accountAccess.contract";

export type BranchSummary = {
  id: string;
  name: string;
  createdAt: string;
  menuRevision: number;
  menus: WorkspaceMenu[];
  pendingCount: number;
  _count: { users: number };
  users: { id: string; name: string; email: string; suspendedAt: string | null }[];
};
export type BranchListResponse = {
  data: BranchSummary[];
  meta: { unassigned: { count: number; pendingCount: number } };
};
export type BranchResponse = { data: BranchSummary };

// Branch policy never uses the legacy personal "english" expansion rule.
const currentMenuSchema = z.enum(WORKSPACE_MENUS.map((menu) => menu.id));
export const branchUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  menus: z.array(currentMenuSchema)
    .max(WORKSPACE_MENUS.length)
    .refine((menus) => new Set(menus).size === menus.length)
    .optional(),
  expectedMenuRevision: z.number().int().positive().max(2147483647).optional(),
}).refine((input) => input.name !== undefined || input.menus !== undefined)
  .refine((input) => (input.menus !== undefined) === (input.expectedMenuRevision !== undefined));
