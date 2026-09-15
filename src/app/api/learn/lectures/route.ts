/**
 * GET /api/learn/lectures — 학생 강의 목록 (D-124 ⑵ 목록 → 재생 · D-125 ⑸).
 *
 * 그 학생의 **반 진도 + 개인 진도에 있던 차시**의 **게시** 강의만. 진도보다 앞선 차시는 안 나온다.
 * 🔴 판정은 `src/lib/learn/lectureAccess.ts` 의 `lectureOpenToStudent` **하나** — 시청 기록
 *    (`/api/learn/watch`)과 같은 함수다. 그래서 여기서 조회는 차시로만 넓게 하고 `status` 조건을 따로 걸지
 *    않는다(걸면 판정이 두 곳에 생긴다).
 * 학생에게 가는 모양은 `toStudentLecture` 한 곳(AI 고지·잡 ID·시청 확인이 없다 — D-124 ⑹).
 * 대응 계약: src/contracts/studentAccount.contract.ts `learnLectureListResponseSchema`
 */
import { learnLectureListResponseSchema } from "@/contracts/studentAccount.contract";
import { jsonOk, unauthorizedError } from "@/lib/apiResponse";
import { toStudentLecture } from "@/lib/concept/studentLecture";
import { db } from "@/lib/db";
import {
  lectureOpenToStudent,
  sortLecturesForStudent,
} from "@/lib/learn/lectureAccess";
import {
  loadStudentLectureScope,
  toLearnUnit,
} from "@/lib/learn/studentLectures";
import { requireStudent } from "@/lib/learn/studentRequest";

export async function GET() {
  const gate = await requireStudent({ active: true });
  if (gate.response) return gate.response;

  const scope = await loadStudentLectureScope(gate.student.studentId);
  if (!scope) return unauthorizedError();

  const unitIds = [...scope.progressUnitIds];
  const rows =
    unitIds.length === 0
      ? []
      : await db.conceptLecture.findMany({
          where: { unitId: { in: unitIds } },
        });
  const open = rows.filter((l) =>
    lectureOpenToStudent(l, scope.progressUnitIds),
  );

  const openUnitIds = [...new Set(open.map((l) => l.unitId))];
  const [units, views] = await Promise.all([
    openUnitIds.length === 0
      ? []
      : db.unit.findMany({
          where: { id: { in: openUnitIds } },
          orderBy: { orderIndex: "asc" },
        }),
    open.length === 0
      ? []
      : db.conceptLectureView.findMany({
          where: {
            studentId: scope.student.id,
            lectureId: { in: open.map((l) => l.id) },
          },
        }),
  ]);
  const viewOf = new Map(views.map((v) => [v.lectureId, v]));
  const order = new Map(units.map((u) => [u.id, u.orderIndex]));
  const lectures = sortLecturesForStudent(open, order).flatMap((l) => {
    const dto = toStudentLecture(l, viewOf.get(l.id) ?? null);
    return dto ? [dto] : [];
  });

  return jsonOk(learnLectureListResponseSchema, {
    data: { units: units.map(toLearnUnit), lectures },
  });
}
