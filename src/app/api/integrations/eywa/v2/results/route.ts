import { resultDays } from "@/lib/eywa/managedTestResults";
import {
  receiverFailure,
  verifyReceiverRequest,
} from "@/lib/eywa/managedTransport";
import { EywaAccessError } from "@/lib/eywa/managedPolicy";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/** 채점 결과의 날짜별 지문 — 에이와가 달라진 날만 `/results/{date}` 로 다시 읽는다. */
async function get(request: Request) {
  try {
    const { binding } = await verifyReceiverRequest(request);
    const params = new URL(request.url).searchParams;
    if (params.get("bindingId") !== binding.id)
      throw new EywaAccessError("binding_mismatch");
    return Response.json(
      await resultDays(binding.id, params.get("from"), params.get("to")),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}
export const GET = withErrorLog("/api/integrations/eywa/v2/results", get);
