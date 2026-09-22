import { authorizePrivate, privateHeaders } from "@/lib/privateWorkspace";
import { pagination } from "@/lib/adminAccounts";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function handleGet(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await authorizePrivate(request, id);
  if (access.response) return access.response;
  const { page, pageSize } = pagination(new URL(request.url), 30);
  const where = { userId: id };
  const [items, total] = await Promise.all([
    db.accountAuditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        outcome: true,
        details: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.accountAuditLog.count({ where }),
  ]);
  return Response.json(
    {
      data: items.map(({ actor, ...item }) => ({
        ...item,
        actorName: actor?.name ?? "시스템",
        createdAt: item.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    },
    { headers: privateHeaders },
  );
}

export const GET = withErrorLog("/api/admin/users/[id]/audit", handleGet);
