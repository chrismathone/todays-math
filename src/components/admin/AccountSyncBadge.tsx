"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { AccountSyncStatus } from "@/contracts/accountAccess.contract";
import s from "./AccountSyncBadge.module.css";

export default function AccountSyncBadge({
  sync,
}: {
  sync?: AccountSyncStatus;
}) {
  const linked = sync?.status === "linked" && Boolean(sync.branchName);
  const message = linked
    ? `${sync!.branchName}과 연동됨${sync?.reason ? `. ${sync.reason}` : ""}`
    : (sync?.reason ?? "에이와에 연결되지 않은 계정입니다.");
  const tooltipId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const [open, setOpen] = useState(false);

  function cancelHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }
  function show() {
    cancelHide();
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(280, window.innerWidth - 24);
    setPosition({
      width,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      ...(rect.bottom + 100 > window.innerHeight
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
    setOpen(true);
  }
  function hideAfterPointerLeave() {
    cancelHide();
    if (document.activeElement !== trigger.current)
      hideTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const hide = () => setOpen(false);
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !tooltip.current?.contains(event.target)
      )
        hide();
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hide();
      }
    };
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", dismiss, true);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", dismiss, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={s.badge}
        data-linked={linked}
        aria-label={linked ? "에이와 연동됨" : "에이와 미연동"}
        aria-describedby={open ? tooltipId : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") show();
        }}
        onPointerLeave={hideAfterPointerLeave}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={show}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          {linked ? (
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          ) : (
            <>
              <path
                d="m15 7 2-2a4 4 0 0 1 6 6l-2 2M9 17l-2 2a4 4 0 0 1-6-6l2-2"
                transform="translate(1 0) scale(.92)"
              />
              <path d="M12 3v3M18 12h3M3 12h3M12 18v3M3 3l18 18" />
            </>
          )}
        </svg>
      </button>
      {open
        ? createPortal(
            <span
              ref={tooltip}
              id={tooltipId}
              role="tooltip"
              className={s.tooltip}
              style={position}
              onPointerEnter={cancelHide}
              onPointerLeave={hideAfterPointerLeave}
            >
              {message}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
