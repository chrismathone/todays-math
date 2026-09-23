import { z } from "zod";

export const WORKSPACE_MENUS = [
  { id: "home", label: "오늘의 작업" },
  { id: "bank", label: "시험지 만들기" },
  { id: "studio", label: "자료 제작" },
  { id: "export", label: "시험지 · 내보내기" },
  { id: "library", label: "내 시험지" },
  { id: "teaching", label: "수업 · 학생 관리" },
  // D-124 ⑽ — «수업 · 학생 관리» 바로 아래. 강의 목록은 서비스 공용, 쓰기는 isAdmin 만(⑼).
  { id: "concept", label: "오늘의 개념" },
  { id: "srs", label: "오늘의 기억 · SRS" },
] as const;
export const workspaceMenuSchema = z.enum([
  "home",
  "bank",
  "studio",
  "export",
  "library",
  "teaching",
  "concept",
  "srs",
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
  /** 최고관리자. 기존 isAdmin 은 지점 관리 권한이다. */
  isSuperAdmin?: boolean;
  branchId?: string | null;
  branchRole?: "owner" | "manager" | "teacher" | null;
  approvalStatus: ApprovalStatus;
  menus: WorkspaceMenu[];
};
export type ManagedAccount = AccountAccess & {
  branchName?: string | null;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
  deletedAt: string | null;
};
export type AdminAccountsResponse = {
  data: ManagedAccount[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    counts: Record<ApprovalStatus | "all", number>;
    lifecycleCounts?: { suspended: number; deleted: number };
  };
};
export const accountUpdateSchema = z
  .strictObject({
    approvalStatus: approvalStatusSchema.optional(),
    isAdmin: z.boolean().optional(),
    branchId: z.uuid().optional(),
    branchRole: z.enum(["owner", "manager", "teacher"]).optional(),
    name: z.string().trim().min(1).max(50).optional(),
    email: z
      .email()
      .max(255)
      .transform((value) => value.trim().toLowerCase())
      .optional(),
    suspended: z.boolean().optional(),
    deleted: z.boolean().optional(),
    menus: z
      .array(workspaceMenuSchema)
      // 손으로 적은 6 은 메뉴가 늘면 «전부 켜기»를 거절한다 — 메뉴 목록에서 센다.
      .max(WORKSPACE_MENUS.length)
      .refine((menus) => new Set(menus).size === menus.length)
      .optional(),
    expectedUpdatedAt: z.iso.datetime(),
  })
  .refine(
    (input) =>
      input.approvalStatus !== undefined ||
      input.menus !== undefined ||
      input.isAdmin !== undefined ||
      input.branchId !== undefined ||
      input.branchRole !== undefined ||
      input.name !== undefined ||
      input.email !== undefined ||
      input.suspended !== undefined ||
      input.deleted !== undefined,
  );
