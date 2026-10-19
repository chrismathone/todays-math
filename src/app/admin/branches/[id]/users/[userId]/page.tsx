import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getAccountAccess } from "@/lib/accountAccess";
import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";
import { db } from "@/lib/db";
import AdminUserDetail from "@/components/admin/AdminUserDetail";

export const metadata: Metadata = {
  title: "계정 자료 · 활동 기록 | 오늘 수학",
};

export default async function AdminBranchUserPage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id, userId } = await params;
  const account = await getAccountAccess();
  if (!account)
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/admin/branches/${encodeURIComponent(id)}/users/${encodeURIComponent(userId)}`)}`,
    );
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isSuperAdmin) redirect("/");
  if (
    (id !== "unassigned" && !z.uuid().safeParse(id).success) ||
    !z.uuid().safeParse(userId).success
  )
    notFound();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: managedAccountSelect,
  });
  if (!user || (user.branchId ?? "unassigned") !== id) notFound();
  return (
    <AdminUserDetail
      key={userId}
      userId={userId}
      branchId={id}
      identity={{ name: account.name, email: account.email }}
      initialAccount={managedAccount(user)}
    />
  );
}
