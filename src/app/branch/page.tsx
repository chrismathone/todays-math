import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TodayMathMark from "@/components/brand/TodayMathMark";
import BranchAccounts from "@/components/branch/BranchAccounts";
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
        <Link href="/" className={s.brand}>
          <TodayMathMark size={28} />
          오늘의수학 <span className={s.adminLabel}>지점관리</span>
        </Link>
        <nav className={s.headerNav} aria-label="지점관리 메뉴">
          <Link className={s.workroomLink} href="/classes/manage">
            반 관리
          </Link>
          <Link className={s.workroomLink} href="/">
            작업실로 이동 ↗
          </Link>
        </nav>
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
