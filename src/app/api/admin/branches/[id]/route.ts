import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { auditData } from "@/lib/audit";
import { db } from "@/lib/db";
import { branchSummary, branchSummarySelect } from "@/lib/adminBranches";
import {
  branchUpdateSchema,
  type BranchResponse,
} from "@/contracts/branchAdmin.contract";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import {
  notifyEywaBranchMenus,
  type BranchMenusChange,
} from "@/lib/eywa/branchMenusChanged";
import { branchOwnerMenusOn } from "@/contracts/branchOwnerMenus.contract";

type Context = { params: Promise<{ id: string }> };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });
const missing = () => failure("NOT_FOUND", "지점을 찾지 못했습니다.", 404);
const conflict = () =>
  failure(
    "CONFLICT",
    "다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 확인해 주세요.",
    409,
  );
const response = (body: BranchResponse) =>
  Response.json(body, { headers: { "Cache-Control": "no-store" } });

async function handleGet(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return missing();
  const branch = await db.branch.findUnique({
    where: { id },
    select: branchSummarySelect,
  });
  if (!branch) return missing();
  const pendingCount = await db.user.count({
    where: { branchId: id, deletedAt: null, approvalStatus: "pending" },
  });
  return response({ data: branchSummary(branch, pendingCount) });
}

async function handlePatch(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return missing();
  const parsed = branchUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return failure(
      "VALIDATION_ERROR",
      "지점명과 사용 메뉴를 확인해 주세요.",
      400,
    );
  const input = parsed.data;
  const selectedMenus =
    input.menus === undefined ? null : new Set<string>(input.menus);
  // 상한이 바뀌면 지점에서 쓰는 메뉴(상한 − 원장이 끈 것)가 바뀐다 — 에이와 감사 기록에도 알린다(2026-10-19).
  let ceilingNotice: BranchMenusChange | null = null;
  try {
    const result = await db.$transaction(
      async (tx) => {
        const branch = await tx.branch.findUnique({
          where: { id },
          select: branchSummarySelect,
        });
        if (!branch) return missing();
        if (
          input.menus !== undefined &&
          branch.menuRevision !== input.expectedMenuRevision
        )
          return conflict();
        const previousMenus = branchSummary(branch, 0).menus;
        const disabledMenus =
          selectedMenus === null
            ? branch.disabledMenus
            : ALL_WORKSPACE_MENUS.filter((menu) => !selectedMenus.has(menu));
        const menusChanged =
          selectedMenus !== null &&
          (previousMenus.length !== selectedMenus.size ||
            previousMenus.some((menu) => !selectedMenus.has(menu)));
        const nameChanged =
          input.name !== undefined && input.name !== branch.name;
        if (menusChanged || nameChanged) {
          const changed = await tx.branch.updateMany({
            where: {
              id,
              ...(input.menus !== undefined
                ? { menuRevision: input.expectedMenuRevision }
                : {}),
            },
            data: {
              ...(nameChanged ? { name: input.name } : {}),
              ...(menusChanged
                ? { disabledMenus, menuRevision: { increment: 1 } }
                : {}),
            },
          });
          if (changed.count !== 1) return conflict();
          if (nameChanged)
            await tx.accountAuditLog.create({
              data: auditData({
                userId: access.account!.id,
                actorId: access.account!.id,
                action: "admin.branch_renamed",
                outcome: "success",
                details: {
                  branchId: id,
                  previousName: branch.name,
                  name: input.name!,
                },
              }),
            });
          if (menusChanged) {
            ceilingNotice = {
              kind: "ceiling",
              actorName: access.account!.name,
              previous: branchOwnerMenusOn(
                branch.disabledMenus,
                branch.ownerDisabledMenus,
              ),
              menus: branchOwnerMenusOn(
                disabledMenus,
                branch.ownerDisabledMenus,
              ),
              menuRevision: branch.menuRevision + 1,
            };
            await tx.accountAuditLog.create({
              data: auditData({
                userId: access.account!.id,
                actorId: access.account!.id,
                action: "admin.branch_menus_changed",
                outcome: "success",
                details: {
                  branchId: id,
                  previousMenus,
                  menus: ALL_WORKSPACE_MENUS.filter(
                    (menu) => !disabledMenus.includes(menu),
                  ),
                  previousMenuRevision: branch.menuRevision,
                  menuRevision: branch.menuRevision + 1,
                },
              }),
            });
          }
        }
        const updated =
          menusChanged || nameChanged
            ? await tx.branch.findUnique({
                where: { id },
                select: branchSummarySelect,
              })
            : branch;
        if (!updated)
          throw new Error("Branch disappeared after conditional update");
        const pendingCount = await tx.user.count({
          where: { branchId: id, deletedAt: null, approvalStatus: "pending" },
        });
        return response({ data: branchSummary(updated, pendingCount) });
      },
      { isolationLevel: "Serializable" },
    );
    const sent = ceilingNotice as BranchMenusChange | null;
    // 상한만 바뀌고 지점에서 쓰는 메뉴는 그대로면(원장이 이미 끈 메뉴를 닫음) 알리지 않는다 — 빈 기록 방지.
    if (
      sent &&
      result.ok &&
      (sent.previous.length !== sent.menus.length ||
        sent.previous.some((menu) => !sent.menus.includes(menu)))
    )
      notifyEywaBranchMenus(id, sent);
    return result;
  } catch (error) {
    if (isPrismaErrorCode(error, "P2034")) return conflict();
    throw error;
  }
}

export const GET = withErrorLog("/api/admin/branches/[id]", handleGet);
export const PATCH = withErrorLog("/api/admin/branches/[id]", handlePatch);
