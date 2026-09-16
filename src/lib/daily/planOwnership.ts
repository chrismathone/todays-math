/**
 * 진도 계획 라우트의 **소유 판정** — ⚠️ **임시다.** (D-130 ⑷)
 *
 * D-130 은 「라우트마다 `userId: session.id` 를 적지 말고 **소유 범위 헬퍼 하나**를 쓴다」고 정했고,
 * 그 헬퍼는 다른 워크트리(`admin-sees-all`)가 같은 시기에 만든다. 이 파일을 쓸 때(2026-09-16) 그 헬퍼는
 * 아직 없었다 — 그래서 **진도 계획 라우트 둘만** 이 판정을 부른다. `src/lib/ownership.ts` 를 고치지 않은
 * 까닭은 그 파일을 `admin-sees-all` 이 고치기 때문이다(병합 충돌).
 *
 * 🔴 **헬퍼가 오면 그리로 옮기고 이 파일을 지운다.** 부르는 곳:
 *    `src/app/api/classes/[id]/progress-plan/route.ts` · `src/app/api/students/[id]/progress-plan/route.ts`
 *
 * 판정(지금 관례 + D-130 ⑵):
 *   · 반·학생이 없으면 404 — 관리자여도 같다.
 *   · 반 소유자(`Class.userId`)가 로그인 계정이면 통과.
 *   · 아니면 **관리자(`isAdmin`)만** 통과, 나머지는 403(넓히기 전과 같다 — 2026-09-07 사고의 반증 축).
 *
 * 관리자 여부는 **남의 반일 때만** 묻는다 — 자기 반을 고치는 평소 길에 세션 조회를 더하지 않는다.
 * `isAdmin` 은 세션 콜백이 요청마다 DB 에서 다시 읽는 값이다(`src/lib/auth.ts` jwt 콜백).
 */
import type { Class as ClassRow, Student as StudentRow } from "@prisma/client";

import { getAccountAccess } from "@/lib/accountAccess";
import { forbiddenError, notFoundError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import type { OwnershipResult } from "@/lib/ownership";
import type { SessionUser } from "@/lib/session";

/** 남의 반을 넘어도 되나 — 관리자이고, 그 관리자 세션이 **이 요청의 계정**일 때만. */
async function crossesOwnership(session: SessionUser): Promise<boolean> {
  const account = await getAccountAccess();
  return account?.isAdmin === true && account.id === session.id;
}

export async function requirePlanClass(
  classId: string,
  session: SessionUser,
): Promise<OwnershipResult<ClassRow>> {
  const cls = await db.class.findUnique({ where: { id: classId } });
  if (!cls) return { ok: false, response: notFoundError("반") };
  if (cls.userId === session.id || (await crossesOwnership(session)))
    return { ok: true, data: cls };
  return { ok: false, response: forbiddenError() };
}

export async function requirePlanStudent(
  studentId: string,
  session: SessionUser,
): Promise<OwnershipResult<StudentRow>> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) return { ok: false, response: notFoundError("학생") };
  const { class: ownerClass, ...row } = student;
  if (ownerClass.userId === session.id || (await crossesOwnership(session)))
    return { ok: true, data: row };
  return { ok: false, response: forbiddenError() };
}
