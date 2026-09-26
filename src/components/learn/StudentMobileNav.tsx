"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import s from "./StudentMobileNav.module.css";

const tabs = [
  { href: "/learn", label: "강의", icon: "play" },
  { href: "/learn/math-srs", label: "초등 복습", icon: "book" },
  { href: "/learn/math-srs/algebra", label: "중등 복습", icon: "grid" },
  { href: "/learn/math-explorers", label: "개념 탐험", icon: "compass" },
] as const;

function TabIcon({ name }: { name: (typeof tabs)[number]["icon"] }) {
  if (name === "compass")
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
      </svg>
    );
  if (name === "play")
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
        <path d="m10 9 5 3-5 3V9Z" />
      </svg>
    );
  if (name === "book")
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 6.5c-2.5-1.7-5.1-1.8-8-1v12c2.9-.8 5.5-.7 8 1 2.5-1.7 5.1-1.8 8-1v-12c-2.9-.8-5.5-.7-8 1Z" />
        <path d="M12 6.5v12" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 4v16M4 10h16M4 15h16" />
    </svg>
  );
}

export function StudentMobileNav({ previewPath }: { previewPath?: string }) {
  const actualPathname = usePathname();
  const pathname = previewPath ?? actualPathname;
  if (pathname === "/learn/login" || pathname === "/learn/password")
    return null;

  return (
    <nav className={s.nav} aria-label="학생 학습 메뉴">
      {tabs.map((tab) => {
        const current =
          tab.href === "/learn"
            ? pathname === "/learn" || pathname.startsWith("/learn/watch/")
            : tab.href === "/learn/math-srs"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={s.tab}
            aria-current={current ? "page" : undefined}
          >
            <TabIcon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
