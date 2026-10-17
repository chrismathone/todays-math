"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import {
  EXAM_PUBLICATION_TYPE_LABELS,
  EXAM_PUBLICATION_TYPES,
  type ExamPublicationClassChoice,
  type ExamPublicationSummary,
  type ExamPublicationType,
} from "@/contracts/examPublication.contract";
import type { PrivateDocumentSummary } from "@/contracts/privateWorkspace.contract";
import { kstDateOf } from "@/lib/kstDate";
import ConfirmDialog from "./ConfirmDialog";
import { ExamPublicationError, publishExam } from "./examPublicationClient";
import s from "./ExamPublication.module.css";

/**
 * 월말평가 M1 — «내 시험지»에 덧붙는 부분(Hi-fi H3 · 원장님 선택 2026-10-17).
 * 표 위 «채점이 남은 시험» 띠 · 줄의 «N개 반에 냄» 딱지 · «반에 내기» 창. 창은 작업실 확인 창(`ConfirmDialog`) 그대로다.
 */

/** «채점이 남은 시험» — 반마다 남은 학생이 있는 낸 시험. 채점하기는 지금 채점표로 간다. */
export function PendingGradingStrip({
  publications,
}: {
  publications: readonly ExamPublicationSummary[];
}) {
  const pending = publications.flatMap((p) =>
    p.classes.filter((c) => c.remaining > 0).map((c) => ({ p, c })),
  );
  if (!pending.length) return null;
  return (
    <section className={s.strip} aria-label="채점이 남은 시험">
      <header>
        <strong>채점이 남은 시험</strong>
        <span>{pending.length}건</span>
      </header>
      <ul>
        {pending.map(({ p, c }) => (
          <li key={c.testId}>
            <span>
              <b>{p.title}</b> · {c.className} · {monthDay(p.testDate)}
            </span>
            <span className={s.left}>남음 {c.remaining}명</span>
            <Link className={s.gradeLink} href={`/tests/${c.testId}/grade`}>
              채점하기
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 시험지 줄의 딱지 — 그 시험지를 낸 서로 다른 반의 수. */
export function issuedClassCount(
  publications: readonly ExamPublicationSummary[],
  documentId: string,
) {
  return new Set(
    publications
      .filter((p) => p.documentId === documentId)
      .flatMap((p) => p.classes.map((c) => c.classId)),
  ).size;
}

const monthDay = (date: string) => {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
};

type Done = { tests: { classId: string; className: string; testId: string }[] };

/** «반에 내기» 창 — 종류 · 시험일 · 반. 낸 뒤에는 반마다 «채점하기». */
export function PublishDialog({
  item,
  classes,
  returnFocus,
  onClose,
  onPublished,
}: {
  item: PrivateDocumentSummary;
  classes: readonly ExamPublicationClassChoice[];
  returnFocus: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onPublished: () => void;
}) {
  const uid = useId();
  const [examType, setExamType] = useState<ExamPublicationType>("monthly");
  const [testDate, setTestDate] = useState(() => kstDateOf(new Date()));
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  // 같은 창에서 다시 누르면 같은 요청이다(재전송 멱등) — 창을 새로 열면 새 요청이다.
  const requestId = useRef(crypto.randomUUID());

  if (done)
    return (
      <ConfirmDialog
        title="반에 냈습니다"
        confirmLabel="닫기"
        returnFocus={returnFocus}
        onConfirm={onClose}
        onCancel={onClose}
      >
        <p className={s.sheetLine}>
          <b>{item.title}</b> · {done.tests.map((t) => t.className).join(" · ")}
          에 냈습니다. 반마다 채점표가 생겼습니다.
        </p>
        <div className={s.doneLinks}>
          {done.tests.map((t) => (
            <Link key={t.testId} href={`/tests/${t.testId}/grade`}>
              {t.className} 채점하기
            </Link>
          ))}
        </div>
      </ConfirmDialog>
    );

  return (
    <ConfirmDialog
      title="반에 내기"
      confirmLabel={
        busy
          ? "내는 중"
          : picked.length
            ? `${picked.length}개 반에 내기`
            : "반에 내기"
      }
      busy={busy}
      error={error}
      returnFocus={returnFocus}
      onCancel={onClose}
      onConfirm={() => {
        if (!picked.length) return setError("낼 반을 하나 이상 고르십시오.");
        setBusy(true);
        setError(null);
        void publishExam({
          documentId: item.id,
          expectedRevision: item.revision,
          classIds: picked,
          examType,
          testDate,
          requestId: requestId.current,
        })
          .then((created) => {
            setDone({ tests: created.tests });
            onPublished();
          })
          .catch((cause: unknown) =>
            setError(
              cause instanceof ExamPublicationError
                ? cause.message
                : "내지 못했습니다. 다시 시도해 주세요.",
            ),
          )
          .finally(() => setBusy(false));
      }}
    >
      <p className={s.sheetLine}>
        <b>{item.title}</b> · {item.problemCount}문항
      </p>
      <div className={s.fields}>
        <label className={s.field} htmlFor={`${uid}-type`}>
          시험 종류
          <select
            id={`${uid}-type`}
            value={examType}
            disabled={busy}
            onChange={(e) => setExamType(e.target.value as ExamPublicationType)}
          >
            {EXAM_PUBLICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {EXAM_PUBLICATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field} htmlFor={`${uid}-date`}>
          시험일
          <input
            id={`${uid}-date`}
            type="date"
            value={testDate}
            disabled={busy}
            required
            onChange={(e) => setTestDate(e.target.value)}
          />
        </label>
        <fieldset className={s.classes} disabled={busy}>
          <legend>반</legend>
          {classes.length ? (
            classes.map((cls) => (
              <label key={cls.id}>
                <input
                  type="checkbox"
                  checked={picked.includes(cls.id)}
                  onChange={(e) =>
                    setPicked((now) =>
                      e.target.checked
                        ? [...now, cls.id]
                        : now.filter((id) => id !== cls.id),
                    )
                  }
                />
                {cls.name} · {cls.students}명
              </label>
            ))
          ) : (
            <p className={s.note}>낼 수 있는 반이 없습니다.</p>
          )}
        </fieldset>
        <p className={s.note}>
          낸 시험지는 고칠 수 없습니다. 고치려면 작업실에서 고친 뒤 다시 냅니다.
          채점을 시작하기 전에는 낸 시험을 지울 수 있습니다.
        </p>
      </div>
    </ConfirmDialog>
  );
}
