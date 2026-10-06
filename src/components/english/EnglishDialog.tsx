"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import Icon from "@/components/unified/WorkspaceIcon";
import w from "@/components/unified/Workroom.module.css";

/**
 * 오늘의 영어의 작은 창(새 시험 등록 · 자료 추가 · 출제 설정 · 인쇄) — 작업실 창(`.dialog`)의 틀·제목·닫기 단추를
 * 그대로 쓴다(D-07 새 모양 없음). `ConfirmDialog` 와 같은 결: 열려 있는 동안만 그리고 `showModal()`,
 * Esc·«창 닫기»·배경 누르기로 닫고, 닫히면 초점을 `returnFocus` 로 돌린다. 창은 작업실 뿌리로 옮겨 그린다.
 */
export default function EnglishDialog({
  title,
  kicker,
  busy = false,
  className,
  returnFocus,
  onClose,
  children,
}: {
  title: string;
  /** 제목 위 작은 글(«오늘의 영어») */
  kicker?: string;
  busy?: boolean;
  /** 창 틀에 덧붙이는 클래스 — 넓은 창(«사진에서 글 읽기» 1080px)만 쓴다. 틀 · 제목 · 닫기 단추는 그대로다 */
  className?: string;
  returnFocus?: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const titleId = useId();
  const [host] = useState(workspaceHost);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const first = dialog.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea, [role=tab][aria-selected=true], a[href], button:not([aria-label='창 닫기'])",
    );
    first?.focus();
    const opener = returnFocus?.current;
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [host, returnFocus]);

  if (!host) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className={className ? `${w.dialog} ${className}` : w.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onPointerDown={(event) => {
        pressedOutside.current =
          event.target === event.currentTarget &&
          isOutside(event, event.currentTarget);
      }}
      onClick={(event) => {
        const pressed = pressedOutside.current;
        pressedOutside.current = false;
        if (
          pressed &&
          !busy &&
          event.target === event.currentTarget &&
          isOutside(event, event.currentTarget)
        )
          onClose();
      }}
    >
      <div className={w.dialogHeading}>
        <div>
          {kicker && <span>{kicker}</span>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          aria-label="창 닫기"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>,
    host,
  );
}

function workspaceHost(): Element | null {
  if (typeof document === "undefined") return null;
  return (
    (w.workspace ? document.querySelector(`.${w.workspace}`) : null) ??
    document.body
  );
}

function isOutside(
  point: { clientX: number; clientY: number },
  dialog: HTMLDialogElement,
) {
  const box = dialog.getBoundingClientRect();
  return (
    point.clientX < box.left ||
    point.clientX > box.right ||
    point.clientY < box.top ||
    point.clientY > box.bottom
  );
}
