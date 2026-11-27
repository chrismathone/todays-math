"use client";
import { useState } from "react";
import type {
  ScanMarkupAction,
  ScanMarkupTarget,
} from "@/contracts/conceptBlankScanMarkup.contract";
import s from "./scan.module.css";

type NoteAction = ScanMarkupAction extends infer Action
  ? Action extends ScanMarkupAction
    ? Omit<Action, "gradeId" | "requestId" | "sequence">
    : never
  : never;

export function ScanMarkupNotes({
  target,
  numbers,
  save,
  busy,
}: {
  target: ScanMarkupTarget;
  numbers: Map<string, number>;
  save: (input: ScanMarkupAction) => Promise<void>;
  busy: boolean;
}) {
  const [editing, setEditing] = useState<string>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const teacher = "sequence" in target;
  const submit = async (action: NoteAction) => {
    if (!teacher) return;
    setError("");
    setSaving(true);
    try {
      await save({
        ...action,
        gradeId: target.gradeId,
        sequence: target.sequence,
        requestId: crypto.randomUUID(),
      });
      setEditing(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "첨삭을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (!target.notes.length && !error) return null;
  return (
    <section aria-label="사진 첨삭" className={s.markupNotes}>
      <ul>
        {target.notes.map((note) => (
          <li key={note.id}>
            <p
              className={s.markupSay}
              data-draft={"published" in note && !note.published}
            >
              <span className={s.markupNumber}>{numbers.get(note.slotId)}</span>
              {note.say}
            </p>
            {"published" in note ? (
              <>
                {!note.published ? (
                  <p className={s.markupStatus}>공개 전</p>
                ) : null}
                <p className={s.meta}>인용 · {note.quote}</p>
                {note.fix ? (
                  <p className={s.meta}>바른 답 · {note.fix}</p>
                ) : null}
                {editing === note.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const fields = new FormData(event.currentTarget);
                      void submit({
                        action: "edit",
                        noteId: note.id,
                        kind: fields.get("kind") as typeof note.kind,
                        say: String(fields.get("say")),
                        fix: String(fields.get("fix")),
                      });
                    }}
                  >
                    <fieldset disabled={busy || saving}>
                      <label>
                        분류
                        <select name="kind" defaultValue={note.kind}>
                          <option value="wrong">틀린 말</option>
                          <option value="missing">빠진 근거</option>
                          <option value="example">예의 계산 실수</option>
                        </select>
                      </label>
                      <label>
                        학생에게 보이는 설명
                        <input
                          name="say"
                          defaultValue={note.say}
                          maxLength={60}
                          required
                        />
                      </label>
                      <label>
                        바른 답
                        <input
                          name="fix"
                          defaultValue={note.fix}
                          maxLength={80}
                        />
                      </label>
                      <div className={s.actions}>
                        <button
                          type="button"
                          onClick={() => setEditing(undefined)}
                        >
                          취소
                        </button>
                        <button type="submit">첨삭 저장</button>
                      </div>
                    </fieldset>
                  </form>
                ) : (
                  <div className={s.actions}>
                    <button
                      type="button"
                      disabled={busy || saving}
                      onClick={() => setEditing(note.id)}
                    >
                      첨삭 고치기
                    </button>
                    <button
                      type="button"
                      disabled={busy || saving}
                      onClick={() =>
                        void submit({ action: "remove", noteId: note.id })
                      }
                    >
                      첨삭 지우기
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {teacher && target.notes.some((note) => !note.published) ? (
        <button
          type="button"
          className={s.primary}
          disabled={busy || saving || editing !== undefined}
          onClick={() => void submit({ action: "publish" })}
        >
          첨삭 공개
        </button>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
