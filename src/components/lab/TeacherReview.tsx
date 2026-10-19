"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import TodayMathMark from "@/components/brand/TodayMathMark";
import { COURSES } from "@/lib/lab/courses";
import { SPECIAL_COURSES } from "@/lib/lab/specialCourses";
import {
  CURRICULUM_SOURCES,
  implementationSummary,
  units,
} from "@/lib/lab/curriculum";
import type { LabSave, UnitRecord } from "@/lib/lab/types";

import styles from "./lab.module.css";
import { useLabSave } from "./useLabSave";

const STATUS: Record<UnitRecord["status"], string> = {
  implemented: "수업",
  partial: "일부",
  hold: "보류",
  excluded: "제외",
};

const GATE_FILTER: { id: "all" | UnitRecord["gate"]; label: string }[] = [
  { id: "all", label: "모든 판정" },
  { id: "play", label: "수업" },
  { id: "hold", label: "보류" },
  { id: "exclude", label: "제외" },
];

export function TeacherReview() {
  const [grade, setGrade] = useState(2);
  const [semester, setSemester] = useState(1);
  const [gate, setGate] = useState<"all" | UnitRecord["gate"]>("all");
  const { save } = useLabSave();
  const list = useMemo(
    () =>
      units().filter(
        (u) =>
          u.grade === grade &&
          u.semester === semester &&
          (gate === "all" || u.gate === gate),
      ),
    [grade, semester, gate],
  );
  const summary = implementationSummary();
  return (
    <div className={styles.page}>
      <header className={styles.chrome}>
        <Link href="/lab" className={styles.wordmark}>
          <TodayMathMark size={28} />
          오늘 수학
        </Link>
        <span className={styles.sub}>교사용 범위</span>
      </header>
      <main className={styles.main} id="main-content">
        <p className={styles.kicker}>교사용 · 2022 개정 주요 단원</p>
        <h1>구현 범위와 학습 기록</h1>
        <p className={styles.lead}>
          주요 단원 {summary.catalog}개를 퀴즈 코스 {summary.catalog}개로 만들지
          않습니다. 수업 {summary.play} · 보류 {summary.hold} · 일부{" "}
          {summary.partial} · 제외 {summary.excluded}입니다. 실물
          세기·작도·무게, 단순 계산 암기, 교실 자료 수집은 빼 둡니다. 초3-1
          덧셈·뺄셈은 묶음 교환과 이유 설명을 연결하는 전용 실험실에서 다룹니다.
          학생 몰입 효과는 아직 측정하지 않았습니다.
        </p>
        <p className={styles.note}>
          학생 화면: <Link href="/lab">/lab</Link> · 전개도 원본{" "}
          <code>public/lab/blender/cube-net-lesson.blend</code>
        </p>
        <div className={styles.filterRow}>
          <label>
            학년{" "}
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              aria-label="학년"
            >
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </label>
          <label>
            학기{" "}
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              aria-label="학기"
            >
              {[1, 2].map((s) => (
                <option key={s} value={s}>
                  {s}학기
                </option>
              ))}
            </select>
          </label>
          <label>
            판정{" "}
            <select
              value={gate}
              onChange={(e) =>
                setGate(e.target.value as "all" | UnitRecord["gate"])
              }
              aria-label="판정"
            >
              {GATE_FILTER.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>단원</th>
              <th>핵심 개념</th>
              <th>판정</th>
              <th>이유</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => {
              const source = CURRICULUM_SOURCES[u.source];
              return (
                <tr key={u.id}>
                  <td>
                    {u.unit}. {u.title}
                  </td>
                  <td>{u.concept}</td>
                  <td>
                    <div
                      className={`${styles.status} ${
                        u.status === "implemented"
                          ? styles.statusImpl
                          : u.status === "partial"
                            ? styles.statusPartial
                            : u.status === "excluded"
                              ? styles.statusExcluded
                              : styles.statusHold
                      }`}
                    >
                      {STATUS[u.status]}
                    </div>
                    {u.courses.map((id) => (
                      <div key={id}>
                        <Link
                          href={
                            SPECIAL_COURSES.find((c) => c.id === id)?.href ??
                            `/lab/play/${id}`
                          }
                        >
                          {SPECIAL_COURSES.find((c) => c.id === id)?.title ??
                            COURSES.find((c) => c.id === id)?.title}
                        </Link>
                      </div>
                    ))}
                    {source ? (
                      <div className={styles.note}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.name}
                        </a>
                      </div>
                    ) : null}
                  </td>
                  <td>{u.scopeReason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h2 className={styles.kicker}>이 브라우저의 학습 기록</h2>
        <p className={styles.note}>
          <Link href="/lab/cube-3-1">초3-1 덧셈·뺄셈의 학습 기록</Link>은 전용
          실험실에서 확인합니다. 개념 활동의 시도·도움 횟수와 도움 없이 해결한
          여섯 계산 유형을 구분합니다.
        </p>
        <RecordTable save={save} />
      </main>
    </div>
  );
}

function RecordTable({ save }: { save: LabSave }) {
  const rows = COURSES.flatMap((course) =>
    course.activities.map((activity) => {
      const rec = save.courses[course.id]?.activities[activity.id];
      return {
        course: course.title,
        activity: activity.title,
        kind: activity.kind,
        rec,
      };
    }),
  );
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>코스</th>
          <th>활동</th>
          <th>시도</th>
          <th>힌트</th>
          <th>완료</th>
          <th>독립 적용</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.course}-${row.activity}`}>
            <td>{row.course}</td>
            <td>{row.activity}</td>
            <td>{row.rec?.attempts ?? 0}</td>
            <td>{row.rec?.hints ?? 0}</td>
            <td>{row.rec?.completed ? "완료" : "미완"}</td>
            <td>{row.rec?.independent ? "독립" : "해당 없음"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
