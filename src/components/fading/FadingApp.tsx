"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  FadingCatalog,
  FadingState,
} from "@/contracts/fadingApi.contract";
import {
  FadingSourceError,
  type FadingConceptDetail,
  type FadingSource,
} from "@/lib/fading/source";
import { FadingHome } from "./FadingHome";
import { FadingEraseScreen } from "./FadingEraseScreen";
import { FadingStats } from "./FadingStats";
import { FadingCatalogScreen } from "./FadingCatalogScreen";
import { FadingSessionView } from "./FadingSessionView";
import { FadingScrollFade } from "./FadingScrollFade";
import { FadingIcon } from "./FadingIcon";
import { FadingConceptReader } from "./FadingConceptReader";
import { FadingRelearnModal, FadingRelearnStatus } from "./FadingRelearnCheck";
import type { FadingRelearnController } from "./useFadingRelearn";
import s from "./fading.module.css";

export type FadingTab = "home" | "erase" | "catalog" | "stats";
const tabs = [
  { id: "home", name: "오늘의 복습", short: "복습", icon: "home" },
  { id: "erase", name: "개념 소거", short: "소거", icon: "erase" },
  { id: "catalog", name: "개념 목록", short: "목록", icon: "list" },
  { id: "stats", name: "학습 통계", short: "통계", icon: "stats" },
] as const;

/**
 * The student app shell. With a `relearn` controller (D5) the session screen pauses under a minute check, reports mid-step
 * evidence, opens ready checks only at a sentence boundary, and the home shows the queue with «추가 확인 시작».
 * Every read or action failure that is a `FadingSourceError` reaches `onAccessFailure`; when the owner sets
 * `studentChanged` (another student signed in on this device — D1) the app shows one closing notice and nothing else:
 * no session, no modal, no retry, and late replies of earlier requests change nothing visible.
 */
export function FadingApp({
  source: baseSource,
  initialState,
  initialTab = "home",
  initialSession = false,
  preview = false,
  student = false,
  initialFailure,
  relearn,
  onAccessFailure,
  studentChanged = false,
}: {
  source: FadingSource;
  initialState?: FadingState;
  initialTab?: FadingTab;
  initialSession?: boolean;
  preview?: boolean;
  student?: boolean;
  initialFailure?: string;
  relearn?: FadingRelearnController;
  onAccessFailure?: (error: FadingSourceError) => void;
  studentChanged?: boolean;
}) {
  const wrapRelearn = relearn?.wrap;
  const source = useMemo(
    () => (wrapRelearn ? wrapRelearn(baseSource) : baseSource),
    [baseSource, wrapRelearn],
  );
  const access = useRef(onAccessFailure);
  useEffect(() => {
    access.current = onAccessFailure;
  }, [onAccessFailure]);
  const report = (error: unknown) => {
    if (error instanceof FadingSourceError) access.current?.(error);
  };
  const [state, setState] = useState<FadingState | null>(initialState ?? null);
  const [tab, setTab] = useState<FadingTab>(initialTab);
  const [catalog, setCatalog] = useState<FadingCatalog | null>(null);
  const [detail, setDetail] = useState<FadingConceptDetail | null>(null);
  const [practising, setPractising] = useState<
    FadingConceptDetail | undefined
  >();
  const [inSession, setInSession] = useState(initialSession);
  const [sessionState, setSessionState] = useState<FadingState | null>(
    initialState ?? null,
  );
  const [sessionKey, setSessionKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(initialFailure ?? null);
  const [switcher, setSwitcher] = useState(false);
  const pending = useRef<(() => Promise<void>) | null>(null);
  const lock = useRef(false);
  const header = useRef<HTMLDivElement>(null);
  const appBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    if (!initialState)
      void source
        .state()
        .then((next) => {
          if (live) setState(next);
        })
        .catch((error) => {
          if (!live) return;
          setFailure(
            error instanceof Error
              ? error.message
              : "불러오지 못했습니다. 다시 시도하세요.",
          );
          report(error);
        });
    return () => {
      live = false;
    };
  }, [source, initialState]);
  useEffect(() => {
    if (tab !== "catalog") return;
    let live = true;
    void source
      .catalog()
      .then((next) => {
        if (live) setCatalog(next);
      })
      .catch((error) => {
        if (!live) return;
        setFailure(
          error instanceof Error
            ? error.message
            : "불러오지 못했습니다. 다시 시도하세요.",
        );
        report(error);
      });
    return () => {
      live = false;
    };
  }, [source, tab]);

  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    pending.current = work;
    try {
      await work();
      pending.current = null;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "처리하지 못했습니다. 다시 시도하세요.";
      setFailure(message);
      report(error);
      if (
        error instanceof FadingSourceError &&
        error.code === "STUDENT_CHANGED"
      )
        pending.current = null; // 다른 학생의 기기다 — 이 화면의 행동은 다시 보내지 않는다.
      else if (
        error instanceof FadingSourceError &&
        error.code === "CONFLICT"
      ) {
        try {
          setState(await source.state());
          setSessionKey((k) => k + 1);
          pending.current = null;
        } catch (readError) {
          report(readError);
          /* 다시 읽기 단추로 이어 간다. */
        }
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function navigate(next: FadingTab) {
    setTab(next);
    setDetail(null);
    setFailure(null);
    setSwitcher(false);
  }
  function open(id: string) {
    void run(async () => {
      const next = await source.act({ action: "open", conceptId: id });
      setState(next);
      setSessionState(next);
      setDetail(null);
      setPractising(undefined);
      setSessionKey((k) => k + 1);
      setInSession(true);
    });
  }
  function pickAndOpen() {
    if (!detail) return;
    void run(async () => {
      await source.act({
        action: "pick",
        conceptId: detail.content.concept.id,
      });
      const next = await source.act({
        action: "open",
        conceptId: detail.content.concept.id,
      });
      setState(next);
      setSessionState(next);
      setDetail(null);
      setPractising(undefined);
      setSessionKey((k) => k + 1);
      setInSession(true);
    });
  }
  if (studentChanged)
    return (
      <div className={s.viewport} data-fading-viewport="true">
        <div
          className={`${s.root} ${s.scrollRoot}`}
          data-fading-root="true"
          data-student-changed="true"
        >
          <main className={s.shell}>
            <div className={`${s.card} ${s.stack}`} role="alert">
              <h1 className={s.subheading}>
                다른 학생으로 로그인되어 있습니다
              </h1>
              <p className={s.muted}>
                이 화면의 학습은 더 보내지 않습니다. 새로고침하면 지금 로그인한
                학생의 화면이 열립니다.
              </p>
              <button
                type="button"
                className={s.primary}
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  return (
    <div className={s.viewport} data-fading-viewport="true">
      <div
        className={`${s.root} ${s.scrollRoot}`}
        data-fading-root="true"
        data-preview={preview}
        data-session={inSession}
      >
        {!inSession && (
          <>
            <header className={s.top} ref={header}>
              <div className={s.brand}>
                <span className={s.brandMark}>
                  <FadingIcon name="erase" />
                </span>
                오늘의 기억
              </div>
              <span className={s.headerStreak}>
                {state?.summary.streak.current ?? 0}일 연속
              </span>
              <div className={s.switch}>
                <button
                  className={s.quiet}
                  aria-expanded={switcher}
                  aria-controls="fading-switch"
                  onClick={() => setSwitcher((v) => !v)}
                >
                  학습 전환
                </button>
                {switcher && (
                  <nav
                    id="fading-switch"
                    className={s.switchMenu}
                    aria-label="학습 전환"
                  >
                    <Link prefetch={false} href="/learn/lectures">
                      개념 강의
                    </Link>
                    <Link prefetch={false} href="/learn/english-listening">
                      영어듣기
                    </Link>
                    <button
                      className={`${s.quiet} ${s.full}`}
                      onClick={() => setSwitcher(false)}
                    >
                      닫기
                    </button>
                  </nav>
                )}
              </div>
            </header>
            {preview && <p className={s.notice}>미리 보기 · 저장되지 않음</p>}
            <nav className={s.tabs} aria-label="오늘의 기억 메뉴">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  className={s.tab}
                  aria-label={
                    student && item.id === "erase" ? "빈칸 연습" : item.name
                  }
                  aria-current={tab === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <FadingIcon name={item.icon} />
                  <span className={s.desktopLabel}>
                    {student && item.id === "erase" ? "빈칸 연습" : item.name}
                  </span>
                  <span className={s.phoneLabel}>
                    {student && item.id === "erase" ? "빈칸" : item.short}
                  </span>
                </button>
              ))}
            </nav>
          </>
        )}
        <div
          className={`${s.appBody} ${s.scrollBody}`}
          ref={appBody}
          tabIndex={0}
          role="region"
          aria-label="오늘의 기억 학습 내용"
          data-fading-scroll-body="true"
        >
          {failure && (
            <div className={s.shell} style={{ paddingBottom: 0 }}>
              <div className={s.alert} role="alert">
                <span>{failure}</span>
                <button
                  className={s.danger}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      pending.current ??
                        (async () => {
                          setState(await source.state());
                          if (tab === "catalog")
                            setCatalog(await source.catalog(catalog?.grade));
                        }),
                    )
                  }
                >
                  {busy ? "불러오는 중…" : "다시 읽기"}
                </button>
              </div>
            </div>
          )}
          {!state ? (
            <main className={s.shell}>
              <div className={`${s.card} ${s.empty}`} aria-busy={!failure}>
                <h1 className={s.subheading}>
                  {failure
                    ? "자료를 불러오지 못했어요"
                    : "오늘의 기억을 불러오는 중…"}
                </h1>
              </div>
            </main>
          ) : inSession &&
            (practising || (sessionState?.session && sessionState.opened)) ? (
            <main>
              {relearn && !practising ? (
                <FadingRelearnStatus
                  student={student}
                  controller={relearn}
                  allowStart={false}
                />
              ) : null}
              <FadingSessionView
                student={student}
                key={sessionKey}
                source={source}
                state={sessionState ?? state}
                practice={practising}
                paused={!!relearn?.active}
                onEvidence={
                  relearn
                    ? (observation) => void relearn.record(observation)
                    : undefined
                }
                onBoundary={relearn?.boundary}
                onAccessFailure={onAccessFailure}
                onState={(next) => {
                  setState(next);
                  setSessionState((previous) =>
                    next.session
                      ? next
                      : {
                          ...next,
                          session: previous?.session ?? null,
                          opened: previous?.opened ?? null,
                        },
                  );
                }}
                onReconcile={(next, message) => {
                  setState(next);
                  setSessionState(next);
                  setFailure(message);
                  setSessionKey((k) => k + 1);
                  if (!next.session) setInSession(false);
                }}
                onExit={() => {
                  setInSession(false);
                  setPractising(undefined);
                  setTab("home");
                  setDetail(null);
                }}
              />
            </main>
          ) : (
            <main className={s.shell}>
              {detail ? (
                <FadingConceptReader
                  student={student}
                  key={detail.content.concept.id}
                  detail={detail}
                  busy={busy}
                  canDrop={
                    !!detail.status &&
                    !detail.status.rated &&
                    (!state.session ||
                      state.session.conceptId !== detail.content.concept.id)
                  }
                  onBack={() => setDetail(null)}
                  onStart={() =>
                    detail.status
                      ? open(detail.content.concept.id)
                      : pickAndOpen()
                  }
                  onPractice={() => {
                    setPractising(detail);
                    setInSession(true);
                    setSessionKey((k) => k + 1);
                  }}
                  onDrop={() =>
                    void run(async () => {
                      setState(
                        await source.act({
                          action: "drop",
                          conceptId: detail.content.concept.id,
                        }),
                      );
                      setDetail(null);
                      setCatalog(await source.catalog(catalog?.grade));
                    })
                  }
                />
              ) : tab === "home" ? (
                <>
                  {relearn ? (
                    <FadingRelearnStatus
                      student={student}
                      controller={relearn}
                    />
                  ) : null}
                  <FadingHome
                    student={student}
                    source={source}
                    state={state}
                    busy={busy}
                    onCatalog={() => navigate("catalog")}
                    onOpen={open}
                    onMode={(on) =>
                      void run(async () => {
                        setState(await source.act({ action: "all-today", on }));
                      })
                    }
                  />
                </>
              ) : tab === "catalog" ? (
                catalog ? (
                  <FadingCatalogScreen
                    student={student}
                    catalog={catalog}
                    busy={busy}
                    onGrade={(grade) =>
                      void run(async () =>
                        setCatalog(await source.catalog(grade)),
                      )
                    }
                    onConcept={(id) =>
                      void run(async () => setDetail(await source.concept(id)))
                    }
                  />
                ) : (
                  <p role="status">개념 목록을 불러오는 중…</p>
                )
              ) : tab === "stats" ? (
                <FadingStats
                  student={student}
                  state={state}
                  onCatalog={() => navigate("catalog")}
                />
              ) : (
                <FadingEraseScreen
                  student={student}
                  state={state}
                  source={source}
                  onCatalog={() => navigate("catalog")}
                  onOpen={open}
                />
              )}
            </main>
          )}
        </div>
        <FadingScrollFade scrollRef={appBody} />
        {relearn ? (
          <FadingRelearnModal student={student} controller={relearn} />
        ) : null}
      </div>
    </div>
  );
}
