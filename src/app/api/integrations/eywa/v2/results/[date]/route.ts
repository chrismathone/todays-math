import { resultDay } from "@/lib/eywa/managedTestResults";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { EywaAccessError } from "@/lib/eywa/managedPolicy";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/** 그날 시험의 채점 결과 전부 — 에이와가 그날 행을 통째로 갈아끼운다. */
async function get(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  try {
    const { binding } = await verifyReceiverRequest(request);
    if (new URL(request.url).searchParams.get("bindingId") !== binding.id)
      throw new EywaAccessError("binding_mismatch");
    return Response.json(
      await resultDay(binding.id, (await context.params).date),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}
export const GET = withErrorLog("/api/integrations/eywa/v2/results/[date]", get);
