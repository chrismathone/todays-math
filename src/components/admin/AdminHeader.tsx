import Link from "next/link";
import AdminSignOut from "./AdminSignOut";
import s from "./admin.module.css";

export default function AdminHeader({
  identity,
}: {
  identity: { name: string; email: string };
}) {
  return (
    <header className={s.header}>
      <Link href="/" className={s.brand}>
        오늘의수학<span className={s.adminLabel}>관리자</span>
      </Link>
      <div className={s.headerRight}>
        <Link className={s.workroomLink} href="/">
          작업실로 이동 <span aria-hidden="true">↗</span>
        </Link>
        <div className={s.identity} aria-label="로그인한 관리자">
          <strong>{identity.name || "관리자"}</strong>
          <span>{identity.email}</span>
        </div>
        <AdminSignOut className={s.secondary} />
      </div>
    </header>
  );
}
