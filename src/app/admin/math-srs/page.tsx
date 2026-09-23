import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import AdminHeader from "@/components/admin/AdminHeader";
import CourseDashboard from "@/components/math-srs/CourseDashboard";
import styles from "./page.module.css";
import adminStyles from "@/components/admin/admin.module.css";

export const metadata: Metadata = {
  title: "SRS 학습 현황 | 오늘의수학 관리자",
};

export default async function AdminSrsPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Fadmin%2Fmath-srs");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (!account.isAdmin) redirect("/");

  return (
    <div className={`${adminStyles.shell} ${styles.page}`}>
      <AdminHeader
        identity={{ name: account.name, email: account.email }}
        active="srs"
      />
      <main className={styles.main}>
        <CourseDashboard admin />
      </main>
    </div>
  );
}
