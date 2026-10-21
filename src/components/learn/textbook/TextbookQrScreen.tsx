"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { MATH_TEXT_WRAP } from "@/components/math/mathTextWrap";
import {
  textbookStudentQrSchema,
  type TextbookStudentQr,
} from "@/contracts/textbookStudent.contract";
import { solutionForDisplay } from "@/lib/solutionSteps";
import {
  studentTextbookRequest,
  studentTextbookError,
  redirectStudentSession,
} from "./studentTextbookApi";
import { TextbookConceptActivity } from "./TextbookConceptActivity";
import { TextbookVideo } from "./TextbookVideo";
import s from "./textbookLearn.module.css";

export function TextbookQrScreen({
  slug,
  studentId,
}: {
  slug: string;
  studentId: string;
}) {
  const [data, setData] = useState<TextbookStudentQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void studentTextbookRequest(
      `/api/learn/textbook/q/${slug}`,
      textbookStudentQrSchema,
      { signal: controller.signal, studentId },
    )
      .then(setData)
      .catch((caught) => {
        if (!controller.signal.aborted) {
          redirectStudentSession(caught);
          setError(studentTextbookError(caught));
        }
      });
    return () => controller.abort();
  }, [slug, retry, studentId]);
  if (error)
    return (
      <main className={s.main}>
        <h1>교재 학습</h1>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setRetry((value) => value + 1);
          }}
        >
          다시 확인하기
        </button>
        <Link href="/learn">내 학습으로</Link>
      </main>
    );
  if (!data)
    return (
      <main className={s.main}>
        <p role="status">교재 학습을 불러오고 있어요…</p>
      </main>
    );
  if (data.kind === "concept")
    return (
      <main className={s.main}>
        <TextbookConceptActivity
          key={`${studentId}:${data.concept.editionId}:${data.concept.conceptKey}`}
          studentId={studentId}
          editionId={data.concept.editionId}
          conceptKey={data.concept.conceptKey}
          initialConcept={data.concept}
        />
        <TextbookVideo
          key={data.video.providerVideoId}
          video={data.video}
          title={data.concept.title}
        />
      </main>
    );
  const dims = data.figures.flatMap((figure) => [
    figure.widthPx,
    figure.heightPx,
  ]);
  const widths = data.figures.map((figure) => figure.sourceWidthMm);
  return (
    <main className={s.main}>
      <p className={s.eyebrow}>{data.title}</p>
      <h1>{data.displayNumber}번 문제</h1>
      <PaperProblemView
        content={data.content}
        figureUrls={data.figures.map((figure) => figure.url)}
        figureDims={dims}
        figureSourceMm={widths}
        choiceFigureIndex={data.figures.map((figure) => figure.choiceIndex)}
      />
      <TextbookVideo
        key={data.video.providerVideoId}
        video={data.video}
        title={`${data.displayNumber}번 해설`}
      />
      {data.textSolutionAvailable && (
        <details className={s.block}>
          <summary>정답과 풀이 확인</summary>
          <MarkdownRenderer
            content={data.answer ?? ""}
            className={MATH_TEXT_WRAP}
          />
          {data.solution !== null && (
            <MarkdownRenderer
              content={solutionForDisplay(data.solution) ?? ""}
              className={MATH_TEXT_WRAP}
            />
          )}
        </details>
      )}
      {data.concepts.length > 0 && (
        <section className={s.block}>
          <h2>이 문제에서 쓰는 개념</h2>
          <ul className={s.links}>
            {data.concepts.map((concept) => (
              <li key={concept.conceptKey}>
                <Link
                  href={`/learn/textbook/${data.editionId}/concepts/${concept.conceptKey}`}
                >
                  {concept.title}
                  <span>개념백지 열기 →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link href="/learn">내 학습으로</Link>
    </main>
  );
}
