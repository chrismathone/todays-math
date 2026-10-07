import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { AppSettingTable } from "@/lib/journeyThemeStore";
import { uuidSchema } from "@/contracts/common.contract";
import {
  storedStudentLearningMenusSchema,
  type StudentOptionalMenu,
} from "@/contracts/studentLearningMenus.contract";

/** One existing setting row per student; this does not change the SRS payload or database schema. */
export function studentLearningMenusKey(studentId: string): string {
  return `student.learning-menus.${uuidSchema.parse(studentId)}`;
}

export async function readStudentLearningMenus(
  studentId: string,
  table: Pick<AppSettingTable, "findUnique"> = (
    db as unknown as { appSetting: AppSettingTable }
  ).appSetting,
): Promise<{ enabled: StudentOptionalMenu[]; updatedAt: string | null }> {
  let row;
  try {
    row = await table.findUnique({
      where: { key: studentLearningMenusKey(studentId) },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2021"
    )
      return { enabled: [], updatedAt: null };
    throw error;
  }
  const parsed = storedStudentLearningMenusSchema.safeParse(row?.value);
  return parsed.success
    ? { enabled: parsed.data.enabled, updatedAt: row!.updatedAt.toISOString() }
    : { enabled: [], updatedAt: null };
}

export const getStudentLearningMenus = cache(readStudentLearningMenus);
