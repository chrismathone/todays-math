import React from "react";
import DailyJourneyBoard from "@/components/math-srs/DailyJourneyBoard";
import { createRoot } from "react-dom/client";
import {
  DailyStudy,
  ExplorerStudyBook,
} from "@/components/math-explorers/ExplorerStudyBook";
import { ExplorerGuideProvider } from "@/components/math-explorers/ExplorerGuide";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import { type JourneyThemeId } from "@/lib/math-explorers/journeyThemes";
import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const theme = (params.get("theme") ?? "classic") as JourneyThemeId;
const scene = params.get("scene") ?? "picker";
const noop = () => {};
const plan = {
  status: scene === "done" ? "done" : "todo",
  next: "a",
  activities: [{ key: "a", start: "open" }],
  units: { recall: { done: 4 }, question: { done: 10 }, task: { done: 1 } },
} as unknown as FadingDailyPlan;
const session = {
  id: "44444444-4444-4444-8444-444444444444",
  sectionId: "5-2-1-1",
  mode: "learn",
  relearn: true,
  startedAt: "2026-10-20T00:00:00Z",
  completedAt: null,
  retry: null,
  attempts: [],
  problems: [
    {
      id: "problem-0",
      sectionId: "5-2-1-1",
      tier: "기본",
      content: "12 이상인 수를 골라 보세요.",
      figureUrl: null,
      answerChoices: ["10", "11", "12", "9"],
      interactive: null,
      input: {
        mode: "number",
        label: "나의 답",
        placeholder: "답",
        help: "숫자",
      },
      hint: null,
      feedback: null,
      followUp: null,
    },
  ],
} as CoursePublicSession;
createRoot(document.getElementById("root")!).render(
  <main data-scene={scene}>
    {scene === "relearn" ? (
      <StudentCoursePractice
        session={session}
        summary={{} as CourseSummary}
        journeyTheme={theme}
        busy={false}
        feedbackId={null}
        onAnswer={noop}
        onHint={noop}
        onNext={noop}
        onContinue={noop}
        onExit={noop}
        onAuthFailure={noop}
      />
    ) : (
      <ExplorerGuideProvider>
        <ExplorerStudyBook
          grade="초등 5학년"
          unit="수의 범위와 어림하기"
          theme={theme}
          study={
            <DailyStudy
              plan={plan}
              busy={false}
              onStart={noop}
              startId="start"
            />
          }
          journey={
            <DailyJourneyBoard
              hideTitle
              variant="map"
              theme={theme}
              busy={false}
              onReviewDay={noop}
              journey={{
                completedDays: 2,
                todayComplete: scene === "done",
                todayAnswered: scene === "done" ? 20 : 0,
                todayGoal: 20,
                days: [1, 2].map((i) => ({
                  id: `day-${i}`,
                  date: `2026-10-${17 + i}`,
                  completedAt: `2026-10-${17 + i}T00:00:00Z`,
                  title: "수의 범위와 어림하기",
                  subtitle: "초5 · 2학기",
                  reviewCount: 10,
                })),
                upcoming: [
                  "이상과 이하",
                  "초과와 미만",
                  "올림",
                  "버림",
                  "반올림",
                ].map((title) => ({ title, subtitle: "초5 · 2학기" })),
              }}
            />
          }
        />
      </ExplorerGuideProvider>
    )}
  </main>,
);
