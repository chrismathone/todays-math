"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import type { ArithmeticV2CatalogEntry } from "@/lib/arithmetic-v2/types";
import { MathText } from "@/components/math/MathText";
import { arithmeticTypeTitle } from "@/lib/arithmetic-v2/presentation/text";
import { GradeArithmeticExpression as NumericExpression } from "./GradeArithmeticPaper";
import s from "./ArithmeticTypePreview.module.css";

// Keep the hook and closed tooltip independent of the catalog figure renderer.
const PreviewExpression = lazy(() =>
  import("./GradeArithmeticPrompt")
    .then((module) => ({ default: module.GradeArithmeticExpression }))
    .catch(() => ({ default: PreviewUnavailable })),
);

// A failed lazy import is cached for this page; recovery requires a refresh.
function PreviewUnavailable() {
  return (
    <span role="alert">
      예시를 불러오지 못했습니다. 페이지를 새로고침해 주세요.
    </span>
  );
}

/** One example problem beside the hovered catalog card (owner, 2026-10-16).
 * Mouse/pen hover and keyboard focus open it after a short delay; touch never
 * does (the card is tapped to add). Pointer down, leave, blur, Escape, scroll
 * and resize close it, so it never sits under a selection gesture.
 */
export type ArithmeticTypePreviewState = {
  typeId: string;
  anchor: DOMRect;
  /** The hovered card; the preview closes once it leaves the document. */
  element: HTMLElement;
  tooltipId: string;
} | null;

const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 120;
const WIDTH = 320;

/** Selection painting and the preview both listen on the card; run both. */
export function composeHandlers<T extends HTMLElement>(
  ...sets: ReadonlyArray<ButtonHTMLAttributes<T>>
): ButtonHTMLAttributes<T> {
  const merged: Record<string, unknown> = {};
  for (const set of sets)
    for (const [key, value] of Object.entries(set)) {
      const previous = merged[key];
      merged[key] =
        /^on[A-Z]/.test(key) &&
        typeof value === "function" &&
        typeof previous === "function"
          ? (event: unknown) => {
              (previous as (e: unknown) => void)(event);
              (value as (e: unknown) => void)(event);
            }
          : value;
    }
  return merged as ButtonHTMLAttributes<T>;
}

export function useArithmeticTypePreview() {
  const tooltipId = useId();
  const [state, setState] = useState<ArithmeticTypePreviewState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorElement = useRef<HTMLElement | null>(null);
  const keyboard = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    anchorElement.current = null;
  };
  const close = useCallback(() => {
    clear();
    setState(null);
  }, []);
  const openLater = (typeId: string, element: HTMLElement) => {
    clear();
    anchorElement.current = element;
    timer.current = setTimeout(() => {
      timer.current = null;
      // Keep the requested anchor until close/leave, including while React is
      // committing this state and the previous card's effect still exists.
      setState({
        typeId,
        anchor: element.getBoundingClientRect(),
        element,
        tooltipId,
      });
    }, OPEN_DELAY_MS);
  };
  const closeLater = () => {
    clear();
    timer.current = setTimeout(close, CLOSE_DELAY_MS);
  };
  useEffect(() => {
    // Focus opens the preview only when it came from the keyboard; a click
    // focuses the card too, and the preview must not reappear under it.
    const key = (event: KeyboardEvent) => {
      keyboard.current = true;
      if (event.key === "Escape") close();
    };
    const pointer = () => {
      keyboard.current = false;
    };
    const scroll = (event: Event) => {
      // The short-viewport fallback scrolls from the focused card's keys.
      // Scrolling the page or any other container still dismisses the preview.
      if (event.target !== document.getElementById(tooltipId)) close();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", pointer, true);
    // These must cancel a first opening too, before a tooltip state exists.
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      clear();
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("scroll", scroll, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [close, tooltipId]);
  useEffect(() => {
    if (!state) return;
    // A filter change re-renders the grid under a still pointer, so the card
    // never fires pointerleave: close as soon as the pointer is seen anywhere
    // off the card, or the card itself has left the document.
    const off = (event: Event) => {
      // A move to another card can arrive before this old effect is removed.
      // Respect the latest requested anchor until React commits its state.
      const element = anchorElement.current ?? state.element;
      if (
        !element.isConnected ||
        !(event.target instanceof Node) ||
        !element.contains(event.target)
      )
        close();
    };
    document.addEventListener("pointerover", off, true);
    document.addEventListener("pointermove", off, true);
    return () => {
      document.removeEventListener("pointerover", off, true);
      document.removeEventListener("pointermove", off, true);
    };
  }, [state, close]);
  const cardProps = (
    typeId: string,
  ): Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    | "onPointerEnter"
    | "onPointerLeave"
    | "onPointerDown"
    | "onFocus"
    | "onBlur"
    | "aria-describedby"
  > => ({
    onPointerEnter: (event) => {
      if (event.pointerType === "touch") return;
      openLater(typeId, event.currentTarget);
    },
    onPointerLeave: () => {
      if (state?.typeId === typeId) closeLater();
      else clear();
    },
    onPointerDown: close,
    onFocus: (event) => {
      if (keyboard.current) openLater(typeId, event.currentTarget);
    },
    onBlur: () => {
      if (state?.typeId === typeId) closeLater();
      else clear();
    },
    ...(state?.typeId === typeId ? { "aria-describedby": tooltipId } : {}),
  });
  return { state, cardProps, close };
}

function placement(anchor: DOMRect, height = 0): CSSProperties {
  const gap = 8,
    margin = 12;
  const width = Math.min(WIDTH, window.innerWidth - margin * 2);
  const rightFits = anchor.right + gap + width <= window.innerWidth - margin;
  const leftFits = anchor.left - gap - width >= margin;
  const left = rightFits
    ? anchor.right + gap
    : leftFits
      ? anchor.left - gap - width
      : Math.max(
          margin,
          Math.min(anchor.left, window.innerWidth - width - margin),
        );
  const below = anchor.bottom + gap;
  const above = anchor.top - gap - height;
  const preferredTop =
    rightFits || leftFits
      ? anchor.top
      : below + height <= window.innerHeight - margin
        ? below
        : above >= margin
          ? above
          : window.innerHeight - below >= anchor.top - gap
            ? below
            : above;
  return {
    width,
    left,
    top: Math.max(
      margin,
      Math.min(preferredTop, window.innerHeight - margin - height),
    ),
    maxHeight: Math.max(0, window.innerHeight - margin * 2),
  };
}

export function ArithmeticTypePreview({
  state,
  types,
}: {
  state: ArithmeticTypePreviewState;
  types: readonly ArithmeticV2CatalogEntry[];
}) {
  const tooltip = useRef<HTMLDivElement>(null);
  const type = state ? types.find((entry) => entry.id === state.typeId) : null;
  useLayoutEffect(() => {
    const element = tooltip.current;
    if (!state || !element) return;
    let active = true;
    const measure = () => {
      if (!active || !element.isConnected) return;
      // Layout writes stay on this portal node: no state update can reopen a
      // cancelled hover. Measure again after lazy content, images or fonts grow.
      element.style.top = `${placement(state.anchor, element.getBoundingClientRect().height).top}px`;
      element.dataset.overflow = String(
        element.scrollHeight > element.clientHeight,
      );
    };
    element.scrollTop = 0;
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(element);
    // A capped tooltip no longer resizes, but its natural content still does.
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    element.addEventListener("load", measure, true);
    const scrollByKey = (event: KeyboardEvent) => {
      if (
        !state.element.contains(document.activeElement) ||
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        element.scrollHeight <= element.clientHeight
      )
        return;
      const page = element.clientHeight * 0.8;
      const distances: Record<string, number | undefined> = {
        ArrowDown: 40,
        ArrowUp: -40,
        PageDown: page,
        PageUp: -page,
        Home: -element.scrollHeight,
        End: element.scrollHeight,
      };
      const distance = distances[event.key];
      if (distance === undefined) return;
      event.preventDefault();
      element.scrollTop = Math.max(
        0,
        Math.min(
          element.scrollTop + distance,
          element.scrollHeight - element.clientHeight,
        ),
      );
    };
    document.addEventListener("keydown", scrollByKey);
    return () => {
      active = false;
      observer?.disconnect();
      element.removeEventListener("load", measure, true);
      document.removeEventListener("keydown", scrollByKey);
    };
  }, [state, type]);
  if (
    !state ||
    !type ||
    !state.element.isConnected ||
    typeof document === "undefined"
  )
    return null;
  return createPortal(
    <div
      ref={tooltip}
      role="tooltip"
      id={state.tooltipId}
      className={s.preview}
      style={placement(state.anchor)}
    >
      <div>
        {/* div, not p: MathText renders block elements (p > div is invalid HTML). */}
        <div className={s.title}>
          <MathText text={arithmeticTypeTitle(type.title)} />
        </div>
        <div className={s.caption}>
          예시 · {type.domainSize.toLocaleString("ko-KR")}문항 중 1
          <span className={s.scrollHint}>
            {" · 유형에 초점을 두고 ↑↓ / Page Up·Down으로 예시 이동"}
          </span>
        </div>
        <div className={s.body}>
          {type.example.layout !== "math" ||
          (!type.example.figureId && type.example.answerUnit === undefined) ? (
            <NumericExpression prompt={type.example} />
          ) : (
            <Suspense
              fallback={<span role="status">예시를 불러오는 중입니다.</span>}
            >
              <PreviewExpression prompt={type.example} typeId={type.id} />
            </Suspense>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
