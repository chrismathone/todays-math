"use client";

/**
 * 검수 콘솔 — 원장님이 고르신 **③안(판정을 오른쪽에)**. D-07 2단계 확정본.
 * 시안: /dev/review-hifi · 계약: src/contracts/review.contract.ts
 *
 * 🔴 **판정은 셋이다.** 문제은행의 70%가 해설이 없어 답을 검산할 수 없다.
 *    「통과 / 신고」 둘만 두면 확인 못 한 것에 통과를 누르게 되고, 그러면
 *    검수 기록 전체가 잡음이 된다. 「판단 못 하겠다」를 정식 결과로 둔다.
 *
 * 🔴 **판정 결과는 서버가 확정한다.** 화면이 「통과를 눌렀으니 승인됐겠지」라고
 *    가정하면 서버 규칙이 바뀐 날 화면만 거짓말을 한다.
 *
 * ⚠️ 「해설 생성」·「그림 다시 그리기」는 아직 라우트가 없다. 시안에는 있지만
 *    여기 안 붙였다 — **눌러도 아무 일도 안 하는 단추**는 검수자를 속인다.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { AccountBadge } from "@/components/chrome/AccountBadge";
import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import {
  SOLUTION_SOURCE_LABELS,
  SOURCE_LABELS,
  type ReviewConsoleRow,
} from "@/lib/review/consoleRow";
import { REASON_LABELS, REASON_ORDER } from "@/components/review/reasonLabels";
import { fractionViewFor } from "@/components/unified/fractionDisplay";
import { solutionForDisplay } from "@/lib/solutionSteps";
import type { ReportReason } from "@/contracts/problemReport.contract";
import type {
  ReviewQueueKey,
  ReviewVerdict,
} from "@/contracts/review.contract";

/**
 * 검수 콘솔이 받는 한 행.
 *
 * ⚠️ **모양을 여기서 따로 적지 않는다.** 서버 페이지와 더 불러오는 API 가 `toConsoleRow`
 *    하나를 쓰고, 이 타입은 그 산출물을 그대로 가리킨다. 예전에는 여기 손으로 적어 두고
 *    API 는 `serializeProblem`(다른 모양)을 썼는데, 클라이언트가 응답을 캐스팅해 받아
 *    **타입이 그 차이를 못 잡았다** — 더 불러온 문항부터 그림 치수·단원명이 조용히 사라졌다.
 */
export type ConsoleProblem = ReviewConsoleRow;

export type ConsoleQueue = {
  key: ReviewQueueKey;
  label: string;
  why: string;
  look: string;
  remaining: number;
  /** 이 대기열이 가리키는 신고 사유 — 순서는 그대로 두고 **강조만** 한다(D-102). */
  emphasize?: readonly ReportReason[];
};

const n = (v: number) => v.toLocaleString("ko-KR");

/** 이 아래로 남으면 다음 묶음을 더 가져온다. 0에서 가져오면 화면이 한 번 빈다. */
const REFILL_AT = 3;

export function ReviewConsole({
  queues,
  initialKey,
  initialRows,
  reviewedByMe,
}: {
  queues: ConsoleQueue[];
  initialKey: ReviewQueueKey;
  initialRows: ConsoleProblem[];
  reviewedByMe: number;
}) {
  const [qs, setQs] = useState(queues);
  const [key, setKey] = useState<ReviewQueueKey>(initialKey);
  const [rows, setRows] = useState<ConsoleProblem[]>(initialRows);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(reviewedByMe);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportTrigger = useRef<HTMLButtonElement>(null);

  const queue = qs.find((q) => q.key === key) ?? qs[0];
  const row = rows[0];
  // 본문·정답·해설이 문항 단위 결정 하나를 쓴다(원장님 2026-09-19 «항상 뷰는 통일이야»).
  const shownFractions = row ? fractionViewFor(row) : (text: string) => text;
  const loading = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState(false);

  useEffect(() => () => loading.current?.abort(), []);

  const load = useCallback(async (k: ReviewQueueKey, replace: boolean) => {
    if (loading.current && !replace) return;
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    setQueueLoading(true);
    setQueueError(false);
    setError(null);
    try {
      const res = await fetch(
        `/api/review/queue?key=${encodeURIComponent(k)}&limit=10`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error("대기열을 불러오지 못했습니다.");
      const body = (await res.json()) as {
        data: ConsoleProblem[];
        meta: { queue: ConsoleQueue; reviewedByMe: number };
      };
      if (controller.signal.aborted) return;
      setRows((prev) => {
        if (replace) return body.data;
        const have = new Set(prev.map((p) => p.id));
        return [...prev, ...body.data.filter((p) => !have.has(p.id))];
      });
      setQs((prev) =>
        prev.map((q) => (q.key === k ? { ...q, ...body.meta.queue } : q)),
      );
      setTotal(body.meta.reviewedByMe);
    } catch (e) {
      if (controller.signal.aborted) return;
      setQueueError(true);
      setError(
        e instanceof Error ? e.message : "대기열을 불러오지 못했습니다.",
      );
    } finally {
      if (loading.current === controller) {
        loading.current = null;
        setQueueLoading(false);
      }
    }
  }, []);

  const submit = useCallback(
    async (verdict: ReviewVerdict, why?: ReportReason, memo?: string) => {
      if (!row || submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/problems/${row.id}/review`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            verdict,
            ...(why ? { reason: why } : {}),
            ...(memo && memo.trim() ? { note: memo.trim() } : {}),
          }),
        });
        if (!res.ok) {
          const b = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(b?.error?.message ?? "판정을 저장하지 못했습니다.");
        }
        /**
         * 🔴 보충을 **효과에 걸지 않는다.** `rows.length` 를 보는 효과로 하면
         *    렌더 중에 상태를 또 바꾸는 꼴이라 ESLint(react-hooks/set-state-in-effect)
         *    가 막고, 실제로도 대기열을 바꾸는 순간 두 번 부르게 된다.
         *    「판정했으니 하나 줄었다」는 **여기서만** 참이므로 여기서 채운다.
         */
        const left = rows.length - 1;
        setRows((prev) => prev.slice(1));
        if (left <= REFILL_AT) void load(key, false);
        setDone((v) => v + 1);
        setTotal((v) => v + 1);
        setQs((prev) =>
          prev.map((q) =>
            q.key === key
              ? { ...q, remaining: Math.max(0, q.remaining - 1) }
              : q,
          ),
        );
        setReporting(false);
        setReason(null);
        setNote("");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "판정을 저장하지 못했습니다.",
        );
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [row, rows.length, key, load],
  );

  // 키보드가 주인공인 안이다(③). 글자를 치는 중에는 가로채지 않는다.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return;
      if (reporting && e.key === "Escape" && !submitting.current) {
        e.preventDefault();
        setReporting(false);
        setReason(null);
        reportTrigger.current?.focus();
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (reporting) {
        // 신고 패널이 열려 있으면 숫자는 **사유**다 — 누르는 즉시 신고하고 다음
        // (2026-08-22 원장님: 「신고를 눌렀을 때도 숫자 입력으로 빠르게」).
        const idx = Number(e.key) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < REASON_ORDER.length) {
          const r = REASON_ORDER[idx]!;
          if (r === "other")
            setReason(r); // 설명이 필수라 자동 제출하지 않는다
          else void submit("defect", r, note);
          return;
        }
        return; // 패널이 열려 있는 동안 판정 단축(1·3)은 쉰다 — 숫자가 사유이므로
      }
      if (e.key === "1") void submit("pass");
      if (e.key === "2") setReporting(true);
      if (e.key === "3") void submit("unsure");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [submit, reporting, note]);

  function pick(k: ReviewQueueKey) {
    if (submitting.current) return;
    setKey(k);
    setRows([]);
    setDone(0);
    setReporting(false);
    setReason(null);
    setNote("");
    void load(k, true);
  }

  return (
    <div className="app-chrome min-h-screen bg-bg text-ink">
      <header className="border-b border-divider bg-surface px-6 py-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-base font-semibold">문제은행 검수</h1>
          <p className="text-sm text-text-2">지금까지 {n(total)}문항을 봤다.</p>
          {/* 계정·로그아웃 (D-77). 이 화면은 `AppChrome` 을 안 쓴다 — 검수 계정은
              메인·반·문제은행에 못 들어가므로 그 nav 를 그리면 **눌러도 「권한 없음」인
              링크**가 된다(D-30). 그래서 크롬 전체가 아니라 **계정 구역만** 가져온다.
              ⚠️ 베끼지 않고 같은 컴포넌트를 쓴다 — 두 벌이 되면 한쪽만 고쳐진다. */}
          <div className="ml-auto flex items-center gap-3">
            <AccountBadge />
          </div>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <main className="mx-auto w-full max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-lg bg-side px-2 py-1 text-sm font-medium">
              {queue.label}
            </span>
            <p className="text-sm text-text-2">
              <span className="font-medium text-ink">볼 것</span> · {queue.look}
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-[var(--red-text)] bg-surface p-3 text-sm text-[var(--red-text)]"
            >
              {error}
              {queueError ? (
                <button
                  type="button"
                  disabled={queueLoading}
                  onClick={() => void load(key, rows.length === 0)}
                  className="ml-3 min-h-11 rounded-lg border border-control bg-surface px-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  대기열 다시 불러오기
                </button>
              ) : null}
            </div>
          ) : null}

          {row ? (
            <article className="mt-3 rounded-lg border border-divider bg-surface p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
                <span className="rounded border border-divider px-1.5 py-0.5 font-medium tracking-wide text-ink">
                  {row.problemCode}
                </span>
                <span>{row.unitName}</span>
                {row.questionType ? <span>{row.questionType}</span> : null}
                {row.figureUrls.length > 0 ? (
                  <span>그림 {row.figureUrls.length}장</span>
                ) : null}
                {!row.directUseAllowed ? (
                  <span className="font-medium text-[var(--red-text)]">
                    출제 제외
                  </span>
                ) : null}
              </div>

              <div className="mt-4 min-w-0 overflow-x-auto text-[15px] leading-relaxed">
                <PaperProblemView
                  content={shownFractions(row.content)}
                  figureUrls={row.figureUrls}
                  figureDims={row.figureDims}
                  figureSourceMm={row.figureSourceMm}
                />
              </div>

              <div className="mt-5 border-t border-divider pt-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm text-text-2">정답</span>
                  {/* 정답도 **본문·해설과 같은 렌더 경로**를 탄다 (MathText 머리주석의
                      「렌더 경로 분기 금지」). 날 문자열로 그리면 `$\frac{12}{13}$` 가
                      글자 그대로 새고, `④` 는 렌더러를 탄 보기와 글꼴이 갈린다
                      (원장님이 화면에서 둘 다 찾아 주셨다, 2026-08-24). */}
                  <MathText
                    text={shownFractions(row.answer)}
                    className="text-[15px] font-semibold"
                  />
                </div>
                {row.solution ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue">
                      해설 보기
                    </summary>
                    <div className="mt-2 text-[14px] leading-relaxed text-text-2">
                      <PaperProblemView
                        content={
                          solutionForDisplay(shownFractions(row.solution)) ?? ""
                        }
                      />
                    </div>
                  </details>
                ) : (
                  <p className="mt-2 text-sm text-[var(--red-text)]">
                    해설이 없다 — 이 화면만으로는 답을 검산할 수 없다.
                  </p>
                )}

                {/* 원본이 어디서 왔나 (원장님 요청 2026-08-24). 검수자가 이상한 문항을
                    만났을 때 **원본을 열어 대 보려면** 경로가 화면에 있어야 한다.
                    경로는 길어서 줄바꿈을 허용하고, 글자는 본문보다 물러나 둔다. */}
                <dl
                  aria-label="원본 정보"
                  className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-divider pt-3 text-[12px] text-text-3"
                >
                  <dt className="font-semibold">출처</dt>
                  <dd className="min-w-0">
                    {SOURCE_LABELS[row.source] ?? row.source}
                    {row.school ? ` · ${row.school}` : ""}
                    {row.subject ? ` · ${row.subject}` : ""}
                    {row.questionNumber !== null
                      ? ` · ${row.questionNumber}번`
                      : ""}
                  </dd>

                  <dt className="font-semibold">해설</dt>
                  <dd className="min-w-0">
                    {SOLUTION_SOURCE_LABELS[row.solutionSource] ??
                      row.solutionSource}
                  </dd>

                  {row.sourceFile ? (
                    <>
                      <dt className="font-semibold">원본 파일</dt>
                      <dd className="min-w-0 break-all font-mono text-[11.5px]">
                        {row.sourceFile}
                      </dd>
                    </>
                  ) : null}

                  <dt className="font-semibold">문항 코드</dt>
                  <dd className="min-w-0 font-mono text-[11.5px]">
                    {row.problemCode}
                    {row.examId ? ` · ${row.examId}` : ""}
                  </dd>
                </dl>
              </div>
            </article>
          ) : (
            <p
              role="status"
              className="mt-6 rounded-lg border border-divider bg-surface p-6 text-sm text-text-2"
            >
              {queueLoading
                ? "대기열을 불러오고 있습니다."
                : queueError
                  ? "목록을 다시 불러오거나 다른 대기열을 선택해 주세요."
                  : "이 대기열의 검수를 마쳤습니다. 다른 대기열을 선택해 주세요."}
            </p>
          )}
        </main>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={!row || busy}
              onClick={() => void submit("pass")}
              className="min-h-11 cursor-pointer rounded-lg border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              문제 없다 <kbd className="ml-1 font-normal opacity-70">1</kbd>
            </button>
            <button
              type="button"
              disabled={!row || busy}
              aria-pressed={reporting}
              ref={reportTrigger}
              onClick={() => setReporting((v) => !v)}
              className={
                "min-h-11 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
                (reporting
                  ? "border-[var(--red-text)] bg-[var(--red-text)] text-white"
                  : "border-control bg-surface hover:bg-side")
              }
            >
              신고 <kbd className="ml-1 font-normal opacity-70">2</kbd>
            </button>
            <button
              type="button"
              disabled={!row || busy}
              onClick={() => void submit("unsure")}
              className="min-h-11 cursor-pointer rounded-lg border border-control bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-side disabled:cursor-not-allowed disabled:opacity-40"
            >
              판단 못 하겠다{" "}
              <kbd className="ml-1 font-normal opacity-70">3</kbd>
            </button>
          </div>

          {reporting ? (
            <div className="relative mt-3 rounded-lg border border-[var(--red-text)]/40 bg-surface p-3">
              <button
                type="button"
                disabled={busy}
                aria-label="신고 창 닫기"
                className="absolute top-1 right-2 min-h-11 rounded-lg px-3 text-sm text-text-2 hover:bg-side disabled:opacity-50"
                onClick={() => {
                  setReporting(false);
                  setReason(null);
                  reportTrigger.current?.focus();
                }}
              >
                닫기
              </button>
              <p className="text-sm font-semibold text-[var(--red-text)]">
                무엇이 이상한가
              </p>
              <p className="mt-0.5 text-[12px] text-text-2">
                숫자 키·탭 즉시 신고 · Esc 닫기
              </p>
              {/* 1행 1라벨 — 누르는 즉시 신고하고 다음 (모바일은 이 탭 하나로 끝).
                  「그 밖의 것」만 설명이 필수라 골라 두고 아래에 적는다. */}
              <div className="mt-2 flex flex-col gap-1.5">
                {/* ⚠️ **순서는 `REASON_ORDER` 하나로 고정**이다 — 대기열마다 재배치하면
                    「숫자 키 즉시 신고」의 뜻이 같이 바뀌어, 손에 익은 채로 다른 대기열에
                    가면 엉뚱한 사유가 들어간다(에러 없이 조용히 틀린다). 대기열은 **강조만**
                    바꾼다 (D-102, 원장님 「가」안 확정 2026-08-24). */}
                {REASON_ORDER.map((r, i) => {
                  const hot = queue.emphasize?.includes(r) ?? false;
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={busy}
                      aria-pressed={reason === r}
                      data-emphasis={hot ? "true" : undefined}
                      onClick={() => {
                        if (r === "other") setReason(r);
                        else void submit("defect", r, note);
                      }}
                      className={
                        "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
                        (reason === r
                          ? "border-ink bg-ink text-white"
                          : hot
                            ? "border-ink border-2 bg-surface font-bold hover:bg-side"
                            : "border-control bg-surface hover:bg-side")
                      }
                    >
                      <span>
                        {REASON_LABELS[r]}
                        {/* 강조를 **색·굵기만으로 알리지 않는다**(05 §5) — 왜 굵은지 말로 적는다. */}
                        {hot ? (
                          <span className="ml-1.5 font-normal text-xs text-text-3">
                            이 대기열
                          </span>
                        ) : null}
                      </span>
                      <kbd className="font-normal opacity-60">{i + 1}</kbd>
                    </button>
                  );
                })}
              </div>
              <label className="mt-2 block">
                <span className="sr-only">덧붙일 말</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    reason === "other"
                      ? "무엇이 이상한지 적는다 (필수)"
                      : "덧붙일 말 (선택)"
                  }
                  className="w-full rounded-lg border border-control bg-surface p-2 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  reason === null ||
                  (reason === "other" && note.trim().length === 0)
                }
                onClick={() => reason && void submit("defect", reason, note)}
                className="mt-2 min-h-11 cursor-pointer rounded-lg border border-[var(--red-text)] bg-[var(--red-text)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                신고하고 다음
              </button>
            </div>
          ) : null}

          <p className="mt-5 text-sm text-text-2">
            이번에 {n(done)}문항 · 남은 것 {n(queue.remaining)}
          </p>

          <div className="mt-4 border-t border-divider pt-3">
            <p className="text-sm font-medium">대기열</p>
            <ul className="mt-2 space-y-1.5">
              {qs.map((q) => (
                <li key={q.key}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => pick(q.key)}
                    aria-pressed={q.key === key}
                    className={
                      "w-full min-h-11 cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors " +
                      (q.key === key
                        ? "border-ink bg-side"
                        : "border-control bg-surface hover:bg-side")
                    }
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span>{q.label}</span>
                      <span className="tabular-nums">{n(q.remaining)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] leading-snug text-text-2">
              {queue.why}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
