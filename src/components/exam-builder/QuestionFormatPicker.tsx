"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { QuestionRepresentation } from "@/contracts/questionFormats.contract";
import {
  FORMAT_LABEL,
  formatBlockedReason,
} from "@/lib/problem/questionSelectionClient";
import BuilderDialog from "./BuilderDialog";
import s from "./QuestionFormatPicker.module.css";

/** The preview is the complete actual row returned by the source; no client conversion. */
export default function QuestionFormatPicker<T>({
  item,
  actualId,
  options,
  load,
  renderQuestion,
  onChoose,
  onClose,
  changing = false,
}: {
  item: T;
  actualId: string;
  options: readonly QuestionRepresentation[];
  load: (
    item: T,
    option: QuestionRepresentation,
    signal: AbortSignal,
  ) => Promise<T>;
  renderQuestion: (item: T) => ReactNode;
  onChoose: (item: T) => void | Promise<void>;
  onClose: () => void;
  changing?: boolean;
}) {
  const uid = useId();
  const [selected, setSelected] = useState(
    () =>
      options.find(
        (option) =>
          option.problemId === actualId &&
          option.state === "available" &&
          option.format,
      )?.problemId ??
      options.find((option) => option.state === "available" && option.format)
        ?.problemId ??
      "",
  );
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    item?: T;
    error?: string;
  }>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const option = options.find((row) => row.problemId === selected);
  const key = JSON.stringify([selected, option?.revision, retry]);
  const ready = result?.key === key && result.item !== undefined;
  useEffect(() => {
    if (!option || option.state !== "available" || !option.format) return;
    const controller = new AbortController();
    void load(item, option, controller.signal)
      .then((actual) => {
        if (!controller.signal.aborted) setResult({ key, item: actual });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              cause instanceof Error
                ? cause.message
                : "선택한 형식을 불러오지 못했습니다.",
          });
      });
    return () => controller.abort();
  }, [item, option, key, load]);
  const close = () => {
    if (!saving) onClose();
  };
  return (
    <BuilderDialog
      title={changing ? "출제 형식 변경" : "출제 형식 선택"}
      onClose={close}
      focusSelectedRadio
    >
      <div className={s.body}>
        <p className={s.hint}>
          {changing
            ? "같은 문항의 실제 표현을 바꿉니다. 자리와 문항 수는 유지됩니다."
            : "이 문항에 사용할 실제 표현을 고르세요. 한 문항으로 담깁니다."}
        </p>
        <fieldset className={s.options} disabled={saving}>
          <legend>사용할 출제 형식</legend>
          {options.map((row) => {
            const blocked = row.state !== "available" || !row.format;
            return (
              <label
                key={row.problemId}
                className={s.option}
                data-blocked={blocked || undefined}
              >
                <input
                  type="radio"
                  name={`${uid}-format`}
                  value={row.problemId}
                  checked={selected === row.problemId}
                  disabled={blocked}
                  onChange={() => {
                    setSelected(row.problemId);
                    setSaveError("");
                  }}
                />
                <span>
                  {row.format ? FORMAT_LABEL[row.format] : "미분류"}
                  {row.problemId === actualId ? " · 현재 표현" : ""}
                </span>
                {blocked && <small>{formatBlockedReason(row)}</small>}
              </label>
            );
          })}
        </fieldset>
        <section
          aria-label="선택한 실제 문항 미리보기"
          className={s.preview}
          aria-busy={!ready && !result?.error}
        >
          {ready ? (
            renderQuestion(result.item!)
          ) : result?.key === key && result.error ? (
            <div role="alert">
              <p>{result.error}</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                다시 확인
              </button>
            </div>
          ) : (
            <p role="status">
              {selected
                ? "실제 본문과 보기를 불러옵니다…"
                : "현재 선택할 수 있는 형식이 없습니다."}
            </p>
          )}
        </section>
        {saveError && (
          <p role="alert" className={s.error}>
            {saveError}
          </p>
        )}
      </div>
      <footer className={s.footer}>
        <button type="button" disabled={saving} onClick={close}>
          취소
        </button>
        <button
          type="button"
          className={s.primary}
          disabled={!ready || saving}
          onClick={async () => {
            if (!ready) return;
            setSaving(true);
            setSaveError("");
            try {
              await onChoose(result.item!);
            } catch (cause) {
              setSaveError(
                cause instanceof Error
                  ? cause.message
                  : "선택을 반영하지 못했습니다. 기존 선택은 유지됩니다.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving
            ? "반영 중…"
            : changing
              ? "이 형식으로 변경"
              : "이 형식으로 담기"}
        </button>
      </footer>
    </BuilderDialog>
  );
}
