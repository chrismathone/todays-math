import { z } from "zod";
import { db } from "@/lib/db";
import { getAccountAccess, sameOriginMutation } from "@/lib/accountAccess";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
const schema = z.object({
  ownerId: z.uuid(),
  events: z
    .array(
      z.strictObject({
        id: z.uuid(),
        action: z.enum(["click", "change", "submit", "navigate", "print"]),
        label: z.string().max(100),
        path: z.string().max(300).startsWith("/"),
      }),
    )
    .min(1)
    .max(50),
});
async function handlePost(request: Request) {
  const account = await getAccountAccess();
  if (!account)
    return Response.json(
      { error: { message: "로그인이 필요합니다." } },
      { status: 401 },
    );
  if (!sameOriginMutation(request))
    return Response.json(
      { error: { message: "같은 사이트에서 요청해 주세요." } },
      { status: 403 },
    );
  const body = await request.text();
  if (body.length > 32000) return new Response(null, { status: 413 });
  const parsed = schema.safeParse(
    (() => {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) return new Response(null, { status: 400 });
  if (parsed.data.ownerId !== account.id)
    return new Response(null, { status: 403 });
  // 가입은 열려 있다 — 승인받지 않은 계정의 화면 기록은 받아만 주고 적지 않는다(요청마다 50줄을 끝없이 쌓을 수 있었다).
  // 화면의 기록기가 재시도하지 않게 응답은 같은 204 다.
  if (account.approvalStatus !== "approved")
    return new Response(null, { status: 204 });
  await db.accountAuditLog.createMany({
    data: parsed.data.events.map((event) => ({
      userId: account.id,
      actorId: account.id,
      eventId: `${account.id}:${event.id}`,
      action: `ui.${event.action}`,
      outcome: "requested",
      details: {
        label: event.label,
        path: event.path.split("?")[0].slice(0, 300),
      },
    })),
    skipDuplicates: true,
  });
  return new Response(null, { status: 204 });
}

export const POST = withErrorLog("/api/account/activity", handlePost);
