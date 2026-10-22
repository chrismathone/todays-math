import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import { TestConsole } from "@/components/learn/TestConsole";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import { createApiFadingSource } from "@/components/fading/apiSource";
import { createLocalFadingSource } from "@/lib/fading/local";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import {
  homePlan,
  concepts,
  today,
  completedWorkload,
} from "../srs-m02-m10-home/plans";
import { prepareMemory } from "../srs-m05-m06-memory/memory";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

// Display fixtures use the actual shells/components and local rule engines. No account or DB.
const params = new URLSearchParams(location.search);
const scene = params.get("scene") ?? "done";
const memory = scene === "memory" || scene === "chips";
const first = scene === "first";
const plan = homePlan({
  recalls: scene === "mixed" ? 2 : ["recall", "short"].includes(scene) ? 1 : 0,
  quota: scene === "mixed" ? 12 : scene === "recall" ? 1 : first ? 15 : 10,
  target: first ? "이상과 이하" : "초과와 미만",
  workload: ["recall", "short"].includes(scene)
    ? null
    : first
      ? {
          kind: "explorers",
          route: "unit",
          unitId: "g5-decimals",
          title: "소수 곱셈과 어림",
          subtitle: "초등 5학년",
          goal: 15,
          answered: 0,
          retryRemaining: 0,
          status: "next",
          canStart: true,
        }
      : completedWorkload,
});
const prepared = memory
  ? await prepareMemory({
      cards: scene !== "chips",
      step: Number(params.get("step") ?? 4) as 2 | 3 | 4,
      rating: params.has("rating"),
    })
  : null;
const storageKey = `qa-remaining:${location.search}`;
const restored = memory ? sessionStorage.getItem(storageKey) : null;
const local = createLocalFadingSource({
  today,
  concepts: prepared ? [prepared.concept] : concepts,
  ...(prepared
    ? {
        fading: restored ? JSON.parse(restored) : prepared.source.snapshot(),
        cards: scene !== "chips",
        traps: { [prepared.concept.id]: [{ text: "오답" }] },
        daily: {
          quota: 20,
          workload: {
            ...completedWorkload,
            status: "next",
            answered: 0,
            canStart: true,
          },
        },
      }
    : {}),
  now: () => Date.UTC(2026, 9, 21, 3),
});
const actions: unknown[] = [];
const source = {
  ...local,
  dailyPlan: memory ? local.dailyPlan : async () => plan,
  act: async (action: Parameters<typeof local.act>[0]) => {
    actions.push(action);
    if (params.get("fault") === "401")
      return createApiFadingSource({ studentId: "local-experience" }).act(
        action,
      );
    const result = await local.act(action);
    if (memory)
      sessionStorage.setItem(storageKey, JSON.stringify(local.snapshot()));
    return result;
  },
};
Object.assign(window, {
  __qaActions: actions,
  __qaSnapshot: () => local.snapshot(),
});
const relearn = createLocalFadingRelearnSource({
  main: local,
  concepts: prepared ? [prepared.concept] : concepts,
});
const complete = !first && !memory;
const days = scene === "progress" ? 14 : complete ? 1 : 0;
const initialState: ExplorerState = {
  ...explorerView(createExplorerState("local-experience", 5), today),
  student: { id: "local-experience", name: "로컬 검증", className: "테스트반" },
  revision: 0,
  feedback: null,
  journey: {
    activeKind: "elementary",
    completedDays: days,
    todayComplete: complete,
    todayAnswered: complete ? 10 : 0,
    todayGoal: 10,
    days: Array.from({ length: days }, (_, i) => ({
      id: `local-day-${i}`,
      kind: "elementary" as const,
      dayId: `2026-10-${String(i + 7).padStart(2, "0")}`,
      date: `2026-10-${String(i + 7).padStart(2, "0")}`,
      completedAt: `2026-10-${String(i + 7).padStart(2, "0")}T01:00:00Z`,
      title: completedWorkload.title,
      subtitle: completedWorkload.subtitle,
      reviewCount: 1,
      reviews: [
        {
          kind: "elementary" as const,
          dayId: `2026-10-${String(i + 7).padStart(2, "0")}`,
          title: completedWorkload.title,
          subtitle: completedWorkload.subtitle,
          reviewCount: 1,
        },
      ],
    })),
    upcoming: [{ title: "초과와 미만", subtitle: "초등 5학년" }],
    position: {
      caption: "나의 진행",
      ordinal: 2,
      title: "수의 범위와 어림하기",
      note: "이상과 이하",
      collected: 5,
      total: 30,
      due: 0,
    },
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
      {params.has("test") ? <TestConsole /> : null}
    </StudentAppShell>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
