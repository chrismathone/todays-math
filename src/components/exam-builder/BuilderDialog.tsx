"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import s from "./ExamBuilder.module.css";

export default function BuilderDialog({
  title,
  onClose,
  width,
  focusSelectedRadio = false,
  children,
}: {
  title: string;
  onClose: () => void;
  width?: number;
  focusSelectedRadio?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    if (focusSelectedRadio)
      dialog
        ?.querySelector<HTMLInputElement>('input[type="radio"]:checked')
        ?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [focusSelectedRadio]);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      style={width ? { width } : undefined}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className={s.dialogHeader}>
        <h2 id={titleId}>{title}</h2>
        <button type="button" onClick={onClose}>
          닫기
        </button>
      </header>
      {children}
    </dialog>
  );
}
