"use client";

import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

import { useEffect, useId, useState } from "react";
import WorkProgress from "./WorkProgress";
import s from "./TeachingOverview.module.css";

type ClassSummary = {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  currentUnit: { chapter: string; section: string } | null;
};
type Overview = {
  user: { id: string; name: string };
  classCount: number;
  studentCount: number;
  classes: ClassSummary[];
};
type Access =
  | { status: "loading" | "anonymous" | "error" }
  | { status: "ready"; data: Overview };

const FOCUS_REFRESH_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isClassSummary(value: unknown): value is ClassSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.grade === "string" &&
    isCount(value.studentCount) &&
    (value.currentUnit === null ||
      (isRecord(value.currentUnit) &&
        typeof value.currentUnit.chapter === "string" &&
        typeof value.currentUnit.section === "string"))
  );
}

function readOverview(body: unknown): Overview {
  const data = isRecord(body) ? body.data : null;
  if (
    !isRecord(data) ||
    !isRecord(data.user) ||
    typeof data.user.id !== "string" ||
    !data.user.id ||
    typeof data.user.name !== "string" ||
    !isCount(data.classCount) ||
    !isCount(data.studentCount) ||
    !Array.isArray(data.classes) ||
    data.classes.length > 3 ||
    !data.classes.every(isClassSummary)
  ) {
    throw new Error("Invalid teaching overview");
  }
  return {
    user: { id: data.user.id, name: data.user.name },
    classCount: data.classCount,
    studentCount: data.studentCount,
    classes: data.classes,
  };
}

export default function TeachingOverview({ onOpen }: { onOpen: () => void }) {
  const headingId = useId();
  const [access, setAccess] = useState<Access>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    let lastStarted = -Infinity;
    let controller: AbortController | undefined;
    let timeout: number | undefined;

    async function load() {
      if (disposed || pending) return;
      pending = true;
      lastStarted = Date.now();
      controller = new AbortController();
      timeout = window.setTimeout(() => controller?.abort(), 15_000);
      try {
        // This small endpoint resolves the session before reading any class data.
        const response = await fetch(getStudioEndpoints().overview, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (disposed) return;
        if (response.status === 401) {
          setAccess({ status: "anonymous" });
          return;
        }
        if (!response.ok) throw new Error("Teaching overview unavailable");
        const data = readOverview(await response.json());
        if (!disposed) setAccess({ status: "ready", data });
      } catch {
        // Clear previously shown private data when a session refresh cannot be verified.
        if (!disposed) setAccess({ status: "error" });
      } finally {
        window.clearTimeout(timeout);
        pending = false;
      }
    }

    // Let a discarded Strict Mode effect clean up before starting a network request.
    void Promise.resolve().then(load);
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastStarted >= FOCUS_REFRESH_MS
      ) {
        void load();
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(timeout);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [attempt]);

  function retry() {
    setAccess({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  const statusLabel =
    access.status === "ready"
      ? "내 수업"
      : access.status === "anonymous"
        ? "로그인 필요"
        : access.status === "error"
          ? "연결 확인"
          : "확인 중";

  return (
    <section className={s.card} aria-labelledby={headingId}>
      <header className={s.header}>
        <h2 id={headingId}>수업 현황</h2>
        <span className={s.status}>{statusLabel}</span>
      </header>

      {access.status === "loading" ? (
        <WorkProgress label="로그인 정보를 확인하고 있어요." />
      ) : access.status === "anonymous" ? (
        <>
          <div className={s.invitation}>
            <span className={s.invitationIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" />
              </svg>
            </span>
            <h3>우리 반 수업을 한눈에</h3>
            <p>
              로그인하면 반별 학생 수와 수업 진도를 이곳에서 바로 확인할 수
              있어요.
            </p>
          </div>
          <button type="button" className={s.primaryButton} onClick={onOpen}>
            로그인하고 내 수업 보기 <Arrow />
          </button>
        </>
      ) : access.status === "error" ? (
        <div className={s.error}>
          <p role="alert">
            수업 현황을 불러오지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.
          </p>
          <button type="button" className={s.secondaryButton} onClick={retry}>
            다시 불러오기
          </button>
        </div>
      ) : access.status === "ready" ? (
        <>
          <p className={s.owner}>
            {access.data.user.name
              ? `${access.data.user.name}님의`
              : "선생님의"}{" "}
            수업 공간
          </p>
          <dl className={s.totals}>
            <div>
              <dt>내 반</dt>
              <dd>
                {access.data.classCount.toLocaleString("ko-KR")}
                <span>개</span>
              </dd>
            </div>
            <div>
              <dt>등록 학생</dt>
              <dd>
                {access.data.studentCount.toLocaleString("ko-KR")}
                <span>명</span>
              </dd>
            </div>
          </dl>
          {access.data.classCount === 0 ? (
            <div className={s.empty}>
              <h3>첫 반을 만들어 보세요</h3>
              <p>반과 학생을 등록하면 수업 진도를 함께 관리할 수 있어요.</p>
            </div>
          ) : (
            <div className={s.classes}>
              <p className={s.listLabel}>최근 등록한 반</p>
              <ul className={s.classList}>
                {access.data.classes.map((item) => (
                  <li key={item.id} className={s.classRow}>
                    <span className={s.avatar} aria-hidden="true">
                      {Array.from(item.name.trim()).slice(0, 2).join("") ||
                        "반"}
                    </span>
                    <div className={s.classInfo}>
                      <div className={s.classHeading}>
                        <strong title={`${item.name} · ${item.grade}`}>
                          {item.name}
                        </strong>
                        <span>
                          {item.studentCount.toLocaleString("ko-KR")}명
                        </span>
                      </div>
                      <p
                        className={s.progress}
                        title={
                          item.currentUnit
                            ? `${item.currentUnit.chapter} · ${item.currentUnit.section}`
                            : undefined
                        }
                      >
                        {item.currentUnit
                          ? `반 진도 · ${item.currentUnit.section || item.currentUnit.chapter}`
                          : "진도 기록 전"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className={s.primaryButton} onClick={onOpen}>
            {access.data.classCount === 0 ? "첫 반 만들기" : "수업 관리 열기"}{" "}
            <Arrow />
          </button>
        </>
      ) : null}
    </section>
  );
}

function Arrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
