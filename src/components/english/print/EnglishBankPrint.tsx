"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";
import { englishBundleNotices, planEnglishBundles } from "@/lib/english/bundle";
import {
  englishUnderlineNotices,
  findEnglishUnderlineProblems,
} from "@/lib/english/underline";
import { groupBankQuestions } from "../englishQuestionSelection";
import { messageOf, statusOf } from "../englishClient";
import { EnglishPaper, type EnglishPaperProps } from "./EnglishPaper";
import { useEnglishPages } from "./useEnglishPages";
import s from "./EnglishBankPrint.module.css";

export default function EnglishBankPrint({
  items,
  onClose,
  onVerify,
}: {
  items: EnglishBankQuestion[];
  onClose: () => void;
  onVerify: () => Promise<EnglishBankQuestion[]>;
}) {
  const groups = useMemo(() => groupBankQuestions(items), [items]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const printing = useRef(false);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !printing.current) close.current();
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex="0"]',
        ) ?? [],
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === root.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === root.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  const group = groups[groupIndex]!;
  const plan = useMemo(() => planEnglishBundles(group.set), [group]);
  const displayIndex = (index: number) => group.numbers[index]! - 1;
  // The analysis uses local source indices; notices use the numbers printed on this paper.
  const notices = englishBundleNotices({
    ...plan,
    bundles: plan.bundles.map((b) => ({
      ...b,
      questions: b.questions.map(displayIndex),
    })),
    leaks: plan.leaks.map((leak) => ({
      ...leak,
      source: displayIndex(leak.source),
      target: displayIndex(leak.target),
    })),
    open: plan.open.map((leak) => ({
      ...leak,
      source: displayIndex(leak.source),
      target: displayIndex(leak.target),
    })),
    variantGroups: plan.variantGroups.map((indices) =>
      indices.map(displayIndex),
    ),
  });
  const problems = findEnglishUnderlineProblems(group.set.questions);
  const underline = englishUnderlineNotices({
    ...problems,
    blocking: problems.blocking.map((problem) => ({
      ...problem,
      question: displayIndex(problem.question),
    })),
    warnings: problems.warnings.map(displayIndex),
  });
  const teacher = sheetIndex >= plan.bundles.length;
  const bundle = plan.bundles[sheetIndex];
  const paper: Omit<EnglishPaperProps, "pages"> = {
    set: group.set,
    exam: group.exam,
    academyName: "학습 자료",
    questionNumbers: group.numbers,
    view: teacher ? "teacher" : "student",
    bundle: bundle
      ? { ...bundle, no: plan.bundles.length === 1 ? null : bundle.no }
      : undefined,
    teacherNotes: [
      ...(notices.order ? [{ label: "배부 순서", text: notices.order }] : []),
      { label: "답이 보이는 문항", text: notices.shown },
      ...(underline.teacherNote
        ? [{ label: "밑줄 표기", text: underline.teacherNote }]
        : []),
    ],
  };
  const { pages, ready, layoutError, oversized, measureNode } =
    useEnglishPages(paper);
  const unreviewed = group.set.status !== "검토 완료";
  const blocked =
    stale ||
    !ready ||
    layoutError ||
    oversized.length > 0 ||
    (!teacher && underline.errors.length > 0) ||
    (unreviewed && !acknowledged);
  const print = async () => {
    if (printing.current || blocked) return;
    printing.current = true;
    setBusy(true);
    setError("");
    try {
      await onVerify();
      window.print();
    } catch (caught) {
      setError(
        statusOf(caught) === 409
          ? "원본이 수정되었습니다. 미리보기를 닫고 변경된 문항을 다시 담아 주세요."
          : messageOf(caught),
      );
      setStale([401, 403, 404, 409].includes(statusOf(caught) ?? 0));
    } finally {
      printing.current = false;
      setBusy(false);
    }
  };
  return createPortal(
    <div
      data-english-bank-print
      className={s.preview}
      role="dialog"
      aria-modal="true"
      aria-label="시험지 미리보기"
      tabIndex={-1}
      ref={root}
    >
      <header className={s.controls}>
        <div className={s.heading}>
          <button disabled={busy} onClick={onClose}>
            ← 문제은행으로
          </button>
          <h2>
            시험지 미리보기{" "}
            <span>
              {items.length}문항 · 원문 {groups.length}개
            </span>
          </h2>
          <button
            className={s.primary}
            disabled={busy || blocked}
            onClick={() => void print()}
          >
            {busy ? "원본 확인 중…" : "현재 묶음 인쇄"}
          </button>
        </div>
        <div className={s.options}>
          <label>
            원문
            <select
              disabled={busy}
              value={groupIndex}
              onChange={(e) => {
                setGroupIndex(Number(e.target.value));
                setSheetIndex(0);
                setAcknowledged(false);
              }}
            >
              {groups.map((g, index) => (
                <option key={`${g.set.id}:${g.set.revision}`} value={index}>
                  {index + 1}. {g.set.title} · {g.numbers.join(", ")}번
                </option>
              ))}
            </select>
          </label>
          <label>
            인쇄할 묶음
            <select
              disabled={busy}
              value={sheetIndex}
              onChange={(e) => setSheetIndex(Number(e.target.value))}
            >
              {plan.bundles.map((b, index) => (
                <option key={b.no} value={index}>
                  학생용 {plan.bundles.length > 1 ? `묶음 ${b.no}` : ""} ·{" "}
                  {b.kind} ·{" "}
                  {b.questions.map((i) => group.numbers[i]).join(", ")}번
                </option>
              ))}
              <option value={plan.bundles.length}>교사용 · 정답과 해설</option>
            </select>
          </label>
          <span>{ready ? `${pages?.length ?? 0}쪽` : "A4 지면 계산 중…"}</span>
        </div>
        <div className={s.notices}>
          <p>
            원문별로 묶음을 선택해 인쇄하세요. 문항 번호는 담은 순서를
            유지합니다.
          </p>
          {notices.handout && <p>{notices.handout}</p>}
          <p>현재 원문 검사: {notices.leak.text}</p>
          {!teacher &&
            underline.errors.map((text) => (
              <p role="alert" key={text}>
                {text}
              </p>
            ))}
          {underline.warning && <p>{underline.warning}</p>}
          {unreviewed && (
            <label>
              <input
                type="checkbox"
                disabled={busy}
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />{" "}
              세트가 ‘{group.set.status}’ 상태임을 확인했으며, 내용을 검토하고
              인쇄합니다.
            </label>
          )}
          {layoutError && (
            <p role="alert">
              지면 크기를 계산하지 못했습니다. 창 크기를 조절하거나 미리보기를
              다시 열어 주세요.
            </p>
          )}
          {!!oversized.length && (
            <p role="alert">
              한 쪽에 들어가지 않는 지문 또는 문항이 있습니다. 원본 세트에서
              분량을 조정해 주세요.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
        </div>
      </header>
      <div className={s.paperHost}>
        <EnglishPaper {...paper} pages={pages} />
      </div>
      {measureNode}
    </div>,
    document.body,
  );
}
