"use client";

import { useEffect, useState } from "react";
import s from "./WorkProgress.module.css";

export interface WorkProgressProps {
  label: string;
  detail?: string;
  startedAt?: number;
  completed?: number;
  total?: number;
  unit?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  variant?: "panel" | "inline";
  showElapsed?: boolean;
  className?: string;
}

const WAIT_MESSAGE =
  "응답을 기다리고 있습니다. 완료 시간은 아직 알 수 없습니다.";

// Only this small subtree ticks; lists, previews and the live status do not.
function Timing({
  startedAt,
  showElapsed,
}: {
  startedAt?: number;
  showElapsed: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = startedAt ?? Date.now();
    const update = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const initial = window.setTimeout(update, 0);
    const timer = showElapsed
      ? window.setInterval(update, 1000)
      : window.setTimeout(update, Math.max(0, start + 45_000 - Date.now()));
    return () => {
      window.clearTimeout(initial);
      window.clearTimeout(timer);
      window.clearInterval(timer);
    };
  }, [startedAt, showElapsed]);

  return (
    <span className={s.timing}>
      {showElapsed ? (
        <span role="timer" aria-live="off" className={s.elapsed}>
          {seconds < 60
            ? `${seconds}초 경과`
            : `${Math.floor(seconds / 60)}분 ${seconds % 60}초 경과`}
        </span>
      ) : null}
      {seconds >= 45 ? (
        <span className={s.waiting} role="status" title={WAIT_MESSAGE}>
          응답 대기 중
          <span className={s.srOnly}>. 완료 시간은 아직 알 수 없습니다.</span>
        </span>
      ) : null}
    </span>
  );
}

/** Supply counts only for measured work; omit them for unknown progress.
 * Inline is phrasing content for buttons; omit onCancel when nesting in a button.
 * Panel elapsed time defaults on; inline defaults off to preserve button width.
 */
export default function WorkProgress({
  label,
  detail,
  startedAt,
  completed,
  total,
  unit = "",
  onCancel,
  cancelLabel = "취소",
  variant = "panel",
  showElapsed = variant === "panel",
  className,
}: WorkProgressProps) {
  const count =
    completed !== undefined && Number.isFinite(completed) && completed >= 0
      ? completed
      : undefined;
  const target =
    total !== undefined && Number.isFinite(total) && total > 0
      ? total
      : undefined;
  const measured =
    count !== undefined && target !== undefined && count <= target;
  const countLabel =
    count !== undefined
      ? target !== undefined
        ? `${count.toLocaleString("ko-KR")} / ${target.toLocaleString("ko-KR")}${unit ? ` ${unit}` : ""}`
        : `${count.toLocaleString("ko-KR")}${unit ? ` ${unit}` : ""} 완료`
      : target !== undefined
        ? `총 ${target.toLocaleString("ko-KR")}${unit ? ` ${unit}` : ""}`
        : undefined;
  const start = Number.isFinite(startedAt) ? startedAt : undefined;
  const Root = variant === "inline" ? "span" : "div";

  return (
    <Root className={`${s[variant]}${className ? ` ${className}` : ""}`}>
      <span className={s.spinner} aria-hidden="true" />
      <span
        className={s.copy}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className={s.label}>{label}</span>
        {detail ? (
          <span className={s.detail} title={detail}>
            {detail}
          </span>
        ) : null}
      </span>
      {countLabel ? <span className={s.count}>{countLabel}</span> : null}
      {variant === "panel" || showElapsed ? (
        <Timing key={start} startedAt={start} showElapsed={showElapsed} />
      ) : null}
      {onCancel ? (
        <button type="button" className={s.cancel} onClick={onCancel}>
          {cancelLabel}
        </button>
      ) : null}
      {variant === "panel" ? (
        <span
          className={s.track}
          role="progressbar"
          aria-label={label}
          aria-valuemin={measured ? 0 : undefined}
          aria-valuemax={measured ? target : undefined}
          aria-valuenow={measured ? count : undefined}
          aria-valuetext={countLabel}
        >
          <span
            className={measured ? s.fill : s.indeterminate}
            style={
              measured ? { width: `${(count! / target!) * 100}%` } : undefined
            }
          />
        </span>
      ) : null}
    </Root>
  );
}
