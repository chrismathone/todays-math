"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import s from "./picker-dialog.module.css";

/**
 * 고르기 창의 틀 — 화면에는 «지금 고른 것» 한 줄과 단추 하나만 두고, 긴 목록은 이 창에서 고른다.
 *
 * 개념 백지의 «단원 고르기»에서 떼어 냈다(원장님 2026-10-07 «비슷한 류는 하나의 방식으로 묶기»). 단추 수십 개를 화면에 펼치지 않는다.
 * 지금 쓰는 곳: 개념 백지의 단원 고르기 · 교재 제작 완성 보기의 내용 고르기 · 문제은행의 출처 고르기(D-161 H1).
 * 열면 닫기 단추에 초점이 가고, 닫으면 연 단추로 돌아간다.
 */
export function PickerDialog({
  title,
  doneLabel = "닫기",
  onClose,
  onCancel,
  returnFocus,
  children,
}: {
  title: string;
  /** 머리의 닫기 단추 글. */
  doneLabel?: string;
  /** 머리의 단추(`doneLabel`)를 눌렀을 때. `onCancel` 이 없으면 Esc 도 이것을 부른다. */
  onClose: () => void;
  /**
   * Esc 로 닫았을 때 — 고른 것을 **버리는** 창이 따로 받는다(문제은행 «출처 고르기» ⑷: [적용]을 눌러야 걸리고
   * Esc 는 버린다). 주지 않으면 지금처럼 `onClose` 와 같다(바로 걸리는 창 — 개념 백지 단원 고르기 등).
   */
  onCancel?: () => void;
  /** 창을 연 단추 — 닫으면 초점이 돌아간다. */
  returnFocus: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
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
        (onCancel ?? onClose)();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button ref={doneRef} type="button" onClick={onClose}>
          {doneLabel}
        </button>
      </header>
      <div className={s.body}>{children}</div>
    </dialog>
  );
}
