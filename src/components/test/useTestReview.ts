"use client";

import { useCallback, useEffect, useState } from "react";

import type { TestEntity, TestProblemItem } from "@/contracts/test.contract";

/**
 * 계약 스키마는 **런타임 값으로 정적 import 하지 않는다** (성능 수리 C-1).
 * 검수 화면의 검증은 모두 `fetch` 응답 이후라, 초기 번들에서 zod + 계약 모듈
 * (279KB)을 빼도 검증은 하나도 줄지 않는다.
 */
const testContract = () => import("@/contracts/test.contract");

type ReadyState = {
  status: "ready";
  test: TestEntity;
  /**
   * 반 이름 — 검수 머리말이 「어느 반의 시험인가」를 적는 데 쓴다(UI-06).
   *
   * ⚠️ 아래 `replace` 는 상태를 **새로 지어** 돌려준다(펼치기가 아니다). 그래서 여기에
   *    필드를 더할 때마다 그 자리에 같이 적어야 한다 — 안 적으면 문항을 한 번 교체하는
   *    순간 값이 조용히 사라진다. `useTestReview.test.ts` 가 그 갈래를 잠근다.
   */
  className: string;
  /** 학생 이름 — 반 전체 시험이면 `null`. 같은 반·날짜·유형이 학생 수만큼 있을 수 있다. */
  studentName: string | null;
  problems: TestProblemItem[];
};

type ReviewState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "error"; message: string }
  | ReadyState;

export function useTestReview(testId: string) {
  const [state, setState] = useState<ReviewState>({ status: "loading" });
  const [replacingSeq, setReplacingSeq] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tests/${testId}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setState({ status: "notfound" });
          return;
        }
        if (!res.ok) throw new Error("fail");
        const { testDetailResponseSchema } = await testContract();
        const body = testDetailResponseSchema.parse(await res.json());
        if (!cancelled) {
          setState({
            status: "ready",
            test: body.data.test,
            className: body.data.className,
            studentName: body.data.studentName,
            problems: body.data.problems,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            message: "테스트를 불러오지 못했습니다",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const replace = useCallback(
    async (seq: number) => {
      if (state.status !== "ready" || state.test.status !== "draft") return;
      setReplacingSeq(seq);
      setActionError(null);
      try {
        const res = await fetch(`/api/tests/${testId}/problems/${seq}`, {
          method: "PUT",
        });
        if (!res.ok) {
          setActionError("문제를 교체하지 못했습니다");
          return;
        }
        const { testProblemReplaceResponseSchema } = await testContract();
        const body = testProblemReplaceResponseSchema.parse(await res.json());
        setState((prev) => {
          if (prev.status !== "ready") return prev;
          return {
            status: "ready",
            test: body.data.test,
            // 교체 응답에는 반 이름이 없다 — 시험이 바뀐 게 아니므로 들고 있던 것을 잇는다.
            className: prev.className,
            studentName: prev.studentName,
            problems: prev.problems.map((item) =>
              item.orderIndex === seq ? body.data.problem : item,
            ),
          };
        });
      } catch {
        setActionError("문제를 교체하지 못했습니다");
      } finally {
        setReplacingSeq(null);
      }
    },
    [state, testId],
  );

  const confirm = useCallback(async () => {
    if (state.status !== "ready" || state.test.status !== "draft") return;
    setConfirming(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/tests/${testId}/confirm`, {
        method: "POST",
      });
      if (!res.ok) {
        setActionError("테스트를 확정하지 못했습니다");
        return;
      }
      const { testConfirmResponseSchema } = await testContract();
      const body = testConfirmResponseSchema.parse(await res.json());
      setState((prev) =>
        prev.status === "ready" ? { ...prev, test: body.data } : prev,
      );
    } catch {
      setActionError("테스트를 확정하지 못했습니다");
    } finally {
      setConfirming(false);
    }
  }, [state, testId]);

  const replacedCount =
    state.status === "ready"
      ? state.problems.filter((item) => item.replaced).length
      : 0;

  return {
    state,
    replace,
    confirm,
    replacingSeq,
    confirming,
    replacedCount,
    actionError,
  };
}
