import "server-only";
import {
  loadBankSourceAvailability,
  loadBankSourceMaterials,
} from "@/lib/bankSourceAvailability";
import { loadBankSourceCounts } from "@/lib/bankSourceCounts";
import { readUnifiedBankQueryBody } from "@/lib/unifiedBankQueryBody";
import { UnifiedBankQueryError } from "@/lib/unifiedPreview";
import type { BankQueryContext } from "@/lib/bankQueryContext";

/**
 * `…/problems/sources` 의 응답 하나 — 운영(`/api/studio`)과 dev 미리보기(`/api/dev/unified`)가 같이 쓴다.
 *
 *   GET  (view 없음)          → 전역 재고 `BankSourceCounts`(D-161 — 바이트 그대로, 다른 필터와 무관)
 *   GET  ?view=available&…F   → 현재 조건의 가용량 `BankSourceAvailability`(문제은행 P0 · 2026-10-14)
 *   GET  ?view=materials&books=… → 고른 책들의 자료(저장된 메타데이터 그대로) + 자료마다 F 의 보유 · 사용 가능
 *   POST {view:…,…}           → 위 두 보기. 차시 고르기가 길어 주소에 못 싣는 경우(목록 POST 와 같은 읽기)
 *
 * 관문(로그인 · 메뉴)은 부르는 라우트가 먼저 지난다.
 */
export async function bankSourcesResponse(
  /** 없으면 조건 없는 GET 이다(dev 짝을 함수로 부르는 옛 시험). */
  request: Request | undefined,
  headers: HeadersInit,
  /** 최근 출제 빼기(`recent=1`)의 계정 — 라우트가 관문을 지난 뒤 넘긴다. */
  context?: BankQueryContext,
): Promise<Response> {
  try {
    const post = request?.method === "POST";
    const params = !request
      ? new URLSearchParams()
      : post
        ? await readUnifiedBankQueryBody(request)
        : new URL(request.url).searchParams;
    if (post && !params.has("view"))
      throw new UnifiedBankQueryError("보기를 정해 주세요.");
    const view = params.get("view");
    return Response.json(
      view === null
        ? await loadBankSourceCounts()
        : view === "materials"
          ? await loadBankSourceMaterials(params, context)
          : await loadBankSourceAvailability(params, context),
      { headers },
    );
  } catch (error) {
    if (error instanceof UnifiedBankQueryError)
      return Response.json({ error: error.message }, { status: 400, headers });
    return Response.json(
      { error: "출처별 문항 수를 불러오지 못했습니다." },
      { status: 503, headers },
    );
  }
}
