import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from "react";
import styles from "./StudioFigureEditor.module.css";

/** Local modal adapter for the Mathgen editor; restores focus and confines Tab. */
export function ModalShell({
  onClose,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDialogElement> & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        latestClose.current();
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]',
        ) ?? []),
      ].filter(
        (node) =>
          !node.closest("[hidden], [inert]") &&
          (!node.closest("details:not([open])") || node.tagName === "SUMMARY"),
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={styles.backdrop}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        {...props}
        ref={dialog}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`${styles.dialog} ${className}`}
      >
        {children}
      </dialog>
    </div>
  );
}

export function Btn({
  kind,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "ghost" | "accent" }) {
  return (
    <button
      type="button"
      {...props}
      className={`${styles.button} ${kind === "accent" ? styles.primary : ""} ${className}`}
    />
  );
}
