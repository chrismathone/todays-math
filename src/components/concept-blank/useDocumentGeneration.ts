"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

type WorkKind = "read" | "save" | "bank";
export type DocumentWork = { generation: number; kind: WorkKind };
type State = { generation: number; pending: ReadonlySet<DocumentWork> };

/** 문서를 열 때 세대를 바꾸며, 응답과 완료 처리는 시작한 세대의 작업만 변경한다. */
export function useDocumentGeneration() {
  const [state, setState] = useState<State>(() => ({
    generation: 0,
    pending: new Set(),
  }));
  const current = useRef(state);
  const publish = useCallback((next: State) => {
    current.current = next;
    setState(next);
  }, []);
  const advance = useCallback(() => {
    publish({ generation: current.current.generation + 1, pending: new Set() });
  }, [publish]);
  const isGeneration = useCallback(
    (generation: number) => current.current.generation === generation,
    [],
  );
  const isCurrent = useCallback(
    (work: DocumentWork) =>
      current.current.generation === work.generation &&
      current.current.pending.has(work),
    [],
  );
  const start = useCallback(
    (kind: WorkKind): DocumentWork => {
      const work = { generation: current.current.generation, kind };
      publish({
        ...current.current,
        pending: new Set(current.current.pending).add(work),
      });
      return work;
    },
    [publish],
  );
  const finish = useCallback(
    (work: DocumentWork) => {
      if (!isCurrent(work)) return;
      const pending = new Set(current.current.pending);
      pending.delete(work);
      publish({ ...current.current, pending });
    },
    [isCurrent, publish],
  );
  useLayoutEffect(
    () => () => {
      // 해제된 화면의 응답도 버린다. 해제 중에는 React 상태를 갱신하지 않는다.
      current.current = {
        generation: current.current.generation + 1,
        pending: new Set(),
      };
    },
    [],
  );
  return {
    generation: state.generation,
    reading: [...state.pending].some(({ kind }) => kind === "read"),
    saving: [...state.pending].some(({ kind }) => kind === "save"),
    advance,
    start,
    finish,
    isCurrent,
    isGeneration,
  };
}
export type DocumentGeneration = ReturnType<typeof useDocumentGeneration>;
