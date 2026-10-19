import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import { z } from "zod";

export const metadata: Metadata = {
  title: "계정 자료 · 활동 기록 | 오늘 수학",
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
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await db.user.findUnique({
    where: { id },
    select: { branchId: true },
  });
  if (!user) notFound();
  redirect(
    `/admin/branches/${user.branchId ?? "unassigned"}/users/${encodeURIComponent(id)}`,
  );
}
