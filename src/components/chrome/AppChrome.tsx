import Link from "next/link";
import type { ReactNode } from "react";
import TodayMathMark from "@/components/brand/TodayMathMark";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import { AccountBadge } from "@/components/chrome/AccountBadge";
import { formatMastheadDate } from "@/lib/main/pipeline";
import s from "./AppChrome.module.css";

type Tab = "math" | "exam";
type Nav = "main" | "classes" | "problems" | "studio";

type AppChromeProps = {
  children: ReactNode;
  dateLabel?: string;
  remaining?: number;
  extraNav?: ReactNode;
  tab?: Tab;
  activeNav?: Nav;
  currentLabel?: string;
  classesHref?: string;
};

const NAV = [
  { key: "main", href: "/", label: "오늘의 작업", icon: "⌂" },
  { key: "classes", href: "/classes", label: "수업·학생 관리", icon: "♧" },
  { key: "problems", href: "/problems", label: "시험지 만들기", icon: "▥" },
  { key: "studio", href: "/studio", label: "문제 추출", icon: "▤" },
] as const;

const TITLE: Record<Nav, string> = {
  main: "오늘의 작업",
  classes: "수업·학생 관리",
  problems: "시험지 만들기",
  studio: "문제 추출",
};

export function AppChrome({
  children,
  dateLabel,
  remaining,
  extraNav,
  tab = "math",
  activeNav,
  currentLabel,
  classesHref,
}: AppChromeProps) {
  const current =
    currentLabel ??
    (tab === "exam" ? "오늘의시험" : activeNav ? TITLE[activeNav] : "작업실");
  const date = dateLabel ?? formatMastheadDate();

  return (
    <div className={s.shell}>
      <a className={s.skipLink} href="#main-content">
        본문으로 건너뛰기
      </a>
      <aside className={s.sidebar}>
        <Link className={s.brand} href="/" aria-label="오늘 수학">
          <TodayMathMark size={30} inverse />
          <span>오늘 수학</span>
          <RouteLinkStatus />
        </Link>
        <div className={s.navBlock}>
          <p className={s.navCaption}>작업실 메뉴</p>
          <nav className={s.nav} aria-label="주 메뉴">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={
                  item.key === "classes"
                    ? (classesHref ?? item.href)
                    : item.href
                }
                aria-current={
                  tab === "math" && activeNav === item.key ? "page" : undefined
                }
              >
                <span className={s.icon} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
                <RouteLinkStatus />
              </Link>
            ))}
            <Link
              href="/exam"
              aria-current={tab === "exam" ? "page" : undefined}
            >
              <span className={s.icon} aria-hidden="true">
                ▣
              </span>
              오늘의시험
              <RouteLinkStatus />
            </Link>
          </nav>
        </div>
        <div className={s.account}>
          <AccountBadge variant="sidebar" />
        </div>
      </aside>
      <div className={s.mainArea}>
        <header className={s.topbar}>
          <nav className={s.breadcrumb} aria-label="현재 위치">
            <Link href="/">작업실</Link>
            <span aria-hidden="true">›</span>
            <strong>{current}</strong>
          </nav>
          <div className={s.topbarRight}>
            {extraNav}
            {remaining !== undefined && (
              <span className={s.remaining}>
                {remaining > 0 ? `남은 작업 ${remaining}` : "오늘 완료"}
              </span>
            )}
            <span className={s.date}>{date}</span>
          </div>
        </header>
        <div id="main-content" className={s.content} tabIndex={-1}>
          {children}
        </div>
      </div>
    </div>
  );
}
