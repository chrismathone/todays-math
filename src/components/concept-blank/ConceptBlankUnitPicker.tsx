"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { PaperText } from "./paper/PaperParts";
import s from "./unit-picker.module.css";

export default function ConceptBlankUnitPicker({
  selected,
  children,
}: {
  selected: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={opener}
        type="button"
        className={s.summary}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        aria-label="단원 고르기 열기"
      >
        <span className={s.heading}>
          단원 고르기 <span>{selected.length}개 선택</span>
        </span>
        {selected.length ? (
          <span className={s.selected}>
            {selected.slice(0, 4).map((name, i) => (
              <span key={i}>
                <PaperText text={name} />
              </span>
            ))}
            {selected.length > 4 && (
              <span>외 {selected.length - 4}개 소단원</span>
            )}
          </span>
        ) : (
          <span className={s.empty}>학년·대단원·소단원을 선택하세요.</span>
        )}
        <span className={s.action}>
          {selected.length ? "선택 변경" : "단원 선택"}{" "}
          <span aria-hidden="true">↗</span>
        </span>
      </button>
      {open && (
        <UnitDialog onClose={() => setOpen(false)} returnFocus={opener}>
          {children}
        </UnitDialog>
      )}
    </>
  );
}

function UnitDialog({
  children,
  onClose,
  returnFocus,
}: {
  children: ReactNode;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    doneRef.current?.focus();
    const opener = returnFocus.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>단원 선택</h2>
        <button ref={doneRef} type="button" onClick={onClose}>
          선택 완료
        </button>
      </header>
      <div className={s.body}>{children}</div>
    </dialog>
  );
}
