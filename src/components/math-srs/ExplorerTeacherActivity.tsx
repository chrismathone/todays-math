"use client";

import { useEffect, useState } from "react";
import type { ExplorerTeacherStudent } from "@/contracts/mathExplorersTeacher.contract";
import { getExplorerTeacherDetail } from "./courseApi";
import s from "./course-dashboard.module.css";

const routes = { unit: "개념 탐험", memory: "기억 복습", repair: "다시 연습" };

/** The official explorer projection stays separate from course attempts and their accuracy. */
export default function ExplorerTeacherActivity({
  studentId,
  classId,
  branchId,
  refreshKey = 0,
}: {
  studentId: string;
  classId: string;
  branchId?: string;
  refreshKey?: number;
}) {
  const [result, setResult] = useState<{
    key: string;
    data?: ExplorerTeacherStudent;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([studentId, classId, branchId, refreshKey, retry]);
  useEffect(() => {
    let current = true;
    void getExplorerTeacherDetail(studentId, classId, branchId).then(
      (response) => {
        if (!current) return;
        if (!response.ok) setResult({ key, error: response.message });
        else if (response.data.student.id !== studentId)
          setResult({
            key,
            error: "학생 기록이 일치하지 않습니다. 다시 불러와 주세요.",
          });
        else setResult({ key, data: response.data });
      },
    );
    return () => {
      current = false;
    };
  }, [studentId, classId, branchId, key]);
  const visible = result?.key === key ? result : null;
  const detail = visible?.data?.detail;
  const error = visible?.error;
  return (
    <section aria-label="탐험 활동 기록">
      <h3>탐험 활동 기록</h3>
      <p className={s.muted}>
        개념 카드 탐험의 최근 완료 기록입니다. 코스 문제 풀이와 별도로 표시하며,
        첫 시도 해결 수에는 재도전을 더하지 않습니다.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className={s.button}
            onClick={() => setRetry((value) => value + 1)}
          >
            탐험 기록 다시 불러오기
          </button>
        </div>
      ) : !detail ? (
        <p role="status">탐험 활동을 불러오는 중…</p>
      ) : (
        <>
          {detail.openSession ? (
            <p className={s.muted}>
              진행 중 · {detail.openSession.unitTitle} ·{" "}
              {routes[detail.openSession.route]}
              {" · "}해결 {detail.openSession.solved} /{" "}
              {detail.openSession.total}
              {" · "}
              {detail.openSession.startedOn} 시작
            </p>
          ) : null}
          {detail.recentSessions.length ? (
            <div
              className={s.tableScroll}
              tabIndex={0}
              role="region"
              aria-label="탐험 완료 기록 표"
            >
              <table className={s.reportTable}>
                <thead>
                  <tr>
                    <th scope="col">날짜 (한국 시간)</th>
                    <th scope="col">활동</th>
                    <th scope="col">단원</th>
                    <th scope="col">첫 시도 해결</th>
                    <th scope="col">남은 활동</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recentSessions.map((session, index) => (
                    <tr key={`${session.date}:${session.unitId}:${index}`}>
                      <th scope="row">{session.date}</th>
                      <td>{routes[session.route]}</td>
                      <td>
                        {session.unitTitle}
                        {session.targetCardName
                          ? ` · ${session.targetCardName}`
                          : ""}
                      </td>
                      <td>
                        {session.first} / {session.total}
                      </td>
                      <td>{session.unresolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={s.emptyReport}>
              아직 완료한 개념 카드 탐험 기록이 없습니다.
            </p>
          )}
          {detail.lastCompletedDate ? (
            <p className={s.muted}>
              최근 탐험 완료일 · {detail.lastCompletedDate} (문제 탐험 포함)
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
