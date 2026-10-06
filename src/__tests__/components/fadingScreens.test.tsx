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
import { afterEach, describe, expect, it, vi } from "vitest";
import { FadingApp } from "@/components/fading/FadingApp";
import { createLocalFadingSource } from "@/lib/fading/local";
import { chipTray } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FadingConcept } from "@/lib/fading/concepts";
import { FadingFigureView } from "@/components/fading/FadingFigureView";
import { FadingSourceError } from "@/lib/fading/source";
import {
  FADING_BLANK_WIDTH_MODE,
  fadingBlankSize,
} from "@/components/fading/FadingChipInput";

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
  await screen.findByRole("button", { name: "아직 모르겠어요" });
}
function place(targetIndex: number, text: string) {
  fireEvent.click(screen.getByRole("button", { name: `칩 ${text}` }));
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`^빈칸 ${targetIndex}(?:$| ·)`),
    }),
  );
}
function blurDisabledControl() {
  // jsdom keeps disabled controls focused; removing a focused temporary control models Chrome's body focus.
  const temporary = document.createElement("button");
  document.body.append(temporary);
  temporary.focus();
  temporary.remove();
}
function dragChip(chip: HTMLElement, blank: HTMLElement, pointerType: string) {
  const previous = document.elementFromPoint;
  document.elementFromPoint = vi.fn(() => blank);
  try {
    for (const [type, x] of [
      ["pointerdown", 10],
      ["pointermove", 60],
      ["pointerup", 60],
    ] as const) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: pointerType },
        button: { value: 0 },
        clientX: { value: x },
        clientY: { value: 30 },
      });
      fireEvent(chip, event);
    }
  } finally {
    document.elementFromPoint = previous;
  }
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
    await screen.findByRole("button", { name: "읽었어요 · 다음 단계" });
    expect(screen.queryByText("0 / 0 완료")).not.toBeInTheDocument();
    expect(screen.queryByText("빈칸 0개 남음")).not.toBeInTheDocument();
    expect(
      screen.queryByText("이 단계에서는 안 비는 문장"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('h2 > svg[aria-hidden="true"]'),
    ).toHaveLength(3);
    expect(screen.getByText(/STEP 01 · 정독/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Enter", code: "NumpadEnter" });
    await screen.findByRole("button", { name: "아직 모르겠어요" });
    expect(screen.getByText(/STEP 02 · 핵심어 소거/)).toBeInTheDocument();
  });
  it.each([2, 3] as const)(
    "%i단계에는 안 비는 문장 딱지와 빈칸 진행을 유지한다",
    async (step) => {
      const { source } = await startAt(step);
      await resume(source);
      expect(screen.getAllByText("이 단계에서는 안 비는 문장")).toHaveLength(
        3 - erasedTargets(concept, step).length,
      );
      expect(
        screen.getByText(`빈칸 ${erasedTargets(concept, step).length}개 남음`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(`0 / ${erasedTargets(concept, step).length} 완료`),
      ).toBeInTheDocument();
    },
  );
  it("숫자 키패드와 Enter만으로 2단계를 끝내고 다음 단계로 간다", async () => {
    const { source, state } = await startAt(2);
    const act = vi.spyOn(source, "act");
    await resume(source);
    const tray = chipTray(concept, 2, { seed: state.session!.seed });
    const target = erasedTargets(concept, 2)[0]!;
    const index = tray.findIndex((chip) => chip.text === target.text);
    fireEvent.keyDown(window, {
      key: String(index + 1),
      code: `Numpad${index + 1}`,
    });
    expect(screen.getByRole("button", { name: /단계 마치기/ })).toBeEnabled();
    expect(act.mock.calls.map((call) => call[0].action)).not.toContain("step");
    fireEvent.keyDown(window, { key: "Enter", code: "NumpadEnter" });
    await screen.findByRole("heading", { name: "2단계를 마쳤어요" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다음 단계" })).toBeEnabled(),
    );
    expect(act).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "step",
        step: 2,
        placements: [{ targetId: target.id, chipId: tray[index]!.id }],
      }),
    );
    fireEvent.keyDown(window, { key: "Enter" });
    await screen.findByText(/STEP 03 · 수식·조건 소거/);
    expect(screen.getAllByRole("button", { name: /^빈칸 / })).toHaveLength(2);
  });
  it("입력에 초점이 있거나 조합키·한글 입력 중이면 숫자 단축키를 가로채지 않는다", async () => {
    const { source } = await startAt(2);
    await resume(source);
    for (const modifier of [
      { ctrlKey: true },
      { altKey: true },
      { metaKey: true },
      { isComposing: true },
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
    const { source, state } = await startAt(4);
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
    const index = chipTray(concept, 4, { seed: state.session!.seed }).findIndex(
      (chip) => chip.text === "수직이등분선",
    );
    fireEvent.keyDown(window, { key: String(index + 1) });
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
  });
  it.each(["Backspace", "Escape"])(
    "%s로 칩·빈칸 선택과 틀린 칩 표시를 취소하며 틀림 기록과 채운 답은 남긴다",
    async (key) => {
      const { source } = await startAt(4);
      await resume(source);
      const act = vi.spyOn(source, "act");
      const chip = screen.getByRole("button", { name: "칩 외심" });
      fireEvent.click(chip);
      expect(chip).toHaveAttribute("aria-pressed", "true");
      expect(fireEvent.keyDown(window, { key })).toBe(false);
      expect(chip).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(screen.getByRole("button", { name: "빈칸 2" }));
      fireEvent.keyDown(window, { key });
      expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(act).not.toHaveBeenCalled();
      place(1, "외심");
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "칩 수직이등분선" }),
        ).toBeEnabled(),
      );
      const missed = screen.getByRole("button", {
        name: "빈칸 1 · 틀린 기록이 있는 빈칸",
      });
      expect(missed).toHaveTextContent("외심");
      const writes = act.mock.calls.length;
      fireEvent.keyDown(window, { key });
      expect(missed).not.toHaveTextContent("외심");
      expect(
        screen.queryByRole("button", { name: "다시 고르기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          "틀린 기록이 있는 빈칸 1개 · 다시 채워도 기록은 남습니다",
        ),
      ).toBeInTheDocument();
      expect((await source.state()).session!.missedAtFour).toContain(
        erasedTargets(concept, 4)[0]!.id,
      );
      expect(act).toHaveBeenCalledTimes(writes);
      place(1, "수직이등분선");
      fireEvent.keyDown(window, { key });
      expect(
        screen.getByRole("group", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
      ).toHaveTextContent("수직이등분선");
    },
  );
  it.each(["Backspace", "Escape"])(
    "입력 필드의 %s는 선택 취소로 가로채지 않는다",
    async (key) => {
      const { source } = await startAt(4);
      await resume(source);
      const chip = screen.getByRole("button", { name: "칩 외심" });
      fireEvent.click(chip);
      const input = document.createElement("input");
      document.body.append(input);
      try {
        expect(fireEvent.keyDown(input, { key })).toBe(true);
        expect(chip).toHaveAttribute("aria-pressed", "true");
      } finally {
        input.remove();
      }
    },
  );
  it("13개 칩의 10번과 11번도 0·Shift+1로 넣는다", async () => {
    const many: FadingConcept = {
      ...concept,
      id: "many-chips",
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
    const source = createLocalFadingSource({
      concepts: [many],
      today: "2026-10-06",
    });
    await source.act({ action: "pick", conceptId: many.id });
    const opened = await source.act({ action: "open", conceptId: many.id });
    const ref = { conceptId: many.id, sessionId: opened.session!.id };
    await source.act({ action: "read", ...ref });
    for (const step of [2, 3] as const)
      await source.act({
        action: "step",
        ...ref,
        step,
        placements: [],
        gaveUp: true,
      });
    render(<FadingApp source={source} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    await screen.findByRole("button", { name: "아직 모르겠어요" });
    expect(
      screen.getByRole("textbox", { name: "칩 글 입력" }),
    ).toBeInTheDocument();
    const tray = chipTray(many, 4, { seed: opened.session!.seed });
    for (const [index, key, code, shiftKey] of [
      [9, "0", "Numpad0", false],
      [10, "!", "Digit1", true],
    ] as const) {
      const blank =
        erasedTargets(many, 4).findIndex(
          (target) => target.text === tray[index]!.text,
        ) + 1;
      fireEvent.click(screen.getByRole("button", { name: `빈칸 ${blank}` }));
      fireEvent.keyDown(window, { key, code, shiftKey });
      expect(
        screen.queryByRole("button", { name: `빈칸 ${blank}` }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: `칩 ${tray[index]!.text}` }),
      ).not.toBeInTheDocument();
    }
    expect(screen.queryByText("맞지 않는 칩")).not.toBeInTheDocument();
  });
  it("입력 전후 자리 폭은 같고 답 폭·전체 동일 폭은 한 함수에서 바꾼다", async () => {
    const measured = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const width = this.hasAttribute("data-fading-chip-text")
          ? (this.textContent?.length ?? 0) * 8
          : 0;
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: width,
          bottom: 20,
          width,
          height: 20,
          toJSON: () => ({}),
        };
      });
    try {
      const { source } = await startAt(2);
      await resume(source);
      const blank = screen.getByRole("button", { name: "빈칸 1" });
      const width = blank.style.getPropertyValue("--slot-width");
      const height = blank.style.getPropertyValue("--slot-height");
      expect(width).not.toBe("");
      const target = erasedTargets(concept, 2)[0]!;
      place(1, target.text);
      const filled = document.querySelector<HTMLElement>("[data-fading-slot]")!;
      expect(filled.style.getPropertyValue("--slot-width")).toBe(width);
      expect(filled.style.getPropertyValue("--slot-height")).toBe(height);
      // 원장님 결정(2026-10-06) — 빈칸은 전부 같은 크기다: 그 단계 칩 판에서 가장 넓고 가장 높은 칩의 크기.
      // 답의 폭으로 두면 폭이 같은 칩을 눈으로 짝지을 수 있다(답의 길이가 샌다).
      expect(FADING_BLANK_WIDTH_MODE).toBe("uniform");
      const sizes = [
        { width: 100, height: 44 },
        { width: 60, height: 58 },
      ];
      expect(
        fadingBlankSize({ width: 44, height: 44 }, sizes, "answer"),
      ).toEqual({ width: 44, height: 44 });
      expect(
        fadingBlankSize({ width: 44, height: 44 }, sizes, "uniform"),
      ).toEqual({ width: 100, height: 58 });
      expect(fadingBlankSize({ width: 44, height: 44 }, sizes)).toEqual({
        width: 100,
        height: 58,
      });
    } finally {
      measured.mockRestore();
    }
  });
  it("중복 칩은 하나만 보이고 숨긴 수량을 전부 쓰기 전까지 계속 고를 수 있다", async () => {
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
    expect(screen.getAllByRole("button", { name: "칩 속력" })).toHaveLength(1);
    const chips = screen.getByRole("complementary", { name: "칩 고르기" });
    expect(chips.textContent).not.toMatch(/2개|남은 수량|수량/);
    expect(chips.querySelector("[data-count], [data-remaining]")).toBeNull();
    place(1, "속력");
    expect(screen.getByRole("button", { name: "칩 속력" })).toBeEnabled();
    place(2, "속력");
    expect(
      screen.queryByRole("button", { name: "칩 속력" }),
    ).not.toBeInTheDocument();
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
  it("칩 글을 타이핑하거나 눌러 넣어도 같은 풀이·틀림 기록을 사용한다", async () => {
    const { source } = await startAt(4);
    const act = vi.spyOn(source, "act");
    await resume(source);
    act.mockClear();
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
    const type = (text: string) => {
      fireEvent.change(input, { target: { value: text } });
      fireEvent.submit(screen.getByRole("form", { name: "칩 글로 입력" }));
    };
    type("목록에 없는 글");
    expect(screen.getByRole("status")).toHaveTextContent(
      "지금 고를 수 있는 칩의 글",
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
  it("수식 칩은 달러 표시 없이 타이핑해도 고를 수 있다", async () => {
    const sample = structuredClone(concept);
    const target = sample.propositions[0]!.pieces[1];
    if (target?.kind === "target") target.target.text = "$n+1$";
    const { source } = await startAt(4, sample);
    await resume(source);
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
    fireEvent.change(input, { target: { value: "n + 1" } });
    fireEvent.submit(screen.getByRole("form", { name: "칩 글로 입력" }));
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(input).toHaveValue("");
  });
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
    "%s 드래그로 칩을 빈칸에 넣는다",
    async (pointerType) => {
      const { source } = await startAt(2);
      await resume(source);
      const target = erasedTargets(concept, 2)[0]!;
      const chip = screen.getByRole("button", { name: `칩 ${target.text}` });
      const blank = screen.getByRole("button", { name: "빈칸 1" });
      dragChip(chip, blank, pointerType);
      expect(
        screen.queryByRole("button", { name: "빈칸 1" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /단계 마치기/ })).toBeEnabled();
    },
  );
  it("틀린 칩을 끌어 넣어도 틀림 표시와 4단계 miss 요청이 남는다", async () => {
    const { source } = await startAt(4);
    const act = vi.spyOn(source, "act");
    await resume(source);
    dragChip(
      screen.getByRole("button", { name: "칩 외심" }),
      screen.getByRole("button", { name: "빈칸 1" }),
      "mouse",
    );
    expect(screen.getByRole("status")).toHaveTextContent("맞지 않는 칩");
    expect(
      screen.getByRole("button", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
    ).toHaveTextContent("외심");
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({ action: "miss" }),
      ),
    );
  });
  it("풀이 전에 답 속성·기준안을 싣지 않고 완료 뒤에만 대조한다", async () => {
    const { source } = await startAt(4);
    await resume(source);
    const blanks = screen.getAllByRole("button", { name: /^빈칸 / });
    expect(blanks).toHaveLength(3);
    expect(
      screen.queryByRole("button", { name: "기준안 보기" }),
    ).not.toBeInTheDocument();
    for (const blank of blanks) {
      expect(blank.outerHTML).not.toMatch(
        /수직이등분선|외심|반지름|data-answer|data-tier/,
      );
    }
    for (const chip of screen.getAllByRole("button", { name: /^칩 / })) {
      expect(chip.outerHTML).not.toMatch(/data-target|data-trap|data-correct/);
    }
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
    expect(screen.getByRole("status")).toHaveTextContent("맞지 않는 칩");
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({ action: "miss" }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "칩 수직이등분선" }),
      ).toBeEnabled(),
    );
    place(1, "수직이등분선");
    const filled = screen.getByRole("group", {
      name: "빈칸 1 · 틀린 기록이 있는 빈칸",
    });
    expect(filled).toHaveTextContent("수직이등분선");
    expect(filled.textContent).toBe("수직이등분선");
    expect(filled.querySelector('[aria-hidden="true"]')).toBeEmptyDOMElement();
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
        screen.getByRole("button", { name: "칩 수직이등분선" }),
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
      expect(screen.getByRole("button", { name: "칩 중점" })).toBeEnabled(),
    );
    place(2, "중점");
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
    ).toHaveLength(2);
    expect(card.querySelector("[data-fading-slot]")?.textContent).toBe(
      "수직이등분선",
    );
    for (const other of document.querySelectorAll("article")) {
      if (other !== card)
        expect(other.querySelector("[data-fading-missed-note]")).toBeNull();
    }
  });
  it("중간에 나갔다 돌아오면 같은 단계와 칩 차례다", async () => {
    const { source } = await startAt(3);
    await resume(source);
    const before = screen
      .getAllByRole("button", { name: /^칩 / })
      .map((b) => b.getAttribute("aria-label"));
    fireEvent.click(screen.getByRole("button", { name: "풀이 나가기" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "나가기",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "풀이 이어 하기" }),
    );
    expect(
      await screen.findByText("STEP 03 · 수식·조건 소거"),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", { name: /^칩 / })
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(before);
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
  it("용어가 답일 때 2~4단계의 DOM에는 칩 밖으로 용어를 새지 않는다", async () => {
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
      copy
        .querySelectorAll('button[aria-label^="칩 "]')
        .forEach((node) => node.remove());
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
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
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
  it("칩에 초점이 있어도 Tab은 빈칸을 옮기고 Esc 뒤에는 일반 Tab으로 나올 수 있다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
    const chips = screen.getAllByRole("button", { name: /^칩 / });
    chips[0]!.focus();
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
    expect(
      chips.every((chip) => chip.getAttribute("aria-pressed") === "false"),
    ).toBe(true);
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "빈칸 3" })).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "빈칸 2" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    await user.type(input, "외심");
    expect(
      chips.every((chip) => chip.getAttribute("aria-pressed") === "false"),
    ).toBe(true);
  });
  it("칩의 Enter로 넣은 오답도 즉시 기록하고 입력란의 방향키는 글자 편집에 남긴다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
    const act = vi.spyOn(source, "act");
    input.focus();
    await user.keyboard("12{ArrowLeft}{ArrowRight}");
    expect(input).toHaveValue("12");
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveAttribute(
      "data-pending",
      "true",
    );
    screen.getByRole("button", { name: "칩 외심" }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({ action: "miss" }),
      ),
    );
    expect((await source.state()).session!.missedAtFour).toContain("p0#1");
    expect(
      screen.getByRole("button", {
        name: "빈칸 1 · 틀린 기록이 있는 빈칸",
      }),
    ).toHaveTextContent("외심");
  });
  it.each(["글 입력 Enter", "Tab 이동 후 입력 Enter", "칩 Enter", "칩 Space"])(
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
      const input = screen.getByRole("textbox", { name: "칩 글 입력" });
      if (method === "글 입력 Enter") {
        await user.type(input, "외심");
        await user.keyboard("{Enter}");
      } else if (method === "Tab 이동 후 입력 Enter") {
        input.focus();
        await user.tab();
        await user.tab({ shift: true });
        await user.type(input, "외심");
        await user.keyboard("{Enter}");
      } else {
        screen.getByRole("button", { name: "칩 외심" }).focus();
        await user.keyboard(method === "칩 Enter" ? "{Enter}" : " ");
      }
      expect(input).toBeDisabled();
      blurDisabledControl();
      expect(document.body).toHaveFocus();
      await user.keyboard("{Enter}1{Enter}");
      fireEvent.submit(screen.getByRole("form", { name: "칩 글로 입력" }));
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
      expect(
        screen.getByRole("group", { name: "빈칸 1 · 틀린 기록이 있는 빈칸" }),
      ).toHaveTextContent("수직이등분선");
      expect((await source.state()).session!.missedAtFour).toContain("p0#1");
      expect(actionSpy).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    "빈칸 먼저 누름",
    "칩 먼저 누름",
    "손가락 누름",
    "마우스 드래그",
    "손가락 드래그",
    "숫자키",
  ])(
    "4단계 %s 오답 저장 뒤에는 입력란으로 초점을 옮기지 않는다",
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
      const input = screen.getByRole("textbox", { name: "칩 글 입력" });
      const chip = screen.getByRole("button", { name: "칩 외심" });
      const blank = screen.getByRole("button", { name: "빈칸 1" });
      input.focus();
      if (method === "빈칸 먼저 누름") {
        await user.click(blank);
        await user.click(chip);
      } else if (method === "칩 먼저 누름") {
        await user.click(chip);
        await user.click(blank);
      } else if (method === "손가락 누름") {
        await user.pointer([
          { keys: "[TouchA>]", target: blank },
          { keys: "[/TouchA]" },
        ]);
        await user.pointer([
          { keys: "[TouchA>]", target: chip },
          { keys: "[/TouchA]" },
        ]);
      } else if (method.endsWith("드래그")) {
        dragChip(chip, blank, method === "손가락 드래그" ? "touch" : "mouse");
      } else {
        blurDisabledControl();
        const index = screen
          .getAllByRole("button", { name: /^칩 / })
          .indexOf(chip);
        fireEvent.keyDown(window, {
          key: String(index + 1),
          code: `Numpad${index + 1}`,
        });
      }
      expect(input).toBeDisabled();
      blurDisabledControl();
      await act(async () => release());
      await waitFor(() => expect(input).toBeEnabled());
      expect(document.activeElement).not.toBe(input);
      expect(actionSpy).toHaveBeenCalledTimes(1);
      expect((await source.state()).session!.missedAtFour).toContain("p0#1");
    },
  );
  it("3단계 오답은 저장과 초점 복구를 추가하지 않고 기존 초점을 유지한다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(3);
    await resume(source);
    const actionSpy = vi.spyOn(source, "act");
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
    await user.type(input, "반지름");
    await user.keyboard("{Enter}");
    expect(input).toHaveFocus();
    expect(input).toBeEnabled();
    const chip = screen.getByRole("button", { name: "칩 반지름" });
    chip.focus();
    await user.keyboard("{Enter}");
    expect(chip).toHaveFocus();
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
    const input = screen.getByRole("textbox", { name: "칩 글 입력" });
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
    fireEvent.submit(screen.getByRole("form", { name: "칩 글로 입력" }));
    expect(actionSpy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "저장 다시 시도" }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toBeEnabled();
    expect(actionSpy).toHaveBeenCalledTimes(2);
    expect(actionSpy.mock.calls[1]![0]).toEqual(actionSpy.mock.calls[0]![0]);
  });
  it("키보드로 빈칸부터 골라 칩을 넣을 수 있다", async () => {
    const user = userEvent.setup();
    const { source } = await startAt(4);
    await resume(source);
    const blank = screen.getByRole("button", { name: "빈칸 1" });
    blank.focus();
    await user.keyboard("{Enter}");
    expect(blank).toHaveAttribute("aria-pressed", "true");
    screen.getByRole("button", { name: "칩 수직이등분선" }).focus();
    await user.keyboard("{Enter}");
    expect(
      screen.queryByRole("button", { name: "빈칸 1" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "칩 수직이등분선" }),
    ).not.toBeInTheDocument();
  });
  it("추가 칩도 같은 모습으로 그리며 4단계에 넣으면 즉시 miss를 보낸다", async () => {
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
    const chips = screen.getAllByRole("button", { name: /^칩 / });
    expect(chips).toHaveLength(4);
    const trap = screen.getByRole("button", { name: "칩 내심" });
    expect(chips.every((chip) => chip.className === trap.className)).toBe(true);
    expect(trap.outerHTML).not.toMatch(
      /함정|data-target|data-trap|data-correct/,
    );
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
    const rendered = render(<FadingFigureView figure={figure} />);
    expect(rendered.container.innerHTML).not.toContain("숨긴이름표답");
    rendered.rerender(<FadingFigureView figure={figure} answers />);
    expect(rendered.container).toHaveTextContent("숨긴이름표답");
    rendered.rerender(<FadingFigureView figure={null} />);
    expect(rendered.container).toBeEmptyDOMElement();
  });
});
