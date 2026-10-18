import "server-only";
import { EywaAccessError } from "./managedPolicy";
import { requireActiveBinding } from "./managedTestResults";
import { receiverFailure, verifyReceiverRequest } from "./managedTransport";

export async function recheckExamReportBinding(expected: {
  id: string;
  targetBranchId: string;
}) {
  const current = await requireActiveBinding(expected.id);
  if (current.targetBranchId !== expected.targetBranchId)
    throw new EywaAccessError("binding_mismatch");
  return current;
}

/** 기존 결과 피드와 같은 서명·binding 질의·활성 연결·지점 판정. */
export async function verifyExamReportReceiver(request: Request) {
  const { binding } = await verifyReceiverRequest(request);
  if (new URL(request.url).searchParams.get("bindingId") !== binding.id)
    throw new EywaAccessError("binding_mismatch");
  return recheckExamReportBinding(binding);
}

export function examReportReceiverFailure(error: unknown) {
  if (error instanceof EywaAccessError && error.code === "report_not_found")
    return Response.json(
      { error: { code: error.code } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return receiverFailure(error);
}
