"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import s from "./StudioProgressStrip.module.css";

export interface StudioProgressSummary {
  id: string;
  label: string;
  done: number;
  total: number;
  active: boolean;
}

/** Stable one-line surface; details never participate in the canvas layout. */
export default function StudioProgressStrip({
  summaries,
  warningCount = 0,
  hasFeedback = false,
  children,
}: {
  summaries: StudioProgressSummary[];
  warningCount?: number;
  hasFeedback?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const hovering = useRef(false);
  const panelId = useId();
  const active = summaries.some((item) => item.active);
  const visible = !!summaries.length || !!warningCount || hasFeedback;

  useLayoutEffect(() => {
    if (!visible || !open || !panel.current) return;
    const popup = panel.current;
    const position = () => {
      if (!root.current) return;
      const bounds = root.current.getBoundingClientRect();
      const width = Math.min(680, bounds.width, window.innerWidth - 16);
      const below = window.innerHeight - bounds.bottom - 12;
      const above = below < 160 && bounds.top > below;
      const maxHeight = Math.max(
        0,
        Math.min(460, above ? bounds.top - 12 : below),
      );
      popup.style.left = `${Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8))}px`;
      popup.style.top = above ? "auto" : `${bounds.bottom}px`;
      popup.style.bottom = above
        ? `${window.innerHeight - bounds.top}px`
        : "auto";
      popup.style.width = `${width}px`;
      popup.style.maxHeight = `${maxHeight}px`;
    };
    position();
    // Native top layer avoids clipping by the editor canvas's overflow boundary,
    // while keeping the Studio's inherited styles and the trigger's DOM ownership.
    if (popup.showPopover) popup.showPopover();
    else popup.removeAttribute("popover");
    const observer = new ResizeObserver(position);
    if (root.current) observer.observe(root.current);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      popup.hidePopover?.();
    };
  }, [open, visible]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        pinned.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  if (!visible) return null;

  return (
    <div
      ref={root}
      className={s.strip}
      data-studio-progress
      // 들어온 사건(pointerenter)이 아니라 움직임으로 연다 — 검수 단계에서 띠가 탭 자리로 올라오면
      // 마우스를 안 움직여도 pointerover 가 들어와 상세 창이 저절로 열렸다(2026-09-19).
      onPointerMove={(event) => {
        if (event.pointerType === "touch" || hovering.current) return;
        hovering.current = true;
        setOpen(true);
      }}
      onPointerLeave={() => {
        hovering.current = false;
        if (!pinned.current && !root.current?.contains(document.activeElement))
          setOpen(false);
      }}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget) &&
          !pinned.current &&
          !hovering.current
        )
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        pinned.current = false;
        trigger.current?.focus({ preventScroll: true });
        setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={s.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`작업 진행 상세 · ${summaries.map((item) => `${item.label} ${item.done}/${item.total}`).join(" · ")}${warningCount ? ` · 확인 필요 ${warningCount}건` : ""}`}
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}
      >
        <span className={s.overall}>
          <span
            className={s.indicator}
            data-active={active}
            aria-hidden="true"
          />
          {active ? "작업 중" : "작업 결과"}
        </span>
        <span className={s.summaries}>
          {summaries.map((item) => (
            <span className={s.summary} key={item.id} data-active={item.active}>
              <span>{item.label}</span>
              <strong>
                {item.done}
                <span className={s.separator}>/</span>
                {item.total}
              </strong>
              <span className={s.track} aria-hidden="true">
                <span
                  style={{
                    width: `${item.total > 0 ? Math.min(100, (item.done / item.total) * 100) : 0}%`,
                  }}
                />
              </span>
            </span>
          ))}
        </span>
        <span className={s.trailing}>
          {warningCount > 0 && (
            <span className={s.warning}>
              <span aria-hidden="true">!</span>
              <span className={s.warningLabel}>확인 필요</span> {warningCount}
            </span>
          )}
          <span className={s.detailLabel}>상세</span>
          <span className={s.chevron} data-open={open} aria-hidden="true">
            ⌄
          </span>
        </span>
      </button>
      {open && (
        <div
          ref={panel}
          popover="manual"
          id={panelId}
          className={s.popover}
          role="region"
          aria-label="작업별 진행 상황"
        >
          {children}
        </div>
      )}
    </div>
  );
}
