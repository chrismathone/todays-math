/**
 * 검수 훅이 **반 이름을 들고 있고, 교체해도 잃지 않는다** (UI-06 데이터 배선, 2026-09-07).
 *
 * ## 왜 지금 화면에 안 나오는데 시험을 쓰나
 *
 * 검수 머리말의 **모양**은 아직 확정 전이다(D-07 시안 대상). 그래서 이번에는 값이 화면까지
 * **도달만** 하게 해 두고 표시는 다음 회차로 미뤘다. 그런데 그러면 아무 화면도 이 값을
 * 안 읽으므로, **사라져도 아무 데서도 안 운다** — 다음 사람이 머리말을 붙이는 날
 * 「왜 반 이름이 비지?」로 시작하게 된다.
 *
 * ## 🔴 실제로 사라질 수 있는 자리
 *
 * `replace`(문항 1클릭 교체)는 상태를 **펼치지 않고 새로 짓는다**:
 *
 * ```ts
 * return { status: "ready", test: body.data.test, problems: ... }   // ← className 이 없으면 증발
 * ```
 *
 * 교체 응답(`testProblemReplaceResponseSchema`)에는 반 이름이 없다. 시험이 바뀐 게 아니므로
 * **들고 있던 것을 이어야** 한다. 이 시험은 「불러왔을 때 있다」가 아니라
 * **「교체한 뒤에도 있다」**를 묻는다 — 앞엣것만 물으면 그 갈래는 구조적으로 안 보인다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useTestReview } from "@/components/test/useTestReview";
import {
  MOCK_CLASSES,
  MOCK_TESTS,
  MOCK_TEST_DRAFT,
  MOCK_TEST_DRAFT_PROBLEMS,
  TEST_CONFIRMED_ID,
  TEST_DRAFT_ID,
} from "@/mocks/data";

/** 이 시험지가 속한 반의 이름 — 픽스처에서 직접 뽑는다(값을 옮겨 적지 않는다). */
const EXPECTED = MOCK_CLASSES.find(
  (c) => c.id === MOCK_TESTS.find((t) => t.id === TEST_DRAFT_ID)!.classId,
)!.name;

describe("검수 훅 — 반 이름", () => {
  it("픽스처가 이 시험을 실제로 갈라 준다 — 빈 이름이면 아래 단언이 헛돈다", () => {
    expect(EXPECTED.length).toBeGreaterThan(0);
  });

  it("불러오면 반 이름을 들고 있다", async () => {
    const { result } = renderHook(() => useTestReview(TEST_DRAFT_ID));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(
      result.current.state.status === "ready" && result.current.state.className,
    ).toBe(EXPECTED);
  });

  it("🔴 문항을 교체해도 반 이름을 잃지 않는다 — `replace` 가 상태를 새로 짓는다", async () => {
    const { result } = renderHook(() => useTestReview(TEST_DRAFT_ID));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    await act(async () => {
      await result.current.replace(1);
    });

    await waitFor(() => expect(result.current.replacingSeq).toBeNull());
    expect(
      result.current.state.status === "ready" && result.current.state.className,
      "교체 뒤 반 이름이 사라졌다 — replace 의 상태 재구성에 className 을 잇지 않았다",
    ).toBe(EXPECTED);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const detail = (id = TEST_DRAFT_ID) => ({
  test: { ...MOCK_TEST_DRAFT, id },
  className: id === TEST_DRAFT_ID ? EXPECTED : "다른 반",
  studentName: id === TEST_DRAFT_ID ? "김민서" : "이서준",
  problems: MOCK_TEST_DRAFT_PROBLEMS,
});

type Command = "replace" | "confirm";
type Review = ReturnType<typeof useTestReview>;
const invoke = (review: Review, command: Command) =>
  command === "replace" ? review.replace(1) : review.confirm();
const mutationResponse = (command: Command, id = TEST_DRAFT_ID) =>
  Response.json({
    data:
      command === "confirm"
        ? { ...MOCK_TEST_DRAFT, id, status: "confirmed" }
        : {
            test: { ...MOCK_TEST_DRAFT, id, modified: true },
            problem: { ...MOCK_TEST_DRAFT_PROBLEMS[0], replaced: true },
          },
  });

describe("검수 훅 — 비동기 요청과 화면 수명", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ data: detail() }),
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it.each<Command>(["replace", "confirm"])(
    "%s 중에는 같은 틱의 중복·다른 문항·다른 명령을 모두 막는다",
    async (command) => {
      const response = deferred<Response>();
      const { result } = renderHook(() => useTestReview(TEST_DRAFT_ID));
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      const saved = result.current;
      vi.mocked(fetch).mockReturnValueOnce(response.promise);

      let operation!: Promise<void>;
      await act(async () => {
        operation = invoke(saved, command);
        await Promise.all([
          saved.replace(1),
          saved.replace(2),
          saved.confirm(),
        ]);
      });
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.current.busy).toBe(true);
      expect(result.current.confirming).toBe(command === "confirm");
      expect(result.current.replacingSeq).toBe(
        command === "replace" ? 1 : null,
      );

      await act(async () => {
        response.resolve(mutationResponse(command));
        await operation;
      });
      expect(result.current.busy).toBe(false);
      expect(result.current.state).toMatchObject({
        className: EXPECTED,
        studentName: "김민서",
        test: {
          id: TEST_DRAFT_ID,
          status: command === "confirm" ? "confirmed" : "draft",
        },
      });
      if (command === "confirm") {
        await act(async () => {
          await Promise.all([saved.confirm(), saved.replace(1)]);
        });
        expect(fetch).toHaveBeenCalledTimes(2);
      } else {
        vi.mocked(fetch).mockResolvedValueOnce(mutationResponse("confirm"));
        await act(async () => {
          await result.current.confirm();
        });
        expect(fetch).toHaveBeenCalledTimes(3);
      }
    },
  );

  it.each<Command>(["replace", "confirm"])(
    "%s 실패 뒤 같은 동작을 다시 시도하고 오류를 지운다",
    async (command) => {
      const { result } = renderHook(() => useTestReview(TEST_DRAFT_ID));
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
      await act(async () => {
        await invoke(result.current, command);
      });
      expect(result.current.actionError).toContain("다시");
      expect(result.current.busy).toBe(false);
      expect(result.current.state).toMatchObject({ test: { status: "draft" } });

      const response = deferred<Response>();
      vi.mocked(fetch).mockReturnValueOnce(response.promise);
      let operation!: Promise<void>;
      act(() => {
        operation = invoke(result.current, command);
      });
      expect(result.current.actionError).toBeNull();
      expect(result.current.busy).toBe(true);
      await act(async () => {
        response.resolve(mutationResponse(command));
        await operation;
      });
      expect(result.current.busy).toBe(false);
      expect(result.current.actionError).toBeNull();
    },
  );

  it.each([
    ["replace", "success"],
    ["replace", "http"],
    ["replace", "network"],
    ["confirm", "success"],
    ["confirm", "http"],
    ["confirm", "network"],
  ] as const)(
    "이전 시험의 %s %s 응답은 새 시험과 진행 중인 명령에 영향을 주지 않는다",
    async (command, outcome) => {
      const oldResponse = deferred<Response>();
      const newLoad = deferred<Response>();
      const newResponse = deferred<Response>();
      const { result, rerender } = renderHook(({ id }) => useTestReview(id), {
        initialProps: { id: TEST_DRAFT_ID },
      });
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      const oldReview = result.current;
      vi.mocked(fetch).mockReturnValueOnce(oldResponse.promise);
      let oldOperation!: Promise<void>;
      act(() => {
        oldOperation = invoke(oldReview, command);
      });
      vi.mocked(fetch).mockReturnValueOnce(newLoad.promise);
      rerender({ id: TEST_CONFIRMED_ID });
      expect(result.current.state.status).toBe("loading");
      expect(result.current.busy).toBe(false);
      expect(result.current.replacedCount).toBe(0);
      await act(async () => {
        await Promise.all([
          oldReview.confirm(),
          oldReview.replace(1),
          result.current.confirm(),
          result.current.replace(1),
        ]);
        newLoad.resolve(Response.json({ data: detail(TEST_CONFIRMED_ID) }));
      });
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      vi.mocked(fetch).mockReturnValueOnce(newResponse.promise);
      let newOperation!: Promise<void>;
      act(() => {
        newOperation = result.current.replace(2);
      });

      await act(async () => {
        if (outcome === "network") oldResponse.reject(new Error("offline"));
        else
          oldResponse.resolve(
            outcome === "http"
              ? new Response(null, { status: 500 })
              : mutationResponse(command),
          );
        await oldOperation;
      });
      expect(result.current.state).toMatchObject({
        test: { id: TEST_CONFIRMED_ID, status: "draft", modified: false },
        className: "다른 반",
        studentName: "이서준",
      });
      expect(result.current.replacingSeq).toBe(2);
      expect(result.current.actionError).toBeNull();
      expect(result.current.replacedCount).toBe(0);
      await act(async () => {
        await result.current.confirm();
      });
      expect(fetch).toHaveBeenCalledTimes(4);
      await act(async () => {
        newResponse.resolve(new Response(null, { status: 500 }));
        await newOperation;
      });
      expect(result.current.busy).toBe(false);
    },
  );

  it("같은 시험을 다시 열어도 이전 확정 응답을 적용하지 않는다", async () => {
    const response = deferred<Response>();
    const { result, rerender } = renderHook(({ id }) => useTestReview(id), {
      initialProps: { id: TEST_DRAFT_ID },
    });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    vi.mocked(fetch).mockReturnValueOnce(response.promise);
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.confirm();
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: detail(TEST_CONFIRMED_ID) }),
    );
    rerender({ id: TEST_CONFIRMED_ID });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ data: detail() }));
    rerender({ id: TEST_DRAFT_ID });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    await act(async () => {
      response.resolve(mutationResponse("confirm"));
      await operation;
    });
    expect(result.current.state).toMatchObject({
      test: { id: TEST_DRAFT_ID, status: "draft" },
    });
  });

  it.each(["success", "http", "network"])(
    "취소를 무시한 이전 조회의 %s 응답도 새 시험을 덮어쓰지 않는다",
    async (outcome) => {
      const response = deferred<Response>();
      vi.mocked(fetch).mockReturnValueOnce(response.promise);
      const { result, rerender } = renderHook(({ id }) => useTestReview(id), {
        initialProps: { id: TEST_DRAFT_ID },
      });
      const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ data: detail(TEST_CONFIRMED_ID) }),
      );
      rerender({ id: TEST_CONFIRMED_ID });
      expect(signal?.aborted).toBe(true);
      await waitFor(() => expect(result.current.state.status).toBe("ready"));
      await act(async () => {
        if (outcome === "network") response.reject(new Error("offline"));
        else
          response.resolve(
            outcome === "http"
              ? new Response(null, { status: 500 })
              : Response.json({ data: detail() }),
          );
      });
      expect(result.current.state).toMatchObject({
        test: { id: TEST_CONFIRMED_ID },
      });
    },
  );

  it("조회 오류 재시도는 중복 조회를 막고 로딩 후 복구한다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
    const { result } = renderHook(() => useTestReview(TEST_DRAFT_ID));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    const response = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(response.promise);
    act(() => {
      result.current.retry();
      result.current.retry();
    });
    expect(result.current.state.status).toBe("loading");
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      response.resolve(Response.json({ data: detail() }));
    });
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.actionError).toBeNull();
  });

  it("다른 시험의 응답은 표시하지 않고 조회 오류로 처리한다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: detail(TEST_CONFIRMED_ID) }),
    );
    const { result } = renderHook(() => useTestReview(TEST_DRAFT_ID));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    await act(async () => {
      await result.current.confirm();
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
