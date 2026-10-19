import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FadingCardSessionScreen } from "@/components/fading/FadingCardSessionScreen";
import { FadingSessionScreen } from "@/components/fading/FadingSessionScreen";
import { FadingFigureView } from "@/components/fading/FadingFigureView";
import { FadingTypedComparison } from "@/components/fading/FadingCardViews";
import { createLocalFadingSource } from "@/lib/fading/local";
import type { FadingConcept } from "@/lib/fading/concepts";
vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);
const concept: FadingConcept = {
  id: "words",
  section: "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
  level: "하",
  ordinal: 1,
  siblings: 2,
  propositions: [
    {
      id: "p",
      term: "용어",
      kind: "정의",
      pieces: [
        { kind: "text", text: "뜻은 " },
        { kind: "target", target: { id: "t", text: "정답", tier: "text" } },
      ],
    },
  ],
};
for (const [name, Screen, cards] of [
  ["cards", FadingCardSessionScreen, true],
  ["legacy", FadingSessionScreen, false],
] as const) {
  it(`${name}: student location contains names only; default keeps old labels`, async () => {
    const source = createLocalFadingSource({
      concepts: [concept],
      today: "2026-10-20",
      cards,
    });
    await source.act({ action: "pick", conceptId: concept.id });
    const state = await source.act({ action: "open", conceptId: concept.id });
    const props = {
      source,
      state,
      onState: vi.fn(),
      onReconcile: vi.fn(),
      onExit: vi.fn(),
    };
    const view = render(<Screen {...props} student />);
    expect(
      view.container.querySelector('[class*="singleCardIdentity"]')
        ?.textContent,
    ).toContain("수의 범위와 어림하기");
    expect(
      view.container.querySelector('[class*="singleCardIdentity"]')
        ?.textContent,
    ).not.toMatch(/초5|2-1|· 하 ·|1\/2/);
    expect(screen.queryByText(/소거율/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "풀이 나가기" }));
    expect(screen.getByRole("dialog").textContent).not.toMatch(/소거|보존/);
    view.unmount();
    render(<Screen {...props} />);
    expect(screen.getByText(/소거율/)).toBeInTheDocument();
  });
  it(`${name}: unsafe unit names are omitted without identifier fallback`, async () => {
    const unsafe = { ...concept, section: "초5::2-1 정답::2-1-1 정답" };
    const source = createLocalFadingSource({
      concepts: [unsafe],
      today: "2026-10-20",
      cards,
    });
    await source.act({ action: "pick", conceptId: concept.id });
    let state = await source.act({ action: "open", conceptId: concept.id });
    state = await source.act({
      action: "read",
      conceptId: concept.id,
      sessionId: state.session!.id,
      ...(cards ? { seen: "1" } : {}),
    });
    const view = render(
      <Screen
        source={source}
        state={state}
        student
        onState={vi.fn()}
        onReconcile={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(
      view.container.querySelector('[class*="singleCardIdentity"]')
        ?.textContent,
    ).not.toMatch(/정답|2-1|초5/);
  });
}
it("figure hides reading/comparison chip only for students", () => {
  const figure = {
    id: "student-figure",
    viewBox: "0 0 10 10",
    svg: "",
    tags: [],
  };
  const view = render(<FadingFigureView figure={figure} answers student />);
  expect(screen.queryByText("정독 · 대조")).not.toBeInTheDocument();
  view.rerender(<FadingFigureView figure={figure} answers />);
  expect(screen.getByText("정독 · 대조")).toBeInTheDocument();
});
it("typed comparison keeps the same judgment actions with child wording", () => {
  const onJudge = vi.fn();
  const props = {
    concept,
    answers: { t: "내 말" },
    unjudged: [{ targetId: "t", text: "내 말" }],
    judgments: {},
    disabled: false,
    onJudge,
  };
  const view = render(<FadingTypedComparison {...props} student />);
  expect(view.container.textContent).not.toMatch(/기준안|대조/);
  fireEvent.click(screen.getByRole("button", { name: "같은 뜻" }));
  expect(onJudge).toHaveBeenCalledWith("t", "same");
  view.rerender(<FadingTypedComparison {...props} />);
  expect(
    screen.getByRole("region", { name: "내 답과 기준안 대조" }),
  ).toBeInTheDocument();
});
import { useState } from "react";
import type { FadingState } from "@/contracts/fadingApi.contract";
import type { FadingSource } from "@/lib/fading/source";
import { FadingConceptReader } from "@/components/fading/FadingConceptReader";
import { FadingComparisonSheet } from "@/components/fading/FadingComparisonSheet";

for (const [name, Screen, cards] of [
  ["cards", FadingCardSessionScreen, true],
  ["legacy", FadingSessionScreen, false],
] as const) {
  for (const student of [true, false]) {
    it(`${name}: rating and receipt keep actions and dates with student=${student}`, async () => {
      const source = createLocalFadingSource({
        concepts: [concept],
        today: "2026-10-20",
        cards,
      });
      await source.act({ action: "pick", conceptId: concept.id });
      let state = await source.act({ action: "open", conceptId: concept.id });
      const ref = { conceptId: concept.id, sessionId: state.session!.id };
      state = await source.act({
        action: "read",
        ...ref,
        ...(cards ? { seen: "1" } : {}),
      });
      for (const step of [2, 3, 4] as const)
        state = await source.act({
          action: "step",
          ...ref,
          step,
          placements: [],
          gaveUp: true,
        });
      const act = vi.spyOn(source, "act");
      function Harness({
        source,
        initial,
      }: {
        source: FadingSource;
        initial: FadingState;
      }) {
        const [current, setCurrent] = useState(initial);
        return (
          <Screen
            student={student}
            source={source}
            state={current}
            onState={(next) =>
              setCurrent((previous) => ({
                ...next,
                opened: next.opened ?? previous.opened,
                session: next.session ?? previous.session,
              }))
            }
            onReconcile={vi.fn()}
            onExit={vi.fn()}
          />
        );
      }
      const view = render(<Harness source={source} initial={state} />);
      if (student)
        expect(view.container.textContent).not.toMatch(
          /소거|대조|기준안|정독|평가/,
        );
      if (cards)
        fireEvent.click(
          screen.getByRole("button", {
            name: student ? "살펴보기 마치기" : "대조 마치기",
          }),
        );
      fireEvent.click(
        screen.getByRole("button", { name: cards ? /다시/ : /^다시 ·/ }),
      );
      await screen.findByRole("heading", { name: "풀이를 마쳤어요" });
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({ action: "rate", rating: "again" }),
      );
      const receipt = (await act.mock.results[0]!.value).receipt!;
      expect(view.container.textContent).toContain(
        student ? "내일" : receipt.dueOn,
      );
      if (student)
        expect(view.container.textContent).not.toMatch(
          /소거|대조|기준안|정독|평가|2026-/,
        );
    });
  }
}
it("reader and comparison use student names, copy and unchanged controls", async () => {
  const source = createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-20",
    cards: true,
  });
  const detail = await source.concept(concept.id);
  const onStart = vi.fn();
  const onNext = vi.fn();
  const readerProps = {
    detail,
    busy: false,
    canDrop: false,
    onBack: vi.fn(),
    onStart,
    onPractice: vi.fn(),
    onDrop: vi.fn(),
  };
  const view = render(<FadingConceptReader {...readerProps} student />);
  expect(view.container.textContent).not.toMatch(
    /초5|2-1|정독|소거|대조|기준안/,
  );
  fireEvent.click(screen.getByRole("button", { name: "복습에 추가하고 시작" }));
  expect(onStart).toHaveBeenCalledOnce();
  view.rerender(<FadingConceptReader {...readerProps} />);
  expect(screen.getByText(/STEP 01 · 정독/)).toBeInTheDocument();
  view.unmount();
  const props = {
    concept,
    result: { step: 2 as const, blanks: 1, missed: [] },
    placements: [],
    seed: 42,
    traps: [],
    figure: null,
    onClose: vi.fn(),
    onNext,
  };
  const sheet = render(<FadingComparisonSheet {...props} student />);
  expect(sheet.container.textContent).not.toMatch(
    /초5|2-1|대조|기준안|검토|일치/,
  );
  fireEvent.click(screen.getByRole("button", { name: "살펴보기 마치고 계속" }));
  expect(onNext).toHaveBeenCalledOnce();
  sheet.rerender(<FadingComparisonSheet {...props} />);
  expect(
    screen.getByRole("button", { name: "기준안 접기" }),
  ).toBeInTheDocument();
});
for (const step of [2, 3] as const) {
  for (const [name, Screen, cards] of [
    ["cards", FadingCardSessionScreen, true],
    ["legacy", FadingSessionScreen, false],
  ] as const) {
    it(`${name}: student step ${step} opens child comparison and advances`, async () => {
      const source = createLocalFadingSource({
        concepts: [concept],
        today: "2026-10-20",
        cards,
      });
      await source.act({ action: "pick", conceptId: concept.id });
      let state = await source.act({ action: "open", conceptId: concept.id });
      const ref = { conceptId: concept.id, sessionId: state.session!.id };
      state = await source.act({
        action: "read",
        ...ref,
        ...(cards ? { seen: "1" } : {}),
      });
      if (step === 3)
        state = await source.act({
          action: "step",
          ...ref,
          step: 2,
          placements: [],
          gaveUp: true,
        });
      const view = render(
        <Screen
          student
          source={source}
          state={state}
          onState={vi.fn()}
          onReconcile={vi.fn()}
          onExit={vi.fn()}
        />,
      );
      expect(view.container.textContent).not.toMatch(/소거|대조|기준안|정독/);
      fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
      await screen.findByRole("heading", { name: `${step}단계를 마쳤어요` });
      fireEvent.click(screen.getByRole("button", { name: "답 보기" }));
      expect(screen.getByRole("dialog").textContent).not.toMatch(
        /소거|대조|기준안|정독|2-1/,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "살펴보기 마치고 계속" }),
      );
      expect(view.container.querySelector("[data-step]")).toHaveAttribute(
        "data-step",
        String(step + 1),
      );
    });
  }
}
