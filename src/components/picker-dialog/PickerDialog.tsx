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
 * 지금 쓰는 곳: 개념 백지의 단원 고르기 · 교재 제작 완성 보기의 내용 고르기 · 문제은행의 출처 고르기(D-161 H1) ·
 * 시험지 만들기의 «구성 조건»(W4 — 머리 단추 둘 · 내용만큼의 높이)과 «문항 교체»(W3 — 밝은 닫기 · 바닥 줄).
 * 열면 닫기 단추에 초점이 가고, 닫으면 연 단추로 돌아간다.
 */
export function PickerDialog({
  title,
  doneLabel = "닫기",
  doneDisabled = false,
  doneTone = "primary",
  cancelLabel,
  onClose,
  onCancel,
  returnFocus,
  footer,
  size = "fill",
  children,
}: {
  title: string;
  /** 머리의 닫기 단추 글. */
  doneLabel?: string;
  /** 머리 단추를 끈다 — 적용을 막는 까닭이 창 안에 있을 때(W4 «구성 조건»). */
  doneDisabled?: boolean;
  /** 머리 단추의 꼴 — 기본은 강조(적용 · 닫기). 고르기를 바닥에서 하는 창은 밝은 단추(W3 교체). */
  doneTone?: "primary" | "plain";
  /**
   * 주면 머리에 단추가 하나 더 선다(밝은 꼴 · 머리 단추 앞) — 누르면 `onCancel`(없으면 `onClose`).
   * [취소] [적용]처럼 «버리기»와 «걸기»를 둘 다 머리에 두는 창(W4)이 쓴다.
   */
  cancelLabel?: string;
  /** 머리의 단추(`doneLabel`)를 눌렀을 때. `onCancel` 이 없으면 Esc 도 이것을 부른다. */
  onClose: () => void;
  /**
   * Esc 로 닫았을 때 — 고른 것을 **버리는** 창이 따로 받는다(문제은행 «출처 고르기» ⑷: [적용]을 눌러야 걸리고
   * Esc 는 버린다). 주지 않으면 지금처럼 `onClose` 와 같다(바로 걸리는 창 — 개념 백지 단원 고르기 등).
   */
  onCancel?: () => void;
  /** 창을 연 단추 — 닫으면 초점이 돌아간다. */
  returnFocus: RefObject<HTMLButtonElement | null>;
  /** 창 바닥 줄 — 규칙 한 줄과 [취소] 같은 것(W3 교체). */
  footer?: ReactNode;
  /** `fill` 은 지금처럼 높이를 채운다(긴 목록). `fit` 은 내용만큼 — 넘치면 몸통만 스크롤(W4). */
  size?: "fill" | "fit";
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
  const done = (
    <button
      ref={doneRef}
      type="button"
      data-tone={doneTone}
      disabled={doneDisabled}
      onClick={onClose}
    >
      {doneLabel}
    </button>
  );
  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      data-size={size}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        (onCancel ?? onClose)();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        {cancelLabel ? (
          <div className={s.headActions}>
            <button
              type="button"
              data-tone="plain"
              onClick={onCancel ?? onClose}
            >
              {cancelLabel}
            </button>
            {done}
          </div>
        ) : (
          done
        )}
      </header>
      <div className={s.body}>{children}</div>
      {footer && <footer className={s.footer}>{footer}</footer>}
    </dialog>
  );
}
