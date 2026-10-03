import "server-only";

import { db } from "@/lib/db";
import { activeStudentClassIds } from "@/lib/classAccess";
import { getManagedClassGrants } from "@/lib/eywa/managedAccounts";

import type { TextbookDb } from "./sql";
import { type RawSqlRoot, prismaTextbookDb } from "./sqlAdapter";

/** 제품이 쓰는 문 — 앱의 Prisma 연결 풀을 그대로 쓴다 */
export const textbookDb: TextbookDb = {
  ...prismaTextbookDb(db as unknown as RawSqlRoot),
  async refreshTeacherScope(userId, write) {
    await getManagedClassGrants(userId, { forceRefresh: write });
  },
  async refreshStudentScope(studentId) {
    await activeStudentClassIds(studentId);
  },
};
