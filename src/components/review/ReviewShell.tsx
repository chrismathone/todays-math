import Link from "next/link";
import type { ReactNode } from "react";

import TodayMathMark from "@/components/brand/TodayMathMark";

import s from "./ReviewShell.module.css";

export default function ReviewShell({
  children,
  account,
  subtitle,
}: {
  children: ReactNode;
  account: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <div className={s.shell}>
      <a className={s.skipLink} href="#review-content">
        본문으로 건너뛰기
      </a>
      <header className={s.sidebar}>
        <div className={s.brandBlock}>
          <Link
            href="/review"
            className={s.brand}
            aria-label="오늘 수학 검수 콘솔"
          >
            <TodayMathMark size={28} inverse />
            <span>오늘 수학</span>
          </Link>
          <span className={s.sidebarLabel}>검수 콘솔</span>
        </div>
        <p className={s.navCaption}>검수 메뉴</p>
        <nav className={s.navigation} aria-label="검수 메뉴">
          <Link href="/review" aria-current="page" className={s.navLink}>
            <span aria-hidden="true">◫</span>
            문제은행 검수
          </Link>
        </nav>
        <div className={s.accountFooter}>{account}</div>
      </header>
      <main id="review-content" className={s.content} tabIndex={-1}>
        <div className={s.pageHeading}>
          <p className={s.eyebrow}>REVIEW CONSOLE</p>
          <h1>문제은행 검수</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
