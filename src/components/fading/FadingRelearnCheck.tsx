"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type {
  FadingRelearnAttempt,
  FadingRelearnItem,
  FadingRelearnJudgement,
  FadingRelearnQueue,
  FadingRelearnResult,
} from "@/contracts/fadingRelearn.contract";
import { FADING_TYPED_MAX } from "@/contracts/fading.contract";
import type { FadingJudged } from "@/lib/fading/session";
import { FadingSourceError, newFadingId } from "@/lib/fading/source";
import { fadingSafeLabel } from "@/lib/fading/cards";
import {
  FADING_RELEARN_CAPPED,
  FADING_RELEARN_STOPPED,
} from "@/lib/fading/relearn";
import type { FadingRelearnSource } from "@/lib/fading/relearnSource";
import { FadingMath } from "./FadingMath";
import type { FadingRelearnController } from "./useFadingRelearn";
import s from "./FadingRelearnCheck.module.css";

export function FadingRelearnStatus({
  controller,
  allowStart = true,
  student = false,
}: {
  controller: FadingRelearnController;
  allowStart?: boolean;
  student?: boolean;
}) {
  const { queue, failure, refresh, resume } = controller;
  if (!queue?.enabled && !failure) return null;
  const actionable =
    !!queue?.enabled &&
    allowStart &&
    queue.counts.ready + queue.counts.judging > 0;
  if (student && !actionable && !failure) return null;
  if (student)
    return (
      <aside className={s.status} aria-label="다시 확인하기">
        {actionable ? (
          <button type="button" onClick={resume}>
            {queue!.counts.judging ? "쓴 답 확인하기" : "한 번 더 확인하기"}
          </button>
        ) : null}
        {failure ? (
          <div role="alert">
            <p>{failure}</p>
            <button type="button" onClick={() => void refresh()}>
              다시 불러오기
            </button>
          </div>
        ) : null}
      </aside>
    );
  return (
    <aside className={s.status} aria-label="추가 재학습 현황">
      {queue?.enabled ? (
        <>
          <strong>추가 확인 · 오늘 {queue.today.checks}회</strong>
          <span>기본 분량과 따로 확인해요.</span>
          <span>
            지금 {queue.counts.ready} · 대조 {queue.counts.judging} · 기다리는
            문장 {queue.counts.waiting}
          </span>
          {/* 오늘의 끝(2026-10-17 · Hi-fi Q2) — 상한 수(30)는 보이지 않는다. 기본 분량은 따로 계속할 수 있다. */}
          {queue.limit?.capped || queue.limit?.stopped ? (
            <div className={s.limit}>
              {queue.limit.capped ? <p>{FADING_RELEARN_CAPPED}</p> : null}
              {queue.limit.stopped ? (
                <p>
                  오늘 멈춘 문장 {queue.limit.stopped} · 내일부터 다시 확인해요.
                </p>
              ) : null}
            </div>
          ) : null}
          {allowStart && queue.counts.ready + queue.counts.judging > 0 ? (
            <button type="button" onClick={resume}>
              {queue.counts.judging
                ? "입력한 답 대조 이어하기"
                : "추가 확인 시작"}
            </button>
          ) : null}
        </>
      ) : null}
      {failure ? (
        <div role="alert">
          <p>{failure}</p>
          <button type="button" onClick={() => void refresh()}>
            추가 확인 다시 불러오기
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export function FadingRelearnModal({
  controller,
  student = false,
}: {
  controller: FadingRelearnController;
  student?: boolean;
}) {
  const { active, source } = controller;
  const content = active?.content;
  if (!active || !source || !content) return null;
  return (
    <FadingRelearnCheck
      key={`${active.key}:${active.token}`}
      student={student}
      item={active}
      content={content}
      source={source}
      onQueue={controller.receive}
      onConflict={controller.conflict}
      onFailure={controller.fail}
      onClose={controller.dismiss}
    />
  );
}

/** Canonical answers are rendered only after grade has returned a receipt. */
export function FadingRelearnCheck({
  item,
  content,
  source,
  onQueue,
  onConflict,
  onClose,
  onFailure,
  student = false,
}: {
  item: FadingRelearnItem;
  content: FadingRelearnQueue["contents"][string];
  source: FadingRelearnSource;
  onQueue: (queue: FadingRelearnQueue) => void;
  onConflict: () => void | Promise<void>;
  onClose: () => void;
  onFailure?: (error: unknown) => void;
  student?: boolean;
}) {
  const proposition = content.concept.propositions.find(
    (row) => row.id === item.propositionId,
  )!;
  const targets = proposition.pieces.flatMap((piece) =>
    piece.kind === "target" ? [piece.target] : [],
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      item.pending?.answers.map((answer) => [answer.targetId, answer.text]) ??
        [],
    ),
  );
  const [pending, setPending] = useState(item.pending);
  const [result, setResult] = useState<FadingRelearnResult | null>(null);
  /** 이 확인 뒤에 그 문장(또는 그날의 추가 확인)이 끝났는가 — 다음 날 0시까지 기다린다. */
  const [dayEnd, setDayEnd] = useState<"capped" | "stopped" | null>(null);
  const [judged, setJudged] = useState<FadingJudged>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [retry, setRetry] = useState<
    | { kind: "grade"; value: FadingRelearnAttempt }
    | { kind: "judge"; value: FadingRelearnJudgement }
    | null
  >(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const fields = useRef(new Map<string, HTMLInputElement>());
  const prefix = useId();
  const comparison = !!pending || !!result;
  const unknown =
    pending?.answers.filter((answer) => answer.outcome === "unknown") ?? [];
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement;
    const node = dialog.current;
    if (node?.showModal) node.showModal();
    else node?.setAttribute("open", "");
    (fields.current.get(targets[0]?.id ?? "") ?? node)?.focus();
    return () => {
      alive.current = false;
      node?.close?.();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
    // This dialog owns one immutable attempt/content token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function send(request: NonNullable<typeof retry>) {
    if (lock.current) return;
    lock.current = true;
    setRetry(request);
    setBusy(true);
    setFailure(null);
    try {
      const response =
        request.kind === "grade"
          ? await source.grade(request.value)
          : await source.judge(request.value);
      if (!alive.current) return;
      setRetry(null);
      onQueue(response.queue);
      setResult(response.result);
      const limit = response.queue.limit;
      const row = response.queue.items.find((each) => each.key === item.key);
      setDayEnd(
        limit?.capped
          ? "capped"
          : limit && row?.state === "waiting" && row.dueAt >= limit.resumeAt
            ? "stopped"
            : null,
      );
      setPending(
        response.result.verdict === "judging"
          ? response.queue.items.find((row) => row.key === item.key)?.pending
          : undefined,
      );
    } catch (error) {
      if (!alive.current) return;
      onFailure?.(error);
      if (error instanceof FadingSourceError && error.code === "CONFLICT") {
        setRetry(null);
        await onConflict();
      } else
        setFailure(
          error instanceof Error
            ? error.message
            : "답을 보내지 못했어요. 같은 답으로 다시 시도해 주세요.",
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function grade(gaveUp = false) {
    if (
      comparison ||
      busy ||
      retry ||
      (!gaveUp && targets.some((target) => !answers[target.id]?.trim()))
    )
      return;
    void send({
      kind: "grade",
      value: {
        conceptId: item.conceptId,
        propositionId: item.propositionId,
        token: item.token,
        attemptId: newFadingId(),
        answers: targets.flatMap((target) =>
          answers[target.id]?.trim()
            ? [{ targetId: target.id, text: answers[target.id]! }]
            : [],
        ),
        ...(gaveUp ? { gaveUp: true } : {}),
      },
    });
  }
  function keys(event: KeyboardEvent<HTMLInputElement>, targetId: string) {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    if (
      event.key === "Tab" &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      targets.length > 1
    ) {
      event.preventDefault();
      const index = targets.findIndex((target) => target.id === targetId);
      fields.current
        .get(
          targets[
            (index + (event.shiftKey ? -1 : 1) + targets.length) %
              targets.length
          ]!.id,
        )
        ?.focus();
    }
  }
  return (
    <dialog
      ref={dialog}
      tabIndex={-1}
      className={s.dialog}
      aria-labelledby={`${prefix}-title`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy && !retry) onClose();
      }}
    >
      <header className={s.header}>
        <span className={s.eyebrow}>
          {student ? "오늘의 기억 · 다시 떠올리기" : "오늘의 기억 · 추가 확인"}
        </span>
        <button
          type="button"
          disabled={busy || !!retry}
          onClick={onClose}
          aria-label={student ? "확인 닫기" : "추가 확인 닫기"}
        >
          닫기
        </button>
      </header>
      <h2 id={`${prefix}-title`}>
        {pending
          ? student
            ? "쓴 답을 확인해요"
            : "입력한 답을 대조해요"
          : result
            ? "이번 확인을 마쳤어요"
            : "조금 뒤, 다시 떠올려 볼까요?"}
      </h2>
      <p className={s.note}>
        {student
          ? "빈칸에 알맞은 말을 떠올려 써 보세요."
          : "문장 하나를 확인해요. 기본 학습 분량과 별도로 기록돼요."}
      </p>
      {item.changed ? (
        <p className={s.note}>문장이 바뀌어 지금 내용으로 확인해요.</p>
      ) : null}
      {!comparison ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            grade();
          }}
        >
          <div className={s.sentence}>
            {proposition.pieces.map((piece, index) =>
              piece.kind === "text" ? (
                <FadingMath key={index} text={piece.text} />
              ) : (
                <span className={s.blank} key={piece.target.id}>
                  {targets.findIndex(
                    (target) => target.id === piece.target.id,
                  ) + 1}
                </span>
              ),
            )}
          </div>
          {fadingSafeLabel(proposition.term, targets) ? (
            <div className={s.note}>
              <FadingMath text={proposition.term} />
            </div>
          ) : null}
          <div className={s.inputs}>
            {targets.map((target, index) => (
              <label key={target.id} htmlFor={`${prefix}-${index}`}>
                <span>빈칸 {index + 1}</span>
                <input
                  id={`${prefix}-${index}`}
                  ref={(node) => {
                    if (node) fields.current.set(target.id, node);
                    else fields.current.delete(target.id);
                  }}
                  value={answers[target.id] ?? ""}
                  disabled={busy || !!retry}
                  maxLength={FADING_TYPED_MAX}
                  autoComplete="off"
                  onKeyDown={(event) => keys(event, target.id)}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [target.id]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <p className={s.note}>
            {student
              ? "Tab으로 다음 빈칸으로 가요. Enter를 누르면 쓴 답을 확인해요."
              : "Tab 빈칸 이동 · Enter 답 제출 · 답은 제출한 뒤에 확인해요."}
          </p>
          <div className={s.actions}>
            <button
              type="submit"
              className={s.primary}
              disabled={
                busy ||
                !!retry ||
                targets.some((target) => !answers[target.id]?.trim())
              }
            >
              {busy
                ? "답을 보내고 있어요…"
                : student
                  ? "답 확인하기"
                  : "답 제출"}
            </button>
            <button
              type="button"
              disabled={busy || !!retry}
              onClick={() => grade(true)}
            >
              아직 모르겠어요
            </button>
          </div>
        </form>
      ) : (
        <section
          aria-label={student ? "내가 쓴 답 확인" : "추가 확인 기준안 대조"}
        >
          <div className={s.sentence}>
            {proposition.pieces.map((piece, index) => (
              <FadingMath
                key={index}
                text={piece.kind === "text" ? piece.text : piece.target.text}
              />
            ))}
          </div>
          {targets.map((target, index) => (
            <div key={target.id} className={s.comparison}>
              <strong>빈칸 {index + 1}</strong>
              <p>내 답: {answers[target.id] || "아직 쓰지 못했어요"}</p>
              <div>
                {student ? "답: " : "기준안: "}
                <FadingMath text={target.text} />
              </div>
              {unknown.some((answer) => answer.targetId === target.id) ? (
                <fieldset disabled={busy || !!retry}>
                  <legend>
                    {student
                      ? "내가 쓴 답도 같은 뜻인가요?"
                      : "핵심 뜻을 비교해 주세요"}
                  </legend>
                  {(["same", "different"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={judged[target.id] === value}
                      onClick={() =>
                        setJudged((current) => ({
                          ...current,
                          [target.id]: value,
                        }))
                      }
                    >
                      {value === "same" ? "같은 뜻" : "다름"}
                    </button>
                  ))}
                </fieldset>
              ) : null}
            </div>
          ))}
          {pending ? (
            <>
              <p className={s.note}>
                {student ? (
                  "쓴 답은 저장됐어요. 위의 답과 같은 뜻인지 골라 주세요."
                ) : (
                  <>
                    입력은 저장됐어요. 알아보지 못한 표현을 틀림으로 정하지 않고
                    직접 대조해요.
                  </>
                )}
              </p>
              <button
                type="button"
                className={s.primary}
                disabled={
                  busy ||
                  !!retry ||
                  unknown.some((answer) => !judged[answer.targetId])
                }
                onClick={() =>
                  void send({
                    kind: "judge",
                    value: {
                      conceptId: item.conceptId,
                      propositionId: item.propositionId,
                      attemptId: pending.attemptId,
                      judged,
                    },
                  })
                }
              >
                {student ? "확인 마치기" : "대조 제출"}
              </button>
            </>
          ) : (
            <>
              <p role="status" className={s.note}>
                {result?.verdict === "passed"
                  ? "도움 없이 떠올렸어요."
                  : "다시 확인할 문장으로 남겼어요."}{" "}
                {dayEnd === "stopped" && result?.next
                  ? FADING_RELEARN_STOPPED
                  : result?.next && dayEnd !== "capped"
                    ? result.next.stage === "confirm"
                      ? "5분 뒤 다시 확인해요."
                      : "1분 뒤 다시 확인해요."
                    : result?.next
                      ? ""
                      : student
                        ? "이 문장을 다시 떠올려 봤어요."
                        : "이 문장의 추가 확인을 마쳤어요."}
                {dayEnd === "capped"
                  ? student
                    ? " 오늘은 여기까지예요. 남은 문장은 내일부터 이어서 확인해요."
                    : ` ${FADING_RELEARN_CAPPED}`
                  : null}
              </p>
              <button type="button" className={s.primary} onClick={onClose}>
                원래 학습으로
              </button>
            </>
          )}
        </section>
      )}
      {failure ? (
        <div role="alert" className={s.error}>
          <p>{failure}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (retry) void send(retry);
            }}
          >
            같은 답 다시 보내기
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
