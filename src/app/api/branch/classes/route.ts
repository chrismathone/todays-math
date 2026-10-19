import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  if (!access.account?.branchId)
    return Response.json(
      { error: { code: "FORBIDDEN", message: "소속 지점이 필요합니다." } },
      { status: 403 },
    );
  const classes = await db.class.findMany({
    where: {
      branchId: access.account.branchId,
      active: true,
      OR: [{ closedAt: null }, { closedAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      name: true,
      grade: true,
      userId: true,
      user: { select: { name: true } },
      _count: { select: { students: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return Response.json(
    { data: classes },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = withErrorLog("/api/branch/classes", handleGet);
