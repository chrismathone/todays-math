import "server-only";

import { authorizeAccount } from "@/lib/accountAccess";

import type { TextbookActor } from "../access";
import { textbookDb } from "./prismaSql";
import type { TextbookSql } from "./sql";

export const TEXTBOOK_MENU = "textbook";

export const textbookHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

const refuse = (status: number, message: string) =>
  Response.json(
    { error: { code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", message } },
    { status, headers: textbookHeaders },
  );

/**
 * 교사 교재 API 의 문 — 로그인 · 승인 · 같은 출처(쓰기) · `textbook` 메뉴, 그리고 **지금의** 계정 상태.
 *
 * 세션에 실린 지점은 로그인 때의 값이다. 지점 공유의 판정은 지금의 지점으로 해야 하므로 계정 행을 다시 읽는다
 * (`authorizePrivate` 와 같은 까닭). 관리자는 메뉴 관문만 지난다 — 남의 책을 여는 권한은 여기서도 생기지 않는다
 * (`access.ts` 가 `isAdmin` 을 읽지 않는다).
 */
export async function authorizeTextbook(
  request: Request,
  sql: TextbookSql = textbookDb,
): Promise<
  { actor: TextbookActor; response: null } | { actor: null; response: Response }
> {
  const access = await authorizeAccount(request);
  if (access.response) return { actor: null, response: access.response };
  const account = access.account;
  const menus = account.menus as readonly string[];
  if (!account.isAdmin && !menus.includes(TEXTBOOK_MENU))
    return {
      actor: null,
      response: refuse(403, "교재 제작 메뉴를 사용할 권한이 없습니다."),
    };
  try {
    await sql.refreshTeacherScope?.(
      account.id,
      !["GET", "HEAD", "OPTIONS"].includes(request.method),
    );
  } catch {
    return {
      actor: null,
      response: refuse(403, "현재 담당 권한을 확인할 수 없습니다."),
    };
  }
  const rows = await sql.query<{ name: string; branchId: string | null }>(
    `SELECT "name", "branch_id" AS "branchId" FROM "user"
      WHERE "id" = $1::uuid AND "deleted_at" IS NULL AND "suspended_at" IS NULL AND "approval_status" = 'approved'`,
    [account.id],
  );
  const current = rows[0];
  if (!current)
    return {
      actor: null,
      response: refuse(403, "계정 권한을 다시 확인해 주세요."),
    };
  return {
    actor: { id: account.id, name: current.name, branchId: current.branchId },
    response: null,
  };
}
