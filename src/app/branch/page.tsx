import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TodayMathMark from "@/components/brand/TodayMathMark";
import BranchAccounts from "@/components/branch/BranchAccounts";
import BranchMenus from "@/components/branch/BranchMenus";
import AdminSignOut from "@/components/admin/AdminSignOut";
import TeachingView from "@/components/unified/TeachingView";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import { getAccountAccess } from "@/lib/accountAccess";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "지점관리 | 오늘 수학" };

export default async function BranchPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
} = {}) {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fbranch");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (
    !account.branchId ||
    !["owner", "manager"].includes(account.branchRole ?? "")
  )
    redirect(account.isSuperAdmin ? "/admin" : "/");
  const isOwner = account.branchRole === "owner";
  const requestedTab = (await searchParams)?.tab;
  // 사용 메뉴는 원장만(원장님 2026-10-19) — 관리자에게는 탭도 없고 주소로 와도 계정 관리로.
  const tab =
    requestedTab === "classes" || requestedTab === "students"
      ? requestedTab
      : requestedTab === "menus" && isOwner
        ? "menus"
        : "accounts";

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerBrand}>
          <Link href="/" className={s.brand}>
            <TodayMathMark size={28} inverse />
            <span>오늘 수학</span>
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
              반과 학생, 지점 계정을 한곳에서 관리하세요.
            </p>
          </div>
        </div>
        <nav className={s.branchTabs} aria-label="지점관리 세부 메뉴">
          <Link
            href="/branch?tab=classes"
            aria-current={tab === "classes" ? "page" : undefined}
          >
            반 관리
            <RouteLinkStatus />
          </Link>
          <Link
            href="/branch?tab=students"
            aria-current={tab === "students" ? "page" : undefined}
          >
            학생 반 배정
            <RouteLinkStatus />
          </Link>
          <Link
            href="/branch?tab=accounts"
            aria-current={tab === "accounts" ? "page" : undefined}
          >
            계정 관리
            <RouteLinkStatus />
          </Link>
          {isOwner && (
            <Link
              href="/branch?tab=menus"
              aria-current={tab === "menus" ? "page" : undefined}
            >
              사용 메뉴
              <RouteLinkStatus />
            </Link>
          )}
        </nav>
        {tab === "classes" && <TeachingView embedded />}
        {tab === "menus" && <BranchMenus />}
        {account.branchId && tab !== "menus" && (
          <BranchAccounts
            canCreateManagers={account.branchRole === "owner"}
            section={tab}
          />
        )}
      </main>
    </div>
  );
}
