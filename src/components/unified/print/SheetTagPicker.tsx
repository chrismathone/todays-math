"use client";

import { SHEET_TAGS, type SheetTag } from "@/contracts/sheetTag.contract";
import we from "../WorksheetEditor.module.css";
import o from "./OutputExtras.module.css";

/**
 * W8 시험지 태그(Hi-fi 1안) — 3단계 «시험지 정보» 맨 위 «시험 종류», 폰트 · 색과 같은 눌림 단추(없음 + 여덟).
 * 하나만 고른다. 모든 문제지 양식에 표시하며 내 양식에는 저장하지 않는다.
 */
export default function SheetTagPicker({
  value,
  onChange,
}: {
  value: SheetTag | null;
  onChange: (tag: SheetTag | null) => void;
}) {
  return (
    <div
      className={o.tagPick}
      role="group"
      aria-label="시험 종류"
      data-tag-pick
    >
      <span className={o.fieldCaption}>시험 종류</span>
      <div className={`${we.choiceWrap} ${we.choiceGrid}`}>
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
        >
          없음
        </button>
        {SHEET_TAGS.map((tag) => (
          <button
            type="button"
            key={tag}
            aria-pressed={value === tag}
            onClick={() => onChange(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <p className={we.subtle} style={{ marginTop: 0 }}>
        모든 양식에 표시합니다. «없음»을 고르면 지면에서 생략합니다.
      </p>
    </div>
  );
}
