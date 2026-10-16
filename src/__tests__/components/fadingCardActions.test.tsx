import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FadingAction } from "@/contracts/fadingApi.contract";
import { useFadingSessionActions } from "@/components/fading/useFadingSessionActions";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FadingSourceError } from "@/lib/fading/source";

afterEach(cleanup);
const ref = {
  conceptId: "card-test",
  sessionId: "11111111-1111-4111-8111-111111111111",
};
const miss: FadingAction = {
  action: "miss",
  ...ref,
  placement: { targetId: "p0#1", chipId: "c1" },
};
const step: FadingAction = {
  action: "step",
  ...ref,
  step: 4,
  placements: [miss.placement],
};
const rating: FadingAction = {
  action: "rate",
  ...ref,
  rating: "again",
  requestId: "22222222-2222-4222-8222-222222222222",
};

describe("카드 풀이의 요청 차례와 재시도", () => {
  it("틀림을 적은 뒤 단계 저장이 실패하면 단계만 다시 보내고 완료 콜백은 한 번 실행한다", async () => {
    const local = createLocalFadingSource({
      concepts: [],
      today: "2026-10-07",
    });
    const state = await local.state();
    const actSource = vi
      .fn()
      .mockResolvedValueOnce(state)
      .mockRejectedValueOnce(new FadingSourceError("OFFLINE", "연결 실패", 0))
      .mockResolvedValueOnce(state);
    const after = vi.fn();
    const { result } = renderHook(() =>
      useFadingSessionActions({
        source: { ...local, act: actSource },
        onState: vi.fn(),
        onReconcile: vi.fn(),
      }),
    );
    act(() => {
      result.current.send([miss, step], after);
    });
    await waitFor(() => expect(result.current.failure).toBe("연결 실패"));
    expect(actSource.mock.calls.map(([action]) => action)).toEqual([
      miss,
      step,
    ]);
    expect(after).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.retry();
    });
    expect(actSource.mock.calls.map(([action]) => action)).toEqual([
      miss,
      step,
      step,
    ]);
    expect(after).toHaveBeenCalledOnce();
  });

  it("동시에 누른 평가를 막고 실패한 평가는 같은 요청 번호로 다시 보낸다", async () => {
    const local = createLocalFadingSource({
      concepts: [],
      today: "2026-10-07",
    });
    const state = await local.state();
    const actSource = vi
      .fn()
      .mockRejectedValueOnce(new FadingSourceError("OFFLINE", "연결 실패", 0))
      .mockResolvedValueOnce(state);
    const after = vi.fn();
    const { result } = renderHook(() =>
      useFadingSessionActions({
        source: { ...local, act: actSource },
        onState: vi.fn(),
        onReconcile: vi.fn(),
      }),
    );
    act(() => {
      result.current.send(rating, after);
      result.current.send(
        { ...rating, requestId: "33333333-3333-4333-8333-333333333333" },
        after,
      );
    });
    await waitFor(() => expect(result.current.failure).toBe("연결 실패"));
    await act(async () => {
      await result.current.retry();
    });
    expect(actSource.mock.calls.map(([action]) => action)).toEqual([
      rating,
      rating,
    ]);
    expect(after).toHaveBeenCalledOnce();
  });

  it("409 뒤에는 서버 상태로 맞추고 이전 요청의 완료 콜백은 실행하지 않는다", async () => {
    const local = createLocalFadingSource({
      concepts: [],
      today: "2026-10-07",
    });
    const state = await local.state();
    const reconcile = vi.fn();
    const after = vi.fn();
    const actSource = vi
      .fn()
      .mockRejectedValue(
        new FadingSourceError("CONFLICT", "풀이가 바뀌었어요", 409),
      );
    const read = vi.fn().mockResolvedValue(state);
    const { result } = renderHook(() =>
      useFadingSessionActions({
        source: { ...local, state: read, act: actSource },
        onState: vi.fn(),
        onReconcile: reconcile,
      }),
    );
    act(() => result.current.send(step, after));
    await waitFor(() =>
      expect(reconcile).toHaveBeenCalledWith(state, "풀이가 바뀌었어요"),
    );
    expect(after).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.retry();
    });
    expect(actSource).toHaveBeenCalledOnce();
  });

  it("«학생이 바뀜»(STUDENT_CHANGED)이면 대기 행동을 버리고 다시 보내지 않으며 상태를 다시 읽지도 않는다 — 주인에게만 알린다", async () => {
    const local = createLocalFadingSource({
      concepts: [],
      today: "2026-10-07",
    });
    const changed = new FadingSourceError(
      "STUDENT_CHANGED",
      "로그인한 학생이 바뀌었어요. 다시 불러와 주세요.",
      409,
    );
    const actSource = vi.fn().mockRejectedValue(changed);
    const read = vi.fn();
    const reconcile = vi.fn();
    const after = vi.fn();
    const access = vi.fn();
    const { result } = renderHook(() =>
      useFadingSessionActions({
        source: { ...local, state: read, act: actSource },
        onState: vi.fn(),
        onReconcile: reconcile,
        onAccessFailure: access,
      }),
    );
    act(() => result.current.send([miss, step], after));
    await waitFor(() => expect(access).toHaveBeenCalledWith(changed));
    expect(actSource).toHaveBeenCalledOnce();
    expect(read).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
    // 다시 시도도 · 새 행동도 보내지 않는다 — 이 화면은 내려간다.
    await act(async () => {
      await result.current.retry();
    });
    act(() => result.current.send(rating, after));
    await act(async () => {});
    expect(actSource).toHaveBeenCalledOnce();
  });
});
