import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { createLocalFadingSource } from "@/lib/fading/local";
import { chipTray } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FadingConcept } from "@/lib/fading/concepts";
import { FadingFigureView } from "@/components/fading/FadingFigureView";
import { FadingSourceError } from "@/lib/fading/source";
import fillStyles from "@/components/fading/FadingFillCard.module.css";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <>{text}</>,
}));
vi.stubGlobal("scrollTo", vi.fn());

const concept: FadingConcept = {
  id: "fading-test-a",
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: ["수직이등분선", "외심", "반지름"].map((text, i) => ({
    id: `p${i}`,
    term: `성질 ${i + 1}`,
    kind: "정의",
    pieces: [
      { kind: "text", text: `문장 ${i + 1}의 ` },
      { kind: "target", target: { id: `p${i}#1`, text, tier: "text" } },
      { kind: "text", text: "이다." },
    ],
  })),
};

function local(sample: FadingConcept = concept) {
  return createLocalFadingSource({
    concepts: [sample],
    today: "2026-10-06",
    fresh: () => ({
      sessionId: "11111111-1111-4111-8111-111111111111",
      seed: 42,
    }),
  });
}
async function startAt(
  step: 1 | 2 | 3 | 4 = 2,
  sample: FadingConcept = concept,
) {
  const source = local(sample);
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
async function resume(source: ReturnType<typeof local>) {
  render(<FadingApp source={source} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "풀이 이어 하기" }),
  );
  const giveUp = await screen.findByRole("button", { name: "아직 모르겠어요" });
  await waitFor(() => expect(giveUp).toBeEnabled());
}
function showSlot(targetIndex: number) {
  const name = new RegExp(`^빈칸 ${targetIndex}(?:$| ·)`);
  const current = () =>
    screen.queryByRole("button", { name }) ??
    screen.queryByRole("group", { name });
  if (current()) return current()!;
  const previous = screen.getByRole("button", { name: "이전 문장" });
  while (!previous.hasAttribute("disabled")) fireEvent.click(previous);
  const next = screen.getByRole("button", { name: "다음 문장" });
  while (!current() && !next.hasAttribute("disabled")) fireEvent.click(next);
  const slot = current();
  if (!slot)
    throw new Error(`빈칸 ${targetIndex}를 포함한 카드를 찾지 못했습니다.`);
  return slot;
}
function place(targetIndex: number, text: string) {
  const blank = showSlot(targetIndex);
  if (blank.getAttribute("aria-pressed") !== "true") fireEvent.click(blank);
  const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
}
function blurDisabledControl() {
  // jsdom keeps disabled controls focused; removing a focused temporary control models Chrome's body focus.
  const temporary = document.createElement("button");
  document.body.append(temporary);
  temporary.focus();
  temporary.remove();
}
afterEach(cleanup);
describe("오늘의 기억 화면 — 로컬 규칙", () => {
  it("풀이와 기준안에서 소단원 번호와 제목의 1cm를 구분하며 원본 이름은 보존한다", async () => {
    const sample = {
      ...concept,
      section: "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
    };
    const { source, state } = await startAt(3, sample);
    await resume(source);
    expect(
      screen.getByRole("heading", {
        name: "1-5-1 · 1cm보다 작은 단위",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("초3 · 1-5 · 길이와 시간 · 하 · 1/1"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    fireEvent.click(await screen.findByRole("button", { name: "기준안 보기" }));
    expect(
      screen.getByRole("heading", {
        name: "1-5-1 · 1cm보다 작은 단위 · 기준안",
      }),
    ).toBeInTheDocument();
    expect(state.opened!.concept.section).toBe(sample.section);
    expect((await source.state()).opened!.concept.section).toBe(sample.section);
  });
  it("정독에는 빈칸 수와 안 비는 문장 딱지를 두지 않고 장식 체크를 둔다", async () => {
    const { source, state } = await startAt(1);
    const { container } = render(
      <FadingApp source={source} initialState={state} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "풀이 이어 하기" }));
    const nextSentence = await screen.findByRole("button", {
      name: "다음 문장",
    });
    expect(screen.queryByText("0 / 0 완료")).not.toBeInTheDocument();
    expect(screen.queryByText("빈칸 0개 남음")).not.toBeInTheDocument();
    expect(
      screen.queryByText("이 단계에서는 안 비는 문장"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('h2 > svg[aria-hidden="true"]'),
    ).toHaveLength(1);
    expect(screen.getByText(/STEP 01 · 정독/)).toBeInTheDocument();
    for (let index = 0; index < concept.propositions.length - 1; index++) {
      expect(nextSentence).toBeEnabled();
      fireEvent.keyDown(window, { key: "Enter" });
    }
    expect(nextSentence).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "읽었어요 · 다음 단계" }),
    ).toBeEnabled();
    fireEvent.keyDown(window, { key: "Enter", code: "NumpadEnter" });
    await screen.findByRole("button", { name: "아직 모르겠어요" });
    expect(screen.getByText(/STEP 02 · 핵심어 소거/)).toBeInTheDocument();
  });
  it.each([2, 3] as const)(
    "%i단계에는 안 비는 문장 딱지와 빈칸 진행을 유지한다",
    async (step) => {
      const { source } = await startAt(step);
      await resume(source);
      const previous = screen.getByRole("button", { name: "이전 문장" });
      while (!previous.hasAttribute("disabled")) fireEvent.click(previous);
      let unblanked = 0;
      const next = screen.getByRole("button", { name: "다음 문장" });
      do {
        expect(
          document.querySelectorAll("[data-fading-sentence]"),
        ).toHaveLength(1);
        if (screen.queryByText("이 단계에서는 안 비는 문장")) unblanked++;
        if (next.hasAttribute("disabled")) break;
        fireEvent.click(next);
      } while (true);
      expect(unblanked).toBe(3 - erasedTargets(concept, step).length);
      expect(
        screen.getByText(`빈칸 ${erasedTargets(concept, step).length}개 남음`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`0 / ${erasedTargets(concept, step).length} 완료`),
      ).toBeInTheDocument();
    },
  );
  it("답을 타이핑하고 Enter로 넣은 뒤 주 단추로 2단계를 마친다", async () => {
    const user = userEvent.setup();
    const { source, state } = await startAt(2);
    const actionSpy = vi.spyOn(source, "act");
    await resume(source);
    actionSpy.mockClear();
    const tray = chipTray(concept, 2, { seed: state.session!.seed });
    const target = erasedTargets(concept, 2)[0]!;
    const chip = tray.find((item) => item.text === target.text)!;
    await user.type(
      screen.getByRole("textbox", { name: "빈칸 답 입력" }),
      target.text,
    );
    await user.keyboard("{Enter}");
    const finish = screen.getByRole("button", { name: /단계 마치기/ });
    expect(finish).toBeEnabled();
    expect(finish).toHaveFocus();
    expect(actionSpy).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "2단계를 마쳤어요" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다음 단계" })).toBeEnabled(),
    );
    expect(actionSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        action: "step",
        step: 2,
        placements: [{ targetId: target.id, chipId: chip.id }],
      }),
    );
    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByText(/STEP 03 · 수식·조건 소거/);
    expect(screen.getAllByRole("button", { name: /^빈칸 / })).toHaveLength(1);
    expect(screen.getByText("빈칸 2개 남음")).toBeInTheDocument();
  });
  it("입력에 초점이 있거나 조합키·한글 입력 중이면 숫자 단축키를 가로채지 않는다", async () => {
    const { source } = await startAt(2);
    await resume(source);
    for (const modifier of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
      { keyCode: 229 },
      { repeat: true },
    ]) {
      fireEvent.keyDown(window, { key: "1", ...modifier });
    }
    const input = document.createElement("input");
    document.body.append(input);
    fireEvent.keyDown(input, { key: "1" });
    input.remove();
    expect(screen.getByRole("button", { name: "빈칸 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /단계 마치기/ })).toBeDisabled();
  });
  it("첫 빈칸부터 자동 대기하고 좌우 방향키로 옮긴 위치에 입력한다", async () => {
    const { source } = await startAt(4);
    await resume(source);
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    place(1, "수직이등분선");
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
  });
  it.each(["Backspace", "Escape"])(
    "%s로 틀린 답 표시를 지워도 틀림 기록과 채운 답은 남긴다",
    async (key) => {
      const { source } = await startAt(4);
      await resume(source);
      const actionSpy = vi.spyOn(source, "act");
      place(1, "외심");
      await waitFor(() =>
        expect(
          screen.getByRole("textbox", { name: "빈칸 답 입력" }),
        ).toBeEnabled(),
      );
      const missed = screen.getByRole("button", {
        name: "빈칸 1 · 틀린 기록이 있는 빈칸",
      });
      expect(missed).toHaveTextContent("외심");
      const writes = actionSpy.mock.calls.length;
      expect(fireEvent.keyDown(window, { key })).toBe(false);
      expect(missed).not.toHaveTextContent("외심");
      expect(
        screen.queryByRole("button", { name: "다시 입력하기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "틀린 기록이 있는 빈칸 1개 · 다시 채워도 기록은 남습니다",
        ),
      ).toBeInTheDocument();
      expect((await source.state()).session!.missedAtFour).toContain("p0#1");
      expect(actionSpy).toHaveBeenCalledTimes(writes);
      place(1, "수직이등분선");
      fireEvent.keyDown(window, { key });
      showSlot(1);
      expect(
        screen.getByRole("group", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
      ).toHaveTextContent("수직이등분선");
    },
  );
  it.each(["Backspace", "Escape"])(
    "다른 입력 필드의 %s는 빈칸 선택 취소로 가로채지 않는다",
    async (key) => {
      const { source } = await startAt(4);
      await resume(source);
      fireEvent.keyDown(window, { key: "ArrowRight" });
      const blank = screen.getByRole("button", { name: "빈칸 2" });
      const foreignInput = document.createElement("input");
      document.body.append(foreignInput);
      try {
        expect(fireEvent.keyDown(foreignInput, { key })).toBe(true);
        expect(blank).toHaveAttribute("data-pending", "true");
      } finally {
        foreignInput.remove();
      }
    },
  );
  it.each([
    ["1", "Digit1", false],
    ["9", "Numpad9", false],
    ["0", "Numpad0", false],
    ["!", "Digit1", true],
  ])(
    "숨은 답을 숫자 %s로 추측해서 넣을 수 없다",
    async (key, code, shiftKey) => {
      const { source } = await startAt(4);
      await resume(source);
      const actionSpy = vi.spyOn(source, "act");
      fireEvent.keyDown(window, { key, code, shiftKey });
      expect(screen.getByText("0 / 3 완료")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /단계 마치기/ }),
      ).toBeDisabled();
      expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
      expect(actionSpy).not.toHaveBeenCalled();
    },
  );
  it("많은 답도 번호나 답 목록 없이 타이핑해서 서로 다른 문장에 넣는다", async () => {
    const many: FadingConcept = {
      ...concept,
      id: "many-answers",
      propositions: Array.from({ length: 13 }, (_, i) => ({
        id: `many-${i}`,
        term: `용어 ${i}`,
        kind: "정의",
        pieces: [
          {
            kind: "target",
            target: { id: `many-${i}#1`, text: `답${i}`, tier: "text" },
          },
        ],
      })),
    };
    const { source } = await startAt(4, many);
    await resume(source);
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
    place(10, "답9");
    place(11, "답10");
    expect(screen.getByText("2 / 13 완료")).toBeInTheDocument();
    const previous = screen.getByRole("button", { name: "이전 문장" });
    while (!previous.hasAttribute("disabled")) fireEvent.click(previous);
    for (let i = 0; i < 9; i++)
      fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    expect(
      document.querySelector('[data-fading-slot="many-9#1"]'),
    ).toHaveTextContent("답9");
    fireEvent.click(screen.getByRole("button", { name: "다음 문장" }));
    expect(
      document.querySelector('[data-fading-slot="many-10#1"]'),
    ).toHaveTextContent("답10");
  });
  it.each([2, 3, 4] as const)(
    "%i단계의 빈칸은 답 길이 측정이나 숨은 답 속성을 쓰지 않는다",
    async (step) => {
      const { source } = await startAt(step);
      await resume(source);
      for (let i = 1; i <= erasedTargets(concept, step).length; i++) {
        const blank = showSlot(i);
        expect(blank).toHaveClass(fillStyles.slot);
        expect(blank.style.getPropertyValue("--slot-width")).toBe("");
        expect(blank.style.getPropertyValue("--slot-height")).toBe("");
        expect(blank.outerHTML).not.toMatch(
          /수직이등분선|外心|외심|반지름|data-answer|data-tier|title=/,
        );
      }
      expect(
        document.querySelector(
          '[data-fading-chip-text], [data-fading-chip], [draggable="true"]',
        ),
      ).toBeNull();
    },
  );
  it("긴 답을 줄이지 않고 적으며 빈칸과 쓴 답의 공용 CSS가 확장과 줄바꿈을 허용한다", async () => {
    const long = "여러 낱말을 모두 포함한 긴 수직이등분선의 성질과 같은 거리";
    const sample = structuredClone(concept);
    const piece = sample.propositions[0]!.pieces[1]!;
    if (piece.kind === "target") piece.target.text = long;
    const { source } = await startAt(4, sample);
    await resume(source);
    place(1, long);
    const previous = screen.getByRole("button", { name: "이전 문장" });
    fireEvent.click(previous);
    const written = document.querySelector('[data-fading-slot="p0#1"]')!;
    expect(written).toHaveClass(fillStyles.slot, fillStyles.written);
    expect(written.textContent).toBe(long);
    const css = readFileSync(
      "src/components/fading/FadingFillCard.module.css",
      "utf8",
    );
    const empty = css.match(/\.card \.slot \{([^}]+)\}/)![1]!;
    const growth = css.match(
      /\.card \.slot\.written,\s*\.card \.slot\[data-wrong="true"\] \{([^}]+)\}/,
    )![1]!;
    const content = css.match(/\.card \.slot > span \{([^}]+)\}/)![1]!;
    expect(empty).toMatch(/width:\s*120px/);
    expect(empty).toMatch(/min-height:\s*44px/);
    expect(empty).toMatch(/height:\s*auto/);
    expect(empty).toMatch(/white-space:\s*normal/);
    expect(empty).toMatch(/overflow-wrap:\s*anywhere/);
    expect(growth).toMatch(/width:\s*fit-content/);
    expect(content).toMatch(/overflow:\s*visible/);
    expect(content).toMatch(/text-overflow:\s*clip/);
    expect(content).not.toMatch(/ellipsis|nowrap|hidden/);
  });
  it("같은 답을 두 번 입력하면 숨은 수량을 누설하지 않고 서로 다른 칩 id로 제출한다", async () => {
    const duplicate: FadingConcept = {
      ...concept,
      propositions: concept.propositions.map((p, index) => ({
        ...p,
        pieces: [
          {
            kind: "target",
            target: {
              id: `duplicate-${index}`,
              text: index < 2 ? "속력" : "거리",
              tier: "text",
            },
          },
        ],
      })),
    };
    const { source } = await startAt(4, duplicate);
    const act = vi.spyOn(source, "act");
    await resume(source);
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
    expect(document.querySelector("[data-count], [data-remaining]")).toBeNull();
    place(1, "속력");
    place(2, "속력");
    place(3, "거리");
    fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
    await screen.findByRole("button", { name: "자가 평가하기" });
    const action = act.mock.calls.find(
      ([action]) => action.action === "step",
    )![0];
    expect(action.action).toBe("step");
    if (action.action === "step")
      expect(new Set(action.placements.map((p) => p.chipId)).size).toBe(3);
  });
  it("답을 타이핑하면 인식하지 못한 글은 안내하고 인식한 오답은 기존 틀림 기록을 사용한다", async () => {
    const { source } = await startAt(4);
    const act = vi.spyOn(source, "act");
    await resume(source);
    act.mockClear();
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    const type = (text: string) => {
      fireEvent.change(input, { target: { value: text } });
      fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
    };
    type("목록에 없는 글");
    expect(screen.getByRole("status")).toHaveTextContent(
      "입력한 답을 확인해 주세요",
    );
    expect(act).not.toHaveBeenCalled();
    type("외심");
    await waitFor(() => expect(input).toBeEnabled());
    expect(act).toHaveBeenCalledWith(
      expect.objectContaining({ action: "miss" }),
    );
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
    ).not.toHaveTextContent("외심");
    type(" 수직이등분선 ");
    showSlot(1);
    expect(
      screen.getByRole("group", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
    ).toHaveTextContent("수직이등분선");
    place(2, "외심");
    type("반지름");
    fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "자가 평가하기" }),
    );
    expect(
      await screen.findByRole("button", { name: /다시.*일 뒤/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /일 뒤/ })).toHaveLength(1);
  });
  it.each([
    ["$n+1$", "n + 1"],
    ["$\\frac{c}{2}$", "c/2"],
    ["$\\frac{c}{2}$", "2분의 c"],
    ["$90^{\\circ}$", "90도"],
    ["$\\sqrt{2}$", "root2"],
    ["$\\overline{AB}$", "bar AB"],
  ])(
    "수식 %s의 안전한 별칭 %s도 숨은 원래 chip id로 제출한다",
    async (canonical, alias) => {
      const sample = structuredClone(concept);
      const target = sample.propositions[0]!.pieces[1]!;
      if (target.kind === "target") target.target.text = canonical;
      const { source, state } = await startAt(4, sample);
      const actionSpy = vi.spyOn(source, "act");
      await resume(source);
      place(1, alias);
      expect(
        screen.queryByRole("button", { name: "빈칸 1" }),
      ).not.toBeInTheDocument();
      place(2, "외심");
      place(3, "반지름");
      fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
      await screen.findByRole("button", { name: "자가 평가하기" });
      const chip = chipTray(sample, 4, { seed: state.session!.seed }).find(
        (item) => item.text === canonical,
      )!;
      expect(actionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "step",
          placements: expect.arrayContaining([
            { targetId: "p0#1", chipId: chip.id },
          ]),
        }),
      );
    },
  );
  it("마지막 평가는 1~4 키로 기존 rate 요청을 보낸다", async () => {
    const { source } = await startAt(4);
    const act = vi.spyOn(source, "act");
    await resume(source);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "자가 평가하기" }),
    );
    await screen.findByRole("button", { name: /다시.*일 뒤/ });
    fireEvent.keyDown(window, { key: "1", code: "Numpad1" });
    await screen.findByRole("heading", { name: "풀이를 마쳤어요" });
    expect(act).toHaveBeenCalledWith(
      expect.objectContaining({ action: "rate", rating: "again" }),
    );
  });
  it.each(["mouse", "touch"])(
    "%s로 빈칸을 고른 뒤 답 입력 단추로 채울 수 있다",
    async (pointerType) => {
      const user = userEvent.setup();
      const { source } = await startAt(2);
      await resume(source);
      const target = erasedTargets(concept, 2)[0]!;
      const blank = screen.getByRole("button", { name: "빈칸 1" });
      if (pointerType === "touch") {
        await user.pointer([
          { keys: "[TouchA>]", target: blank },
          { keys: "[/TouchA]" },
        ]);
      } else {
        await user.click(blank);
      }
      const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
      expect(input).toHaveFocus();
      await user.type(input, target.text);
      await user.click(screen.getByRole("button", { name: "넣기" }));
      expect(
        screen.queryByRole("button", { name: "빈칸 1" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /단계 마치기/ })).toBeEnabled();
    },
  );
  it.each([{ isComposing: true }, { keyCode: 229 }])(
    "한글 조합 Enter는 제출이나 단계를 가로채지 않는다 (%j)",
    async (composition) => {
      const { source } = await startAt(4);
      await resume(source);
      const actionSpy = vi.spyOn(source, "act");
      const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
      input.focus();
      fireEvent.change(input, { target: { value: "외심" } });
      expect(fireEvent.keyDown(input, { key: "Enter", ...composition })).toBe(
        false,
      );
      expect(input).toHaveValue("외심");
      expect(screen.getByText("0 / 3 완료")).toBeInTheDocument();
      expect(actionSpy).not.toHaveBeenCalled();
    },
  );
  it("풀이 전에 답 속성·기준안을 싣지 않고 완료 뒤에만 대조한다", async () => {
    const { source } = await startAt(4);
    await resume(source);
    expect(
      screen.queryByRole("button", { name: "기준안 보기" }),
    ).not.toBeInTheDocument();
    for (let index = 1; index <= erasedTargets(concept, 4).length; index++) {
      const blank = showSlot(index);
      expect(screen.getAllByRole("button", { name: /^빈칸 / })).toHaveLength(1);
      expect(blank.outerHTML).not.toMatch(
        /수직이등분선|외심|반지름|data-answer|data-tier/,
      );
    }
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
    expect(
      document.querySelector(
        "[data-trap], [data-correct], [data-fading-chip-text]",
      ),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    fireEvent.click(await screen.findByRole("button", { name: "기준안 보기" }));
    expect(screen.getByRole("region", { name: "기준안" })).toHaveTextContent(
      "수직이등분선",
    );
    fireEvent.click(screen.getByRole("button", { name: "자가 평가하기" }));
    expect(
      await screen.findByRole("button", { name: /다시.*일 뒤/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /쉬움.*일 뒤/ }),
    ).not.toBeInTheDocument();
  });
  it("4단계 틀림을 즉시 보내며 다시 맞힌 빈칸도 틀림으로 남긴다", async () => {
    const { source } = await startAt(4);
    const act = vi.spyOn(source, "act");
    await resume(source);
    place(1, "외심");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("맞지 않는 답"),
    );
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({ action: "miss" }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "빈칸 답 입력" }),
      ).toBeEnabled(),
    );
    place(1, "수직이등분선");
    showSlot(1);
    const filled = screen.getByRole("group", {
      name: "빈칸 1 · 틀린 기록이 있는 빈칸",
    });
    expect(filled).toHaveTextContent("수직이등분선");
    expect(filled.textContent).toBe("수직이등분선");
    expect(filled.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(
      screen.queryByText("다시 채움 · 틀림 기록 유지"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "틀린 기록이 있는 빈칸 1개 · 다시 채워도 기록은 남습니다",
      ),
    ).toBeInTheDocument();
    expect(
      filled.closest("article")?.querySelectorAll("[data-fading-missed-note]"),
    ).toHaveLength(1);
    place(2, "외심");
    place(3, "반지름");
    fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
    await screen.findByRole("button", { name: "자가 평가하기" });
    expect(act).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "step",
        placements: expect.arrayContaining([
          expect.objectContaining({
            chipId: chipTray(concept, 4, { seed: 42 }).find(
              (c) => c.text === "외심",
            )!.id,
          }),
        ]),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "자가 평가하기" }));
    expect(
      await screen.findByRole("button", { name: /다시.*일 뒤/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /일 뒤/ })).toHaveLength(1);
  });
  it("한 카드의 틀린 기록 수를 한 번만 쓰고 다른 카드에는 설명을 넣지 않는다", async () => {
    const sample = structuredClone(concept);
    sample.propositions[0]!.pieces.push({
      kind: "target",
      target: { id: "p0#2", text: "중점", tier: "text" },
    });
    const { source } = await startAt(4, sample);
    await resume(source);
    expect(document.querySelectorAll("[data-fading-missed-note]")).toHaveLength(
      0,
    );
    place(1, "외심");
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "빈칸 답 입력" }),
      ).toBeEnabled(),
    );
    place(1, "수직이등분선");
    expect(
      screen.getByText(
        "틀린 기록이 있는 빈칸 1개 · 다시 채워도 기록은 남습니다",
      ),
    ).toBeInTheDocument();
    place(2, "반지름");
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "빈칸 답 입력" }),
      ).toBeEnabled(),
    );
    place(2, "중점");
    showSlot(1);
    const note = screen.getByText(
      "틀린 기록이 있는 빈칸 2개 · 다시 채워도 기록은 남습니다",
    );
    expect(document.querySelectorAll("[data-fading-missed-note]")).toHaveLength(
      1,
    );
    const card = note.closest("article")!;
    expect(
      card.querySelectorAll(
        '[role="group"][aria-label*="틀린 기록이 있는 빈칸"]',
      ),
    ).toHaveLength(2);
    expect(
      card.querySelectorAll("[data-fading-slot] [aria-hidden=true]"),
    ).toHaveLength(0);
    expect(card.querySelector("[data-fading-slot]")?.textContent).toBe(
      "수직이등분선",
    );
    for (const other of document.querySelectorAll("article")) {
      if (other !== card)
        expect(other.querySelector("[data-fading-missed-note]")).toBeNull();
    }
  });
  it("중간에 나갔다 돌아오면 같은 단계·씨앗·토큰에서 답 목록 없이 다시 입력한다", async () => {
    const { source, state } = await startAt(3);
    await resume(source);
    const before = (await source.state()).session!;
    const target = erasedTargets(concept, 3)[0]!;
    place(1, target.text);
    expect(screen.getByText("1 / 2 완료")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "풀이 나가기" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "나가기",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    await screen.findByText("STEP 03 · 수식·조건 소거");
    const after = (await source.state()).session!;
    expect(after.id).toBe(before.id);
    expect(after.seed).toBe(before.seed);
    expect(after.step).toBe(before.step);
    expect(screen.getByText("0 / 2 완료")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
    const actionSpy = vi.spyOn(source, "act");
    for (const [index, blank] of erasedTargets(concept, 3).entries())
      place(index + 1, blank.text);
    fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
    await screen.findByRole("heading", { name: "3단계를 마쳤어요" });
    expect(actionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "step",
        sessionId: state.session!.id,
        placements: erasedTargets(concept, 3).map((blank) => ({
          targetId: blank.id,
          chipId: chipTray(concept, 3, { seed: before.seed }).find(
            (chip) => chip.text === blank.text,
          )!.id,
        })),
      }),
    );
  });
  it("409면 상태를 다시 읽어 서버 단계로 맞춘다", async () => {
    const { source } = await startAt(2);
    const real = source.act.bind(source);
    vi.spyOn(source, "act").mockImplementation(async (action) => {
      const next = await real(action);
      if (action.action === "step")
        throw new FadingSourceError(
          "CONFLICT",
          "다른 곳에서 단계를 마쳤습니다.",
          409,
        );
      return next;
    });
    const state = vi.spyOn(source, "state");
    await resume(source);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await screen.findByText("STEP 03 · 수식·조건 소거");
    expect(state.mock.calls.length).toBeGreaterThan(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "다른 곳에서 단계를 마쳤습니다.",
    );
  });
  it("문장이 바뀐 409는 같은 단계의 새 토큰을 읽고 옛 입력과 답을 걷은 뒤 다시 제출한다", async () => {
    const sample = structuredClone(concept);
    const { source, state } = await startAt(3, sample);
    const storedBefore = source.snapshot();
    const actionSpy = vi.spyOn(source, "act");
    const stateSpy = vi.spyOn(source, "state");
    render(<FadingApp source={source} initialState={state} initialSession />);
    const oldTarget = erasedTargets(sample, 3)[0]!;
    place(1, oldTarget.text);
    expect(screen.getByText("1 / 2 완료")).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    fireEvent.change(input, { target: { value: "저장 전 초안" } });
    // The local source retains its bank objects, while its API-shaped response is a copy.
    for (const proposition of sample.propositions)
      for (const piece of proposition.pieces)
        if (piece.kind === "target")
          piece.target.text = `수정한 ${piece.target.text}`;
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    await screen.findByText("풀이 내용이 바뀌어 화면을 다시 불러왔습니다.");
    const refreshed = await source.state();
    expect(stateSpy).toHaveBeenCalled();
    expect(refreshed.session!.id).not.toBe(state.session!.id);
    expect(refreshed.session!.seed).toBe(state.session!.seed);
    expect(refreshed.session!.step).toBe(3);
    expect(source.snapshot()).toEqual(storedBefore);
    expect(screen.getByText("0 / 2 완료")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "빈칸 답 입력" })).toHaveValue(
      "",
    );
    expect(
      document.querySelector("[data-fading-session]")!.innerHTML,
    ).not.toContain("저장 전 초안");
    expect(
      screen.queryByRole("button", { name: "기준안 보기" }),
    ).not.toBeInTheDocument();
    for (const [index, target] of erasedTargets(sample, 3).entries())
      place(index + 1, target.text);
    fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
    await screen.findByRole("heading", { name: "3단계를 마쳤어요" });
    const submissions = actionSpy.mock.calls
      .map(([action]) => action)
      .filter((action) => action.action === "step");
    expect(submissions).toHaveLength(2);
    expect(submissions[0]!.sessionId).toBe(state.session!.id);
    expect(submissions[1]!.sessionId).toBe(refreshed.session!.id);
    expect(submissions[1]!.placements).toEqual(
      erasedTargets(sample, 3).map((target) => ({
        targetId: target.id,
        chipId: chipTray(sample, 3, { seed: refreshed.session!.seed }).find(
          (chip) => chip.text === target.text,
        )!.id,
      })),
    );
  });
  it("같은 source를 다시 그려도 입력 노드·초점·초안·채운 답을 보존하며 요청을 반복하지 않는다", async () => {
    const { source, state } = await startAt(4);
    const actionSpy = vi.spyOn(source, "act");
    const stateSpy = vi.spyOn(source, "state");
    const rendered = render(
      <FadingApp source={source} initialState={state} initialSession />,
    );
    place(1, "수직이등분선");
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    input.focus();
    fireEvent.change(input, { target: { value: "외" } });
    rendered.rerender(
      <FadingApp source={source} initialState={state} initialSession />,
    );
    expect(screen.getByRole("textbox", { name: "빈칸 답 입력" })).toBe(input);
    expect(input).toHaveFocus();
    expect(input).toHaveValue("외");
    expect(screen.getByText("1 / 3 완료")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    expect(actionSpy).not.toHaveBeenCalled();
    expect(stateSpy).not.toHaveBeenCalled();
  });
  it("source 교체 뒤 도착한 옛 상태는 현재 source의 첫날 화면을 덮어쓰지 않는다", async () => {
    const oldSource = local();
    await oldSource.act({ action: "pick", conceptId: concept.id });
    const stale = await oldSource.state();
    let release!: (state: typeof stale) => void;
    const delayed = new Promise<typeof stale>((resolve) => {
      release = resolve;
    });
    const oldState = vi.spyOn(oldSource, "state").mockReturnValue(delayed);
    const nextSource = local();
    const nextState = vi.spyOn(nextSource, "state");
    const oldAction = vi.spyOn(oldSource, "act");
    const nextAction = vi.spyOn(nextSource, "act");
    const rendered = render(<FadingApp source={oldSource} />);
    rendered.rerender(<FadingApp source={nextSource} />);
    await screen.findByRole("heading", { name: "첫 개념부터 시작해요" });
    await act(async () => release(stale));
    expect(
      screen.getByRole("heading", { name: "첫 개념부터 시작해요" }),
    ).toBeInTheDocument();
    expect(oldState).toHaveBeenCalledOnce();
    expect(nextState).toHaveBeenCalledOnce();
    expect(oldAction).not.toHaveBeenCalled();
    expect(nextAction).not.toHaveBeenCalled();
  });
  it("응답을 잃은 평가를 같은 번호로 재시도하면 한 번만 반영된다", async () => {
    const { source } = await startAt(4);
    await resume(source);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "자가 평가하기" }),
    );
    const real = source.act.bind(source);
    const act = vi
      .spyOn(source, "act")
      .mockImplementationOnce(async (action) => {
        await real(action);
        throw new FadingSourceError(
          "OFFLINE",
          "연결되지 않았습니다. 다시 시도하세요.",
          0,
        );
      });
    fireEvent.click(screen.getByRole("button", { name: /다시.*일 뒤/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "저장 다시 시도" }),
    );
    await screen.findByRole("heading", { name: "풀이를 마쳤어요" });
    const rates = act.mock.calls
      .map((c) => c[0])
      .filter((a) => a.action === "rate");
    expect(rates).toHaveLength(2);
    expect(rates[0]).toEqual(rates[1]);
    expect((await source.state()).summary.todayCount.reviews).toBe(1);
  });
  it("복습일 전의 연습은 아무 행동도 보내지 않는다", async () => {
    const { source, state } = await startAt(4);
    const ref = { conceptId: concept.id, sessionId: state.session!.id };
    await source.act({
      action: "step",
      ...ref,
      step: 4,
      placements: [],
      gaveUp: true,
    });
    await source.act({
      action: "rate",
      ...ref,
      rating: "again",
      requestId: "22222222-2222-4222-8222-222222222222",
    });
    const act = vi.spyOn(source, "act");
    render(<FadingApp source={source} />);
    fireEvent.click(await screen.findByRole("button", { name: "개념 목록" }));
    fireEvent.click(
      (await screen.findAllByRole("button", { name: /삼각형.*단원 보기/ }))[0]!,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /성질 1.*성질 2/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "연습하기" }));
    await screen.findByText("연습 · 기록되지 않음");
    for (let n = 0; n < 3; n++) {
      const giveUp = screen.queryByRole("button", { name: "아직 모르겠어요" });
      if (giveUp) fireEvent.click(giveUp);
      const next = await screen.findByRole("button", {
        name: /다음 단계|연습 마치기/,
      });
      fireEvent.click(next);
      if (next.textContent?.includes("연습 마치기")) break;
    }
    expect(act).not.toHaveBeenCalled();
  });
  it("첫날과 완료 홈은 실제 상태로 그린다", async () => {
    const source = local();
    render(<FadingApp source={source} />);
    expect(
      await screen.findByRole("heading", { name: "첫 개념부터 시작해요" }),
    ).toBeInTheDocument();
    expect(erasedTargets(concept, 4)).toHaveLength(3);
  });
  it("용어가 답일 때 2~4단계의 이름표와 머리·속성에는 답을 새지 않는다", async () => {
    const leak: FadingConcept = {
      ...concept,
      propositions: concept.propositions.map((p) => ({
        ...p,
        term: p.pieces.find((piece) => piece.kind === "target")!.target.text,
      })),
    };
    for (const step of [2, 3, 4] as const) {
      const source = createLocalFadingSource({
        concepts: [leak],
        today: "2026-10-06",
      });
      await source.act({ action: "pick", conceptId: leak.id });
      const opened = await source.act({ action: "open", conceptId: leak.id });
      const ref = { conceptId: leak.id, sessionId: opened.session!.id };
      await source.act({ action: "read", ...ref });
      for (const current of [2, 3] as const)
        if (current < step)
          await source.act({
            action: "step",
            ...ref,
            step: current,
            placements: [],
            gaveUp: true,
          });
      const state = await source.state();
      const { container } = render(
        <FadingApp source={source} initialState={state} initialSession />,
      );
      const copy = container.cloneNode(true) as HTMLElement;
      expect(copy.querySelectorAll('button[aria-label^="칩 "]')).toHaveLength(
        0,
      );
      // 아직 지우지 않은 문장 속 단서는 허용된다. 이름표·머리·속성에서는 답을 얻을 수 없어야 한다.
      copy
        .querySelector('[aria-label="개념 문장"]')
        ?.querySelectorAll("article")
        .forEach((node) =>
          node.querySelectorAll("div").forEach((text) => text.remove()),
        );
      for (const target of erasedTargets(leak, step))
        expect(copy.innerHTML).not.toContain(target.text);
      cleanup();
    }
  });
  it("2단계의 기준안은 다음 단계를 채우는 동안 DOM에서 없어진다", async () => {
    const { source } = await startAt(2);
    await resume(source);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    fireEvent.click(await screen.findByRole("button", { name: "기준안 보기" }));
    expect(screen.getByRole("region", { name: "기준안" })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "기준안 접기",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "다음 단계" }));
    expect(
      screen.queryByRole("region", { name: "기준안" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "기준안 보기" }),
    ).not.toBeInTheDocument();
  });
  it("입력란의 초점을 고정한 채 Tab으로 빈칸을 순환하고 타이핑과 Enter로 채운다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    const act = vi.spyOn(source, "act");
    input.focus();
    await user.tab();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.tab({ shift: true });
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    expect(act).not.toHaveBeenCalled();
    await user.type(input, "수직이등분선");
    await user.keyboard("{Enter}");
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "빈칸 3" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.type(input, "반지름");
    await user.keyboard("{Enter}");
    expect(
      screen.queryByRole("button", { name: "빈칸 3" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.type(input, "외심");
    await user.keyboard("{Enter}");
    const finish = screen.getByRole("button", { name: /단계 마치기/ });
    await waitFor(() => expect(finish).toHaveFocus());
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "4단계를 마쳤어요" });
  });
  it("Esc 뒤에는 일반 Tab으로 나가고 입력란에 돌아오면 빈칸 순환을 다시 쓴다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    input.focus();
    await user.tab();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.keyboard("{Escape}");
    expect(input).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "다음 문장" })).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
  });
  it("입력란의 방향키는 글자를 편집하고 Enter로 넣은 오답은 즉시 기록한다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    const actionSpy = vi.spyOn(source, "act");
    input.focus();
    await user.keyboard("12{ArrowLeft}0{ArrowRight}");
    expect(input).toHaveValue("102");
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.clear(input);
    await user.type(input, "외심");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(input).toBeEnabled());
    expect(actionSpy).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        action: "miss",
        placement: expect.objectContaining({ targetId: "p0#1" }),
      }),
    );
    expect((await source.state()).session!.missedAtFour).toContain("p0#1");
    expect(
      screen.getByRole("button", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
    ).toHaveTextContent("외심");
  });
  it.each(["글 입력 Enter", "Tab 이동 후 입력 Enter"])(
    "4단계의 %s 오답 저장 뒤 초점을 복구해 바로 Tab·Enter로 다시 채운다",
    async (method) => {
      const user = userEvent.setup();
      const { source } = await startAt(4);
      await resume(source);
      let release!: () => void;
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      const original = source.act.bind(source);
      const actionSpy = vi
        .spyOn(source, "act")
        .mockImplementation(async (action) => {
          if (action.action === "miss") await delayed;
          return original(action);
        });
      const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
      if (method === "글 입력 Enter") {
        await user.type(input, "외심");
        await user.keyboard("{Enter}");
      } else if (method === "Tab 이동 후 입력 Enter") {
        input.focus();
        await user.tab();
        await user.tab({ shift: true });
        await user.type(input, "외심");
        await user.keyboard("{Enter}");
      }
      expect(input).toBeDisabled();
      blurDisabledControl();
      expect(document.body).toHaveFocus();
      await user.keyboard("{Enter}1{Enter}");
      fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
      expect(actionSpy).toHaveBeenCalledTimes(1);
      expect(actionSpy).toHaveBeenCalledWith(
        expect.objectContaining({ action: "miss" }),
      );
      await act(async () => release());
      await waitFor(() => expect(input).toHaveFocus());
      expect(input).toBeEnabled();
      await user.type(input, "수직이등분선");
      expect(input).toHaveFocus();
      await user.keyboard("{Enter}");
      showSlot(1);
      expect(
        screen.getByRole("group", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
      ).toHaveTextContent("수직이등분선");
      expect((await source.state()).session!.missedAtFour).toContain("p0#1");
      expect(actionSpy).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["mouse", "touch"])(
    "4단계 %s 입력 단추로 보낸 오답 저장은 키보드 초점을 강제하지 않는다",
    async (pointerType) => {
      const user = userEvent.setup();
      const { source } = await startAt(4);
      await resume(source);
      let release!: () => void;
      const delayed = new Promise<void>((resolve) => {
        release = resolve;
      });
      const original = source.act.bind(source);
      const actionSpy = vi
        .spyOn(source, "act")
        .mockImplementation(async (action) => {
          if (action.action === "miss") await delayed;
          return original(action);
        });
      const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
      await user.type(input, "외심");
      const submit = screen.getByRole("button", { name: "넣기" });
      if (pointerType === "touch") {
        await user.pointer([
          { keys: "[TouchA>]", target: submit },
          { keys: "[/TouchA]" },
        ]);
      } else {
        await user.click(submit);
      }
      expect(input).toBeDisabled();
      blurDisabledControl();
      await act(async () => release());
      await waitFor(() => expect(input).toBeEnabled());
      expect(input).not.toHaveFocus();
      expect(actionSpy).toHaveBeenCalledTimes(1);
      expect((await source.state()).session!.missedAtFour).toContain("p0#1");
    },
  );
  it("3단계 오답은 저장과 초점 복구를 추가하지 않고 기존 초점을 유지한다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(3);
    await resume(source);
    const actionSpy = vi.spyOn(source, "act");
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    await user.type(input, "반지름");
    await user.keyboard("{Enter}");
    expect(input).toHaveFocus();
    expect(input).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
    ).toHaveTextContent("반지름");
    await user.type(input, "수직이등분선");
    await user.keyboard("{Enter}");
    expect(input).toHaveFocus();
    expect(actionSpy).not.toHaveBeenCalled();
  });
  it("4단계 오답 저장 실패 때에는 잠금을 유지하고 재시도 성공 뒤 초점을 복구한다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    let reject!: (error: Error) => void;
    const delayed = new Promise<void>((_, fail) => {
      reject = fail;
    });
    const original = source.act.bind(source);
    const actionSpy = vi
      .spyOn(source, "act")
      .mockImplementationOnce(async (action) => {
        await delayed;
        return original(action);
      });
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    await user.type(input, "외심");
    await user.keyboard("{Enter}");
    blurDisabledControl();
    await act(async () =>
      reject(new FadingSourceError("OFFLINE", "오답 저장 실패", 0)),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "오답 저장 실패",
    );
    expect(input).toBeDisabled();
    expect(input).not.toHaveFocus();
    fireEvent.submit(screen.getByRole("form", { name: "빈칸 답 입력" }));
    expect(actionSpy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "저장 다시 시도" }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toBeEnabled();
    expect(actionSpy).toHaveBeenCalledTimes(2);
    expect(actionSpy.mock.calls[1]![0]).toEqual(actionSpy.mock.calls[0]![0]);
  });
  it("키보드로 빈칸을 눌러 입력란에 초점을 옮기고 답을 타이핑한다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const blank = screen.getByRole("button", { name: "빈칸 1" });
    blank.focus();
    await user.keyboard("{Enter}");
    const input = screen.getByRole("textbox", { name: "빈칸 답 입력" });
    expect(input).toHaveFocus();
    expect(blank).toHaveAttribute("aria-pressed", "true");
    await user.type(input, "수직이등분선");
    await user.keyboard("{Enter}");
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
  });
  it("함정 답도 DOM에서는 숨기고 직접 쓰면 즉시 miss를 보낸다", async () => {
    const source = createLocalFadingSource({
      concepts: [concept],
      traps: { [concept.id]: [{ text: "내심" }] },
      today: "2026-10-06",
    });
    await source.act({ action: "pick", conceptId: concept.id });
    const opened = await source.act({ action: "open", conceptId: concept.id });
    const ref = { conceptId: concept.id, sessionId: opened.session!.id };
    await source.act({ action: "read", ...ref });
    for (const step of [2, 3] as const)
      await source.act({
        action: "step",
        ...ref,
        step,
        placements: [],
        gaveUp: true,
      });
    const act = vi.spyOn(source, "act");
    await resume(source);
    expect(screen.queryAllByRole("button", { name: /^칩 / })).toHaveLength(0);
    expect(
      document.querySelector("[data-fading-session]")!.innerHTML,
    ).not.toContain("내심");
    expect(document.querySelector("[data-trap], [data-correct]")).toBeNull();
    place(1, "내심");
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({ action: "miss" }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "아직 모르겠어요" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "자가 평가하기" }),
    );
    expect(
      await screen.findByRole("button", { name: /다시.*일 뒤/ }),
    ).toBeInTheDocument();
  });
  it("빈칸을 다 채워도 주 단추를 누르기 전에는 대조와 step 요청이 없다", async () => {
    const { source } = await startAt(4);
    const act = vi.spyOn(source, "act");
    await resume(source);
    place(1, "수직이등분선");
    place(2, "외심");
    place(3, "반지름");
    expect(
      screen.getByRole("button", { name: /단계 마치기.*3.*3/ }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "기준안 보기" }),
    ).not.toBeInTheDocument();
    expect(act.mock.calls.map((call) => call[0].action)).not.toContain("step");
    fireEvent.click(screen.getByRole("button", { name: /단계 마치기/ }));
    await screen.findByRole("button", { name: "자가 평가하기" });
    expect(act.mock.calls.map((call) => call[0].action)).toContain("step");
  });
  it("그림 이름표의 답은 정독·대조에서만 DOM에 있고 null은 판도 없다", () => {
    const figure = {
      id: "test-figure",
      viewBox: "0 0 200 150",
      svg: '<circle cx="90" cy="70" r="40"/>',
      tags: [{ x: 60, y: 70, w: 70, answer: "숨긴이름표답" }],
    };
    const rendered = render(
      <FadingFigureView
        figure={figure}
        proposition={concept.propositions[0]}
      />,
    );
    expect(rendered.container.innerHTML).not.toContain("숨긴이름표답");
    rendered.rerender(
      <FadingFigureView
        figure={figure}
        proposition={concept.propositions[0]}
        answers
      />,
    );
    expect(rendered.container).toHaveTextContent("숨긴이름표답");
    rendered.rerender(
      <FadingFigureView figure={null} proposition={concept.propositions[0]} />,
    );
    expect(rendered.container).toBeEmptyDOMElement();
  });
});
