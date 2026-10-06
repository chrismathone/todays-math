import type {
  FadingTeacherDashboard,
  FadingTeacherStudent,
} from "@/contracts/fadingTeacher.contract";

/** The parent owns branch scope and access; both readers keep the API's { data } envelope. */
export type TeacherFadingSource = {
  getDashboard: () => Promise<{ data: FadingTeacherDashboard }>;
  getStudent: (
    studentId: string,
    classId: string,
  ) => Promise<{ data: FadingTeacherStudent }>;
};

export class TeacherFadingSourceError extends Error {
  constructor(public readonly status: number) {
    super(`Teacher fading read failed (${status})`);
    this.name = "TeacherFadingSourceError";
  }
}
