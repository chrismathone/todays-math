import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ChangePassword from "@/components/account/ChangePassword";
import { getAccountAccess } from "@/lib/accountAccess";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "비밀번호 변경 | 오늘의수학" };

export default async function AccountPasswordPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Faccount%2Fpassword");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          오늘의수학
        </Link>
        <Link href="/" className={s.workroomLink}>
          작업실로 이동 ↗
        </Link>
      </header>
      <main className={s.main}>
        <div className={s.titleRow}>
          <div>
            <h1>비밀번호 변경</h1>
            <p className={s.subtitle}>
              임시 비밀번호를 받은 경우 여기서 새 비밀번호로 변경하세요.
            </p>
          </div>
        </div>
        <ChangePassword />
      </main>
    </div>
  );
}
