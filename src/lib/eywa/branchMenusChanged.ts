import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { branchMenuLabel } from "@/contracts/branchOwnerMenus.contract";
import { bindingConfigs, sourceRequest } from "./managedTransport";

export const BRANCH_MENUS_CHANGED_PATH =
  "/api/integrations/todays-math/v2/menus-changed";

export type BranchMenusChange = {
  /** owner = 지점 원장의 선택 · ceiling = 최고관리자의 상한 */
  kind: "owner" | "ceiling";
  actorName: string;
  previous: readonly string[];
  menus: readonly string[];
  menuRevision: number;
};

const labels = (menus: readonly string[], branchId: string) =>
  menus.map((menu) => branchMenuLabel(menu, branchId));

/**
 * 오늘 수학에서 지점 메뉴가 바뀌면 에이와에 알려 에이와 감사 기록에도 남긴다(원장님 2026-10-19 «감사로그 서로 배선»).
 * 연결된 지점(`eywa_binding.target_branch_id`)만 · 응답이 나간 뒤(`after`) · 실패는 삼킨다(메뉴 저장은 이미 끝났다 —
 * 에이와 화면은 열 때마다 오늘 수학에서 지금 값을 다시 읽으므로 알림이 빠져도 값은 어긋나지 않고 기록 한 줄만 빠진다).
 * 같은 알림이 두 번 가도 에이와는 `eventId` 로 한 번만 적는다.
 */
export function notifyEywaBranchMenus(
  branchId: string,
  change: BranchMenusChange,
): void {
  try {
    after(() => send(branchId, change));
  } catch {
    // 요청 밖(시험 · 스크립트)에서는 `after` 가 던진다 — 알림은 덤이라 건너뛴다.
  }
}

async function send(branchId: string, change: BranchMenusChange) {
  try {
    const binding = await db.eywaBinding.findUnique({
      where: { targetBranchId: branchId },
      select: { id: true, retiredAt: true, enabled: true },
    });
    if (!binding || binding.retiredAt || !binding.enabled) return;
    const config = bindingConfigs(binding.id).find(
      (c) => c.bindingId === binding.id,
    );
    if (!config) return;
    await sourceRequest(config, "control", BRANCH_MENUS_CHANGED_PATH, {
      bindingId: binding.id,
      eventId: randomUUID(),
      kind: change.kind,
      actorName: change.actorName.slice(0, 50),
      turnedOn: labels(
        change.menus.filter((menu) => !change.previous.includes(menu)),
        branchId,
      ),
      turnedOff: labels(
        change.previous.filter((menu) => !change.menus.includes(menu)),
        branchId,
      ),
      menus: labels(change.menus, branchId),
      menuRevision: change.menuRevision,
    });
  } catch {
    console.error("[eywa] 지점 메뉴 변경 알림 실패");
  }
}
