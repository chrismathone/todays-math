"use client";

/**
 * 전체 차시 — 학년 › 단원 › 차시로 **전부 펼친** 보기, 차시마다 강의 상태 (D-124 ⑴ «전체는 한 번 더»).
 * 묶음은 수업 · 학생 관리의 단원 피커와 같은 함수(`gradesOf` · `chaptersOf` · `sectionsOf`)로 한다.
 * 가장 긴 차시 이름(41자)은 줄을 바꿔 전부 보인다 — 자르지 않는다(브리프 §1.1).
 */
import type { ConceptUnit } from "@/contracts/conceptAdmin.contract";
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
  return (
    <section className={s.tree} aria-label="전체 차시">
      {gradesOf(units).map((grade, gi) => {
        const count = units.filter((u) => u.grade === grade).length;
        return (
          <section
            key={grade}
            className={s.grade}
            aria-labelledby={`concept-grade-${gi}`}
          >
            <h2 id={`concept-grade-${gi}`}>
              {grade} <span className={s.sub}>{count}차시</span>
            </h2>
            {chaptersOf(units, grade).map((chapter) => (
              <div key={chapter} className={s.chapter}>
                <h3>{chapter}</h3>
                <ul className={s.unitList}>
                  {sectionsOf(units, grade, chapter).map((node) => {
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
