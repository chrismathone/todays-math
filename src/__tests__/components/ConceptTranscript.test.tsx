import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConceptTranscript, {
  type ConversationMessage,
} from "@/components/lab/cube31/ConceptTranscript";

const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const log = () => screen.getByRole("log", { name: "이야기 기록" });
const bubble = (id: string) =>
  log().querySelector(`[data-message-id="${id}"] p`);
const rows = () => log().querySelectorAll("[data-message-id]");
const dots = () => screen.queryAllByLabelText(/생각 중/);
const skip = () =>
  fireEvent.click(screen.getByRole("button", { name: "대화 바로 보기" }));
const first: ConversationMessage = {
  id: "intro",
  speaker: "두리",
  text: "가나다라",
  scene: { id: "one", label: "첫 번째 장면" },
};
const second: ConversationMessage = {
  id: "reply",
  speaker: "모아",
  text: "해보자!",
  scene: { id: "two", label: "두 번째 장면" },
};

let reduced = false;
let motionListeners: Set<() => void>;
function changeMotion(value: boolean) {
  act(() => {
    reduced = value;
    for (const listener of motionListeners) listener();
  });
}

describe("ConceptTranscript", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduced = false;
    motionListeners = new Set();
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: reduced,
        media: query,
        addEventListener: (_event: string, listener: () => void) =>
          motionListeners.add(listener),
        removeEventListener: (_event: string, listener: () => void) =>
          motionListeners.delete(listener),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reveals ordered opposite-speaker bubbles, with dots and scene dividers only when each starts", () => {
    const complete = vi.fn();
    render(
      <ConceptTranscript
        messages={[first, second]}
        paused={false}
        conversationKey={0}
        onMessageComplete={complete}
      />,
    );
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveAttribute("data-speaker", "두리");
    expect(dots()).toHaveLength(1);
    expect(screen.getByText("첫 번째 장면")).toBeVisible();
    expect(screen.queryByText("두 번째 장면")).not.toBeInTheDocument();
    tick(349);
    expect(bubble("intro")).toHaveTextContent("");
    tick(1);
    expect(bubble("intro")).toHaveTextContent(/^가$/);
    expect(complete).not.toHaveBeenCalled();
    tick(96);
    expect(bubble("intro")).toHaveTextContent(first.text);
    expect(complete.mock.calls).toEqual([["intro"]]);
    tick(299);
    expect(rows()).toHaveLength(1);
    tick(1);
    expect(rows()).toHaveLength(2);
    expect(rows()[1]).toHaveAttribute("data-speaker", "모아");
    expect(screen.getByText("두 번째 장면")).toBeVisible();
    expect(dots()).toHaveLength(1);
    tick(446);
    expect(bubble("reply")).toHaveTextContent(second.text);
    expect(complete.mock.calls).toEqual([["intro"], ["reply"]]);
    expect(dots()).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "대화 바로 보기" }),
    ).not.toBeInTheDocument();
  });

  it("reveals whole Korean syllables and Unicode code points, with a punctuation pause", () => {
    render(
      <ConceptTranscript
        messages={[{ ...first, text: "한😀,글" }]}
        paused={false}
        conversationKey={0}
        onMessageComplete={vi.fn()}
      />,
    );
    tick(350);
    expect(bubble("intro")).toHaveTextContent(/^한$/);
    tick(32);
    expect(bubble("intro")).toHaveTextContent(/^한😀$/);
    tick(32);
    expect(bubble("intro")).toHaveTextContent(/^한😀,$/);
    tick(84);
    expect(bubble("intro")).toHaveTextContent(/^한😀,$/);
    tick(1);
    expect(bubble("intro")).toHaveTextContent(/^한😀,글$/);
  });

  it("freezes the remaining dots delay on pause and resumes it exactly", () => {
    const props = {
      messages: [first, second],
      conversationKey: 0,
      onMessageComplete: vi.fn(),
    };
    const view = render(<ConceptTranscript {...props} paused={false} />);
    tick(100);
    view.rerender(<ConceptTranscript {...props} paused />);
    tick(5000);
    expect(rows()).toHaveLength(1);
    expect(dots()).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    view.rerender(<ConceptTranscript {...props} paused={false} />);
    tick(249);
    expect(dots()).toHaveLength(1);
    tick(1);
    expect(bubble("intro")).toHaveTextContent(/^가$/);
  });

  it("freezes partial text and the speaker gap while paused", () => {
    const complete = vi.fn();
    const props = {
      messages: [first, second],
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const view = render(<ConceptTranscript {...props} paused={false} />);
    tick(360);
    view.rerender(<ConceptTranscript {...props} paused />);
    tick(5000);
    expect(bubble("intro")).toHaveTextContent(/^가$/);
    expect(complete).not.toHaveBeenCalled();
    view.rerender(<ConceptTranscript {...props} paused={false} />);
    tick(21);
    expect(bubble("intro")).toHaveTextContent(/^가$/);
    tick(65);
    expect(complete).toHaveBeenCalledWith("intro");
    tick(100);
    view.rerender(<ConceptTranscript {...props} paused />);
    tick(5000);
    expect(rows()).toHaveLength(1);
    view.rerender(<ConceptTranscript {...props} paused={false} />);
    tick(199);
    expect(rows()).toHaveLength(1);
    tick(1);
    expect(dots()).toHaveLength(1);
  });

  it("does not start pending bubbles or their scenes when mounted paused", () => {
    const props = {
      messages: [first],
      conversationKey: 0,
      onMessageComplete: vi.fn(),
    };
    const view = render(<ConceptTranscript {...props} paused />);
    tick(5000);
    expect(rows()).toHaveLength(0);
    expect(screen.queryByText("첫 번째 장면")).not.toBeInTheDocument();
    view.rerender(<ConceptTranscript {...props} paused={false} />);
    expect(dots()).toHaveLength(1);
    tick(446);
    expect(props.onMessageComplete).toHaveBeenCalledWith("intro");
  });

  it("skips all currently supplied messages exactly once, then animates later arrivals", () => {
    const complete = vi.fn();
    const props = {
      paused: false,
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const view = render(
      <ConceptTranscript {...props} messages={[first, second]} />,
    );
    tick(370);
    skip();
    expect(bubble("intro")).toHaveTextContent(first.text);
    expect(bubble("reply")).toHaveTextContent(second.text);
    expect(complete.mock.calls).toEqual([["intro"], ["reply"]]);
    expect(vi.getTimerCount()).toBe(0);
    const third = { ...first, id: "later", text: "새 이야기" };
    view.rerender(
      <ConceptTranscript {...props} messages={[first, second, third]} />,
    );
    expect(dots()).toHaveLength(1);
    expect(bubble("later")).toHaveTextContent("");
    tick(10000);
    expect(bubble("later")).toHaveTextContent(third.text);
    expect(complete.mock.calls).toEqual([["intro"], ["reply"], ["later"]]);
  });

  it("disables skip while paused, including when close has paused the transcript", () => {
    const complete = vi.fn();
    render(
      <ConceptTranscript
        messages={[first, second]}
        paused
        conversationKey={0}
        onMessageComplete={complete}
      />,
    );
    expect(
      screen.getByRole("button", { name: "대화 바로 보기" }),
    ).toBeDisabled();
    skip();
    tick(10000);
    expect(rows()).toHaveLength(0);
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("coalesces rapid queued feedback without restarting a stable introduction", () => {
    const complete = vi.fn();
    const props = {
      paused: false,
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const reaction = (text: string): ConversationMessage => ({
      id: "feedback",
      speaker: "모아",
      text,
    });
    const view = render(
      <ConceptTranscript {...props} messages={[first, reaction("옛 반응")]} />,
    );
    tick(350);
    view.rerender(
      <ConceptTranscript
        {...props}
        messages={[{ ...first }, reaction("중간 반응")]}
      />,
    );
    tick(16);
    view.rerender(
      <ConceptTranscript
        {...props}
        messages={[{ ...first }, reaction("최신 반응")]}
      />,
    );
    tick(16);
    expect(bubble("intro")).toHaveTextContent(/^가나$/);
    tick(10000);
    expect(rows()).toHaveLength(2);
    expect(bubble("feedback")).toHaveTextContent("최신 반응");
    expect(log()).not.toHaveTextContent("옛 반응");
    expect(log()).not.toHaveTextContent("중간 반응");
    expect(complete.mock.calls).toEqual([["intro"], ["feedback"]]);
  });

  it("replaces already typing feedback and never completes the stale text", () => {
    const complete = vi.fn();
    const props = {
      paused: false,
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const old = { ...second, id: "feedback", text: "오래된 반응입니다" };
    const view = render(<ConceptTranscript {...props} messages={[old]} />);
    tick(382);
    expect(bubble("feedback")).toHaveTextContent("오래");
    view.rerender(
      <ConceptTranscript {...props} messages={[{ ...old, text: "최신" }]} />,
    );
    expect(dots()).toHaveLength(1);
    expect(log()).not.toHaveTextContent("오래");
    tick(381);
    expect(complete).not.toHaveBeenCalled();
    tick(1);
    expect(bubble("feedback")).toHaveTextContent("최신");
    tick(10000);
    expect(complete.mock.calls).toEqual([["feedback"]]);
  });

  it("completes reused IDs once per text and remembers completed revisions", () => {
    const complete = vi.fn();
    const props = {
      paused: false,
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const view = render(<ConceptTranscript {...props} messages={[first]} />);
    skip();
    view.rerender(
      <ConceptTranscript
        {...props}
        messages={[{ ...first, text: "다른 말" }]}
      />,
    );
    expect(dots()).toHaveLength(1);
    skip();
    expect(complete.mock.calls).toEqual([["intro"], ["intro"]]);
    view.rerender(<ConceptTranscript {...props} messages={[first]} />);
    expect(bubble("intro")).toHaveTextContent(first.text);
    expect(dots()).toHaveLength(0);
    tick(5000);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("cancels removed reactions when a unique discovery replaces them", () => {
    const complete = vi.fn();
    const props = {
      paused: false,
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const view = render(
      <ConceptTranscript {...props} messages={[first, second]} />,
    );
    tick(1100);
    expect(bubble("reply")).toHaveTextContent("해");
    const discovery = { ...second, id: "discovery-0-2", text: "찾았다!" };
    view.rerender(
      <ConceptTranscript {...props} messages={[first, discovery]} />,
    );
    expect(bubble("reply")).toBeNull();
    tick(10000);
    expect(complete.mock.calls).toEqual([["intro"], ["discovery-0-2"]]);
  });

  it("resets current typing by conversation key while preserving immediate history", () => {
    const complete = vi.fn();
    const history = {
      ...first,
      id: "past",
      text: "지난 장면",
      immediate: true,
    };
    const props = {
      messages: [history, second],
      paused: false,
      onMessageComplete: complete,
    };
    const view = render(<ConceptTranscript {...props} conversationKey={0} />);
    tick(382);
    expect(bubble("reply")).toHaveTextContent("해보");
    view.rerender(<ConceptTranscript {...props} conversationKey={1} />);
    expect(bubble("past")).toHaveTextContent("지난 장면");
    expect(dots()).toHaveLength(1);
    tick(349);
    expect(complete.mock.calls.filter(([id]) => id === "reply")).toHaveLength(
      0,
    );
    tick(97);
    expect(complete.mock.calls.filter(([id]) => id === "reply")).toHaveLength(
      1,
    );
    expect(screen.getAllByText("첫 번째 장면")).toHaveLength(1);
  });

  it("cleans up timers and media subscriptions on unmount without stale callbacks", () => {
    const complete = vi.fn();
    const view = render(
      <StrictMode>
        <ConceptTranscript
          messages={[first, second]}
          paused={false}
          conversationKey={0}
          onMessageComplete={complete}
        />
      </StrictMode>,
    );
    tick(380);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(motionListeners.size).toBe(0);
    tick(10000);
    expect(complete).not.toHaveBeenCalled();
  });

  it("survives StrictMode and callback identity changes without duplicate completions or timer restarts", () => {
    const initial = vi.fn();
    const latest = vi.fn();
    const messages = [{ ...second, id: "past", immediate: true }, first];
    const view = render(
      <StrictMode>
        <ConceptTranscript
          messages={messages}
          paused={false}
          conversationKey={0}
          onMessageComplete={initial}
        />
      </StrictMode>,
    );
    expect(initial.mock.calls).toEqual([["past"]]);
    tick(300);
    view.rerender(
      <StrictMode>
        <ConceptTranscript
          messages={messages}
          paused={false}
          conversationKey={0}
          onMessageComplete={latest}
        />
      </StrictMode>,
    );
    tick(50);
    expect(bubble("intro")).toHaveTextContent(/^가$/);
    tick(96);
    expect(latest.mock.calls).toEqual([["intro"]]);
    tick(10000);
    expect(initial.mock.calls).toEqual([["past"]]);
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("shows reduced-motion conversations immediately without dots or timers", () => {
    reduced = true;
    const complete = vi.fn();
    render(
      <StrictMode>
        <ConceptTranscript
          messages={[first, second]}
          paused={false}
          conversationKey={0}
          onMessageComplete={complete}
        />
      </StrictMode>,
    );
    expect(bubble("intro")).toHaveTextContent(first.text);
    expect(bubble("reply")).toHaveTextContent(second.text);
    expect(dots()).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(complete.mock.calls).toEqual([["intro"], ["reply"]]);
  });

  it("reacts to reduced-motion changes and respects a paused conversation", () => {
    const complete = vi.fn();
    const props = {
      messages: [first, second],
      conversationKey: 0,
      onMessageComplete: complete,
    };
    const view = render(<ConceptTranscript {...props} paused={false} />);
    tick(350);
    view.rerender(<ConceptTranscript {...props} paused />);
    changeMotion(true);
    tick(5000);
    expect(bubble("intro")).toHaveTextContent(/^가$/);
    expect(complete).not.toHaveBeenCalled();
    view.rerender(<ConceptTranscript {...props} paused={false} />);
    expect(bubble("reply")).toHaveTextContent(second.text);
    expect(complete.mock.calls).toEqual([["intro"], ["reply"]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("announces completed messages politely without exposing each typed character as a live update", () => {
    const view = render(
      <ConceptTranscript
        messages={[first, second]}
        paused={false}
        conversationKey={0}
        onMessageComplete={vi.fn()}
      />,
    );
    const live = view.container.querySelector('[aria-live="polite"]');
    expect(log()).toHaveAttribute("aria-live", "off");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    tick(350);
    expect(live).toBeEmptyDOMElement();
    tick(96);
    expect(live).toHaveTextContent(`두리: ${first.text}`);
    tick(650);
    expect(live).toHaveTextContent(`두리: ${first.text}`);
    tick(96);
    expect(live).toHaveTextContent(`모아: ${second.text}`);
    expect(log().parentElement?.children).toHaveLength(2);
    expect(
      view.container.querySelector('[data-conversation-footer="true"]'),
    ).toHaveTextContent("네가 움직이면 이야기가 이어져.");
  });

  it("scrolls only its transcript and follows the bottom until the reader scrolls up", () => {
    render(
      <ConceptTranscript
        messages={[{ ...first, text: "하나둘셋넷다섯여섯일곱" }]}
        paused={false}
        conversationKey={0}
        onMessageComplete={vi.fn()}
      />,
    );
    const element = log();
    Object.defineProperties(element, {
      scrollHeight: { value: 900, configurable: true },
      clientHeight: { value: 100, configurable: true },
    });
    tick(350);
    expect(element.scrollTop).toBe(900);
    element.scrollTop = 20;
    fireEvent.scroll(element);
    tick(64);
    expect(element.scrollTop).toBe(20);
    element.scrollTop = 800;
    fireEvent.scroll(element);
    tick(32);
    expect(element.scrollTop).toBe(900);
  });
});
