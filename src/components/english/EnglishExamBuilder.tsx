"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ExamBuilder from "@/components/exam-builder/ExamBuilder";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import {
  ENGLISH_DIFFICULTIES,
  type EnglishExam,
} from "@/contracts/english.contract";
import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";
import EnglishQuestionView from "./EnglishQuestionView";
import { createEnglishExamSource } from "./englishExamSource";
import type { EnglishExamWork } from "./EnglishExamOutput";
import s from "./EnglishExamBuilder.module.css";

const EnglishExamOutput = dynamic(() => import("./EnglishExamOutput"));
const difficulties = [...ENGLISH_DIFFICULTIES, "미지정"];

export default function EnglishExamBuilder({
  exams,
  refreshKey,
  onMake,
  onOpenSet,
}: {
  exams: EnglishExam[];
  refreshKey: number;
  onMake?: () => void;
  onOpenSet: (item: EnglishBankQuestion) => void;
}) {
  const [questions, setQuestions] = useState<EnglishBankQuestion[]>([]);
  const [title, setTitle] = useState("영어 시험지");
  const [options, setOptions] = useState<PrintOptions>({
    ...DEFAULT_PRINT_OPTIONS,
  });
  const [meta, setMeta] = useState<PrintMeta>({
    ...DEFAULT_PRINT_META,
    subject: "영어",
  });
  const [saved, setSaved] = useState<EnglishExamWork | null>(null);
  const source = useMemo(() => {
    void refreshKey;
    return createEnglishExamSource();
  }, [refreshKey]);
  return (
    <ExamBuilder
      source={source}
      questions={questions}
      onQuestionsChange={setQuestions}
      title={title}
      onTitleChange={setTitle}
      difficulties={difficulties}
      maxQuestions={80}
      initialGroup={exams[0]?.grade}
      status={
        <div className={s.actions}>
          <span>
            저장된 문제 세트를 범위로 사용합니다. 난이도 미지정은 원본에
            난이도가 없는 문항입니다.
          </span>
          {onMake && (
            <button type="button" onClick={onMake}>
              AI 문제 제작
            </button>
          )}
        </div>
      }
      renderQuestion={(item) => (
        <div className={s.question}>
          <p>
            {item.school} · {item.examTitle} · {item.title} · 원본{" "}
            {item.questionIndex + 1}번
          </p>
          <details>
            <summary>원문 보기</summary>
            <p className={s.passage} lang="en">
              {item.passage}
            </p>
          </details>
          <EnglishQuestionView
            question={item.question}
            number={item.questionIndex + 1}
          />
          <button type="button" onClick={() => onOpenSet(item)}>
            원본 세트 열기
          </button>
        </div>
      )}
      renderOutput={(props) => (
        <EnglishExamOutput
          {...props}
          options={options}
          meta={meta}
          setOptions={(patch) => setOptions((old) => ({ ...old, ...patch }))}
          setMeta={(patch) => setMeta((old) => ({ ...old, ...patch }))}
          saved={saved !== null}
          onSave={() =>
            setSaved({
              questions: [...questions],
              title,
              options: { ...options },
              meta: { ...meta },
            })
          }
          onRestore={() => {
            if (saved) {
              setQuestions(saved.questions);
              setTitle(saved.title);
              setOptions(saved.options);
              setMeta(saved.meta);
            }
          }}
        />
      )}
    />
  );
}
