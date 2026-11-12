"use client";

import type { HTMLAttributes, ReactNode } from "react";
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
  return (
    <div className={s.shell}>
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
                  <div className={s.toolbar}>
                    {editable.toolbar?.(page)}
                    {page.enlargeLabel !== undefined && (
                      <button
                        type="button"
                        className={s.select}
                        aria-label={page.enlargeLabel}
                        title="크게 보기"
                        aria-pressed={page.key === editable.selectedKey}
                        disabled={busy}
                        onClick={() => editable.onSelect(page.key)}
                      >
                        <span aria-hidden="true">⤢</span>
                      </button>
                    )}
                  </div>
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
