import Link from "next/link";
import TodayMathMark from "@/components/brand/TodayMathMark";
import NavigationPending from "@/components/ui/NavigationPending";
import AdminSignOut from "./AdminSignOut";
import s from "./admin.module.css";

export default function AdminHeader({
  identity,
  active = "branches",
  isSuperAdmin = true,
}: {
  identity: { name: string; email: string };
  active?: "srs" | "branches" | "eywa";
  isSuperAdmin?: boolean;
}) {
  return (
    <header className={s.header}>
      <div className={s.headerBrand}>
        <Link href={isSuperAdmin ? "/admin" : "/branch"} className={s.brand}>
          <TodayMathMark size={28} inverse />
          <span>오늘 수학</span>
        </Link>
        <span className={s.adminLabel}>관리 콘솔</span>
      </div>
      <div className={s.headerRight}>
        <p className={s.navCaption}>운영 메뉴</p>
        <nav className={s.headerNav} aria-label="관리자 메뉴">
          <Link
            className={s.workroomLink}
            href="/admin/eywa-sync"
            aria-current={active === "eywa" ? "page" : undefined}
          >
            에이와 연결
          </Link>
          {isSuperAdmin ? (
            <>
              <Link
                className={s.workroomLink}
                href="/admin/branches"
                aria-current={active === "branches" ? "page" : undefined}
              >
                <NavigationPending icon="⌂" /> 지점 관리
              </Link>
              <Link
                className={s.workroomLink}
                href="/admin/math-srs"
                aria-current={active === "srs" ? "page" : undefined}
              >
                <NavigationPending icon="◷" /> SRS 현황
              </Link>
            </>
          ) : (
            <Link className={s.workroomLink} href="/branch">
              <NavigationPending icon="⌂" /> 내 지점 관리
            </Link>
          )}
          <Link className={s.workroomLink} href="/">
            <NavigationPending icon="↗" /> 작업실로 이동
          </Link>
          <Link className={s.workroomLink} href="/account">
            <NavigationPending icon="◩" /> 내정보
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
