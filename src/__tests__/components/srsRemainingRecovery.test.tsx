import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExplorerConceptMemory from "@/components/math-explorers/ExplorerConceptMemory";
import { FadingSourceError } from "@/lib/fading/source";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { canonicalHash } from "@/lib/textbook/hash.server";
import { createApiFadingSource } from "@/components/fading/apiSource";
import { useFadingSessionActions } from "@/components/fading/useFadingSessionActions";
import { createLocalFadingSource } from "@/lib/fading/local";
import { prepareMemory } from "../../../scripts/qa/srs-m05-m06-memory/memory";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("remaining experience: source correspondence and interrupted visits", () => {
  it("qualifies rounding-up help by the requested place, preserving its false statement and examples", () => {
    const card = definitionCard("g5-round-up");
    expect(card.explanation).toBe(
      "30을 십의 자리까지 올림할 때는 일의 자리가 0이므로 30 그대로야.",
    );
    expect(card.trap).toBe("30을 십의 자리까지 올림하면 40이다.");
    expect(card.truth).toBe(false);
    expect(card.examples.filter((e) => e.yes).map((e) => e.text)).toEqual([
      "31 → 40",
      "39 → 40",
    ]);
    // Textbook targets digest the entire card. A previously confirmed old explanation
    // must become stale, never silently keep its old review/digest correspondence.
    expect(canonicalHash(card)).not.toBe(
      canonicalHash({
        ...card,
        explanation: "이미 끝자리가 0이면 올려야 할 나머지가 없어.",
      }),
    );
  });
  it("routes a session-expired network response to the owner without reporting a saved answer", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHORIZED", message: "다시 로그인해 주세요." },
          }),
          { status: 401 },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const access = vi.fn(),
      saved = vi.fn(),
      done = vi.fn();
    const { result } = renderHook(() =>
      useFadingSessionActions({
        source: createApiFadingSource({ studentId: "local-student" }),
        onState: saved,
        onReconcile: vi.fn(),
        onAccessFailure: access,
      }),
    );
    act(() =>
      result.current.send({ action: "pick", conceptId: "local-concept" }, done),
    );
    await waitFor(() =>
      expect(access).toHaveBeenCalledWith(
        expect.objectContaining({ code: "UNAUTHORIZED", status: 401 }),
      ),
    );
    expect(saved).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["STUDENT_CHANGED", 409],
  ] as const)(
    "forwards in-session %s through the integrated explorer owner",
    async (code, status) => {
      const f = await prepareMemory({ step: 4 });
      const expired = new FadingSourceError(
        code,
        "다시 로그인해 주세요.",
        status,
      );
      const write = vi.fn().mockRejectedValue(expired),
        access = vi.fn();
      render(
        <ExplorerConceptMemory
          student
          source={{ ...f.source, dailyPlan: undefined, act: write }}
          onAccessFailure={access}
          renderHome={(memory) => <div>{memory}</div>}
        />,
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "개념 풀이 이어하기" }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "아직 모르겠어요" }),
      );
      await waitFor(() => expect(access).toHaveBeenCalledWith(expired));
      expect(write).toHaveBeenCalledTimes(1);
    },
  );
  it("reconciles an in-session content conflict by reading once, without an access redirect or replaying the write", async () => {
    const f = await prepareMemory({ step: 4 });
    const read = vi.fn(() => f.source.state());
    const write = vi
      .fn()
      .mockRejectedValue(
        new FadingSourceError("CONFLICT", "풀이 내용이 바뀌었어요.", 409),
      );
    const access = vi.fn();
    render(
      <ExplorerConceptMemory
        student
        source={{ ...f.source, dailyPlan: undefined, state: read, act: write }}
        onAccessFailure={access}
        renderHome={(memory) => <div>{memory}</div>}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "개념 풀이 이어하기" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "아직 모르겠어요" }),
    );
    await screen.findByText("풀이 내용이 바뀌었어요.");
    expect(read).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenCalledTimes(1);
    expect(access).not.toHaveBeenCalled();
  });
  it("restores the same open session after serialization without adding a long-term review", async () => {
    const f = await prepareMemory({ step: 4 });
    const snapshot = JSON.parse(JSON.stringify(f.source.snapshot()));
    const restored = createLocalFadingSource({
      today: f.state.today,
      concepts: [f.concept],
      cards: true,
      fading: snapshot,
      traps: { [f.concept.id]: [{ text: "오답" }] },
    });
    const state = await restored.state();
    expect(state.session).toEqual(f.state.session);
    expect(state.opened).toEqual(f.state.opened);
    expect(restored.snapshot().concepts).toEqual(f.source.snapshot().concepts);
  });
  it("rejects a stale tab after another visit closes the session without another review", async () => {
    const f = await prepareMemory({ step: 4, rating: true });
    const request = {
      action: "rate" as const,
      conceptId: f.concept.id,
      sessionId: f.state.session!.id,
      rating: "good" as const,
      requestId: "11111111-1111-4111-8111-111111111111",
    };
    await f.source.act(request);
    const saved = f.source.snapshot();
    await expect(
      f.source.act({
        ...request,
        requestId: "22222222-2222-4222-8222-222222222222",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(f.source.snapshot()).toEqual(saved);
  });
});
