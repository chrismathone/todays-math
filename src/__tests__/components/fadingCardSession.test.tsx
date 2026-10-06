import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { FadingApp } from "@/components/fading/FadingApp";
import { FadingCardSessionScreen } from "@/components/fading/FadingCardSessionScreen";
import { createLocalFadingSource } from "@/lib/fading/local";
import { fadingTargets, type FadingConcept } from "@/lib/fading/concepts";
import type { FadingState } from "@/contracts/fadingApi.contract";
import { erasedTargets } from "@/lib/fading/erasure";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());
afterEach(cleanup);

const concept: FadingConcept = {
  id: "card-session-test",
  section: "중2::도형::원",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: [
    {
      id: "p0",
      term: "중심의 정의",
      kind: "정의",
      pieces: [
        { kind: "text", text: "문장 A의 핵심은 " },
        { kind: "target", target: { id: "p0#1", text: "외심", tier: "text" } },
        { kind: "text", text: "과 " },
        {
          kind: "target",
          target: { id: "p0#2", text: "수직이등분선", tier: "text" },
        },
        { kind: "text", text: "입니다." },
      ],
    },
    {
      id: "p1",
      term: "거리의 성질",
      kind: "성질",
      pieces: [
        { kind: "text", text: "문장 B의 핵심은 " },
        {
          kind: "target",
          target: { id: "p1#1", text: "반지름", tier: "text" },
        },
        { kind: "text", text: "입니다." },
      ],
    },
    {
      id: "p2",
      term: "각의 값",
      kind: "성질",
      pieces: [
        { kind: "text", text: "문장 C의 핵심은 " },
        {
          kind: "target",
          target: { id: "p2#1", text: "$90^{\\circ}$", tier: "math" },
        },
        { kind: "text", text: "입니다." },
      ],
    },
  ],
};

function source(cards = true) {
  return createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-07",
    cards,
  });
}
async function learning(cards = true) {
  const local = source(cards);
  await local.act({ action: "pick", conceptId: concept.id });
  const state = await local.act({ action: "open", conceptId: concept.id });
  return { local, state };
}
async function atFour() {
  const { local, state: initial } = await learning();
  const ref = { conceptId: concept.id, sessionId: initial.session!.id };
  let state = await local.act({ action: "read", ...ref, seen: "123" });
  for (const step of [2, 3] as const)
    state = await local.act({
      action: "step",
      ...ref,
      step,
      placements: [],
      gaveUp: true,
    });
  return { local, state, ref };
}
async function cold() {
  const { local, ref } = await atFour();
  await local.act({
    action: "step",
    ...ref,
    step: 4,
    placements: fadingTargets(concept).map((target) => ({
      targetId: target.id,
      text: target.text,
    })),
  });
  const rated = await local.act({
    action: "rate",
    ...ref,
    rating: "good",
    requestId: "22222222-2222-4222-8222-222222222222",
  });
  local.setToday(rated.receipt!.dueOn);
  const state = await local.act({ action: "open", conceptId: concept.id });
  return { local, state };
}
function app(local: ReturnType<typeof source>, state: FadingState) {
  return render(
    <FadingApp source={local} initialState={state} initialSession />,
  );
}
function answer(text: string) {
  const input = screen.getByRole("textbox", { name: /핵심 답 입력/ });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest("form")!);
}
function confidence() {
  fireEvent.click(screen.getByRole("button", { name: "모르겠어요" }));
}
function finishComparison() {
  for (let index = 0; index < concept.propositions.length; index += 1) {
    const next =
      screen.queryByRole("button", { name: "다음 문장 대조" }) ??
      screen.getByRole("button", { name: "대조 마치기" });
    expect(next).toBeEnabled();
    fireEvent.click(next);
  }
}

describe("새 카드 풀이 — 직접 쓰기와 묶음 대조", () => {
  it("빈칸 없는 카드에서도 입력 초점의 Tab이 다른 카드의 남은 빈칸으로 돌아온다", async () => {
    const { local, state: opened } = await learning();
    const state = await local.act({
      action: "read",
      conceptId: concept.id,
      sessionId: opened.session!.id,
      seen: "123",
    });
    app(local, state);
    fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    const input = screen.getByRole("textbox", { name: /칩 글 입력/ });
    expect(input).toBeEnabled();
    input.focus();
    fireEvent.change(input, { target: { value: "숨은 카드에 넣지 않음" } });
    fireEvent.submit(input.closest("form")!);
    expect(local.snapshot().concepts[concept.id]!.step).toBe(2);
    fireEvent.keyDown(input, { key: "Tab" });
    expect(document.querySelector("[data-fading-sentence]")).toHaveAttribute(
      "data-fading-sentence",
      "p0",
    );
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("대조는 한 카드씩 보이며 1/2를 명시적으로 고른 뒤 Space·Enter로 넘기고 마지막에만 평가한다", async () => {
    const { local, state } = await atFour();
    const send = vi.spyOn(local, "act");
    app(local, state);
    answer("표현 하나");
    answer("표현 둘");
    answer("표현 셋");
    answer("표현 넷");
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "내 답과 기준안 대조" }),
      ).toBeInTheDocument(),
    );
    expect(
      document.querySelectorAll("[data-fading-comparison-sentence]"),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: /다시/ }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(
      document.querySelector("[data-fading-comparison-sentence]"),
    ).toHaveAttribute("data-fading-comparison-sentence", "p0");
    fireEvent.keyDown(window, { key: "1", code: "Digit1" });
    fireEvent.keyDown(window, { key: "2", code: "Digit2" });
    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(
      document.querySelector("[data-fading-comparison-sentence]"),
    ).toHaveAttribute("data-fading-comparison-sentence", "p1");
    fireEvent.keyDown(window, { key: "1", code: "Digit1" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(
      document.querySelector("[data-fading-comparison-sentence]"),
    ).toHaveAttribute("data-fading-comparison-sentence", "p2");
    fireEvent.keyDown(window, { key: "1", code: "Digit1" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("button", { name: /다시/ })).toBeEnabled();
    expect(
      send.mock.calls.filter(([action]) => action.action === "rate"),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /다시/ }));
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rate",
          rating: "again",
          judged: {
            "p0#1": "same",
            "p0#2": "different",
            "p1#1": "same",
            "p2#1": "same",
          },
        }),
      ),
    );
  });

  it("3단계 칩 글 입력은 한 문장씩 이어지며 사용한 칩도 같은 묶음 판에 남는다", async () => {
    const { local, state: opened } = await learning();
    const ref = { conceptId: concept.id, sessionId: opened.session!.id };
    await local.act({ action: "read", ...ref, seen: "123" });
    const state = await local.act({
      action: "step",
      ...ref,
      step: 2,
      placements: [],
      gaveUp: true,
    });
    app(local, state);
    const trayText = () =>
      Array.from(document.querySelectorAll("[data-fading-chip]")).map(
        (node) => node.textContent,
      );
    const initialTray = trayText();
    for (const target of erasedTargets(concept, 3)) {
      expect(document.querySelectorAll("[data-fading-sentence]")).toHaveLength(
        1,
      );
      const input = screen.getByRole("textbox", { name: /칩 글 입력/ });
      fireEvent.change(input, { target: { value: target.text } });
      fireEvent.submit(input.closest("form")!);
      expect(trayText()).toEqual(initialTray);
    }
    const finish = screen.getByRole("button", { name: "단계 마치기" });
    expect(finish).toHaveFocus();
    fireEvent.click(finish);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "3단계를 마쳤어요" }),
      ).toBeInTheDocument(),
    );
  });

  it("새 풀이 모드가 cards여도 열린 옛 풀이는 기존 칩 화면으로 이어 간다", async () => {
    const { local, state } = await learning(false);
    app(local, { ...state, mode: "cards" });
    expect(
      document.querySelector('[data-fading-mode="cards"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "문장 보기" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("외심")).toBeInTheDocument();
  });

  it("마지막 입력 뒤 step 응답이 오기 전에는 기준안을 DOM에 넣지 않는다", async () => {
    const { local, state } = await atFour();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const invoke = local.act;
    vi.spyOn(local, "act").mockImplementation(async (action) => {
      if (action.action === "step" && action.step === 4) await gate;
      return invoke(action);
    });
    app(local, state);
    answer("표현 하나");
    answer("표현 둘");
    answer("표현 셋");
    answer("표현 넷");
    expect(
      screen.queryByRole("region", { name: "내 답과 기준안 대조" }),
    ).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("외심");
    expect(document.querySelector("[data-fading-sentence]")).toHaveAttribute(
      "data-fading-sentence",
      "p2",
    );
    release();
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "내 답과 기준안 대조" }),
      ).toBeInTheDocument(),
    );
  });

  it("입력란의 Enter는 현재 빈칸을 내고 다음 빈칸과 다음 카드로 이어진다", async () => {
    const { local, state } = await atFour();
    app(local, state);
    const user = userEvent.setup();
    const input = screen.getByRole("textbox", { name: /핵심 답 입력/ });
    await user.type(input, "외심{Enter}");
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(input).toHaveFocus();
    await user.type(input, "수직이등분선{Enter}");
    expect(document.querySelector("[data-fading-sentence]")).toHaveAttribute(
      "data-fading-sentence",
      "p1",
    );
    expect(input).toHaveFocus();
  });

  it("새 학습은 앞뒤 카드의 사전 확인을 모두 받은 뒤 read를 한 번 보낸다", async () => {
    const { local, state } = await learning();
    const send = vi.spyOn(local, "act");
    app(local, state);
    expect(
      document.querySelector('[data-card-side="front"]'),
    ).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("외심");
    for (const [index, key] of ["1", "2", "3"].entries()) {
      fireEvent.keyDown(window, { key: " ", code: "Space" });
      expect(
        document.querySelector('[data-card-side="back"]'),
      ).toBeInTheDocument();
      fireEvent.keyDown(window, { key, code: `Digit${key}` });
      if (index < 2) expect(send).not.toHaveBeenCalled();
    }
    await waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(send).toHaveBeenCalledWith({
      action: "read",
      conceptId: concept.id,
      sessionId: state.session!.id,
      seen: "123",
    });
    expect(local.snapshot().concepts[concept.id]!.reviews).toBe(0);
    expect(local.snapshot().concepts[concept.id]!.dueOn).toBeNull();
  });

  it("복습은 차가운 4단계에서 확신을 먼저 받고 모름도 입력을 연다", async () => {
    const { local, state } = await cold();
    const send = vi.spyOn(local, "act");
    app(local, state);
    expect(
      document.querySelector('[data-fading-mode="cards"]'),
    ).toHaveAttribute("data-step", "4");
    expect(
      screen.queryByRole("button", { name: "문장 보기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-fading-chip]")).toHaveLength(0);
    expect(document.body.innerHTML).not.toContain("외심");
    confidence();
    expect(screen.getByRole("textbox", { name: /핵심 답 입력/ })).toHaveFocus();
    expect(send).not.toHaveBeenCalled();
    expect(local.snapshot().concepts[concept.id]!.reviews).toBe(1);
  });

  it("모르는 글은 끝까지 답을 열지 않고 step 저장 뒤 전체 묶음의 자기 대조를 받으며 새로고침 후에도 이어진다", async () => {
    const { local, state } = await cold();
    const send = vi.spyOn(local, "act");
    const view = app(local, state);
    confidence();
    answer("가운데에 놓이는 점");
    expect(
      screen.queryByRole("region", { name: "내 답과 기준안 대조" }),
    ).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("외심");
    expect(send).not.toHaveBeenCalled();
    answer("수직이등분선");
    confidence();
    answer("반지름");
    confidence();
    answer("90deg");
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "내 답과 기준안 대조" }),
      ).toBeInTheDocument(),
    );
    expect(
      document.querySelectorAll("[data-fading-comparison-sentence]"),
    ).toHaveLength(1);
    expect(
      send.mock.calls.filter(([action]) => action.action === "miss"),
    ).toHaveLength(0);
    const steps = send.mock.calls.filter(
      ([action]) => action.action === "step",
    );
    expect(steps).toHaveLength(1);
    expect(steps[0]![0]).toMatchObject({
      step: 4,
      sure: "111",
      placements: [
        { targetId: "p0#1", text: "가운데에 놓이는 점" },
        { targetId: "p0#2", text: "수직이등분선" },
        { targetId: "p1#1", text: "반지름" },
        { targetId: "p2#1", text: "90deg" },
      ],
    });
    expect(local.snapshot().concepts[concept.id]!.reviews).toBe(1);
    const resumed = await local.state();
    expect(resumed.session?.unjudged).toEqual([
      { targetId: "p0#1", text: "가운데에 놓이는 점" },
    ]);
    view.unmount();
    app(local, resumed);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("가운데에 놓이는 점")).toBeInTheDocument();
    expect(screen.getAllByText("[입력 원문 없음]").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /알맞음/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "같은 뜻" }));
    finishComparison();
    const good = screen.getByRole("button", { name: /알맞음/ });
    fireEvent.click(good);
    fireEvent.click(good);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "풀이를 마쳤어요" }),
      ).toBeInTheDocument(),
    );
    expect(
      send.mock.calls.filter(([action]) => action.action === "rate"),
    ).toHaveLength(1);
    expect(local.snapshot().concepts[concept.id]!.reviews).toBe(2);
  });

  it("한 카드의 포기는 다음 카드를 보여 주고 끝에 다시만 허용한다", async () => {
    const { local, state } = await atFour();
    const send = vi.spyOn(local, "act");
    app(local, state);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(document.querySelector("[data-fading-sentence]")).toHaveAttribute(
      "data-fading-sentence",
      "p1",
    );
    expect(
      screen.queryByRole("region", { name: "내 답과 기준안 대조" }),
    ).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain("외심");
    answer("반지름");
    answer("90deg");
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "내 답과 기준안 대조" }),
      ).toBeInTheDocument(),
    );
    finishComparison();
    expect(
      screen.queryByRole("button", { name: /알맞음/ }),
    ).not.toBeInTheDocument();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ action: "step", step: 4, gaveUp: true }),
    );
  });

  it("Space는 공백이며 Enter 조합/229를 무시하고 Tab은 빈칸으로, Escape 뒤 Tab은 밖으로 간다", async () => {
    const { local, state } = await atFour();
    app(local, state);
    const input = screen.getByRole("textbox", { name: /핵심 답 입력/ });
    input.focus();
    fireEvent.change(input, { target: { value: "내 답 123" } });
    expect(fireEvent.keyDown(input, { key: " ", code: "Space" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Enter", isComposing: true })).toBe(
      false,
    );
    expect(fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })).toBe(
      false,
    );
    expect(input).toHaveValue("내 답 123");
    fireEvent.keyDown(input, { key: "Tab" });
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Tab" });
    expect(document.querySelector("[data-fading-sentence]")).toHaveAttribute(
      "data-fading-sentence",
      "p1",
    );
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(input).toHaveValue("내 답 123");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(fireEvent.keyDown(input, { key: "Tab" })).toBe(true);
    expect(
      screen.queryByRole("region", { name: "내 답과 기준안 대조" }),
    ).not.toBeInTheDocument();
  });

  it("명백히 다른 답은 즉시 miss하고 이후 모든 시도를 순서대로 step에 싣는다", async () => {
    const { local, state } = await atFour();
    const send = vi.spyOn(local, "act");
    app(local, state);
    answer("반지름");
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "miss",
          placement: { targetId: "p0#1", text: "반지름" },
        }),
      ),
    );
    await waitFor(() => expect(screen.getByRole("textbox")).toBeEnabled());
    answer("외심");
    answer("수직이등분선");
    answer("반지름");
    answer("90deg");
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "내 답과 기준안 대조" }),
      ).toBeInTheDocument(),
    );
    finishComparison();
    const placed = send.mock.calls.find(
      ([action]) => action.action === "step",
    )![0];
    expect(placed).toMatchObject({
      placements: [
        { targetId: "p0#1", text: "반지름" },
        { targetId: "p0#1", text: "외심" },
        { targetId: "p0#2", text: "수직이등분선" },
        { targetId: "p1#1", text: "반지름" },
        { targetId: "p2#1", text: "90deg" },
      ],
    });
    expect(
      screen.queryByRole("button", { name: /쉬움/ }),
    ).not.toBeInTheDocument();
  });

  it("자기 대조의 다름은 다시만 보여 준다", async () => {
    const { local, state } = await atFour();
    app(local, state);
    answer("내 다른 표현");
    answer("수직이등분선");
    answer("반지름");
    answer("90deg");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다름" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "다름" }));
    finishComparison();
    expect(
      screen.queryByRole("button", { name: /쉬움/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다시/ }));
    await waitFor(() =>
      expect(local.snapshot().receipts[0]?.rating).toBe("again"),
    );
  });

  it("연습은 카드 모드를 따라도 API 요청과 기록 변경이 없다", async () => {
    const { local } = await cold();
    const detail = await local.concept(concept.id);
    const state = await local.state();
    const snapshot = local.snapshot();
    const send = vi.spyOn(local, "act");
    const network = vi.spyOn(globalThis, "fetch");
    render(
      <FadingCardSessionScreen
        source={local}
        state={state}
        practice={detail}
        onState={vi.fn()}
        onReconcile={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    confidence();
    answer("외심");
    answer("수직이등분선");
    confidence();
    answer("반지름");
    confidence();
    answer("90deg");
    expect(
      screen.getByRole("region", { name: "내 답과 기준안 대조" }),
    ).toBeInTheDocument();
    finishComparison();
    fireEvent.click(screen.getByRole("button", { name: "연습 마치기" }));
    expect(send).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
    expect(local.snapshot()).toEqual(snapshot);
    network.mockRestore();
  });
});
