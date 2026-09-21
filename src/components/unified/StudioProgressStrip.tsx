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

/** 상세 창이 띠보다 좁아지지 않게 둘 폭 — 진행 칸 한 줄(이름표·설명·셈·경과·취소)과 경고 두 줄이
 * 쪼개지지 않고 들어가는 폭을 실제 브라우저에서 재서 정했다(트랙 40, 2026-09-21). */
const DETAIL_MIN_WIDTH = 480;
const DETAIL_MAX_WIDTH = 680;
const EDGE = 8;

/**
 * 상세 창의 폭과 자리. 원장님 2026-09-21 «하단 펼쳐지는 영역은 원본 영역보다 커도 될거같으니까».
 * 검수 줄의 띠는 줄 오른쪽 끝에서 150~300px 이다 — 예전처럼 띠 폭에 가두면 진행 칸 이름이
 * 한 글자씩 세로로 쪼개졌다. 그래서 폭은 띠보다 넓어도 되고(최소 480px), 오른쪽에 자리가 없으면
 * 오른쪽 끝을 띠에 맞춰 왼쪽으로 편다. 어떤 경우에도 화면 좌우 8px 안에 머문다.
 */
export function progressDetailPlacement(
  bounds: {
    left: number;
    right: number;
    width: number;
    top: number;
    bottom: number;
  },
  viewport: { width: number; height: number },
) {
  const room = viewport.width - EDGE * 2;
  const width = Math.max(
    0,
    Math.min(DETAIL_MAX_WIDTH, room, Math.max(bounds.width, DETAIL_MIN_WIDTH)),
  );
  const fitsRight = bounds.left + width <= viewport.width - EDGE;
  const left = fitsRight
    ? bounds.left
    : Math.min(bounds.right, viewport.width - EDGE) - width;
  const below = viewport.height - bounds.bottom - 12;
  const above = below < 160 && bounds.top > below;
  const maxHeight = Math.max(0, Math.min(460, above ? bounds.top - 12 : below));
  const placedLeft = Math.max(
    EDGE,
    Math.min(left, viewport.width - EDGE - width),
  );
  return {
    left: placedLeft,
    width,
    above,
    maxHeight,
    /** 띠 밖으로 나간 쪽 — 그쪽 위 모서리만 둥글게 한다(띠에 붙은 곳은 각지게). */
    overhangStart: placedLeft < bounds.left - 0.5,
    overhangEnd: placedLeft + width > bounds.right + 0.5,
  };
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
      const placed = progressDetailPlacement(bounds, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      popup.style.left = `${placed.left}px`;
      popup.style.top = placed.above ? "auto" : `${bounds.bottom}px`;
      popup.style.bottom = placed.above
        ? `${window.innerHeight - bounds.top}px`
        : "auto";
      popup.style.width = `${placed.width}px`;
      popup.style.maxHeight = `${placed.maxHeight}px`;
      popup.toggleAttribute("data-overhang-start", placed.overhangStart);
      popup.toggleAttribute("data-overhang-end", placed.overhangEnd);
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
      // 들어올 때는 표지만 푼다 — 상세 창 안에서 Esc 로 닫으면 창이 DOM 에서 빠져 크롬이 pointerleave 를
      // 안 보낸다. 표지가 켜진 채 남으면 다시 들어와 움직여도 안 열렸다(e2e progress-strip, 2026-09-19).
      onPointerEnter={() => {
        hovering.current = false;
      }}
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
          {/* 글자에 표를 붙여 둔다 — 검수 줄은 좁아서 이 말을 빼고 점·화살표만 남긴다
              (원장님 2026-09-20 «상단 열을 줄여서»). 읽는 이름은 trigger 의 aria-label 이 그대로 나른다. */}
          <span data-strip-overall>{active ? "작업 중" : "작업 결과"}</span>
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
              <span className={s.warningLabel} data-strip-warning-label>
                확인 필요
              </span>{" "}
              {warningCount}
            </span>
          )}
          <span className={s.detailLabel} data-strip-detail>
            상세
          </span>
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
