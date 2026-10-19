import { authorizeAccount } from "@/lib/accountAccess";
import {
  readBranchOwnerMenus,
  saveBranchOwnerMenus,
} from "@/lib/branchOwnerMenus";
import { branchOwnerMenusUpdateSchema } from "@/contracts/branchOwnerMenus.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/**
 * 지점관리 → 사용 메뉴(원장님 2026-10-19 «원장만»). 지점 원장(branchRole owner)만 읽고 쓴다 — 지점 관리자 · 강사는 403.
 * 최고관리자가 연 메뉴 안에서만 켤 수 있다(서버가 거절). 에이와 원장도 같은 값을 쓴다(`saveBranchOwnerMenus`).
 */
const NO_STORE = { "Cache-Control": "no-store" };
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status, headers: NO_STORE });

async function ownerBranch(request: Request) {
  // 관리자 깃발(isAdmin)이 아니라 지점 역할로 가른다 — /branch 화면과 같은 판정.
  const access = await authorizeAccount(request);
  if (access.response) return { response: access.response };
  const account = access.account!;
  if (!account.branchId || account.branchRole !== "owner")
    return {
      response: failure("FORBIDDEN", "지점 원장만 사용할 수 있습니다.", 403),
    };
  return { account, branchId: account.branchId };
}

async function handleGet(request: Request) {
  const owner = await ownerBranch(request);
  if (owner.response) return owner.response;
  const data = await readBranchOwnerMenus(owner.branchId);
  if (!data) return failure("NOT_FOUND", "지점을 찾지 못했습니다.", 404);
  return Response.json({ data }, { headers: NO_STORE });
}

async function handlePatch(request: Request) {
  const owner = await ownerBranch(request);
  if (owner.response) return owner.response;
  const parsed = branchOwnerMenusUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return failure("VALIDATION_ERROR", "사용 메뉴를 확인해 주세요.", 400);
  const result = await saveBranchOwnerMenus(owner.branchId, parsed.data, {
    source: "today",
    userId: owner.account.id,
    name: owner.account.name,
  });
  if (result.ok)
    return Response.json({ data: result.data }, { headers: NO_STORE });
  if (result.code === "CONFLICT")
    return failure(
      "CONFLICT",
      "다른 곳에서 지점 메뉴를 변경했습니다. 최신 설정을 불러와 다시 확인해 주세요.",
      409,
    );
  if (result.code === "MENU_NOT_OPEN")
    return failure("MENU_NOT_OPEN", "열리지 않은 메뉴는 켤 수 없습니다.", 400);
  return failure("NOT_FOUND", "지점을 찾지 못했습니다.", 404);
}

export const GET = withErrorLog("/api/branch/menus", handleGet);
export const PATCH = withErrorLog("/api/branch/menus", handlePatch);
