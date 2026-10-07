"use client";

import { useId, useState } from "react";
import type {
  EnglishDraft,
  EnglishQuestion,
  EnglishSetMeta,
} from "@/contracts/english.contract";
import type { EnglishDraftVerdict } from "@/lib/english/validate";
import AutoGrowTextarea from "./AutoGrowTextarea";
import EnglishQuestionView from "./EnglishQuestionView";
import s from "./EnglishMaker.module.css";

/** Maker-only review. Editing questions never rewrites the source snapshot or its bank relationship. */
export default function EnglishMakerPreview({
  draft,
  meta,
  verdict,
  disabled,
  onChange,
}: {
  draft: EnglishDraft;
  meta: EnglishSetMeta;
  verdict: EnglishDraftVerdict;
  disabled: boolean;
  onChange: (draft: EnglishDraft) => void;
}) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const changeQuestion = (index: number, patch: Partial<EnglishQuestion>) => {
    onChange({
      ...draft,
      questions: draft.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    });
  };
  const field = (
    label: string,
    value: string,
    onValue: (value: string) => void,
    rows = 2,
  ) => (
    <label className={s.editField} key={label}>
      <span>{label}</span>
      <AutoGrowTextarea
        aria-label={label}
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(event) => onValue(event.target.value)}
      />
    </label>
  );

  return (
    <div className={s.preview}>
      <header className={s.previewHead}>
        <div>
          <span className={s.draftBadge}>저장 전 초안</span>
          <h2>{draft.title || "제목 없는 초안"}</h2>
          <p>
            {draft.questions.length}문항 · {meta.difficulty} · 원문{" "}
            {draft.passage.trim().split(/\s+/).length}단어
          </p>
        </div>
        <button
          type="button"
          className={s.quietButton}
          disabled={disabled}
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "보기로 전환" : "교사 수정"}
        </button>
      </header>
      <div className={s.validation}>
        <strong>
          {verdict.ok
            ? "형식·근거 인용 검사 통과"
            : `형식·근거 인용 확인 ${verdict.issues.length}건`}
        </strong>
        <p>
          기존 검증기로 보기·정답 형식과 원문 속 근거 인용을 확인합니다. 정답의
          타당성과 해설은 교사가 검토해 주세요.
        </p>
        {!verdict.ok ? (
          <ul className={s.issues} role="alert">
            {verdict.issues.map((issue, i) => (
              <li key={i}>
                {issue.question === null
                  ? "세트"
                  : `${issue.question + 1}번 문항`}
                : {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {editing ? (
        <div className={s.titleEdit}>
          {field(
            "초안 제목",
            draft.title,
            (title) => onChange({ ...draft, title }),
            1,
          )}
        </div>
      ) : null}
      <div className={s.previewColumns}>
        <section className={s.sourcePreview} aria-labelledby={`${uid}-source`}>
          <div className={s.sectionHead}>
            <h3 id={`${uid}-source`}>
              {meta.mode === "new" ? "AI 제작 원문" : "문제에 사용한 원문"}
            </h3>
            {meta.passageRef ? (
              <span className={s.sourceBadge}>은행 원문 연결</span>
            ) : null}
          </div>
          {meta.materialName ? (
            <p className={s.sourceName}>{meta.materialName}</p>
          ) : null}
          <p className={s.passage}>{draft.passage}</p>
          {meta.sourcePassage ? (
            <details className={s.originalSource}>
              <summary>변형 전 원문 보기</summary>
              <p className={s.passage}>{meta.sourcePassage}</p>
            </details>
          ) : null}
          {editing ? (
            <p className={s.sourceNote}>
              원문 연결을 유지한 채 문항을 수정합니다. 원문을 바꾸려면 제작
              조건에서 새로 생성하세요.
            </p>
          ) : null}
        </section>
        <section className={s.questionsPreview} aria-label="문항과 정답·해설">
          {draft.questions.map((question, index) => (
            <article
              className={s.question}
              key={index}
              aria-label={`${index + 1}번 문항`}
            >
              <div className={s.questionHead}>
                <strong>{index + 1}번</strong>
                <span>{question.type}</span>
              </div>
              {editing ? (
                <div className={s.questionEdit}>
                  {field(`${index + 1}번 발문`, question.prompt, (prompt) =>
                    changeQuestion(index, { prompt }),
                  )}
                  {question.options.map((option, optionIndex) =>
                    field(
                      `${index + 1}번 보기 ${optionIndex + 1}`,
                      option,
                      (value) => {
                        changeQuestion(index, {
                          options: question.options.map((item, i) =>
                            i === optionIndex ? value : item,
                          ),
                        });
                      },
                      1,
                    ),
                  )}
                  {field(
                    `${index + 1}번 정답`,
                    question.answer,
                    (answer) => changeQuestion(index, { answer }),
                    1,
                  )}
                  {field(
                    `${index + 1}번 해설`,
                    question.explanation,
                    (explanation) => changeQuestion(index, { explanation }),
                  )}
                  {field(`${index + 1}번 근거`, question.evidence, (evidence) =>
                    changeQuestion(index, { evidence }),
                  )}
                </div>
              ) : (
                <EnglishQuestionView question={question} number={index + 1} />
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
