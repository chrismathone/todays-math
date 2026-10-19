import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getAccountAccess } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import AdminBranchDetail from "@/components/admin/AdminBranchDetail";

export const metadata: Metadata = { title: "지점 관리 | 오늘 수학" };

export default async function AdminBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccountAccess();
  if (!account)
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/admin/branches/${encodeURIComponent(id)}`)}`,
    );
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isSuperAdmin) redirect("/");
  if (id !== "unassigned" && !z.uuid().safeParse(id).success) notFound();
  const branch =
    id === "unassigned"
      ? null
      : await db.branch.findUnique({ where: { id }, select: { name: true } });
  if (id !== "unassigned" && !branch) notFound();
  return (
    <AdminBranchDetail
      key={id}
      identity={{ name: account.name, email: account.email }}
      branchId={id}
      branchName={branch?.name ?? "미소속 계정"}
    />
  );
}
