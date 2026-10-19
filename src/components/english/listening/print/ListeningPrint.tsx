"use client";

import type { ListeningPrintDocument } from "@/lib/english/listening/print";
import s from "./ListeningPrint.module.css";
import {
  hasFullListeningQuestionImage,
  hasListeningChoiceText,
  listeningChoiceBody,
  listeningChoiceMarks,
} from "@/lib/listeningQuestionPresentation";

export function ListeningPrint({
  document,
}: {
  document: ListeningPrintDocument;
}) {
  return (
    <div className={s.frame}>
      <div className={s.toolbar}>
        <span>
          영어듣기 · {document.view === "teacher" ? "교사용" : "학생용"}
        </span>
        <button type="button" onClick={() => window.print()}>
          인쇄
        </button>
      </div>
      <article className={s.paper}>
        <header className={s.header}>
          <p>오늘 영어 · 영어듣기</p>
          <h1>{document.title}</h1>
          <p>
            {document.view === "teacher"
              ? "교사용 · 대본과 정답 포함"
              : "이름 ____________________  날짜 ____________________"}
          </p>
        </header>
        {document.groups.map((group, index) => (
          <section key={group.id} className={s.group}>
            <h2>듣기 {index + 1}</h2>
            {group.questions.map((question) => (
              <section key={question.id} className={s.question}>
                <h3>
                  {question.number}.{" "}
                  {hasFullListeningQuestionImage(question.image)
                    ? `원본 ${question.sourceNumber ?? question.number}번`
                    : question.prompt}
                </h3>
                {question.reconstructionLabel && (
                  <p>{question.reconstructionLabel}</p>
                )}
                {question.instruction &&
                  (hasFullListeningQuestionImage(question.image) ||
                    !question.prompt.includes(question.instruction)) && (
                    <p>{question.instruction}</p>
                  )}
                {question.image ? (
                  // A validated PNG crop keeps original tables and picture choices intact.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={question.image.dataUrl}
                    width={question.image.width}
                    height={question.image.height}
                    alt={
                      hasFullListeningQuestionImage(question.image)
                        ? question.prompt
                        : `${question.number}번 시각 자료`
                    }
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                ) : null}
                {!hasFullListeningQuestionImage(question.image) &&
                (!question.image ||
                  hasListeningChoiceText(question.choices)) ? (
                  <ol className={s.choices}>
                    {question.choices.map((choice, choiceIndex) => (
                      <li key={choiceIndex}>
                        <span>{listeningChoiceMarks[choiceIndex]}</span>{" "}
                        {listeningChoiceBody(choice, choiceIndex)}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {question.answer !== undefined && (
                  <div className={s.answer}>
                    <strong>정답 {question.answer}</strong>
                    <p>{question.explanation}</p>
                  </div>
                )}
              </section>
            ))}
            {group.transcript !== undefined && (
              <section className={s.transcript}>
                <h3>대본</h3>
                <p>{group.transcript}</p>
                {group.translation && (
                  <>
                    <h3>해석</h3>
                    <p>{group.translation}</p>
                  </>
                )}
              </section>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
