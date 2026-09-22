import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConceptPlay from "@/components/lab/cube31/ConceptPlay";
import { PLAY_MISSIONS } from "@/lib/lab/cube31/conceptPlay";

const surface = () =>
  screen.getByRole("region", { name: "모아와 두리의 블록 가게 게임" });
const transcript = () => screen.getByRole("log", { name: "이야기 기록" });
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
function key(key: string) {
  fireEvent.keyDown(surface(), { key });
  fireEvent.keyUp(surface(), { key });
}
function solve() {
  key("2");
  key("3");
  key("3");
}
async function advance(ms: number) {
  for (let remaining = ms; remaining > 0; remaining -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, remaining));
    });
  }
}

describe("ConceptPlay conversation pacing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("takes turns, pauses mid-sentence, and waits for the discovery before advancing", async () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    expect(transcript()).not.toHaveTextContent(PLAY_MISSIONS[0].chat[0]);
    expect(within(transcript()).queryByText("모아")).not.toBeInTheDocument();
    await advance(700);
    expect(transcript()).toHaveTextContent(
      PLAY_MISSIONS[0].chat[0].slice(0, 2),
    );
    expect(transcript()).not.toHaveTextContent(PLAY_MISSIONS[0].chat[0]);
    click("잠깐 멈추기");
    const pausedText = transcript().textContent;
    await advance(4000);
    expect(transcript().textContent).toBe(pausedText);
    click("계속하기");
    await advance(7000);
    expect(transcript()).toHaveTextContent(PLAY_MISSIONS[0].chat[1]);
    solve();
    await advance(500);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    for (
      let i = 0;
      i < 80 && !transcript().textContent?.includes(PLAY_MISSIONS[0].discovery);
      i++
    ) {
      await advance(100);
    }
    expect(transcript()).toHaveTextContent(PLAY_MISSIONS[0].discovery);
    await advance(600);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    await advance(400);
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
    expect(transcript()).toHaveTextContent(PLAY_MISSIONS[0].discovery);
    expect(transcript()).not.toHaveTextContent(PLAY_MISSIONS[1].chat[0]);
  });

  it("keeps a rapid solve in the current scene and lets the learner finish its conversation immediately", async () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    solve();
    await advance(900);
    expect(screen.getByTestId("play-value")).toHaveTextContent(/^12$/);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    click("대화 바로 보기");
    expect(transcript()).toHaveTextContent(PLAY_MISSIONS[0].chat[0]);
    expect(transcript()).toHaveTextContent(PLAY_MISSIONS[0].discovery);
    await advance(899);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    await advance(1);
    expect(screen.getByText(/장면 2 \/ 8/)).toBeVisible();
  });

  it("updates one reaction bubble immediately during rapid moves without restarting the dialogue", async () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    await advance(700);
    const intro = transcript().querySelector(
      '[data-message-id="intro-0-duri"] p',
    );
    const typed = intro?.textContent;
    key("2");
    const reaction = transcript().querySelector(
      '[data-message-id="reaction-0"] p',
    );
    expect(reaction).toHaveTextContent("직접 움직이니 0 + 10 = 10");
    key("2");
    key("2");
    expect(transcript().querySelector('[data-message-id="reaction-0"] p')).toBe(
      reaction,
    );
    expect(reaction).toHaveTextContent("직접 움직이니 20 + 10 = 30");
    expect(reaction?.querySelector('[aria-label$="생각 중"]')).toBeNull();
    expect(intro?.textContent).toBe(typed);
    await advance(7000);
    expect(transcript()).toHaveTextContent(PLAY_MISSIONS[0].chat[1]);
    expect(reaction).toHaveTextContent("직접 움직이니 20 + 10 = 30");
    expect(
      screen.queryByRole("button", { name: "대화 바로 보기" }),
    ).not.toBeInTheDocument();
    key("u");
    expect(reaction).toHaveTextContent("마지막 움직임을 되돌렸어");
  });

  it("cancels an unfinished discovery on undo and restarts the current conversation on reset", async () => {
    render(<ConceptPlay onClose={vi.fn()} />);
    click("대화 바로 보기");
    solve();
    await advance(400);
    key("u");
    expect(screen.getByTestId("play-value")).toHaveTextContent(/^11$/);
    await advance(6000);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    expect(transcript()).not.toHaveTextContent(PLAY_MISSIONS[0].discovery);
    key("3");
    await advance(100);
    key("r");
    expect(transcript()).not.toHaveTextContent(PLAY_MISSIONS[0].chat[0]);
    await advance(8000);
    expect(screen.getByText(/장면 1 \/ 8/)).toBeVisible();
    expect(screen.getByTestId("play-value")).toHaveTextContent(/^0$/);
    expect(transcript()).not.toHaveTextContent(PLAY_MISSIONS[0].discovery);
  });

  it("stops typing on close even if the host has not unmounted the component yet", async () => {
    const onClose = vi.fn();
    const result = render(<ConceptPlay onClose={onClose} />);
    await advance(700);
    click("게임 닫기");
    const closedText = transcript().textContent;
    await advance(10000);
    expect(transcript().textContent).toBe(closedText);
    expect(onClose).toHaveBeenCalledTimes(1);
    result.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
