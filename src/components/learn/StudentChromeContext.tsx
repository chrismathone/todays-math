"use client";

import { createContext, useContext } from "react";
import type { StudentOptionalMenu } from "@/contracts/studentLearningMenus.contract";

export type StudentChrome = {
  /** This shell already renders the header and desktop navigation. */
  managed: boolean;
  /** An isolated preview must never sign out the user's real session. */
  preview: boolean;
  enabled: readonly StudentOptionalMenu[];
};

export const StudentChromeContext = createContext<StudentChrome>({
  managed: false,
  preview: false,
  enabled: [],
});

export function useStudentChrome() {
  return useContext(StudentChromeContext);
}
