import { z } from "zod";

/**
 * 제품 — 옆 메뉴 맨 위 브랜드 자리의 «고르기 단추»가 오가는 단위(D-148 · 05 §8.23).
 * 메뉴는 제품 하나에 딸린다(`product` 없음 = 수학). 제품은 뷰에서 파생하고 따로 저장하지 않는다.
 */
export const WORKSPACE_PRODUCTS = [
  { id: "math", label: "오늘 수학" },
  { id: "english", label: "오늘 영어" },
] as const;
export type WorkspaceProduct = (typeof WORKSPACE_PRODUCTS)[number]["id"];

export const WORKSPACE_MENUS = [
  { id: "home", label: "오늘의 작업" },
  { id: "bank", label: "시험지 만들기" },
  { id: "studio", label: "문제 추출" },
  { id: "export", label: "시험지 · 내보내기" },
  { id: "library", label: "내 시험지" },
  { id: "textbook", label: "교재 제작" },
  { id: "teaching", label: "수업 · 학생 관리" },
  // D-124 ⑽ — «수업 · 학생 관리» 바로 아래. 강의 목록은 서비스 공용, 쓰기는 isAdmin 만(⑼).
  { id: "concept", label: "오늘의 개념" },
  // D-150 — «오늘의 개념» 바로 아래(원장님 캡처). 고정 문항 개념 백지 · 인쇄 페이지 관문 `/concept-blank`.
  { id: "conceptBlank", label: "개념 백지" },
  { id: "srs", label: "오늘의 기억 · SRS" },
  { id: "english-school", label: "학교별 내신 대비", product: "english" },
  { id: "english-maker", label: "문제 만들기", product: "english" },
  { id: "english-library", label: "문제 보관함", product: "english" },
  { id: "english-listening", label: "영어듣기", product: "english" },
  { id: "english-bank", label: "자료은행", product: "english" },
] as const;
// ⚠️ 아래 enum 은 위 배열에서 파생되지 않는다 — 메뉴를 더하면 두 곳을 같이 고친다.
export const workspaceMenuSchema = z.enum([
  "home",
  "bank",
  "studio",
  "export",
  "library",
  "textbook",
  "teaching",
  "concept",
  "conceptBlank",
  "srs",
  "english",
  "english-school",
  "english-maker",
  "english-library",
  "english-listening",
  "english-bank",
]);
export type WorkspaceMenu = z.infer<typeof workspaceMenuSchema>;
export const ALL_WORKSPACE_MENUS: WorkspaceMenu[] = WORKSPACE_MENUS.map(
  (menu) => menu.id,
);
/** 이전 english 허용/차단 값은 세 권한으로 확장한다. 새 저장값에는 통합 키를 남기지 않는다. */
export function normalizeWorkspaceMenus(
  menus: readonly string[],
): WorkspaceMenu[] {
  return [
    ...new Set(
      menus.flatMap((menu) =>
        menu === "english"
          ? ([
              "english-school",
              "english-maker",
              "english-library",
            ] as WorkspaceMenu[])
          : ALL_WORKSPACE_MENUS.filter((item) => item === menu),
      ),
    ),
  ];
}

/** 영어 전체 차단 의도는 새 듣기 메뉴에도 적용한다. 허용 목록의 옛 english 값은 확장하지 않는다. */
export function workspaceMenusFromDisabled(
  disabledMenus: readonly string[],
): WorkspaceMenu[] {
  const disabled = new Set(normalizeWorkspaceMenus(disabledMenus));
  if (
    disabledMenus.includes("english") ||
    ["english-school", "english-maker", "english-library"].every((menu) =>
      disabledMenus.includes(menu),
    )
  ) {
    disabled.add("english-listening");
    disabled.add("english-bank");
  }
  return ALL_WORKSPACE_MENUS.filter((menu) => !disabled.has(menu));
}
/** Branch policy uses exact current menu IDs, without personal legacy English inference. */
export function workspaceMenusFromBranchDisabled(
  disabledMenus: readonly string[],
): WorkspaceMenu[] {
  return ALL_WORKSPACE_MENUS.filter((menu) => !disabledMenus.includes(menu));
}

/** A personal allow list must survive the existing deny-list compatibility rules unchanged. */
export function isPersonalMenuSelectionRepresentable(
  menus: readonly string[],
): boolean {
  const configured = normalizeWorkspaceMenus(menus);
  const restored = workspaceMenusFromDisabled(
    ALL_WORKSPACE_MENUS.filter((menu) => !configured.includes(menu)),
  );
  return (
    configured.length === restored.length &&
    configured.every((menu) => restored.includes(menu))
  );
}
/** 메뉴가 딸린 제품 — `product` 가 없으면 수학 */
export function workspaceMenuProduct(menu: WorkspaceMenu): WorkspaceProduct {
  if (menu === "english") return "english";
  const found = WORKSPACE_MENUS.find((item) => item.id === menu);
  return found && "product" in found ? found.product : "math";
}
/** 한 제품의 메뉴만(옆 메뉴 순서 그대로) */
export function workspaceMenusOf(product: WorkspaceProduct): WorkspaceMenu[] {
  return ALL_WORKSPACE_MENUS.filter(
    (menu) => workspaceMenuProduct(menu) === product,
  );
}

export function workspaceLibraryLabel(branchId?: string | null): string {
  return branchId ? "우리학원 시험지" : "내 시험지";
}

/** 표시 항목과 저장 권한을 연결한다. 학교별 내신 대비의 기존 화면 주소는 english이다. */
export function workspaceMenuOptionsOf(
  product: WorkspaceProduct,
  branchId?: string | null,
): { id: string; label: string; permission: WorkspaceMenu }[] {
  if (product === "english") {
    return [
      {
        id: "english",
        label: "학교별 내신 대비",
        permission: "english-school",
      },
      {
        id: "english-maker",
        label: "문제 만들기",
        permission: "english-maker",
      },
      {
        id: "english-library",
        label: "문제 보관함",
        permission: "english-library",
      },
      {
        id: "english-listening",
        label: "영어듣기",
        permission: "english-listening",
      },
      {
        id: "english-bank",
        label: "자료은행",
        permission: "english-bank",
      },
    ];
  }
  return WORKSPACE_MENUS.filter(
    (menu) => workspaceMenuProduct(menu.id) === product,
  ).map((menu) => ({
    id: menu.id,
    label: menu.id === "library" ? workspaceLibraryLabel(branchId) : menu.label,
    permission: menu.id,
  }));
}

/** 내보내기는 진입 메뉴가 없을 때만 좌측 메뉴에 표시된다. 권한 자체는 유지한다. */
export function workspaceMenuInSidebar(
  menu: WorkspaceMenu,
  allowedMenus: readonly WorkspaceMenu[],
): boolean {
  return (
    menu !== "export" ||
    !allowedMenus.some(
      (item) => item === "bank" || item === "studio" || item === "library",
    )
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
/** Display-only summary; source identities and control data stay on the server. */
export type AccountSyncStatus = {
  status: "linked" | "unlinked";
  branchName: string | null;
  reason: string | null;
};
export type ManagedAccount = AccountAccess & {
  branchName?: string | null;
  /** Stored personal policy; editors submit this through the existing menus input. */
  configuredMenus?: WorkspaceMenu[];
  /** Exact branch cap; null only for unassigned accounts. */
  branchMenus?: WorkspaceMenu[] | null;
  branchMenuRevision?: number | null;
  /** Independent rollout restrictions, without personal or branch policy applied. */
  unavailableMenus?: WorkspaceMenu[];
  eywaSync?: AccountSyncStatus;
  /** Current managed identity owns branch assignment, even when sync is inactive. */
  branchAssignmentLocked?: boolean;
  /** Local password recovery versus source-only recovery. */
  authSource?: "local" | "eywa";
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
    branchId: z.uuid().nullable().optional(),
    expectedBranchId: z.uuid().nullable().optional(),
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
      .max(workspaceMenuSchema.options.length)
      .refine((menus) => new Set(menus).size === menus.length)
      .transform(normalizeWorkspaceMenus)
      .refine(isPersonalMenuSelectionRepresentable, {
        message:
          "기존 개인 권한 정책상 영어 앞의 세 메뉴를 모두 끄면 영어듣기와 자료은행도 꺼집니다. 개인 메뉴 선택을 다시 확인해 주세요.",
      })
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
