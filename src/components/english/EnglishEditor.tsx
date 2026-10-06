"use client";

/**
 * 검토·편집 화면 (D-148 · 25 §1.3 · 셸 브리프 §2.3). 라우트가 아니라 «학교별 내신 대비» 뷰 안 상태로 열린다 — «목록»으로 돌아간다.
 *
 * 도구 줄: «목록» · 검토 상태 · «인쇄»(학생용·교사용 새 탭) · «세트 삭제» · «저장».
 * 저장은 `PUT /api/english/sets/{id}` 에 `revision` 을 실어 보낸다(CAS) — 409 면 알림 줄 + «다시 불러오기».
 * 내용을 고치면 상태는 «초안»으로 내려간다(ChatGPT 앱 규칙). 상태만 바꾸는 것은 내용 편집이 아니다.
 * 보내기 전에 공용 검증기(`validateEnglishDraft`)를 한 번 지난다 — 어느 문항·어느 규칙인지 한 줄씩.
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";

import ConfirmDialog from "@/components/unified/ConfirmDialog";
import Icon from "@/components/unified/WorkspaceIcon";
import WorkProgress from "@/components/unified/WorkProgress";
import w from "@/components/unified/Workroom.module.css";
import {
  ENGLISH_FOUR_CHOICE_TYPES,
  ENGLISH_OPEN_TYPES,
  ENGLISH_PASSAGE_MAX,
  ENGLISH_SET_STATUSES,
  englishSetResponseSchema,
  type EnglishExam,
  type EnglishQuestion,
  type EnglishSet,
  type EnglishSetStatus,
} from "@/contracts/english.contract";
import { englishMetaLine } from "@/lib/english/meta";
import {
  englishQualityNotes,
  type EnglishNotePlace,
  type EnglishQualityNote,
} from "@/lib/english/notes";
import {
  ENGLISH_CHOICE_MARKS,
  englishOptionGap,
  trimTrailingBlankOptions,
} from "@/lib/english/options";
import {
  ENGLISH_CHOICE_COUNT,
  validateEnglishDraft,
} from "@/lib/english/validate";

import AutoGrowTextarea from "./AutoGrowTextarea";
import EnglishDialog from "./EnglishDialog";
import { EnglishMarkedText } from "./EnglishPromptText";
import EnglishQuestionView from "./EnglishQuestionView";
import {
  EnglishRequestError,
  SOURCE_LABEL,
  formatIssues,
  jsonInit,
  messageOf,
  requestEnglish,
  statusOf,
} from "./englishClient";
import s from "./EnglishStudio.module.css";

const CHOICES = Array.from({ length: ENGLISH_CHOICE_COUNT }, (_, i) =>
  String(i + 1),
);
const OPTION_GAP_MESSAGE =
  "보기 칸 사이가 비어 있습니다. 빈 칸은 맨 끝에만 둘 수 있습니다.";
/** 계약이 내보내지 않는 상한 — `english.contract.ts` 의 `setTitleSchema.max(160)` · 보기 원소 `max(1_500)` 과 같은 값 */
const SET_TITLE_MAX = 160;
const OPTION_MAX = 1_500;

/** «확인함»한 열쇠 — 브라우저 저장소(못 쓰면 빈 것). 개인 창 · 막힌 저장소에서도 화면은 그대로 선다 */
function readAcks(storageKey: string): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(list)
        ? list.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function writeAcks(storageKey: string, keys: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...keys]));
  } catch {
    /* 저장소를 못 쓰면 그 화면에서만 숨긴다 */
  }
}

export default function EnglishEditor({
  setId,
  initialSet,
  exam,
  onBack,
  onSaved,
  onDeleted,
  onNotice,
}: {
  setId: string;
  /** 딥링크가 이미 읽어 둔 세트 — 있으면 다시 읽지 않는다 */
  initialSet?: EnglishSet;
  exam: EnglishExam;
  onBack: () => void;
  onSaved: (set: EnglishSet) => void;
  onDeleted: (id: string) => void;
  /** 셸의 알림 줄 — «확인함» 같은 짧은 알림 */
  onNotice?: (message: string) => void;
}) {
  const seeded = Boolean(initialSet && initialSet.id === setId);
  const [draft, setDraft] = useState<EnglishSet | null>(
    seeded ? (initialSet ?? null) : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 고칠 칸이 열린 문항(0부터) — 처음엔 모두 읽기 모양(지면과 같은 규칙으로 그린 것)이다
  const [editing, setEditing] = useState<ReadonlySet<number>>(() => new Set());
  const printRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const cardId = (index: number) => `${uid}-q${index}`;

  // «확인해 볼 곳»(3자 합의 25 §12.13) — 치는 도중이 아니라 칸을 벗어날 때 · 불러올 때 · 저장한 뒤 · «수정 끝»에 다시 센다.
  // 치는 도중에 칸 아래 줄이 섰다 사라지면 아래 내용이 흔들리고 한글 조합도 끊긴다. 세트 전체를 센다(정답 번호 쏠림은 세트 단위).
  const [settled, setSettled] = useState<EnglishQuestion[] | null>(
    seeded ? (initialSet?.questions ?? null) : null,
  );
  // 칸을 벗어날 때 읽을 «지금 글» — 그린 뒤에 맞춘다(그리는 도중에 ref 를 바꾸지 않는다)
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  });
  const settle = () => setSettled(latest.current?.questions ?? null);
  const notes = useMemo(
    () => (settled ? englishQualityNotes(settled) : []),
    [settled],
  );
  // 기각(«확인함»)은 이 브라우저에만 — 관련 글이나 검사 판이 바뀌면 열쇠가 달라져 다시 선다
  const ackStorage = `english-notes-ack:${setId}`;
  const [acked, setAcked] = useState<ReadonlySet<string>>(() =>
    readAcks(ackStorage),
  );
  const visibleNotes = notes.filter((note) => !acked.has(note.key));
  const hiddenCount = notes.length - visibleNotes.length;
  const dismiss = (note: EnglishQualityNote) => {
    const next = new Set(acked).add(note.key);
    setAcked(next);
    writeAcks(ackStorage, next);
    onNotice?.("확인함으로 표시했습니다. 이 브라우저에서만 기억합니다.");
  };
  const restoreAcked = () => {
    const next = new Set(acked);
    for (const note of notes) next.delete(note.key);
    setAcked(next);
    writeAcks(ackStorage, next);
  };
  const jumpTo = (index: number) => {
    const card = document.getElementById(cardId(index));
    card?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    card
      ?.querySelector<HTMLButtonElement>("[data-edit-toggle]")
      ?.focus({ preventScroll: true });
  };
  const noteLine = (note: EnglishQualityNote, jump: boolean) => (
    <p className={s.noteLine} key={note.key}>
      <span className={s.noteTag}>확인해 볼 곳</span>
      <span className={s.noteText}>
        <EnglishMarkedText text={note.text} markClassName={s.qCircled} />
      </span>
      {jump && note.question !== null ? (
        <button
          type="button"
          className={s.noteButton}
          onClick={() => jumpTo(note.question!)}
        >
          {note.question + 1}번으로
        </button>
      ) : null}
      <button
        type="button"
        className={s.noteButton}
        aria-label={`확인함 — ${note.text}`}
        onClick={() => dismiss(note)}
      >
        확인함
      </button>
    </p>
  );
  const notesAt = (index: number, place: EnglishNotePlace) => {
    const here = visibleNotes.filter(
      (note) => note.question === index && note.place === place,
    );
    return here.length ? (
      <div className={s.notes}>{here.map((note) => noteLine(note, false))}</div>
    ) : null;
  };
  const headNotes = visibleNotes.filter((note) => note.place === "head");

  useEffect(() => {
    if (reload === 0 && seeded) return;
    let cancelled = false;
    (async () => {
      try {
        const body = englishSetResponseSchema.parse(
          await requestEnglish(`/api/english/sets/${setId}`),
        );
        if (cancelled) return;
        setDraft(body.data);
        setSettled(body.data.questions);
        setLoadError(null);
        setConflict(null);
        setError(null);
      } catch (caught) {
        if (!cancelled) setLoadError(messageOf(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setId, reload, seeded]);

  /** 내용 편집 — 상태가 «초안»으로 내려간다 */
  const edit = (change: (set: EnglishSet) => EnglishSet) =>
    setDraft((current) =>
      current ? { ...change(current), status: "초안" } : current,
    );
  const editQuestion = (index: number, patch: Partial<EnglishQuestion>) =>
    edit((set) => ({
      ...set,
      questions: set.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    }));

  const toggleEditing = (index: number) => {
    if (editing.has(index)) settle();
    setEditing((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  /** 검증에 걸린 문항은 고칠 칸을 연다 — 사유를 읽고 바로 고치게 */
  const openIssues = (issues: readonly { question: number | null }[]) =>
    setEditing(
      (current) =>
        new Set([
          ...current,
          ...issues.flatMap((issue) =>
            issue.question === null ? [] : [issue.question],
          ),
        ]),
    );

  const save = async () => {
    if (!draft || saving) return;
    // 채운 보기 사이의 빈 칸 — 걷으면 뒤 보기의 번호가 당겨진다. 보기 넷을 받는 유형에서는 그 채로 검증을 지나
    // 정답이 다른 보기를 가리키게 된다(D-158 검토 #1). 다른 유형은 아래 보기 수 규칙이 사유를 낸다.
    const gaps = draft.questions.flatMap((question, index) =>
      ENGLISH_FOUR_CHOICE_TYPES.includes(question.type) &&
      englishOptionGap(question.options)
        ? [{ question: index, message: OPTION_GAP_MESSAGE }]
        : [],
    );
    if (gaps.length) {
      setError(formatIssues(gaps));
      openIssues(gaps);
      return;
    }
    // 빈 보기 칸은 «없는 보기»다 — 다섯 칸을 늘 그리므로 비운 칸을 걷어낸 뒤 공용 검증기를 지난다(보기 수 규칙이 사유를 낸다)
    const questions = draft.questions.map((question) => ({
      ...question,
      options: question.options.filter((option) => option.trim()),
    }));
    const verdict = validateEnglishDraft({
      title: draft.title,
      source: draft.source,
      passage: draft.passage,
      questions,
    });
    if (!verdict.ok) {
      setError(formatIssues(verdict.issues));
      openIssues(verdict.issues);
      return;
    }
    setSaving(true);
    setConflict(null);
    setError(null);
    try {
      const body = englishSetResponseSchema.parse(
        await requestEnglish(
          `/api/english/sets/${draft.id}`,
          jsonInit("PUT", {
            title: draft.title,
            status: draft.status,
            passage: draft.passage,
            questions,
            revision: draft.revision,
          }),
        ),
      );
      // The response acknowledges the submitted snapshot. Edits made while it
      // was in flight still need saving, but must use the acknowledged revision.
      const editedWhileSaving = latest.current !== draft;
      setDraft((current) =>
        current && current !== draft
          ? {
              ...current,
              revision: body.data.revision,
              updatedAt: body.data.updatedAt,
            }
          : body.data,
      );
      setSettled(
        editedWhileSaving
          ? (latest.current?.questions ?? null)
          : body.data.questions,
      );
      onSaved(body.data);
      if (editedWhileSaving)
        onNotice?.(
          "저장 중 입력한 내용은 그대로 남아 있습니다. 추가 변경을 저장해 주세요.",
        );
    } catch (caught) {
      if (statusOf(caught) === 409) setConflict(messageOf(caught));
      else if (caught instanceof EnglishRequestError && caught.issues?.length) {
        setError(`${caught.message} ${formatIssues(caught.issues)}`);
        openIssues(caught.issues);
      } else setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await requestEnglish(`/api/english/sets/${draft.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      onDeleted(draft.id);
    } catch (caught) {
      setDeleteError(messageOf(caught));
    } finally {
      setDeleting(false);
    }
  };

  if (loadError)
    return (
      <div role="alert" className={s.loadError}>
        <Icon name="warning" size={18} />
        <span>{loadError}</span>
        <button type="button" className={w.outlineButton} onClick={onBack}>
          목록
        </button>
      </div>
    );
  if (!draft)
    return (
      <WorkProgress
        className={w.loading}
        label="문제 세트를 불러오는 중입니다…"
      />
    );

  // 만든 조건 — 만들 때의 기록이라 고쳐도 바뀌지 않는다(원장님 2026-10-01 «메타데이터 기억되게»)
  const metaLine = englishMetaLine(draft.meta);

  return (
    <div className={s.editor} onBlur={settle}>
      <div className={s.toolbar}>
        <button type="button" className={w.outlineButton} onClick={onBack}>
          목록
        </button>
        <select
          aria-label="검토 상태"
          value={draft.status}
          onChange={(event) =>
            setDraft((current) =>
              current
                ? { ...current, status: event.target.value as EnglishSetStatus }
                : current,
            )
          }
        >
          {ENGLISH_SET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <span className={s.toolbarSpacer} />
        <button
          ref={printRef}
          type="button"
          className={w.outlineButton}
          onClick={() => setPrintOpen(true)}
        >
          <Icon name="print" size={18} />
          인쇄
        </button>
        <button
          ref={deleteRef}
          type="button"
          className={w.outlineButton}
          onClick={() => {
            setDeleteError(null);
            setDeleteOpen(true);
          }}
        >
          세트 삭제
        </button>
        <button
          type="button"
          className={w.primaryButton}
          disabled={saving}
          onClick={() => void save()}
        >
          저장
        </button>
      </div>
      {conflict && (
        <div role="alert" className={s.conflict}>
          <Icon name="warning" size={18} />
          <span>{conflict}</span>
          <button
            type="button"
            className={w.outlineButton}
            onClick={() => {
              setConflict(null);
              setReload((count) => count + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className={s.formError}>
          {error}
        </p>
      )}

      <section className={s.card}>
        <input
          className={s.titleInput}
          aria-label="세트 이름"
          value={draft.title}
          maxLength={SET_TITLE_MAX}
          onChange={(event) =>
            edit((set) => ({ ...set, title: event.target.value }))
          }
        />
        <p className={s.metaLine}>
          {SOURCE_LABEL[draft.source]} · {draft.questions.length}문항 ·{" "}
          {exam.school}
        </p>
        {metaLine ? <p className={s.metaLine}>만든 조건 — {metaLine}</p> : null}
        {headNotes.length || hiddenCount ? (
          <div className={s.notes}>
            {headNotes.map((note) => noteLine(note, true))}
            {hiddenCount ? (
              <p className={s.noteLine}>
                <span className={s.noteText}>
                  확인함으로 숨긴 것 {hiddenCount}
                </span>
                <button
                  type="button"
                  className={s.noteButton}
                  onClick={restoreAcked}
                >
                  다시 보기
                </button>
              </p>
            ) : null}
          </div>
        ) : null}
        <label className={s.passageBox}>
          지문
          <AutoGrowTextarea
            value={draft.passage}
            maxLength={ENGLISH_PASSAGE_MAX}
            onChange={(event) =>
              edit((set) => ({ ...set, passage: event.target.value }))
            }
          />
        </label>
      </section>

      {draft.questions.map((question, index) => {
        const n = index + 1;
        const open = ENGLISH_OPEN_TYPES.includes(question.type);
        const isEditing = editing.has(index);
        const options = Array.from(
          { length: ENGLISH_CHOICE_COUNT },
          (_, i) => question.options[i] ?? "",
        );
        return (
          <section
            key={n}
            id={cardId(index)}
            aria-label={`${n}번 문항`}
            className={`${s.card} ${s.question}`}
          >
            <div className={s.qHeadRow}>
              <p className={s.qHead}>
                {n}번 · {question.type}
              </p>
              <button
                type="button"
                className={w.outlineButton}
                aria-label={
                  isEditing ? `${n}번 문제 수정 끝` : `${n}번 문제 수정`
                }
                aria-pressed={isEditing}
                data-edit-toggle=""
                onClick={() => toggleEditing(index)}
              >
                {isEditing ? "수정 끝" : "수정"}
              </button>
            </div>
            {!isEditing ? (
              <EnglishQuestionView
                question={question}
                number={n}
                notes={{
                  prompt: notesAt(index, "prompt"),
                  options: notesAt(index, "options"),
                  answer: notesAt(index, "answer"),
                  explanation: notesAt(index, "explanation"),
                }}
              />
            ) : (
              <>
                <label className={s.field}>
                  발문
                  <AutoGrowTextarea
                    aria-label={`${n}번 문제 발문`}
                    value={question.prompt}
                    onChange={(event) =>
                      editQuestion(index, { prompt: event.target.value })
                    }
                  />
                </label>
                {notesAt(index, "prompt")}
                {open ? (
                  <label className={s.field}>
                    정답 · 인정 답안
                    <AutoGrowTextarea
                      aria-label={`${n}번 문제 정답·인정 답안`}
                      value={question.answer}
                      onChange={(event) =>
                        editQuestion(index, { answer: event.target.value })
                      }
                    />
                  </label>
                ) : (
                  <>
                    <ul className={s.options}>
                      {options.map((option, i) => (
                        <li key={i} className={s.optionRow}>
                          <span className={s.optionIndex} aria-hidden="true">
                            {ENGLISH_CHOICE_MARKS[i]}
                          </span>
                          <input
                            aria-label={`${n}번 문제 ${i + 1}번 선택지`}
                            value={option}
                            maxLength={OPTION_MAX}
                            onChange={(event) =>
                              editQuestion(index, {
                                // 끝의 빈 칸은 싣지 않는다 — 읽기 모양에 글 없는 번호 줄이 생기지 않게
                                options: trimTrailingBlankOptions(
                                  options.map((item, j) =>
                                    j === i ? event.target.value : item,
                                  ),
                                ),
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                    <label className={s.answerRow}>
                      정답 번호
                      <select
                        aria-label={`${n}번 문제 정답 번호`}
                        value={question.answer}
                        onChange={(event) =>
                          editQuestion(index, { answer: event.target.value })
                        }
                      >
                        {CHOICES.map((choice, i) => (
                          <option key={choice} value={choice}>
                            {ENGLISH_CHOICE_MARKS[i]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {notesAt(index, "options")}
                {notesAt(index, "answer")}
                <label className={s.field}>
                  해설 · 채점 기준
                  <AutoGrowTextarea
                    aria-label={`${n}번 문제 해설·채점 기준`}
                    value={question.explanation}
                    onChange={(event) =>
                      editQuestion(index, { explanation: event.target.value })
                    }
                  />
                </label>
                {notesAt(index, "explanation")}
                <label className={s.field}>
                  지문 속 근거 <small>지문에서 그대로 이어진 인용</small>
                  <AutoGrowTextarea
                    aria-label={`${n}번 문제 지문 속 근거`}
                    value={question.evidence}
                    onChange={(event) =>
                      editQuestion(index, { evidence: event.target.value })
                    }
                  />
                </label>
              </>
            )}
          </section>
        );
      })}

      {printOpen && (
        <EnglishDialog
          title="인쇄"
          kicker={draft.title}
          returnFocus={printRef}
          onClose={() => setPrintOpen(false)}
        >
          <div className={s.printLinks}>
            <a
              className={w.outlineButton}
              href={`/english/sets/${draft.id}/print?view=student`}
              target="_blank"
              rel="noopener"
            >
              학생용
            </a>
            <a
              className={w.outlineButton}
              href={`/english/sets/${draft.id}/print?view=teacher`}
              target="_blank"
              rel="noopener"
            >
              교사용
            </a>
          </div>
          {draft.status !== "검토 완료" && (
            <p className={s.printNote}>아직 검토 완료하지 않은 문제입니다.</p>
          )}
        </EnglishDialog>
      )}
      {deleteOpen && (
        <ConfirmDialog
          title="문제 세트를 삭제할까요?"
          description={`«${draft.title}» 세트를 지웁니다. 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          busy={deleting}
          error={deleteError}
          returnFocus={deleteRef}
          onConfirm={() => void remove()}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
