"use client";

import { SHEET_TAGS, type SheetTag } from "@/contracts/sheetTag.contract";
import we from "../WorksheetEditor.module.css";
import o from "./OutputExtras.module.css";

/**
 * W8 시험지 태그(Hi-fi 1안) — 3단계 «시험지 정보» 맨 위 «시험 종류», 폰트 · 색과 같은 눌림 단추(없음 + 여덟).
 * 하나만 고르고, 지면에 찍지 않는다. `src/app/dev/exam-output-hifi/W8Tags.tsx` 의 `Pick1`.
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
        지면에 찍히지 않습니다 — 내 시험지에서 거를 때 씁니다.
      </p>
    </div>
  );
}
