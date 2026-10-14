import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";

export const metadata: Metadata = { title: "계정 관리 | 오늘 수학" };

export default async function AdminPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fadmin");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isSuperAdmin) redirect("/");

  redirect("/admin/branches");
}
