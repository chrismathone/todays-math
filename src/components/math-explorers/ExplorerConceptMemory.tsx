"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  FadingCatalog,
  FadingState,
} from "@/contracts/fadingApi.contract";
import type {
  FadingDailyActivity,
  FadingDailyPlan,
} from "@/contracts/fadingDaily.contract";
import {
  FadingSourceError,
  type FadingConceptDetail,
  type FadingSource,
} from "@/lib/fading/source";
import { createApiFadingSource } from "@/components/fading/apiSource";
import { createApiFadingRelearnSource } from "@/components/fading/apiRelearnSource";
import type { FadingRelearnSource } from "@/lib/fading/relearnSource";
import {
  useFadingRelearn,
  type FadingRelearnController,
} from "@/components/fading/useFadingRelearn";
import {
  FadingRelearnModal,
  FadingRelearnStatus,
} from "@/components/fading/FadingRelearnCheck";
import { curriculumName, dueLabel } from "@/components/fading/labels";
import { ExplorerMath } from "./ExplorerMath";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";
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

export type ExplorerMemoryHomeOptions = {
  dailyExplorerAllowed?: boolean;
  dailyExplorerNote?: string;
};
const bucketNames = {
  review: "복습",
  prerequisite: "선수 개념 확인",
  progress: "새 진도",
} as const;
const evidenceNames = {
  unassessed: "아직 확인 전",
  weak: "다시 확인할 부분",
  stale: "복습할 때가 지남",
  recent: "최근 기록 있음",
  unknown: "확인할 근거 없음",
} as const;

function DailyPlanCards({
  plan,
  busy,
  preview,
  onStart,
  startId,
}: {
  plan: FadingDailyPlan;
  busy: boolean;
  preview: boolean;
  onStart: (activity: FadingDailyActivity) => void;
  startId: string;
}) {
  const next = plan.activities.find((activity) => activity.key === plan.next);
  return (
    <section className={s.daily} aria-label="오늘의 자동 학습 계획">
      <h3>오늘의 학습</h3>
      <p className={s.note}>
        기본 분량 {plan.counts.done} / {plan.quota.total}개 · 오늘 배정{" "}
        {plan.counts.total}개
      </p>
      <dl className={s.dailyCounts}>
        <div>
          <dt>개념 묶음</dt>
          <dd>
            {plan.units.recall.done} / {plan.units.recall.planned}묶음
          </dd>
        </div>
        <div>
          <dt>떠올릴 문장</dt>
          <dd>
            {plan.units.prompt.done} / {plan.units.prompt.planned}문장
          </dd>
        </div>
        <div>
          <dt>문제 풀이</dt>
          <dd>
            {plan.units.question.done} / {plan.units.question.planned}문제
          </dd>
        </div>
        <div>
          <dt>탐험 카드</dt>
          <dd>
            {plan.units.task.done} / {plan.units.task.planned}활동
          </dd>
        </div>
      </dl>
      {plan.held.recalls > 0 ? (
        <p className={s.note}>
          분량 밖에 복습할 개념 {plan.held.recalls}묶음 · {plan.held.prompts}
          문장이 남아 있어요.
        </p>
      ) : null}
      {plan.quota.over > 0 ? (
        <p className={s.note}>
          진행 중인 학습을 포함해 기본 분량보다 {plan.quota.over}개 많아요.
        </p>
      ) : null}
      {next ? (
        <div className={s.nextCard}>
          <p className={s.eyebrow}>{bucketNames[next.bucket]}</p>
          <strong>
            <ExplorerMath
              text={
                next.kind === "recall"
                  ? next.terms.join(" · ")
                  : next.source.title
              }
            />
          </strong>
          <p className={s.note}>{next.reason.text}</p>
          <button
            id={startId}
            type="button"
            className={s.primary}
            disabled={
              busy ||
              (preview && next.kind === "practice") ||
              next.start === "none"
            }
            onClick={() => onStart(next)}
          >
            {plan.status === "todo" ? "오늘 학습 시작" : "다음 활동"}
          </button>
        </div>
      ) : (
        <p className={s.result}>
          {plan.status === "done"
            ? "오늘 배정된 학습을 마쳤어요."
            : plan.status === "short"
              ? "지금 할 수 있는 학습을 마쳤어요."
              : "지금 배정된 학습이 없어요."}
        </p>
      )}
      <details className={s.prerequisites}>
        <summary>오늘 학습 순서</summary>
        <ol className={s.planCards}>
          {plan.activities.map((activity) => (
            <li
              key={activity.key}
              className={s.planCard}
              data-activity-state={activity.state}
            >
              <div>
                <span className={s.eyebrow}>
                  {bucketNames[activity.bucket]} ·{" "}
                  {activity.state === "done"
                    ? "완료"
                    : activity.state === "active"
                      ? "진행 중"
                      : activity.state === "blocked"
                        ? "확인 필요"
                        : "할 차례"}
                </span>
                <strong>
                  <ExplorerMath
                    text={
                      activity.kind === "recall"
                        ? activity.terms.join(" · ")
                        : activity.source.title
                    }
                  />
                </strong>
                <p className={s.note}>{activity.reason.text}</p>
              </div>
              <span className={s.activityCount}>
                {activity.done} /{" "}
                {activity.kind === "recall" ? activity.prompts : activity.count}
                {activity.unit === "recall"
                  ? "문장"
                  : activity.unit === "question"
                    ? "문제"
                    : "활동"}
              </span>
            </li>
          ))}
        </ol>
      </details>
      {plan.shortfall.map((short, index) => (
        <p className={s.note} key={`${short.bucket}-${index}`}>
          {bucketNames[short.bucket]}: {short.reason}
        </p>
      ))}
      {plan.prerequisite ? (
        <details className={s.prerequisites}>
          <summary>선수 개념 살펴보기</summary>
          <p className={s.note}>
            목표: <ExplorerMath text={plan.prerequisite.target.title} />
          </p>
          {plan.prerequisite.coverage.status === "unknown" ? (
            <p className={s.note}>
              이 단원에 확인된 선수 개념 연결이 아직 없어요.
            </p>
          ) : plan.prerequisite.coverage.status === "partial" ? (
            <p className={s.note}>일부 선수 개념의 연결만 확인돼 있어요.</p>
          ) : null}
          <ul className={s.concepts}>
            {plan.prerequisite.links.map((link, index) => (
              <li key={`${link.via}-${index}`} className={s.prerequisite}>
                <strong>
                  <ExplorerMath text={link.prerequisite.title} />
                </strong>
                {link.reason ? <p className={s.note}>{link.reason}</p> : null}
                <p className={s.note}>
                  개념 기억: {evidenceNames[link.evidence.fading.status]} · 탐험
                  카드: {evidenceNames[link.evidence.card.status]} · 문제 풀이:{" "}
                  {evidenceNames[link.evidence.course.status]}
                </p>
                {link.mapping === "unmapped" ? (
                  <p className={s.note}>
                    바로 시작할 개념 자료는 아직 연결되지 않았어요.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** Concept memory lives in the explorer home; its results never call an explorer action. */
export default function ExplorerConceptMemory({
  source: suppliedSource,
  relearnSource: suppliedRelearnSource,
  relearnController,
  studentId,
  preview = false,
  busy: explorerBusy = false,
  onSessionChange,
  onAccessFailure,
  onExit,
  onExplorerActivity,
  renderHome,
}: {
  source?: FadingSource;
  relearnSource?: FadingRelearnSource;
  relearnController?: FadingRelearnController;
  studentId?: string;
  preview?: boolean;
  busy?: boolean;
  onSessionChange?: (active: boolean) => void;
  onAccessFailure?: (error: FadingSourceError) => void;
  onExit?: () => void;
  onExplorerActivity?: (
    activity: Extract<FadingDailyActivity, { kind: "practice" }>,
  ) => void | Promise<void>;
  renderHome: (
    memory: ReactNode,
    options?: ExplorerMemoryHomeOptions,
  ) => ReactNode;
}) {
  // Preview callers must provide a local source. They never silently use the student API.
  const apiSource = useMemo(
    () => createApiFadingSource({ studentId }),
    [studentId],
  );
  const apiRelearn = useMemo(
    () =>
      !preview && !suppliedSource
        ? createApiFadingRelearnSource({ studentId })
        : undefined,
    [preview, suppliedSource, studentId],
  );
  const ownRelearn = useFadingRelearn(
    relearnController ? undefined : (suppliedRelearnSource ?? apiRelearn),
    onAccessFailure,
  );
  const relearn = relearnController ?? ownRelearn;
  const baseSource = suppliedSource ?? (preview ? null : apiSource);
  const wrapRelearn = relearn.wrap;
  const source = useMemo(
    () => (baseSource ? wrapRelearn(baseSource) : null),
    [baseSource, wrapRelearn],
  );
  const dailySource = source;
  const [dailyPlan, setDailyPlan] = useState<FadingDailyPlan | null>(null);
  const [dailyFailure, setDailyFailure] = useState<string | null>(null);
  const [dailyBusy, setDailyBusy] = useState(false);
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
      if (dailySource?.dailyPlan)
        void dailySource.dailyPlan().then(
          (next) => {
            if (current) setDailyPlan(next);
          },
          (error: unknown) => {
            if (current) {
              setDailyFailure(failureText(error));
              if (error instanceof FadingSourceError)
                accessFailure.current?.(error);
            }
          },
        );
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
  }, [source, dailySource]);

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
      document.getElementById(`${prefix}-daily-start`) ??
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
        if (
          error.code === "CONFLICT" &&
          error.message !== STUDENT_CHANGED_MESSAGE
        ) {
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
    void refreshDailyPlan();
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

  async function refreshDailyPlan() {
    if (!dailySource?.dailyPlan) return;
    setDailyBusy(true);
    try {
      const next = await dailySource.dailyPlan();
      if (alive.current) {
        setDailyPlan(next);
        setDailyFailure(null);
      }
    } catch (error) {
      if (alive.current) {
        setDailyFailure(failureText(error));
        if (error instanceof FadingSourceError) accessFailure.current?.(error);
      }
    } finally {
      if (alive.current) setDailyBusy(false);
    }
  }

  function startDaily(activity: FadingDailyActivity) {
    if (disabled || dailyBusy || dailyFailure || activity.start === "none")
      return;
    rememberOpener(`${prefix}-daily-start`);
    if (activity.kind === "practice") {
      if (!preview)
        void run(async () => {
          await onExplorerActivity?.(activity);
        });
    } else if (activity.start === "continue") {
      void run(async () => showSession(await source!.state()));
    } else open(activity.conceptId);
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
          {!practice ? (
            <FadingRelearnStatus controller={relearn} allowStart={false} />
          ) : null}
          <FadingSessionView
            key={sessionKey}
            source={source}
            state={sessionState}
            practice={practice}
            paused={!!relearn.active}
            onEvidence={(observation) => void relearn.record(observation)}
            onBoundary={relearn.boundary}
            onState={(next) => {
              setState(next);
              if (next.receipt) void refreshDailyPlan();
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
          {!practice &&
          state &&
          !state.session &&
          dailyPlan?.next &&
          !dailyBusy &&
          !dailyFailure ? (
            <div className={s.nextActivity}>
              <button
                type="button"
                className={s.nextButton}
                disabled={disabled}
                onClick={() => {
                  const next = dailyPlan.activities.find(
                    (activity) => activity.key === dailyPlan.next,
                  );
                  if (next) startDaily(next);
                }}
              >
                다음 활동으로 이어가기
              </button>
            </div>
          ) : null}
          {relearnController ? null : (
            <FadingRelearnModal controller={relearn} />
          )}
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
      <FadingRelearnStatus controller={relearn} />
      {relearnController ? null : <FadingRelearnModal controller={relearn} />}
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
                  if (catalogOpen)
                    setCatalog(await source!.catalog(catalog?.grade));
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
          {dailySource?.dailyPlan ? (
            dailyFailure ? (
              <div role="alert" className={s.failure}>
                <p>{dailyFailure}</p>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void refreshDailyPlan()}
                >
                  오늘 계획 다시 불러오기
                </button>
              </div>
            ) : dailyPlan ? (
              <DailyPlanCards
                plan={dailyPlan}
                busy={disabled || dailyBusy}
                preview={preview}
                onStart={startDaily}
                startId={`${prefix}-daily-start`}
              />
            ) : (
              <p role="status" className={s.note}>
                오늘 학습을 준비하고 있어요…
              </p>
            )
          ) : null}
          <div className={s.summary} aria-label="개념 복습 현황">
            <span>
              오늘 복습{" "}
              <strong>
                {state.summary.plan.done} / {state.summary.plan.total}묶음
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
            {canResume || (nextId && !dailySource?.dailyPlan) ? (
              <button
                id={startId}
                type="button"
                className={dailySource?.dailyPlan ? undefined : s.primary}
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
                {dailySource?.dailyPlan
                  ? "복습과 새 학습은 오늘 계획에서 이어 가요."
                  : state.summary.nextReview
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
    dailySource?.dailyPlan
      ? {
          dailyExplorerAllowed:
            !dailyFailure &&
            !!dailyPlan?.activities.some(
              (activity) =>
                activity.kind === "practice" &&
                activity.start !== "none" &&
                activity.state !== "blocked",
            ),
          dailyExplorerNote: dailyFailure
            ? "오늘 계획을 다시 불러온 뒤 탐험을 시작할 수 있어요."
            : !dailyPlan
              ? "오늘 학습 분량을 확인하고 있어요."
              : (dailyPlan.activities.find(
                  (activity) =>
                    activity.kind === "practice" &&
                    activity.state === "blocked",
                )?.reason.text ??
                "오늘 계획의 차례에 따라 개념 학습과 탐험을 이어 가요."),
        }
      : undefined,
  );
}
