"use client";

import { useRef, useState, type ReactNode } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { PaperText } from "./paper/PaperParts";
import { BLANK_TREE, sectionTitleTex } from "@/lib/concept-blank/sections";
import s from "./unit-picker.module.css";

/** 머리도 한 줄로 센다. 새 묶음은 소단원 한 줄까지 들어갈 때만 연다. */
const SUMMARY_LINES = 6;
function summaryGroups(selected: string[]) {
  const keys = new Set(selected);
  const groups: {
    key: string;
    heading: string;
    sections: { key: string; title: string }[];
  }[] = [];
  let lines = 0;
  let shown = 0;
  for (const grade of BLANK_TREE) {
    for (const chapter of grade.chapters) {
      const sections = chapter.sections.filter((section) =>
        keys.has(section.key),
      );
      if (!sections.length) continue;
      if (SUMMARY_LINES - lines < 2) return { groups, shown };
      const semester = grade.grade.startsWith("초")
        ? chapter.title.match(/^([12])-/)?.[1]
        : undefined;
      const visible = sections.slice(0, SUMMARY_LINES - lines - 1);
      groups.push({
        key: chapter.key,
        heading: [
          grade.grade,
          ...(semester ? [`${semester}학기`] : []),
          sectionTitleTex(chapter.title),
        ].join(" · "),
        sections: visible.map((section) => ({
          key: section.key,
          title: sectionTitleTex(section.title),
        })),
      });
      lines += visible.length + 1;
      shown += visible.length;
      if (visible.length < sections.length) return { groups, shown };
    }
  }
  return { groups, shown };
}

export default function ConceptBlankUnitPicker({
  selected,
  children,
}: {
  selected: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const { groups, shown } = summaryGroups(selected);
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
            {groups.map((group) => (
              <span key={group.key} className={s.group} data-summary-group>
                <span className={s.groupHeading}>
                  <PaperText text={group.heading} />
                </span>
                {group.sections.map((section) => (
                  <span
                    key={section.key}
                    className={s.section}
                    data-summary-section
                  >
                    <PaperText text={section.title} />
                  </span>
                ))}
              </span>
            ))}
            {selected.length > shown && (
              <span>외 {selected.length - shown}개 소단원</span>
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
