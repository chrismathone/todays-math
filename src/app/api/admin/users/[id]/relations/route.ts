import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  AdminRelationScopeError,
  readAdminAccountRelations,
} from "@/lib/adminAccountRelations";
import {
  adminRelationsQuerySchema,
  adminRelationsResponseSchema,
} from "@/contracts/adminRelations.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const fail = (status: number, message: string) =>
  Response.json(
    {
      error: {
        code: status === 400 ? "VALIDATION_ERROR" : "NOT_FOUND",
        message,
      },
    },
    { status, headers },
  );

async function handleGet(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  const params = new URL(request.url).searchParams;
  if (
    !z.uuid().safeParse(id).success ||
    [...params.keys()].some((key) => params.getAll(key).length !== 1)
  )
    return fail(400, "계정과 조회 조건을 확인해 주세요.");
  const query = adminRelationsQuerySchema.safeParse(Object.fromEntries(params));
  if (!query.success) return fail(400, "지점과 조회 조건을 확인해 주세요.");
  try {
    const data = await readAdminAccountRelations(id, query.data);
    return Response.json(adminRelationsResponseSchema.parse(data), { headers });
  } catch (error) {
    if (error instanceof AdminRelationScopeError)
      return fail(404, error.message);
    throw error;
  }
}

export const GET = withErrorLog("/api/admin/users/[id]/relations", handleGet);
