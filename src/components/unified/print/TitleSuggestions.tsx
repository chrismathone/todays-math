"use client";

import { useState } from "react";
import { DEFAULT_DRAFT_TITLE } from "../draftStore";
import type { TitleSuggestion } from "./suggestTitles";
import o from "./OutputExtras.module.css";

/**
 * W7 제목 추천(Hi-fi 1안 — 원장님 2026-10-16) — 제목 칸 바로 아래 «추천 제목» 세 줄, 줄마다 흐린 라벨 · 제목 글 · [적용].
 * 제목이 기본값 그대로이거나 추천으로 정한 뒤 손대지 않았으면 [적용]이 묻지 않고 바꾼다.
 * 직접 쓴 제목이면 누른 줄 바로 아래 노란 줄에서 한 번 묻는다 — [바꾸기] [그대로 두기].
 * `src/app/dev/exam-output-hifi/W7Titles.tsx` 의 `Rows1`.
 */
export default function TitleSuggestions({
  suggestions,
  title,
  onApply,
}: {
  suggestions: TitleSuggestion[];
  title: string;
  onApply: (text: string) => void;
}) {
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [asking, setAsking] = useState<TitleSuggestion["id"] | null>(null);
  if (!suggestions.length) return null;
  /** 직접 쓴 제목 — 기본값도, 추천으로 정한 뒤 그대로인 제목도 아니다. */
  const typed = title !== DEFAULT_DRAFT_TITLE && title !== lastApplied;
  const asked = suggestions.find((row) => row.id === asking);
  function set(text: string) {
    setLastApplied(text);
    setAsking(null);
    onApply(text);
  }
  return (
    <div className={o.suggestBox} data-suggest>
      <span className={o.sectionLabel}>추천 제목</span>
      <ul className={o.suggestList}>
        {suggestions.map((row) => (
          <li key={row.id}>
            <div className={o.suggestRow}>
              <span className={o.suggestText}>
                <small>{row.label}</small>
                <span>{row.text}</span>
              </span>
              <button
                type="button"
                className={`${o.ctl} ${o.small}`}
                aria-label={`${row.text} 적용`}
                onClick={() => (typed ? setAsking(row.id) : set(row.text))}
              >
                적용
              </button>
            </div>
            {asked?.id === row.id && typed && (
              <div className={o.confirmWarn} role="alert">
                <span>직접 쓰신 제목 «{title}»을 바꿀까요?</span>
                <button
                  type="button"
                  className={`${o.ctl} ${o.primary} ${o.small}`}
                  onClick={() => set(row.text)}
                >
                  바꾸기
                </button>
                <button
                  type="button"
                  className={`${o.ctl} ${o.small}`}
                  onClick={() => setAsking(null)}
                >
                  그대로 두기
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
