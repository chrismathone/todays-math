"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { RefObject } from "react";
import { FadingMath } from "./FadingMath";
import s from "./fading.module.css";

export function useFadingKeyboard({
  disabled,
  onChoose,
  onAdvance,
  onMove,
  onClear,
}: {
  disabled: boolean;
  onChoose: (index: number) => void;
  onAdvance: () => void;
  onMove: (direction: -1 | 1) => void;
  onClear: () => void;
}) {
  const handleKey = useEffectEvent((event: KeyboardEvent) => {
    if (
      disabled ||
      event.defaultPrevented ||
      event.repeat ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.isComposing ||
      event.keyCode === 229 ||
      document.querySelector('dialog[open], [role="dialog"]')
    )
      return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input,textarea,select,[contenteditable="true"]')
    )
      return;
    const digit = /^(Digit|Numpad)[0-9]$/.test(event.code)
      ? event.code.slice(-1)
      : /^[0-9]$/.test(event.key)
        ? event.key
        : null;
    if (digit !== null) {
      event.preventDefault();
      onChoose(
        (digit === "0" ? 9 : Number(digit) - 1) + (event.shiftKey ? 10 : 0),
      );
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      !(target instanceof Element && target.closest("button,a"))
    ) {
      event.preventDefault();
      onAdvance();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      onMove(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Escape" || event.key === "Backspace") {
      event.preventDefault();
      onClear();
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
}

/**
 * 빈칸의 크기를 정하는 방식 — 원장님 결정(2026-10-06): **전부 같게**(`uniform`).
 * 그 단계의 칩 판에서 가장 넓고 가장 높은 칩의 크기를 모든 빈칸이 쓴다. 채운 뒤에도 그 크기 그대로라 줄바꿈이 바뀌지 않는다.
 * `answer`(그 빈칸의 답 크기)로 두면 문장은 더 자연스럽지만, 크기가 같은 칩을 눈으로 짝지을 수 있다 — 답의 길이가 샌다.
 */
export const FADING_BLANK_WIDTH_MODE: "answer" | "uniform" = "uniform";
type SlotSize = { width: number; height: number };
export function fadingChipChoices(
  tray: readonly { id: string; text: string }[],
  used: ReadonlySet<string>,
) {
  const choices = new Map<
    string,
    { id: string; text: string; chipId: string | null }
  >();
  for (const chip of tray) {
    const choice = choices.get(chip.text) ?? {
      id: chip.id,
      text: chip.text,
      chipId: null,
    };
    if (choice.chipId === null && !used.has(chip.id)) choice.chipId = chip.id;
    choices.set(chip.text, choice);
  }
  return [...choices.values()];
}
/** Input is a shortcut for choosing a visible chip, not a second grading rule. */
export function fadingChipInputText(text: string): string {
  return text
    .replace(/\$/g, "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    .replace(/\s+/g, "");
}
export function fadingBlankSize(
  answer: SlotSize,
  sizes: Iterable<SlotSize>,
  mode: "answer" | "uniform" = FADING_BLANK_WIDTH_MODE,
): SlotSize {
  if (mode === "answer") return { width: answer.width, height: answer.height };
  const all = [answer, ...sizes];
  return {
    width: Math.max(...all.map((size) => size.width)),
    height: Math.max(...all.map((size) => size.height)),
  };
}

/** 이미 보이는 칩의 조판만 재서 빈칸과 채운 자리의 크기를 같게 둔다. */
export function useFadingBlankSize({
  root,
  targets,
  tray,
  step,
}: {
  root: RefObject<HTMLDivElement | null>;
  targets: readonly { id: string; text: string }[];
  tray: readonly { id: string; text: string }[];
  step: number;
}) {
  const measurements = useRef<{ key: string; sizes: Map<string, SlotSize> }>({
    key: "",
    sizes: new Map(),
  });
  const fit = useEffectEvent(() => {
    const node = root.current;
    if (!node) return;
    const key = JSON.stringify([step, tray]);
    if (measurements.current.key !== key)
      measurements.current = { key, sizes: new Map() };
    const sizes = measurements.current.sizes;
    for (const text of node.querySelectorAll<HTMLElement>(
      "[data-fading-chip-text]",
    )) {
      const box = text.getBoundingClientRect();
      if (box.width)
        sizes.set(text.dataset.fadingChipText!, {
          width: Math.max(
            44,
            Math.ceil(Math.max(box.width, text.scrollWidth)) + 24,
          ),
          height: Math.max(
            44,
            Math.ceil(Math.max(box.height, text.scrollHeight)) + 16,
          ),
        });
    }
    for (const slot of node.querySelectorAll<HTMLElement>(
      "[data-fading-slot]",
    )) {
      const target = targets.find(
        (item) => item.id === slot.dataset.fadingSlot,
      );
      const chip =
        target &&
        tray.find(
          (item) => item.text === target.text.trim().replace(/\s+/g, " "),
        );
      const answer = chip && sizes.get(chip.id);
      if (answer) {
        const size = fadingBlankSize(answer, sizes.values());
        slot.style.setProperty("--slot-width", `${size.width}px`);
        slot.style.setProperty("--slot-height", `${size.height}px`);
      }
    }
  });
  useLayoutEffect(() => {
    fit();
  });
  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (alive) fit();
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (root.current) observer?.observe(root.current);
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      alive = false;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [root, step]);
}

export function useFadingPendingScroll(
  root: RefObject<HTMLDivElement | null>,
  pending: string | null,
  enabled: boolean,
) {
  const scrolledAt = useRef(0);
  const followingUntil = useRef(0);
  useEffect(() => {
    const scrolling = () => {
      if (Date.now() > followingUntil.current) scrolledAt.current = Date.now();
    };
    const userScroll = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-fading-chip]")
      )
        return;
      scrolledAt.current = Date.now();
      followingUntil.current = 0;
    };
    document.addEventListener("scroll", scrolling, {
      capture: true,
      passive: true,
    });
    document.addEventListener("wheel", userScroll, { passive: true });
    document.addEventListener("touchmove", userScroll, { passive: true });
    return () => {
      document.removeEventListener("scroll", scrolling, true);
      document.removeEventListener("wheel", userScroll);
      document.removeEventListener("touchmove", userScroll);
    };
  }, []);
  useEffect(() => {
    if (!enabled || !pending || Date.now() - scrolledAt.current < 1000) return;
    const blank = Array.from(
      root.current?.querySelectorAll<HTMLElement>("[data-fading-blank]") ?? [],
    ).find((node) => node.dataset.fadingBlank === pending);
    if (!blank) return;
    const box = blank.getBoundingClientRect();
    if (!box.width || (box.top >= 12 && box.bottom <= window.innerHeight - 80))
      return;
    followingUntil.current = Date.now() + 1000;
    blank.scrollIntoView?.({
      block: "center",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [root, pending, enabled]);
}

type DragState = { chipId: string; text: string; x: number; y: number };
export function useFadingChipDrag({
  disabled,
  onPlace,
}: {
  disabled: boolean;
  onPlace: (targetId: string, chipId: string) => void;
}) {
  const pointer = useRef<
    (DragState & { pointerId: number; moving: boolean }) | null
  >(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [over, setOver] = useState<string | null>(null);
  function blankAt(x: number, y: number) {
    const blank = document
      .elementFromPoint(x, y)
      ?.closest<HTMLButtonElement>("[data-fading-blank]");
    return blank && !blank.disabled
      ? (blank.dataset.fadingBlank ?? null)
      : null;
  }
  function reset() {
    if (pointer.current?.moving) suppressClick.current = true;
    pointer.current = null;
    setDrag(null);
    setOver(null);
  }
  useEffect(() => {
    if (!drag || disabled) return;
    let frame: number;
    const scroll = () => {
      const edge = 48;
      const amount =
        drag.y < edge ? -10 : drag.y > window.innerHeight - edge ? 10 : 0;
      if (amount) {
        window.scrollBy({ top: amount, behavior: "instant" });
        setOver(blankAt(drag.x, drag.y));
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [drag, disabled]);
  return {
    drag,
    over,
    consumeClick() {
      const suppressed = suppressClick.current;
      suppressClick.current = false;
      return suppressed;
    },
    handlers(chipId: string, text: string, unavailable: boolean) {
      return {
        onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
          if (disabled || unavailable || event.button !== 0) return;
          suppressClick.current = false;
          pointer.current = {
            chipId,
            text,
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            moving: false,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        },
        onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
          const current = pointer.current;
          if (!current || current.pointerId !== event.pointerId) return;
          if (
            !current.moving &&
            Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6
          )
            return;
          current.moving = true;
          suppressClick.current = true;
          event.preventDefault();
          setDrag({ chipId, text, x: event.clientX, y: event.clientY });
          setOver(blankAt(event.clientX, event.clientY));
        },
        onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
          const current = pointer.current;
          if (!current || current.pointerId !== event.pointerId) return;
          const targetId = current.moving
            ? blankAt(event.clientX, event.clientY)
            : null;
          reset();
          if (!disabled && targetId) onPlace(targetId, chipId);
        },
        onPointerCancel: reset,
        onLostPointerCapture: reset,
      };
    },
  };
}

export function FadingDraggedChip({ drag }: { drag: DragState | null }) {
  return (
    drag && (
      <div
        className={s.draggedChip}
        style={{ left: drag.x, top: drag.y }}
        aria-hidden="true"
      >
        <FadingMath text={drag.text} />
      </div>
    )
  );
}
