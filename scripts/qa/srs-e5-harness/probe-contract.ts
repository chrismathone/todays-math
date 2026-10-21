import { randomUUID } from "node:crypto";
import { coursePublicProblemSchema } from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
const r = coursePublicProblemSchema.safeParse({
  id: randomUUID(),
  sectionId: COURSE_SECTIONS[0].id,
  tier: "기본",
  content: "문제",
  input: { mode: "number", label: "답", placeholder: "", help: "" },
  answerChoices: null,
  interactive: null,
  figureUrl: null,
  hint: null,
  feedback: { correct: false },
});
console.log(r.success ? "ok" : JSON.stringify(r.error.issues));
