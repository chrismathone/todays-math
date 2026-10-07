"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import s from "./StudentMobileNav.module.css";
import { useStudentChrome } from "./StudentChromeContext";

const tabs = [
  { href: "/learn", label: "탐험", icon: "compass" },
  { href: "/learn?view=collection", label: "도감", icon: "book" },
  { href: "/learn/lectures", label: "강의", icon: "play" },
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

export function StudentMobileNav({
  previewPath,
  desktop = false,
}: {
  previewPath?: string;
  desktop?: boolean;
  /** Kept for older preview callers; concept recall now lives inside exploration. */
  fading?: boolean;
}) {
  const chrome = useStudentChrome();
  const actualPathname = usePathname();
  const searchParams = useSearchParams();
  const pathname = previewPath ?? actualPathname;
  const collection = !previewPath && searchParams.get("view") === "collection";
  const lectures =
    pathname === "/learn/lectures" || pathname.startsWith("/learn/watch/");
  if (
    pathname === "/learn/login" ||
    pathname === "/learn/password" ||
    pathname === "/learn/fading" ||
    pathname.startsWith("/learn/fading/")
  )
    return null;

  return (
    <nav
      className={`${s.nav} ${desktop ? s.desktop : ""}`}
      aria-label="학생 학습 메뉴"
      data-student-global-nav="true"
    >
      {tabs
        .filter(
          (tab) => tab.icon !== "play" || chrome.enabled.includes("lectures"),
        )
        .map((tab) => {
          const current =
            tab.icon === "play"
              ? lectures
              : tab.icon === "book"
                ? collection
                : !lectures && !collection;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              aria-disabled={chrome.preview || undefined}
              tabIndex={chrome.preview ? -1 : undefined}
              onClick={
                chrome.preview ? (event) => event.preventDefault() : undefined
              }
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
