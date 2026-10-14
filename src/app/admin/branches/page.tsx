import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminBranches from "@/components/admin/AdminBranches";
import { getAccountAccess } from "@/lib/accountAccess";

export const metadata: Metadata = { title: "지점 개설 | 오늘 수학" };

export default async function AdminBranchesPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fadmin%2Fbranches");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isSuperAdmin) redirect("/");
  return (
    <AdminBranches identity={{ name: account.name, email: account.email }} />
  );
}
