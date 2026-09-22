"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  formatDayWithWeekday,
  formatInstantDay,
} from "@/components/unified/conceptFormat";
import type { MathSrsClassDashboard } from "@/contracts/mathSrs.contract";
import { fetchClassMathSrs } from "./mathSrsApi";
import { SrsMemoryGrid } from "./SrsMemoryGrid";
import s from "./authenticated.module.css";

export function ClassMathSrs({ classId }: { classId: string }) {
  const [state, setState] = useState<MathSrsClassDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    void fetchClassMathSrs(classId).then((result) => {
      if (!current) return;
      setLoading(false);
      if (result.ok) {
        setState(result.data);
        setError(null);
      } else setError(result);
    });
    return () => {
      current = false;
    };
  }, [classId, reload]);
  const students = state?.students ?? [];
  const practiced = students.filter(
    (student) => (student.today?.answered ?? 0) > 0,
  ).length;
  const completed = students.filter(
    (student) => student.today?.completedAt,
  ).length;
  return (
    <main className={`${s.body} ${s.teacher}`}>
      <nav className={s.nav}>
        <Link href="/classes">← 반 관리</Link>
      </nav>
      <header className={s.teacherHeader}>
        <div>
          <p className={s.eyebrow}>CLASS PRACTICE</p>
          <h1>{state ? `${state.class.name} · 수학 복습` : "반 수학 복습"}</h1>
          <p className={s.muted}>
            등록된 학생들의 실제 풀이 기록과 현재 진도를 확인합니다.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
          disabled={loading}
        >
          새로고침
        </Button>
      </header>
      {loading ? <p role="status">반 학습 기록을 불러오는 중…</p> : null}
      {error ? (
        <div role="alert" className={s.error}>
          <p>
            {error.status === 503
              ? "학습 기록 저장 기능이 아직 준비되지 않았습니다. 저장 기능 설정을 마친 뒤 다시 불러오세요."
              : error.message}
          </p>
          {error.status === 401 ? (
            <Link href="/login">로그인하기</Link>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setLoading(true);
                setReload((value) => value + 1);
              }}
              disabled={loading}
            >
              다시 불러오기
            </Button>
          )}
        </div>
      ) : null}
      {state && !error ? (
        <>
          <section
            className={`${s.card} ${s.summary}`}
            aria-label="오늘의 반 학습 현황"
          >
            <span>
              <small>등록 학생</small>
              <b>{students.length}명</b>
            </span>
            <span>
              <small>오늘 학습</small>
              <b>{practiced}명</b>
            </span>
            <span>
              <small>미션 완료</small>
              <b>{completed}명</b>
            </span>
          </section>
          <p className={s.muted}>
            개념별 수치는 정답·힌트·학습 간격을 반영한 기억 추정치입니다. 처음
            푸는 개념은 측정 전으로 표시합니다.
          </p>
          {students.length === 0 ? (
            <p className={s.card}>
              등록된 학생이 없습니다. 반 관리에서 학생을 추가해 주세요.
            </p>
          ) : (
            <div className={s.roster}>
              {students.map((student) => (
                <section
                  className={s.card}
                  key={student.id}
                  aria-label={`${student.name} 학습 현황`}
                >
                  <div className={s.studentHeading}>
                    <h2>{student.name}</h2>
                    <span className={s.badge}>
                      {student.hasAccount ? "학생 계정 있음" : "계정 발급 필요"}
                    </span>
                  </div>
                  <p>
                    {student.today ? (
                      <>
                        <strong>
                          {student.today.completedAt
                            ? "오늘 미션 완료"
                            : `오늘 ${student.today.answered}/${student.today.total}문제`}
                        </strong>{" "}
                        · 정답 {student.today.correct}문제
                      </>
                    ) : (
                      "오늘 학습 기록 없음"
                    )}
                  </p>
                  <SrsMemoryGrid memories={student.memories} />
                  <p className={s.muted}>
                    {student.currentProgress ? (
                      <>
                        {student.currentProgress.source === "individual"
                          ? "개인 진도"
                          : "반 진도"}{" "}
                        · <strong>{student.currentProgress.section}</strong>
                        <br />
                        {formatDayWithWeekday(
                          student.currentProgress.recordedAt,
                        )}{" "}
                        기록
                      </>
                    ) : (
                      "진도 기록 없음"
                    )}
                  </p>
                  <p className={s.muted}>
                    {student.lastPracticedAt
                      ? `마지막 학습 ${formatInstantDay(student.lastPracticedAt)}`
                      : "아직 복습을 시작하지 않았습니다."}
                  </p>
                  {!student.hasAccount ? (
                    <p className={s.muted}>
                      반 관리에서 학생을 선택해 계정을 발급하면 학습을 시작할 수
                      있습니다.
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </>
      ) : null}
    </main>
  );
}
