"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

export function moveQuestion<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  )
    return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function useQuestionReorder<T>(
  items: T[],
  onChange: (items: T[]) => void,
  root: RefObject<HTMLElement | null>,
) {
  const [drag, setDrag] = useState<{
    from: number;
    to: number;
    mode: "pointer" | "keyboard";
  } | null>(null);
  const active = useRef(drag);
  const current = useRef({ items, onChange });
  const [line, setLine] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  useEffect(() => {
    current.current = { items, onChange };
  }, [items, onChange]);
  function update(next: typeof drag) {
    active.current = next;
    setDrag(next);
  }
  function position(to: number) {
    const state = active.current;
    if (!state) return;
    const rows = Array.from(
      root.current?.querySelectorAll<HTMLElement>("[data-exam-question]") ?? [],
    );
    const target = rows[to];
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const top = to > state.from ? rect.bottom - 20 : rect.top - 20;
    setLine({
      top: Math.max(0, Math.min(innerHeight - 40, top)),
      left: rect.left,
      width: rect.width,
    });
  }
  function finish(cancel = false) {
    const state = active.current;
    if (!state) return;
    update(null);
    setLine(null);
    if (!cancel)
      current.current.onChange(
        moveQuestion(current.current.items, state.from, state.to),
      );
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, from: number) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    update({ from, to: from, mode: "pointer" });
    position(from);
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const state = active.current;
    if (!state || state.mode !== "pointer") return;
    const rows = Array.from(
      root.current?.querySelectorAll<HTMLElement>("[data-exam-question]") ?? [],
    );
    let slot = rows.length;
    for (let index = 0; index < rows.length; index++) {
      const rect = rows[index].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        slot = index;
        break;
      }
    }
    const to = Math.min(
      rows.length - 1,
      Math.max(0, slot > state.from ? slot - 1 : slot),
    );
    update({ ...state, to });
    position(to);
    if (event.clientY < 70 || event.clientY > innerHeight - 70) {
      let parent: HTMLElement | null = root.current;
      while (
        parent &&
        !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)
      )
        parent = parent.parentElement;
      (parent ?? document.scrollingElement)?.scrollBy({
        top: event.clientY < 70 ? -24 : 24,
      });
    }
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, from: number) {
    if (!active.current && [" ", "Enter"].includes(event.key)) {
      event.preventDefault();
      update({ from, to: from, mode: "keyboard" });
      position(from);
      return;
    }
    const state = active.current;
    if (!state) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finish(true);
    } else if ([" ", "Enter"].includes(event.key)) {
      event.preventDefault();
      finish();
    } else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const to =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : Math.max(
                0,
                Math.min(
                  items.length - 1,
                  state.to + (event.key === "ArrowUp" ? -1 : 1),
                ),
              );
      update({ ...state, to });
      root.current
        ?.querySelectorAll<HTMLElement>("[data-exam-question]")
        [to]?.scrollIntoView({ block: "nearest" });
      position(to);
    }
  }
  return {
    drag,
    line,
    handleProps: (index: number) => ({
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) =>
        pointerDown(event, index),
      onPointerMove: pointerMove,
      onPointerUp: () => finish(),
      onPointerCancel: () => finish(true),
      onLostPointerCapture: () => finish(true),
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) =>
        keyDown(event, index),
      "aria-pressed": drag?.from === index,
    }),
  };
}
