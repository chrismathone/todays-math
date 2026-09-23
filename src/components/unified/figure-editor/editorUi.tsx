import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
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
    const currentDialog = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (currentDialog && typeof currentDialog.showModal === "function")
      currentDialog.showModal();
    else currentDialog?.setAttribute("open", "");
    currentDialog?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        latestClose.current();
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...(currentDialog?.querySelectorAll<HTMLElement>(
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
        currentDialog?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === currentDialog)
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
      if (currentDialog?.open && typeof currentDialog.close === "function")
        currentDialog.close();
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={styles.backdrop}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <dialog
        {...props}
        ref={dialog}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`${styles.dialog} ${className}`}
        onCancel={(event) => {
          event.preventDefault();
          latestClose.current();
        }}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          ) {
            event.preventDefault();
            latestClose.current();
          }
        }}
      >
        {children}
      </dialog>
    </div>
  );
}

/**
 * 서식을 켜고 끄는 단추(기울임·굵게)의 모양 — 켜짐은 **반전**(원장님 2026-09-19 «기울임이 적용이 되었는데도 된 건지
 * 안 된 건지 시각적인 게 없어. 적용되었으면 반전을 줘»). 여러 글자에 섞여 있으면 옅은 강조(반전 아님), 꺼짐은 전과 같다.
 */
export const formatToggleClass = (state: boolean | "mixed") =>
  `border rounded px-2 py-1 ${
    state === true
      ? "border-[var(--figure-primary)] bg-[var(--figure-primary)] text-white"
      : state === "mixed"
        ? "border-[var(--figure-accent-line)] bg-[var(--figure-accent-soft)] text-[var(--figure-accent-ink)]"
        : "border-control"
  }`;

/** `#rrggbb` 이면 그 값, 아니면 null — 글자 배경색은 이 꼴만 그린다(`textBackgroundColor`). */
export const hexColor = (value: string | null | undefined) =>
  value && /^#[\da-f]{6}$/i.test(value) ? value : null;

/** 채우기가 «없음»인가 — 칸이 없거나 `none`·`transparent`. */
export const noFill = (fill: string | null | undefined) =>
  !fill || fill === "none" || fill === "transparent";

/**
 * «없음» 칸의 값 — 흰색과 눈으로는 같지만 **흰색이 아니다.** 흰색(#ffffff)으로 두면 흰색을 골랐을 때 값이 안 바뀌어
 * 브라우저가 변경을 알리지 않는다 — 치수선 글자에 흰 배경을 주려던 원장님이 흰색을 못 고른다.
 */
const NONE_SWATCH = "#fefefe";

/**
 * 색 칸 — 색이 «없음»이면 흰 칸에 빨간 사선을 긋는다(원장님 2026-09-22 «배경색이 흰색인지 없음인지 헷갈림.
 * 없을때 구분 확실하게» · 한글의 «색 없음» 표시). 사선은 누름을 가로채지 않아 칸을 누르면 그대로 색을 고른다.
 */
export function ColorInput({
  none,
  value,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> & {
  none: boolean;
  value: string;
}) {
  return (
    <span className="relative inline-flex">
      <input
        type="color"
        {...props}
        value={none ? NONE_SWATCH : value}
        data-none={none ? "" : undefined}
        title={none ? "색 없음" : undefined}
      />
      {none && (
        <svg
          aria-hidden="true"
          data-color-none=""
          viewBox="0 0 10 10"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <line
            x1="0.5"
            y1="9.5"
            x2="9.5"
            y2="0.5"
            stroke="#d92d20"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </span>
  );
}

/** 글자 요소가 굵은가 — 조판(`typesetFigureSvg`)과 같은 기준: `bold` 또는 600 이상. */
export const isBoldWeight = (weight: string | undefined) =>
  weight === "bold" || Number(weight) >= 600;

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
