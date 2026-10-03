import { receiveEvent } from "@/lib/eywa/managedReceiver";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function post(request: Request) {
  try {
    const { raw, binding } = await verifyReceiverRequest(request);
    return Response.json(await receiveEvent(raw, binding.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return receiverFailure(error);
  }
}
export const POST = withErrorLog("/api/integrations/eywa/v2/events", post);
