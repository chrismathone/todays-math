import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerConceptMemory from "@/components/math-explorers/ExplorerConceptMemory";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import { fadingDailyPlanSchema } from "@/contracts/fadingDaily.contract";
import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { fadingConceptMap } from "@/lib/fading/catalog";
import {
  fadingDailyLearning,
  fadingDailyWorkload,
  serverFadingDailyPlan,
} from "@/lib/fading/explorerDailyServer";
import { createLocalFadingSource } from "@/lib/fading/local";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import { explorerView } from "@/lib/math-explorers/engine";
import {
  expeditionDto,
  initialOwnedExplorer,
} from "@/lib/math-explorers/expedition";
import {
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";
import {
  emptySrsState,
  parseSrsState,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { homePlan } from "../../../scripts/qa/srs-m02-m10-home/plans";

// Pure synthetic inputs only. No student export, route handler, database or API.
const id = "fresh-day-local-fixture";
const now = new Date("2026-10-22T03:00:00.000Z");
const today = "2026-10-22";
const concepts = fadingConceptMap();

function courseDay(section = "5-2-1-1", studied = false): StoredSrsState {
  const state = {
    ...emptySrsState(),
    course: setCoursePlan(
      emptyCourseState(),
      {
        startSectionId: section,
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      now,
    ),
  };
  const explorer = initialOwnedExplorer(state, id, now);
  if (studied) {
    explorer.profile.definitions!.cards = Object.fromEntries(
      definitionCards
        .filter((card) => card.unit.startsWith("g5-"))
        .map((card) => [
          card.id,
          {
            level: 1,
            due: "2026-10-30",
            lastDate: "2026-10-21",
            attemptedAt: "2026-10-21",
            missed: 0,
          },
        ]),
    );
  }
  return parseSrsState({ ...state, explorers: explorer });
}

function planFor(state: StoredSrsState, expedition = true) {
  return fadingDailyPlanSchema.parse(
    serverFadingDailyPlan({ state, studentId: id, now, concepts, expedition }),
  );
}

async function home(state: StoredSrsState, supplied?: FadingDailyPlan) {
  const learning = fadingDailyLearning(state, id, now, concepts);
  const source = createLocalFadingSource({
    today,
    now: () => now.getTime(),
    concepts: [...concepts.values()],
    fading: state.fading,
    daily: {
      workload: fadingDailyWorkload(state, id, now),
      ...learning,
    },
  });
  const plan = supplied ?? planFor(state);
  if (!supplied) expect(await source.dailyPlan()).toEqual(plan);
  const fadingSource = supplied
    ? { ...source, dailyPlan: async () => fadingDailyPlanSchema.parse(plan) }
    : source;
  const explorer: ExplorerState = {
    ...explorerView(initialOwnedExplorer(state, id, now), today),
    student: { id, name: "학생", className: "로컬 검증" },
    revision: 0,
    feedback: null,
    expedition: expeditionDto(state, id, now),
  };
  const result = render(
    <ExplorerConceptMemory
      student
      studyBook
      source={fadingSource}
      relearnSource={createLocalFadingRelearnSource({
        main: source,
        concepts: [...concepts.values()],
      })}
      renderHome={(memory, options) => (
        <ExplorerHome
          state={explorer}
          conceptMemory={memory}
          studyBook={options?.studyBook}
          dailyUnit={options?.dailyUnit}
          busy={false}
          onAction={vi.fn()}
          onStart={vi.fn()}
          onResume={vi.fn()}
          onRetry={vi.fn()}
          onInspect={vi.fn()}
          onReviewDay={vi.fn()}
        />
      )}
    />,
  );
  await waitFor(() =>
    expect(result.container).not.toHaveTextContent(
      "오늘 공부를 준비하고 있어요",
    ),
  );
  return result;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("No API in this regression");
    }),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("M11 public daily source → concept memory → actual explorer home", () => {
  it("omits a false problem unit on a fresh concept-first day with teacher start 5-2-1-1 / daily10", async () => {
    const state = courseDay();
    const before = structuredClone(state);
    const plan = planFor(state);
    expect(state.course!.plan).toMatchObject({
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 10,
      enabled: true,
    });
    expect(plan.prerequisite!.target).toMatchObject({
      title: "소수 곱셈과 어림",
      explorerUnitId: "g5-estimate",
      courseSectionId: null,
    });
    expect(plan.activities.find((a) => a.key === plan.next)).toMatchObject({
      kind: "practice",
      source: { kind: "explorers", title: "소수 곱셈과 어림" },
    });
    await home(state);
    expect(screen.getByText("오늘 개념 묶음").parentElement).toHaveTextContent(
      "소수 곱셈과 어림",
    );
    expect(screen.queryByText("문제 진도")).toBeNull();
    expect(
      screen.getByRole("button", { name: "오늘 공부 시작" }),
    ).toBeEnabled();
    expect(state).toEqual(before);
  });

  it("keeps the authoritative course target on a problem day", async () => {
    const state = courseDay("5-2-1-1", true);
    const plan = planFor(state);
    expect(plan.prerequisite!.target).toMatchObject({
      title: "이상과 이하 알아보기",
      courseSectionId: "5-2-1-1",
    });
    expect(plan.activities.find((a) => a.kind === "practice")).toMatchObject({
      source: { kind: "elementary" },
    });
    await home(state);
    expect(screen.getByText("문제 진도").parentElement).toHaveTextContent(
      "이상과 이하 알아보기",
    );
  });

  it("keeps the course target while the next activity is prerequisite recall", async () => {
    const state = courseDay("5-2-2-1", true);
    const plan = planFor(state);
    expect(plan.activities.find((a) => a.key === plan.next)).toMatchObject({
      kind: "recall",
      bucket: "prerequisite",
    });
    await home(state);
    await waitFor(() => {
      const unit = screen.getByText("문제 진도").parentElement!;
      expect(unit.querySelector(".katex")).not.toBeNull();
      // KaTeX includes a second, semantic MathML copy of the same formula.
      const visible = unit.cloneNode(true) as HTMLElement;
      visible
        .querySelectorAll(".katex-mathml")
        .forEach((node) => node.remove());
      expect(visible.textContent).toBe(
        `문제 진도${plan.prerequisite!.target.title}`,
      );
    });
    expect(screen.getByText("오늘 개념 묶음")).toBeInTheDocument();
  });

  it("uses a real problem mission source when target information is absent", async () => {
    const state = courseDay("5-2-1-1", true);
    const plan = { ...planFor(state), prerequisite: null };
    const practice = plan.activities.find((a) => a.kind === "practice")!;
    await home(state, plan);
    expect(screen.getByText("문제 진도").parentElement).toHaveTextContent(
      practice.source.title,
    );
  });

  it("does not substitute an explorer practice or currentUnit when target information is absent", async () => {
    const state = courseDay();
    await home(state, { ...planFor(state), prerequisite: null });
    expect(screen.getByText("오늘 개념 묶음")).toBeInTheDocument();
    expect(screen.queryByText("문제 진도")).toBeNull();
  });

  it("does not invent a problem target for memory-only work", async () => {
    const state = courseDay();
    const local = createLocalFadingSource({
      today,
      concepts: [...concepts.values()],
    });
    await local.act({ action: "pick", conceptId: [...concepts.keys()][0] });
    state.fading = local.snapshot();
    const plan = planFor(state, false);
    expect(plan.prerequisite).toBeNull();
    expect(plan.activities.every((a) => a.kind === "recall")).toBe(true);
    await home(state, plan);
    expect(screen.getByText("오늘 개념 묶음")).toBeInTheDocument();
    expect(screen.queryByText("문제 진도")).toBeNull();
  });

  it("omits the unit for a plan without target or activities", async () => {
    const state = courseDay();
    const plan = planFor(state, false);
    expect(plan.activities).toEqual([]);
    await home(state, plan);
    expect(screen.queryByText("문제 진도")).toBeNull();
    expect(screen.queryByText("오늘 개념 묶음")).toBeNull();
    expect(
      screen.getByRole("button", { name: "오늘 공부 시작" }),
    ).toBeDisabled();
  });

  it.each(["done", "short"] as const)(
    "preserves completed activity provenance for %s through the home chain",
    async (status) => {
      const state = courseDay();
      const plan =
        status === "done"
          ? homePlan()
          : homePlan({ workload: null, recalls: 1, quota: 10 });
      expect(plan.status).toBe(status);
      await home(state, plan);
      expect(screen.getByText("오늘 공부를 마쳤어요")).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByText("오늘 공부를 마쳤어요").parentElement,
        ).toHaveTextContent("이상과 이하"),
      );
      expect(screen.queryByText("문제 진도")).toBeNull();
      expect(screen.queryByText("오늘 개념 묶음")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "오늘 공부 시작" }),
      ).toBeNull();
    },
  );
});
