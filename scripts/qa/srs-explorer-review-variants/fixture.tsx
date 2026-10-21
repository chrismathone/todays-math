import React from "react";
import { createRoot } from "react-dom/client";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import { definitionSessionCard } from "@/lib/math-explorers/definition-cards";
import {
  EXPLORER_REVIEW_VARIANT_CARD_IDS as ids,
  EXPLORER_FOLLOW_UP_HEADER,
  explorerRequestSchema,
  storedExplorerSchema,
  type ExplorerFeedback,
  type ExplorerState,
} from "@/contracts/mathExplorers.contract";
import "katex/dist/katex.min.css";
import "@/app/globals.css";
import "./fixture.css";

const params = new URLSearchParams(location.search);
const date = "2026-10-22";
const cardId = params.get("card") ?? ids[0];
const kind = Number(params.get("kind") ?? 1);
const run = Number(params.get("run") ?? 1);
const student = {
  id: "local-variants",
  name: "로컬 검증",
  className: "초5 검증반",
};
const key = `qa-review-variants:${location.search}`;
let stored = createExplorerState(student.id, 5);
stored.profile.definitions = {
  runs: run - 1,
  courseGrade: 5,
  history: [],
  cards: Object.fromEntries(
    ids.map((id) => [
      id,
      {
        level: 1,
        due: date,
        lastDate: "2026-10-21",
        attemptedAt: "2026-10-21",
        missed: 0,
      },
    ]),
  ),
};
stored = applyExplorerAction(
  stored,
  { type: "start", route: "memory" },
  date,
  crypto.randomUUID(),
).state;
stored.profile.definitions!.session!.index =
  stored.profile.definitions!.session!.queue.findIndex(
    (task) => task.cardId === cardId && task.kind === kind,
  );
if (params.has("static"))
  delete stored.profile.definitions!.session!.reviewVariant;
if (params.has("replay")) {
  const session = stored.profile.definitions!.session!;
  session.done = true;
  stored.completedDays = [
    {
      date: "2026-10-21",
      unitId: session.unit,
      sessionId: session.id,
      cardIds: [...ids],
      route: "memory",
      ...(session.reviewVariant
        ? { reviewVariant: structuredClone(session.reviewVariant) }
        : {}),
    },
  ];
  stored = applyExplorerAction(
    stored,
    { type: "start", route: "unit", dayId: "2026-10-21" },
    date,
    crypto.randomUUID(),
  ).state;
  stored.profile.definitions!.session!.index =
    stored.profile.definitions!.session!.queue.findIndex(
      (task) => task.cardId === cardId && task.kind === kind,
    );
}
let revision = 1;
let feedback: ExplorerFeedback | null = null;
const restored = sessionStorage.getItem(key);
if (restored) {
  const saved = JSON.parse(restored);
  stored = storedExplorerSchema.parse(saved.stored);
  revision = saved.revision;
}
function view(): ExplorerState {
  return {
    ...explorerView(stored, date, { followUp: true }),
    student,
    revision,
    feedback,
    today: date,
  };
}
const actions: unknown[] = [];
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    location.origin,
  );
  if (
    url.origin === location.origin &&
    url.pathname === "/api/learn/math-explorers"
  ) {
    if (init?.method === "POST") {
      const request = explorerRequestSchema.parse(
        JSON.parse(String(init.body)),
      );
      if (
        request.studentId !== student.id ||
        request.expectedRevision !== revision
      )
        return Response.json(
          { error: { message: "로컬 기록이 바뀌었어요." } },
          { status: 409 },
        );
      if (request.action.type === "expedition-start") {
        // This fixture already holds its assignment; production assignment/CAS is
        // covered by route tests. Resume the preseeded session without another start.
        return Response.json({ data: view() });
      }
      const result = applyExplorerAction(
        stored,
        request.action,
        date,
        request.requestId,
        {
          followUps:
            new Headers(init.headers).get(EXPLORER_FOLLOW_UP_HEADER) === "1",
        },
      );
      stored = result.state;
      feedback = result.feedback;
      if (!result.duplicate) revision++;
      actions.push({ request, feedback });
      sessionStorage.setItem(key, JSON.stringify({ stored, revision }));
    }
    return Response.json({ data: view() });
  }
  if (url.origin !== location.origin || url.pathname.startsWith("/api/"))
    throw new Error(`Blocked fixture fetch ${url.pathname}`);
  return nativeFetch(input, init);
};
Object.assign(window, {
  __qaView: view,
  __qaActions: actions,
  __qaStored: () => structuredClone(stored),
  __qaAnswers: () => {
    const activity = view().currentActivity!;
    const card = definitionSessionCard(
      stored.profile.definitions!.session,
      activity.cardId,
    );
    const labels =
      activity.kind === "examples"
        ? card.examples
            .filter((example) => example.yes)
            .map((example) => example.text)
        : activity.kind === "truth"
          ? [card.truth ? "맞다" : "아니다"]
          : card.words.slice(0, 2);
    return activity.choices
      .filter((choice) => labels.includes(choice.label))
      .map((choice) => choice.id);
  },
});
createRoot(document.getElementById("root")!).render(
  <StudentAppShell student={student} preview>
    <StudentMathExplorers student initialState={view()} journeyTheme="sea" />
  </StudentAppShell>,
);
