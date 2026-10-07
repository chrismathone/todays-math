"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { StudentSession } from "@/contracts/studentAccount.contract";
import type { StudentOptionalMenu } from "@/contracts/studentLearningMenus.contract";
import { LearnTopBar } from "./LearnTopBar";
import { StudentMobileNav } from "./StudentMobileNav";
import { StudentChromeContext } from "./StudentChromeContext";
import s from "./StudentAppShell.module.css";

export function StudentAppShell({
  student,
  enabled = [],
  preview = false,
  previewPath = "/learn",
  children,
}: {
  student: Pick<StudentSession, "name">;
  enabled?: readonly StudentOptionalMenu[];
  preview?: boolean;
  previewPath?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (preview) return;
    let lastRefresh = -Infinity;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = performance.now();
      if (now - lastRefresh < 1000) return;
      lastRefresh = now;
      router.refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [preview, router]);
  const chrome = useMemo(
    () => ({ managed: true, preview, enabled }),
    [preview, enabled],
  );
  const headerChrome = useMemo(
    () => ({ managed: false, preview, enabled }),
    [preview, enabled],
  );
  if (!preview && ["/learn/login", "/learn/password"].includes(pathname))
    return children;
  return (
    <div className={s.shell} data-student-shell="true">
      <StudentChromeContext.Provider value={headerChrome}>
        <LearnTopBar student={student} />
      </StudentChromeContext.Provider>
      <StudentChromeContext.Provider value={chrome}>
        <div className={s.navigation}>
          <StudentMobileNav
            previewPath={preview ? previewPath : undefined}
            desktop
          />
        </div>
        <div className={s.content}>{children}</div>
        <StudentMobileNav previewPath={preview ? previewPath : undefined} />
      </StudentChromeContext.Provider>
    </div>
  );
}
