"use client";

import { useEffect, useRef, useState } from "react";
import type {
  WorkbookWrongNote,
  WorkbookWrongNotePrint,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import WorkbookReferencePrint from "./WorkbookReferencePrint";
import {
  addressLabel,
  editionLabel,
  isConflict,
  messageOf,
  requestIdentity,
} from "./presentation";
import { useDraftGuard } from "./useDraftGuard";
import s from "./CommercialWorkbooks.module.css";

type Draft = {
  correctionText: string;
  status: "todo" | "done";
  revision: number;
  conflict?: boolean;
  latest?: WorkbookWrongNote;
};
export default function WorkbookWrongNotes({
  source,
  refreshVersion,
}: {
  source: CommercialWorkbookSource;
  refreshVersion: number;
}) {
  const [notes, setNotes] = useState<WorkbookWrongNote[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [plan, setPlan] = useState<WorkbookWrongNotePrint | null>(null);
  const requestId = useRef(requestIdentity());
  const dirty = Object.keys(drafts).length > 0;
  useDraftGuard(dirty);
  useEffect(() => {
    let active = true;
    source
      .listWrongNotes()
      .then((value) => {
        if (!active) return;
        setNotes(value);
        setError("");
        setDrafts((previous) =>
          Object.fromEntries(
            Object.entries(previous).map(([id, draft]) => {
              const latest = value.find((note) => note.id === id);
              return [
                id,
                latest && latest.revision !== draft.revision
                  ? { ...draft, conflict: true, latest }
                  : draft,
              ];
            }),
          ),
        );
      })
      .catch((reason) => {
        if (active) setError(messageOf(reason));
      });
    return () => {
      active = false;
    };
  }, [source, reload, refreshVersion]);
  const active = notes?.find((note) => note.id === activeId);
  const draft = drafts[activeId];
  const filtered = notes?.filter(
    (note) =>
      (!student || note.studentId === student) &&
      (!stateFilter || note.status === stateFilter) &&
      `${note.edition.metadata.title} ${note.assignmentTitle} ${addressLabel(note.address)}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  function edit(patch: Partial<Pick<Draft, "correctionText" | "status">>) {
    if (!active) return;
    setStatus("");
    setDrafts((previous) => ({
      ...previous,
      [active.id]: {
        ...(previous[active.id] ?? {
          correctionText: active.correctionText,
          status: active.status,
          revision: active.revision,
        }),
        ...patch,
      },
    }));
  }
  async function save() {
    if (!active || !draft || draft.conflict || busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const body = {
        expectedRevision: draft.revision,
        correctionText: draft.correctionText,
        status: draft.status,
      };
      const updated = await source.updateWrongNote(active.id, {
        ...body,
        requestId: requestId.current({ id: active.id, ...body }),
      });
      setNotes(
        (previous) =>
          previous?.map((note) =>
            note.id === updated.id ? updated : note,
          ) ?? [updated],
      );
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[active.id];
        return next;
      });
      setStatus(
        `${active.studentName} · ${addressLabel(active.address)} 오답노트 저장됨`,
      );
      setPlan(null);
    } catch (reason) {
      setError(messageOf(reason));
      if (isConflict(reason))
        setDrafts((previous) => ({
          ...previous,
          [active.id]: { ...previous[active.id], conflict: true },
        }));
    } finally {
      setBusy(false);
    }
  }
  const selectedDirty = selected.some((id) => drafts[id]);
  async function getPrint() {
    return source.getWrongNotePrint({ noteIds: selected, includeAnswers });
  }
  async function preview() {
    if (!selected.length || selectedDirty || busy) return;
    setBusy(true);
    setError("");
    try {
      setPlan(await getPrint());
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.stack}>
      <div className={s.header}>
        <div>
          <h2>저장한 오답</h2>
          <p>처음 틀린 기록을 보존하면서 교정 메모와 복습 상태를 관리합니다.</p>
        </div>
        <button
          type="button"
          className={s.button}
          disabled={busy}
          onClick={() => {
            setReload((value) => value + 1);
            setPlan(null);
          }}
        >
          저장본 새로고침
        </button>
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error} 수정 중인 메모는 유지됩니다.
        </p>
      )}
      {status && (
        <p role="status" className={s.success}>
          {status}
        </p>
      )}
      <div className={s.toolbar}>
        <label className={s.search}>
          오답 찾기
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="교재, 과제, 쪽·번호"
          />
        </label>
        <label>
          학생
          <select
            value={student}
            onChange={(event) => setStudent(event.target.value)}
          >
            <option value="">모든 학생</option>
            {[
              ...new Map(
                notes?.map((note) => [note.studentId, note.studentName]),
              ).entries(),
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          복습 상태
          <select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">모두</option>
            <option value="todo">할 일</option>
            <option value="done">완료</option>
          </select>
        </label>
      </div>
      {!notes && !error && <p role="status">저장된 오답을 불러오는 중…</p>}
      {notes && (
        <div className={s.split}>
          <section className={s.panel} aria-label="저장한 오답 목록">
            <div className={s.sectionHeading}>
              <p className={s.caption}>
                검색 결과 {filtered?.length}개 · 인쇄 선택 {selected.length}개
              </p>
              <button
                type="button"
                className={s.button}
                disabled={!selected.length}
                onClick={() => {
                  setSelected([]);
                  setPlan(null);
                }}
              >
                인쇄 선택 해제
              </button>
            </div>
            {filtered?.map((note) => (
              <div className={s.checkRow} key={note.id}>
                <label className={s.checkbox}>
                  <input
                    type="checkbox"
                    aria-label={`${note.studentName} ${addressLabel(note.address)} 인쇄 선택`}
                    checked={selected.includes(note.id)}
                    disabled={
                      busy ||
                      (!selected.includes(note.id) && selected.length >= 100)
                    }
                    onChange={() => {
                      setSelected((previous) =>
                        previous.includes(note.id)
                          ? previous.filter((id) => id !== note.id)
                          : [...previous, note.id],
                      );
                      setPlan(null);
                    }}
                  />
                  <span className={s.caption}>인쇄</span>
                </label>
                <span
                  className={`${s.badge} ${note.status === "done" ? s.done : s.warning}`}
                >
                  {note.status === "done" ? "완료" : "할 일"}
                </span>
                <button
                  type="button"
                  className={`${s.listRow} ${s.full}`}
                  aria-pressed={activeId === note.id}
                  disabled={busy}
                  onClick={() => {
                    setActiveId(note.id);
                    setError("");
                    setStatus("");
                  }}
                >
                  <strong>
                    {note.studentName} · {note.edition.metadata.title}
                  </strong>
                  <span>{addressLabel(note.address)}</span>
                  <span className={s.caption}>
                    {note.edition.metadata.edition || "판본 미기록"} ·{" "}
                    {note.assignmentTitle}
                    {drafts[note.id] ? " · 미저장 메모" : ""}
                  </span>
                </button>
              </div>
            ))}
            {!filtered?.length && (
              <p className={s.empty}>
                {notes.length
                  ? "조건에 맞는 오답이 없습니다."
                  : "저장된 오답이 없습니다. 과제에서 오답을 표시하고 채점을 저장해 주세요."}
              </p>
            )}
          </section>
          {active ? (
            <section className={s.panel} aria-label="오답노트 편집">
              <div className={s.stack}>
                <div>
                  <h2>{active.studentName} · 오답노트</h2>
                  <p>{active.edition.metadata.title}</p>
                  <p className={s.caption}>
                    {editionLabel(active.edition.metadata)} · 정답표 개정{" "}
                    {active.edition.revision}
                  </p>
                  <strong>{addressLabel(active.address)}</strong>
                </div>
                <p className={s.notice}>
                  최초 오답 기록:{" "}
                  {new Date(active.originalWrongEvent.gradedAt).toLocaleString(
                    "ko-KR",
                    { timeZone: "Asia/Seoul" },
                  )}
                  {active.latestMark !== "wrong"
                    ? ` · 이후 채점: ${active.latestMark === "correct" ? "정답" : active.latestMark === "unattempted" ? "안 풀었음" : "미채점"}`
                    : ""}
                  . 메모나 완료 상태를 바꾸어도 이 기록은 유지됩니다.
                </p>
                <fieldset className={s.stack} disabled={busy}>
                  <label>
                    교정 · 복습 메모
                    <AutoGrowTextarea
                      value={draft?.correctionText ?? active.correctionText}
                      maxLength={10000}
                      placeholder="어디에서 틀렸는지, 다시 확인할 내용을 남기세요."
                      onChange={(event) =>
                        edit({ correctionText: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    복습 상태
                    <select
                      value={draft?.status ?? active.status}
                      onChange={(event) =>
                        edit({ status: event.target.value as "todo" | "done" })
                      }
                    >
                      <option value="todo">할 일</option>
                      <option value="done">완료</option>
                    </select>
                  </label>
                </fieldset>
                {draft?.conflict && (
                  <div className={s.error} role="alert">
                    <p>
                      다른 수정이 먼저 저장되었습니다. 내 메모를 유지했습니다.
                    </p>
                    {draft.latest ? (
                      <>
                        <p>
                          최신 메모:{" "}
                          {draft.latest.correctionText || "메모 없음"} ·{" "}
                          {draft.latest.status === "done" ? "완료" : "할 일"}
                        </p>
                        <button
                          type="button"
                          className={s.button}
                          onClick={() => {
                            setDrafts((previous) => ({
                              ...previous,
                              [active.id]: {
                                ...previous[active.id],
                                revision: draft.latest!.revision,
                                conflict: false,
                                latest: undefined,
                              },
                            }));
                            setError("");
                          }}
                        >
                          최신본 확인 · 내 메모 유지
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={s.button}
                        onClick={() => setReload((value) => value + 1)}
                      >
                        최신 메모 비교
                      </button>
                    )}
                  </div>
                )}
                <div className={s.savebar}>
                  <span className={s.caption}>
                    {draft
                      ? "저장하지 않은 메모·상태"
                      : `저장됨 · 버전 ${active.revision}`}
                  </span>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={busy || !draft || draft.conflict}
                    onClick={() => void save()}
                  >
                    {busy ? "저장 중…" : "오답노트 저장"}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <p className={s.notice}>
              오답을 열어 메모와 복습 상태를 기록하세요. 인쇄할 문항은 체크로
              따로 선택합니다.
            </p>
          )}
        </div>
      )}
      <section className={s.panel} aria-label="선택한 오답 출력">
        <div className={s.savebar}>
          <div>
            <h3>선택한 오답 {selected.length}개</h3>
            <p className={s.caption}>
              교재 참조와 풀이 공간 · 최대 100개 · 원문 문제 미포함
            </p>
          </div>
          <button
            type="button"
            className={s.primary}
            disabled={!selected.length || selectedDirty || busy}
            onClick={() => void preview()}
          >
            {busy ? "확인 중…" : "참조형 인쇄 미리보기"}
          </button>
        </div>
        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={includeAnswers}
            disabled={busy}
            onChange={(event) => {
              setIncludeAnswers(event.target.checked);
              setPlan(null);
            }}
          />
          교사용 정답 포함 (선택)
        </label>
        {selectedDirty && (
          <p className={s.notice}>
            선택한 오답의 메모·상태를 먼저 저장해 주세요.
          </p>
        )}
      </section>
      {plan && (
        <WorkbookReferencePrint
          plan={plan}
          beforePrint={() =>
            source.getWrongNotePrint({
              noteIds: plan.items.map((item) => item.noteId),
              includeAnswers: plan.includesAnswers,
            })
          }
          onClose={() => setPlan(null)}
        />
      )}
    </div>
  );
}
