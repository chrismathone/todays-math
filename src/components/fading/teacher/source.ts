import type {
  FadingTeacherDashboard,
  FadingTeacherQuota,
  FadingTeacherQuotaInput,
  FadingTeacherStudent,
} from "@/contracts/fadingTeacher.contract";

/** The parent owns branch scope and access; both readers keep the API's { data } envelope. */
export type TeacherFadingSource = {
  getDashboard: () => Promise<{ data: FadingTeacherDashboard }>;
  getStudent: (
    studentId: string,
    classId: string,
  ) => Promise<{ data: FadingTeacherStudent }>;
  /** 다음 한국 날짜부터의 하루 분량(2026-10-17). 없으면 화면은 보기만 한다. 409 는 «다른 사람이 먼저 바꿈»이다. */
  setQuota?: (
    studentId: string,
    classId: string,
    input: FadingTeacherQuotaInput,
  ) => Promise<{ data: FadingTeacherQuota }>;
};

export class TeacherFadingSourceError extends Error {
  constructor(public readonly status: number) {
    super(`Teacher fading read failed (${status})`);
    this.name = "TeacherFadingSourceError";
  }
}
