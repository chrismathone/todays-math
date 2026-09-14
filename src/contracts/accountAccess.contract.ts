import { z } from "zod";

export const WORKSPACE_MENUS = [
  { id: "home", label: "오늘의 작업" },
  { id: "bank", label: "문제은행" },
  { id: "studio", label: "자료 제작" },
  { id: "export", label: "시험지 · 내보내기" },
  { id: "library", label: "내 시험지" },
  { id: "teaching", label: "수업 · 학생 관리" },
] as const;
export const workspaceMenuSchema = z.enum([
  "home",
  "bank",
  "studio",
  "export",
  "library",
  "teaching",
]);
export type WorkspaceMenu = z.infer<typeof workspaceMenuSchema>;
export const ALL_WORKSPACE_MENUS: WorkspaceMenu[] = WORKSPACE_MENUS.map(
  (menu) => menu.id,
);
export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type AccountAccess = {
  id: string;
  name: string;
  email: string;
  role: "director" | "reviewer";
  isAdmin: boolean;
  approvalStatus: ApprovalStatus;
  menus: WorkspaceMenu[];
};
export type ManagedAccount = AccountAccess & {
  createdAt: string;
  updatedAt: string;
};
export type AdminAccountsResponse = {
  data: ManagedAccount[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    counts: Record<ApprovalStatus | "all", number>;
  };
};
export const accountUpdateSchema = z
  .strictObject({
    approvalStatus: approvalStatusSchema.optional(),
    menus: z
      .array(workspaceMenuSchema)
      .max(6)
      .refine((menus) => new Set(menus).size === menus.length)
      .optional(),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .refine(
    (input) => input.approvalStatus !== undefined || input.menus !== undefined,
  );
