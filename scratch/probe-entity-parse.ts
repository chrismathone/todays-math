/**
 * 시험이 쓰는 PATCH 대역 응답이 계약을 통과하는가 — 2026-09-14.
 * 통과 못 하면 `updateReviewStatus` 가 던지고, 화면의 catch 가 그것을 삼켜
 * 「요청은 갔는데 아무것도 안 바뀌는」 조용한 실패가 된다.
 */
import { problemResponseSchema } from "@/contracts/problem.contract";

const PROBLEM_ENTITY = {
  id: "blocked",
  problemCode: "J30501-A01-025",
  userId: null,
  unitId: "00000000-0000-4000-8000-000000000001",
  source: "manual",
  originProblemId: null,
  familyKey: null,
  difficulty: "기본",
  problemType: "계산",
  content: "검수 대기 문항",
  answer: "1",
  solution: "풀이",
  reviewStatus: "approved",
  directUseAllowed: true,
  pool: "shared",
  figureUrls: [],
  figureSvg: null,
  createdAt: "2026-05-01T09:00:00Z",
  updatedAt: "2026-05-01T09:00:00Z",
};

const parsed = problemResponseSchema.safeParse({ data: PROBLEM_ENTITY });
if (parsed.success) {
  console.log("통과 — 대역 응답은 계약을 만족한다");
} else {
  console.log("실패 — 걸린 자리:");
  for (const issue of parsed.error.issues) {
    console.log("  " + issue.path.join(".") + " : " + issue.message);
  }
}
