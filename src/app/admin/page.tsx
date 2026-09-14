import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import AdminAccounts from "@/components/admin/AdminAccounts";

export const metadata: Metadata = { title: "계정 관리 | 오늘의수학" };

export default async function AdminPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fadmin");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isAdmin) redirect("/");

  return (
    <AdminAccounts identity={{ name: account.name, email: account.email }} />
  );
}
