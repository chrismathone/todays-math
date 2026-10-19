import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ClassMathSrs } from "@/components/math-srs/ClassMathSrs";
import { AppChrome } from "@/components/chrome/AppChrome";
import { uuidSchema } from "@/contracts/common.contract";
import { getAccountAccess } from "@/lib/accountAccess";
import { requireOwnedClass } from "@/lib/ownership";
import {
  contextParams,
  shellReturn,
  type QueryValues,
} from "@/lib/adminReturn";

export const metadata: Metadata = { title: "반 수학 복습 · 오늘 수학" };

export default async function ClassMathSrsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<QueryValues>;
}) {
  const account = await getAccountAccess();
  if (!account) redirect("/login");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.menus.includes("teaching")) notFound();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const owned = await requireOwnedClass(id, account);
  if (!owned.ok) notFound();
  const fallback =
    account.branchRole === "owner" || account.branchRole === "manager"
      ? "/branch?tab=classes"
      : "/classes/manage";
  const context = contextParams((await searchParams) ?? {});
  context.set("classId", id);
  const manageHref = shellReturn(context, fallback);
  return (
    <AppChrome
      activeNav="classes"
      currentLabel="개념 카드 복습(대수 6개 개념)"
      classesHref={manageHref}
    >
      <ClassMathSrs
        key={id}
        classId={id}
        classGrade={owned.data.grade}
        manageHref={manageHref}
      />
    </AppChrome>
  );
}
