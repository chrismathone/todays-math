"use client";

import { useMemo, useState } from "react";
import BuilderDialog from "./BuilderDialog";
import type { ExamScope } from "./types";
import s from "./ExamBuilder.module.css";

const PAGE_SIZE = 20;
export default function ScopePicker({
  scopes,
  selected,
  initialGroup,
  onClose,
  onApply,
}: {
  scopes: ExamScope[];
  selected: string[];
  initialGroup?: string;
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [chosen, setChosen] = useState(() => new Set(selected));
  const [group, setGroup] = useState(initialGroup ?? "");
  const [detail, setDetail] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [onlyChosen, setOnlyChosen] = useState(false);
  const groups = useMemo(
    () => [...new Set(scopes.map((scope) => scope.group))],
    [scopes],
  );
  const details = useMemo(
    () => [
      ...new Set(
        scopes
          .filter((scope) => !group || scope.group === group)
          .map((scope) => scope.detail)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [scopes, group],
  );
  const filtered = useMemo(
    () =>
      scopes.filter(
        (scope) =>
          (!group || scope.group === group) &&
          (!detail || scope.detail === detail) &&
          (!onlyChosen || chosen.has(scope.id)) &&
          `${scope.label} ${scope.group} ${scope.detail ?? ""}`
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
      ),
    [scopes, group, detail, onlyChosen, chosen, query],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const allVisible =
    filtered.length > 0 && filtered.every((row) => chosen.has(row.id));
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <BuilderDialog title="출제 범위 선택" onClose={onClose}>
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
            {groups.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {details.length > 0 && (
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
              {details.map((value) => (
                <option key={value}>{value}</option>
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
            onChange={(e) => {
              setOnlyChosen(e.target.checked);
              setPage(1);
            }}
          />
          선택한 범위만
        </label>
      </div>
      <div className={s.scopeActions}>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={allVisible}
            disabled={!rows.length}
            onChange={() =>
              setChosen((current) => {
                const next = new Set(current);
                filtered.forEach((row) =>
                  allVisible ? next.delete(row.id) : next.add(row.id),
                );
                return next;
              })
            }
          />
          현재 결과 전체 선택
        </label>
        <span>
          {filtered.length.toLocaleString()}개 범위 · {chosen.size}개 선택
        </span>
        <button
          type="button"
          disabled={!chosen.size}
          onClick={() => setChosen(new Set())}
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
                    checked={chosen.has(scope.id)}
                    onChange={() => toggle(scope.id)}
                  />
                  <span>
                    <strong>{scope.label}</strong>{" "}
                    <small>
                      {[scope.group, scope.detail].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  {scope.count !== undefined && (
                    <small>{scope.count}문항</small>
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
          onClick={() => onApply([...chosen])}
        >
          {chosen.size}개 범위 적용
        </button>
      </footer>
    </BuilderDialog>
  );
}
