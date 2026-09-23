import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeachingView from "@/components/unified/TeachingView";
import { getAccountAccess } from "@/lib/accountAccess";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "반 관리 | 오늘의수학" };

export default async function TeacherClassesPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fclasses%2Fmanage");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.menus.includes("teaching") || account.role === "reviewer")
    redirect("/");
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          오늘의수학 <span className={s.adminLabel}>반 관리</span>
        </Link>
        <Link href="/" className={s.workroomLink}>
          작업실로 이동 ↗
        </Link>
      </header>
      <main className={s.main}>
        <div className={s.titleRow}>
          <div>
            <p className={s.eyebrow}>MY CLASSES</p>
            <h1>반 관리</h1>
            <p className={s.subtitle}>
              담당 반의 학생 명단과 수업 진도를 확인하고 관리하세요.
            </p>
          </div>
        </div>
        <TeachingView />
      </main>
    </div>
  );
}
