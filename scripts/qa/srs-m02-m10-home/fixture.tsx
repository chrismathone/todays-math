import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import { createLocalFadingSource } from "@/lib/fading/local";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { homePlan, concepts, today, completedWorkload } from "./plans";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const scene = params.get("scene") ?? "done";
const plan = homePlan({
  target: params.get("target") ?? "초과와 미만",
  recalls:
    scene === "mixed"
      ? 2
      : scene === "recall" || scene === "short" || scene === "next"
        ? 1
        : 0,
  quota: scene === "mixed" ? 12 : scene === "recall" ? 1 : 10,
  date: scene === "next" ? "2026-10-22" : today,
  workload:
    scene === "recall" || scene === "short"
      ? null
      : scene === "next"
        ? {
            ...completedWorkload,
            status: "next",
            answered: 0,
            canStart: true,
          }
        : completedWorkload,
});
const local = createLocalFadingSource({ today: plan.today, concepts });
const source = { ...local, dailyPlan: async () => plan };
const relearn = createLocalFadingRelearnSource({ main: local, concepts });
const complete = plan.status === "done" || plan.status === "short";
const initialState: ExplorerState = {
  ...explorerView(createExplorerState("local-home", 5), plan.today),
  student: { id: "local-home", name: "로컬 검증", className: "테스트반" },
  revision: 0,
  feedback: null,
  journey: {
    activeKind: "elementary",
    completedDays: complete ? 1 : 0,
    todayComplete: complete,
    todayAnswered: complete ? 10 : 0,
    todayGoal: 10,
    days: complete
      ? [
          {
            id: "local-day",
            kind: "elementary",
            dayId: today,
            date: today,
            completedAt: `${today}T01:00:00Z`,
            title: completedWorkload.title,
            subtitle: completedWorkload.subtitle,
            reviewCount: 10,
            reviews: [],
          },
        ]
      : [],
    upcoming: [{ title: "초과와 미만", subtitle: "초등 5학년" }],
  },
};
function Fixture() {
  const [mounted, setMounted] = useState(true);
  return (
    <StudentAppShell student={initialState.student} preview>
      <button type="button" data-qa-visit onClick={() => setMounted(!mounted)}>
        {mounted ? "검증: 홈 나가기" : "검증: 홈 복귀"}
      </button>
      {mounted ? (
        <StudentMathExplorers
          student
          conceptMemoryEnabled
          journeyTheme="sea"
          initialState={initialState}
          fadingSource={source}
          fadingRelearnSource={relearn}
        />
      ) : (
        <p>로컬 검증 대기</p>
      )}
    </StudentAppShell>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
