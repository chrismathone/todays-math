"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ZodError, type z } from "zod";
import { textbookConceptEvidenceSchema } from "@/contracts/textbookServer.contract";
import {
  textbookAttemptReviewSchema,
  textbookConceptAttemptSchema,
  type TextbookConceptAttempt,
} from "@/contracts/textbookConcept.contract";
import { CONCEPT_BLANK_FORM_LABELS } from "@/contracts/conceptBlank.contract";
import { MathText } from "@/components/math/MathText";
import {
  integrationRequest,
  integrationMessage,
  TextbookIntegrationError,
} from "./request";
import s from "./integration.module.css";

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  dateStyle: "short",
  timeStyle: "short",
});
type Evidence = z.infer<typeof textbookConceptEvidenceSchema>;
export default function TextbookStudentEvidence({
  studentId,
  refreshKey = 0,
}: {
  studentId: string;
  refreshKey?: number;
}) {
  return (
    <StudentEvidence
      key={studentId}
      studentId={studentId}
      refreshKey={refreshKey}
    />
  );
}

function StudentEvidence({
  studentId,
  refreshKey = 0,
}: {
  studentId: string;
  refreshKey?: number;
}) {
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void integrationRequest(
      `/api/textbook/students/${studentId}/concept-evidence`,
      textbookConceptEvidenceSchema,
      { signal: controller.signal },
    )
      .then((result) => {
        if (result.attempts.some((attempt) => attempt.studentId !== studentId))
          throw new TextbookIntegrationError(
            422,
            "학생 기록이 일치하지 않습니다. 다시 불러오세요.",
          );
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          if (
            caught instanceof ZodError ||
            (caught instanceof TextbookIntegrationError &&
              [401, 403, 404, 422].includes(caught.status))
          )
            setData(null);
          setError(
            caught instanceof TextbookIntegrationError && caught.status === 404
              ? "교재 활동을 확인할 수 없습니다. 학생의 재원 상태와 교재 담당 권한을 확인해 주세요."
              : integrationMessage(caught),
          );
        }
      });
    return () => controller.abort();
  }, [studentId, reload, refreshKey]);
  return (
    <section className={s.panel} aria-label="교재와 개념백지 활동">
      <div className={s.notice}>
        <div className={s.row}>
          <h3>교재·백지 활동</h3>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            활동 새로고침
          </button>
        </div>
        <p className={s.muted}>
          교재에서 낸 설명과 종이 활동을 함께 확인합니다. 확인 표시는 이 활동의
          기록으로 남습니다.
        </p>
        {error && <p role="alert">{error}</p>}
        {!data ? (
          !error && <p role="status">활동을 불러오는 중…</p>
        ) : data.attempts.length === 0 ? (
          <p>
            아직 기록된 교재 활동이 없습니다. 교재를 배정하면 학생이 QR에서
            개념백지에 답할 수 있습니다.
          </p>
        ) : (
          <>
            <p className={s.muted}>
              최근 {data.attempts.length}건
              {data.attempts.length === 500 ? " · 최대 500건 표시" : ""}
            </p>
            <ul className={s.list}>
              {data.attempts.map((attempt) => {
                const source = data.references.find(
                  (row) =>
                    row.editionId === attempt.editionId &&
                    row.conceptKey === attempt.conceptKey,
                );
                return (
                  <li key={attempt.attemptId}>
                    <div className={s.row}>
                      <strong>
                        {source?.canOpen ? (
                          <MathText text={source.conceptTitle ?? "교재 개념"} />
                        ) : (
                          "교재 개념 활동"
                        )}
                      </strong>
                      <span>{CONCEPT_BLANK_FORM_LABELS[attempt.form]}</span>
                    </div>
                    {source?.canOpen && (
                      <p className={s.muted}>
                        {source.bookTitle} · {source.editionLabel}
                      </p>
                    )}
                    <p className={s.muted}>
                      {attempt.channel === "student-text"
                        ? "학생 답변"
                        : "교사의 종이 활동 관찰"}{" "}
                      ·{" "}
                      <time dateTime={attempt.submittedAt}>
                        {dateTime.format(new Date(attempt.submittedAt))}
                      </time>
                    </p>
                    <div className={s.response}>{attempt.response}</div>
                    {source?.canOpen && (
                      <div className={s.actions}>
                        <Link
                          href={`/textbook/editions/${attempt.editionId}/concepts/${attempt.conceptKey}/blank?view=both`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          교재 백지·채점표
                        </Link>
                        <Link
                          href={`/?${new URLSearchParams({ textbookEdition: attempt.editionId })}#textbook`}
                        >
                          교재에서 열기
                        </Link>
                      </div>
                    )}
                    <Review
                      attempt={attempt}
                      onSaved={(next) =>
                        setData((current) =>
                          current
                            ? {
                                ...current,
                                attempts: current.attempts.map((row) =>
                                  row.attemptId === next.attemptId ? next : row,
                                ),
                              }
                            : current,
                        )
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function Review({
  attempt,
  onSaved,
}: {
  attempt: TextbookConceptAttempt;
  onSaved: (next: TextbookConceptAttempt) => void;
}) {
  const [note, setNote] = useState(attempt.note ?? "");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const previous = useRef<z.infer<typeof textbookAttemptReviewSchema> | null>(
    null,
  );
  async function save(reviewStatus: "checked" | "needs-review") {
    if (saving.current || conflictRevision === attempt.revision) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    const body = {
      expectedRevision: attempt.revision,
      reviewStatus,
      note: note || null,
    };
    const old = previous.current;
    const request =
      old &&
      old.expectedRevision === body.expectedRevision &&
      old.reviewStatus === reviewStatus &&
      old.note === body.note
        ? old
        : textbookAttemptReviewSchema.parse({
            requestId: crypto.randomUUID(),
            ...body,
          });
    previous.current = request;
    try {
      const saved = await integrationRequest(
        `/api/textbook/concept-attempts/${attempt.attemptId}/review`,
        textbookConceptAttemptSchema,
        { body: request },
      );
      if (
        saved.attemptId !== attempt.attemptId ||
        saved.studentId !== attempt.studentId ||
        saved.editionId !== attempt.editionId ||
        saved.conceptKey !== attempt.conceptKey
      )
        throw new Error("저장된 활동이 요청한 기록과 다릅니다.");
      onSaved(saved);
      previous.current = null;
      setNotice("활동 확인을 저장했습니다.");
    } catch (caught) {
      setError(integrationMessage(caught));
      if (caught instanceof TextbookIntegrationError && caught.status === 409)
        setConflictRevision(attempt.revision);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      <p className={s.muted}>
        확인 상태:{" "}
        {attempt.reviewStatus === "checked"
          ? "확인 완료"
          : attempt.reviewStatus === "needs-review"
            ? "다시 살펴보기"
            : "확인 대기"}
      </p>
      <label className={s.field}>
        교사 메모
        <textarea
          value={note}
          rows={2}
          maxLength={4000}
          disabled={busy}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className={s.actions}>
        <button
          type="button"
          disabled={busy || conflictRevision === attempt.revision}
          onClick={() => void save("checked")}
        >
          확인 완료
        </button>
        <button
          type="button"
          disabled={busy || conflictRevision === attempt.revision}
          onClick={() => void save("needs-review")}
        >
          다시 살펴보기
        </button>
      </div>
      {error && (
        <p role="alert">
          {error}
          {conflictRevision === attempt.revision
            ? " 활동 새로고침으로 최신 확인 상태를 받아 주세요. 입력한 메모는 유지됩니다."
            : ""}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
