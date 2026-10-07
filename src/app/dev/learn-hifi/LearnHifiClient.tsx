"use client";

/**
 * 개발용 시안 페이지의 몸 — 학생 화면 네 장과 원장님 발급 칸을 **제품 컴포넌트 그대로** 띄운다.
 * `/api/learn/**` · `/api/students/{id}/account/**` 만 가로채 픽스처로 답한다(DB 를 안 읽는다 · 안 쓴다).
 *
 * 가로채기는 **첫 렌더 안에서** 건다 — 자식의 effect 가 부모의 effect 보다 먼저 돌기 때문에, effect 에서 걸면
 * 첫 요청이 진짜 서버로 새어 나간다(`/dev/concept-hifi` 와 같은 까닭).
 */
import { useState } from "react";

import s from "@/components/learn/learn.module.css";
import { LectureList } from "@/components/learn/LectureList";
import {
  PlayerFactoryContext,
  type CreatePlayer,
} from "@/components/learn/playerAdapter";
import { StudentLoginForm } from "@/components/learn/StudentLoginForm";
import { StudentAppShell } from "@/components/learn/StudentAppShell";
import {
  studentLearningMenusRequestSchema,
  type StudentOptionalMenu,
} from "@/contracts/studentLearningMenus.contract";
import { StudentPasswordForm } from "@/components/learn/StudentPasswordForm";
import { WatchScreen } from "@/components/learn/WatchScreen";
import { StudentList } from "@/components/class/StudentList";
import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";
import type { StudentAccountStatus } from "@/contracts/studentAccount.contract";
import { STUDENT_LOGIN_MESSAGES } from "@/contracts/studentAccount.contract";

import {
  LEARN_HIFI_LECTURE_IDS,
  learnHifiDetail,
  learnHifiList,
  type LearnHifiSet,
} from "./fixture";

export interface LearnHifiOptions {
  screen: "login" | "password" | "list" | "watch" | "issue";
  set: LearnHifiSet;
  /** 학원 날짜(YYYY-MM-DD) */
  today: string;
  /** 시안 이름표(l1…l7) 또는 강의 id */
  lecture: string;
  /** 가짜 재생기의 처음 자리(초) — 없으면 이어 보기 자리 */
  at: number | null;
  state: "before" | "issued" | "disabled" | "withdrawn" | "locked";
}

declare global {
  interface Window {
    __learnHifiFetch?: typeof fetch;
  }
}

const uid = (head: string, n: number) =>
  `${head}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HIFI_CLASS: ClassEntity = {
  id: uid("5b000000", 1),
  name: "중1 A반",
  grade: "중1",
  defaultProblemCount: 8,
  difficultyRatio: { easy: 3, mid: 4, hard: 1 },
  createdAt: "2026-03-02T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
} as unknown as ClassEntity;
const HIFI_STUDENTS: StudentEntity[] = [
  "김도윤",
  "이서연",
  "박지호",
  "최하은",
  "정우진",
].map((name, i) => ({
  id: uid("5a000000", i + 1),
  classId: HIFI_CLASS.id,
  name,
  useIndividualProgress: false,
  createdAt: "2026-03-02T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function hifiStatus(
  studentId: string,
  over: Partial<StudentAccountStatus> = {},
): StudentAccountStatus {
  return {
    studentId,
    loginId: "m1a-01",
    issuedAt: "2026-09-15T01:00:00.000Z",
    issuedByViewer: true,
    lastLoginAt: null,
    passwordChangedAt: null,
    disabledAt: null,
    mustChangePassword: true,
    locked: false,
    lockedUntil: null,
    ...over,
  };
}

/** 발급 칸의 서버 상태(`?state=`) — 처음 GET 이 돌려줄 계정 */
function initialAccount(
  studentId: string,
  state: LearnHifiOptions["state"],
): StudentAccountStatus | null {
  switch (state) {
    case "issued":
      return hifiStatus(studentId);
    case "disabled":
      return hifiStatus(studentId, { disabledAt: "2026-09-15T02:00:00.000Z" });
    case "locked":
      // 연속 5회 틀려 잠긴 학생 — 끝은 지금부터 7분 30초 뒤(«잠김 — 8분 뒤 풀림»)
      return hifiStatus(studentId, {
        mustChangePassword: false,
        lastLoginAt: "2026-09-14T09:10:00.000Z",
        passwordChangedAt: "2026-09-14T09:11:00.000Z",
        locked: true,
        lockedUntil: new Date(Date.now() + 7.5 * 60_000).toISOString(),
      });
    default:
      return null;
  }
}

function installFixtureFetch(options: LearnHifiOptions) {
  const original = window.__learnHifiFetch ?? window.fetch.bind(window);
  window.__learnHifiFetch = original;
  const accounts = new Map<string, StudentAccountStatus | null>();
  const menus = new Map<string, StudentOptionalMenu[]>();
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input.url,
      window.location.origin,
    );
    const method = init?.method ?? "GET";
    const path = url.pathname;
    const body = () => (init?.body ? JSON.parse(String(init.body)) : {});

    const studentMenus = /^\/api\/students\/([^/]+)\/learning-menus$/.exec(
      path,
    );
    if (studentMenus) {
      const studentId = studentMenus[1]!;
      if (method === "PUT") {
        const parsed = studentLearningMenusRequestSchema.safeParse(body());
        if (!parsed.success)
          return json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "메뉴를 확인하세요.",
              },
            },
            400,
          );
        menus.set(studentId, parsed.data.enabled);
      }
      if (method === "GET" || method === "PUT")
        return json({
          data: {
            enabled: menus.get(studentId) ?? [],
            canManage: true,
            updatedAt: null,
          },
        });
      return json(
        { error: { code: "FORBIDDEN", message: "지원하지 않는 요청입니다." } },
        403,
      );
    }

    if (path === "/api/learn/lectures" && method === "GET")
      return json({ data: learnHifiList(options.set) });
    const one = /^\/api\/learn\/lectures\/([^/]+)$/.exec(path);
    if (one && method === "GET") {
      const data = learnHifiDetail(decodeURIComponent(one[1]!), options.set);
      return data
        ? json({ data })
        : json(
            {
              error: {
                code: "NOT_FOUND",
                message: "강의을(를) 찾을 수 없습니다.",
              },
            },
            404,
          );
    }
    if (path === "/api/learn/watch" && method === "POST") {
      const report = body() as { lectureId: string; seconds: number };
      const lecture = learnHifiList(options.set).lectures.find(
        (l) => l.id === report.lectureId,
      );
      const seconds = Math.round(report.seconds);
      const percent = lecture
        ? Math.min(100, Math.round((seconds / lecture.seconds) * 100))
        : 0;
      return json({
        data: {
          watch: { maxSeconds: seconds, percent, completed: percent >= 95 },
        },
      });
    }
    if (path === "/api/learn/login" && method === "POST")
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: STUDENT_LOGIN_MESSAGES.invalid,
          },
        },
        401,
      );
    if (path === "/api/learn/password" && method === "POST")
      return json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: STUDENT_LOGIN_MESSAGES.wrongCurrentPin,
          },
        },
        401,
      );
    if (path === "/api/learn/logout" && method === "POST")
      return json({ data: { redirectTo: "/learn/login" } });

    const account = /^\/api\/students\/([^/]+)\/account(\/password)?$/.exec(
      path,
    );
    if (account) {
      const studentId = account[1]!;
      if (!accounts.has(studentId))
        accounts.set(studentId, initialAccount(studentId, options.state));
      const current = accounts.get(studentId) ?? null;
      if (method === "GET")
        return json({
          data: { withdrawn: options.state === "withdrawn", account: current },
        });
      if (method === "POST" && !account[2]) {
        const loginId = String((body() as { loginId?: string }).loginId ?? "")
          .trim()
          .toLowerCase();
        accounts.set(studentId, hifiStatus(studentId, { loginId }));
        return json(
          {
            data: {
              studentId,
              loginId,
              initialPassword: "7392",
              mustChangePassword: true,
              issuedAt: "2026-09-15T01:00:00.000Z",
            },
          },
          201,
        );
      }
      if (method === "POST" && current)
        return json({
          data: {
            studentId,
            loginId: current.loginId,
            initialPassword: "4816",
            mustChangePassword: true,
            issuedAt: current.issuedAt,
          },
        });
      if (method === "PATCH" && current) {
        const { disabled } = body() as { disabled: boolean };
        const next = {
          ...current,
          disabledAt: disabled ? "2026-09-15T02:00:00.000Z" : null,
        };
        accounts.set(studentId, next);
        return json({ data: next });
      }
      return json({ error: { code: "NOT_FOUND", message: "없음" } }, 404);
    }
    return original(input, init);
  };
}

/** 가짜 재생기 — 판서 판 위에서 시간만 흐른다(유튜브를 부르지 않는다) */
function hifiPlayer(at: number | null): CreatePlayer {
  return async ({ start, onEvent }) => {
    let time = at ?? start;
    let rate = 1;
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    return {
      play() {
        if (timer !== undefined) return;
        timer = window.setInterval(() => {
          time += 0.25 * rate;
        }, 250);
        onEvent("playing");
      },
      pause() {
        if (timer === undefined) return;
        stop();
        onEvent("paused");
      },
      seekTo(seconds) {
        time = seconds;
      },
      currentTime: () => time,
      duration: () => 0,
      setRate(next) {
        rate = next;
      },
      destroy: stop,
    };
  };
}

export function LearnHifiClient({ options }: { options: LearnHifiOptions }) {
  useState(() => {
    if (typeof window !== "undefined") installFixtureFetch(options);
    return true;
  });
  const [player] = useState(() => hifiPlayer(options.at));

  if (options.screen === "issue")
    return (
      <main className="min-h-dvh bg-[#f4f6fa] px-4 py-6">
        <div className="mx-auto max-w-[360px] rounded-[14px] border border-[#d4dce8] bg-white p-6">
          <StudentList
            canManageAccounts
            students={HIFI_STUDENTS}
            selectedClass={HIFI_CLASS}
            status="ready"
            onRetry={() => {}}
          />
        </div>
      </main>
    );

  const lectureId =
    LEARN_HIFI_LECTURE_IDS[
      options.lecture as keyof typeof LEARN_HIFI_LECTURE_IDS
    ] ?? options.lecture;
  // 학원 날짜의 정오(KST) — «오늘» 표시가 이 날로 선다
  const now = new Date(`${options.today}T03:00:00.000Z`);
  return (
    <div className={s.page}>
      <PlayerFactoryContext.Provider value={player}>
        {options.screen === "login" ? <StudentLoginForm /> : null}
        {options.screen === "password" ? (
          <StudentPasswordForm
            studentName={learnHifiList(options.set).student.name}
          />
        ) : null}
        {options.screen === "list" || options.screen === "watch" ? (
          <StudentAppShell
            student={learnHifiList(options.set).student}
            enabled={["lectures"]}
            preview
            previewPath={
              options.screen === "watch"
                ? `/learn/watch/${lectureId}`
                : "/learn/lectures"
            }
          >
            {options.screen === "list" ? (
              <LectureList now={now} />
            ) : (
              <WatchScreen lectureId={lectureId} />
            )}
          </StudentAppShell>
        ) : null}
      </PlayerFactoryContext.Provider>
    </div>
  );
}
