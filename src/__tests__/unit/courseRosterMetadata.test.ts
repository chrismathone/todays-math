import { describe, expect, it } from "vitest";
import { courseRosterDto } from "@/lib/math-srs/courseServer";
import { emptySrsState } from "@/lib/math-srs/serverState";
describe("course enrollment metadata", () => {
  it("uses each enrollment's class grade even when the student's grade is a source default", () => {
    const student = { id: "student", name: "연동 학생", classId: "class-1", schoolGrade: "중1", class: { id: "class-1", name: "초등반", grade: "초3" }, studentAccount: null };
    const saved = { revision: 0, state: emptySrsState() }; const now = new Date("2026-10-04T00:00:00Z");
    expect(courseRosterDto(student, saved, now)).toMatchObject({ classId: "class-1", classGrade: "초3" });
    const second = { ...student, classId: "class-2", class: { id: "class-2", name: "학년 미확인반", grade: "" } };
    expect(courseRosterDto(second, saved, now)).toMatchObject({ classId: "class-2", className: "학년 미확인반", classGrade: "" });
    expect(student.schoolGrade).toBe("중1");
  });
});
