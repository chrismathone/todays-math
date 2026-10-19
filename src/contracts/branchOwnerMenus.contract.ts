import { z } from "zod";
import {
  ALL_WORKSPACE_MENUS,
  WORKSPACE_MENUS,
  WORKSPACE_PRODUCTS,
  WORKSPACE_SELECTABLE_MENUS,
  workspaceMenuOptionsOf,
  type WorkspaceMenu,
  type WorkspaceProduct,
} from "./accountAccess.contract";

/**
 * 지점 원장의 사용 메뉴(원장님 2026-10-19 «관리자가 오픈한 메뉴에 한해서» · «원장만»).
 * 두 층이다 — 최고관리자가 연 메뉴(`branch.disabled_menus` 의 여집합 = 상한) 안에서 원장이 끈 메뉴(`branch.owner_disabled_menus`).
 * 지점 전원의 메뉴 = 상한 − 원장이 끈 것 → 그다음 개인 설정과 교집합(`workspaceMenuPolicy`).
 * 에이와 원장도 같은 값을 서명 통로로 읽고 쓴다(`/api/integrations/eywa/v2/branch-menus`) — 저장은 이 한 곳뿐이다.
 * 🔴 상한이 닫은 메뉴에 대한 원장의 선택은 지우지 않고 보존한다 — 최고관리자가 다시 열면 원장의 선택대로 돌아온다.
 */
export type BranchOwnerMenuItem = {
  menu: WorkspaceMenu;
  label: string;
  product: WorkspaceProduct;
  /** 최고관리자가 열었나 — 닫혀 있으면 원장은 켤 수 없다 */
  open: boolean;
  /** 지점에서 쓰나(열려 있고 원장이 끄지 않음) */
  on: boolean;
};
export type BranchOwnerMenus = {
  revision: number;
  items: BranchOwnerMenuItem[];
};

const currentMenuSchema = z.enum(WORKSPACE_MENUS.map((menu) => menu.id));
/** 관리 화면에서 고르는 메뉴(«시험지 · 내보내기»는 2026-10-19부터 고르지 않는다 — 저장값만 보존). */
const SELECTABLE = new Set<string>(
  WORKSPACE_SELECTABLE_MENUS.map((menu) => menu.id),
);
export const branchOwnerMenusUpdateSchema = z.strictObject({
  menus: z
    .array(currentMenuSchema)
    .max(WORKSPACE_MENUS.length)
    .refine((menus) => new Set(menus).size === menus.length),
  expectedMenuRevision: z.number().int().positive().max(2147483647),
});
export type BranchOwnerMenusUpdate = z.infer<
  typeof branchOwnerMenusUpdateSchema
>;

/** 화면 순서 = 제품 → 옆 메뉴 순서. 이름은 작업실의 이름 그대로(지점이 있으면 «우리학원 시험지»). */
export function branchOwnerMenuItems(
  ceilingDisabled: readonly string[],
  ownerDisabled: readonly string[],
  branchId: string,
): BranchOwnerMenuItem[] {
  return WORKSPACE_PRODUCTS.flatMap(({ id: product }) =>
    workspaceMenuOptionsOf(product, branchId).map((option) => {
      const open = !ceilingDisabled.includes(option.permission);
      return {
        menu: option.permission,
        label: option.label,
        product,
        open,
        on: open && !ownerDisabled.includes(option.permission),
      };
    }),
  );
}

/**
 * 원장이 고른 «켤 메뉴»로 새 «원장이 끈 메뉴»를 만든다. 열리지 않은 메뉴를 켜려 하면 거절(null).
 * 닫힌 메뉴에 대한 지난 선택은 그대로 둔다(다시 열리면 되살아난다).
 */
export function nextOwnerDisabled(
  ceilingDisabled: readonly string[],
  ownerDisabled: readonly string[],
  selected: readonly WorkspaceMenu[],
): WorkspaceMenu[] | null {
  const on = new Set<string>(selected);
  if (selected.some((menu) => ceilingDisabled.includes(menu))) return null;
  // 고르지 않는 메뉴(저장 호환용 export — 보내와도 무시)와 닫힌 메뉴는 지난 값 그대로.
  return ALL_WORKSPACE_MENUS.filter((menu) =>
    ceilingDisabled.includes(menu) || !SELECTABLE.has(menu)
      ? ownerDisabled.includes(menu)
      : !on.has(menu),
  );
}

/** 화면과 같은 이름(지점이 있으면 «우리학원 시험지») — 감사 기록 · 에이와 알림도 이 이름을 쓴다. */
export function branchMenuLabel(menu: string, branchId: string): string {
  for (const { id } of WORKSPACE_PRODUCTS) {
    const found = workspaceMenuOptionsOf(id, branchId).find(
      (option) => option.permission === menu,
    );
    if (found) return found.label;
  }
  return menu;
}

/** 지점에서 쓰는 메뉴(상한 − 원장이 끈 것) — 고르는 메뉴만. 감사 기록 · 에이와 알림의 «전 · 후» 값. */
export function branchOwnerMenusOn(
  ceilingDisabled: readonly string[],
  ownerDisabled: readonly string[],
): WorkspaceMenu[] {
  return ALL_WORKSPACE_MENUS.filter(
    (menu) =>
      SELECTABLE.has(menu) &&
      !ceilingDisabled.includes(menu) &&
      !ownerDisabled.includes(menu),
  );
}
