/**
 * GET /api/concept/units — 전체 차시(학년 › 단원 › 차시), 차시마다 강의 수 (D-124 ⑴ «전체는 한 번 더»).
 * 대응 계약: src/contracts/conceptAdmin.contract.ts (conceptUnitsResponseSchema)
 *
 * 차시와 강의 목록은 서비스 공용이다(D-124 ⑼) — 반·학생을 읽지 않는다.
 */
import { conceptUnitsResponseSchema } from "@/contracts/conceptAdmin.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { jsonOk } from "@/lib/apiResponse";
import { loadConceptUnits } from "@/lib/concept/adminService";

export async function GET(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const data = await loadConceptUnits(access.account!.isAdmin);
  const res = jsonOk(conceptUnitsResponseSchema, { data });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
