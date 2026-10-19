import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FadingHome } from "@/components/fading/FadingHome";
import { FadingCatalogScreen } from "@/components/fading/FadingCatalogScreen";
import { FadingEraseScreen } from "@/components/fading/FadingEraseScreen";
import { FadingStats } from "@/components/fading/FadingStats";
import { FadingHomeHistory } from "@/components/fading/FadingHomeHistory";
import { createLocalFadingSource } from "@/lib/fading/local";
import type { FadingConcept } from "@/lib/fading/concepts";

vi.mock("@/components/fading/FadingMath", () => ({
  FadingMath: ({ text }: { text: string }) => <>{text}</>,
}));
afterEach(cleanup);
const concepts: FadingConcept[] = [
  {
    id: "overview-copy",
    section: "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
    level: "하",
    ordinal: 1,
    siblings: 2,
    propositions: [
      {
        id: "p",
        term: "이상",
        kind: "정의",
        pieces: [
          {
            kind: "target",
            target: { id: "t", text: "같거나 큰 수", tier: "text" },
          },
        ],
      },
    ],
  },
];
const sourceFor = () =>
  createLocalFadingSource({ concepts, today: "2026-10-20" });
const forbidden = /정독|소거|분량|배정|대조|기준안|초5|2-1| · 하|1\/2/;
function clean() {
  expect(document.body.textContent).not.toMatch(forbidden);
  for (const el of document.querySelectorAll("[aria-label], [title]")) {
    expect(
      `${el.getAttribute("aria-label")} ${el.getAttribute("title")}`,
    ).not.toMatch(forbidden);
  }
}
it.each([false, true])(
  "catalog student=%s preserves actions and selectively hides metadata",
  async (student) => {
    const onConcept = vi.fn();
    render(
      <FadingCatalogScreen
        student={student}
        catalog={await sourceFor().catalog()}
        busy={false}
        onGrade={vi.fn()}
        onConcept={onConcept}
      />,
    );
    if (student) clean();
    else
      expect(
        screen.getByRole("heading", {
          name: "2-1-1 · 이상과 이하 알아보기 · 하 · 1/2",
        }),
      ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /단원 보기/ })[0]!);
    if (student) clean();
    else expect(screen.getByText("정독")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /이상 · 개념 읽기$/ }));
    expect(onConcept).toHaveBeenCalledWith("overview-copy");
  },
);
it.each([false, true])(
  "home and erase student=%s retain concept navigation",
  async (student) => {
    const source = sourceFor();
    const state = await source.state();
    const onCatalog = vi.fn();
    render(
      <FadingHome
        student={student}
        state={state}
        source={source}
        busy={false}
        onCatalog={onCatalog}
        onOpen={vi.fn()}
        onMode={vi.fn()}
      />,
    );
    await screen.findByRole("heading", {
      name: student
        ? "이상과 이하 알아보기"
        : "2-1-1 · 이상과 이하 알아보기 · 하",
    });
    if (student) clean();
    fireEvent.click(screen.getByRole("button", { name: "첫 개념 시작" }));
    expect(onCatalog).toHaveBeenCalledOnce();
    cleanup();
    render(
      <FadingEraseScreen
        student={student}
        state={state}
        source={source}
        onCatalog={onCatalog}
        onOpen={vi.fn()}
      />,
    );
    await screen.findByRole("heading", {
      name: student
        ? "이상과 이하 알아보기"
        : "2-1-1 · 이상과 이하 알아보기 · 하 · 1/2",
    });
    if (student) clean();
    else
      expect(
        screen.getByRole("heading", { name: "개념 소거" }),
      ).toBeInTheDocument();
  },
);
it.each([false, true])(
  "daily home student=%s preserves quota controls and queue counts",
  async (student) => {
    const source = sourceFor();
    const state = await source.act({
      action: "pick",
      conceptId: concepts[0]!.id,
    });
    state.summary.mode = "all";
    const onMode = vi.fn();
    const onOpen = vi.fn();
    render(
      <FadingHome
        student={student}
        state={state}
        source={source}
        busy={false}
        onCatalog={vi.fn()}
        onOpen={onOpen}
        onMode={onMode}
      />,
    );
    if (student) clean();
    else expect(screen.getByText("복습 분량을 정해요")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "오늘의 복습" }),
    ).toHaveAttribute("aria-valuenow", String(state.summary.plan.done));
    fireEvent.click(screen.getByRole("button", { name: "나눠서" }));
    expect(onMode).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "오늘 전부" }));
    expect(onMode).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "복습하기" }));
    expect(onOpen).toHaveBeenCalledWith(concepts[0]!.id);
  },
);
it.each([false, true])(
  "completed home student=%s formats next review without changing counts",
  async (student) => {
    const source = sourceFor();
    const state = await source.state();
    state.summary.learned = 1;
    state.summary.nextReview = { dueOn: "2026-10-22", daysUntil: 2, count: 7 };
    render(
      <FadingHome
        student={student}
        state={state}
        source={source}
        busy={false}
        onCatalog={vi.fn()}
        onOpen={vi.fn()}
        onMode={vi.fn()}
      />,
    );
    expect(
      screen.getByText(student ? "모레 복습 7개" : "2일 뒤 7개"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(student ? "모레" : "2026-10-22"),
    ).toBeInTheDocument();
    if (student) clean();
  },
);
it.each([false, true])(
  "stats/history student=%s preserve counts and natural date presentation",
  async (student) => {
    const state = await sourceFor().state();
    state.days = [{ date: state.today, reviews: 3, passed: 1, fresh: 1 }];
    state.summary.sections = [
      {
        key: concepts[0]!.section,
        picked: 1,
        learned: 1,
        stepCounts: { 1: 1, 2: 0, 3: 0, 4: 0 },
      },
    ];
    render(
      <>
        <FadingStats student={student} state={state} onCatalog={vi.fn()} />
        <FadingHomeHistory student={student} state={state} />
      </>,
    );
    expect(screen.getByLabelText("다시가 아닌 평가 1개")).toBeInTheDocument();
    expect(screen.getByLabelText("평가로 닫은 풀이 3개")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("정답률");
    if (student) {
      clean();
      expect(screen.getAllByText("오늘").length).toBeGreaterThan(0);
      expect(document.body.textContent).not.toContain("10/20");
      expect(document.body.innerHTML).not.toContain("2026-10-");
    } else {
      expect(screen.getAllByText("10/20").length).toBeGreaterThan(0);
      expect(screen.getByText("정독")).toBeInTheDocument();
    }
  },
);
