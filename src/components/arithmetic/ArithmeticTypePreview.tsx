"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
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
  const pendingElement = useRef<HTMLElement | null>(null);
  const keyboard = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingElement.current = null;
  };
  const close = useCallback(() => {
    clear();
    setState(null);
  }, []);
  const openLater = (typeId: string, element: HTMLElement) => {
    clear();
    pendingElement.current = element;
    timer.current = setTimeout(() => {
      timer.current = null;
      pendingElement.current = null;
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
    const key = () => {
      keyboard.current = true;
    };
    const pointer = () => {
      keyboard.current = false;
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => {
      clear();
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", pointer, true);
    };
  }, []);
  useEffect(() => {
    if (!state) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // A filter change re-renders the grid under a still pointer, so the card
    // never fires pointerleave: close as soon as the pointer is seen anywhere
    // off the card, or the card itself has left the document.
    const off = (event: Event) => {
      // A move to another card can arrive before this old effect is removed.
      // Respect that card's pending opening instead of cancelling its timer.
      const element = pendingElement.current ?? state.element;
      if (
        !element.isConnected ||
        !(event.target instanceof Node) ||
        !element.contains(event.target)
      )
        close();
    };
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    document.addEventListener("keydown", dismiss, true);
    document.addEventListener("pointerover", off, true);
    document.addEventListener("pointermove", off, true);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", dismiss, true);
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

function placement(anchor: DOMRect): CSSProperties {
  const gap = 8,
    margin = 12;
  const width = Math.min(WIDTH, window.innerWidth - margin * 2);
  const left =
    anchor.right + gap + width <= window.innerWidth - margin
      ? anchor.right + gap
      : anchor.left - gap - width >= margin
        ? anchor.left - gap - width
        : Math.max(
            margin,
            Math.min(anchor.left, window.innerWidth - width - margin),
          );
  const beside =
    left !==
      Math.max(
        margin,
        Math.min(anchor.left, window.innerWidth - width - margin),
      ) || anchor.right + gap + width <= window.innerWidth - margin;
  return {
    width,
    left,
    ...(beside
      ? {
          top: Math.max(margin, Math.min(anchor.top, window.innerHeight - 260)),
        }
      : anchor.bottom + 240 > window.innerHeight
        ? { bottom: window.innerHeight - anchor.top + gap }
        : { top: anchor.bottom + gap }),
  };
}

export function ArithmeticTypePreview({
  state,
  types,
}: {
  state: ArithmeticTypePreviewState;
  types: readonly ArithmeticV2CatalogEntry[];
}) {
  const type = state ? types.find((entry) => entry.id === state.typeId) : null;
  if (
    !state ||
    !type ||
    !state.element.isConnected ||
    typeof document === "undefined"
  )
    return null;
  return createPortal(
    <div
      role="tooltip"
      id={state.tooltipId}
      className={s.preview}
      style={placement(state.anchor)}
    >
      {/* div, not p: MathText renders block elements (p > div is invalid HTML). */}
      <div className={s.title}>
        <MathText text={arithmeticTypeTitle(type.title)} />
      </div>
      <div className={s.caption}>
        예시 · {type.domainSize.toLocaleString("ko-KR")}문항 중 1
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
    </div>,
    document.body,
  );
}
