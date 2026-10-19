import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { uuidSchema } from "@/contracts/common.contract";
import { canOutputFrom } from "@/contracts/accountAccess.contract";
import WorkspacePage from "@/components/unified/WorkspacePage";
import { getAccountAccess } from "@/lib/accountAccess";

export default async function ExamReportPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  await connection();
  const account = await getAccountAccess();
  if (!account) redirect("/login");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (account.role !== "director" || !canOutputFrom(account.menus)) notFound();
  const { testId } = await params;
  if (!uuidSchema.safeParse(testId).success) notFound();
  return <WorkspacePage user={account} examReportTestId={testId} />;
}
