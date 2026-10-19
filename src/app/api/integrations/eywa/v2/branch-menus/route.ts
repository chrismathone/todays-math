import { z } from "zod";
import { db } from "@/lib/db";
import {
  readBranchOwnerMenus,
  saveBranchOwnerMenus,
} from "@/lib/branchOwnerMenus";
import { branchOwnerMenusUpdateSchema } from "@/contracts/branchOwnerMenus.contract";
import {
  recheckExamReportBinding,
  verifyExamReportReceiver,
} from "@/lib/eywa/examReportReceiver";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { EywaAccessError } from "@/lib/eywa/managedPolicy";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * 에이와 원장이 보는 · 바꾸는 오늘 수학 지점 사용 메뉴(원장님 2026-10-19 «에이와 지점장이 온오프해도 연동»).
 * 다른 연동 피드와 같은 서명 · 활성 연결 · 지점 판정. 연결된 지점(target_branch_id) 하나만.
 * 쓰기는 일회 nonce(다시 보낸 요청 거절) · 업무 실패(충돌 · 열리지 않은 메뉴)는 200 `{ ok:false, code }` 로 답한다 —
 * 에이와의 서명 통로가 2xx 밖을 모두 '연결 실패'로 접기 때문에 화면이 까닭을 말하려면 본문에 실어야 한다.
 * 감사 기록은 오늘 수학에 «에이와 · 이름»으로 남고, 에이와는 제 기록을 따로 남긴다.
 */
const writeSchema = z.strictObject({
  bindingId: z.uuid(),
  actor: z.strictObject({
    eywaUserId: z.uuid(),
    name: z.string().trim().min(1).max(50),
  }),
  update: branchOwnerMenusUpdateSchema,
});

async function get(request: Request) {
  try {
    const binding = await verifyExamReportReceiver(request);
    const data = await readBranchOwnerMenus(binding.targetBranchId);
    if (!data) throw new EywaAccessError("binding_mismatch");
    return Response.json(
      { version: "v1", bindingId: binding.id, ...data },
      { headers: NO_STORE },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}

async function post(request: Request) {
  try {
    const verified = await verifyReceiverRequest(request, true);
    const parsed = writeSchema.safeParse(JSON.parse(verified.raw || "null"));
    if (!parsed.success || parsed.data.bindingId !== verified.binding.id)
      throw new EywaAccessError("binding_mismatch");
    const binding = await recheckExamReportBinding(verified.binding);
    const { actor, update } = parsed.data;
    // 기록의 주인 = 그 에이와 사용자와 연결된 이 지점 계정 → 없으면 이 지점 원장(계정별 활동 기록에서 보이게).
    const linked =
      (await db.user.findFirst({
        where: {
          eywaUserId: actor.eywaUserId,
          branchId: binding.targetBranchId,
          deletedAt: null,
        },
        select: { id: true },
      })) ??
      (await db.user.findFirst({
        where: {
          branchId: binding.targetBranchId,
          branchRole: "owner",
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }));
    const result = await saveBranchOwnerMenus(binding.targetBranchId, update, {
      source: "eywa",
      eywaUserId: actor.eywaUserId,
      name: actor.name,
      userId: linked?.id ?? null,
    });
    return Response.json(
      result.ok
        ? { ok: true, changed: result.changed, ...result.data }
        : { ok: false, code: result.code },
      { headers: NO_STORE },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}

export const GET = withErrorLog("/api/integrations/eywa/v2/branch-menus", get);
export const POST = withErrorLog(
  "/api/integrations/eywa/v2/branch-menus",
  post,
);
