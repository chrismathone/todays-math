"use client";

import { useState } from "react";

import { AppChrome } from "@/components/chrome/AppChrome";
import { GradeSheet } from "@/components/test/GradeSheet";

/**
 * `/dev/grading-hifi` 의 몸 — 채점 입력 화면을 **제품 컴포넌트 그대로** 띄운다.
 *
 * `/api/tests/{id}/grade` 만 가로채 픽스처로 답한다. 가로채기는 **첫 렌더 안에서** 건다 —
 * 자식 effect 가 부모 effect 보다 먼저 돌아 첫 요청이 새어 나간다
 * (`/dev/plan-screen-hifi` · `/dev/learn-hifi` 와 같은 까닭).
 *
 * 🔴 **저장도 가로챈다** — 이 화면에서 「채점 결과 저장」을 눌러도 **DB 에 닿지 않는다.**
 *    응답은 보낸 본문으로 만든다(서버 규칙을 흉내 내지 않는다 — 그 규칙은 시험이 잰다).
 */
export type GradingHifiSet = "fresh" | "partial" | "marked";

/** 공유 DB 의 **실제 최대 시험지**와 같은 크기 — 학생 7 × 문항 8 = 56칸 (19 §5′ 실측). */
const TEST_ID = "90000000-0000-4000-8000-0000000000aa";
const STUDENTS = [
  "김도윤",
  "이서준",
  "박하은",
  "최지우",
  "정민재",
  "한소율",
  "윤지후",
].map((name, i) => ({
  studentId: `30000000-0000-4000-8000-0000000000${String(i + 10).padStart(2, "0")}`,
  name,
}));
const PROBLEMS = Array.from({ length: 8 }, (_, i) => ({
  problemId: `50000000-0000-4000-8000-0000000004${String(i + 10).padStart(2, "0")}`,
  no: i + 1,
  sequence: i + 1,
  problemCode: `M2-1${String(101 + i)}-${"ABCDEFGH"[i]}K3Q`,
  difficulty: (
    ["연산", "기본", "기본", "응용", "기본", "응용", "심화하", "응용"] as const
  )[i]!,
}));

const NOW = "2026-09-17T10:20:00.000Z";

function mark(wrong: number[], absent = false) {
  return {
    testResultId: "a0000000-0000-4000-8000-000000000001",
    takenAt: NOW,
    gradingMode: "marks" as const,
    absent,
    score: absent
      ? null
      : ((PROBLEMS.length - wrong.length) / PROBLEMS.length) * 100,
    wrongProblemIds: wrong.map((n) => PROBLEMS[n - 1]!.problemId),
    correctCount: absent ? 0 : PROBLEMS.length - wrong.length,
  };
}

/**
 * 세 벌 — 화면이 답해야 하는 물음이 저마다 다르다.
 *
 * · `fresh`   56칸이 전부 «아직 안 봄» — 점선이 한 화면에서 어떻게 보이나
 * · `partial` 셋 채점 · 하나 결시 · 셋 미채점 — 세 상태가 **한 화면에 같이** 서고 저장이 잠긴다
 * · `marked`  전원 결정 — 저장이 열리고, 오답 ✕ 와 맞음 ○ 가 섞인 가장 빽빽한 모양
 */
function studentsOf(set: GradingHifiSet) {
  if (set === "fresh") return STUDENTS.map((s) => ({ ...s, latest: null }));
  if (set === "partial")
    return STUDENTS.map((s, i) => ({
      ...s,
      latest:
        i === 0
          ? mark([2, 5])
          : i === 1
            ? mark([])
            : i === 2
              ? mark([1, 3, 4, 7, 8])
              : i === 3
                ? mark([], true)
                : null,
    }));
  return STUDENTS.map((s, i) => ({
    ...s,
    latest: i === 3 ? mark([], true) : mark([(i % 8) + 1, ((i + 3) % 8) + 1]),
  }));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

declare global {
  interface Window {
    __gradingHifiFetch?: typeof fetch;
  }
}

function installFixtureFetch(set: GradingHifiSet) {
  const original = window.__gradingHifiFetch ?? window.fetch.bind(window);
  window.__gradingHifiFetch = original;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input.url,
      window.location.origin,
    );
    const method = init?.method ?? "GET";
    // 크롬의 계정 구역(`AccountBadge`)이 부르는 자리 — 로그인 없이도 **머리말 무게가 같아야**
    // 폭 계측이 실제 화면과 같은 것을 잰다(`/dev/chrome-check` 머리말과 같은 까닭).
    if (url.pathname === "/api/auth/session")
      return json({ user: { email: "director@todaysmath.test" } });
    if (url.pathname !== `/api/tests/${TEST_ID}/grade`)
      return original(input, init);

    if (method === "GET")
      return json({
        data: {
          testId: TEST_ID,
          className: "중2 목동 심화 A반",
          studentName: null,
          testType: "review",
          testDate: "2026-09-17",
          status: "printed",
          problems: PROBLEMS,
          students: studentsOf(set),
        },
      });

    const body = JSON.parse(String(init?.body ?? "{}")) as {
      entries: {
        studentId: string;
        absent: boolean;
        wrongProblemIds: string[];
      }[];
    };
    const scores = body.entries.map((e) => {
      const name =
        STUDENTS.find((s) => s.studentId === e.studentId)?.name ??
        "(이름 없음)";
      const correctCount = e.absent
        ? 0
        : PROBLEMS.length - e.wrongProblemIds.length;
      return {
        studentId: e.studentId,
        name,
        absent: e.absent,
        correctCount,
        problemCount: PROBLEMS.length,
        score: e.absent ? null : (correctCount / PROBLEMS.length) * 100,
      };
    });
    return json(
      {
        data: {
          testId: TEST_ID,
          scores,
          gradedCount: scores.filter((s) => !s.absent).length,
          absentCount: scores.filter((s) => s.absent).length,
        },
      },
      201,
    );
  };
}

export function GradingHifiClient({ set }: { set: GradingHifiSet }) {
  useState(() => {
    if (typeof window !== "undefined") installFixtureFetch(set);
    return true;
  });

  return (
    <AppChrome>
      <GradeSheet testId={TEST_ID} />
    </AppChrome>
  );
}
