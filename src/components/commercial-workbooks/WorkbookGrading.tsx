"use client";

import { useRef, useState } from "react";
import type {
  WorkbookAssignment,
  WorkbookAssignmentTarget,
  WorkbookMark,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import {
  addressLabel,
  editionLabel,
  isConflict,
  markLabels,
  messageOf,
  requestIdentity,
} from "./presentation";
import { useDraftGuard } from "./useDraftGuard";
import s from "./CommercialWorkbooks.module.css";

type Draft = {
  marks: Record<string, WorkbookMark>;
  revision: number;
  conflict?: boolean;
  latest?: WorkbookAssignmentTarget;
};
export default function WorkbookGrading({
  source,
  initial,
  onSaved,
}: {
  source: CommercialWorkbookSource;
  initial: WorkbookAssignment;
  onSaved: (assignment: WorkbookAssignment) => void;
}) {
  const [assignment, setAssignment] = useState(initial);
  const [studentId, setStudentId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [answers, setAnswers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const requestId = useRef(requestIdentity());
  const target = assignment.targets.find(
    (item) => item.studentId === studentId,
  );
  const draft = drafts[studentId];
  const dirty = Object.values(drafts).some(
    (item) => Object.keys(item.marks).length > 0,
  );
  useDraftGuard(dirty);
  const marks = { ...target?.marks, ...draft?.marks };
  function mark(exerciseId: string, value: WorkbookMark) {
    if (!target) return;
    setStatus("");
    setDrafts((previous) => ({
      ...previous,
      [studentId]: {
        ...(previous[studentId] ?? { revision: target.revision }),
        marks: { ...previous[studentId]?.marks, [exerciseId]: value },
      },
    }));
  }
  async function save() {
    if (
      !target ||
      !draft ||
      draft.conflict ||
      !Object.keys(draft.marks).length ||
      busy
    )
      return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const body = {
        studentId,
        expectedRevision: draft.revision,
        marks: Object.entries(draft.marks).map(([exerciseId, mark]) => ({
          exerciseId,
          mark,
        })),
      };
      const value = await source.saveMarks(assignment.id, {
        ...body,
        requestId: requestId.current(body),
      });
      setAssignment(value);
      onSaved(value);
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[studentId];
        return next;
      });
      setStatus(`${target.studentName} · 채점 저장됨`);
    } catch (reason) {
      setError(messageOf(reason));
      if (isConflict(reason))
        setDrafts((previous) => ({
          ...previous,
          [studentId]: { ...previous[studentId], conflict: true },
        }));
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const value = await source.getAssignment(assignment.id);
      setAssignment(value);
      onSaved(value);
      setDrafts((previous) =>
        Object.fromEntries(
          Object.entries(previous).map(([id, item]) => {
            const latest = value.targets.find(
              (target) => target.studentId === id,
            );
            return [
              id,
              latest && latest.revision !== item.revision
                ? { ...item, conflict: true, latest }
                : item,
            ];
          }),
        ),
      );
      setStatus(
        "저장된 채점을 다시 불러왔습니다. 저장하지 않은 입력은 유지됩니다.",
      );
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.panel} aria-label={`${assignment.title} 채점`}>
      <div className={s.sectionHeading}>
        <div>
          <h2>{assignment.title}</h2>
          <p className={s.muted}>
            {assignment.className} · {assignment.edition.metadata.title}
          </p>
          <p className={s.caption}>
            {editionLabel(assignment.edition.metadata)} · 정답표 개정{" "}
            {assignment.edition.revision}
            {assignment.dueAt
              ? ` · ${new Date(assignment.dueAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}까지`
              : " · 기한 없음"}
          </p>
        </div>
        <button
          type="button"
          className={s.button}
          disabled={busy}
          onClick={() => void refresh()}
        >
          저장본 다시 불러오기
        </button>
      </div>
      <div className={s.stack}>
        <div
          className={s.tableRegion}
          role="region"
          aria-label="학생별 저장된 채점 요약"
          tabIndex={0}
        >
          <table className={s.table}>
            <thead>
              <tr>
                <th>학생</th>
                <th>정답</th>
                <th>오답</th>
                <th>안 풀었음</th>
                <th>미채점</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {assignment.targets.map((row) => {
                const values = Object.values(row.marks);
                return (
                  <tr key={row.studentId}>
                    <td>{row.studentName}</td>
                    <td>
                      {values.filter((value) => value === "correct").length}
                    </td>
                    <td>
                      {values.filter((value) => value === "wrong").length}
                    </td>
                    <td>
                      {values.filter((value) => value === "unattempted").length}
                    </td>
                    <td>{assignment.exercises.length - values.length}</td>
                    <td>
                      {drafts[row.studentId]
                        ? "미저장 입력 있음"
                        : row.revision
                          ? "저장됨"
                          : "채점 전"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <label>
          채점할 학생
          <select
            value={studentId}
            disabled={busy}
            onChange={(event) => {
              setStudentId(event.target.value);
              setError("");
              setStatus("");
            }}
          >
            <option value="">학생을 선택하세요</option>
            {assignment.targets.map((row) => (
              <option key={row.studentId} value={row.studentId}>
                {row.studentName}
                {drafts[row.studentId] ? " · 미저장" : ""}
              </option>
            ))}
          </select>
        </label>
        {!target ? (
          <p className={s.notice}>
            학생을 선택한 뒤 문항별 상태를 기록하세요. 아직 채점하지 않은 문항은
            오답이나 0점으로 계산하지 않습니다.
          </p>
        ) : (
          <>
            <div className={s.actions}>
              <button
                type="button"
                className={s.button}
                aria-pressed={answers}
                onClick={() => setAnswers((value) => !value)}
              >
                {answers ? "교사용 정답 숨기기" : "교사용 정답 보기"}
              </button>
              <span className={s.caption}>
                미채점과 ‘안 풀었음’을 구별해 기록합니다.
              </span>
            </div>
            <div className={s.summary}>
              <strong>{target.studentName}</strong>
              {(["correct", "wrong", "unattempted"] as const).map((value) => (
                <span key={value}>
                  {markLabels[value]}{" "}
                  {Object.values(marks).filter((mark) => mark === value).length}
                </span>
              ))}
              <span>
                미채점 {assignment.exercises.length - Object.keys(marks).length}
              </span>
            </div>
            <fieldset
              disabled={busy}
              aria-label={`${target.studentName} 문항별 채점`}
            >
              {assignment.exercises.map((item) => (
                <div className={s.markRow} key={item.id}>
                  <div>
                    <strong>{addressLabel(item.address)}</strong>
                    <p className={s.caption}>
                      {marks[item.id] ? markLabels[marks[item.id]] : "미채점"}
                      {draft?.marks[item.id] ? " · 미저장" : ""}
                    </p>
                    {answers && (
                      <p className={s.answer}>
                        {item.key ? (
                          <>
                            정답: {item.key.answerText}
                            <br />
                            <span className={s.caption}>
                              {item.key.status === "reviewed"
                                ? "검토한 정답 · 교사 참고용"
                                : "검토 전 정답 · 직접 확인해 주세요"}
                            </span>
                          </>
                        ) : (
                          "정답 미확보 · 교사가 직접 확인해 주세요"
                        )}
                      </p>
                    )}
                    {draft?.latest && draft.marks[item.id] && (
                      <p className={s.caption}>
                        최신 저장본:{" "}
                        {draft.latest.marks[item.id]
                          ? markLabels[draft.latest.marks[item.id]]
                          : "미채점"}{" "}
                        / 내 입력: {markLabels[draft.marks[item.id]]}
                      </p>
                    )}
                  </div>
                  <div
                    className={s.markGroup}
                    role="group"
                    aria-label={`${addressLabel(item.address)} 채점`}
                  >
                    {(["correct", "wrong", "unattempted"] as const).map(
                      (value) => (
                        <button
                          type="button"
                          className={s.button}
                          key={value}
                          aria-pressed={marks[item.id] === value}
                          onClick={() => mark(item.id, value)}
                        >
                          {markLabels[value]}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </fieldset>
            {draft?.conflict && (
              <div className={s.error} role="alert">
                <p>
                  다른 채점이 먼저 저장되었습니다. 내 입력을 유지했습니다.
                  최신본과 비교한 뒤 저장해 주세요.
                </p>
                <div className={s.actions}>
                  {draft.latest ? (
                    <button
                      type="button"
                      className={s.button}
                      disabled={busy}
                      onClick={() => {
                        setDrafts((previous) => ({
                          ...previous,
                          [studentId]: {
                            ...previous[studentId],
                            revision: draft.latest!.revision,
                            conflict: false,
                            latest: undefined,
                          },
                        }));
                        setError("");
                      }}
                    >
                      최신본 확인 · 내 입력 유지
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={s.button}
                      disabled={busy}
                      onClick={() => void refresh()}
                    >
                      최신 저장본 비교
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className={s.savebar}>
              <span className={s.muted}>
                {draft
                  ? `저장하지 않은 채점 ${Object.keys(draft.marks).length}문항`
                  : target.revision
                    ? `저장된 채점 · 버전 ${target.revision}`
                    : "아직 저장한 채점이 없습니다."}
              </span>
              <button
                type="button"
                className={s.primary}
                disabled={busy || !draft || draft.conflict}
                onClick={() => void save()}
              >
                {busy ? "처리 중…" : "채점 저장"}
              </button>
            </div>
            <details>
              <summary>저장 이력 {target.history.length}회</summary>
              {target.history.length ? (
                <ol>
                  {target.history
                    .slice()
                    .reverse()
                    .map((event) => (
                      <li key={event.id}>
                        {new Date(event.gradedAt).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                        })}{" "}
                        · 버전 {event.revision} · {event.marks.length}문항 기록
                      </li>
                    ))}
                </ol>
              ) : (
                <p className={s.muted}>저장 이력이 없습니다.</p>
              )}
            </details>
          </>
        )}
        {error && (
          <p className={s.error} role="alert">
            {error} 저장하지 않은 입력은 유지됩니다.
          </p>
        )}
        {status && (
          <p className={s.success} role="status">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
