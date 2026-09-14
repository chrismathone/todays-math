"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { StudioRect } from "./studioHelpers";
import styles from "./StudioCropOverlay.module.css";

export interface StudioCropOverlayProps {
  id: string;
  rect: StudioRect;
  label: string;
  kind: "problem" | "figure";
  selected: boolean;
  disabled: boolean;
  tool: "select" | "add-problem" | "add-figure" | "delete";
  bounds?: StudioRect;
  onSelect: (id: string) => void;
  onCommit: (id: string, rect: StudioRect) => void;
  onDelete: (id: string) => void;
}

const PAGE: StudioRect = { x: 0, y: 0, width: 1, height: 1 };
const MIN_SIZE = 0.005;
const CORNERS = ["nw", "ne", "sw", "se"] as const;
type DragMode = "move" | (typeof CORNERS)[number];
type Drag = {
  pointerId: number;
  element: HTMLDivElement;
  rect: StudioRect;
  bounds: StudioRect;
  mode: DragMode;
  clientX: number;
  clientY: number;
  pageWidth: number;
  pageHeight: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function moveRect(
  rect: StudioRect,
  bounds: StudioRect,
  dx: number,
  dy: number,
) {
  return {
    ...rect,
    x: clamp(rect.x + dx, bounds.x, bounds.x + bounds.width - rect.width),
    y: clamp(rect.y + dy, bounds.y, bounds.y + bounds.height - rect.height),
  };
}

function dragRect(drag: Drag, clientX: number, clientY: number): StudioRect {
  const { rect, bounds, mode } = drag;
  const dx = (clientX - drag.clientX) / drag.pageWidth;
  const dy = (clientY - drag.clientY) / drag.pageHeight;
  if (mode === "move") return moveRect(rect, bounds, dx, dy);

  const minWidth = Math.min(MIN_SIZE, bounds.width);
  const minHeight = Math.min(MIN_SIZE, bounds.height);
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;
  if (mode.endsWith("w")) left = clamp(left + dx, bounds.x, right - minWidth);
  else right = clamp(right + dx, left + minWidth, bounds.x + bounds.width);
  if (mode.startsWith("n")) top = clamp(top + dy, bounds.y, bottom - minHeight);
  else bottom = clamp(bottom + dy, top + minHeight, bounds.y + bounds.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function sameRect(a: StudioRect, b: StudioRect) {
  return (
    Math.abs(a.x - b.x) < 1e-10 &&
    Math.abs(a.y - b.y) < 1e-10 &&
    Math.abs(a.width - b.width) < 1e-10 &&
    Math.abs(a.height - b.height) < 1e-10
  );
}

function releaseDrag(drag: Drag | null) {
  if (drag?.element.hasPointerCapture(drag.pointerId)) {
    drag.element.releasePointerCapture(drag.pointerId);
  }
}

/** Direct child of the positioned page surface; all rectangles use page coordinates. */
export default function StudioCropOverlay({
  id,
  rect,
  label,
  kind,
  selected,
  disabled,
  tool,
  bounds = PAGE,
  onSelect,
  onCommit,
  onDelete,
}: StudioCropOverlayProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const [preview, setPreview] = useState<StudioRect | null>(null);
  const adding = tool === "add-problem" || tool === "add-figure";

  const cancelDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    releaseDrag(drag);
    setPreview(null);
  }, []);

  // A page/geometry/tool change invalidates the gesture, including a busy transition.
  // Callback identity and selection changes must not interrupt a first-click drag.
  useEffect(
    () => cancelDrag,
    [
      cancelDrag,
      id,
      disabled,
      tool,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    ],
  );

  function startDrag(event: PointerEvent<HTMLElement>, mode: DragMode) {
    if (adding) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.button === 2) {
      cancelDrag();
      return;
    }
    if (
      disabled ||
      event.button !== 0 ||
      event.isPrimary === false ||
      dragRef.current
    )
      return;
    suppressClickRef.current = false;
    if (tool !== "select") return;

    const element = elementRef.current;
    const page = element?.parentElement?.getBoundingClientRect();
    if (!element || !page || page.width <= 0 || page.height <= 0) return;
    element.focus({ preventScroll: true });
    element.setPointerCapture(event.pointerId);
    dragRef.current = {
      element,
      pointerId: event.pointerId,
      rect: { ...rect },
      bounds: { ...bounds },
      mode,
      clientX: event.clientX,
      clientY: event.clientY,
      pageWidth: page.width,
      pageHeight: page.height,
    };
    suppressClickRef.current = true;
    setPreview(rect);
    onSelect(id);
  }

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (adding) return;
    event.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (disabled || (event.buttons & 2) !== 0) {
      cancelDrag();
      return;
    }
    setPreview(dragRect(drag, event.clientX, event.clientY));
  }

  function handleUp(event: PointerEvent<HTMLDivElement>) {
    if (adding) return;
    event.stopPropagation();
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = dragRect(drag, event.clientX, event.clientY);
    cancelDrag();
    if (!disabled && event.button === 0 && !sameRect(drag.rect, next))
      onCommit(id, next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (adding) return;
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      cancelDrag();
      return;
    }
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      cancelDrag();
      onDelete(id);
    } else if (tool === "select" && event.key.startsWith("Arrow")) {
      event.preventDefault();
      if (dragRef.current) return;
      const page = event.currentTarget.parentElement?.getBoundingClientRect();
      if (!page || page.width <= 0 || page.height <= 0) return;
      const step = event.shiftKey ? 10 : 1;
      const dx =
        event.key === "ArrowLeft"
          ? -step
          : event.key === "ArrowRight"
            ? step
            : 0;
      const dy =
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      const next = moveRect(rect, bounds, dx / page.width, dy / page.height);
      onSelect(id);
      if (!sameRect(rect, next)) onCommit(id, next);
    }
  }

  const displayed = preview ?? rect;
  return (
    <div
      ref={elementRef}
      role="button"
      aria-label={`${label} 영역`}
      aria-pressed={selected}
      aria-disabled={disabled || adding}
      tabIndex={disabled || adding ? -1 : 0}
      title={label}
      data-crop-id={id}
      data-crop-kind={kind}
      data-tool={tool}
      data-dragging={preview !== null || undefined}
      className={`${styles.overlay} ${styles[kind]}${selected ? ` ${styles.selected}` : ""}`}
      style={{
        left: `${displayed.x * 100}%`,
        top: `${displayed.y * 100}%`,
        width: `${displayed.width * 100}%`,
        height: `${displayed.height * 100}%`,
        pointerEvents: adding ? "none" : "auto",
        cursor: disabled ? "progress" : undefined,
      }}
      onPointerDown={(event) => startDrag(event, "move")}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={(event) => {
        if (adding) return;
        event.stopPropagation();
        if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
      }}
      onLostPointerCapture={(event) => {
        event.stopPropagation();
        if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
      }}
      onContextMenu={(event) => {
        if (adding) return;
        event.stopPropagation();
        event.preventDefault();
        cancelDrag();
      }}
      onClick={(event) => {
        if (adding) return;
        event.stopPropagation();
        event.preventDefault();
        if (disabled) return;
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        if (tool === "delete") onDelete(id);
        else onSelect(id);
      }}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => {
        if (!adding) event.stopPropagation();
      }}
      onBlur={cancelDrag}
    >
      <span className={styles.label}>{label}</span>
      {selected && !disabled && tool === "select" && (
        <button
          type="button"
          className={styles.deleteButton}
          aria-label={`${label} 영역 삭제`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(id);
          }}
        >
          ×
        </button>
      )}
      {selected && !disabled && tool === "select"
        ? CORNERS.map((corner) => (
            <span
              key={corner}
              aria-hidden="true"
              data-corner={corner}
              className={`${styles.handle} ${styles[corner]}`}
              onPointerDown={(event) => startDrag(event, corner)}
            />
          ))
        : null}
    </div>
  );
}
