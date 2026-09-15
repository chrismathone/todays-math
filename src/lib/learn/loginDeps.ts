/**
 * 학생 로그인 핵심(`studentLogin.ts`)에 넣는 **진짜** 부품 — Prisma 저장소 · bcrypt · HMAC 열쇠 · 감사 기록.
 * Auth.js 의 학생 공급자와 비밀번호 바꾸기 라우트가 같은 것을 쓴다(두 곳이 따로 짓지 않게).
 *
 * 감사 기록은 `AccountAuditLog` 에 남긴다(기존 `recordAudit`). `userId`·`actorId` 는 비운다 — 두 칸은
 * `user`(원장·검수 계정)를 가리키는 외래 키라 학생 계정을 적을 수 없다. 누구의 일인지는 `details` 의
 * `studentAccountId`·`studentId` 가 말한다. 번호·입력한 아이디는 **적지 않는다**(studentLogin.ts 머리말 1).
 */
import "server-only";

import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";

import { compareStudentPin, studentLoginMissKey } from "./pinHash";
import { prismaLoginStore } from "./prismaLoginStore";
import type { LoginDeps } from "./studentLogin";

export function studentLoginDeps(): LoginDeps {
  return {
    store: prismaLoginStore(db),
    now: () => new Date(),
    comparePin: compareStudentPin,
    missKey: (loginId) => studentLoginMissKey(loginId),
    audit: (entry) => recordAudit(entry),
  };
}
