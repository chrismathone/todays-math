import { z } from "zod";

/**
 * 제품 — 옆 메뉴 맨 위 브랜드 자리의 «고르기 단추»가 오가는 단위(D-148 · 05 §8.23).
 * 메뉴는 제품 하나에 딸린다(`product` 없음 = 수학). 제품은 뷰에서 파생하고 따로 저장하지 않는다.
 */
export const WORKSPACE_PRODUCTS = [
  { id: "math", label: "오늘의수학" },
  { id: "english", label: "오늘의영어" },
] as const;
export type WorkspaceProduct = (typeof WORKSPACE_PRODUCTS)[number]["id"];

export const WORKSPACE_MENUS = [
  { id: "home", label: "오늘의 작업" },
  { id: "bank", label: "시험지 만들기" },
  { id: "studio", label: "문제 추출" },
  { id: "export", label: "시험지 · 내보내기" },
  { id: "library", label: "내 시험지" },
  { id: "teaching", label: "수업 · 학생 관리" },
  // D-124 ⑽ — «수업 · 학생 관리» 바로 아래. 강의 목록은 서비스 공용, 쓰기는 isAdmin 만(⑼).
  { id: "concept", label: "오늘의 개념" },
  // D-150 — «오늘의 개념» 바로 아래(원장님 캡처). 고정 문항 개념 백지 · 인쇄 페이지 관문 `/concept-blank`.
  { id: "conceptBlank", label: "개념 백지" },
  { id: "srs", label: "오늘의 기억 · SRS" },
  // D-148 — 둘째 제품 «오늘의 영어». 권한은 이 하나로, 그 아래 탭 셋(학교별 내신 대비 · 문제 만들기 ·
  // 문제 보관함)은 화면이 나눈다(25 §1.2). 관문은 `/api/english` · `/english`(인쇄 페이지).
  { id: "english", label: "오늘의 영어", product: "english" },
] as const;
// ⚠️ 아래 enum 은 위 배열에서 파생되지 않는다 — 메뉴를 더하면 두 곳을 같이 고친다.
export const workspaceMenuSchema = z.enum([
  "home",
  "bank",
  "studio",
  "export",
  "library",
  "teaching",
  "concept",
  "conceptBlank",
  "srs",
  "english",
]);
export type WorkspaceMenu = z.infer<typeof workspaceMenuSchema>;
export const ALL_WORKSPACE_MENUS: WorkspaceMenu[] = WORKSPACE_MENUS.map(
  (menu) => menu.id,
);
/** 메뉴가 딸린 제품 — `product` 가 없으면 수학 */
export function workspaceMenuProduct(menu: WorkspaceMenu): WorkspaceProduct {
  const found = WORKSPACE_MENUS.find((item) => item.id === menu);
  return found && "product" in found ? found.product : "math";
}
/** 한 제품의 메뉴만(옆 메뉴 순서 그대로) */
export function workspaceMenusOf(product: WorkspaceProduct): WorkspaceMenu[] {
  return ALL_WORKSPACE_MENUS.filter(
    (menu) => workspaceMenuProduct(menu) === product,
  );
}
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
