import { getEywaStudentStatus } from "@/lib/eywa/managedStudentStatus";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { EywaAccessError } from "@/lib/eywa/managedPolicy";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function get(
  request: Request,
  context: { params: Promise<{ sourceStudentId: string }> },
) {
  try {
    const { binding } = await verifyReceiverRequest(request);
    if (new URL(request.url).searchParams.get("bindingId") !== binding.id)
      throw new EywaAccessError("binding_mismatch");
    return Response.json(
      await getEywaStudentStatus(
        binding.id,
        (await context.params).sourceStudentId,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}
export const GET = withErrorLog(
  "/api/integrations/eywa/v2/students/[sourceStudentId]",
  get,
);
