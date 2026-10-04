import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  adminBranchLearningQuerySchema,
  adminBranchLearningResponseSchema,
} from "@/contracts/adminBranchLearning.contract";
import {
  AdminBranchLearningScopeError,
  readAdminBranchLearning,
} from "@/lib/adminBranchLearning";
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
    return fail(400, "지점과 조회 조건을 확인해 주세요.");
  const query = adminBranchLearningQuerySchema.safeParse(
    Object.fromEntries(params),
  );
  if (!query.success) return fail(400, "조회 조건을 확인해 주세요.");
  try {
    const result = await readAdminBranchLearning(id, query.data);
    return Response.json(adminBranchLearningResponseSchema.parse(result), {
      headers,
    });
  } catch (error) {
    if (error instanceof AdminBranchLearningScopeError)
      return fail(404, error.message);
    throw error;
  }
}
export const GET = withErrorLog("/api/admin/branches/[id]/learning", handleGet);
