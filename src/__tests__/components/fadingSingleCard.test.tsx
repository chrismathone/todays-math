import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { FadingConceptReader } from "@/components/fading/FadingConceptReader";
import { FadingSentenceCaption } from "@/components/fading/FadingSentenceCaption";
import { fadingSafeTopic } from "@/components/fading/sentenceTopic";
import { createLocalFadingSource } from "@/lib/fading/local";
import type { FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets } from "@/lib/fading/erasure";
import { chipTray } from "@/lib/fading/chips";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);

const concept: FadingConcept = {
  id: "single-card-test",
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: 2,
  siblings: 3,
  propositions: ["수직이등분선", "외심", "반지름"].map((text, index) => ({
    id: `sentence-${index}`,
    term: `성질 ${index + 1}`,
    kind: "성질",
    pieces: [
      { kind: "text", text: `문장 ${index + 1}의 핵심어는 ` },
      {
        kind: "target",
        target: { id: `sentence-${index}#1`, text, tier: "text" },
      },
      { kind: "text", text: "이다." },
    ],
  })),
};

function local(sample = concept, trap = false) {
  return createLocalFadingSource({
    concepts: [sample],
    today: "2026-10-06",
    traps: trap ? { [sample.id]: [{ text: "중심각" }] } : undefined,
    fresh: () => ({
      sessionId: "11111111-1111-4111-8111-111111111111",
      seed: 42,
    }),
  });
}

async function startAt(
  step: 1 | 2 | 3 | 4 = 1,
  sample = concept,
  trap = false,
) {
  const source = local(sample, trap);
  await source.act({ action: "pick", conceptId: sample.id });
  let state = await source.act({ action: "open", conceptId: sample.id });
  const ref = { conceptId: sample.id, sessionId: state.session!.id };
  if (step > 1) state = await source.act({ action: "read", ...ref });
  for (const current of [2, 3] as const) {
    if (current >= step) break;
    state = await source.act({
      action: "step",
      ...ref,
      step: current,
      placements: [],
      gaveUp: true,
    });
  }
  return { source, state };
}

function visibleSentence() {
  return document.querySelector<HTMLElement>("[data-fading-sentence]")!;
}

describe("오늘의 기억 — 문장 한 장씩", () => {
  it("처음 읽기는 한 문장만 그리고 Space·Enter로 이동하며 추가 CTA를 유지한다", async () => {
    const source = local();
    const onStart = vi.fn();
    render(
      <FadingConceptReader
        detail={await source.concept(concept.id)}
        busy={false}
        canDrop={false}
        onBack={vi.fn()}
        onStart={onStart}
        onPractice={vi.fn()}
        onDrop={vi.fn()}
      />,
    );
    expect(document.querySelectorAll("[data-fading-sentence]")).toHaveLength(1);
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-0",
    );
    expect(screen.queryByText("성질 2")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "삼각형" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 문장" })).toBeDisabled();
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-1",
    );
    fireEvent.keyDown(window, { key: "Enter" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-2",
    );
    expect(screen.getByRole("button", { name: "다음 문장" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "이전 문장" }));
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-1",
    );
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "복습에 추가하고 시작" }),
    );
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("정독은 마지막 문장을 본 뒤에만 read를 보내고 다음 단계로 간다", async () => {
    const { source, state } = await startAt();
    const act = vi.spyOn(source, "act");
    render(<FadingApp source={source} initialState={state} initialSession />);
    expect(document.querySelectorAll("[data-fading-sentence]")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "읽었어요 · 다음 단계" }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-1",
    );
    expect(act).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-2",
    );
    expect(
      screen.getByRole("button", { name: "읽었어요 · 다음 단계" }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "이전 문장" }));
    expect(
      screen.queryByRole("button", { name: "읽었어요 · 다음 단계" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByRole("button", { name: "아직 모르겠어요" });
    expect(act).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ action: "read" }),
    );
    expect(document.querySelectorAll("[data-fading-sentence]")).toHaveLength(1);
  });

  it("선택 빈칸을 따라 문장이 바뀌어도 입력 노드와 포커스는 유지하고 답 목록은 감춘다", async () => {
    const { source, state } = await startAt(4, concept, true);
    const act = vi.spyOn(source, "act");
    render(<FadingApp source={source} initialState={state} initialSession />);
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    input.focus();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-1",
    );
    expect(screen.getByRole("textbox", { name: "빈칸 답 입력" })).toBe(input);
    expect(input).toHaveFocus();
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
    expect(
      document.querySelector("[data-fading-chip-text], [data-fading-chip]"),
    ).toBeNull();
    for (const chip of chipTray(concept, 4, {
      seed: 42,
      traps: state.opened!.traps,
    })) {
      expect(
        document.querySelector("[data-fading-session]")!.innerHTML,
      ).not.toContain(chip.text);
    }
    fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-2",
    );
    expect(
      within(visibleSentence()).getByRole("button", { name: "빈칸 3" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(act).not.toHaveBeenCalled();
  });

  it("전 문장의 넣기와 틀린 첫 시도를 보존하고 4단계 miss는 즉시 보낸다", async () => {
    const { source, state } = await startAt(4, concept, true);
    const act = vi.spyOn(source, "act");
    render(<FadingApp source={source} initialState={state} initialSession />);
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    const typeChip = (text: string) => {
      fireEvent.change(input, { target: { value: text } });
      fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
    };
    typeChip("중심각");
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "miss",
          placement: expect.objectContaining({ targetId: "sentence-0#1" }),
        }),
      ),
    );
    await waitFor(() => expect(input).toBeEnabled());
    for (const target of erasedTargets(concept, 4)) {
      expect(visibleSentence()).toHaveAttribute(
        "data-fading-sentence",
        target.id.split("#")[0],
      );
      typeChip(target.text);
    }
    const finish = screen.getByRole("button", { name: /단계 마치기/ });
    expect(finish).toBeEnabled();
    fireEvent.click(finish);
    await screen.findByRole("button", { name: "자가 평가하기" });
    const action = act.mock.calls
      .map(([value]) => value)
      .find((value) => value.action === "step");
    expect(action?.action).toBe("step");
    if (action?.action !== "step") throw new Error("step 제출 없음");
    expect(action.placements.map((placement) => placement.targetId)).toEqual([
      "sentence-0#1",
      "sentence-0#1",
      "sentence-1#1",
      "sentence-2#1",
    ]);
    expect((await source.state()).session?.missedAtFour).toEqual([
      "sentence-0#1",
    ]);
    expect(
      (await source.state()).session?.ratings.map((rating) => rating.rating),
    ).toEqual(["again"]);
  });

  it("전체 단계의 다른 문장 답도 용어와 실제 단원·갈래 단서에서 감춘다", async () => {
    const sample: FadingConcept = {
      ...concept,
      section: "중2::도형::외심",
      propositions: concept.propositions.map((proposition, index) =>
        index === 0 ? { ...proposition, term: "외 심의 성질" } : proposition,
      ),
    };
    const { source, state } = await startAt(4, sample);
    render(<FadingApp source={source} initialState={state} initialSession />);
    expect(
      visibleSentence().querySelector("[data-fading-concept-term]"),
    ).toBeNull();
    expect(within(visibleSentence()).getByText("도형")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "외심" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "도형", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("중2 · 하 · 2/3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await screen.findByRole("button", { name: "기준안 보기" });
    expect(screen.getByText("외 심의 성질")).toBeInTheDocument();
  });

  it("안전한 용어는 소거 중에도 현재 문장의 주제로 보인다", async () => {
    const { source, state } = await startAt(4);
    render(<FadingApp source={source} initialState={state} initialSession />);
    expect(within(visibleSentence()).getByText("성질 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    expect(within(visibleSentence()).getByText("성질 2")).toBeInTheDocument();
    expect(screen.queryByText("성질 1")).not.toBeInTheDocument();
  });

  it("갈래·학년까지 답이면 중립적인 문장 번호만 남긴다", () => {
    render(
      <FadingSentenceCaption
        proposition={concept.propositions[0]!}
        index={0}
        section="중2::도형::삼각형"
        erased={[
          { text: "성질" },
          { text: "삼각형" },
          { text: "도형" },
          { text: "중2" },
        ]}
      />,
    );
    expect(screen.getByText("개념 1")).toBeInTheDocument();
    expect(screen.queryByText("성질")).not.toBeInTheDocument();
    expect(screen.queryByText("삼각형")).not.toBeInTheDocument();
    expect(screen.queryByText("중2")).not.toBeInTheDocument();
  });

  it("완료한 문장을 보면서는 숨은 빈칸에 넣지 않고 Tab으로 입력할 문장에 돌아간다", async () => {
    const { source, state } = await startAt(4);
    const act = vi.spyOn(source, "act");
    render(<FadingApp source={source} initialState={state} initialSession />);
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    fireEvent.change(input, { target: { value: "수직이등분선" } });
    fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "이전 문장" }));
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-0",
    );
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: "외심" } });
    expect(screen.getByRole("button", { name: "넣기" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
    fireEvent.keyDown(window, { key: "1", code: "Digit1" });
    expect(input).toHaveValue("외심");
    expect(act).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Tab으로 빈칸이 있는 문장으로/),
    ).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-2",
    );
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-1",
    );
    fireEvent.change(input, { target: { value: "외심" } });
    fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      "sentence-2",
    );
    expect(screen.getByText("2 / 3 완료")).toBeInTheDocument();
  });

  it("현재 단계에 빈칸이 하나뿐이어도 안 비는 문장에서 Tab으로 그 빈칸을 보여 준다", async () => {
    const { source, state } = await startAt(2);
    render(<FadingApp source={source} initialState={state} initialSession />);
    const target = erasedTargets(concept, 2)[0]!;
    const targetIndex = concept.propositions.findIndex((proposition) =>
      proposition.pieces.some(
        (piece) => piece.kind === "target" && piece.target.id === target.id,
      ),
    );
    const pager = screen.getByRole("navigation", { name: "개념 문장 이동" });
    fireEvent.click(
      within(pager).getByRole("button", {
        name: targetIndex > 0 ? "이전 문장" : "다음 문장",
      }),
    );
    expect(visibleSentence()).not.toHaveAttribute(
      "data-fading-sentence",
      target.id.split("#")[0],
    );
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    expect(input).toBeEnabled();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(visibleSentence()).toHaveAttribute(
      "data-fading-sentence",
      target.id.split("#")[0],
    );
    expect(input).toHaveFocus();
  });

  it("마친 단계의 기준안도 한 문장씩 대조하고 전체 단계의 기록과 선택적 종료를 유지한다", async () => {
    const { source, state } = await startAt(4);
    const act = vi.spyOn(source, "act");
    render(<FadingApp source={source} initialState={state} initialSession />);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "자가 평가하기" }),
      ).toBeEnabled(),
    );
    act.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "기준안 보기" }));
    const dialog = screen.getByRole("dialog", { name: "삼각형 · 기준안" });
    expect(
      dialog.querySelectorAll("[data-fading-comparison-sentence]"),
    ).toHaveLength(1);
    expect(
      dialog.querySelector("[data-fading-comparison-sentence]"),
    ).toHaveAttribute("data-fading-comparison-sentence", "sentence-0");
    expect(within(dialog).getByText("0 / 3")).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: " ", code: "Space" });
    expect(
      dialog.querySelector("[data-fading-comparison-sentence]"),
    ).toHaveAttribute("data-fading-comparison-sentence", "sentence-1");
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(
      dialog.querySelector("[data-fading-comparison-sentence]"),
    ).toHaveAttribute("data-fading-comparison-sentence", "sentence-2");
    fireEvent.click(within(dialog).getByRole("button", { name: "이전 문장" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "대조 마치기 · 계속" }),
    );
    expect(
      await screen.findByRole("heading", { name: "어느 정도 떠올랐나요" }),
    ).toBeInTheDocument();
    expect(act).not.toHaveBeenCalled();
  });

  it("정규화는 공백·구두점·유니코드·수식 표기와 부분 겹침을 보수적으로 비교한다", () => {
    for (const [term, answer] of [
      ["외 심의 성질", "외심"],
      ["Ａ Ｂ", "$ab$"],
      ["$\\mathrm{AB}$", "A-B"],
      ["원의", "원의 접선"],
      ["π", "$\\pi$"],
    ]) {
      expect(fadingSafeTopic(term!, [{ text: answer! }])).toBeUndefined();
    }
    expect(fadingSafeTopic("삼각형의 성질", [{ text: "반지름" }])).toBe(
      "삼각형의 성질",
    );
    expect(fadingSafeTopic("외심", [])).toBe("외심");
  });
});
