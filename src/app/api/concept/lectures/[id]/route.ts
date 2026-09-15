/**
 * PATCH /api/concept/lectures/{id} — 게시 · 게시 내리기 · 다시 게시 · 끝까지 봤다 · 주소 넣기
 * (관리자만, D-124 ⑻⑼ · 리드 결정 2026-09-15).
 * 대응 계약: src/contracts/conceptAdmin.contract.ts (conceptLectureActionSchema)
 *
 * 전이 규칙은 `src/lib/concept/lectureTransition.ts` 한 곳이고 게시는 그 안에서 게시 관문을
 * 부른다 — 화면 단추가 잠겨 있어도 이 라우트가 다시 판정한다.
 */
import { idParamSchema } from "@/contracts/common.contract";
import {
  conceptLectureActionSchema,
  conceptLectureResponseSchema,
} from "@/contracts/conceptAdmin.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import { applyLectureAction } from "@/lib/concept/adminService";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const id = idParamSchema.safeParse(await context.params);
  if (!id.success) return validationError(id.error);
  const parsed = conceptLectureActionSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return validationError(parsed.error);
  const result = await applyLectureAction(id.data.id, parsed.data, new Date());
  if (!result.ok)
    return jsonError(
      result.code,
      result.message,
      result.status,
      result.details,
    );
  return jsonOk(conceptLectureResponseSchema, { data: result.data });
}
