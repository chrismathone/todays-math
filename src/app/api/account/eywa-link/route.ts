/**
 * eywa 계정 연결 (D-139 ⑹, 원장님 2026-09-26).
 *
 *   POST   { action: "link" | "dismiss" } — 확인 화면의 [연결] · [연결 안 함]
 *   DELETE                                 — 계정 주인이 자기 연결을 푼다(화면 없음 — 원장님 «뒷단만»)
 *
 * 문턱: 로그인한 계정(승인 대기 포함 — SSO 가 승인 대기 계정을 들이는 것과 같다) · 🔴 학생 세션은 `user` 가 없어
 * «로그인 안 함»(401) · 같은 사이트 요청만. 연결할 `sub` 는 **연결 대기 쿠키에서만** 온다(몸에 실으면 400).
 *
 * 🔴 양방향 유일 — 이 계정에 이미 다른 sub 가 있으면 덮어쓰지 않고 거절, 이 sub 가 다른 계정에 있으면 거절.
 *    앞 확인은 거절 까닭을 가르기 위한 것이고, 벽은 조건부 update(`eywaUserId: null`)와 유일 색인(P2002)이다.
 * 감사 `auth.eywa-link`(success/denied/failed) · `auth.eywa-unlink`. details 에 이메일·쿠키 원문을 넣지 않는다
 * (`recordAudit` 는 키 이름으로 비밀을 거르지만 이메일은 거르지 않는다 — 처음부터 안 싣는다).
 * 어느 쪽이든 POST 가 끝나면 연결 대기 쿠키를 지운다.
 */
import { NextResponse, type NextRequest } from "next/server";

import {
  EYWA_LINK_MESSAGES,
  eywaLinkRequestSchema,
} from "@/contracts/eywaLink.contract";
import { getAccountAccess, sameOriginMutation } from "@/lib/accountAccess";
import { auditData, recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  clearedEywaLinkPendingCookie,
  EYWA_LINK_PENDING_COOKIE,
  openEywaLinkPendingNow,
} from "@/lib/eywaLinkPending";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

type Code =
  "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT";
const STATUS: Record<Code, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
};
const noStore = { "Cache-Control": "no-store" };
const failure = (code: Code, message: string) =>
  NextResponse.json(
    { error: { code, message } },
    { status: STATUS[code], headers: noStore },
  );

/** 로그인한 계정 · 같은 사이트 — 둘 중 하나라도 아니면 응답을 돌려준다 */
async function gate(request: NextRequest) {
  const account = await getAccountAccess();
  if (!account)
    return { response: failure("UNAUTHORIZED", "로그인이 필요합니다.") };
  if (!sameOriginMutation(request))
    return {
      response: failure("FORBIDDEN", "같은 사이트에서 요청해 주세요."),
    };
  return { account };
}

/** 끝나면 쿠키를 지운다 — 성공이든 거절이든 */
function finish(request: NextRequest, response: NextResponse) {
  response.cookies.set(
    clearedEywaLinkPendingCookie(request.nextUrl.protocol === "https:"),
  );
  return response;
}

type LinkOutcome = "success" | "denied" | "failed";
const linkAudit = (
  userId: string,
  outcome: LinkOutcome,
  details: Record<string, string | boolean>,
) =>
  ({
    userId,
    actorId: userId,
    action: "auth.eywa-link",
    outcome,
    details,
  }) as const;

async function handlePost(request: NextRequest) {
  const checked = await gate(request);
  if (checked.response) return checked.response;
  const me = checked.account.id;
  const parsed = eywaLinkRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return failure("VALIDATION_ERROR", EYWA_LINK_MESSAGES.invalid);

  const pending = openEywaLinkPendingNow(
    request.cookies.get(EYWA_LINK_PENDING_COOKIE)?.value,
  );

  if (parsed.data.action === "dismiss") {
    // 이미 없거나 만료여도 결과(연결 안 함)는 같다 — 지우기만 하고 성공
    if (pending)
      await recordAudit(
        linkAudit(me, "success", {
          action: "dismiss",
          eywaUserId: pending.sub,
        }),
      );
    return finish(
      request,
      NextResponse.json({ data: { dismissed: true } }, { headers: noStore }),
    );
  }

  if (!pending) {
    await recordAudit(
      linkAudit(me, "failed", { action: "link", reason: "expired" }),
    );
    return finish(request, failure("NOT_FOUND", EYWA_LINK_MESSAGES.expired));
  }
  const sub = pending.sub;
  const deny = async (reason: string, message: string) => {
    await recordAudit(
      linkAudit(me, "denied", { action: "link", eywaUserId: sub, reason }),
    );
    return finish(request, failure("CONFLICT", message));
  };

  const [mine, holder] = await Promise.all([
    db.user.findUnique({ where: { id: me }, select: { eywaUserId: true } }),
    db.user.findUnique({ where: { eywaUserId: sub }, select: { id: true } }),
  ]);
  if (mine?.eywaUserId === sub)
    return finish(
      request,
      NextResponse.json({ data: { linked: true } }, { headers: noStore }),
    );
  if (mine?.eywaUserId)
    return deny("account-linked", EYWA_LINK_MESSAGES.accountLinked);
  if (holder && holder.id !== me)
    return deny("eywa-linked-elsewhere", EYWA_LINK_MESSAGES.eywaLinked);

  let changed: number;
  try {
    changed = await db.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        // 🔴 비어 있을 때만 쓴다 — 앞 확인과 이 줄 사이에 누가 먼저 묶었으면 0행이다(덮어쓰지 않는다)
        where: { id: me, eywaUserId: null, deletedAt: null, suspendedAt: null },
        data: { eywaUserId: sub, eywaLinkedAt: new Date() },
      });
      if (count === 1)
        await tx.accountAuditLog.create({
          data: auditData(
            linkAudit(me, "success", { action: "link", eywaUserId: sub }),
          ),
        });
      return count;
    });
  } catch (error) {
    // 유일 색인 — 같은 sub 를 다른 계정이 그 사이에 먼저 묶었다
    if (isPrismaErrorCode(error, "P2002"))
      return deny("eywa-linked-elsewhere", EYWA_LINK_MESSAGES.eywaLinked);
    throw error;
  }
  if (changed !== 1) return deny("changed", EYWA_LINK_MESSAGES.changed);
  return finish(
    request,
    NextResponse.json({ data: { linked: true } }, { headers: noStore }),
  );
}

async function handleDelete(request: NextRequest) {
  const checked = await gate(request);
  if (checked.response) return checked.response;
  const me = checked.account.id;
  const row = await db.user.findUnique({
    where: { id: me },
    select: { eywaUserId: true },
  });
  const sub = row?.eywaUserId;
  if (!sub) return failure("NOT_FOUND", EYWA_LINK_MESSAGES.notLinked);
  const changed = await db.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: me, eywaUserId: sub },
      data: { eywaUserId: null, eywaLinkedAt: null },
    });
    if (count === 1)
      await tx.accountAuditLog.create({
        data: auditData({
          userId: me,
          actorId: me,
          action: "auth.eywa-unlink",
          outcome: "success",
          details: { eywaUserId: sub, by: "self" },
        }),
      });
    return count;
  });
  if (changed !== 1) return failure("CONFLICT", EYWA_LINK_MESSAGES.changed);
  return NextResponse.json({ data: { unlinked: true } }, { headers: noStore });
}

export const POST = withErrorLog("/api/account/eywa-link", handlePost);
export const DELETE = withErrorLog("/api/account/eywa-link", handleDelete);
