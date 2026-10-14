"use client";

import { useMemo, useState } from "react";
import BuilderDialog from "./BuilderDialog";
import type { ExamScope } from "./types";
import { canSelectScope } from "./scopeAvailability";
import s from "./ExamBuilder.module.css";

const PAGE_SIZE = 20;
export default function ScopePicker({
  scopes,
  selected,
  initialGroup,
  requireCounts = false,
  onClose,
  onApply,
}: {
  scopes: ExamScope[];
  selected: string[];
  initialGroup?: string;
  requireCounts?: boolean;
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [chosen, setChosen] = useState(
    () =>
      new Set(
        selected.filter((id) =>
          canSelectScope(
            scopes.find((scope) => scope.id === id),
            requireCounts,
          ),
        ),
      ),
  );
  const [group, setGroup] = useState(initialGroup ?? "");
  const [detail, setDetail] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [onlyChosen, setOnlyChosen] = useState(false);
  const groups = useMemo(() => {
    const byGroup = new Map<string, ExamScope[]>();
    scopes.forEach((scope) => {
      const rows = byGroup.get(scope.group) ?? [];
      rows.push(scope);
      byGroup.set(scope.group, rows);
    });
    return Array.from(byGroup, ([label, rows]) => ({
      label,
      selectable: rows.some((scope) => canSelectScope(scope, requireCounts)),
      confirmedEmpty: rows.every((scope) => scope.count === 0),
      details: [
        ...new Set(
          rows.flatMap((scope) => (scope.detail ? [scope.detail] : [])),
        ),
      ],
    }));
  }, [scopes, requireCounts]);
  const detailGroups = groups.filter(
    (item) => (!group || item.label === group) && item.details.length > 0,
  );
  const filtered = useMemo(
    () =>
      scopes
        .filter(
          (scope) =>
            (!group || scope.group === group) &&
            (!detail ||
              JSON.stringify([scope.group, scope.detail]) === detail) &&
            (!onlyChosen || chosen.has(scope.id)) &&
            `${scope.label} ${scope.group} ${scope.detail ?? ""}`
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase()),
        )
        .toSorted((a, b) => Number(a.count === 0) - Number(b.count === 0)),
    [scopes, group, detail, onlyChosen, chosen, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectable = filtered.filter((row) =>
    canSelectScope(row, requireCounts),
  );
  const applicable = [...chosen].filter((id) =>
    canSelectScope(
      scopes.find((scope) => scope.id === id),
      requireCounts,
    ),
  );
  const allVisible =
    selectable.length > 0 && selectable.every((row) => chosen.has(row.id));
  const toggle = (id: string) => {
    if (chosen.size === 1 && chosen.has(id)) setOnlyChosen(false);
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (
        canSelectScope(
          scopes.find((scope) => scope.id === id),
          requireCounts,
        )
      )
        next.add(id);
      return next;
    });
  };
  return (
    <BuilderDialog title="출제 범위 선택" onClose={onClose} width={880}>
      <div className={s.dialogFilters}>
        <label>
          학년·과정
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setDetail("");
              setPage(1);
            }}
          >
            <option value="">전체</option>
            {groups.map((item) => (
              <option
                key={item.label}
                value={item.label}
                disabled={!item.selectable}
              >
                {item.label}
                {!item.selectable
                  ? item.confirmedEmpty
                    ? " · 출제 가능 문항 없음"
                    : " · 출제 가능 수 확인 필요"
                  : ""}
              </option>
            ))}
          </select>
        </label>
        {detailGroups.length > 0 && (
          <label>
            단원·자료 묶음
            <select
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                setPage(1);
              }}
            >
              <option value="">전체</option>
              {detailGroups.map((item) => (
                <optgroup
                  key={item.label}
                  label={item.label}
                  disabled={!item.selectable}
                >
                  {item.details.map((value) => (
                    <option
                      key={value}
                      value={JSON.stringify([item.label, value])}
                    >
                      {group ? value : `${item.label} · ${value}`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
        <label className={s.grow}>
          범위 검색
          <input
            value={query}
            maxLength={200}
            placeholder="단원·차시·자료 이름으로 검색"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={onlyChosen}
            disabled={!chosen.size}
            onChange={(e) => {
              setOnlyChosen(e.target.checked);
              setPage(1);
            }}
          />
          담은 범위만 보기
        </label>
      </div>
      <div className={s.scopeActions}>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={allVisible}
            disabled={!selectable.length}
            onChange={() => {
              if (allVisible && chosen.size === selectable.length)
                setOnlyChosen(false);
              setChosen((current) => {
                const next = new Set(current);
                selectable.forEach((row) =>
                  allVisible ? next.delete(row.id) : next.add(row.id),
                );
                return next;
              });
            }}
          />
          현재 결과 전체 선택
        </label>
        <span>
          {filtered.length.toLocaleString()}개 범위 · {applicable.length}개 선택
        </span>
        <button
          type="button"
          disabled={!chosen.size}
          onClick={() => {
            setChosen(new Set());
            setOnlyChosen(false);
            setPage(1);
          }}
        >
          선택 비우기
        </button>
      </div>
      <div className={s.dialogBody}>
        {rows.length ? (
          <ul className={s.scopeList}>
            {rows.map((scope) => (
              <li key={scope.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={applicable.includes(scope.id)}
                    disabled={!canSelectScope(scope, requireCounts)}
                    onChange={() => toggle(scope.id)}
                  />
                  <span>
                    <strong>{scope.label}</strong>{" "}
                    <small>
                      {[scope.group, scope.detail].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  {scope.count !== undefined && (
                    <small>
                      {scope.count
                        ? `${scope.count}문항`
                        : "출제 가능 문항 없음"}
                    </small>
                  )}
                  {requireCounts && scope.count === undefined && (
                    <small>출제 가능 수 확인 필요</small>
                  )}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>
            조건에 맞는 범위가 없습니다. 검색어나 필터를 변경해 주세요.
          </p>
        )}
      </div>
      <footer className={s.dialogFooter}>
        <div className={s.pagination}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            이전
          </button>
          <span>
            {currentPage} / {pages}
          </span>
          <button
            type="button"
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          >
            다음
          </button>
        </div>
        <button
          type="button"
          className={s.primary}
          onClick={() => onApply(applicable)}
        >
          {applicable.length}개 범위 적용
        </button>
      </footer>
    </BuilderDialog>
  );
}
