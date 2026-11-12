"use client";

import {
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { PaperStripPage, PaperStripProps } from "./PaperStrip";
import s from "./editable-paper-strip.module.css";

export type PaperStripItemProps = HTMLAttributes<HTMLElement> & {
  "data-excluded"?: boolean;
  "data-dragging"?: boolean;
  "data-drop"?: "before" | "after";
};

/** Presentation slots keep page-order and other document rules in the caller. */
export type PaperStripEditable = {
  selectedKey: string | null;
  onSelect: (key: string) => void;
  aside: ReactNode;
  before?: ReactNode;
  toolbar?: (page: PaperStripPage) => ReactNode;
  /** Native card selection button; independent retry/remove buttons stay above it. */
  selectionProps?: (
    page: PaperStripPage,
  ) => ButtonHTMLAttributes<HTMLButtonElement>;
  overlay?: (page: PaperStripPage) => ReactNode;
  itemProps?: (page: PaperStripPage) => PaperStripItemProps;
};

export function EditablePaperStrip({
  pages,
  hint,
  id,
  busy = false,
  label = "지면 미리보기",
  editable,
}: PaperStripProps & { editable: PaperStripEditable }) {
  const shellRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const measure = () => {
      if (!shell.getClientRects().length) return;
      shell.style.setProperty(
        "--paper-editor-top",
        `${Math.ceil(shell.getBoundingClientRect().top)}px`,
      );
      let bottom = 0;
      for (let node = shell.parentElement; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        bottom +=
          (parseFloat(style.paddingBottom) || 0) +
          (parseFloat(style.marginBottom) || 0);
      }
      shell.style.setProperty(
        "--paper-editor-bottom",
        `${Math.ceil(bottom)}px`,
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    for (let node: HTMLElement | null = shell; node; node = node.parentElement)
      observer?.observe(node);
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
    };
  }, []);
  return (
    <div className={s.shell} ref={shellRef}>
      <div className={s.split}>
        <div className={s.work}>
          {editable.before}
          {hint && <p className={s.hint}>{hint}</p>}
          <div
            id={id}
            className={s.grid}
            role="region"
            aria-label={label}
            aria-busy={busy}
            tabIndex={0}
          >
            {pages.map((page) => {
              const itemProps = editable.itemProps?.(page);
              const selectionProps = editable.selectionProps?.(page);
              return (
                <figure
                  key={page.key}
                  {...itemProps}
                  className={`${s.card} ${itemProps?.className ?? ""}`}
                  data-strip-key={page.key}
                  data-selected={page.key === editable.selectedKey}
                >
                  <div className={s.thumbnail}>
                    <div className={s.visual}>
                      {page.node}
                      <span className={s.ribbon} aria-hidden="true" />
                    </div>
                    <div className={s.overlay}>{editable.overlay?.(page)}</div>
                  </div>
                  {page.enlargeLabel !== undefined && (
                    <button
                      {...selectionProps}
                      type="button"
                      className={s.select}
                      aria-label={
                        selectionProps?.["aria-label"] ?? page.enlargeLabel
                      }
                      aria-pressed={page.key === editable.selectedKey}
                      disabled={busy}
                      onClick={(event) => {
                        selectionProps?.onClick?.(event);
                        if (!event.defaultPrevented)
                          editable.onSelect(page.key);
                      }}
                    />
                  )}
                  <div className={s.toolbar}>{editable.toolbar?.(page)}</div>
                  <figcaption className={s.caption}>{page.caption}</figcaption>
                </figure>
              );
            })}
          </div>
        </div>
        <aside className={s.aside} aria-label="선택한 쪽">
          {editable.aside}
        </aside>
      </div>
    </div>
  );
}
