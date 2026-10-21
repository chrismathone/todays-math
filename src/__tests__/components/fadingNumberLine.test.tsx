import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingConceptReader } from "@/components/fading/FadingConceptReader";
import { FadingSessionView } from "@/components/fading/FadingSessionView";
import { FadingComparisonSheet } from "@/components/fading/FadingComparisonSheet";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { buildFadingConcepts } from "@/lib/fading/concepts";
import { FADING_GROUPS } from "@/lib/fading/groups";
import { fadingFigureMap } from "@/lib/fading/figures";
import { createLocalFadingSource } from "@/lib/fading/local";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);
const concepts = buildFadingConcepts(
  CONCEPT_BLANK_BANK.concepts,
  FADING_GROUPS,
);
const figures = fadingFigureMap(concepts, CONCEPT_BLANK_BANK.figures);

async function readSentence(id: string) {
  const concept = concepts.find((c) =>
    c.propositions.some((p) => p.id === id),
  )!;
  const source = createLocalFadingSource({
    concepts: [concept],
    figures,
    today: "2026-10-21",
  });
  render(
    <FadingConceptReader
      detail={await source.concept(concept.id)}
      busy={false}
      canDrop={false}
      onBack={vi.fn()}
      onStart={vi.fn()}
      onPractice={vi.fn()}
      onDrop={vi.fn()}
    />,
  );
  for (let i = 0; i < concept.propositions.findIndex((p) => p.id === id); i++)
    fireEvent.keyDown(window, { key: "ArrowRight" });
  return screen.getByRole("img", { name: "이름표가 있는 개념 그림" });
}

describe("H-01: 실제 은행 문장과 수직선", () => {
  it("이하·왼쪽 문장에서는 닫힌 점에서 왼쪽으로 이어진다", async () => {
    const svg = await readSentence("e5-2-1-1-xc4");
    expect(svg.querySelector("circle")).toHaveAttribute("fill", "#1F1F23");
    expect(svg.querySelector('path[stroke="#A57F00"]')).toHaveAttribute(
      "d",
      "M20 61H80 M25 57L20 61L25 65",
    );
  });

  it("3 미만에는 2.9 같은 소수: 빈 점이 4가 아닌 3에 놓인다", async () => {
    const svg = await readSentence("e5-2-1-2-xc8");
    const three = [...svg.querySelectorAll("text")].find(
      (text) => text.textContent === "3",
    )!;
    expect(svg.querySelector("circle")).toHaveAttribute(
      "cx",
      three.getAttribute("x"),
    );
    expect(svg.querySelector("circle")).toHaveAttribute("fill", "white");
  });

  it.each(
    [true, false].flatMap((cards) =>
      [1, 2, 3, 4].map((step) => ({ cards, step })),
    ),
  )(
    "카드 모드 $cards · $step 단계에서 문장을 넘기면 그림도 바뀐다",
    async ({ cards, step }) => {
      const concept = concepts.find((c) => c.id === "e5-2-1-1-c1")!;
      const source = createLocalFadingSource({
        concepts: [concept],
        figures,
        today: "2026-10-21",
        cards,
      });
      await source.act({ action: "pick", conceptId: concept.id });
      let state = await source.act({ action: "open", conceptId: concept.id });
      const ref = { conceptId: concept.id, sessionId: state.session!.id };
      if (step > 1)
        state = await source.act({
          action: "read",
          ...ref,
          ...(cards ? { seen: "1111" } : {}),
        });
      for (const current of [2, 3] as const)
        if (current < step)
          state = await source.act({
            action: "step",
            ...ref,
            step: current,
            placements: [],
            gaveUp: true,
          });
      render(
        <FadingSessionView
          student
          source={source}
          state={state}
          onState={vi.fn()}
          onReconcile={vi.fn()}
          onExit={vi.fn()}
        />,
      );
      const range = () =>
        document.querySelector('svg[role="img"] path[stroke="#A57F00"]');
      // Start from the first sentence even when the first erased blank lies on a later one.
      for (
        let i = 0;
        i < concept.propositions.length &&
        screen.queryByRole("button", { name: "이전 문장" }) &&
        !(
          screen.getByRole("button", { name: "이전 문장" }) as HTMLButtonElement
        ).disabled;
        i++
      )
        fireEvent.click(screen.getByRole("button", { name: "이전 문장" }));
      expect(range()).toHaveAttribute("d", "M80 61H183 M178 57L183 61L178 65");
      if (cards && step === 1) {
        fireEvent.click(screen.getByRole("button", { name: "문장 보기" }));
        fireEvent.click(screen.getByRole("button", { name: /처음 봐요/ }));
      } else fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
      expect(range()).toHaveAttribute("d", "M20 61H80 M25 57L20 61L25 65");
    },
  );

  it("단계 완료 대조도 현재 문장의 그림을 쓴다", () => {
    const concept = concepts.find((c) => c.id === "e5-2-1-1-c1")!;
    render(
      <FadingComparisonSheet
        concept={concept}
        figure={figures[concept.id]!}
        result={{ step: 2, blanks: 1, missed: [] }}
        placements={[]}
        seed={42}
        traps={[]}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    expect(
      document.querySelector('svg[role="img"] path[stroke="#A57F00"]'),
    ).toHaveAttribute("d", "M20 61H80 M25 57L20 61L25 65");
  });

  it("4단계 직접 쓰기 완료 뒤 대조도 넘긴 문장의 그림을 쓴다", async () => {
    const concept = concepts.find((c) => c.id === "e5-2-1-1-c1")!;
    const source = createLocalFadingSource({
      concepts: [concept],
      figures,
      today: "2026-10-21",
      cards: true,
    });
    await source.act({ action: "pick", conceptId: concept.id });
    let state = await source.act({ action: "open", conceptId: concept.id });
    const ref = { conceptId: concept.id, sessionId: state.session!.id };
    await source.act({ action: "read", ...ref, seen: "1111" });
    for (const step of [2, 3, 4] as const)
      state = await source.act({
        action: "step",
        ...ref,
        step,
        placements: [],
        gaveUp: true,
      });
    render(
      <FadingSessionView
        student
        source={source}
        state={state}
        onState={vi.fn()}
        onReconcile={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "다음 문장 보기" }));
    expect(
      document.querySelector('svg[role="img"] path[stroke="#A57F00"]'),
    ).toHaveAttribute("d", "M20 61H80 M25 57L20 61L25 65");
  });
});
