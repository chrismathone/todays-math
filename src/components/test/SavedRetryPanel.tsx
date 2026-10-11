"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  GradeSheetResponse,
  GradeSheetStudent,
} from "@/contracts/testresult.contract";
import { MathText } from "@/components/math/MathText";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "@/components/unified/print/types";
import {
  fetchSavedRetry,
  retryGroups,
  retryWorksheetProblems,
  type RetryGroup,
  type RetryPlan,
} from "./retryClient";
import s from "./SavedRetryPanel.module.css";

const WorksheetEditor = dynamic(
  () => import("@/components/unified/WorksheetEditor"),
  {
    loading: () => <p>학습지 미리보기를 준비하고 있습니다.</p>,
  },
);
const noop = () => {};

export default function SavedRetryPanel({
  sheet,
  blockedStudentIds,
  onOutputChange,
}: {
  sheet: GradeSheetResponse["data"];
  blockedStudentIds: Set<string>;
  onOutputChange: (output: boolean) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [output, setOutput] = useState(false);
  const student = sheet.students.find((row) => row.studentId === studentId);
  const changeOutput = useCallback(
    (value: boolean) => {
      setOutput(value);
      onOutputChange(value);
    },
    [onOutputChange],
  );
  return (
    <section
      className={s.panel}
      aria-label="저장된 오답 복습"
      data-output={output}
    >
      <div hidden={output} className={s.selection}>
        <h2>오답 복습</h2>
        <p>
          저장된 채점을 선택해 교과서 원문마다 지정된 검토 완료 변형 두 문항을
          확인합니다.
        </p>
        <label htmlFor="retry-student">복습할 학생</label>
        <select
          id="retry-student"
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
        >
          <option value="">학생을 선택해 주세요</option>
          {sheet.students.map((row) => (
            <option key={row.studentId} value={row.studentId}>
              {row.name} ·{" "}
              {!row.latest
                ? "아직 안 봄"
                : row.latest.absent
                  ? "결시"
                  : `저장된 오답 ${row.latest.wrongProblemIds.length}개`}
            </option>
          ))}
        </select>
      </div>
      {student ? (
        <StudentRetry
          key={`${sheet.testId}:${studentId}:${student.latest?.testResultId}:${blockedStudentIds.has(studentId)}`}
          sheet={sheet}
          student={student}
          blocked={blockedStudentIds.has(studentId)}
          output={output}
          onOutputChange={changeOutput}
        />
      ) : (
        <p className={s.hint}>
          학생을 선택하면 저장된 채점 상태를 확인할 수 있습니다.
        </p>
      )}
    </section>
  );
}

function StudentRetry({
  sheet,
  student,
  blocked,
  output,
  onOutputChange,
}: {
  sheet: GradeSheetResponse["data"];
  student: GradeSheetStudent;
  blocked: boolean;
  output: boolean;
  onOutputChange: (value: boolean) => void;
}) {
  const [state, setState] = useState<
    | { status: "idle" | "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; plan: RetryPlan; groups: RetryGroup[] }
  >({ status: "idle" });
  const [title, setTitle] = useState(`${student.name} · 오답 복습`);
  const [options, setOptions] = useState<PrintOptions>(() => ({
    ...DEFAULT_PRINT_OPTIONS,
    template: "workbook",
    showChapter: true,
  }));
  const [meta, setMeta] = useState<PrintMeta>(() => ({
    ...DEFAULT_PRINT_META,
    totalScore: undefined,
  }));
  const controller = useRef<AbortController | null>(null);
  const outputHost = useRef<HTMLDivElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);
  const previouslyOutput = useRef(false);
  useEffect(() => {
    if (output) {
      outputHost.current?.scrollIntoView?.({ block: "start" });
      outputHost.current?.focus({ preventScroll: true });
    } else if (previouslyOutput.current)
      loadButton.current?.focus({ preventScroll: true });
    previouslyOutput.current = output;
  }, [output]);
  useEffect(
    () => () => {
      controller.current?.abort();
      onOutputChange(false);
    },
    [onOutputChange],
  );
  const reason = !student.latest
    ? "아직 안 본 학생입니다. 채점을 마치고 저장해 주세요."
    : !student.latest.absent &&
        student.latest.correctCount + student.latest.wrongProblemIds.length !==
          sheet.problems.length
      ? "완료된 채점 기록이 필요합니다. 채점을 확인하고 저장해 주세요."
      : blocked
        ? "수정한 채점을 먼저 저장해 주세요. 저장된 기록을 다시 확인한 뒤 복습할 수 있습니다."
        : student.latest.absent
          ? "결시 기록에는 점수와 오답 복습이 없습니다."
          : !student.latest.wrongProblemIds.length
            ? "저장된 채점에 오답이 없습니다."
            : null;
  const groups = state.status === "ready" ? state.groups : null;
  const selected = useMemo(
    () => (groups ? retryWorksheetProblems(groups) : []),
    [groups],
  );
  const complete =
    state.status === "ready" &&
    state.plan.shortfall === 0 &&
    selected.length > 0 &&
    state.groups.every(
      (group) => !group.textbook || group.seats.every(Boolean),
    );

  async function load() {
    if (reason || state.status === "loading") return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState({ status: "loading" });
    try {
      const plan = await fetchSavedRetry(sheet.testId, student, request.signal);
      const nextGroups = retryGroups(plan, sheet.problems);
      if (!request.signal.aborted)
        setState({ status: "ready", plan, groups: nextGroups });
    } catch (error) {
      if (!request.signal.aborted)
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "오답 복습을 불러오지 못했습니다.",
        });
    }
  }

  async function beforeOutput() {
    if (!complete || reason || state.status !== "ready")
      throw new Error("완전한 복습 구성을 다시 확인해 주세요.");
    const current = await fetchSavedRetry(sheet.testId, student);
    retryGroups(current, sheet.problems);
    if (JSON.stringify(current) !== JSON.stringify(state.plan))
      throw new Error(
        "복습 문항이 변경되었습니다. 변형 검토로 돌아가 다시 불러와 주세요.",
      );
  }

  if (output && state.status === "ready")
    return (
      <div className={s.output} ref={outputHost} tabIndex={-1}>
        <WorksheetEditor
          headerTitle="오답 복습"
          stepNavigation={{
            label: "복습 단계",
            items: [
              {
                id: "review",
                label: "변형 검토로 돌아가기",
                current: false,
                onSelect: () => onOutputChange(false),
              },
              {
                id: "output",
                label: "양식 구성 · 출력",
                current: true,
                onSelect: noop,
              },
            ],
          }}
          outputNotice={
            <p className={s.outputNotice}>
              {student.name} · {sheet.className} · {sheet.testDate} 채점 · 오답{" "}
              {state.plan.wrongProblemIds.length}개 → 복습 {selected.length}문항
            </p>
          }
          beforeOutput={beforeOutput}
          fixedComposition
          draftActions={false}
          allowedMenus={["export"]}
          selected={selected}
          title={title}
          setTitle={setTitle}
          columns={options.columns}
          answers={options.showAnswers}
          savedAt=""
          printOptions={options}
          printMeta={meta}
          setPrintOptions={(patch) =>
            setOptions((previous) => ({ ...previous, ...patch }))
          }
          setPrintMeta={(patch) =>
            setMeta((previous) => ({ ...previous, ...patch }))
          }
          setColumns={noop}
          setAnswers={noop}
          save={noop}
          restore={noop}
          download={noop}
          toggle={noop}
          move={noop}
          reorder={noop}
          navigate={noop}
        />
      </div>
    );

  return (
    <div className={s.review}>
      <p className={s.hint}>
        {reason ??
          `${student.name} · ${new Date(student.latest!.takenAt).toLocaleString("ko-KR")} 저장 · 오답 ${student.latest!.wrongProblemIds.length}개`}
      </p>
      <button
        type="button"
        ref={loadButton}
        className={s.secondary}
        disabled={Boolean(reason) || state.status === "loading"}
        onClick={() => void load()}
      >
        {state.status === "loading"
          ? "복습 문항을 불러오는 중…"
          : state.status === "idle"
            ? "저장된 오답으로 복습 문항 보기"
            : "복습 문항 다시 불러오기"}
      </button>
      {state.status === "error" ? (
        <p role="alert" className={s.error}>
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        <>
          <p className={s.summary}>
            저장된 오답 {state.plan.wrongProblemIds.length}개 · 복습{" "}
            {selected.length} / {state.plan.requestedCount}문항
          </p>
          {state.plan.shortfall > 0 ? (
            <p className={s.warning}>
              복습 문항 {state.plan.shortfall}개가 부족합니다. 두 변형이 모두
              준비되지 않은 교과서 원문은 출력할 수 없습니다.
            </p>
          ) : null}
          {state.plan.foldedWrong > 0 ? (
            <p className={s.hint}>
              일반 오답 {state.plan.foldedWrong}개는 같은 갈래의 복습으로 함께
              구성됩니다.
            </p>
          ) : null}
          <ol className={s.groups}>
            {state.groups.map((group) => (
              <li key={group.original.problemId}>
                <h3>
                  원문 {group.original.no}번{" "}
                  <span>{group.original.problemCode}</span>
                </h3>
                <p
                  className={
                    group.textbook && group.seats.some((seat) => !seat)
                      ? s.warning
                      : s.hint
                  }
                >
                  {group.textbook
                    ? `검토 완료 변형 ${group.seats.filter(Boolean).length} / 2문항`
                    : "일반 오답 복습"}
                </p>
                <div className={s.pair}>
                  {group.seats.map((seat, index) => (
                    <article
                      key={index}
                      aria-label={`원문 ${group.original.no}번 ${group.textbook ? "변형" : "복습"} ${index + 1}`}
                    >
                      <h4>
                        {group.textbook ? "변형" : "복습"} {index + 1}
                      </h4>
                      {seat ? (
                        <>
                          <p className={s.hint}>
                            {seat.problem.problemCode} ·{" "}
                            {group.textbook ? "검토 완료" : seat.origin}
                          </p>
                          <UnifiedProblem
                            problem={
                              retryWorksheetProblems([
                                {
                                  ...group,
                                  seats: group.seats.map((value, slot) =>
                                    slot === index ? value : null,
                                  ),
                                },
                              ])[0]
                            }
                          />
                          <details>
                            <summary>정답 · 해설 보기</summary>
                            <MathText as="div" text={seat.problem.answer} />
                            {seat.problem.solution ? (
                              <MathText as="div" text={seat.problem.solution} />
                            ) : (
                              <p>해설이 없습니다.</p>
                            )}
                          </details>
                        </>
                      ) : (
                        <p className={s.warning}>
                          이 슬롯의 검토 완료 변형이 없습니다.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                {!group.textbook && !group.seats.length ? (
                  <p className={s.hint}>
                    이 원문에 별도로 배정된 복습 문항이 없습니다. 같은 갈래 구성
                    또는 전체 부족 수를 확인해 주세요.
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={s.primary}
            disabled={!complete}
            onClick={() => onOutputChange(true)}
          >
            양식 구성 · 출력
          </button>
          {!complete ? (
            <p className={s.hint}>
              부족한 문항을 확인한 뒤 다시 불러와 주세요. 없는 변형을 다른
              원문으로 대체하지 않습니다.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
