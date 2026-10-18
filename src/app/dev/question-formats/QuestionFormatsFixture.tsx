"use client";

import { useMemo, useState } from "react";
import ExamBuilder from "@/components/exam-builder/ExamBuilder";
import {
  createMathExamBuilderSource,
  MATH_EXAM_DIFFICULTIES,
} from "@/components/exam-builder/mathSource";
import ExamAnswerPanel from "@/components/exam-builder/ExamAnswerPanel";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import WorksheetEditor from "@/components/unified/WorksheetEditor";
import type { StudioProblem } from "@/components/unified/types";
import {
  DEFAULT_PRINT_OPTIONS,
  DEFAULT_PRINT_META,
} from "@/components/unified/print/types";
import { actualRows, bankData, cards, fixtureFetch, unit } from "./fixture";
import s from "./fixture.module.css";

export default function QuestionFormatsFixture() {
  const [revision, setRevision] = useState(0);
  const [questions, setQuestions] = useState<StudioProblem[]>([cards[0]]);
  const [title, setTitle] = useState("문항 형식 검증");
  const [snapshot, setSnapshot] = useState(false);
  const [stale, setStale] = useState(false);
  const [failed, setFailed] = useState(false);
  const [distinctFamilies, setDistinctFamilies] = useState(false);
  const [printOptions, setPrintOptions] = useState(DEFAULT_PRINT_OPTIONS);
  const [printMeta, setPrintMeta] = useState(DEFAULT_PRINT_META);
  const source = useMemo(
    () =>
      createMathExamBuilderSource({
        problemsUrl: "/fixture/questions",
        initialUnits: [unit],
        initialUnitCounts: bankData.unitCounts,
        initialCountUnit: "question",
        refreshAvailability: true,
        distinctFamilies,
        fetch: fixtureFetch({ stale, failed }),
      }),
    [stale, failed, distinctFamilies],
  );
  return (
    <main className={s.page}>
      <h1>문항 형식 · 로컬 검증</h1>
      <p>
        직접 작성한 4문항·7개 표현입니다. 요청은 메모리에서 처리하며 계정·공유
        DB에 쓰지 않습니다.
      </p>
      <div className={s.toolbar}>
        <button
          onClick={() => {
            setQuestions([cards[0]]);
            setSnapshot(false);
            setRevision((value) => value + 1);
          }}
        >
          기본 검토로
        </button>
        <button
          onClick={() => {
            setQuestions([actualRows[0], actualRows[1]]);
            setSnapshot(true);
            setRevision((value) => value + 1);
          }}
        >
          과거 중복 저장본 열기
        </button>
        <label>
          <input
            type="checkbox"
            checked={stale}
            onChange={(event) => setStale(event.target.checked)}
          />
          선택 후 개정 충돌
        </label>
        <label>
          <input
            type="checkbox"
            checked={failed}
            onChange={(event) => setFailed(event.target.checked)}
          />
          문항 조회 실패
        </label>
        <label>
          <input
            type="checkbox"
            checked={distinctFamilies}
            onChange={(event) => setDistinctFamilies(event.target.checked)}
          />
          같은 문항류 1개 제한
        </label>
      </div>
      <p role="status" aria-label="실제 선택">
        담은 수 {questions.length} ·{" "}
        {questions
          .map(
            (row) =>
              `${row.problemCode} / ${row.questionType} / 답 ${row.answer}`,
          )
          .join(" · ")}
      </p>
      <ExamBuilder
        key={revision}
        source={source}
        questions={questions}
        onQuestionsChange={setQuestions}
        title={title}
        onTitleChange={setTitle}
        initialStep={snapshot ? "output" : "review"}
        preserveStoredOutput={snapshot}
        onBeginEdit={async () => {
          setQuestions((rows) => rows.map((row) => ({ ...row })));
          setSnapshot(false);
          return true;
        }}
        difficulties={MATH_EXAM_DIFFICULTIES}
        maxQuestions={100}
        renderQuestion={(item) => <UnifiedProblem problem={item} hideScores />}
        renderAnswer={(item) => <ExamAnswerPanel problem={item} />}
        renderOutput={({
          questions: items,
          title: name,
          onQuestionsChange,
          onTitleChange,
          onStep,
        }) => (
          <WorksheetEditor
            selected={items}
            title={name}
            setTitle={onTitleChange}
            savedAt=""
            columns={printOptions.columns}
            answers={printOptions.showAnswers}
            setColumns={(columns) =>
              setPrintOptions((current) => ({
                ...current,
                columns: columns === 1 ? 1 : 2,
              }))
            }
            setAnswers={(showAnswers) =>
              setPrintOptions((current) => ({ ...current, showAnswers }))
            }
            printOptions={printOptions}
            printMeta={printMeta}
            setPrintOptions={(patch) =>
              setPrintOptions((current) => ({ ...current, ...patch }))
            }
            setPrintMeta={(patch) =>
              setPrintMeta((current) => ({ ...current, ...patch }))
            }
            fixedComposition={snapshot}
            draftActions={false}
            outputNotice={
              snapshot ? (
                <p>
                  저장된 2개 표현을 그대로 표시합니다.{" "}
                  <button onClick={() => onStep("review")}>
                    사본으로 새 시험지 만들기
                  </button>
                </p>
              ) : undefined
            }
            beforeOutput={
              snapshot
                ? undefined
                : async () => {
                    await source.prepareOutput?.(
                      items,
                      new AbortController().signal,
                    );
                  }
            }
            stepNavigation={{
              label: "시험지 단계",
              items: [
                {
                  id: "scope",
                  label: "1 범위 설정",
                  current: false,
                  onSelect: () => onStep("scope"),
                },
                {
                  id: "review",
                  label: "2 문항 검토",
                  current: false,
                  onSelect: () => onStep("review"),
                },
                {
                  id: "output",
                  label: "3 양식 구성·출력",
                  current: true,
                  onSelect: () => {},
                },
              ],
            }}
            save={() => {}}
            restore={() => {}}
            download={() => {}}
            toggle={(item) =>
              onQuestionsChange(items.filter((row) => row.id !== item.id))
            }
            move={(index, direction) => {
              const next = [...items];
              const to = index + direction;
              if (to < 0 || to >= next.length) return;
              [next[index], next[to]] = [next[to], next[index]];
              onQuestionsChange(next);
            }}
            reorder={onQuestionsChange}
            navigate={() => onStep("review")}
          />
        )}
      />
    </main>
  );
}
