import { z } from "zod";
import { db } from "@/lib/db";
import { getAccountAccess, sameOriginMutation } from "@/lib/accountAccess";
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
export async function POST(request: Request) {
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
