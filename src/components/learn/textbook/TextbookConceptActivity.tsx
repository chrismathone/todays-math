"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import {
  textbookStudentAttemptSchema,
  textbookStudentConceptSchema,
  textbookReviewStartSchema,
  type TextbookStudentConcept,
} from "@/contracts/textbookStudent.contract";
import {
  studentTextbookRequest,
  studentTextbookError,
  redirectStudentSession,
} from "./studentTextbookApi";
import s from "./textbookLearn.module.css";

const labels = {
  recall: "완전 백지",
  term: "용어 백지",
  cloze: "문장 백지",
  map: "개념 지도",
  figure: "그림 백지",
};
const reviewLabels: Record<string, string> = {
  "no-current-reviewed-explorer-link":
    "선생님이 복습할 개념 연결을 확인하고 있어요.",
  "no-existing-concept-record":
    "이 개념의 학습 기록이 쌓이면 복습으로 이어갈 수 있어요.",
  "learning-records-unavailable":
    "학습 기록 연결을 확인하고 있어요. 잠시 뒤 다시 시도해 주세요.",
};

export function TextbookConceptActivity({
  studentId,
  editionId,
  conceptKey,
  initialConcept,
}: {
  studentId: string;
  editionId: string;
  conceptKey: string;
  initialConcept?: TextbookStudentConcept;
}) {
  const router = useRouter();
  const [concept, setConcept] = useState(initialConcept ?? null);
  const [form, setForm] = useState<"recall" | "term" | "cloze">(
    initialConcept?.blanks[0]?.form ?? "recall",
  );
  const [response, setResponse] = useState("");
  const [attempts, setAttempts] = useState<
    z.infer<typeof textbookStudentAttemptSchema>[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const submitRequest = useRef<{
    requestId: string;
    form: string;
    response: string;
  } | null>(null);
  const reviewRequest = useRef<string | null>(null);
  const base = `/api/learn/textbook/editions/${editionId}/concepts/${conceptKey}`;
  const href = `/learn/textbook/${editionId}/concepts/${conceptKey}`;
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      studentTextbookRequest(base, textbookStudentConceptSchema, {
        signal: controller.signal,
        studentId,
      }),
      studentTextbookRequest(
        `${base}/attempts`,
        z.array(textbookStudentAttemptSchema),
        { signal: controller.signal, studentId },
      ),
    ])
      .then(([next, history]) => {
        setConcept(next);
        setAttempts(history);
        setForm((previous) =>
          next.blanks.some((blank) => blank.form === previous)
            ? previous
            : (next.blanks[0]?.form ?? "recall"),
        );
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          redirectStudentSession(caught);
          setError(studentTextbookError(caught));
          setConcept(null);
        }
      });
    return () => controller.abort();
  }, [base, refresh, studentId]);
  const sheet = concept?.blanks.find((blank) => blank.form === form);
  async function submit() {
    if (busy || !response.trim() || !sheet) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const previous = submitRequest.current;
    const request =
      previous?.form === form && previous.response === response
        ? previous
        : { requestId: crypto.randomUUID(), form, response };
    submitRequest.current = request;
    try {
      const saved = await studentTextbookRequest(
        `${base}/attempts`,
        z.object({
          attempt: textbookStudentAttemptSchema,
          replayed: z.boolean(),
        }),
        { body: request, studentId },
      );
      setAttempts((old) => [
        saved.attempt,
        ...old.filter(
          (attempt) => attempt.attemptId !== saved.attempt.attemptId,
        ),
      ]);
      submitRequest.current = null;
      setNotice("답변을 저장했어요. 선생님이 확인할 수 있어요.");
      setResponse("");
    } catch (caught) {
      redirectStudentSession(caught);
      setError(studentTextbookError(caught));
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    reviewRequest.current ??= crypto.randomUUID();
    try {
      const result = await studentTextbookRequest(
        `${base}/review`,
        textbookReviewStartSchema,
        { body: { requestId: reviewRequest.current }, studentId },
      );
      if (result.href) {
        router.push(
          `${result.href}&${new URLSearchParams({ fromTextbook: href })}`,
        );
      } else {
        setNotice(
          reviewLabels[result.reasonCode ?? ""] ??
            "지금 이 개념의 복습을 열 수 없어요. 선생님께 확인해 주세요.",
        );
        reviewRequest.current = null;
      }
    } catch (caught) {
      redirectStudentSession(caught);
      setError(studentTextbookError(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.activity} aria-label="교재 개념백지">
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
              setRefresh((value) => value + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
      {!concept && !error && <p role="status">개념백지를 불러오고 있어요…</p>}
      {concept && (
        <>
          <p className={s.eyebrow}>교재에서 배운 개념</p>
          <h1>{concept.title}</h1>
          <p className={s.muted}>
            책을 덮고, 배운 내용을 자신의 말로 적어 보세요.
          </p>
          <div className={s.actions} aria-label="백지 형식">
            {concept.blanks.map((blank) => (
              <button
                key={blank.form}
                aria-pressed={form === blank.form}
                disabled={busy}
                onClick={() => {
                  setForm(blank.form);
                  setResponse("");
                  submitRequest.current = null;
                }}
              >
                {labels[blank.form]}
              </button>
            ))}
          </div>
          {sheet && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <ol className={s.prompts}>
                {sheet.prompts.map((prompt) => (
                  <li key={prompt.id}>
                    <MarkdownRenderer content={prompt.label} />
                    <div className={s.pieces}>
                      {prompt.pieces.map((piece, index) =>
                        piece.kind === "text" ? (
                          <span key={index}>
                            <MarkdownRenderer content={piece.text} />
                          </span>
                        ) : (
                          <span
                            key={index}
                            className={s.blank}
                            aria-label={`빈칸 ${piece.index + 1}`}
                          />
                        ),
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              <label className={s.answer}>
                나의 설명
                <textarea
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  maxLength={20_000}
                  rows={7}
                  disabled={busy}
                  placeholder="번호별로 생각을 적어 보세요."
                />
              </label>
              <button
                className={s.primary}
                type="submit"
                disabled={busy || !response.trim()}
              >
                {busy ? "저장 중…" : "답변 제출"}
              </button>
            </form>
          )}
          {concept.paperForms.length > 0 && (
            <p className={s.muted}>
              {concept.paperForms.map((paper) => labels[paper]).join(" · ")}는
              교재의 종이 활동을 완성하고 선생님께 보여 주세요.
            </p>
          )}
          <div className={s.review}>
            <h2>배운 개념 다시 확인하기</h2>
            {concept.reviewAccess.available ? (
              <button disabled={busy} onClick={() => void review()}>
                개념 복습 이어가기
              </button>
            ) : (
              <p>
                {reviewLabels[concept.reviewAccess.reasonCode ?? ""] ??
                  "이 개념의 복습 준비를 확인하고 있어요."}
              </p>
            )}
            <Link
              href={`/learn?view=collection&${new URLSearchParams({ fromTextbook: href })}`}
            >
              내 개념 도감
            </Link>
          </div>
          {attempts.length > 0 && (
            <section className={s.history}>
              <h2>내 활동 기록</h2>
              {attempts.map((attempt) => (
                <article key={attempt.attemptId}>
                  <div className={s.actions}>
                    <strong>{labels[attempt.form]}</strong>
                    <span>
                      {attempt.reviewStatus === "checked"
                        ? "확인 완료"
                        : attempt.reviewStatus === "needs-review"
                          ? "다시 살펴보기"
                          : "확인 대기"}
                    </span>
                  </div>
                  <time dateTime={attempt.submittedAt}>
                    {new Date(attempt.submittedAt).toLocaleString("ko-KR")}
                  </time>
                  {attempt.channel === "student-text" ? (
                    <p className={s.ownResponse}>{attempt.response}</p>
                  ) : (
                    <p>선생님이 종이 활동을 확인한 기록입니다.</p>
                  )}
                </article>
              ))}
            </section>
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
