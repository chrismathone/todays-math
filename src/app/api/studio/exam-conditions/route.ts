import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createExamCondition, listExamConditions } from "@/lib/examConditions";

// 시험지 만들기 «이름 붙인 출제 조건»(W5) — 주인의 조건 목록 · 저장.
export const GET = withErrorLog(
  "/api/studio/exam-conditions",
  (request: Request) => listExamConditions(request),
);
export const POST = withErrorLog(
  "/api/studio/exam-conditions",
  (request: Request) => createExamCondition(request),
);
