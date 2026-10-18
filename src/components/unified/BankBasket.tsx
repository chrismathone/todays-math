"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  questionConflicts,
  questionIdentity,
} from "@/lib/problem/questionSelectionClient";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import UnifiedProblem from "./UnifiedProblem";
import type { StudioProblem } from "./types";
import styles from "./BankView.module.css";

function SelectedPreview({
  problem,
  index,
  count,
  busy,
  canReorder,
  onClose,
  onRemove,
  onReplace,
  onFormatChange,
  onMove,
  fallbackFocus,
}: {
  problem: StudioProblem;
  index: number;
  count: number;
  busy: boolean;
  canReorder: boolean;
  onClose: () => void;
  onRemove: () => void;
  onReplace: () => void;
  onFormatChange?: () => void;
  onMove: (direction: -1 | 1) => void;
  fallbackFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    const fallback = fallbackFocus.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      (previous?.isConnected ? previous : fallback)?.focus({
        preventScroll: true,
      });
    };
  }, [fallbackFocus]);

  return (
    <dialog
      ref={dialog}
      className={styles.selectedPreview}
      style={{
        maxWidth: `min(calc(100vw - 24px), calc(${PROBLEM_CARD_WIDTH} + 32px))`,
      }}
      aria-labelledby={`${id}-title`}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className={styles.previewInner}>
        <div className={styles.previewHeading}>
          <div>
            <h3 id={`${id}-title`}>{index + 1}번 문제 미리보기</h3>
            <span>
              {problem.difficulty || "난이도 미지정"} · {count}문항 중{" "}
              {index + 1}번
            </span>
          </div>
          <button
            type="button"
            className={styles.textButton}
            aria-label="미리보기 닫기"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <div className={styles.previewBody}>
          <UnifiedProblem problem={problem} />
        </div>
        <div className={styles.previewActions}>
          {canReorder ? (
            <div className={styles.orderActions}>
              <button
                type="button"
                className={styles.textButton}
                aria-label="문제 순서 앞으로"
                disabled={busy || index === 0}
                onClick={() => onMove(-1)}
              >
                ← 앞으로
              </button>
              <button
                type="button"
                className={styles.textButton}
                aria-label="문제 순서 뒤로"
                disabled={busy || index === count - 1}
                onClick={() => onMove(1)}
              >
                뒤로 →
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={styles.textButton}
            disabled={busy}
            onClick={onRemove}
          >
            담기 취소
          </button>
          {onFormatChange && (problem.questionFormats?.length ?? 0) > 1 && (
            <button
              type="button"
              className={styles.textButton}
              disabled={busy}
              onClick={onFormatChange}
            >
              출제 형식 변경
            </button>
          )}
          {canReorder ? (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy}
              onClick={onReplace}
            >
              이 문제 교체
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

export default function BankBasket({
  selected,
  busy,
  canExport,
  onExport,
  onChange,
  onReplace,
  onFormatChange,
  canReorder,
}: {
  selected: StudioProblem[];
  busy: boolean;
  canExport: boolean;
  onExport: () => void;
  onChange: (problems: StudioProblem[]) => void;
  onReplace: (id: string) => void;
  onFormatChange?: (item: StudioProblem) => void;
  canReorder: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const conflicts = questionConflicts(selected);
  const questions = [
    ...new Map(selected.map((item) => [questionIdentity(item), item])).values(),
  ];
  const index = questions.findIndex((problem) => problem.id === previewId);
  const preview = questions[index];
  const summary = DIFFICULTY_LADDER.map((tier) => ({
    tier,
    count: questions.filter(
      (problem) =>
        problem.difficulty === tier &&
        !conflicts.some(
          (group) => questionIdentity(group[0]) === questionIdentity(problem),
        ),
    ).length,
  }));
  const unspecified =
    questions.length - summary.reduce((sum, { count }) => sum + count, 0);

  return (
    <>
      <aside
        className={styles.floatingBasket}
        aria-label="담은 문제"
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
            toggle.current?.focus();
          }
        }}
      >
        {open ? (
          <div className={styles.basketPanel} id={`${id}-content`}>
            <div className={styles.basketPanelHeading}>
              <h2>
                담은 문제 <span>{questions.length}문항</span>
              </h2>
              <button
                type="button"
                className={styles.textButton}
                disabled={busy || !selected.length}
                onClick={() => {
                  onChange([]);
                  toggle.current?.focus();
                }}
              >
                전체 비우기
              </button>
            </div>
            <p className={styles.basketHint}>
              {selected.length
                ? canReorder
                  ? "번호를 누르면 미리보기·교체·순서 변경"
                  : "번호를 누르면 문제 미리보기"
                : "목록에서 문제를 담거나 랜덤으로 추가하세요."}
            </p>
            {conflicts.length > 0 && (
              <p className={styles.randomError} role="alert">
                형식 선택 충돌 {conflicts.length}문항 · 미리보기에서 유지할
                형식을 선택하세요.
              </p>
            )}
            {selected.length ? (
              <>
                <div
                  className={styles.basketDifficulty}
                  aria-label="담은 문제 난이도 구성"
                >
                  {summary
                    .filter(({ count }) => count > 0)
                    .map(({ tier, count }) => (
                      <span key={tier}>
                        {tier} <b>{count}</b>
                      </span>
                    ))}
                  {unspecified > 0 ? (
                    <span>
                      미지정 <b>{unspecified}</b>
                    </span>
                  ) : null}
                </div>
                <ol
                  className={styles.basketNumberGrid}
                  aria-label="담은 문제 번호"
                >
                  {questions.map((problem, number) => (
                    <li key={problem.id}>
                      <button
                        type="button"
                        aria-label={`${number + 1}번 담은 문제 미리보기`}
                        onClick={() => setPreviewId(problem.id)}
                      >
                        {number + 1}
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {canExport ? (
              <button
                type="button"
                className={styles.basketExport}
                disabled={busy || !selected.length || conflicts.length > 0}
                onClick={onExport}
              >
                시험지 편집 <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
        ) : null}
        <button
          ref={toggle}
          type="button"
          className={styles.basketLauncher}
          aria-expanded={open}
          aria-controls={open ? `${id}-content` : undefined}
          aria-label={open ? "담은 문제 목록 닫기" : "담은 문제 목록 보기"}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">{open ? "−" : "+"}</span> 담은 문제{" "}
          <strong aria-live="polite">{questions.length}</strong>
          <span className="sr-only">문항</span>
        </button>
      </aside>
      {preview ? (
        <SelectedPreview
          problem={preview}
          index={index}
          count={questions.length}
          busy={busy}
          canReorder={canReorder && !conflicts.length}
          fallbackFocus={toggle}
          onClose={() => setPreviewId(null)}
          onRemove={() => {
            onChange(
              selected.filter(
                (problem) =>
                  questionIdentity(problem) !== questionIdentity(preview),
              ),
            );
            setPreviewId(null);
          }}
          onFormatChange={
            onFormatChange
              ? () => {
                  setPreviewId(null);
                  onFormatChange(preview);
                }
              : undefined
          }
          onReplace={() => {
            onReplace(preview.id);
            setPreviewId(null);
            setOpen(false);
          }}
          onMove={(direction) => {
            const next = [...selected];
            [next[index], next[index + direction]] = [
              next[index + direction],
              next[index],
            ];
            onChange(next);
          }}
        />
      ) : null}
    </>
  );
}
