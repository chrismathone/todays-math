import { db } from "@/lib/db";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { EywaAccessError } from "@/lib/eywa/managedPolicy";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function get(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const { binding } = await verifyReceiverRequest(request);
    if (new URL(request.url).searchParams.get("bindingId") !== binding.id)
      throw new EywaAccessError("binding_mismatch");
    const { eventId } = await context.params;
    const row = await db.eywaInbox.findFirst({
      where: { eventId, bindingId: binding.id },
      select: { eventId: true, status: true, errorCode: true },
    });
    if (!row)
      return Response.json({ error: { code: "not_found" } }, { status: 404 });
    return Response.json(
      { ...row, status: row.status === "processing" ? "received" : row.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}
export const GET = withErrorLog(
  "/api/integrations/eywa/v2/events/[eventId]",
  get,
);
