import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { auditData } from "@/lib/audit";
import { branchSummary, branchSummarySelect } from "@/lib/adminBranches";
import type { BranchListResponse } from "@/contracts/branchAdmin.contract";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

const createSchema = z.strictObject({
  branchName: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(50),
  ownerEmail: z
    .email()
    .max(255)
    .transform((value) => value.trim().toLowerCase()),
});

async function handleGet(request: Request) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const [branches, pending, unassignedCount, unassignedPendingCount] =
    await Promise.all([
      db.branch.findMany({
        select: branchSummarySelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      db.user.groupBy({
        by: ["branchId"],
        where: {
          branchId: { not: null },
          deletedAt: null,
          approvalStatus: "pending",
        },
        _count: true,
      }),
      db.user.count({ where: { branchId: null, deletedAt: null } }),
      db.user.count({
        where: { branchId: null, deletedAt: null, approvalStatus: "pending" },
      }),
    ]);
  const pendingByBranch = new Map(
    pending.map((row) => [row.branchId, row._count]),
  );
  const body: BranchListResponse = {
    data: branches.map((branch) =>
      branchSummary(branch, pendingByBranch.get(branch.id) ?? 0),
    ),
    meta: {
      unassigned: {
        count: unassignedCount,
        pendingCount: unassignedPendingCount,
      },
    },
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

async function handlePost(request: Request) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "지점명과 원장 정보를 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const { branchName, ownerName, ownerEmail } = parsed.data;
  const initialPassword = randomBytes(18).toString("base64url");
  const passwordHash = await hash(initialPassword, 10);
  try {
    const created = await db.$transaction(async (tx) => {
      const branch = await tx.branch.create({ data: { name: branchName } });
      const owner = await tx.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          passwordHash,
          approvalStatus: "approved",
          branchId: branch.id,
          branchRole: "owner",
          isAdmin: true,
          isSuperAdmin: false,
        },
        select: { id: true, email: true, name: true },
      });
      await tx.accountAuditLog.create({
        data: auditData({
          userId: owner.id,
          actorId: access.account!.id,
          action: "admin.branch_created",
          outcome: "success",
          details: { branchId: branch.id },
        }),
      });
      return { branch, owner };
    });
    return Response.json(
      {
        data: {
          branch: { id: created.branch.id, name: created.branch.name },
          owner: created.owner,
          initialPassword,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002"))
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "이미 사용 중인 원장 이메일입니다.",
          },
        },
        { status: 409 },
      );
    throw error;
  }
}

export const GET = withErrorLog("/api/admin/branches", handleGet);
export const POST = withErrorLog("/api/admin/branches", handlePost);
