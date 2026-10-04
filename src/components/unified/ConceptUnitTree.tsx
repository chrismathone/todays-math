"use client";

/**
 * 전체 차시 — 학년 › 단원 › 차시로 **전부 펼친** 보기, 차시마다 강의 상태 (D-124 ⑴ «전체는 한 번 더»).
 * 묶음은 수업 · 학생 관리의 단원 피커와 같은 함수(`gradesOf` · `chaptersOf` · `sectionsOf`)로 한다.
 * 가장 긴 차시 이름(41자)은 줄을 바꿔 전부 보인다 — 자르지 않는다(브리프 §1.1).
 */
import type { ConceptUnit } from "@/contracts/conceptAdmin.contract";
import { useState } from "react";
import { chaptersOf, gradesOf, sectionsOf } from "@/lib/units/groupUnits";

import { unitStateLabel } from "./conceptFormat";
import s from "./ConceptView.module.css";

export default function ConceptUnitTree({
  units,
  selectedUnitId,
  onSelect,
}: {
  units: ConceptUnit[];
  selectedUnitId: string | null;
  onSelect: (unitId: string) => void;
}) {
  const byId = new Map(units.map((u) => [u.id, u]));
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const states = new Map(
    units.map((unit) => {
      const state = unitStateLabel(unit.lectures);
      return [state.key, state.label];
    }),
  );
  const filtered = units.filter(
    (unit) =>
      (!gradeFilter || unit.grade === gradeFilter) &&
      (!stateFilter || unitStateLabel(unit.lectures).key === stateFilter) &&
      `${unit.code} ${unit.grade} ${unit.chapter} ${unit.section}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <section className={s.tree} aria-label="전체 차시">
      <div className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="grid gap-1">
          차시 검색
          <input
            className="min-h-11 rounded-lg border border-control px-3"
            placeholder="코드 · 단원 · 차시"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="grid gap-1">
          학년
          <select
            className="min-h-11 cursor-pointer rounded-lg border border-control px-3"
            value={gradeFilter}
            onChange={(event) => setGradeFilter(event.target.value)}
          >
            <option value="">전체 학년</option>
            {gradesOf(units).map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          영상 상태
          <select
            className="min-h-11 cursor-pointer rounded-lg border border-control px-3"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="">전체 상태</option>
            {[...states].map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-text-2">
          {filtered.length} / {units.length}차시
        </p>
      </div>
      {filtered.length === 0 ? (
        <p role="status">검색 조건에 맞는 차시가 없습니다.</p>
      ) : null}
      {selectedUnitId &&
      !filtered.some((unit) => unit.id === selectedUnitId) ? (
        <p role="status">
          선택한 차시가 현재 필터에 없습니다. 선택은 유지됩니다.
        </p>
      ) : null}
      {gradesOf(filtered).map((grade, gi) => {
        const count = filtered.filter((u) => u.grade === grade).length;
        return (
          <section
            key={grade}
            className={s.grade}
            aria-labelledby={`concept-grade-${gi}`}
          >
            <h2 id={`concept-grade-${gi}`}>
              {grade} <span className={s.sub}>{count}차시</span>
            </h2>
            {chaptersOf(filtered, grade).map((chapter) => (
              <div key={chapter} className={s.chapter}>
                <h3>{chapter}</h3>
                <ul className={s.unitList}>
                  {sectionsOf(filtered, grade, chapter).map((node) => {
                    const unit = byId.get(node.id)!;
                    const state = unitStateLabel(unit.lectures);
                    const on = unit.id === selectedUnitId;
                    return (
                      <li key={unit.id} className={on ? s.on : undefined}>
                        <span className={s.mono}>{unit.code}</span>
                        <button
                          type="button"
                          className={s.linkButton}
                          aria-pressed={on}
                          onClick={() => onSelect(unit.id)}
                        >
                          {unit.section}
                        </button>
                        <span className={`${s.pill} ${s[state.key]}`}>
                          {state.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </section>
  );
}
