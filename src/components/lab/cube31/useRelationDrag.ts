import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

type Source = "tray" | "join" | "compare";
type Target = "tray" | "join" | "align";
export type BarDrag = {
  index: number;
  source: Source;
  x: number;
  y: number;
  left: number;
  top: number;
  dx: number;
  dy: number;
  target: Target | null;
};
type Session = {
  index: number;
  source: Source;
  pointerId: number;
  element: HTMLButtonElement;
  rect: DOMRect;
  startX: number;
  startY: number;
  scaleX: number;
  scaleY: number;
  active: boolean;
};

export function containsPoint(
  element: HTMLElement | null,
  x: number,
  y: number,
) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    x >= rect.left - 10 &&
    x <= rect.right + 10 &&
    y >= rect.top - 10 &&
    y <= rect.bottom + 10
  );
}

/** Pointer capture keeps the physical strip under the hand, even outside its board. */
export function useRelationDrag({
  disabled,
  hitTest,
  onDrop,
}: {
  disabled: boolean;
  hitTest: (drag: BarDrag) => Target | null;
  onDrop: (drag: BarDrag) => void;
}) {
  const session = useRef<Session | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<BarDrag | null>(null);

  const release = useCallback(() => {
    const current = session.current;
    session.current = null;
    if (current) {
      suppressClick.current = current.active;
      if (current.element.hasPointerCapture?.(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
    }
  }, []);

  const cancel = useCallback(() => {
    release();
    setDrag(null);
  }, [release]);

  // Reset render state immediately; the effect only releases browser capture.
  if (disabled && drag) setDrag(null);

  useEffect(() => {
    if (disabled) release();
  }, [disabled, release]);

  const active = drag !== null;
  useEffect(() => {
    if (!active) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    // Scrolling changes the coordinate frame; cancel rather than jump the strip.
    window.addEventListener("scroll", cancel, true);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("scroll", cancel, true);
    };
  }, [active, cancel]);

  useEffect(
    () => () => {
      const current = session.current;
      session.current = null;
      if (current?.element.hasPointerCapture?.(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
    },
    [],
  );

  function position(event: PointerEvent<HTMLButtonElement>): BarDrag | null {
    const current = session.current;
    if (!current || current.pointerId !== event.pointerId || disabled)
      return null;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.active && Math.hypot(dx, dy) < 5) return null;
    current.active = true;
    const next: BarDrag = {
      index: current.index,
      source: current.source,
      x: event.clientX,
      y: event.clientY,
      left: current.rect.left + dx,
      top: current.rect.top + dy,
      // Client coordinates already include CSS zoom and ancestor transforms.
      dx: dx / current.scaleX,
      dy: dy / current.scaleY,
      target: null,
    };
    next.target = hitTest(next);
    return next;
  }

  function bind(index: number, source: Source, unavailable = false) {
    return {
      draggable: false,
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (
          disabled ||
          unavailable ||
          session.current ||
          event.button !== 0 ||
          event.isPrimary === false
        )
          return;
        suppressClick.current = false;
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();
        session.current = {
          index,
          source,
          element,
          rect,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          active: false,
          scaleX: element.offsetWidth ? rect.width / element.offsetWidth : 1,
          scaleY: element.offsetHeight ? rect.height / element.offsetHeight : 1,
        };
        element.setPointerCapture?.(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const next = position(event);
        if (next) {
          event.preventDefault();
          setDrag(next);
        }
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        if (session.current?.pointerId !== event.pointerId) return;
        const next = position(event);
        cancel();
        if (next) {
          event.preventDefault();
          if (next.target) onDrop(next);
        }
      },
      onPointerCancel(event: PointerEvent<HTMLButtonElement>) {
        if (session.current?.pointerId === event.pointerId) cancel();
      },
      onLostPointerCapture(event: PointerEvent<HTMLButtonElement>) {
        if (session.current?.pointerId === event.pointerId) cancel();
      },
      onClickCapture(event: MouseEvent<HTMLButtonElement>) {
        if (suppressClick.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        suppressClick.current = false;
      },
      onDragStart(event: DragEvent<HTMLButtonElement>) {
        event.preventDefault();
      },
      "data-dragging": drag?.index === index && drag.source === source,
    };
  }

  function style(index: number, source: Source): CSSProperties {
    return drag?.index === index && drag.source === source
      ? { translate: `${drag.dx}px ${drag.dy}px` }
      : {};
  }

  return { drag: disabled ? null : drag, bind, style, cancel };
}
