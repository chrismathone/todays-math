import Link from "next/link";
import TodayMathMark from "@/components/brand/TodayMathMark";
import AdminSignOut from "./AdminSignOut";
import s from "./admin.module.css";

export default function AdminHeader({
  identity,
  active = "accounts",
}: {
  identity: { name: string; email: string };
  active?: "accounts" | "srs" | "branches";
}) {
  return (
    <header className={s.header}>
      <div className={s.headerBrand}>
        <Link href="/admin" className={s.brand}>
          <TodayMathMark size={28} inverse />
          <span>오늘의수학</span>
        </Link>
        <span className={s.adminLabel}>관리 콘솔</span>
      </div>
      <div className={s.headerRight}>
        <p className={s.navCaption}>운영 메뉴</p>
        <nav className={s.headerNav} aria-label="관리자 메뉴">
          <Link
            className={s.workroomLink}
            href="/admin"
            aria-current={active === "accounts" ? "page" : undefined}
          >
            <span aria-hidden="true">◫</span> 계정 관리
          </Link>
          <Link
            className={s.workroomLink}
            href="/admin/branches"
            aria-current={active === "branches" ? "page" : undefined}
          >
            <span aria-hidden="true">⌂</span> 지점 관리
          </Link>
          <Link
            className={s.workroomLink}
            href="/admin/math-srs"
            aria-current={active === "srs" ? "page" : undefined}
          >
            <span aria-hidden="true">◷</span> SRS 현황
          </Link>
          <Link className={s.workroomLink} href="/">
            <span aria-hidden="true">↗</span> 작업실로 이동
          </Link>
        </nav>
        <div className={s.headerFooter}>
          <div className={s.identity} aria-label="로그인한 관리자">
            <span className={s.avatar} aria-hidden="true">
              {(identity.name || "관").slice(0, 1)}
            </span>
            <span className={s.identityText}>
              <strong>{identity.name || "관리자"}</strong>
              <span>{identity.email}</span>
            </span>
          </div>
          <AdminSignOut className={s.signOut} />
        </div>
      </div>
    </header>
  );
}
