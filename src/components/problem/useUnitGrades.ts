"use client";

import { useEffect, useState } from "react";

import { loadUnits } from "@/lib/units/unitApi";

const EMPTY: ReadonlyMap<string, string> = new Map();

/**
 * 단원 → 학년. 문항 계약(`ProblemEntity`)에는 학년이 없어, 초등 대분수 표시
 * (`fractionViewFor` — 원장님 2026-09-19 «모든 화면이 일치하도록»)가 이 표로 학년을 찾는다.
 *
 * 못 불러오면 빈 표다 — 그러면 학년을 «모른다»라 원문 그대로 보인다(조용한 쪽).
 */
export function useUnitGrades(): ReadonlyMap<string, string> {
  const [grades, setGrades] = useState(EMPTY);
  useEffect(() => {
    let alive = true;
    loadUnits()
      .then(({ data }) => {
        if (alive)
          setGrades(new Map(data.map((unit) => [unit.id, unit.grade])));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return grades;
}
