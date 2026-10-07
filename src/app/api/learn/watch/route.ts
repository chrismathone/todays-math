/**
 * POST /api/learn/watch — 학생 시청 기록 (브리프 §2.4 · §7 · D-124 ⑺).
 *
 * 본문은 `conceptWatchReportSchema`(concept-port 가 옮긴 계약 그대로 — `lectureId` · `seconds` · `percent`).
 * 🔴 `percent` 는 **쓰지 않는다** — 서버가 `본 최대 지점 ÷ 강의 길이`로 다시 센다(`watchReport.ts`).
 * 🔴 목록과 **같은 판정**(`lectureOpenToStudent`)을 지난 강의만 받는다 — 남의 학년 강의 id 를 보내도 404,
 *    기록은 한 줄도 안 생긴다. 규칙(뒤로 안 감 · 한 번 완료면 완료)은 `watchRules.mergeWatchRecord` 한 곳.
 * ⚠️ 읽고-합치고-쓰기다. 같은 학생이 탭 둘로 동시에 보내면 한 번의 보고가 늦게 덮을 수 있다(다음 보고가
 *    바로잡는다). SQL `GREATEST` 로 옮기면 규칙이 두 곳이 된다 — 보고서 «리드가 정할 것».
 */
import type { NextRequest } from "next/server";

import { conceptWatchReportSchema } from "@/contracts/conceptLecture.contract";
import { learnWatchResponseSchema } from "@/contracts/studentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { crossSiteError } from "@/lib/learn/accountRoutes";
import { lectureOpenToStudent } from "@/lib/learn/lectureAccess";
import { loadStudentLectureScope } from "@/lib/learn/studentLectures";
import { requireStudent } from "@/lib/learn/studentRequest";
import { recordWatchReport } from "@/lib/learn/watchReport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: NextRequest) {
  const gate = await requireStudent({ active: true, menu: "lectures" });
  if (gate.response) return gate.response;
  if (!sameOriginMutation(request)) return crossSiteError();

  const body = await request.json().catch(() => undefined);
  const parsed = conceptWatchReportSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const scope = await loadStudentLectureScope(gate.student.studentId);
  if (!scope) return unauthorizedError();

  const lecture = await db.conceptLecture.findUnique({
    where: { id: parsed.data.lectureId },
  });
  if (!lecture || !lectureOpenToStudent(lecture, scope.progressUnitIds))
    return notFoundError("강의");

  const key = {
    studentId_lectureId: {
      studentId: scope.student.id,
      lectureId: lecture.id,
    },
  };
  const prev = await db.conceptLectureView.findUnique({ where: key });
  const next = recordWatchReport(
    prev
      ? {
          maxSeconds: prev.maxSeconds,
          percent: prev.percent,
          completedAt: prev.completedAt,
        }
      : null,
    lecture.seconds,
    parsed.data.seconds,
    new Date(),
  );
  const saved = await db.conceptLectureView.upsert({
    where: key,
    create: { studentId: scope.student.id, lectureId: lecture.id, ...next },
    update: next,
  });
  return jsonOk(learnWatchResponseSchema, {
    data: {
      watch: {
        maxSeconds: saved.maxSeconds,
        percent: saved.percent,
        completed: saved.completedAt !== null,
      },
    },
  });
}

export const POST = withErrorLog("/api/learn/watch", handlePost);
