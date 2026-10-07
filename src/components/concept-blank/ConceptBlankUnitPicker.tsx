"use client";

import { useRef, useState, type ReactNode } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
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
        <PickerDialog
          title="단원 선택"
          doneLabel="선택 완료"
          onClose={() => setOpen(false)}
          returnFocus={opener}
        >
          {children}
        </PickerDialog>
      )}
    </>
  );
}
