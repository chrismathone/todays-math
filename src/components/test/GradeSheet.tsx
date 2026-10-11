"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BackLink from "@/components/ui/BackLink";
import type { GradeSheetResponse } from "@/contracts/testresult.contract";
import SavedRetryPanel from "./SavedRetryPanel";
import s from "./SavedRetryPanel.module.css";

import { Button } from "@/components/ui/Button";

/**
 * **채점 입력 — A안(표: 학생 × 문항)** (`/tests/{id}/grade`, D-134 트랙 1).
 *
 * 시안 SSOT: `/dev/retry-wire` **A 탭** — D-07 확정(19 §5′, codex·grok 협의).
 * 계약: `src/contracts/testresult.contract.ts` · 서버: `src/app/api/tests/[id]/grade/route.ts`
 *
 * ## 🔴 이 화면이 만드는 것은 **세 번째 상태**다
 *
 * 스키마의 `isCorrect` 는 참/거짓 둘뿐이다. 「**아직 안 봄**」은 DB 에 행이 없는 것이라
 * **화면이 그 상태를 눈에 보이게 만들어야 한다.** 안 가르면 채점하지 않은 학생이
 * 조용히 만점으로 굳는다 — 이 저장소가 여러 번 낸 「빈 값을 정상으로 읽는」 결함이다.
 *
 *   점선 빈 칸 = 아직 안 봄   ·   ○ = 맞음   ·   ✕ = 틀림
 *
 * ○ 는 **「끝」을 누른 뒤에만** 뜬다. 맞았다는 주장은 원장님이 하는 것이지 빈칸이 하는 게 아니다.
 *
 * ## 🔴 두지 않은 것 — 일부러
 *
 * · **일괄 단추**(「전원 응시」·「전부 맞음」) — 결석한 학생까지 한 번에 만점으로 굳힌다(grok 지적).
 * · **단원별 정답률 · 난이도 분포** — 8문항 한 회차는 단원당 1~2문항이라 통계가 아니다(23 §4 ①).
 *   그 축은 트랙 2가 **기간 누적**에서 연다. 저장은 되지만 여기서 그리지 않는다.
 *
 * ## 결시
 *
 * 줄마다 **결시** 단추가 따로 있다. 칸을 전부 ✕ 로 찍는 것과 **다른 뜻**이다 —
 * 전 문항 오답은 0점이고, 결시는 **점수가 없다**(23 §4 ③). 누르면 그 줄의 칸은 잠긴다.
 */

type Sheet = GradeSheetResponse["data"];

type ScoreLine = {
  studentId: string;
  name: string;
  absent: boolean;
  correctCount: number;
  problemCount: number;
};

/** 학생 한 줄의 채점 상태 — **세 번째 상태를 화면이 만든다.** */
type Marking = {
  /** 「끝」을 누른 적이 있나. 없으면 «아직 안 봄». */
  done: boolean;
  /** 결시 — `done` 과 따로 센다. 둘 다 «이 줄은 결정됐다»를 만족시킨다. */
  absent: boolean;
  wrong: Set<string>;
};

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; sheet: Sheet };

const EMPTY: Marking = { done: false, absent: false, wrong: new Set() };
const NOTE = "text-[14px] leading-relaxed text-[var(--learn-muted,#596c86)]";
/** 이름을 잇는 구분자 — 서버 거절 문구(`gradeSheet.ts`)와 같다. */
const NAME_JOIN = " · ";

const TEST_TYPE_TEXT = { daily: "일일테스트", review: "확인테스트" } as const;

/** 계약 스키마는 런타임 값으로 정적 import 하지 않는다(성능 수리 C-1 — `useTestReview` 와 같은 결). */
const contract = () => import("@/contracts/testresult.contract");

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  // 🔴 서버 문구를 **그대로** 띄운다 — 빠진 학생의 이름이 거기 있다. 다시 지어내면 이름이 사라진다.
  return body?.error?.message ?? "채점을 저장하지 못했습니다.";
}

export function GradeSheet({ testId }: { testId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [marks, setMarks] = useState<Record<string, Marking>>({});
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreLine[] | null>(null);
  const [retryOutput, setRetryOutput] = useState(false);
  const [savedReadError, setSavedReadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadId = useRef(0);

  useEffect(() => {
    const id = (loadId.current += 1);
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/tests/${testId}/grade`, {
          signal: controller.signal,
        });
        if (loadId.current !== id) return;
        if (!res.ok) {
          setState({ status: "error", message: await readError(res) });
          return;
        }
        const { gradeSheetResponseSchema } = await contract();
        const parsed = gradeSheetResponseSchema.parse(await res.json());
        if (loadId.current !== id) return;
        // 이미 채점한 시험지는 그 표시를 들고 연다 — 정정하러 들어온 길이다.
        setMarks(
          Object.fromEntries(
            parsed.data.students.map((s) => [
              s.studentId,
              s.latest
                ? {
                    done:
                      !s.latest.absent &&
                      s.latest.correctCount +
                        s.latest.wrongProblemIds.length ===
                        parsed.data.problems.length,
                    absent: s.latest.absent,
                    wrong: new Set(s.latest.wrongProblemIds),
                  }
                : { done: false, absent: false, wrong: new Set<string>() },
            ]),
          ),
        );
        setState({ status: "ready", sheet: parsed.data });
        setSavedReadError(null);
      } catch {
        if (controller.signal.aborted || loadId.current !== id) return;
        setState({ status: "error", message: "채점표를 불러오지 못했습니다." });
      }
    })();
    return () => controller.abort();
  }, [testId, loadAttempt]);

  function retry() {
    setState({ status: "loading" });
    setLoadAttempt((value) => value + 1);
  }

  const markOf = useCallback(
    (sid: string): Marking => marks[sid] ?? EMPTY,
    [marks],
  );

  const toggleWrong = useCallback((sid: string, pid: string) => {
    setMarks((prev) => {
      const cur = prev[sid] ?? EMPTY;
      if (cur.absent) return prev;
      const wrong = new Set(cur.wrong);
      if (wrong.has(pid)) wrong.delete(pid);
      else wrong.add(pid);
      return { ...prev, [sid]: { ...cur, wrong } };
    });
    setResult(null);
    setActionError(null);
  }, []);

  const toggleDone = useCallback((sid: string) => {
    setMarks((prev) => {
      const cur = prev[sid] ?? EMPTY;
      return { ...prev, [sid]: { ...cur, done: !cur.done } };
    });
    setResult(null);
    setActionError(null);
  }, []);

  const toggleAbsent = useCallback((sid: string) => {
    setMarks((prev) => {
      const cur = prev[sid] ?? EMPTY;
      // 결시를 켜면 그 줄의 오답 표시는 지운다 — 두 뜻이 한 줄에 같이 있을 수 없다.
      return cur.absent
        ? { ...prev, [sid]: { done: false, absent: false, wrong: new Set() } }
        : { ...prev, [sid]: { done: false, absent: true, wrong: new Set() } };
    });
    setResult(null);
    setActionError(null);
  }, []);

  const sheet = state.status === "ready" ? state.sheet : null;

  /** 🔴 아직 결정되지 않은 학생 — **이름**으로 댄다. 「몇 명」은 명단을 다시 훑게 만든다. */
  const pending = useMemo(() => {
    if (!sheet) return [];
    return sheet.students.filter((s) => {
      const m = markOf(s.studentId);
      return !m.done && !m.absent;
    });
  }, [sheet, markOf]);

  const blockedStudentIds = useMemo(
    () =>
      new Set(
        (sheet?.students ?? [])
          .filter((student) => {
            if (saving || savedReadError) return true;
            const mark = markOf(student.studentId);
            const latest = student.latest;
            return (
              !latest ||
              mark.absent !== latest.absent ||
              (!mark.absent && !mark.done) ||
              mark.wrong.size !== latest.wrongProblemIds.length ||
              latest.wrongProblemIds.some((id) => !mark.wrong.has(id))
            );
          })
          .map((student) => student.studentId),
      ),
    [sheet, markOf, saving, savedReadError],
  );

  const refreshSavedRecords = useCallback(async () => {
    try {
      const response = await fetch(`/api/tests/${testId}/grade`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await readError(response));
      const { gradeSheetResponseSchema } = await contract();
      const parsed = gradeSheetResponseSchema.parse(await response.json());
      setState({ status: "ready", sheet: parsed.data });
      setSavedReadError(null);
    } catch {
      setSavedReadError(
        "채점은 저장됐지만 저장된 기록을 다시 읽지 못했습니다. 기록을 확인한 뒤 복습할 수 있습니다.",
      );
    }
  }, [testId]);

  const save = useCallback(async () => {
    if (!sheet || pending.length > 0 || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      const order = new Map(sheet.problems.map((p, i) => [p.problemId, i]));
      const body = {
        entries: sheet.students.map((s) => {
          const m = markOf(s.studentId);
          return {
            studentId: s.studentId,
            absent: m.absent,
            wrongProblemIds: [...m.wrong].sort(
              (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
            ),
          };
        }),
      };
      const res = await fetch(`/api/tests/${sheet.testId}/grade`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setActionError(await readError(res));
        return;
      }
      const { gradeSubmitResponseSchema } = await contract();
      const parsed = gradeSubmitResponseSchema.parse(await res.json());
      setResult(parsed.data.scores);
      await refreshSavedRecords();
    } catch {
      setActionError("채점을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }, [sheet, pending.length, saving, markOf, refreshSavedRecords]);

  if (state.status === "loading") {
    return (
      <main className="px-4 py-6 sm:px-8">
        <p className={NOTE}>채점표를 불러오는 중입니다</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="px-4 py-6 sm:px-8">
        <p role="alert" className="text-[14px] text-g-red-text">
          {state.message}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={retry}>
            다시 불러오기
          </Button>
          <BackLink href={`/tests/${testId}`}>시험지로 돌아가기</BackLink>
        </div>
      </main>
    );
  }

  const { students, problems } = state.sheet;

  return (
    <div className="flex min-h-[calc(100vh-52px)] flex-col">
      <main hidden={retryOutput} className={`${s.grading} flex-1 pb-6`}>
        <div className="flex items-baseline justify-between px-4 py-4 sm:px-8">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--learn-ink,#172b4d)]">
              채점 —{" "}
              {state.sheet.studentName
                ? `${state.sheet.className} · ${state.sheet.studentName}`
                : state.sheet.className}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--learn-muted,#596c86)]">
              {TEST_TYPE_TEXT[state.sheet.testType]} · {state.sheet.testDate} ·{" "}
              {problems.length}문항 · 학생 {students.length}명
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <p className={`px-4 sm:px-8 ${NOTE}`}>
            이 시험지의 대상 학생이 없습니다.
          </p>
        ) : (
          <>
            <p className={`px-4 pb-3 sm:px-8 ${NOTE}`}>
              틀린 칸만 누릅니다. 오른쪽 「끝」을 눌러야 그 학생이 채점됩니다 —
              누르기 전에는 점선 칸이 「아직 안 봄」입니다. 시험을 안 본 학생은
              「결시」로 표시합니다.
            </p>
            <div
              className="mx-4 overflow-x-auto rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] sm:mx-8"
              role="region"
              aria-label="학생별 채점표"
              tabIndex={0}
            >
              <table className="w-full border-collapse text-[14px] text-[var(--learn-ink,#172b4d)]">
                <thead>
                  <tr className="border-b border-[var(--learn-track,#dde3ec)] bg-[var(--learn-soft,#edf2ff)]">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-[var(--learn-soft,#edf2ff)] px-3 py-2 text-left font-semibold"
                    >
                      학생
                    </th>
                    {problems.map((p) => (
                      <th
                        key={p.problemId}
                        scope="col"
                        className="w-11 px-1 py-2 text-center font-semibold tabular-nums"
                        title={p.problemCode}
                      >
                        {p.no}
                      </th>
                    ))}
                    {/*
                      🔴 **상태 칸을 오른쪽에 고정한다** — 학생 이름 칸이 왼쪽에 고정된 것과 같은 장치다.

                      실물 계측(2026-09-18, 390px): 학생 7 × 문항 8 이면 표가 478px 라
                      휴대폰 폭에서 **154px 을 가로로 밀어야** 「끝」·「결시」에 닿았다.
                      그 둘은 이 화면에서 **제일 중요한 단추**(그 줄이 채점됐다는 주장)이고,
                      줄마다 밀어야 한다면 56칸을 한 화면에 담은 뜻이 없다.
                      `scripts/qa/grading-input-layout.mjs` 가 끝까지 민 상태로 이 칸이 보이는지 잰다.
                    */}
                    <th
                      scope="col"
                      className="sticky right-0 z-10 bg-[var(--learn-soft,#edf2ff)] px-3 py-2 text-center font-semibold"
                    >
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const m = markOf(s.studentId);
                    return (
                      <tr
                        key={s.studentId}
                        className="border-b border-divider last:border-0"
                      >
                        {/*
                          🔴 D-30 — 행에는 `onClick` 도 손가락 커서도 hover 배경도 없다.
                             누를 수 있는 것은 칸 단추·끝 단추·결시 단추뿐이다.
                        */}
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-[var(--learn-surface,#fff)] px-3 py-1.5 text-left font-semibold whitespace-nowrap"
                        >
                          {s.name}
                        </th>
                        {problems.map((p) => {
                          const wrong = m.wrong.has(p.problemId);
                          const label = m.absent
                            ? "결시"
                            : wrong
                              ? "틀림"
                              : m.done
                                ? "맞음"
                                : "아직 안 봄";
                          return (
                            <td key={p.problemId} className="p-0.5 text-center">
                              <button
                                type="button"
                                disabled={m.absent || saving}
                                onClick={() =>
                                  toggleWrong(s.studentId, p.problemId)
                                }
                                aria-pressed={wrong}
                                aria-label={`${s.name} ${p.no}번 ${label}`}
                                className={`h-10 w-10 rounded-lg border text-[14px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learn-focus,#82a1ff)] disabled:cursor-not-allowed ${
                                  m.absent
                                    ? "border-divider bg-side text-text-3"
                                    : wrong
                                      ? "cursor-pointer border-g-red-text bg-g-red-text text-white"
                                      : m.done
                                        ? "cursor-pointer border-control bg-white text-text-2"
                                        : "cursor-pointer border-dashed border-control bg-canvas text-text-2"
                                }`}
                              >
                                {m.absent
                                  ? ""
                                  : wrong
                                    ? "✕"
                                    : m.done
                                      ? "○"
                                      : ""}
                              </button>
                            </td>
                          );
                        })}
                        <td className="sticky right-0 z-10 bg-[var(--learn-surface,#fff)] px-3 py-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {/*
                              🔴 단추가 «무엇을 굳히는지» **누르기 전에** 말한다.
                                 그냥 「끝」이면 한 칸도 안 찍은 행에서 눌렀을 때 만점이 조용히 굳는다
                                 (codex·grok 이 둘 다 최대 결함으로 짚었다 — 19 §5′).
                            */}
                            <button
                              type="button"
                              disabled={m.absent || saving}
                              onClick={() => toggleDone(s.studentId)}
                              aria-pressed={m.done}
                              className={`min-h-10 min-w-16 rounded-lg border px-2 py-1 text-[13px] whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learn-focus,#82a1ff)] disabled:cursor-not-allowed disabled:border-divider disabled:bg-side disabled:text-text-3 ${
                                m.done
                                  ? "cursor-pointer border-ink bg-ink text-white"
                                  : "cursor-pointer border-control bg-white"
                              }`}
                            >
                              {m.done
                                ? `${m.wrong.size}개 ✓`
                                : `${m.wrong.size}개 끝`}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => toggleAbsent(s.studentId)}
                              aria-pressed={m.absent}
                              className={`min-h-10 cursor-pointer rounded-lg border px-2 py-1 text-[13px] whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--learn-focus,#82a1ff)] ${
                                m.absent
                                  ? "border-ink bg-ink text-white"
                                  : "border-control bg-white"
                              }`}
                            >
                              결시
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result ? <ScoreList lines={result} /> : null}
          </>
        )}
      </main>

      {savedReadError ? (
        <div className="mx-4 sm:mx-8">
          <p role="alert">{savedReadError}</p>
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => void refreshSavedRecords()}
          >
            저장된 기록 다시 확인
          </Button>
        </div>
      ) : null}
      {students.length > 0 ? (
        <SavedRetryPanel
          sheet={state.sheet}
          blockedStudentIds={blockedStudentIds}
          onOutputChange={setRetryOutput}
        />
      ) : null}

      <footer
        hidden={retryOutput}
        className={`${s.grading} sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--learn-track,#dde3ec)] bg-[var(--learn-soft,#edf2ff)] px-4 py-3 sm:px-8`}
      >
        {/*
          🔴 미채점 행이 남은 채로 저장하지 못하게 막고, **누가** 남았는지 댄다.
             「N명 남음」만 적으면 원장님이 명단을 다시 훑어야 한다.
        */}
        <p role="status" className={NOTE}>
          {students.length === 0
            ? ""
            : pending.length === 0
              ? `${students.length}명 모두 채점했습니다.`
              : `아직 안 본 학생: ${pending.map((s) => s.name).join(NAME_JOIN)}`}
        </p>
        {actionError ? (
          <p role="alert" className="text-[11.5px] font-bold text-g-red-text">
            {actionError}
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/tests/${testId}`}
            className="inline-flex min-h-11 min-w-[44px] items-center justify-center px-3 text-[12.5px] font-bold text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-g-blue"
          >
            시험지
          </Link>
          <Button
            variant="ink"
            disabled={students.length === 0 || pending.length > 0 || saving}
            onClick={() => void save()}
          >
            {saving ? "저장 중…" : "채점 결과 저장"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

/**
 * 저장 직후 보이는 것 — **학생별 점수 목록뿐**이다.
 *
 * 🔴 단원별 정답률·난이도 분포를 여기서 그리지 않는다. 8문항 한 회차는 단원당 1~2문항이라
 *    「이 단원 0%」가 **문항 하나 틀린 것**이다(23 §4 ①). 그 축은 트랙 2가 기간 누적에서 연다.
 * 🔴 결시는 「0 / 8」이 아니라 **「결시」**다 — 0 으로 적으면 만점 대비 0점으로 읽힌다.
 */
function ScoreList({ lines }: { lines: ScoreLine[] }) {
  const absent = lines.filter((l) => l.absent).length;
  return (
    <section
      aria-label="채점 결과"
      aria-live="polite"
      className="mx-8 mt-6 border border-control bg-white"
    >
      <h2 className="border-b border-divider px-3 py-2 text-[13px] font-black">
        채점 결과
      </h2>
      <p className={`px-3 pt-2 ${NOTE}`}>
        채점 {lines.length - absent}명{absent > 0 ? ` · 결시 ${absent}명` : ""}
      </p>
      <ul className="px-3 py-2">
        {lines.map((line) => (
          <li
            key={line.studentId}
            className="flex items-center justify-between border-b border-divider py-1.5 text-[13px] last:border-0"
          >
            <span className="font-medium">{line.name}</span>
            <span className="tabular-nums text-text-2">
              {line.absent
                ? "결시"
                : `${line.correctCount} / ${line.problemCount}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
