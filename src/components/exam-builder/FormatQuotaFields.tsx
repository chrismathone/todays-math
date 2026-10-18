"use client";

import { useId } from "react";
import { QUESTION_FORMATS, formatIssue, type Ladder } from "./conditionsPlan";
import s from "./FormatQuotaFields.module.css";

export default function FormatQuotaFields({
  value,
  onChange,
  count,
  disabled = false,
  label = "출제 형식 배분",
  max = 100,
}: {
  value: Ladder;
  onChange: (value: Ladder) => void;
  count: number;
  disabled?: boolean;
  label?: string;
  max?: number;
}) {
  const id = useId();
  const issue = formatIssue(value, count);
  return (
    <details className={s.root}>
      <summary>
        {label} ·{" "}
        {QUESTION_FORMATS.some((format) => value[format] != null)
          ? "직접 지정"
          : "지정 없음"}
      </summary>
      <p id={`${id}-help`}>
        빈 칸은 지정 없음, 0은 해당 형식 제외입니다. 세 칸을 모두 지정하면
        합계를 {count}문항에 맞추세요.
      </p>
      <fieldset
        disabled={disabled}
        aria-describedby={`${id}-help${issue ? ` ${id}-error` : ""}`}
      >
        <legend className="sr-only">{label}</legend>
        {QUESTION_FORMATS.map((format) => (
          <label key={format}>
            {format}
            <input
              type="number"
              min={0}
              max={max}
              step={1}
              inputMode="numeric"
              placeholder="지정 없음"
              value={value[format] ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  ...value,
                  [format]:
                    raw === ""
                      ? null
                      : Math.max(
                          0,
                          Math.min(max, Math.floor(Number(raw) || 0)),
                        ),
                });
              }}
            />
          </label>
        ))}
      </fieldset>
      {issue && (
        <p id={`${id}-error`} role="alert" className={s.error}>
          {issue}
        </p>
      )}
    </details>
  );
}
