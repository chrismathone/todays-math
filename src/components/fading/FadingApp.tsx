"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  FadingCatalog,
  FadingState,
} from "@/contracts/fadingApi.contract";
import { FadingMath as ExplorerMath } from "./FadingMath";
import {
  FadingSourceError,
  type FadingConceptDetail,
  type FadingSource,
} from "@/lib/fading/source";
import { FadingHome } from "./FadingHome";
import { FadingEraseScreen } from "./FadingEraseScreen";
import { FadingStats } from "./FadingStats";
import { FadingCatalogScreen } from "./FadingCatalogScreen";
import { FadingSessionScreen } from "./FadingSessionScreen";
import { FadingScrollFade } from "./FadingScrollFade";
import { FadingIcon } from "./FadingIcon";
import { curriculumName, dueLabel } from "./labels";
import s from "./fading.module.css";

export type FadingTab = "home" | "erase" | "catalog" | "stats";
const tabs = [
  { id: "home", name: "오늘의 복습", short: "복습", icon: "home" },
  { id: "erase", name: "개념 소거", short: "소거", icon: "erase" },
  { id: "catalog", name: "개념 목록", short: "목록", icon: "list" },
  { id: "stats", name: "학습 통계", short: "통계", icon: "stats" },
] as const;

export function FadingApp({
  source,
  initialState,
  initialTab = "home",
  initialSession = false,
  preview = false,
  initialFailure,
}: {
  source: FadingSource;
  initialState?: FadingState;
  initialTab?: FadingTab;
  initialSession?: boolean;
  preview?: boolean;
  initialFailure?: string;
}) {
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
          if (live)
            setFailure(
              error instanceof Error
                ? error.message
                : "불러오지 못했습니다. 다시 시도하세요.",
            );
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
        if (live)
          setFailure(
            error instanceof Error
              ? error.message
              : "불러오지 못했습니다. 다시 시도하세요.",
          );
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
      if (error instanceof FadingSourceError && error.code === "CONFLICT") {
        try {
          setState(await source.state());
          setSessionKey((k) => k + 1);
          pending.current = null;
        } catch {
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
                  aria-label={item.name}
                  aria-current={tab === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <FadingIcon name={item.icon} />
                  <span className={s.desktopLabel}>{item.name}</span>
                  <span className={s.phoneLabel}>{item.short}</span>
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
              <FadingSessionScreen
                key={sessionKey}
                source={source}
                state={sessionState ?? state}
                practice={practising}
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
                <div className={s.stack}>
                  <div className={s.row}>
                    <h1 className={s.heading}>개념 읽기</h1>
                    <button className={s.quiet} onClick={() => setDetail(null)}>
                      목록으로
                    </button>
                  </div>
                  <section className={`${s.card} ${s.stack}`}>
                    <p className={s.small}>
                      {detail.content.concept.section
                        .split("::")
                        .map(curriculumName)
                        .join(" · ")}{" "}
                      · {detail.content.concept.level}
                    </p>
                    <h2 className={s.subheading}>
                      <ExplorerMath
                        text={detail.content.concept.propositions
                          .map((p) => p.term)
                          .join(" · ")}
                      />
                    </h2>
                    {detail.status && (
                      <p className={s.pill}>
                        {detail.status.step}단계 ·{" "}
                        {dueLabel(detail.status.daysUntil)}
                      </p>
                    )}
                    <div className={s.propositions}>
                      {detail.content.concept.propositions.map((p, i) => (
                        <article className={s.proposition} key={p.id}>
                          <h3 className={s.propositionHeading}>
                            명제 {i + 1} · <ExplorerMath text={p.term} />
                          </h3>
                          <div>
                            <ExplorerMath
                              text={p.pieces
                                .map((piece) =>
                                  piece.kind === "text"
                                    ? piece.text
                                    : piece.target.text,
                                )
                                .join("")}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                    {detail.status?.rated &&
                    (detail.status.daysUntil ?? 0) > 0 ? (
                      <>
                        <p className={s.muted}>
                          복습일 전에는 연습할 수 있어요. 평가와 일정은 바뀌지
                          않습니다.
                        </p>
                        <button
                          className={s.primary}
                          onClick={() => {
                            setPractising(detail);
                            setInSession(true);
                            setSessionKey((k) => k + 1);
                          }}
                        >
                          연습하기
                        </button>
                      </>
                    ) : (
                      <button
                        className={s.primary}
                        disabled={busy}
                        onClick={() =>
                          detail.status
                            ? open(detail.content.concept.id)
                            : pickAndOpen()
                        }
                      >
                        {detail.status ? "풀이 시작" : "고르고 첫 풀이"}
                      </button>
                    )}
                    {detail.status &&
                      !detail.status.rated &&
                      (!state.session ||
                        state.session.conceptId !==
                          detail.content.concept.id) && (
                        <button
                          className={s.quiet}
                          disabled={busy}
                          onClick={() =>
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
                        >
                          선택에서 빼기
                        </button>
                      )}
                  </section>
                </div>
              ) : tab === "home" ? (
                <FadingHome
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
              ) : tab === "catalog" ? (
                catalog ? (
                  <FadingCatalogScreen
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
                  state={state}
                  onCatalog={() => navigate("catalog")}
                />
              ) : (
                <FadingEraseScreen
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
      </div>
    </div>
  );
}
