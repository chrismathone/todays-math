/**
 * GET /api/learn/lectures/{id} — 학생 강의 하나 (재생 화면이 읽는다 — D-124 ⑵).
 *
 * 목록과 **같은 판정**(`lectureOpenToStudent`)을 지난 강의만. 없는 강의와 안 열린 강의(남의 진도·앞선
 * 차시·초안)는 둘 다 404 — 어느 쪽인지 알려 주면 남의 학년 강의가 있는지가 샌다.
 * 대응 계약: src/contracts/studentAccount.contract.ts `learnLectureResponseSchema`
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { learnLectureResponseSchema } from "@/contracts/studentAccount.contract";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { toStudentLecture } from "@/lib/concept/studentLecture";
import { db } from "@/lib/db";
import { lectureOpenToStudent } from "@/lib/learn/lectureAccess";
import {
  loadStudentLectureScope,
  toLearnUnit,
} from "@/lib/learn/studentLectures";
import { requireStudent } from "@/lib/learn/studentRequest";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(_request: NextRequest, { params }: RouteContext) {
  const gate = await requireStudent({ active: true, menu: "lectures" });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const scope = await loadStudentLectureScope(gate.student.studentId);
  if (!scope) return unauthorizedError();

  const lecture = await db.conceptLecture.findUnique({ where: { id } });
  if (!lecture || !lectureOpenToStudent(lecture, scope.progressUnitIds))
    return notFoundError("강의");

  const [unit, view] = await Promise.all([
    db.unit.findUnique({ where: { id: lecture.unitId } }),
    db.conceptLectureView.findUnique({
      where: {
        studentId_lectureId: { studentId: scope.student.id, lectureId: id },
      },
    }),
  ]);
  const dto = toStudentLecture(lecture, view);
  if (!unit || !dto) return notFoundError("강의");
  return jsonOk(learnLectureResponseSchema, {
    data: {
      student: scope.head,
      unit: toLearnUnit(unit, scope.taughtOn),
      lecture: dto,
    },
  });
}

export const GET = withErrorLog("/api/learn/lectures/[id]", handleGet);
