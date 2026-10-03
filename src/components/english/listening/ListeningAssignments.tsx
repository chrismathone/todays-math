"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import type {
  ListeningAssignmentDetail,
  ListeningAssignmentSummary,
  ListeningClassOption,
  ListeningSetDetail,
  ListeningSetSummary,
  listeningCreateAssignmentSchema,
} from "@/contracts/englishListeningHttp.contract";
import { TeacherWorkbench } from "./ListeningTeacherWorkspace";
import { listeningError, listeningRequest } from "./listeningClient";
import s from "./ListeningTeacherWorkspace.module.css";

type AssignmentInput = z.infer<typeof listeningCreateAssignmentSchema>;
const statusNames = {
  ready: "시작 전",
  in_progress: "진행 중",
  submitted: "제출",
  interrupted: "중단",
  expired: "기한 종료",
  cancelled: "취소",
};
function localDate(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function ListeningAssignments({
  active,
  materials,
  onDirtyChange,
}: {
  active: boolean;
  materials: ListeningSetSummary[];
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [assignments, setAssignments] = useState<ListeningAssignmentSummary[]>(
    [],
  );
  const [classes, setClasses] = useState<ListeningClassOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ListeningAssignmentDetail | null>(
    null,
  );
  const [material, setMaterial] = useState<ListeningSetDetail | null>(null);
  const [publicationId, setPublicationId] = useState("");
  const [classId, setClassId] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [mode, setMode] = useState<"practice" | "exam">("practice");
  const [audioSource, setAudioSource] = useState<
    "student_device" | "teacher_device"
  >("student_device");
  const [opensAt, setOpensAt] = useState(() =>
    localDate(Date.now() + 5 * 60000),
  );
  const [closesAt, setClosesAt] = useState(() =>
    localDate(Date.now() + 86400000),
  );
  const [minutes, setMinutes] = useState("10");
  const [release, setRelease] = useState<
    "at_time" | "after_submit" | "manual" | "never"
  >("at_time");
  const [reason, setReason] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [soundChecked, setSoundChecked] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const request = useRef<AbortController | null>(null);
  const busy = Boolean(pending);

  const run = useCallback(
    async (label: string, task: (signal: AbortSignal) => Promise<void>) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setPending(label);
      setError("");
      setNotice("");
      try {
        await task(controller.signal);
      } catch (cause) {
        if (!controller.signal.aborted) setError(listeningError(cause));
      } finally {
        if (!controller.signal.aborted && request.current === controller)
          setPending("");
      }
    },
    [],
  );
  const refresh = useCallback(async (signal: AbortSignal) => {
    const [items, options] = await Promise.all([
      listeningRequest<ListeningAssignmentSummary[]>("/assignments", signal),
      listeningRequest<ListeningClassOption[]>("/classes", signal),
    ]);
    signal.throwIfAborted();
    if (!Array.isArray(items) || !Array.isArray(options))
      throw new Error("invalid response");
    setAssignments(items);
    setClasses(options);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    request.current = controller;
    void Promise.all([
      listeningRequest<ListeningAssignmentSummary[]>(
        "/assignments",
        controller.signal,
      ),
      listeningRequest<ListeningClassOption[]>("/classes", controller.signal),
    ])
      .then(([items, options]) => {
        controller.signal.throwIfAborted();
        if (!Array.isArray(items) || !Array.isArray(options))
          throw new Error("invalid response");
        setAssignments(items);
        setClasses(options);
        setLoaded(true);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(listeningError(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted && request.current === controller)
          setPending("");
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, [active]);

  async function loadDetail(id: string, signal: AbortSignal) {
    const detail = await listeningRequest<ListeningAssignmentDetail>(
      `/assignments/${encodeURIComponent(id)}`,
      signal,
    );
    signal.throwIfAborted();
    setSelected(detail);
    return detail;
  }
  function mutation(action: string, body: Record<string, unknown> = {}) {
    if (!selected) return;
    void run("과제를 변경하는 중입니다.", async (signal) => {
      await listeningRequest(
        `/assignments/${encodeURIComponent(selected.assignment.id)}/${action}`,
        signal,
        "POST",
        { expectedRevision: selected.assignment.revision, ...body },
      );
      await loadDetail(selected.assignment.id, signal);
      await refresh(signal);
      signal.throwIfAborted();
      setNotice("변경 사항을 저장했습니다.");
      setAdded([]);
      setReason("");
    });
  }
  function create() {
    if (!publicationId || !classId || !targets.length) {
      setError("발행본, 반과 대상 학생을 선택하세요.");
      return;
    }
    const open = new Date(opensAt),
      close = new Date(closesAt);
    if (
      !Number.isFinite(open.getTime()) ||
      !Number.isFinite(close.getTime()) ||
      close <= open ||
      open.getTime() <= Date.now()
    ) {
      setError("시작은 현재 시각 이후, 마감은 시작 이후로 정하세요.");
      return;
    }
    const timeLimitSeconds = mode === "exam" ? Number(minutes) * 60 : null;
    if (
      mode === "exam" &&
      (!Number.isInteger(timeLimitSeconds) ||
        timeLimitSeconds! < 60 ||
        timeLimitSeconds! > 86400)
    ) {
      setError("평가 제한 시간을 1~1440분으로 입력하세요.");
      return;
    }
    const publication = material?.publications.find(
      (item) => item.id === publicationId,
    );
    const count =
      publication?.document.groups.reduce(
        (sum, group) => sum + group.questions.length,
        0,
      ) ?? 0;
    if (mode === "exam" && (count < 3 || count > 5)) {
      setError("짧은 연습평가는 3~5문항 발행본을 선택하세요.");
      return;
    }
    const input: AssignmentInput = {
      publicationId,
      classId,
      targetStudentIds: targets,
      mode,
      audioSource,
      opensAt: open.toISOString(),
      closesAt: close.toISOString(),
      timeLimitSeconds,
      releasePolicy:
        mode === "practice"
          ? { kind: "after_unit_answer" }
          : release === "at_time"
            ? { kind: "at_time", at: close.toISOString() }
            : { kind: release },
    };
    void run("학생에게 배정하는 중입니다.", async (signal) => {
      const created = await listeningRequest<ListeningAssignmentDetail>(
        "/assignments",
        signal,
        "POST",
        input,
      );
      await loadDetail(created.assignment.id, signal);
      await refresh(signal);
      signal.throwIfAborted();
      onDirtyChange(false);
      setNotice("학생에게 배정했습니다.");
    });
  }
  const selectedClass = classes.find((item) => item.id === classId);
  const assignmentClass = classes.find((item) => item.id === selected?.classId);
  const availableTargets =
    assignmentClass?.students.filter(
      (student) => !selected?.assignment.targetStudentIds.includes(student.id),
    ) ?? [];
  return (
    <section className={s.workspace} aria-label="듣기 과제와 결과">
      {pending ? (
        <p role="status" className={s.notice}>
          {pending}
        </p>
      ) : null}
      {error ? (
        <div role="alert" className={s.error}>
          <p>{error}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run("최신 과제를 확인하는 중입니다.", async (signal) => {
                await refresh(signal);
                if (selected) await loadDetail(selected.assignment.id, signal);
              })
            }
          >
            최신 과제 다시 불러오기
          </button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      ) : null}
      <details className={s.assignmentCreate} open={!selected}>
        <summary>새 듣기 과제 배정</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
          onChange={() => onDirtyChange(true)}
          className={s.editor}
        >
          <fieldset
            className={s.formSection}
            disabled={busy || !active || !loaded}
          >
            <legend>발행본과 대상</legend>
            <div className={s.formGrid}>
              <label>
                배정할 자료
                <select
                  value={material?.id ?? ""}
                  onChange={(event) => {
                    const id = event.target.value;
                    setMaterial(null);
                    setPublicationId("");
                    if (id)
                      void run(
                        "발행본을 불러오는 중입니다.",
                        async (signal) => {
                          const value =
                            await listeningRequest<ListeningSetDetail>(
                              `/sets/${encodeURIComponent(id)}`,
                              signal,
                            );
                          signal.throwIfAborted();
                          setMaterial(value);
                          setPublicationId(value.publications[0]?.id ?? "");
                        },
                      );
                  }}
                >
                  <option value="">발행한 자료 선택</option>
                  {materials
                    .filter((item) => item.publicationCount > 0)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                발행본
                <select
                  value={publicationId}
                  onChange={(event) => setPublicationId(event.target.value)}
                >
                  <option value="">발행본 선택</option>
                  {material?.publications.map((item) => (
                    <option key={item.id} value={item.id}>
                      내용 개정 {item.document.revision} ·{" "}
                      {new Date(item.publishedAt).toLocaleString("ko-KR")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                대상 반
                <select
                  value={classId}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setTargets([]);
                  }}
                >
                  <option value="">반 선택</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {loaded && !classes.length ? (
              <p className={s.empty}>배정할 수 있는 반이 없습니다.</p>
            ) : null}
            {selectedClass ? (
              <fieldset className={s.targets}>
                <legend>대상 학생</legend>
                <button
                  type="button"
                  onClick={() => {
                    setTargets(
                      selectedClass.students.map((student) => student.id),
                    );
                    onDirtyChange(true);
                  }}
                >
                  반 전체 선택
                </button>
                {selectedClass.students.map((student) => (
                  <label key={student.id} className={s.check}>
                    <input
                      type="checkbox"
                      checked={targets.includes(student.id)}
                      onChange={(event) =>
                        setTargets(
                          event.target.checked
                            ? [...targets, student.id]
                            : targets.filter((id) => id !== student.id),
                        )
                      }
                    />
                    {student.name}
                  </label>
                ))}
                {!selectedClass.students.length ? (
                  <p>배정할 수 있는 학생이 없습니다.</p>
                ) : null}
              </fieldset>
            ) : null}
          </fieldset>
          <fieldset
            className={s.formSection}
            disabled={busy || !active || !loaded}
          >
            <legend>진행과 정답 공개</legend>
            <div className={s.formGrid}>
              <label>
                진행 방식
                <select
                  value={mode}
                  onChange={(event) =>
                    setMode(event.target.value as typeof mode)
                  }
                >
                  <option value="practice">학습</option>
                  <option value="exam">짧은 연습평가 (3~5문항)</option>
                </select>
              </label>
              <label>
                음원 재생 기기
                <select
                  value={audioSource}
                  onChange={(event) =>
                    setAudioSource(event.target.value as typeof audioSource)
                  }
                >
                  <option value="student_device">학생 개별 기기</option>
                  <option value="teacher_device">교사 기기 방송</option>
                </select>
              </label>
              <label>
                배정 시작
                <input
                  type="datetime-local"
                  required
                  value={opensAt}
                  onChange={(event) => setOpensAt(event.target.value)}
                />
              </label>
              <label>
                배정 마감
                <input
                  type="datetime-local"
                  required
                  value={closesAt}
                  onChange={(event) => setClosesAt(event.target.value)}
                />
              </label>
              {mode === "exam" ? (
                <>
                  <label>
                    제한 시간 (분)
                    <input
                      type="number"
                      required
                      min={1}
                      max={1440}
                      step={1}
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                    />
                  </label>
                  <label>
                    정답·대본 공개
                    <select
                      value={release}
                      onChange={(event) =>
                        setRelease(event.target.value as typeof release)
                      }
                    >
                      <option value="at_time">배정 마감 뒤 공개</option>
                      <option value="after_submit">학생 제출 뒤 공개</option>
                      <option value="manual">교사가 직접 공개</option>
                      <option value="never">공개하지 않음</option>
                    </select>
                  </label>
                </>
              ) : (
                <p className={s.muted}>
                  같은 음원의 문항에 모두 답한 뒤 해당 묶음의 정답과 대본을
                  공개합니다.
                </p>
              )}
            </div>
            {mode === "exam" ? (
              <p className={s.muted}>
                감독 가능한 짧은 연습평가입니다. 먼저 공개한 정답·대본은 회수할
                수 없습니다.
              </p>
            ) : null}
            {audioSource === "teacher_device" ? (
              <p className={s.muted}>
                학생 기기에는 음원이 제공되지 않습니다. 교사가 방송을 시작하면
                같은 마감 시각을 적용합니다.
              </p>
            ) : null}
            <button
              className={s.primary}
              type="submit"
              disabled={!publicationId || !classId || !targets.length}
            >
              학생에게 배정
            </button>
          </fieldset>
        </form>
      </details>
      <div className={s.split}>
        <aside className={s.catalog}>
          <h2>배정한 과제</h2>
          {loaded && !assignments.length ? (
            <p className={s.empty}>배정한 과제가 없습니다.</p>
          ) : null}
          <ul className={s.materials}>
            {assignments.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={s.material}
                  aria-pressed={selected?.assignment.id === item.id}
                  onClick={() => {
                    setSoundChecked(false);
                    setAdded([]);
                    setReason("");
                    void run("과제 결과를 불러오는 중입니다.", (signal) =>
                      loadDetail(item.id, signal).then(() => {}),
                    );
                  }}
                >
                  <strong>{item.title}</strong>
                  <span>
                    {item.cancelledAt
                      ? "취소"
                      : item.mode === "practice"
                        ? "학습"
                        : "연습평가"}{" "}
                    · {item.targetCount}명
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className={s.pane} aria-label="선택한 과제 결과">
          {selected ? (
            <>
              <h2>{selected.publication.document.title}</h2>
              <p className={s.muted}>
                {assignmentClass?.name ?? "배정한 반"} ·{" "}
                {selected.assignment.mode === "practice" ? "학습" : "연습평가"}{" "}
                ·{" "}
                {selected.assignment.audioSource === "teacher_device"
                  ? "교사 방송"
                  : "학생 개별 재생"}
              </p>
              <p>
                기간{" "}
                {new Date(selected.assignment.opensAt).toLocaleString("ko-KR")}{" "}
                ~{" "}
                {new Date(selected.assignment.closesAt).toLocaleString("ko-KR")}
              </p>
              {selected.assignment.cancelledAt ? (
                <p className={s.notice}>
                  취소한 과제입니다. 저장된 답안과 결과는 보존됩니다.
                </p>
              ) : (
                <>
                  <div className={s.actions}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run("최신 결과를 불러오는 중입니다.", (signal) =>
                          loadDetail(selected.assignment.id, signal).then(
                            () => {},
                          ),
                        )
                      }
                    >
                      결과 새로고침
                    </button>
                    {selected.assignment.mode === "exam" &&
                    selected.assignment.releasePolicy.kind === "manual" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "이 과제의 정답·대본·해설을 지금 공개할까요? 공개한 내용은 회수할 수 없습니다.",
                            )
                          )
                            mutation("release");
                        }}
                      >
                        정답·해설 지금 공개
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "이 과제를 취소할까요? 학생의 추가 접근은 중단되고 이미 저장한 답은 보존됩니다.",
                          )
                        )
                          mutation("cancel");
                      }}
                    >
                      과제 취소
                    </button>
                  </div>
                  {selected.assignment.audioSource === "teacher_device" ? (
                    <section
                      className={s.reviewPanel}
                      aria-label="교사 방송 제어"
                    >
                      <h3>교사 방송</h3>
                      {active &&
                      !["ended", "interrupted"].includes(
                        selected.broadcastStatus,
                      ) ? (
                        <TeacherWorkbench
                          key={`${selected.assignment.id}:${selected.assignment.revision}`}
                          document={selected.publication.document}
                          mediaUrlsByAssetId={selected.mediaUrlsByAssetId}
                          playbackEpoch={busy ? 1 : 0}
                          busy={busy}
                        />
                      ) : null}
                      {selected.broadcast ? (
                        <>
                          <p>
                            방송 시작{" "}
                            {new Date(
                              selected.broadcast.startedAt,
                            ).toLocaleString("ko-KR")}{" "}
                            · 종료{" "}
                            {new Date(
                              selected.broadcast.deadlineAt,
                            ).toLocaleString("ko-KR")}
                          </p>
                          <p>
                            방송 상태 ·{" "}
                            {selected.broadcastStatus === "active"
                              ? "진행 중"
                              : selected.broadcastStatus === "interrupted"
                                ? "중단"
                                : "종료"}
                          </p>
                          {selected.broadcastStatus === "active" ? (
                            <div className={s.actions}>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  mutation("broadcast", { action: "interrupt" })
                                }
                              >
                                방송 장애 기록·중단
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  mutation("broadcast", { action: "end" })
                                }
                              >
                                방송 종료
                              </button>
                            </div>
                          ) : (
                            <p className={s.muted}>
                              다시 방송하려면 새 과제를 배정하세요.
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <label className={s.check}>
                            <input
                              type="checkbox"
                              checked={soundChecked}
                              disabled={busy}
                              onChange={(event) =>
                                setSoundChecked(event.target.checked)
                              }
                            />
                            교사 기기와 스피커에서 소리가 나는지 확인했습니다
                          </label>
                          <button
                            type="button"
                            disabled={busy || !soundChecked}
                            onClick={() =>
                              mutation("broadcast", { action: "start" })
                            }
                          >
                            방송 시작 기록
                          </button>
                          <p className={s.muted}>
                            시작 기록 후 재생을 누르세요.
                          </p>
                        </>
                      )}
                    </section>
                  ) : null}
                </>
              )}
              <h3>학생별 결과</h3>
              <div className={s.tableWrap}>
                <table className={s.results}>
                  <thead>
                    <tr>
                      <th scope="col">학생</th>
                      <th scope="col">진행</th>
                      <th scope="col">최초 답 결과</th>
                      <th scope="col">공개 후 답</th>
                      <th scope="col">재응시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.results.map((row) => (
                      <tr key={row.studentId}>
                        <th scope="row">{row.name}</th>
                        <td>
                          {row.attempt
                            ? statusNames[row.attempt.status]
                            : "시작 전"}
                        </td>
                        <td>
                          {row.grade
                            ? `${row.grade.correct} / ${row.grade.total} 정답 · 미응답 ${row.grade.unanswered}`
                            : "결과 없음"}
                        </td>
                        <td>
                          {row.grade
                            ? `${row.grade.savedAfterRelease}개 · 공개 여부 미상 ${row.grade.releaseStatusUnknown}개`
                            : "—"}
                        </td>
                        <td>
                          {row.attempt &&
                          ["interrupted", "expired"].includes(
                            row.attempt.status,
                          ) &&
                          !selected.assignment.cancelledAt ? (
                            <button
                              type="button"
                              disabled={busy || !reason.trim()}
                              onClick={() =>
                                mutation("retry", {
                                  studentId: row.studentId,
                                  previousAttemptId: row.attempt!.id,
                                  reason: reason.trim(),
                                })
                              }
                            >
                              {row.name} 재응시 열기
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!selected.assignment.cancelledAt ? (
                <>
                  <label className={s.blockLabel}>
                    대상 추가·재응시 사유
                    <input
                      maxLength={1000}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  {availableTargets.length ? (
                    <fieldset className={s.targets} disabled={busy}>
                      <legend>현재 반의 학생 추가</legend>
                      {availableTargets.map((student) => (
                        <label key={student.id} className={s.check}>
                          <input
                            type="checkbox"
                            checked={added.includes(student.id)}
                            onChange={(event) =>
                              setAdded(
                                event.target.checked
                                  ? [...added, student.id]
                                  : added.filter((id) => id !== student.id),
                              )
                            }
                          />
                          {student.name}
                        </label>
                      ))}
                      <button
                        type="button"
                        disabled={!added.length || !reason.trim()}
                        onClick={() =>
                          mutation("targets", {
                            addedStudentIds: added,
                            reason: reason.trim(),
                          })
                        }
                      >
                        선택 학생 추가
                      </button>
                    </fieldset>
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <p className={s.empty}>
              과제를 선택하면 배정 현황과 학생별 결과를 볼 수 있습니다.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
