import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  managedAccount,
  managedAccountSelect,
  pagination,
} from "@/lib/adminAccounts";
import { approvalStatusSchema } from "@/contracts/accountAccess.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const url = new URL(request.url);
  const { page, pageSize } = pagination(url);
  const status = approvalStatusSchema.safeParse(url.searchParams.get("status"));
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const where = {
    deletedAt: null,
    ...(status.success ? { approvalStatus: status.data } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [users, total, counts] = await Promise.all([
    db.user.findMany({
      where,
      select: managedAccountSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
    db.user.groupBy({
      by: ["approvalStatus"],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);
  const summary = { all: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of counts) {
    summary[row.approvalStatus] = row._count;
    summary.all += row._count;
  }
  return Response.json(
    {
      data: users.map(managedAccount),
      meta: { page, pageSize, total, counts: summary },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = withErrorLog("/api/admin/users", handleGet);
