"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
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
  children,
}: {
  student: Pick<StudentSession, "name">;
  enabled?: readonly StudentOptionalMenu[];
  preview?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
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
            previewPath={preview ? "/learn" : undefined}
            desktop
          />
        </div>
        <div className={s.content}>{children}</div>
        <StudentMobileNav previewPath={preview ? "/learn" : undefined} />
      </StudentChromeContext.Provider>
    </div>
  );
}
