import { connection } from "next/server";
import { redirect } from "next/navigation";
import WorkspacePage from "@/components/unified/WorkspacePage";
import { getAccountAccess } from "@/lib/accountAccess";

export const metadata = {
  title: "자료 제작 · 오늘수학",
  robots: { index: false, follow: false },
};
export default async function StudioPage() {
  await connection();
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fstudio");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (account.role === "reviewer" && !account.isAdmin) redirect("/");
  return <WorkspacePage user={account} />;
}
