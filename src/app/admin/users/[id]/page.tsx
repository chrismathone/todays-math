import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "계정 자료 · 활동 기록 | 오늘의수학",
};

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getAccountAccess();
  const { id } = await params;
  if (!account)
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/admin/users/${encodeURIComponent(id)}`)}`,
    );
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isSuperAdmin) redirect("/");
  const user = await db.user.findUnique({
    where: { id },
    select: managedAccountSelect,
  });
  return (
    <AdminUserDetail
      userId={id}
      identity={{ name: account.name, email: account.email }}
      initialAccount={user ? managedAccount(user) : undefined}
    />
  );
}
