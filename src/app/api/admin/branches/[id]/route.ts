import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
});

async function handlePatch(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;

  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return Response.json(
      { error: { code: "NOT_FOUND", message: "지점을 찾지 못했습니다." } },
      { status: 404 },
    );
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: { code: "VALIDATION_ERROR", message: "지점명을 확인해 주세요." },
      },
      { status: 400 },
    );

  const branch = await db.branch.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!branch)
    return Response.json(
      { error: { code: "NOT_FOUND", message: "지점을 찾지 못했습니다." } },
      { status: 404 },
    );

  if (branch.name === parsed.data.name)
    return Response.json(
      { data: branch },
      { headers: { "Cache-Control": "no-store" } },
    );

  const updated = await db.branch.update({
    where: { id },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });
  await recordAudit({
    userId: access.account!.id,
    actorId: access.account!.id,
    action: "admin.branch_renamed",
    outcome: "success",
    details: { branchId: id, previousName: branch.name, name: updated.name },
  });
  return Response.json(
    { data: updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const PATCH = withErrorLog("/api/admin/branches/[id]", handlePatch);
