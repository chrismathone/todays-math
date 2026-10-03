/**
 * 학생 **토큰과 세션의 모양** — 한 곳에서 짓는다 (D-124 ⑶ · 브리프 §2.1).
 *
 * 부르는 곳: src/lib/auth.ts 의 `jwt` · `session` 콜백 **맨 앞** — 학생이면 여기서 끝나고, 원장 토큰은
 *            원래 줄을 한 줄도 안 바꾸고 탄다.
 *
 * ## 🔴 학생 세션은 기존 코드에게 «로그인 안 한 사람»으로 보여야 한다
 *
 * 기존 코드는 세션에 `user.id` 가 있으면 원장으로 믿는다 — API 는 대개 `session?.user?.id` 만 보고
 * 들어가고, 관문(`proxy.ts`)은 `role` 이 없는 세션을 원장으로 본다. 그래서:
 *
 * 1. 학생 토큰에는 `id` 가 없다. Auth.js 가 로그인 때 채워 주는 `sub`·`name`·`email`·`picture` 도
 *    **물려받지 않고** 새 객체를 짓는다(`studentTokenFor`). 학생 정보는 `student` 칸에만.
 *    연동 학생은 비공개 `managedStudentStamp`를 비교하며 이 값은 공개 세션에 싣지 않는다.
 * 2. 요청마다 학생 계정을 **다시 읽는다** — 꺼진 계정(`disabledAt`)·퇴원한 학생(`eywaWithdrawnAt` —
 *    D-126 ⑺)·지워진 학생이면 `null` 을 돌려 Auth.js 가 세션 쿠키를 지운다(④). 꺼짐 ∪ 퇴원 판정은
 *    로그인·비밀번호 바꾸기와 같은 함수 하나(`accountBlock.ts`)다.
 * 3. 세션은 `user: undefined` 를 **적어서** 돌려준다(`studentSessionFrom`). 칸을 빼 두면 next-auth 의
 *    서버 쪽 `getSession` 이 `{ user: args[0].user ?? args[0].token, ...session }` 으로 **토큰 통째를
 *    `session.user` 로 씌운다**(`node_modules/next-auth/lib/index.js` 30행) — 그러면
 *    `if (!session?.user)` 만 보는 자리(`src/lib/devPageAccess.ts` 37행)를 학생이 지난다.
 *    `undefined` 로 적은 칸은 spread 에서 이기고, JSON 으로 나갈 때 사라진다.
 */
// `CredentialsSignin` 은 next-auth 가 `@auth/core/errors` 에서 **그대로 다시 내보내는** 같은 클래스다.
// 여기서는 원본에서 가져온다 — `next-auth` 를 통째로 모킹한 기존 시험(accountSession.test.ts)이
// 이 파일 때문에 적재 단계에서 죽지 않게.
import { CredentialsSignin } from "@auth/core/errors";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { studentAccountBlocked } from "./accountBlock";
import type { ManagedStudentAccess } from "@/lib/eywa/managedStudentAccess";

/** 학생 Credentials 공급자 id — `signIn("student", …)` · `/api/auth/callback/student` */
export const STUDENT_PROVIDER_ID = "student";

/**
 * 학생 로그인 실패 — `code` 는 `invalid`(한 가지 문구) 또는 `locked`(잠금) 뿐이다.
 * Auth.js 가 서버 쪽 `signIn` 에서 이 오류를 그대로 던지므로 `/api/learn/login` 이 `code` 로 문구를 고른다.
 */
export class StudentLoginError extends CredentialsSignin {
  constructor(code: "invalid" | "locked") {
    super();
    this.code = code;
  }
}

export function isStudentToken(token: JWT): boolean {
  return typeof token.student === "object" && token.student !== null;
}

/** 토큰을 짓는 데 읽는 계정 한 줄 (`student_account` + 학생 이름 · 퇴원 시각) */
export interface StudentAccountForToken {
  id: string;
  studentId: string;
  disabledAt: Date | null;
  mustChangePassword: boolean;
  student: { name: string; eywaWithdrawnAt: Date | null } | null;
  managedAccess?: ManagedStudentAccess;
}

/**
 * 학생 토큰 — 계정을 다시 읽어 **새로** 짓는다. 막혔거나(꺼짐 ∪ 퇴원) 없으면 `null`(세션을 끊는다).
 * 넘겨받은 토큰의 칸은 하나도 옮기지 않는다(머리말 1).
 */
export async function studentTokenFor(
  accountId: unknown,
  load: (id: string) => Promise<StudentAccountForToken | null>,
  expectedManagedStamp?: unknown,
): Promise<JWT | null> {
  if (typeof accountId !== "string" || accountId === "") return null;
  const row = await load(accountId);
  if (!row || !row.student) return null;
  const blocked = studentAccountBlocked({
    disabledAt: row.disabledAt,
    withdrawnAt: row.student.eywaWithdrawnAt,
    managedAccessAllowed: row.managedAccess?.allowed,
  });
  if (blocked) return null;
  const stamp = row.managedAccess?.stamp ?? null;
  if (
    stamp !== null
      ? stamp !== expectedManagedStamp
      : expectedManagedStamp != null
  )
    return null;
  return {
    ...(stamp !== null ? { managedStudentStamp: stamp } : {}),
    student: {
      accountId: row.id,
      studentId: row.studentId,
      name: row.student.name,
      mustChangePassword: row.mustChangePassword,
    },
  };
}

/** 학생 세션 — 🔴 `user: undefined` 를 **적는다**(머리말 3) */
export function studentSessionFrom(session: Session, token: JWT): Session {
  return { user: undefined, expires: session.expires, student: token.student };
}
