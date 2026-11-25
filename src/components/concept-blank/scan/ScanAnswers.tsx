"use client";
import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { PaperText } from "@/components/concept-blank/paper/PaperParts";
import type {
  ScanCorrectionInput,
  ScanSubmissionView,
} from "@/contracts/conceptBlankScanApi.contract";
import { scanNumbers } from "./view";
import s from "./scan.module.css";

type Save = (input: ScanCorrectionInput) => Promise<void>;
export type ScanAnswersHandle = { focus: (slotId: string) => void };
export function ScanAnswers({
  ref,
  view,
  page,
  busy,
  save,
  onDirty,
}: {
  ref?: Ref<ScanAnswersHandle>;
  view: ScanSubmissionView;
  page: number;
  busy: boolean;
  save: Save;
  onDirty?: (slotId: string, dirty: boolean) => void;
}) {
  const [all, setAll] = useState(false);
  useImperativeHandle(
    ref,
    () => ({
      focus(slotId) {
        setAll(true);
        requestAnimationFrame(() =>
          document.getElementById(`scan-answer-${slotId}`)?.focus(),
        );
      },
    }),
    [],
  );
  const numbers = scanNumbers(view);
  const sheet = view.snapshot.pages.find((p) => p.number === page)!;
  // Keep other pages mounted so drafts survive page changes. The parent warns before leaving the workflow.
  return (
    <section aria-label="읽은 답 확인">
      <p>
        사진에 쓴 답과 같은지 확인해 주세요. 답을 고치면 «직접 입력»으로
        남습니다.
      </p>
      <label className={s.inline}>
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => setAll(e.target.checked)}
        />
        읽은 답 전체 보기
      </label>
      {view.snapshot.pages.map((p) => (
        <div hidden={p.number !== page} key={p.number}>
          {p.slots.map((slot) => {
            const read = view.readings.find((r) => r.slotId === slot.id);
            if (!read) return null;
            const correction = view.corrections
              .filter((c) => c.readId === read.id)
              .at(-1);
            const needsCheck =
              read.status === "uncertain" || read.status === "unreadable";
            return (
              <div
                hidden={!all && !needsCheck}
                key={`${read.id}:${correction?.sequence ?? 0}`}
              >
                <AnswerField
                  view={view}
                  read={read}
                  correction={correction}
                  number={numbers.get(slot.id)!}
                  page={p.number}
                  question={p.questions.find((q) => q.id === slot.questionId)!}
                  label={slot.label}
                  busy={busy}
                  save={save}
                  onDirty={onDirty}
                />
              </div>
            );
          })}
        </div>
      ))}
      {!sheet.slots.some((slot) =>
        view.readings.some(
          (r) =>
            r.slotId === slot.id &&
            (r.status === "uncertain" || r.status === "unreadable"),
        ),
      ) && !all ? (
        <p className={s.notice}>
          이 쪽은 모든 답 칸을 읽었습니다. «읽은 답 전체 보기»에서 확인할 수
          있습니다.
        </p>
      ) : null}
    </section>
  );
}

function AnswerField({
  view,
  read,
  correction,
  number,
  page,
  question,
  label,
  busy,
  save,
  onDirty,
}: {
  view: ScanSubmissionView;
  read: ScanSubmissionView["readings"][number];
  correction?: ScanSubmissionView["corrections"][number];
  number: number;
  page: number;
  question: ScanSubmissionView["snapshot"]["pages"][number]["questions"][number];
  label: string;
  busy: boolean;
  save: Save;
  onDirty?: (slotId: string, dirty: boolean) => void;
}) {
  const initial =
    correction?.resolution === "text"
      ? correction.text
      : correction
        ? ""
        : read.text;
  const [text, setText] = useState(initial);
  const [mode, setMode] = useState("text");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState("");
  const dirty = text !== initial;
  useEffect(() => {
    onDirty?.(read.slotId, dirty);
    return () => onDirty?.(read.slotId, false);
  }, [dirty, onDirty, read.slotId]);
  const submit = async (resolution: ScanCorrectionInput["resolution"]) => {
    setError("");
    try {
      await save({
        revision: view.revision,
        readId: read.id,
        slotId: read.slotId,
        resolution,
        text: resolution === "text" ? text : "",
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "답을 저장하지 못했습니다.",
      );
    }
  };
  return (
    <section className={s.answerRow} aria-label={`확인 번호 ${number}`}>
      <h3>
        <span className={s.number}>{number}</span> 확인 번호 {number} · {page}쪽
        · 문항 {question.number}
      </h3>
      <PaperText text={question.prompt} />
      <p className={s.meta}>
        {label} ·{" "}
        {correction
          ? "직접 입력"
          : read.status === "blank"
            ? "빈 답으로 읽음"
            : read.status === "read"
              ? "읽은 답"
              : "확인 필요"}
      </p>
      {correction?.resolution === "blank" ? (
        <p>종이에도 빈칸으로 확인했습니다.</p>
      ) : correction?.resolution === "review" ? (
        <p>교사 확인이 필요합니다.</p>
      ) : null}
      <fieldset disabled={busy}>
        <label htmlFor={`scan-answer-${read.slotId}`}>
          종이에 쓴 답
          <textarea
            id={`scan-answer-${read.slotId}`}
            value={text}
            rows={3}
            maxLength={12000}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label>
          입력 보조
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setFirst("");
              setSecond("");
            }}
          >
            <option value="text">글·수식 그대로</option>
            <option value="fraction">분수</option>
            <option value="degree">도(°)</option>
            <option value="coordinate">좌표</option>
          </select>
        </label>
        {mode !== "text" ? (
          <div className={s.mathInput}>
            <label>
              {mode === "fraction"
                ? "분자"
                : mode === "coordinate"
                  ? "x"
                  : "각도"}
              <input
                inputMode="decimal"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
              />
            </label>
            {mode !== "degree" ? (
              <label>
                {mode === "fraction" ? "분모" : "y"}
                <input
                  inputMode="decimal"
                  value={second}
                  onChange={(e) => setSecond(e.target.value)}
                />
              </label>
            ) : null}
            <button
              type="button"
              disabled={!first.trim() || (mode !== "degree" && !second.trim())}
              onClick={() =>
                setText((old) =>
                  [
                    old,
                    mode === "fraction"
                      ? `${first}/${second}`
                      : mode === "coordinate"
                        ? `(${first}, ${second})`
                        : `${first}°`,
                  ]
                    .filter(Boolean)
                    .join(" "),
                )
              }
            >
              답에 넣기
            </button>
          </div>
        ) : null}
        <div className={s.actions}>
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => void submit("text")}
          >
            저장
          </button>
          <button type="button" onClick={() => void submit("blank")}>
            종이에도 빈칸
          </button>
          <button type="button" onClick={() => void submit("review")}>
            확인하기 어려움
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={() => {
                setText(initial);
                setError("");
              }}
            >
              입력 되돌리기
            </button>
          ) : null}
        </div>
      </fieldset>
      {dirty ? <p role="status">저장하지 않은 입력이 있습니다.</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
