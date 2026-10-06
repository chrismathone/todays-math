/** 명단은 학생 id만으로 식별하지 않는다 — 한 학생이 여러 반에 등록될 수 있다. */
export const teacherWireKey = (id: string, classId: string) =>
  `${classId}/${id}`;
export type TeacherWireVariant = "A" | "B" | "C" | "D" | "E";
export const TEACHER_WIRE_VARIANTS: readonly TeacherWireVariant[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
];
