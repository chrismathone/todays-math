"use client";

import { useEffect, useRef, type ButtonHTMLAttributes } from "react";

/** Mouse/pen paints one selection state per gesture. Touch keeps native scrolling and taps. */
export function useArithmeticTypeSelection(
  onSelect: (id: string, selected: boolean) => void,
) {
  const gesture = useRef<{
    pointerId: number;
    selected: boolean;
    visited: Set<string>;
  } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const end = () => {
      gesture.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("blur", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("blur", end);
    };
  }, []);
  return (
    id: string,
    selected: boolean,
    disabled: boolean,
  ): ButtonHTMLAttributes<HTMLButtonElement> => ({
    disabled,
    "aria-pressed": selected,
    onPointerDown: (event) => {
      suppressClick.current = false;
      if (disabled || event.pointerType === "touch" || event.button !== 0)
        return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
      gesture.current = {
        pointerId: event.pointerId,
        selected: !selected,
        visited: new Set([id]),
      };
      suppressClick.current = true;
      onSelect(id, !selected);
    },
    onPointerEnter: (event) => {
      const current = gesture.current;
      if (
        !current ||
        current.pointerId !== event.pointerId ||
        disabled ||
        event.pointerType === "touch"
      )
        return;
      if (!(event.buttons & 1)) {
        gesture.current = null;
        return;
      }
      if (current.visited.has(id)) return;
      current.visited.add(id);
      onSelect(id, current.selected);
    },
    onClick: (event) => {
      if (disabled) return;
      // Keyboard-generated clicks (detail=0) always remain usable after a pointer gesture.
      if (suppressClick.current && event.detail !== 0) {
        suppressClick.current = false;
        return;
      }
      suppressClick.current = false;
      onSelect(id, !selected);
    },
    onDragStart: (event) => event.preventDefault(),
  });
}
