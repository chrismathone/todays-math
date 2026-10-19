import "server-only";
import { auditData } from "@/lib/audit";
import { db } from "@/lib/db";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { notifyEywaBranchMenus } from "@/lib/eywa/branchMenusChanged";
import {
  branchMenuLabel,
  branchOwnerMenuItems,
  branchOwnerMenusOn,
  nextOwnerDisabled,
  type BranchOwnerMenus,
  type BranchOwnerMenusUpdate,
} from "@/contracts/branchOwnerMenus.contract";

/**
 * 지점 원장의 사용 메뉴 읽기 · 저장 — 오늘 수학 지점관리(`/api/branch/menus`)와 에이와(`/api/integrations/eywa/v2/branch-menus`)가
 * 같은 함수를 쓴다(원장님 2026-10-19 «오늘 수학 관리자가 온오프해도, 에이와 지점장이 온오프해도 연동»).
 * 감사 기록은 이 함수가 같은 트랜잭션에서 남기고(누가 · 어디서 · 켠 것 · 끈 것), 오늘 수학에서 바꾼 것은 저장 뒤 에이와에도 알린다
 * («감사로그 서로 배선»). 에이와에서 온 저장은 에이와가 제 감사 기록을 이미 남기므로 되돌려 알리지 않는다.
 */
export type BranchOwnerMenusActor =
  | { source: "today"; userId: string; name: string }
  | {
      source: "eywa";
      eywaUserId: string;
      name: string;
      /** 기록의 주인 — 그 에이와 사용자와 연결된 이 지점 계정, 없으면 지점 원장(없으면 null) */
      userId: string | null;
    };
export type SaveBranchOwnerMenusResult =
  | { ok: true; changed: boolean; data: BranchOwnerMenus }
  | { ok: false; code: "NOT_FOUND" | "CONFLICT" | "MENU_NOT_OPEN" };

const select = {
  id: true,
  name: true,
  disabledMenus: true,
  ownerDisabledMenus: true,
  menuRevision: true,
} as const;
type Row = {
  id: string;
  name: string;
  disabledMenus: string[];
  ownerDisabledMenus: string[];
  menuRevision: number;
};
const view = (row: Row): BranchOwnerMenus => ({
  revision: row.menuRevision,
  items: branchOwnerMenuItems(
    row.disabledMenus,
    row.ownerDisabledMenus,
    row.id,
  ),
});

export async function readBranchOwnerMenus(
  branchId: string,
): Promise<BranchOwnerMenus | null> {
  const row = await db.branch.findUnique({ where: { id: branchId }, select });
  return row ? view(row) : null;
}

export async function saveBranchOwnerMenus(
  branchId: string,
  input: BranchOwnerMenusUpdate,
  actor: BranchOwnerMenusActor,
): Promise<SaveBranchOwnerMenusResult> {
  let notice: { previous: string[]; menus: string[]; revision: number } | null =
    null;
  let result: SaveBranchOwnerMenusResult;
  try {
    result = await db.$transaction(
      async (tx): Promise<SaveBranchOwnerMenusResult> => {
        const row = await tx.branch.findUnique({
          where: { id: branchId },
          select,
        });
        if (!row) return { ok: false, code: "NOT_FOUND" };
        if (row.menuRevision !== input.expectedMenuRevision)
          return { ok: false, code: "CONFLICT" };
        const next = nextOwnerDisabled(
          row.disabledMenus,
          row.ownerDisabledMenus,
          input.menus,
        );
        if (!next) return { ok: false, code: "MENU_NOT_OPEN" };
        const previous = branchOwnerMenusOn(
          row.disabledMenus,
          row.ownerDisabledMenus,
        );
        const menus = branchOwnerMenusOn(row.disabledMenus, next);
        if (
          next.length === row.ownerDisabledMenus.length &&
          next.every((menu) => row.ownerDisabledMenus.includes(menu))
        )
          return { ok: true, changed: false, data: view(row) };
        const changed = await tx.branch.updateMany({
          where: { id: branchId, menuRevision: input.expectedMenuRevision },
          data: { ownerDisabledMenus: next, menuRevision: { increment: 1 } },
        });
        if (changed.count !== 1) return { ok: false, code: "CONFLICT" };
        await tx.accountAuditLog.create({
          data: auditData({
            userId: actor.userId,
            // 에이와에서 온 저장은 오늘 수학 사람이 한 일이 아니다 — 행위자는 비우고 이름 · 출처로 남긴다.
            actorId: actor.source === "today" ? actor.userId : null,
            action: "branch.owner_menus_changed",
            outcome: "success",
            details: {
              branchId,
              branchName: row.name,
              source: actor.source,
              actorName: actor.name,
              ...(actor.source === "eywa"
                ? { eywaUserId: actor.eywaUserId }
                : {}),
              previousMenus: previous,
              menus,
              turnedOn: menus
                .filter((menu) => !previous.includes(menu))
                .map((menu) => branchMenuLabel(menu, branchId)),
              turnedOff: previous
                .filter((menu) => !menus.includes(menu))
                .map((menu) => branchMenuLabel(menu, branchId)),
              previousMenuRevision: row.menuRevision,
              menuRevision: row.menuRevision + 1,
            },
          }),
        });
        notice = { previous, menus, revision: row.menuRevision + 1 };
        return {
          ok: true,
          changed: true,
          data: view({
            ...row,
            ownerDisabledMenus: next,
            menuRevision: row.menuRevision + 1,
          }),
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2034"))
      return { ok: false, code: "CONFLICT" };
    throw error;
  }
  const sent = notice as {
    previous: string[];
    menus: string[];
    revision: number;
  } | null;
  if (sent && actor.source === "today")
    notifyEywaBranchMenus(branchId, {
      kind: "owner",
      actorName: actor.name,
      previous: sent.previous,
      menus: sent.menus,
      menuRevision: sent.revision,
    });
  return result;
}
