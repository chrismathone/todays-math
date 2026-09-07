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
import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useTestReview } from "@/components/test/useTestReview";
import { MOCK_CLASSES, MOCK_TESTS, TEST_DRAFT_ID } from "@/mocks/data";

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
