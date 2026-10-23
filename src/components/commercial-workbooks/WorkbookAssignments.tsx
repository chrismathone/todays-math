"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkbookAssignment } from "@/contracts/commercialWorkbook.contract";
import type { CommercialWorkbookSource } from "@/lib/commercialWorkbooks/source";
import WorkbookGrading from "./WorkbookGrading";
import { editionLabel, messageOf } from "./presentation";
import s from "./CommercialWorkbooks.module.css";

export default function WorkbookAssignments({
  source,
  created,
  onSaved,
}: {
  source: CommercialWorkbookSource;
  created: WorkbookAssignment | null;
  onSaved: () => void;
}) {
  const [assignments, setAssignments] = useState<WorkbookAssignment[] | null>(
    null,
  );
  const [opened, setOpened] = useState<Record<string, WorkbookAssignment>>({});
  const [selected, setSelected] = useState<{ id: string; creationId?: string }>(
    { id: "" },
  );
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false);
  const version = useRef(0);
  useEffect(() => {
    let active = true;
    source
      .listAssignments()
      .then((value) => {
        if (active) {
          setAssignments(value);
          setError("");
        }
      })
      .catch((reason) => {
        if (active) setError(messageOf(reason));
      });
    return () => {
      active = false;
    };
  }, [source, reload, created]);
  // A newly created assignment is an explicit user selection, never an automatic first student.
  const current =
    selected.creationId === created?.id
      ? selected.id
      : created?.id || selected.id;
  const allOpened = {
    ...opened,
    ...(created ? { [created.id]: opened[created.id] ?? created } : {}),
  };
  async function open(id: string) {
    setSelected({ id, creationId: created?.id });
    setError("");
    if (allOpened[id]) return;
    const request = ++version.current;
    setLoading(true);
    try {
      const value = await source.getAssignment(id);
      if (request === version.current)
        setOpened((previous) => ({ ...previous, [id]: value }));
    } catch (reason) {
      if (request === version.current) setError(messageOf(reason));
    } finally {
      if (request === version.current) setLoading(false);
    }
  }
  function saved(value: WorkbookAssignment) {
    setAssignments(
      (previous) =>
        previous?.map((item) => (item.id === value.id ? value : item)) ?? [
          value,
        ],
    );
    onSaved();
  }
  const filtered = assignments?.filter((item) =>
    `${item.title} ${item.className} ${item.edition.metadata.title}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  return (
    <div className={s.stack}>
      <div className={s.header}>
        <div>
          <h2>과제 · 채점</h2>
          <p>학생별 채점을 저장하면 오답노트에 연결됩니다.</p>
        </div>
        <button
          type="button"
          className={s.button}
          onClick={() => setReload((value) => value + 1)}
        >
          과제 목록 새로고침
        </button>
      </div>
      {created && (
        <p className={s.success} role="status">
          ‘{created.title}’ 배정됨 · {created.exercises.length}문항 ·{" "}
          {created.targets.length}명
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.split}>
        <section className={s.panel} aria-label="저장한 과제">
          <label>
            과제 찾기
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="과제명, 반, 교재"
            />
          </label>
          <div className={s.list}>
            {filtered?.map((item) => (
              <button
                type="button"
                key={item.id}
                className={s.listRow}
                aria-pressed={current === item.id}
                onClick={() => void open(item.id)}
              >
                <strong>{item.title}</strong>
                <span className={s.caption}>
                  {item.className} · {item.targets.length}명 ·{" "}
                  {item.exercises.length}문항
                </span>
                <span className={s.caption}>
                  {editionLabel(item.edition.metadata)}
                </span>
              </button>
            ))}
          </div>
          {!assignments ? (
            <p role="status" className={s.empty}>
              과제를 불러오는 중…
            </p>
          ) : (
            !filtered?.length && (
              <p className={s.empty}>
                {assignments.length
                  ? "조건에 맞는 과제가 없습니다."
                  : "저장한 과제가 없습니다. 교재 정답에서 과제를 배정해 주세요."}
              </p>
            )
          )}
        </section>
        <div>
          {loading && <p role="status">과제를 불러오는 중…</p>}
          {Object.values(allOpened).map((item) => (
            <div key={item.id} hidden={current !== item.id}>
              <WorkbookGrading source={source} initial={item} onSaved={saved} />
            </div>
          ))}
          {!current && (
            <p className={s.notice}>
              과제를 선택하면 학생별 저장 현황과 채점표를 볼 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
