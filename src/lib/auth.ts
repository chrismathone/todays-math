/**
 * Auth.js(NextAuth v5) 설정 — 이메일/비밀번호(Credentials) 단일 로그인 수단.
 *
 * 참조: docs/planning/02-trd.md §3.3(비밀번호 bcrypt)
 *       docs/planning/07-coding-convention.md §5.2(모든 API 세션 확인 + user_id 소유권 검증)
 *
 * ⚠️ 구글(OAuth) 로그인은 원장님 지시로 완전히 제거됐다(2026-08-14). 다시 넣지 말 것 —
 * 로그인 수단은 이메일/비밀번호 하나뿐이다. OAuth 계정 연동이 사라졌으므로
 * `@auth/prisma-adapter`도 함께 제거했다(어댑터의 유일한 용도가 Account/User 연동이었다.
 * Credentials + JWT 세션은 어댑터 없이 동작한다).
 *
 * 세션 전략: JWT — Credentials Provider는 Auth.js 제약상 database 세션 전략을 쓸 수 없다
 * (Credentials는 어댑터가 세션을 직접 발급하지 않음).
 *
 * 이메일 가입(POST /api/auth/signup)은 이 파일과 별개로 `src/app/api/auth/signup/route.ts`가
 * 직접 처리한다(Auth.js Credentials는 "로그인"만 담당, "가입"은 표준 흐름 밖의 커스텀 API).
 *
 * ## 학생 — 절대 규칙 7 의 유일한 예외 (D-124 ⑶, 2026-09-15)
 *
 * 학생(«오늘의 개념» 시청 전용 — D-123 ⑵)은 원장님이 발급한 **아이디 + 숫자 4자리**로 들어온다
 * (공급자 `student`). 소셜/OAuth 는 학생에게도 없다.
 * 🔴 학생 세션은 기존 코드에게 **«로그인 안 한 사람»**으로 보여야 한다 — 기존 API 는
 *    `session.user.id` 만 보고 들어가므로, 학생 토큰·세션에는 `user`·`id` 를 두지 않고
 *    `student` 칸에만 싣는다(`src/lib/learn/studentSession.ts`). `jwt`·`session` 콜백 **맨 앞**에서
 *    학생 갈래를 끝내고, 원장 갈래는 원래 줄을 한 줄도 안 바꿨다
 *    (`src/__tests__/api/authDirectorUnchanged.test.ts` 가 토큰·세션 모양째 잠근다).
 *
 * ## eywa 자동 로그인(SSO) — 절대 규칙 7 의 두 번째 예외 (원장님 2026-09-26)
 *
 * eywa 에 로그인한 사람이 «연결 앱 → 오늘의 수학»을 누르면 eywa 가 서명한 60초짜리 표를 들고
 * `GET /api/sso/eywa` 로 온다(공급자 `eywa-sso`, 판정은 `src/lib/eywaSso.ts`). 계정은 만들지 않는다.
 * 🔴 **2판(D-139 ⑹)** — eywa 이메일은 본인 확인 값이 아니라(직원이 확인 없이 자기 이메일을 바꿀 수 있다)
 * **이메일로 계정을 찾지 않는다.** 바뀌지 않는 eywa 사용자 id(`sub`)가 이미 연결된 계정만 들인다. 연결은
 * 계정 주인이 비밀번호로 로그인한 뒤 확인 화면에서 [연결]을 눌러야만 생긴다 — 아래 어느 authorize 도 연결을
 * 쓰지 않는다. 돌려주는 모양이 이메일 로그인과 같아서 토큰·세션은 아래 원장 줄이 그대로 짓는다.
 * 구글/OAuth 금지는 그대로다.
 */
import { compare } from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import {
  managedLoginAllowed,
  isManagedIdentity,
} from "@/lib/eywa/managedAccounts";
import { authorizeManagedSso, EYWA_V2_PROVIDER } from "@/lib/eywa/managedSso";
// ⚠️ 값 없는(type-only) import지만 제거하면 안 된다 — 아래 `declare module "next-auth/jwt"`
//    보강이 tsc(moduleResolution: bundler)에서 "module cannot be found"(TS2664)로 실패한다.
//    TS가 서브패스 exports 대상 모듈을 증강하려면 해당 모듈을 먼저 실제로 import해 알고
//    있어야 하는 알려진 제약이다.
import type {} from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";

import { authLoginRequestSchema } from "@/contracts/auth.contract";
import type { UserRole } from "@/contracts/problemReport.contract";
import { db } from "@/lib/db";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import {
  type ApprovalStatus,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import {
  studentLoginRequestSchema,
  type StudentSession,
} from "@/contracts/studentAccount.contract";
import { recordAudit } from "@/lib/audit";
import {
  authorizeEywaSso,
  EYWA_SSO_PROVIDER_ID,
  eywaSsoOptionsFromEnv,
} from "@/lib/eywaSso";
import { studentLoginDeps } from "@/lib/learn/loginDeps";
import { managedStudentAccess } from "@/lib/eywa/managedStudentAccess";
import { attemptStudentLogin } from "@/lib/learn/studentLogin";
import {
  isStudentToken,
  STUDENT_PROVIDER_ID,
  StudentLoginError,
  studentSessionFrom,
  studentTokenFor,
} from "@/lib/learn/studentSession";

/**
 * 학생 토큰을 지을 때 읽는 한 줄 — 요청마다 다시 읽는다(꺼짐·퇴원·지워짐이 다음 요청에 반영된다).
 * 퇴원(`eywaWithdrawnAt`)은 학생 행에 있다 — 막힘 판정은 `studentTokenFor` 가 한다(D-126 ⑺).
 */
async function loadStudentAccountForToken(id: string) {
  const row = await db.studentAccount.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      disabledAt: true,
      mustChangePassword: true,
      student: {
        select: { name: true, eywaWithdrawnAt: true, eywaBindingId: true },
      },
    },
  });
  if (!row?.student?.eywaBindingId) return row;
  return {
    ...row,
    managedAccess: await managedStudentAccess(
      row.studentId,
      row.student.eywaBindingId,
    ),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const parsed = authLoginRequestSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        let user = await db.user.findUnique({ where: { email } });
        // passwordHash가 없는 레코드(과거 구글 가입자 잔존분)는 로그인시키지 않는다.
        if (
          !user?.passwordHash ||
          user.deletedAt ||
          user.authSource === "eywa"
        ) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);
        if (!isValidPassword) {
          await recordAudit({
            userId: user.id,
            action: "auth.login",
            outcome: "failed",
          });
          return null;
        }

        if (!(await managedLoginAllowed(user.id, true))) return null;
        user = await db.user.findUnique({ where: { id: user.id } });
        if (
          !user ||
          user.suspendedAt ||
          user.manualSuspendedAt ||
          user.deletedAt
        )
          return null;

        await recordAudit({
          userId: user.id,
          actorId: user.id,
          action: "auth.login",
          outcome: "success",
        });

        // The JWT callback below refreshes access from the current database row.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    /**
     * 학생 — 원장님이 발급한 아이디 + 비밀번호 (D-124 ⑶ · D-125 ⑶). 잠금·문구 규칙은 전부
     * `src/lib/learn/studentLogin.ts`, 실패는 `StudentLoginError`(code `invalid`|`locked`)로 던진다.
     * 계정 id와 연동 학생의 비공개 폐기 세대만 돌려준다 — 학생 토큰은 `jwt` 콜백이 새로 짓는다.
     */
    Credentials({
      id: STUDENT_PROVIDER_ID,
      name: "student",
      credentials: {
        loginId: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const parsed = studentLoginRequestSchema.safeParse({
          loginId: credentials?.loginId,
          password: credentials?.password,
        });
        // 형식이 틀린 입력도 «틀림» 한 가지다 — 형식 문구는 /api/learn/login 이 먼저 낸다
        if (!parsed.success) throw new StudentLoginError("invalid");
        const outcome = await attemptStudentLogin(
          { loginId: parsed.data.loginId, pin: parsed.data.password },
          studentLoginDeps(),
        );
        if (!outcome.ok) throw new StudentLoginError(outcome.reason);
        return {
          id: outcome.account.id,
          managedStudentStamp: outcome.account.managedStudentStamp,
        };
      },
    }),
    Credentials({
      id: EYWA_V2_PROVIDER,
      name: "eywa-managed",
      credentials: { ticket: { type: "text" } },
      authorize: (credentials) => authorizeManagedSso(credentials?.ticket),
    }),
    /** Legacy SSO remains available only outside managed identities. */
    Credentials({
      id: EYWA_SSO_PROVIDER_ID,
      name: "eywa",
      credentials: {
        token: { label: "eywa", type: "text" },
      },
      authorize: (credentials) =>
        authorizeEywaSso(credentials?.token, {
          ...eywaSsoOptionsFromEnv(),
          // 🔴 eywa 사용자 id 로만 찾는다 — 이메일로 찾지 않는다(eywa 이메일은 본인 확인 값이 아니다)
          findLinkedUser: async (eywaUserId) => {
            const linked = await db.user.findUnique({
              where: { eywaUserId },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                passwordHash: true,
                deletedAt: true,
                suspendedAt: true,
                sessionVersion: true,
              },
            });
            if (linked && (await isManagedIdentity(linked.id, eywaUserId)))
              return null;
            return linked;
          },
          audit: (entry) => recordAudit(entry),
        }),
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // 🔴 학생 갈래 — 여기서 끝낸다(user.id 없는 새 토큰 · 꺼짐/지워짐이면 null). 아래 원장 줄은
      //    한 줄도 안 바꿨다(authDirectorUnchanged.test.ts).
      if (account?.provider === STUDENT_PROVIDER_ID)
        return studentTokenFor(
          user?.id,
          loadStudentAccountForToken,
          user?.managedStudentStamp,
        );
      if (isStudentToken(token))
        return studentTokenFor(
          token.student?.accountId,
          loadStudentAccountForToken,
          token.managedStudentStamp,
        );
      if (user) {
        token.id = user.id;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      const id = typeof token.id === "string" ? token.id : token.sub;
      if (!id) return null;
      if (!(await managedLoginAllowed(id))) return null;
      // Authorization changes must apply to existing sessions, not only a future login.
      // Claims submitted by useSession().update are never trusted here.
      const current = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAdmin: true,
          isSuperAdmin: true,
          branchId: true,
          branchRole: true,
          approvalStatus: true,
          disabledMenus: true,
          branch: {
            select: {
              disabledMenus: true,
              ownerDisabledMenus: true,
              menuRevision: true,
            },
          },
          deletedAt: true,
          suspendedAt: true,
          sessionVersion: true,
        },
      });
      if (!current || current.deletedAt || current.suspendedAt) return null;
      if ((token.sessionVersion ?? 0) !== (current.sessionVersion ?? 0))
        return null;
      token.id = current.id;
      token.name = current.name;
      token.email = current.email;
      token.role = current.role;
      token.isAdmin =
        current.isSuperAdmin ||
        (current.isAdmin &&
          Boolean(current.branchId) &&
          (current.branchRole === "owner" || current.branchRole === "manager"));
      token.isSuperAdmin = current.isSuperAdmin;
      token.branchId = current.branchId;
      token.branchRole = current.branchRole;
      token.approvalStatus = current.approvalStatus;
      token.menus = effectiveWorkspaceMenuPolicy(current).menus;
      return token;
    },
    async session({ session, token }) {
      // 🔴 학생 세션은 `user: undefined` 를 적어 돌려준다(studentSession.ts 머리말 3)
      if (isStudentToken(token)) return studentSessionFrom(session, token);
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
        session.user.role = token.role === "reviewer" ? "reviewer" : "director";
        session.user.isAdmin = token.isAdmin === true;
        session.user.isSuperAdmin = token.isSuperAdmin === true;
        session.user.branchId = token.branchId ?? null;
        session.user.branchRole = token.branchRole ?? null;
        session.user.approvalStatus = token.approvalStatus ?? "pending";
        session.user.menus = token.menus ?? [];
      }
      return session;
    },
  },
});

// Auth.js 표준 타입에 user_id를 실어 나르기 위한 모듈 보강.
// (세션/토큰에 담긴 id는 소유권 검증의 근거가 되므로 string으로 명시한다.)
declare module "next-auth" {
  interface Session {
    /**
     * 원장·검수 계정. 🔴 **학생 세션에는 없다**(D-124 ⑶ · studentSession.ts) — 늘 `?.` 로 읽는다.
     * 칸이 있으면 원장이라고 믿는 자리가 많아서, 타입도 «없을 수 있다»고 말하게 두었다.
     */
    user?: {
      id: string;
      role: UserRole;
      isAdmin: boolean;
      isSuperAdmin?: boolean;
      branchId?: string | null;
      branchRole?: "owner" | "manager" | "teacher" | null;
      approvalStatus: ApprovalStatus;
      menus: WorkspaceMenu[];
    } & DefaultSession["user"];
    /** 학생(«오늘의 개념» 시청 전용 — D-123 ⑵). 원장 세션에는 없다. */
    student?: StudentSession;
  }
  interface User {
    role?: UserRole;
    sessionVersion?: number;
    managedStudentStamp?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /** Authorization is refreshed from the database for every session read. */
    role?: UserRole;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    branchId?: string | null;
    branchRole?: "owner" | "manager" | "teacher" | null;
    sessionVersion?: number;
    approvalStatus?: ApprovalStatus;
    menus?: WorkspaceMenu[];
    /** 학생 공개 정보 — id·sub·role은 없으며 비공개 폐기 세대는 별도로 둔다. */
    student?: StudentSession;
    /** Private managed-student revocation claim, never exposed in Session. */
    managedStudentStamp?: string;
  }
}
