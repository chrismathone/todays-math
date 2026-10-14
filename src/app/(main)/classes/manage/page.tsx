import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import TodayMathMark from "@/components/brand/TodayMathMark";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import TeachingView from "@/components/unified/TeachingView";
import { getAccountAccess } from "@/lib/accountAccess";
import { contextParams, type QueryValues } from "@/lib/adminReturn";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "반 관리 | 오늘 수학" };

export default async function TeacherClassesPage({
  searchParams,
}: { searchParams?: Promise<QueryValues> } = {}) {
  const context = contextParams((await searchParams) ?? {});
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fclasses%2Fmanage");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.menus.includes("teaching") || account.role === "reviewer")
    redirect("/");
  if (
    !account.isSuperAdmin &&
    account.branchId &&
    (account.branchRole === "owner" || account.branchRole === "manager")
  )
    redirect(`/branch?tab=classes${context.size ? `&${context}` : ""}`);
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerBrand}>
          <Link href="/" className={s.brand}>
            <TodayMathMark size={28} inverse />
            <span>오늘 수학</span>
          </Link>
          <span className={s.adminLabel}>반 관리</span>
        </div>
        <div className={s.headerRight}>
          <p className={s.navCaption}>수업 메뉴</p>
          <nav className={s.headerNav} aria-label="반 관리 메뉴">
            <Link
              className={s.workroomLink}
              href="/classes/manage"
              aria-current="page"
            >
              <span aria-hidden="true">⌂</span> 반 관리
              <RouteLinkStatus />
            </Link>
            <Link className={s.workroomLink} href="/">
              <span aria-hidden="true">↗</span> 작업실로 이동
              <RouteLinkStatus />
            </Link>
          </nav>
          <div className={s.headerFooter}>
            <div className={s.identity} aria-label="로그인한 계정">
              <span className={s.avatar} aria-hidden="true">
                {(account.name || "선").slice(0, 1)}
              </span>
              <span className={s.identityText}>
                <strong>{account.name || "선생님"}</strong>
                <span>{account.email}</span>
              </span>
            </div>
          </div>
        </div>
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
