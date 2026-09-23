import Link from "next/link";
import TodayMathMark from "@/components/brand/TodayMathMark";
import AdminSignOut from "./AdminSignOut";
import s from "./admin.module.css";

export default function AdminHeader({
  identity,
  active = "accounts",
}: {
  identity: { name: string; email: string };
  active?: "accounts" | "srs";
}) {
  return (
    <header className={s.header}>
      <Link href="/" className={s.brand}>
        <TodayMathMark size={28} />
        오늘의수학<span className={s.adminLabel}>관리자</span>
      </Link>
      <div className={s.headerRight}>
        <nav className={s.headerNav} aria-label="관리자 메뉴">
          <Link
            className={s.workroomLink}
            href="/admin"
            aria-current={active === "accounts" ? "page" : undefined}
          >
            계정 관리
          </Link>
          <Link
            className={s.workroomLink}
            href="/admin/math-srs"
            aria-current={active === "srs" ? "page" : undefined}
          >
            SRS 현황
          </Link>
          <Link className={s.workroomLink} href="/">
            작업실로 이동 <span aria-hidden="true">↗</span>
          </Link>
        </nav>
        <div className={s.identity} aria-label="로그인한 관리자">
          <strong>{identity.name || "관리자"}</strong>
          <span>{identity.email}</span>
        </div>
        <AdminSignOut className={s.secondary} />
      </div>
    </header>
  );
}
