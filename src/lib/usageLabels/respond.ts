import "server-only";

import { USAGE_LABEL_BODY_BYTES } from "@/contracts/usageLabels.contract";
import { loadUsageLabels, UsageLabelsInputError } from "@/lib/usageLabels/load";
import type { ScopeViewer } from "@/lib/ownerScope";
import { readStrictJson } from "@/lib/textbook/strictJson";

/** 같은 응답 몸을 운영 라우트와 dev 짝이 같이 쓴다. 관문은 부르는 쪽이 먼저 지난다. */
export async function usageLabelsResponse(
  request: Request,
  headers: HeadersInit,
  viewer: ScopeViewer,
): Promise<Response> {
  let body: unknown;
  try {
    body = await readStrictJson(request, { maxBytes: USAGE_LABEL_BODY_BYTES });
  } catch {
    return Response.json(
      { error: "요청 내용을 읽지 못했습니다." },
      { status: 400, headers },
    );
  }
  try {
    return Response.json(await loadUsageLabels(viewer, body), { headers });
  } catch (error) {
    if (error instanceof UsageLabelsInputError) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    return Response.json(
      { error: "순위를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers },
    );
  }
}
