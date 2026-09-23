import TodayMathMark from "@/components/brand/TodayMathMark";
import s from "./accountLoading.module.css";

export default function AccountLoading({
  pending = false,
  detail = false,
}: {
  pending?: boolean;
  detail?: boolean;
}) {
  if (pending) {
    return (
      <div className={`${s.shell} ${s.pendingShell}`}>
        <header className={s.pendingHeader}>
          <span className={s.pendingBrand}>
            <TodayMathMark size={28} />
            오늘의수학
          </span>
          <span className={s.pendingLabel}>가입 승인 확인</span>
        </header>
        <main className={s.pendingMain} aria-labelledby="loading-title">
          <div className={s.pendingContent}>
            <span className={s.pendingEmblem} aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <circle
                  cx="20"
                  cy="20"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M20 11v10l6 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <p className={s.eyebrow}>YOUR WORKSPACE, ALMOST READY</p>
            <h1 id="loading-title">가입 승인 상태를 확인하고 있습니다.</h1>
            <p className={s.description}>
              계정 상태를 확인해 잠시 후 안내해 드립니다.
            </p>
            <p className={s.progress} role="status">
              <span className={s.progressMark} aria-hidden="true" />
              가입 상태 확인 중
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={s.shell}>
      <aside className={s.sidebar} aria-label="관리 콘솔">
        <div className={s.sidebarBrand}>
          <span className={s.brand}>
            <TodayMathMark size={28} inverse />
            오늘의수학
          </span>
          <span className={s.adminLabel}>관리 콘솔</span>
        </div>
        <div className={s.sidebarSection}>
          <p className={s.navCaption}>운영 메뉴</p>
          <span className={s.currentSection} aria-current="page">
            <span aria-hidden="true">◫</span>
            계정 관리
          </span>
        </div>
      </aside>
      <main className={s.main} aria-labelledby="loading-title">
        {detail ? (
          <>
            <p className={s.breadcrumb}>계정 관리 / 계정 상세</p>
            <p className={s.eyebrow}>ACCOUNT WORKSPACE</p>
            <h1 id="loading-title">계정 자료 · 활동 기록</h1>
            <p className={s.description}>
              계정 내정보, 사용 자료, 변경 이력과 관리 설정을 확인합니다.
            </p>
          </>
        ) : (
          <>
            <p className={s.eyebrow}>ADMIN / ACCOUNTS</p>
            <h1 id="loading-title">
              계정 관리 <span className={s.titleAccent}>/ 운영 현황</span>
            </h1>
            <p className={s.description}>
              가입 요청부터 지점 권한, 사용 메뉴, 계정 상태까지 한곳에서
              관리합니다.
            </p>
          </>
        )}
        <p className={s.progress} role="status">
          <span className={s.progressMark} aria-hidden="true" />
          {detail
            ? "계정 자료와 활동 기록을 불러오는 중입니다."
            : "계정 현황을 불러오는 중입니다."}
        </p>
      </main>
    </div>
  );
}
