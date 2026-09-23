import Link from "next/link";
import TodayMathMark from "@/components/brand/TodayMathMark";

import { AccountBadge } from "@/components/chrome/AccountBadge";
import { formatMastheadDate } from "@/lib/main/pipeline";

/**
 * 상단 크롬 — **워드마크 분기** (D-39 확정).
 *
 * 워드마크 자리에 두 제품명을 나란히 둔다: `오늘의수학 │ 오늘의시험`.
 * 선택된 쪽은 검정 굵게 + `aria-current="page"`, 나머지는 회색이다.
 * 날짜·남은 작업·nav 는 **두 탭이 공유**한다(05 §8.7).
 *
 * ⚠️ 두 제품명 모두 링크로 둔다. 선택된 쪽도 링크인 이유:
 *   - 워드마크는 예부터 홈으로 가는 길이라 없애면 오히려 어포던스가 준다.
 *   - "여기 있음"은 색이 아니라 `aria-current` 로 알린다(색만으로 전달 금지, 05 §5).
 *   자기 자신으로 가는 링크는 실제로 이동하므로 D-30 이 막는 "눌러도 아무 일 없음"이 아니다.
 *
 * ⚠️ nav 에 '오늘의 시험' 항목을 넣지 않는다 — D-39 가 "nav 항목 추가"안을 무게감이
 *    약하다는 이유로 반려했다. 분기는 워드마크 자리에서만 일어난다.
 */
type Tab = "math" | "exam";

type AppChromeProps = {
  children: React.ReactNode;
  dateLabel?: string;
  remaining?: number;
  extraNav?: React.ReactNode;
  /** 현재 열려 있는 제품 탭. 기본은 '오늘의 수학'. */
  tab?: Tab;
  activeNav?: "main" | "classes" | "problems" | "studio";
};

const WORDMARK = "text-2xl font-bold tracking-tight";

export function AppChrome({
  children,
  dateLabel,
  remaining,
  extraNav,
  tab = "math",
  activeNav,
}: AppChromeProps) {
  const date = dateLabel ?? formatMastheadDate();

  return (
    <div className="app-chrome min-h-full bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-4 focus:py-3 focus:text-[12.5px] focus:font-bold focus:text-white"
      >
        본문으로 건너뛰기
      </a>
      {/* Shared Workroom controls also apply to legacy class/exam routes.
          Navigation wraps within the viewport; account identity stays visible. */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-divider bg-surface px-5 py-3">
        <span className="flex shrink-0 flex-wrap items-center gap-y-2 whitespace-nowrap">
          <Link
            href="/"
            aria-current={tab === "math" ? "page" : undefined}
            className={`${WORDMARK} inline-flex items-center gap-2 ${tab === "math" ? "text-ink" : "text-text-3"}`}
          >
            <TodayMathMark size={32} />
            오늘의수학
          </Link>
          <span aria-hidden="true" className="mx-3 text-xl text-divider">
            │
          </span>
          <Link
            href="/exam"
            aria-current={tab === "exam" ? "page" : undefined}
            className={`${WORDMARK} ${tab === "exam" ? "text-ink" : "text-text-3"}`}
          >
            오늘의시험
          </Link>
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs text-text-2 tabular-nums">
          {date}
        </span>
        {remaining !== undefined ? (
          <span
            className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
              remaining > 0 ? "text-g-red-text" : "text-ink"
            }`}
          >
            {remaining > 0 ? `남은 작업 ${remaining}` : "오늘 완료"}
          </span>
        ) : null}
        <nav
          aria-label="주 메뉴"
          className="ml-auto flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold"
        >
          {extraNav}
          {(
            [
              ["main", "/", "오늘의 작업"],
              ["classes", "/classes", "수업·학생 관리"],
              ["problems", "/problems", "시험지 만들기"],
              ["studio", "/studio", "자료 제작"],
            ] as const
          ).map(([key, href, label]) => (
            <Link
              key={key}
              href={href}
              aria-current={activeNav === key ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-lg px-3 ${activeNav === key ? "bg-[var(--learn-soft)] text-g-blue" : "text-text-2 hover:bg-side hover:text-ink"}`}
            >
              {label}
            </Link>
          ))}
          <AccountBadge />
        </nav>
      </header>
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
