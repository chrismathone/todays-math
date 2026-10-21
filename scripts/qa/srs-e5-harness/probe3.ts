// 스스로 평가하는 문제(self-check)에 힌트 없이 «혼자 풀었다»를 내면 기록이 계약을 통과하는가 — 저장하지 않는다.
import { readSrsState } from "@/lib/math-srs/serverStore";
import { db } from "@/lib/db";
import {
  submitCourseAttempt,
  storedCourseSchema,
} from "@/lib/math-srs/courseAutomation";

async function main() {
  if (!process.env.DATABASE_URL?.includes("127.0.0.1:54335"))
    throw new Error("local only");
  const days = Number(process.argv[2] ?? 2);
  const now = new Date(Date.now() + days * 86_400_000);
  const student = await db.student.findFirst({ where: { name: "검수학생" } });
  const { state } = await readSrsState(student!.id);
  const course = state.course!;
  const session = course.learner.session!;
  const problem = session.problems[session.attempts.length];
  console.log(
    "problem mode",
    problem.input.mode,
    "hinted",
    (session.hintedProblemIds ?? []).includes(problem.id),
  );
  console.log("before ok?", storedCourseSchema.safeParse(course).success);
  for (const variant of [
    {
      label: "self-check, 힌트 없이 «혼자 풀었다»",
      input: {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer: "",
        selfCorrect: true,
      },
    },
    {
      label: "self-check, «다시 연습할래요»",
      input: {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer: "",
        selfCorrect: false,
      },
    },
    {
      label: "«아직 모르겠어요»",
      input: {
        sessionId: session.id,
        problemId: problem.id,
        submittedAnswer: "",
        giveUp: true,
      },
    },
  ]) {
    try {
      const next = submitCourseAttempt(course, variant.input as never, now);
      const r = storedCourseSchema.safeParse(next);
      console.log(variant.label, "→", r.success ? "계약 통과" : "계약 거절");
    } catch (e) {
      console.log(variant.label, "→ throw", (e as Error).message);
    }
  }
  await db.$disconnect();
}
main();
