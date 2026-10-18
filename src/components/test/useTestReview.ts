"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ClassOwner } from "@/contracts/class.contract";
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
  /** 반 이름 — 교체 응답에는 없으므로 기존 검수 맥락을 유지한다(UI-06). */
  className: string;
  /** 학생 이름 — 반 전체 시험이면 `null`. 같은 반·날짜·유형이 학생 수만큼 있을 수 있다. */
  studentName: string | null;
  /** 반의 담당 — 관리자에게만 실려 온다(D-132). 교체 응답에는 없으므로 이 값도 검수 맥락으로 유지한다. */
  classOwner?: ClassOwner;
  problems: TestProblemItem[];
};

type ReviewState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "error"; message: string }
  | ReadyState;

type ReviewScope = { testId: string };
type PendingAction = { kind: "replace"; seq: number } | { kind: "confirm" };
type Snapshot = {
  scope: ReviewScope;
  state: ReviewState;
  pending: PendingAction | null;
  actionError: string | null;
};

const LOADING: ReviewState = { status: "loading" };

export function useTestReview(testId: string) {
  const [scope, setScope] = useState<ReviewScope>({ testId });
  const [snapshot, setSnapshot] = useState<Snapshot>({
    scope,
    state: LOADING,
    pending: null,
    actionError: null,
  });
  // Lock commands synchronously, including two calls before React renders.
  const activeLoad = useRef<{
    scope: ReviewScope;
    pending: boolean;
    draft: boolean;
  } | null>(null);

  // Reset before committing a new test's UI; effects alone are too late.
  // A fresh scope also distinguishes A → B → A and retries of the same test.
  if (scope.testId !== testId) setScope({ testId });
  const current = scope.testId === testId && snapshot.scope === scope;
  const state = current ? snapshot.state : LOADING;
  const pending = current ? snapshot.pending : null;
  const actionError = current ? snapshot.actionError : null;

  useEffect(() => {
    const load = { scope, pending: false, draft: false };
    const controller = new AbortController();
    activeLoad.current = load;
    fetch(`/api/tests/${scope.testId}`, { signal: controller.signal })
      .then(async (res) => {
        if (activeLoad.current !== load) return;
        if (res.status === 404) {
          setSnapshot({
            scope,
            state: { status: "notfound" },
            pending: null,
            actionError: null,
          });
          return;
        }
        if (!res.ok) throw new Error("fail");
        const { testDetailResponseSchema } = await testContract();
        const body = testDetailResponseSchema.parse(await res.json());
        if (body.data.test.id !== scope.testId) throw new Error("Wrong test");
        if (activeLoad.current === load) {
          load.draft = body.data.test.status === "draft";
          setSnapshot({
            scope,
            state: { status: "ready", ...body.data },
            pending: null,
            actionError: null,
          });
        }
      })
      .catch(() => {
        if (activeLoad.current === load) {
          setSnapshot({
            scope,
            state: {
              status: "error",
              message: "테스트를 불러오지 못했습니다",
            },
            pending: null,
            actionError: null,
          });
        }
      });
    return () => {
      if (activeLoad.current === load) activeLoad.current = null;
      controller.abort();
    };
  }, [scope]);

  const retry = useCallback(() => {
    if (
      activeLoad.current?.scope !== scope ||
      (state.status !== "error" && state.status !== "notfound")
    ) {
      return;
    }
    activeLoad.current = null;
    setScope({ testId });
  }, [scope, state.status, testId]);

  const replace = useCallback(
    async (seq: number) => {
      const load = activeLoad.current;
      if (
        load?.scope !== scope ||
        !load.draft ||
        load.pending ||
        state.status !== "ready" ||
        !state.problems.some((item) => item.orderIndex === seq)
      ) {
        return;
      }
      load.pending = true;
      setSnapshot((prev) =>
        prev.scope === scope
          ? { ...prev, pending: { kind: "replace", seq }, actionError: null }
          : prev,
      );
      try {
        const res = await fetch(`/api/tests/${scope.testId}/problems/${seq}`, {
          method: "PUT",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error?.message ||
              "문제를 교체하지 못했습니다. 기존 문항은 유지했습니다.",
          );
        }
        const { testProblemReplaceResponseSchema } = await testContract();
        const body = testProblemReplaceResponseSchema.parse(await res.json());
        if (
          body.data.test.id !== scope.testId ||
          body.data.problem.orderIndex !== seq
        ) {
          throw new Error("Wrong test or problem");
        }
        if (activeLoad.current !== load) return;
        load.draft = body.data.test.status === "draft";
        setSnapshot((prev) => {
          if (prev.scope !== scope || prev.state.status !== "ready")
            return prev;
          return {
            ...prev,
            state: {
              ...prev.state,
              test: body.data.test,
              problems: prev.state.problems.map((item) =>
                item.orderIndex === seq ? body.data.problem : item,
              ),
            },
          };
        });
      } catch (cause) {
        if (activeLoad.current === load) {
          setSnapshot((prev) =>
            prev.scope === scope
              ? {
                  ...prev,
                  actionError:
                    cause instanceof Error
                      ? `${cause.message} 기존 문항은 유지했습니다. 다시 교체해 주세요.`
                      : "문제를 교체하지 못했습니다. 기존 문항은 유지했습니다.",
                }
              : prev,
          );
        }
      } finally {
        if (activeLoad.current === load) {
          load.pending = false;
          setSnapshot((prev) =>
            prev.scope === scope ? { ...prev, pending: null } : prev,
          );
        }
      }
    },
    [scope, state],
  );

  const confirm = useCallback(async () => {
    const load = activeLoad.current;
    if (load?.scope !== scope || !load.draft || load.pending) return;
    load.pending = true;
    setSnapshot((prev) =>
      prev.scope === scope
        ? { ...prev, pending: { kind: "confirm" }, actionError: null }
        : prev,
    );
    try {
      const res = await fetch(`/api/tests/${scope.testId}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("fail");
      const { testConfirmResponseSchema } = await testContract();
      const body = testConfirmResponseSchema.parse(await res.json());
      if (body.data.id !== scope.testId) throw new Error("Wrong test");
      if (activeLoad.current !== load) return;
      load.draft = body.data.status === "draft";
      setSnapshot((prev) =>
        prev.scope === scope && prev.state.status === "ready"
          ? { ...prev, state: { ...prev.state, test: body.data } }
          : prev,
      );
    } catch {
      if (activeLoad.current === load) {
        setSnapshot((prev) =>
          prev.scope === scope
            ? {
                ...prev,
                actionError: "테스트를 확정하지 못했습니다. 다시 확정해 주세요",
              }
            : prev,
        );
      }
    } finally {
      if (activeLoad.current === load) {
        load.pending = false;
        setSnapshot((prev) =>
          prev.scope === scope ? { ...prev, pending: null } : prev,
        );
      }
    }
  }, [scope]);

  const replacedCount =
    state.status === "ready"
      ? state.problems.filter((item) => item.replaced).length
      : 0;

  return {
    state,
    replace,
    confirm,
    retry,
    replacingSeq: pending?.kind === "replace" ? pending.seq : null,
    confirming: pending?.kind === "confirm",
    busy: pending !== null,
    replacedCount,
    actionError,
  };
}
