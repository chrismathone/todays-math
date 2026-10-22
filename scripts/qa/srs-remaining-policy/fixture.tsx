import React from "react";
import { createRoot } from "react-dom/client";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import {
  FadingRelearnStatus,
  FadingRelearnModal,
} from "@/components/fading/FadingRelearnCheck";
import { useFadingRelearn } from "@/components/fading/useFadingRelearn";
import { createLocalFadingSource } from "@/lib/fading/local";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import {
  dashboard,
  courseDetail,
  explorerDetail,
  studentId,
  otherStudentId,
  studentState,
  today,
} from "./data";
import { concept } from "./content";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "mixed";
const teacherId = "33333333-3333-4333-8333-333333333333";
const teacher = {
  name: "로컬 교사",
  email: "fixture@example.invalid",
  isAdmin: false,
};
let requests = 0;
window.fetch = async (input, options) => {
  const url = new URL(String(input), location.href);
  if (!options?.method || options.method === "GET") {
    if (url.pathname === "/api/account/access")
      return Response.json({
        data: {
          ...teacher,
          id: teacherId,
          role: "director",
          approvalStatus: "approved",
          menus: ["srs", "textbook"],
        },
      });
    if (url.pathname === "/api/math-srs/course")
      return Response.json(dashboard);
    if (url.pathname === "/api/studio/print-presets")
      return Response.json({ data: [], meta: { limit: 20 } });
    for (const id of [studentId, otherStudentId]) {
      if (url.pathname === `/api/students/${id}/math-srs/course`)
        return Response.json(courseDetail(mode, id));
      if (url.pathname === `/api/students/${id}/math-srs/explorers`)
        return mode === "explorer-denied"
          ? Response.json(
              { error: { message: "이 학생 탐험 기록을 열 수 없습니다." } },
              { status: 403 },
            )
          : Response.json(explorerDetail(mode, id));
    }
    if (url.pathname === `/api/textbook/students/${studentId}/concept-evidence`)
      return mode === "textbook-denied"
        ? Response.json(
            { error: { message: "학생을(를) 찾을 수 없습니다." } },
            { status: 404 },
          )
        : Response.json({ data: { attempts: [], references: [] } });
  }
  document.documentElement.dataset.forbiddenPath = url.pathname;
  document.documentElement.dataset.forbiddenRequests = String(++requests);
  throw Error(`Unexpected fixture request ${url.pathname}`);
};
document.documentElement.dataset.forbiddenRequests = "0";
let now = Date.parse(`${today}T03:00:00Z`);
const checkConcept = {
  ...concept,
  propositions: concept.propositions.slice(0, 1),
};
const main = createLocalFadingSource({
  concepts: [checkConcept],
  today,
  cards: true,
  now: () => now,
});
const relearn = createLocalFadingRelearnSource({
  main,
  concepts: [checkConcept],
});
if (mode === "relearn") {
  await main.act({ action: "pick", conceptId: concept.id });
  let view = await main.act({ action: "open", conceptId: concept.id });
  const ref = { conceptId: concept.id, sessionId: view.session!.id };
  view = await main.act({ action: "read", ...ref });
  for (const step of [2, 3, 4] as const)
    view = await main.act({
      action: "step",
      ...ref,
      step,
      placements: [],
      gaveUp: true,
    });
  await main.act({
    action: "rate",
    ...ref,
    rating: "again",
    requestId: crypto.randomUUID(),
  });
  now += 60000;
}
const before = JSON.stringify(main.snapshot());
function Relearn() {
  const controller = useFadingRelearn(relearn);
  return (
    <>
      <div className="qa-controls">
        <button
          type="button"
          onClick={() => {
            controller.boundary();
            document.documentElement.dataset.memoryUnchanged = String(
              JSON.stringify(main.snapshot()) === before,
            );
          }}
        >
          다음 제출 경계 (검증)
        </button>
      </div>
      <FadingRelearnStatus controller={controller} student />
      <FadingRelearnModal controller={controller} student />
    </>
  );
}
if (!["student", "relearn"].includes(mode))
  history.replaceState(null, "", `${location.search}#srs`);
createRoot(document.getElementById("root")!).render(
  mode === "student" || mode === "relearn" ? (
    <StudentAppShell student={{ name: "로컬 검증" }} preview>
      {mode === "student" ? (
        <StudentMathExplorers initialState={studentState} journeyTheme="sea" />
      ) : (
        <Relearn />
      )}
    </StudentAppShell>
  ) : (
    <UnifiedWorkspace
      initialData={{
        problems: [],
        total: 0,
        page: 1,
        pageSize: 20,
        grades: [],
        chapters: [],
      }}
      allowedMenus={["srs", "textbook"]}
      fadingGate="off"
      storageScope={teacherId}
      currentUser={teacher}
    />
  ),
);
