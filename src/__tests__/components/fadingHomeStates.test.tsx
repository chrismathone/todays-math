import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { prepareFadingDev } from "@/components/fading/devFixtures";
import type { FadingConcept } from "@/lib/fading/concepts";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
const concepts: FadingConcept[] = Array.from({ length: 30 }, (_, i) => ({
  id: `home-fixture-${i}`,
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: i + 1,
  siblings: 30,
  propositions: Array.from({ length: 3 }, (_, j) => ({
    id: `p${i}-${j}`,
    term: `용어 ${j}`,
    kind: "정의",
    pieces: [
      { kind: "text", text: "뜻은 " },
      {
        kind: "target",
        target: { id: `p${i}-${j}#1`, text: `답 ${j}`, tier: "text" },
      },
    ],
  })),
}));
afterEach(cleanup);
describe("로컬 상태로 그리는 홈", () => {
  it("첫날에는 큰 카드의 복습 진행 칸을 두지 않고 첫 개념 시작을 살린다", async () => {
    const { source, state } = await prepareFadingDev(concepts, {
      scene: "first",
      conceptId: concepts[0]!.id,
      preview: false,
    });
    render(<FadingApp source={source} initialState={state} />);
    expect(
      screen.getByRole("heading", { name: "첫 개념부터 시작해요" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "오늘의 복습" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("완료 0개")).not.toBeInTheDocument();
    expect(screen.queryByText("오늘 목표 0개")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "첫 개념 시작" }));
    expect(
      await screen.findByRole("heading", { name: "개념 목록" }),
    ).toBeInTheDocument();
  });
  it("개념을 고르면 복습 진행 칸을 다시 그린다", async () => {
    const { source } = await prepareFadingDev(concepts, {
      scene: "first",
      conceptId: concepts[0]!.id,
      preview: false,
    });
    const state = await source.act({
      action: "pick",
      conceptId: concepts[0]!.id,
    });
    render(<FadingApp source={source} initialState={state} />);
    expect(
      screen.getByRole("progressbar", { name: "오늘의 복습" }),
    ).toBeInTheDocument();
    expect(screen.getByText("완료 0개")).toBeInTheDocument();
    expect(screen.getByText("오늘 목표 0개")).toBeInTheDocument();
  });
  it("처음 배운 것은 오늘 복습 분모에 넣지 않고 완료 상태를 낸다", async () => {
    const { source, state } = await prepareFadingDev(concepts, {
      scene: "done",
      conceptId: concepts[0]!.id,
      preview: false,
    });
    render(<FadingApp source={source} initialState={state} />);
    expect(
      screen.getByRole("heading", { name: "오늘 할 복습을 마쳤어요" }),
    ).toBeInTheDocument();
    expect(state.summary.plan).toEqual({ done: 0, total: 0 });
    expect(state.summary.todayCount.fresh).toBe(3);
  });
  it("밀림의 나눠서·오늘 전부는 실제 소스의 대기열을 바꾼다", async () => {
    const { source, state } = await prepareFadingDev(concepts, {
      scene: "backlog",
      conceptId: concepts[0]!.id,
      preview: false,
    });
    render(<FadingApp source={source} initialState={state} />);
    expect(state.summary.queue.held.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "나눠서" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "오늘 전부" }));
    expect(await screen.findByText("나중에 할 복습 0개")).toBeInTheDocument();
    expect((await source.state()).summary.queue.due).toHaveLength(27);
  });
  it("오래 쉼 안내는 속이 낸 longBreak와 idleDays다", async () => {
    const { source, state } = await prepareFadingDev(concepts, {
      scene: "return",
      conceptId: concepts[0]!.id,
      preview: false,
    });
    render(<FadingApp source={source} initialState={state} />);
    expect(state.summary.longBreak).toBe(true);
    expect(
      screen.getByText(
        `${state.summary.idleDays}일 쉬었어요. 오늘 할 만큼부터 다시 시작하세요.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "쉬었던 개념을 다시 만나요" }),
    ).toBeInTheDocument();
  });
});
