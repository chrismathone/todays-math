import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TodayMathMark from "@/components/brand/TodayMathMark";
import BranchAccounts from "@/components/branch/BranchAccounts";
import AdminSignOut from "@/components/admin/AdminSignOut";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import { getAccountAccess } from "@/lib/accountAccess";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "지점관리 | 오늘의수학" };

export default async function BranchPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fbranch");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (
    !account.branchId ||
    !["owner", "manager"].includes(account.branchRole ?? "")
  )
    redirect(account.isSuperAdmin ? "/admin" : "/");

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerBrand}>
          <Link href="/" className={s.brand}>
            <TodayMathMark size={28} inverse />
            <span>오늘의수학</span>
          </Link>
          <span className={s.adminLabel}>지점관리</span>
        </div>
        <div className={s.headerRight}>
          <p className={s.navCaption}>지점 메뉴</p>
          <nav className={s.headerNav} aria-label="지점관리 메뉴">
            <Link className={s.workroomLink} href="/branch" aria-current="page">
              <span aria-hidden="true">◫</span> 지점관리
              <RouteLinkStatus />
            </Link>
            <Link className={s.workroomLink} href="/classes/manage">
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
                {(account.name || "지").slice(0, 1)}
              </span>
              <span className={s.identityText}>
                <strong>{account.name || "지점 관리자"}</strong>
                <span>{account.email}</span>
              </span>
            </div>
            <AdminSignOut className={s.signOut} />
          </div>
        </div>
      </header>
      <main className={s.main}>
        <div className={s.titleRow}>
          <div>
            <p className={s.eyebrow}>BRANCH MANAGEMENT</p>
            <h1>지점관리</h1>
            <p className={s.subtitle}>
              반과 학생을 등록하고 학생 계정을 발급·관리하세요.
            </p>
          </div>
        </div>
        {account.branchId && (
          <BranchAccounts canCreateManagers={account.branchRole === "owner"} />
        )}
      </main>
    </div>
  );
}
