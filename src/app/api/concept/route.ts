/**
 * GET /api/concept — «오늘의 개념» 첫 화면: 반별 이번 주 차시 · 요약 · 끝까지 본 학생 (D-124 ⑴⑺).
 * 대응 계약: src/contracts/conceptAdmin.contract.ts (conceptBoardResponseSchema)
 *
 * 세션(승인된 계정)만 요구한다 — 반은 소유 범위 안만 읽고(`adminService` · D-130), 메뉴 권한은 관문
 * (`accountRouteAllowed` 의 `/api/concept`)이 막는다. 응답을 계약으로 검사하므로 n/m 과 안 본
 * 학생 이름 수가 어긋난 응답은 나가지 않는다.
 */
import { conceptBoardResponseSchema } from "@/contracts/conceptAdmin.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { jsonOk } from "@/lib/apiResponse";
import { loadConceptBoard } from "@/lib/concept/adminService";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const account = access.account!;
  const data = await loadConceptBoard(account, account.isAdmin, new Date());
  const res = jsonOk(conceptBoardResponseSchema, { data });
  // 학생 이름이 실린다 — 공유 캐시에 남기지 않는다.
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const GET = withErrorLog("/api/concept", handleGet);
