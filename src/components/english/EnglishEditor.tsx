"use client";

/**
 * 검토·편집 화면 (D-148 · 25 §1.3 · 셸 브리프 §2.3). 라우트가 아니라 «학교별 내신 대비» 뷰 안 상태로 열린다 — «목록»으로 돌아간다.
 *
 * 도구 줄: «목록» · 검토 상태 · «인쇄»(학생용·교사용 새 탭) · «세트 삭제» · «저장».
 * 저장은 `PUT /api/english/sets/{id}` 에 `revision` 을 실어 보낸다(CAS) — 409 면 알림 줄 + «다시 불러오기».
 * 내용을 고치면 상태는 «초안»으로 내려간다(ChatGPT 앱 규칙). 상태만 바꾸는 것은 내용 편집이 아니다.
 * 보내기 전에 공용 검증기(`validateEnglishDraft`)를 한 번 지난다 — 어느 문항·어느 규칙인지 한 줄씩.
 */
import { useEffect, useRef, useState } from "react";

import ConfirmDialog from "@/components/unified/ConfirmDialog";
import Icon from "@/components/unified/WorkspaceIcon";
import WorkProgress from "@/components/unified/WorkProgress";
import w from "@/components/unified/Workroom.module.css";
import {
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
import { ENGLISH_CHOICE_MARKS } from "@/lib/english/options";
import {
  ENGLISH_CHOICE_COUNT,
  validateEnglishDraft,
} from "@/lib/english/validate";

import AutoGrowTextarea from "./AutoGrowTextarea";
import EnglishDialog from "./EnglishDialog";
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
/** 계약이 내보내지 않는 상한 — `english.contract.ts` 의 `setTitleSchema.max(160)` · 보기 원소 `max(1_500)` 과 같은 값 */
const SET_TITLE_MAX = 160;
const OPTION_MAX = 1_500;

export default function EnglishEditor({
  setId,
  initialSet,
  exam,
  onBack,
  onSaved,
  onDeleted,
}: {
  setId: string;
  /** 딥링크가 이미 읽어 둔 세트 — 있으면 다시 읽지 않는다 */
  initialSet?: EnglishSet;
  exam: EnglishExam;
  onBack: () => void;
  onSaved: (set: EnglishSet) => void;
  onDeleted: (id: string) => void;
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

  const toggleEditing = (index: number) =>
    setEditing((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
    if (!draft) return;
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
      setDraft(body.data);
      onSaved(body.data);
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
    <div className={s.editor}>
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
                onClick={() => toggleEditing(index)}
              >
                {isEditing ? "수정 끝" : "수정"}
              </button>
            </div>
            {!isEditing ? (
              <EnglishQuestionView question={question} number={n} />
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
                                options: options.map((item, j) =>
                                  j === i ? event.target.value : item,
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
