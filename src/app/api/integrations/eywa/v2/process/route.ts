import { z } from "zod";
import { processBinding } from "@/lib/eywa/managedReceiver";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { EywaAccessError } from "@/lib/eywa/managedPolicy";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const maxDuration = 180;
async function post(request: Request) {
  try {
    const { raw, binding } = await verifyReceiverRequest(request, true);
    const input = z
      .object({
        bindingId: z.string(),
        limit: z.number().int().min(1).max(20).optional(),
      })
      .parse(JSON.parse(raw));
    if (input.bindingId !== binding.id)
      throw new EywaAccessError("binding_mismatch");
    return Response.json(await processBinding(binding.id, input.limit), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return receiverFailure(error);
  }
}
export const POST = withErrorLog("/api/integrations/eywa/v2/process", post);
