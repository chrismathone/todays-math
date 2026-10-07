"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type {
  FadingCatalog,
  FadingState,
} from "@/contracts/fadingApi.contract";
import {
  FadingSourceError,
  type FadingConceptDetail,
  type FadingSource,
} from "@/lib/fading/source";
import { createApiFadingSource } from "@/components/fading/apiSource";
import { curriculumName, dueLabel } from "@/components/fading/labels";
import { ExplorerMath } from "./ExplorerMath";
import f from "@/components/fading/fading.module.css";
import s from "./explorer-concept-memory.module.css";

const FadingSessionView = dynamic(() =>
  import("@/components/fading/FadingSessionView").then(
    (module) => module.FadingSessionView,
  ),
);

const failureText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "개념 학습을 불러오지 못했어요. 다시 시도해 주세요.";

/** Concept memory lives in the explorer home; its results never call an explorer action. */
export default function ExplorerConceptMemory({
  source: suppliedSource,
  preview = false,
  busy: explorerBusy = false,
  onSessionChange,
  onAccessFailure,
  onExit,
  renderHome,
}: {
  source?: FadingSource;
  preview?: boolean;
  busy?: boolean;
  onSessionChange?: (active: boolean) => void;
  onAccessFailure?: (error: FadingSourceError) => void;
  onExit?: () => void;
  renderHome: (memory: ReactNode) => ReactNode;
}) {
  // Preview callers must provide a local source. They never silently use the student API.
  const [apiSource] = useState(() => createApiFadingSource());
  const source = suppliedSource ?? (preview ? null : apiSource);
  const [state, setState] = useState<FadingState | null>(null);
  const [sessionState, setSessionState] = useState<FadingState | null>(null);
  const [inSession, setInSession] = useState(false);
  const [practice, setPractice] = useState<FadingConceptDetail>();
  const [sessionKey, setSessionKey] = useState(0);
  const [catalog, setCatalog] = useState<FadingCatalog | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const returnFocus = useRef<string | null>(null);
  const focusPending = useRef(false);
  const prefix = useId();
  const headingId = `${prefix}-heading`;
  const catalogId = `${prefix}-catalog`;
  const startId = `${prefix}-start`;
  const accessFailure = useRef(onAccessFailure);
  useEffect(() => {
    accessFailure.current = onAccessFailure;
  }, [onAccessFailure]);

  useEffect(() => {
    alive.current = true;
    let current = true;
    if (source) {
      void source.state().then(
        (next) => {
          if (!current) return;
          setState(next);
          setLoading(false);
        },
        (error: unknown) => {
          if (!current) return;
          setFailure(failureText(error));
          setLoading(false);
          if (error instanceof FadingSourceError)
            accessFailure.current?.(error);
        },
      );
    }
    return () => {
      current = false;
      alive.current = false;
    };
  }, [source]);

  useEffect(() => {
    onSessionChange?.(inSession);
    return () => onSessionChange?.(false);
  }, [inSession, onSessionChange]);

  useEffect(() => {
    if (inSession || busy || explorerBusy || !focusPending.current) return;
    focusPending.current = false;
    const opener = document.getElementById(returnFocus.current ?? startId);
    const fallback =
      document.getElementById(startId) ??
      document.getElementById(`${prefix}-choose`);
    const target =
      opener instanceof HTMLButtonElement && opener.disabled
        ? fallback
        : (opener ?? fallback);
    target?.focus({ preventScroll: true });
  }, [inSession, startId, prefix, busy, explorerBusy]);

  async function run(work: () => Promise<void>) {
    if (!source || lock.current || explorerBusy) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await work();
    } catch (error) {
      if (!alive.current) return;
      setFailure(failureText(error));
      if (error instanceof FadingSourceError) {
        accessFailure.current?.(error);
        if (error.code === "CONFLICT") {
          try {
            const next = await source.state();
            if (!alive.current) return;
            setState(next);
            setSessionState(next);
            setSessionKey((key) => key + 1);
            if (!next.session) setInSession(false);
          } catch {
            // The visible reload control retries the read; failed actions are not replayed.
          }
        }
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }

  function rememberOpener(id: string) {
    returnFocus.current = id;
  }

  function showSession(next: FadingState, rehearsal?: FadingConceptDetail) {
    if (!alive.current) return;
    setState(next);
    setSessionState(next);
    setPractice(rehearsal);
    setSessionKey((key) => key + 1);
    setInSession(true);
  }

  function open(conceptId: string, pick = false) {
    void run(async () => {
      if (pick) {
        const picked = await source!.act({ action: "pick", conceptId });
        if (!alive.current) return;
        setState(picked);
      }
      const next = await source!.act({ action: "open", conceptId });
      showSession(next);
    });
  }

  function exitSession() {
    focusPending.current = true;
    setInSession(false);
    setPractice(undefined);
    if (!practice) onExit?.();
    if (catalogOpen) {
      void run(async () => {
        const next = await source!.catalog(catalog?.grade);
        if (alive.current) setCatalog(next);
      });
    }
  }

  function readCatalog(grade?: string) {
    void run(async () => {
      const next = await source!.catalog(grade);
      if (alive.current) setCatalog(next);
    });
  }

  const disabled = busy || explorerBusy;
  const nextId = state?.summary.queue.due[0] ?? state?.summary.queue.unrated[0];
  const canResume = !!state?.session && !!state.opened;

  if (inSession && source && sessionState && (practice || sessionState.opened))
    return (
      <div className={f.viewport} data-explorer-concept-session="true">
        <div className={`${f.root} ${s.session}`}>
          {preview ? <p className={s.note}>미리 보기 · 저장되지 않음</p> : null}
          {failure ? (
            <p role="status" className={s.note}>
              {failure}
            </p>
          ) : null}
          <FadingSessionView
            key={sessionKey}
            source={source}
            state={sessionState}
            practice={practice}
            onState={(next) => {
              setState(next);
              // The completed screen still needs the content of the just-closed session.
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
              setSessionKey((key) => key + 1);
              if (!next.session) exitSession();
            }}
            onExit={exitSession}
          />
        </div>
      </div>
    );

  return renderHome(
    <section
      className={s.panel}
      aria-labelledby={headingId}
      aria-busy={loading && !!source}
    >
      <header className={s.header}>
        <div>
          <p className={s.eyebrow}>오늘의 기억</p>
          <h2 id={headingId}>개념을 떠올려 볼까요?</h2>
        </div>
        {state ? (
          <span className={s.streak}>
            {state.summary.streak.current}일 연속
          </span>
        ) : null}
      </header>
      <p className={s.note}>먼저 떠올려 보고, 빈칸에 직접 답을 써 보세요.</p>
      {preview ? <p className={s.note}>미리 보기 · 저장되지 않음</p> : null}
      {!source ? (
        <p role="status" className={s.note}>
          미리 보기용 개념 자료를 준비해 주세요.
        </p>
      ) : loading ? (
        <p role="status" className={s.note}>
          개념 학습을 불러오는 중이에요…
        </p>
      ) : null}
      {failure ? (
        <div className={s.failure} role="alert">
          <p>{failure}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              void run(async () => {
                const next = await source!.state();
                if (alive.current) {
                  setState(next);
                  setLoading(false);
                }
              })
            }
          >
            개념 자료 다시 불러오기
          </button>
        </div>
      ) : null}
      {state ? (
        <>
          <div className={s.summary} aria-label="개념 복습 현황">
            <span>
              오늘 복습{" "}
              <strong>
                {state.summary.plan.done} / {state.summary.plan.total}
              </strong>
            </span>
            <span>
              배운 개념 <strong>{state.summary.learned}</strong>
            </span>
          </div>
          {state.receipt ? (
            <p role="status" className={s.result}>
              복습 기록을 저장했어요. 다음 복습은 {state.receipt.dueOn}이에요.
            </p>
          ) : null}
          <div className={s.actions}>
            {canResume || nextId ? (
              <button
                id={startId}
                type="button"
                className={s.primary}
                disabled={disabled}
                onClick={() => {
                  rememberOpener(startId);
                  if (canResume) showSession(state);
                  else if (nextId) open(nextId);
                }}
              >
                {busy
                  ? "준비하고 있어요…"
                  : canResume
                    ? "개념 풀이 이어하기"
                    : "오늘 개념 복습 시작"}
              </button>
            ) : (
              <p className={s.note}>
                {state.summary.nextReview
                  ? `다음 개념 복습은 ${state.summary.nextReview.dueOn}이에요.`
                  : "오늘 복습할 개념이 없어요. 배울 개념을 골라 보세요."}
              </p>
            )}
            <button
              id={`${prefix}-choose`}
              type="button"
              aria-expanded={catalogOpen}
              aria-controls={catalogId}
              disabled={disabled}
              onClick={() => {
                setCatalogOpen(!catalogOpen);
                if (!catalogOpen) readCatalog(catalog?.grade);
              }}
            >
              {catalogOpen ? "개념 목록 접기" : "배울 개념 고르기"}
            </button>
          </div>
          {catalogOpen ? (
            <div id={catalogId} className={s.catalog}>
              {catalog ? (
                <>
                  <div className={s.filters}>
                    <label>
                      개념 학년
                      <select
                        value={catalog.grade}
                        disabled={disabled}
                        onChange={(event) => readCatalog(event.target.value)}
                      >
                        {catalog.grades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      개념 검색
                      <input
                        type="search"
                        value={query}
                        placeholder="단원이나 개념 이름"
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </label>
                  </div>
                  {catalog.sections.length === 0 ? (
                    <p className={s.note}>
                      이 학년에는 아직 개념 자료가 없어요.
                    </p>
                  ) : null}
                  {catalog.sections.map((section) => {
                    const needle = query.trim().toLocaleLowerCase();
                    const concepts = section.concepts.filter((concept) =>
                      `${section.chapter} ${section.unit} ${concept.terms.join(" ")}`
                        .toLocaleLowerCase()
                        .includes(needle),
                    );
                    if (!concepts.length) return null;
                    return (
                      <section key={section.key} className={s.unit}>
                        <h3>
                          <ExplorerMath text={curriculumName(section.unit)} />
                        </h3>
                        <p className={s.note}>
                          <ExplorerMath
                            text={curriculumName(section.chapter)}
                          />
                        </p>
                        <ul className={s.concepts}>
                          {concepts.map((concept) => {
                            const rehearsal =
                              concept.status?.rated &&
                              (concept.status.daysUntil ?? 0) > 0;
                            const buttonId = `${prefix}-concept-${concept.id}`;
                            return (
                              <li key={concept.id} className={s.concept}>
                                <div>
                                  <strong>
                                    <ExplorerMath
                                      text={concept.terms.join(" · ")}
                                    />
                                  </strong>
                                  <p className={s.note}>
                                    {concept.level} · {concept.ordinal}/
                                    {concept.siblings} ·{" "}
                                    {concept.status
                                      ? dueLabel(concept.status.daysUntil)
                                      : "아직 고르지 않은 개념"}
                                  </p>
                                </div>
                                <button
                                  id={buttonId}
                                  type="button"
                                  disabled={disabled || canResume}
                                  aria-label={`${concept.terms.join(" · ")} ${rehearsal ? "연습하기" : concept.status ? "복습하기" : "선택하고 시작"}`}
                                  onClick={() => {
                                    rememberOpener(buttonId);
                                    if (rehearsal)
                                      void run(async () => {
                                        const detail = await source!.concept(
                                          concept.id,
                                        );
                                        showSession(state, detail);
                                      });
                                    else open(concept.id, !concept.status);
                                  }}
                                >
                                  {rehearsal
                                    ? "연습하기"
                                    : concept.status
                                      ? "복습하기"
                                      : "선택하고 시작"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                  {canResume ? (
                    <p className={s.note}>
                      진행 중인 개념 풀이를 마친 뒤 새 개념을 시작할 수 있어요.
                    </p>
                  ) : null}
                </>
              ) : (
                <p role="status" className={s.note}>
                  {busy
                    ? "개념 목록을 불러오는 중이에요…"
                    : "개념 자료 다시 불러오기로 연결을 확인해 주세요."}
                </p>
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </section>,
  );
}
