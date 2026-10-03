import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClassMathSrs } from "@/components/math-srs/ClassMathSrs";
import { AppChrome } from "@/components/chrome/AppChrome";
import { uuidSchema } from "@/contracts/common.contract";
import { getAccountAccess } from "@/lib/accountAccess";
import { requireOwnedClass } from "@/lib/ownership";

export const metadata: Metadata = { title: "반 수학 복습 · 오늘의수학" };

export default async function ClassMathSrsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getAccountAccess();
  if (!account) redirect("/login");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.menus.includes("teaching")) notFound();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const owned = await requireOwnedClass(id, account);
  if (!owned.ok) notFound();
  const manageHref =
    account.branchRole === "owner" || account.branchRole === "manager"
      ? "/branch?tab=classes"
      : "/classes/manage";
  return (
    <AppChrome
      activeNav="classes"
      currentLabel="반 수학 복습"
      classesHref={manageHref}
    >
      <ClassMathSrs key={id} classId={id} manageHref={manageHref} />
    </AppChrome>
  );
}
