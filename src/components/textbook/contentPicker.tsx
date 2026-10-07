"use client";

import { useRef, useState } from "react";

import { PickerDialog } from "@/components/picker-dialog/PickerDialog";

import type { ContentUnit } from "./simpleNavigation";
import styles from "./textbook.module.css";

/**
 * 완성 보기의 «내용 고르기» — 구획 수십 개를 화면에 단추로 펼치지 않고, 창에서 대단원 → 소단원 → 활동 차례로 고른다
 * (원장님 2026-10-07 — 개념 백지의 «단원 고르기»와 같은 방식 · 창의 틀은 공용 `PickerDialog`).
 * 고르면 창이 닫히고 부르는 쪽이 그 구획으로 간다. 지금 보는 구획에는 `aria-current` 가 붙는다.
 */
export function ContentPicker({
  outline,
  currentSectionId,
  disabled = false,
  onPick,
}: {
  outline: readonly ContentUnit[];
  currentSectionId: string | null;
  disabled?: boolean;
  onPick: (sectionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={opener}
        type="button"
        className={styles.button}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        내용 고르기
      </button>
      {open && (
        <PickerDialog
          title="내용 고르기"
          onClose={() => setOpen(false)}
          returnFocus={opener}
        >
          <ContentColumns
            outline={outline}
            currentSectionId={currentSectionId}
            onPick={(sectionId) => {
              setOpen(false);
              onPick(sectionId);
            }}
          />
        </PickerDialog>
      )}
    </>
  );
}

function ContentColumns({
  outline,
  currentSectionId,
  onPick,
}: {
  outline: readonly ContentUnit[];
  currentSectionId: string | null;
  onPick: (sectionId: string) => void;
}) {
  const holds = (unit: ContentUnit) =>
    unit.groups.findIndex((group) =>
      group.entries.some((entry) => entry.sectionId === currentSectionId),
    );
  const home = outline.find((unit) => holds(unit) >= 0) ?? outline[0];
  const [unitKey, setUnitKey] = useState(home?.unitKey ?? "");
  const [groupIndex, setGroupIndex] = useState<number | null>(
    home && holds(home) >= 0 ? holds(home) : null,
  );
  const unit = outline.find((row) => row.unitKey === unitKey) ?? outline[0];
  const group =
    unit && groupIndex !== null ? (unit.groups[groupIndex] ?? null) : null;
  const current = (sectionId: string) =>
    sectionId === currentSectionId ? ("true" as const) : undefined;
  return (
    <div className={styles.pickerColumns}>
      <div className={styles.pickerColumn} role="group" aria-label="대단원">
        {outline.map((row) => (
          <button
            type="button"
            key={row.unitKey}
            className={styles.pickerItem}
            aria-pressed={row.unitKey === unit?.unitKey}
            onClick={() => {
              setUnitKey(row.unitKey);
              setGroupIndex(null);
            }}
          >
            {row.title}
          </button>
        ))}
      </div>
      <div className={styles.pickerColumn} role="group" aria-label="소단원">
        {unit?.groups.map((row, index) =>
          row.entries.length === 1 ? (
            // 활동으로 나뉘지 않는 구획 — 고르면 바로 간다.
            <button
              type="button"
              key={row.entries[0]!.sectionId}
              className={styles.pickerItem}
              aria-current={current(row.entries[0]!.sectionId)}
              onClick={() => onPick(row.entries[0]!.sectionId)}
            >
              {row.entries[0]!.label}
            </button>
          ) : (
            <button
              type="button"
              key={`${row.title}:${index}`}
              className={styles.pickerItem}
              aria-pressed={index === groupIndex}
              onClick={() => setGroupIndex(index)}
            >
              <span>{row.title}</span>
              <span className={styles.pickerCount}>{row.entries.length}</span>
            </button>
          ),
        )}
      </div>
      <div className={styles.pickerColumn} role="group" aria-label="활동">
        {group && group.entries.length > 1 ? (
          group.entries.map((entry) => (
            <button
              type="button"
              key={entry.sectionId}
              className={styles.pickerItem}
              aria-current={current(entry.sectionId)}
              onClick={() => onPick(entry.sectionId)}
            >
              {entry.name}
            </button>
          ))
        ) : (
          <p className={styles.muted}>소단원을 고르면 활동이 보입니다.</p>
        )}
      </div>
    </div>
  );
}
