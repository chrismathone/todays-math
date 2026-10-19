"use client";

import { useEffect, useRef } from "react";
import s from "./fading.module.css";

export function FadingCardExitDialog({
  student = false,
  practice,
  onStay,
  onExit,
}: {
  student?: boolean;
  practice: boolean;
  onStay: () => void;
  onExit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stay = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (node?.showModal) node.showModal();
    else node?.setAttribute("open", "");
    stay.current?.focus();
    return () => node?.close?.();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`${s.dialog} ${s.exitSheet}`}
      aria-labelledby="fading-card-exit-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
    >
      <div className={s.sheetHandle} />
      <h2 id="fading-card-exit-title" className={s.exitTitle}>
        잠시 나갈까요
      </h2>
      <p className={s.muted}>
        {practice
          ? student
            ? "연습한 내용은 저장되지 않아요."
            : "연습 기록은 남지 않습니다."
          : student
            ? "마친 단계는 저장돼요. 다음에 이어서 풀 수 있어요. 지금 풀던 단계의 답은 다시 써야 해요."
            : "마친 단계는 남아 있어요. 다음에 지금 단계부터 이어 할 수 있습니다. 아직 마치지 않은 단계의 입력은 다시 써요."}
      </p>
      <div className={s.actions}>
        <button type="button" ref={stay} className={s.primary} onClick={onStay}>
          계속 풀기
        </button>
        <button type="button" className={s.secondary} onClick={onExit}>
          나가기
        </button>
      </div>
    </dialog>
  );
}
