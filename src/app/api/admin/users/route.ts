import { db } from "@/lib/db";
import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import {
  managedAccount,
  managedAccountSelect,
  pagination,
} from "@/lib/adminAccounts";
import { approvalStatusSchema } from "@/contracts/accountAccess.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: Request) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const url = new URL(request.url);
  const filters = url.searchParams.getAll("branchId");
  const filter = filters[0];
  if (
    filters.length !== 1 ||
    (filter !== "unassigned" && !z.uuid().safeParse(filter).success)
  )
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "계정을 조회할 지점을 선택해 주세요.",
        },
      },
      { status: 400 },
    );
  const branchId = filter === "unassigned" ? null : filter;
  if (
    branchId &&
    !(await db.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    }))
  )
    return Response.json(
      { error: { code: "NOT_FOUND", message: "지점을 찾지 못했습니다." } },
      { status: 404 },
    );
  const { page, pageSize } = pagination(url);
  const status = approvalStatusSchema.safeParse(url.searchParams.get("status"));
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const lifecycle = url.searchParams.get("lifecycle");
  const where = {
    branchId,
    deletedAt: lifecycle === "deleted" ? { not: null } : null,
    ...(lifecycle === "suspended" ? { suspendedAt: { not: null } } : {}),
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
  const [users, total, counts, suspendedCount, deletedCount] =
    await Promise.all([
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
        where: { branchId, deletedAt: null },
        _count: true,
      }),
      db.user.count({
        where: { branchId, deletedAt: null, suspendedAt: { not: null } },
      }),
      db.user.count({ where: { branchId, deletedAt: { not: null } } }),
    ]);
  const summary = { all: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of counts) {
    summary[row.approvalStatus] = row._count;
    summary.all += row._count;
  }
  return Response.json(
    {
      data: users.map(managedAccount),
      meta: {
        page,
        pageSize,
        total,
        counts: summary,
        lifecycleCounts: { suspended: suspendedCount, deleted: deletedCount },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = withErrorLog("/api/admin/users", handleGet);
