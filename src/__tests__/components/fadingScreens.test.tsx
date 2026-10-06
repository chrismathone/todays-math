import {
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

function local() {
  return createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-06",
    fresh: () => ({
      sessionId: "11111111-1111-4111-8111-111111111111",
      seed: 42,
    }),
  });
}
async function startAt(step: 1 | 2 | 3 | 4 = 2) {
  const source = local();
  await source.act({ action: "pick", conceptId: concept.id });
  let state = await source.act({ action: "open", conceptId: concept.id });
  const ref = { conceptId: concept.id, sessionId: state.session!.id };
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
  fireEvent.click(screen.getByRole("button", { name: `빈칸 ${targetIndex}` }));
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
  it("13개 칩의 10번과 11번도 입력 상자 없이 0·Shift+1로 넣는다", async () => {
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
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
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
        screen.getByRole("button", { name: `칩 ${tray[index]!.text}` }),
      ).toBeDisabled();
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
    expect(screen.getByRole("button", { name: "빈칸 1" })).toHaveTextContent(
      "외심",
    );
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
    expect(screen.getByText("다시 채움 · 틀림 기록 유지")).toBeInTheDocument();
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
      screen.getByRole("button", { name: "칩 수직이등분선" }),
    ).toBeDisabled();
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
