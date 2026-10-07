import type { NextRequest } from "next/server";
import { idParamSchema } from "@/contracts/common.contract";
import {
  studentLearningMenusRequestSchema,
  studentLearningMenusResponseSchema,
} from "@/contracts/studentLearningMenus.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  forbiddenError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import {
  readManagedStudentLearningMenus,
  saveManagedStudentLearningMenus,
} from "@/lib/learn/manageStudentLearningMenus";
import { canManageStudentAccounts } from "@/lib/learn/studentAccountPolicy";
import { getSessionUser } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(_request: NextRequest, { params }: RouteContext) {
  const viewer = await getSessionUser();
  if (!viewer) return noStore(unauthorizedError());
  if (!canManageStudentAccounts(viewer)) return noStore(forbiddenError());
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) return noStore(validationError(parsed.error));
  const result = await readManagedStudentLearningMenus(viewer, parsed.data.id);
  return noStore(
    result.ok
      ? jsonOk(studentLearningMenusResponseSchema, { data: result.data })
      : result.response,
  );
}

async function handlePut(request: NextRequest, { params }: RouteContext) {
  const viewer = await getSessionUser();
  if (!viewer) return noStore(unauthorizedError());
  if (!canManageStudentAccounts(viewer)) return noStore(forbiddenError());
  if (!sameOriginMutation(request)) return noStore(crossSiteError());
  const id = idParamSchema.safeParse(await params);
  if (!id.success) return noStore(validationError(id.error));
  const parsed = studentLearningMenusRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return noStore(validationError(parsed.error));
  const result = await saveManagedStudentLearningMenus(
    viewer,
    id.data.id,
    parsed.data.enabled,
  );
  return noStore(
    result.ok
      ? jsonOk(studentLearningMenusResponseSchema, { data: result.data })
      : result.response,
  );
}

export const GET = withErrorLog("/api/students/[id]/learning-menus", handleGet);
export const PUT = withErrorLog("/api/students/[id]/learning-menus", handlePut);
