import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import ApprovalPending from "@/components/approval-pending/ApprovalPending";

export const metadata: Metadata = { title: "가입 승인 확인 | 오늘 수학" };

export default async function ApprovalPendingPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fapproval-pending");
  if (account.approvalStatus === "approved") redirect("/");
  return <ApprovalPending account={account} />;
}
