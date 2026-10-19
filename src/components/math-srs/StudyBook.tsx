"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  JOURNEY_THEMES,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";
import b from "./study-book.module.css";

export type StudyBookProps = {
  theme?: JourneyThemeId;
  leftTitle: string;
  rightTitle: string;
  left: ReactNode;
  right: ReactNode;
  onPageChange?: (page: number) => void;
};

export function StudyBook({
  theme = "classic",
  leftTitle,
  rightTitle,
  left,
  right,
  onPageChange,
}: StudyBookProps) {
  const [page, setPage] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const image = JOURNEY_THEMES[theme].boardImage;
  function turn(next: number) {
    if (next === page) return;
    setPage(next);
    onPageChange?.(next);
  }
  return (
    <div
      className={b.book}
      style={
        image
          ? ({ "--study-theme": `url("${image}")` } as CSSProperties)
          : undefined
      }
    >
      <div className={b.tabs} role="group" aria-label="책의 두 면">
        {[leftTitle, rightTitle].map((label, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={page === index}
            aria-controls={`${id}-${index}`}
            onClick={() => turn(index)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={b.spread}
        data-testid="study-spread"
        data-page={page}
        onTouchStart={(event) => {
          const first = event.touches[0];
          touch.current = first ? { x: first.clientX, y: first.clientY } : null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const first = event.changedTouches[0];
          const from = touch.current;
          touch.current = null;
          if (!first || !from) return;
          const dx = first.clientX - from.x;
          const dy = first.clientY - from.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
            turn(dx < 0 ? 1 : 0);
        }}
      >
        <section
          id={`${id}-0`}
          className={b.leaf}
          data-leaf="0"
          aria-label={leftTitle}
        >
          <div className={b.band} />
          <div className={b.content}>
            <p className={b.pageTitle}>{leftTitle}</p>
            {left}
            <button type="button" className={b.turn} onClick={() => turn(1)}>
              {rightTitle} 보기
            </button>
          </div>
        </section>
        <section
          id={`${id}-1`}
          className={b.leaf}
          data-leaf="1"
          aria-label={rightTitle}
        >
          <div className={b.band} />
          <div className={b.content}>
            <h2 className={b.pageTitle}>{rightTitle}</h2>
            {right}
            <button type="button" className={b.turn} onClick={() => turn(0)}>
              {leftTitle} 보기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
