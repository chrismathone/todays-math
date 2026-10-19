import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TodayMathMark from "@/components/brand/TodayMathMark";
import NavigationPending from "@/components/ui/NavigationPending";
import AdminSignOut from "@/components/admin/AdminSignOut";
import ChangePassword from "@/components/account/ChangePassword";
import ProfileSettings from "@/components/account/ProfileSettings";
import { getAccountAccess } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import s from "@/components/account/profile.module.css";

export const metadata: Metadata = { title: "내정보 | 오늘 수학" };

function roleName(account: {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  branchRole: string | null;
  role: string;
}) {
  if (account.isSuperAdmin) return "최고관리자";
  if (account.branchRole === "owner") return "지점장";
  if (account.branchRole === "manager") return "지점 관리자";
  if (account.branchRole === "teacher") return "선생님";
  if (account.isAdmin) return "관리자";
  return account.role === "reviewer" ? "검수자" : "선생님";
}

export default async function AccountPage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login?callbackUrl=%2Faccount");
  if (account.approvalStatus !== "approved") redirect("/approval-pending");

  const profile = await db.user.findUnique({
    where: { id: account.id },
    select: {
      name: true,
      email: true,
      role: true,
      isAdmin: true,
      isSuperAdmin: true,
      branchRole: true,
      branch: { select: { name: true } },
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!profile) redirect("/login?callbackUrl=%2Faccount");

  const joined = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(profile.createdAt);

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.sidebarBrand}>
          <Link href="/" className={s.brand}>
            <TodayMathMark size={28} inverse />
            <span>오늘 수학</span>
          </Link>
          <span className={s.sidebarLabel}>내 계정</span>
        </div>
        <p className={s.navCaption}>계정 메뉴</p>
        <nav className={s.sidebarNav} aria-label="계정 메뉴">
          <Link href="/account" aria-current="page">
            <span aria-hidden="true">◩</span> 내정보
          </Link>
          {profile.isSuperAdmin && (
            <Link href="/admin" prefetch>
              <NavigationPending icon="◫" /> 관리 콘솔
            </Link>
          )}
          {profile.isAdmin && !profile.isSuperAdmin && (
            <Link href="/branch">
              <NavigationPending icon="⌂" /> 지점 관리
            </Link>
          )}
          <Link href="/">
            <NavigationPending icon="↗" /> 작업실로 이동
          </Link>
        </nav>
        <div className={s.sidebarFooter}>
          <div className={s.sidebarIdentity}>
            <span className={s.sidebarAvatar} aria-hidden="true">
              {(profile.name || "나").slice(0, 1)}
            </span>
            <span className={s.sidebarIdentityText}>
              <strong>{profile.name || "내 계정"}</strong>
              <span>{profile.email}</span>
            </span>
          </div>
          <AdminSignOut className={s.signOut} />
        </div>
      </aside>
      <main className={s.main}>
        <div className={s.breadcrumb} aria-label="현재 위치">
          <Link href="/">작업실</Link>
          <span aria-hidden="true">/</span>
          <span>내정보</span>
        </div>
        <div className={s.intro}>
          <div>
            <p className={s.eyebrow}>MY ACCOUNT</p>
            <h1>내정보</h1>
            <p>작업실에서 사용하는 정보와 로그인 보안을 관리합니다.</p>
          </div>
          <span className={s.roleBadge}>{roleName(profile)}</span>
        </div>
        <section className={s.overview} aria-label="계정 요약">
          <span className={s.overviewAvatar} aria-hidden="true">
            {(profile.name || "나").slice(0, 1)}
          </span>
          <div className={s.overviewIdentity}>
            <p className={s.overviewCaption}>내 계정</p>
            <h2>{profile.name || "이름 미설정"}</h2>
            <p>{profile.email}</p>
          </div>
          <div className={s.overviewMeta}>
            <span>소속 지점</span>
            <strong>{profile.branch?.name ?? "지정되지 않음"}</strong>
          </div>
        </section>
        <div className={s.layout}>
          <section className={s.card} aria-labelledby="profile-title">
            <div className={s.cardHeading}>
              <div>
                <p className={s.sectionIndex}>01 / PROFILE</p>
                <h2 id="profile-title">기본 정보</h2>
                <p>이름은 작업실과 관리자 계정 목록에 표시됩니다.</p>
              </div>
            </div>
            <ProfileSettings initialName={profile.name} />
            <dl className={s.details}>
              <div>
                <dt>로그인 이메일</dt>
                <dd>{profile.email}</dd>
              </div>
              <div>
                <dt>소속 지점</dt>
                <dd>{profile.branch?.name ?? "지정되지 않음"}</dd>
              </div>
              <div>
                <dt>계정 권한</dt>
                <dd>{roleName(profile)}</dd>
              </div>
              <div>
                <dt>가입일</dt>
                <dd>{joined}</dd>
              </div>
            </dl>
            <p className={s.note}>
              로그인 이메일과 소속·권한은 관리자 화면에서 변경할 수 있습니다.
            </p>
          </section>
          <section
            id="security"
            className={s.card}
            aria-labelledby="security-title"
          >
            <div className={s.cardHeading}>
              <div>
                <p className={s.sectionIndex}>02 / SECURITY</p>
                <h2 id="security-title">로그인 보안</h2>
                <p>현재 비밀번호를 확인한 뒤 새 비밀번호를 설정합니다.</p>
              </div>
            </div>
            <ChangePassword />
          </section>
        </div>
      </main>
    </div>
  );
}
