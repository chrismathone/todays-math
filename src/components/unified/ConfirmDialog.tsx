"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import w from "./Workroom.module.css";

/**
 * 작업실의 확인 창 — 카드 **안에** 확인 문구·입력칸을 펼치지 않고 화면 위에 겹쳐 띄운다
 * (2026-09-19 원장님 «내 시험지 삭제 시에 카드가 늘어나지 말고 덧씌우기 같은 이중창 같은 형식으로»,
 * 같은 날 «이름 변경»도 같은 창으로).
 *
 * 모양은 새로 만들지 않는다(D-07) — 작업실 창(`UnifiedWorkspace` 의 `<dialog className={s.dialog}>`)
 * 의 틀·제목·입력칸(«새 시험지» 창의 `.newTitle`)을 그대로 쓰고, 단추 줄은 자료 작업실의
 * «새로 시작할까요?» 확인 창과 같은 배치다.
 *
 * - 열려 있는 동안만 그린다. 그리면 `showModal()` — 초점이 창 안에 갇히고 뒤는 눌리지 않는다.
 *   초기 초점은 입력칸이 있으면 입력칸(글자 전체 선택), 없으면 «취소»(실수 삭제 방지).
 * - 확인은 폼 제출이다 — 입력칸에서 Enter 로도 된다. 입력칸이 비면(공백뿐이면) 확인을 잠근다.
 * - Esc·«취소»·바깥(배경) 누르기로 닫는다. 처리 중에는 닫지 않는다 — 결과(오류)를 볼 자리를 남긴다.
 * - 닫히면 초점을 `returnFocus`(누른 단추)로 돌린다. 그 단추가 사라졌으면(삭제 성공) 돌리지 않는다.
 *
 * 🔴 창은 카드 밖, **작업실 뿌리**(`.workspace`)로 옮겨 그린다. 카드 안에 두면 카드 CSS 가 창으로
 *    샌다 — `.libraryCard h2` 의 한 줄 말줄임이 긴 시험지 이름의 질문을 자르고, 내 시험지의
 *    `.library button` 이 창 단추 색을 덮는다. 작업실 창과 같은 자리라야 같은 모양이 된다.
 */
export default function ConfirmDialog({
  title,
  description,
  field,
  confirmLabel,
  busy = false,
  error,
  returnFocus,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  /** 창 안의 글자 입력칸 하나(이름 변경). */
  field?: {
    label: string;
    value: string;
    maxLength: number;
    onChange: (value: string) => void;
  };
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  returnFocus: RefObject<HTMLElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // 누른 곳과 뗀 곳이 **모두** 창 밖일 때만 배경 누르기다 — 창 안 글자를 긁다가 밖에서 떼면
  // click 은 공통 조상인 dialog 에 떨어진다.
  const pressedOutside = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [host] = useState(workspaceHost);
  const confirmLocked = busy || (field ? !field.value.trim() : false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    } else cancelRef.current?.focus();
    const opener = returnFocus.current;
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [host, returnFocus]);

  if (!host) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      className={w.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClose={(event) => {
        // 브라우저가 Esc 를 거듭 누른 것을 막지 못하게 하고 창을 스스로 닫은 경우 — 상태를 맞춘다.
        if (!event.currentTarget.open) onCancel();
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
          onCancel();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!confirmLocked) onConfirm();
        }}
      >
        <div className={w.dialogHeading}>
          <h2 id={titleId}>{title}</h2>
        </div>
        {description && <p id={descriptionId}>{description}</p>}
        {field && (
          <label className={w.newTitle}>
            {field.label}
            <input
              ref={inputRef}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              maxLength={field.maxLength}
              required
            />
          </label>
        )}
        {error && (
          <p className={w.modalError} role="alert">
            {error}
          </p>
        )}
        <div className={w.dialogActions}>
          <button
            ref={cancelRef}
            type="button"
            className={w.outlineButton}
            disabled={busy}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="submit"
            className={w.primaryButton}
            disabled={confirmLocked}
          >
            {confirmLabel}
          </button>
        </div>
        {busy && (
          <p className={w.dialogFoot} role="status">
            처리 중…
          </p>
        )}
      </form>
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
