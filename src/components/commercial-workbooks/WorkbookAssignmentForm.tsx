"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  WorkbookAssignment,
  WorkbookEditionDetail,
  WorkbookRosterClass,
} from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import { addressLabel, messageOf, requestIdentity } from "./presentation";
import { useDraftGuard } from "./useDraftGuard";
import s from "./CommercialWorkbooks.module.css";

export default function WorkbookAssignmentForm({
  source,
  book,
  onSaved,
  onDirtyChange,
}: {
  source: CommercialWorkbookSource;
  book: WorkbookEditionDetail;
  onSaved: (assignment: WorkbookAssignment) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(`${book.metadata.title} 과제`);
  const [roster, setRoster] = useState<WorkbookRosterClass[] | null>(null);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [volume, setVolume] = useState("");
  const [section, setSection] = useState("");
  const [pageFrom, setPageFrom] = useState("");
  const [pageTo, setPageTo] = useState("");
  const [number, setNumber] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  const [rosterError, setRosterError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const requestId = useRef(requestIdentity());
  const dirty =
    items.length > 0 ||
    students.length > 0 ||
    !!due ||
    title !== `${book.metadata.title} 과제`;
  useDraftGuard(dirty);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    let active = true;
    source
      .listRoster()
      .then((value) => {
        if (active) {
          setRoster(value);
          setRosterError("");
        }
      })
      .catch((reason) => {
        if (active) setRosterError(messageOf(reason));
      });
    return () => {
      active = false;
    };
  }, [source, reload]);
  const volumes = [
    ...new Set(book.exercises.map((item) => item.address.volume)),
  ].filter(Boolean);
  const volumeItems = book.exercises.filter(
    (item) => !volume || item.address.volume === volume,
  );
  const sections = [
    ...new Set(volumeItems.map((item) => item.address.section)),
  ].filter(Boolean);
  const scoped = volumeItems.filter(
    (item) => !section || item.address.section === section,
  );
  const pages = [...new Set(scoped.map((item) => item.address.page))];
  const pageIndexes = new Map(pages.map((page, index) => [page, index]));
  const fromIndex = pageFrom ? pages.indexOf(pageFrom) : 0;
  const toIndex = pageTo ? pages.indexOf(pageTo) : pages.length - 1;
  const filtered = scoped.filter((item) => {
    const index = pageIndexes.get(item.address.page)!;
    return (
      index >= fromIndex &&
      index <= toIndex &&
      (!number.trim() ||
        `${item.address.number} ${item.address.subpart}`.includes(
          number.trim(),
        ))
    );
  });
  const selectedClass = roster?.find((item) => item.id === classId);
  function toggle(set: string[], value: string) {
    return set.includes(value)
      ? set.filter((id) => id !== value)
      : [...set, value];
  }
  async function save() {
    if (busy || !title.trim() || !classId || !students.length || !items.length)
      return;
    setBusy(true);
    setError("");
    try {
      const body = {
        title: title.trim(),
        editionId: book.id,
        expectedEditionRevision: book.revision,
        classId,
        studentIds: students,
        exerciseIds: book.exercises
          .filter((item) => items.includes(item.id))
          .map((item) => item.id),
        ...(due
          ? { dueAt: new Date(`${due}T23:59:00+09:00`).toISOString() }
          : {}),
      };
      const assignment = await source.createAssignment({
        ...body,
        requestId: requestId.current(body),
      });
      setItems([]);
      setStudents([]);
      setDue("");
      setTitle(`${book.metadata.title} 과제`);
      requestId.current = requestIdentity();
      onSaved(assignment);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.stack} aria-labelledby={`${id}-heading`}>
      <h3 id={`${id}-heading`}>과제 배정</h3>
      <p className={s.muted}>
        고른 문항과 학생만 배정합니다. 정답표 개정 {book.revision}의 문항을
        과제에 보관합니다.
      </p>
      <fieldset className={s.stack} disabled={busy}>
        <label>
          과제 이름
          <input
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        {(volumes.length > 1 || sections.length > 1) && (
          <div className={s.formGrid}>
            <label>
              권 · 책
              <select
                value={volume}
                onChange={(event) => {
                  setVolume(event.target.value);
                  setSection("");
                  setPageFrom("");
                  setPageTo("");
                }}
              >
                <option value="">모든 권 · 책</option>
                {volumes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              단원
              <select
                value={section}
                onChange={(event) => {
                  setSection(event.target.value);
                  setPageFrom("");
                  setPageTo("");
                }}
              >
                <option value="">모든 단원</option>
                {sections.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className={s.formGrid}>
          <label>
            시작 쪽
            <select
              value={pageFrom}
              onChange={(event) => setPageFrom(event.target.value)}
            >
              <option value="">처음부터</option>
              {pages.map((page) => (
                <option key={page} value={page}>
                  {page}쪽
                </option>
              ))}
            </select>
          </label>
          <label>
            끝 쪽
            <select
              value={pageTo}
              onChange={(event) => setPageTo(event.target.value)}
            >
              <option value="">마지막까지</option>
              {pages.map((page) => (
                <option key={page} value={page}>
                  {page}쪽
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          문항 번호 · 소문항 찾기
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="예: 01, ⑴"
          />
        </label>
        <div className={s.actions}>
          <button
            type="button"
            className={s.button}
            disabled={
              !filtered.length ||
              new Set([...items, ...filtered.map((item) => item.id)]).size > 500
            }
            onClick={() =>
              setItems([
                ...new Set([...items, ...filtered.map((item) => item.id)]),
              ])
            }
          >
            현재 범위 {filtered.length}개 선택
          </button>
          <button
            type="button"
            className={s.button}
            disabled={!items.length}
            onClick={() => setItems([])}
          >
            문항 선택 해제
          </button>
          <span className={s.caption}>선택 {items.length} / 최대 500문항</span>
        </div>
        <div
          className={s.checkList}
          role="region"
          aria-label="배정할 문항 선택"
          tabIndex={0}
        >
          {filtered.length ? (
            filtered.map((item) => (
              <div className={s.checkRow} key={item.id}>
                <label className={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={items.includes(item.id)}
                    disabled={!items.includes(item.id) && items.length >= 500}
                    onChange={() => setItems(toggle(items, item.id))}
                  />
                  {addressLabel(item.address)}
                </label>
                <span
                  className={`${s.badge} ${item.key?.status === "reviewed" ? s.done : s.warning}`}
                >
                  {item.key
                    ? item.key.status === "reviewed"
                      ? "정답 검토함"
                      : "정답 검토 전"
                    : "정답 미확보"}
                </span>
              </div>
            ))
          ) : (
            <p className={s.empty}>
              현재 범위에 문항이 없습니다. 시작·끝 쪽과 번호를 확인해 주세요.
            </p>
          )}
        </div>
        <label>
          배정할 반
          <select
            value={classId}
            disabled={!roster}
            onChange={(event) => {
              setClassId(event.target.value);
              setStudents([]);
            }}
          >
            <option value="">반을 선택하세요</option>
            {roster?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {!roster && !rosterError && (
          <p role="status">반·학생 명단을 불러오는 중…</p>
        )}
        {rosterError && (
          <div className={s.error} role="alert">
            {rosterError}
            <button
              type="button"
              className={s.button}
              onClick={() => setReload((value) => value + 1)}
            >
              명단 다시 불러오기
            </button>
          </div>
        )}
        {roster?.length === 0 && (
          <p className={s.notice}>
            배정할 수 있는 반이 없습니다. 반 · 학생 관리에서 담당 반을 확인해
            주세요.
          </p>
        )}
        {selectedClass && (
          <fieldset className={s.compactStack}>
            <legend>대상 학생 · {students.length}명 선택</legend>
            <div className={s.actions}>
              <button
                type="button"
                className={s.button}
                disabled={selectedClass.students.length > 100}
                onClick={() =>
                  setStudents(
                    selectedClass.students.map((student) => student.id),
                  )
                }
              >
                이 반 학생 모두 선택
              </button>
              <button
                type="button"
                className={s.button}
                disabled={!students.length}
                onClick={() => setStudents([])}
              >
                학생 선택 해제
              </button>
            </div>
            {selectedClass.students.length ? (
              <div className={s.checkList}>
                {selectedClass.students.map((student) => (
                  <label className={s.checkbox} key={student.id}>
                    <input
                      type="checkbox"
                      checked={students.includes(student.id)}
                      disabled={
                        !students.includes(student.id) && students.length >= 100
                      }
                      onChange={() => setStudents(toggle(students, student.id))}
                    />
                    {student.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className={s.muted}>이 반에 배정할 학생이 없습니다.</p>
            )}
          </fieldset>
        )}
        <label>
          제출 기한 (선택 · 한국 시간)
          <input
            type="date"
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />
        </label>
        <div className={s.savebar}>
          <span>
            {items.length}문항 · {students.length}명
            {due ? ` · ${due}까지` : " · 기한 없음"}
          </span>
          <button
            type="button"
            className={s.primary}
            disabled={
              !items.length || !students.length || !classId || !title.trim()
            }
            onClick={() => void save()}
          >
            {busy ? "배정 중…" : "선택한 학생에게 과제 배정"}
          </button>
        </div>
        {(!items.length || !students.length) && (
          <p className={s.caption}>문항과 대상 학생을 각각 선택해 주세요.</p>
        )}
      </fieldset>
      {error && (
        <p className={s.error} role="alert">
          {error} 문항·학생 선택을 유지했습니다.
        </p>
      )}
    </section>
  );
}
