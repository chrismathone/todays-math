import React from "react";
// Warm the actual lazy chunks before interactions in the isolated Vite fixture.
import "@/components/math-srs/StudentCoursePractice";
import "@/components/math-srs/StudentCoursePreview";
import "@/components/math/MathText";
import "@/components/math/ProblemContent";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import StudentCourseSrs from "@/components/math-srs/StudentCourseSrs";
import { createLocalFadingSource } from "@/lib/fading/local";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import {
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  submitCourseAttempt,
  submitCourseFollowUp,
  courseSummary,
  publicCourseSession,
} from "@/lib/math-srs/courseAutomation";
import type { ExplorerRequest } from "@/contracts/mathExplorers.contract";
import { courseState, explorerState, today } from "./data";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "explorer";
const explorer = explorerState();
const course = courseState(
  mode === "setup" || mode === "paused" ? mode : "ready",
);
const source = createLocalFadingSource({ concepts: [], today });
const now = new Date(`${today}T03:00:00.000Z`);
let stored = course.plan
  ? setCoursePlan(
      emptyCourseState(),
      { ...course.plan, expectedRevision: course.revision },
      now,
    )
  : emptyCourseState();
const savedPlan = JSON.stringify(stored.plan);
let studyWrites = 0;
function studyReply() {
  document.documentElement.dataset.studyWrites = String(++studyWrites);
  document.documentElement.dataset.planUnchanged = String(
    JSON.stringify(stored.plan) === savedPlan,
  );
  return {
    ...course,
    revision: course.revision + studyWrites,
    summary: courseSummary(stored, now),
    session: stored.learner.session
      ? publicCourseSession(stored.learner.session, { followUp: true })
      : null,
  };
}
let requests = 0;
let forbidden = 0;
// Local responses only. Unexpected requests fail before reaching the network.
window.fetch = async (input, options) => {
  const url = String(input);
  const reply = (data: unknown) => Response.json({ data });
  if (!options?.body && url === "/api/learn/math-srs/course")
    return reply(course);
  if (options?.body && mode === "ready") {
    const body = JSON.parse(String(options.body));
    if (url === "/api/learn/math-srs/course") {
      stored = startAutomaticCourse(stored, now, 42, () => crypto.randomUUID());
      return reply(studyReply());
    }
    if (url === "/api/learn/math-srs/course/attempts") {
      stored = submitCourseAttempt(stored, body, now, { followUps: true });
      return reply(studyReply());
    }
    if (url === "/api/learn/math-srs/course/follow-up") {
      stored = submitCourseFollowUp(stored, body, now);
      return reply(studyReply());
    }
  }
  if (url === "/api/learn/math-explorers") {
    if (!options?.body) return reply(explorer);
    const { action } = JSON.parse(String(options.body)) as ExplorerRequest;
    if (action.type === "solution") {
      const card = definitionCard(action.cardId);
      requests++;
      document.documentElement.dataset.solutionReads = String(requests);
      return reply({
        ...explorer,
        feedback: {
          message: "해설",
          solution: {
            cardId: card.id,
            name: card.name,
            definition: card.definition,
            explanation: card.explanation,
            note: card.note,
            examples: card.examples.map((example) => ({
              label: example.text,
              correct: example.yes,
            })),
            statement: card.trap,
            truth: card.truth,
          },
        },
      });
    }
  }
  forbidden++;
  document.documentElement.dataset.forbiddenRequests = String(forbidden);
  throw Error(`Unexpected fixture request: ${url}`);
};
document.documentElement.dataset.forbiddenRequests = "0";
document.documentElement.dataset.planUnchanged = "true";
createRoot(document.getElementById("root")!).render(
  <StudentAppShell student={{ name: "로컬 검증" }} preview>
    {mode === "explorer" || mode === "book" ? (
      <StudentMathExplorers
        initialState={explorer}
        conceptMemoryEnabled={mode === "book"}
        fadingSource={source}
        journeyTheme="sea"
      />
    ) : (
      <StudentCourseSrs />
    )}
  </StudentAppShell>,
);
