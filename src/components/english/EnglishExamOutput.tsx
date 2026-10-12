"use client";

import { useMemo, useState } from "react";
import WorksheetEditor from "@/components/unified/WorksheetEditor";
import type { PrintMeta, PrintOptions } from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";
import type { ExamBuilderOutputProps } from "@/components/exam-builder/types";
import type { EnglishBankQuestion } from "@/contracts/englishQuestionBank.contract";
import {
  assertEnglishSheetPrintable,
  englishOutputSheets,
  englishWorksheetProblem,
} from "./englishWorksheetAdapter";
import { resolveEnglishExam } from "./englishExamSource";
import s from "./EnglishExamBuilder.module.css";

export interface EnglishExamWork {
  questions: EnglishBankQuestion[];
  title: string;
  options: PrintOptions;
  meta: PrintMeta;
}
export default function EnglishExamOutput({
  questions,
  title,
  onTitleChange,
  onQuestionsChange,
  onStep,
  options,
  meta,
  setOptions,
  setMeta,
  saved,
  onSave,
  onRestore,
}: ExamBuilderOutputProps<EnglishBankQuestion> & {
  options: PrintOptions;
  meta: PrintMeta;
  setOptions: (patch: Partial<PrintOptions>) => void;
  setMeta: (patch: Partial<PrintMeta>) => void;
  saved: boolean;
  onSave: () => void;
  onRestore: () => void;
}) {
  const [sheetId, setSheetId] = useState("");
  const [acknowledgement, setAcknowledgement] = useState("");
  const sheets = useMemo(() => englishOutputSheets(questions), [questions]);
  const sheet = sheets.find((item) => item.id === sheetId) ?? sheets[0];
  const acknowledgementKey = JSON.stringify(
    sheet?.items.map((item) => [item.key, item.status]),
  );
  const acknowledged = acknowledgement === acknowledgementKey;
  const selected = useMemo(
    () =>
      sheet?.items.map((item, index) =>
        englishWorksheetProblem(
          item,
          sheet.numbers[index]!,
          sheet.includePassage,
        ),
      ) ?? [],
    [sheet],
  );
  function reorderVisible(next: StudioProblem[]) {
    const queue = next.map((p) => p.english!.item);
    const visible = new Set(sheet?.items.map((p) => p.key));
    onQuestionsChange(
      questions.flatMap((item) =>
        visible.has(item.key) ? (queue.length ? [queue.shift()!] : []) : [item],
      ),
    );
  }
  function move(index: number, direction: number) {
    const next = [...selected];
    if (!next[index + direction]) return;
    [next[index], next[index + direction]] = [
      next[index + direction]!,
      next[index]!,
    ];
    reorderVisible(next);
  }
  function download() {
    const work: EnglishExamWork = { questions, title, options, meta };
    const blob = new Blob(
      [
        JSON.stringify(
          { format: "today-english-exam-work", version: 1, ...work },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "영어 시험지"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <WorksheetEditor
      headerTitle="시험지 만들기"
      stepNavigation={{
        label: "시험지 만들기 단계 이동",
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
            onSelect: () => undefined,
          },
        ],
      }}
      selected={selected}
      title={title}
      setTitle={onTitleChange}
      columns={options.columns}
      answers={options.showAnswers}
      savedAt=""
      printOptions={options}
      printMeta={meta}
      setPrintOptions={setOptions}
      setPrintMeta={setMeta}
      setColumns={(columns) => setOptions({ columns: columns === 1 ? 1 : 2 })}
      setAnswers={(showAnswers) => setOptions({ showAnswers })}
      save={onSave}
      restore={onRestore}
      download={download}
      cloudSaveStatus={
        saved
          ? "이 화면에 임시 보관했습니다. 화면을 닫기 전 작업 파일을 내려받으세요."
          : "작업 저장은 이 화면에서만 임시 보관합니다. 원본 세트는 변경되지 않습니다."
      }
      toggle={(problem) =>
        onQuestionsChange(questions.filter((item) => item.key !== problem.id))
      }
      move={move}
      reorder={reorderVisible}
      allowedMenus={[]}
      navigate={() => onStep("review")}
      beforeOutput={async () => {
        assertEnglishSheetPrintable(sheet, acknowledged);
        await resolveEnglishExam(questions);
      }}
      outputNotice={
        <section className={s.notice} aria-label="영어 출력 확인">
          <label>
            인쇄할 원문·묶음{" "}
            <select
              value={sheet?.id ?? ""}
              onChange={(event) => setSheetId(event.target.value)}
            >
              {sheets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <p>
            현재 묶음만 출력하며 번호는 문항 검토의 순서를 유지합니다. 다른
            묶음은 위 목록에서 선택하세요.
          </p>
          {sheet?.notices.handout && <p>{sheet.notices.handout}</p>}
          {sheet && <p>현재 원문 검사: {sheet.notices.leak.text}</p>}
          {sheet?.underline.errors.map((message) => (
            <p role="alert" key={message}>
              {message}
            </p>
          ))}
          {sheet?.underline.warning && <p>{sheet.underline.warning}</p>}
          {sheet?.items.some((item) => item.status !== "검토 완료") && (
            <label>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) =>
                  setAcknowledgement(e.target.checked ? acknowledgementKey : "")
                }
              />{" "}
              검토가 끝나지 않은 세트가 포함된 것을 확인했으며, 내용을 검토하고
              출력합니다.
            </label>
          )}
          {options.showAnswers && (
            <p>
              정답과 해설이 별도 페이지에 포함됩니다. 학생에게 배부할 페이지를
              확인하세요.
            </p>
          )}
          <div className={s.actions}>
            <button type="button" onClick={() => onStep("review")}>
              전체 문항 검토·순서 변경
            </button>
            {saved && (
              <button type="button" onClick={onRestore}>
                임시 보관한 작업 복원
              </button>
            )}
          </div>
        </section>
      }
    />
  );
}
