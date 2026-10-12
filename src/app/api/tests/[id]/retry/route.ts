import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { retryPlanRequestSchema } from "@/contracts/retry.contract";
import { unauthorizedError, validationError } from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { getSessionUser } from "@/lib/session";
import { planTestRetry } from "@/lib/tests/planTestRetry";

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const id = idParamSchema.safeParse(await params);
  if (!id.success) return validationError(id.error);
  const input = retryPlanRequestSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!input.success) return validationError(input.error);
  return planTestRetry(session, id.data.id, input.data);
}

export const POST = withErrorLog("/api/tests/[id]/retry", handlePost);
