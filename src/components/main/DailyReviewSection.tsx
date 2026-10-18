"use client";

import FormatQuotaFields from "@/components/exam-builder/FormatQuotaFields";
import {
  emptyFormats,
  formatIntent,
  formatIssue,
  type Ladder,
} from "@/components/exam-builder/conditionsPlan";
import type { FormatIntent } from "@/contracts/formatIntent.contract";
import Link from "next/link";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import { useEffect, useMemo, useState } from "react";

import type { DailyReviewResponse } from "@/contracts/test.contract";
import type { UnitEntity } from "@/contracts/unit.contract";
import { loadDailyReview } from "@/lib/main/loadDailyReview";
import { OwnerTag } from "@/components/ui/OwnerTag";
import { DailyReviewSkeleton } from "@/components/ui/PageSkeletons";

/**
 * 오늘의 학생별 확인테스트 — 메인 상단 계기판 (원장님 확정 2026-08-21: Hi-fi ①).
 *
 * 진도 계획·eywa 보고서가 정한 「오늘 낼 시험」을 보여 주고, 「모두 출제」 하나로
 * 자동 묶음 전원을 초안으로 만든다. 손 갈 것(문항 부족·시험기간·범위 못 냄)만 펼친다.
 *
 * D-131(2026-09-16, 시안 Hi-fi 2): 계획이 있으면 **누구에게나** 선다 · 첫 줄은 짧게 「오늘 초안 N장」 ·
 * 칩 「N일 밀림 M명」·「문항 부족 N명」·「시험기간 N명」 · 오늘 대상이 없으면 「오늘 수업 계획이 없습니다.」.
 *
 * D-133(2026-09-16, 구현 검수): 밀림 칩은 **하나** 「밀림 N명 · 최대 D일」 · 오늘 대상이 없는 반은 **수만**
 * 「오늘 수업 계획이 없는 반 N개」 · 검수 줄에서 아침 자동으로 선 시험지의 이름 바로 뒤에 **«자동 출제»** 표지.
 *
 * · 이미 오늘 시험이 있는 학생은 건너뛴다(`todayTests`) — 재클릭·새로고침이
 *   중복 초안을 만들지 않는다.
 * · 출제는 기존 POST /api/tests/generate 를 학생별로 부른다 — 새 경로를 만들지
 *   않는다(검증·소유권·D-22 전부 그 라우트의 규칙 그대로).
 */

type DailyData = DailyReviewResponse["data"];
type Group = DailyData["auto"][number];

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: DailyData; stale: boolean };

interface GenerateProgress {
  done: number;
  total: number;
  running: boolean;
  /** studentId → 만들어진 testId. 성공한 학생은 검수 링크가 된다. */
  created: Record<string, string>;
  failures: Array<{ name: string; message: string }>;
}

const MICRO_LABEL = "text-[10px] font-extrabold tracking-[1.2px] text-text-2";

/**
 * «자동 출제» 표지 — 05 §8.10 Hi-fi 2 표지 그대로: 흰 바탕 · 파랑 #2064B3 1px 테두리·글자 · 11px · 700 ·
 * 안쪽 2px 8px · 모서리 4px. 줄높이는 시안에 없어 16px 로 박았다(검수 줄 안에서 높이가 흔들리지 않게).
 *
 * 🔴 파랑은 **리터럴**이다 — `text-blue`(`--blue`)로 쓰면 작업실(`TeachingView.module.css` `.teaching`)이 `--blue` 를
 *    #3159DF 로 덮어 다른 파랑이 된다(2026-09-16 실물 계측이 잡았다 — RTL 은 계산된 색을 못 본다). 계기판 «오늘» 칸
 *    (`ProgressPlan.module.css`)과 같은 §2.2 기능색 리터럴.
 * ⚠️ 글자 11px 은 작업실 안에서 **12px** 로 그려진다 — 작업실이 `text-[9~12…]` 를 캡션 12px 바닥으로 올린다
 *    (`.lessonContent` 규칙 · 담당 딱지 11.5px 도 같다). 작업실 크기를 따른다(D-133 ⒀ 선례) — 보고서 ⑥.
 * ⚠️ D-30: 누르는 것이 아니다 — 링크 **밖**에 두고 손가락 커서·hover 를 두지 않는다.
 */
const AUTO_DRAFT_TAG =
  "inline-block shrink-0 whitespace-nowrap rounded-[4px] border border-[#2064b3] bg-white px-2 py-0.5 text-[11px] leading-4 font-bold text-[#2064b3]";
const STALE_MS = 48 * 3_600_000;

const n = (v: number) => v.toLocaleString("ko-KR");

const kstTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function rangeLabel(g: Group, unitById: Map<string, UnitEntity>) {
  const start = unitById.get(g.rangeStartUnitId);
  const end = unitById.get(g.rangeEndUnitId);
  if (!start || !end) return `소단원 ${g.unitCount}개`;
  if (g.unitCount === 1) return `${end.grade} ${end.chapter} › ${end.section}`;
  if (start.chapter === end.chapter && start.grade === end.grade)
    return `${end.grade} ${end.chapter} › ${start.section} ~ ${end.section}`;
  return `${start.grade} ${start.section} ~ ${end.grade} ${end.section}`;
}

async function postGenerate(
  day: string,
  group: Group,
  student: Group["students"][number],
  formats?: FormatIntent,
): Promise<{ ok: true; testId: string } | { ok: false; message: string }> {
  const res = await fetch("/api/tests/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId: student.classId,
      studentId: student.id,
      testType: "review",
      ...(formats ? { formats } : {}),
      testDate: day,
      rangeStartUnitId: group.rangeStartUnitId,
      rangeEndUnitId: group.rangeEndUnitId,
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    data?: { test?: { id?: string } };
    error?: { message?: string };
  } | null;
  if (res.ok && body?.data?.test?.id)
    return { ok: true, testId: body.data.test.id };
  return {
    ok: false,
    message: body?.error?.message ?? `출제 실패 (HTTP ${res.status})`,
  };
}

export function DailyReviewSection({ units }: { units: UnitEntity[] }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [formatsByCount, setFormatsByCount] = useState<Record<number, Ladder>>(
    {},
  );
  const [progress, setProgress] = useState<GenerateProgress>({
    done: 0,
    total: 0,
    running: false,
    created: {},
    failures: [],
  });
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  useEffect(() => {
    let cancelled = false;
    loadDailyReview()
      .then((data) => {
        if (cancelled) return;
        // 낡음 판정은 렌더가 아니라 **응답이 온 시점**에 한 번 — 렌더는 순수하게 둔다.
        const stale = data.sync
          ? Date.now() - new Date(data.sync.ranAt).getTime() > STALE_MS
          : false;
        setState({ status: "ready", data, stale });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (state.status === "loading") {
    return <DailyReviewSkeleton />;
  }
  if (state.status === "error") {
    return (
      <section
        aria-label="오늘의 확인테스트"
        className="border-b border-divider px-5 py-3"
      >
        <p className={MICRO_LABEL}>오늘의 확인테스트</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-g-red-text">
          오늘의 확인테스트를 불러오지 못했습니다
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((k) => k + 1);
            }}
            className="cursor-pointer border border-control px-2 py-0.5 text-[12px] text-ink"
          >
            다시 시도
          </button>
        </p>
      </section>
    );
  }

  const d = state.data;
  // 🔴 문지기 — eywa 소유자이거나 **진도 계획이 있으면** 선다(D-131 «계획이 있으면 누구에게나»).
  //    둘 다 아니면 섹션은 **없다** — 「없음」을 안내하지 않는다(이 계정에는 원래 없는 배선이다).
  //    동기화 줄(맨 아래)은 지금 규칙 그대로 eywa 소유자에게만 — 남의 학원 동기화 상태를 새 계정이
  //    보던 자리(2026-09-07). eywa 갈래 표시는 보류 중(D-129 ⑸).
  if (!d.eywaOwner && !d.hasPlan) return null;
  const testByStudent = new Map(d.todayTests.map((t) => [t.studentId, t]));
  // 「모두 출제」 대상 — 자동 묶음에서 오늘 시험이 이미 있는 학생을 뺀 것.
  const targets = d.auto.flatMap((g) =>
    g.students
      .filter((s) => !testByStudent.has(s.id) && !progress.created[s.id])
      .map((s) => ({ group: g, student: s })),
  );
  // The group maximum is a capacity bound, not every student's paper size.
  const sizes = new Map<number, number>();
  targets.forEach(({ student }) => {
    const count = student.problemCount;
    if (count !== undefined) sizes.set(count, (sizes.get(count) ?? 0) + 1);
  });
  const formatWarnings = [...sizes.keys()].flatMap((count) => {
    const issue = formatIssue(formatsByCount[count] ?? emptyFormats(), count);
    return issue ? [`${count}문항 시험지: ${issue}`] : [];
  });
  const autoStudents = d.auto.reduce((sum, g) => sum + g.students.length, 0);
  const lackingStudents = d.lacking.reduce(
    (sum, g) => sum + g.students.length,
    0,
  );
  // 검수 줄 — 자동 묶음 학생 중 시험지가 있는 학생(묶음 차례) 뒤에, **묶음 밖** 학생의 오늘 시험지
  // (문항 부족 · 시험기간 · 오늘 대상 아님 — 아침 초안이 선 뒤 바뀐 날)를 이어 붙인다(D-133 후속).
  const autoIds = new Set(d.auto.flatMap((g) => g.students.map((s) => s.id)));
  const reviewEntries = [
    ...d.auto
      .flatMap((g) => g.students)
      .map((s) => ({
        id: s.id,
        name: s.name,
        today: testByStudent.get(s.id),
        testId: progress.created[s.id] ?? testByStudent.get(s.id)?.testId,
      })),
    ...d.todayTests
      .filter((t) => !autoIds.has(t.studentId))
      .map((t) => ({
        id: t.studentId,
        name: t.studentName,
        today: t,
        testId: t.testId,
      })),
  ].filter((e): e is typeof e & { testId: string } => Boolean(e.testId));
  const doneStudents = reviewEntries.length;
  const stale = state.stale;

  // 「오늘 초안 N장」 — 오늘 확인테스트 중 아직 초안인 것 + 이 화면에서 방금 만든 것.
  // ⚠️ 자동(아침 8시)으로 선 것과 손으로 낸 것을 **가르지 않는다** — 리드 결정 D(D-133 뒤에도 유지).
  //    가르는 것은 검수 줄의 «자동 출제» 표지뿐이다.
  const draftCount =
    d.todayTests.filter((t) => t.status === "draft").length +
    Object.keys(progress.created).filter((id) => !testByStudent.has(id)).length;

  // 칩 — 「밀림 N명 · 최대 D일」 · 「문항 부족 N명」 · 「시험기간 N명」 · 「범위 없음 N명」.
  // 🔴 밀림은 **칩 하나**(D-133 ⑺) — N = 밀린 학생 수, D = 가장 많이 밀린 일 수. 날마다 가르지 않는다.
  const chips = [
    ...(d.delayed.length > 0
      ? [
          {
            key: "delayed",
            label: `밀림 ${n(d.delayed.length)}명 · 최대 ${n(Math.max(...d.delayed.map((s) => s.days)))}일`,
            warn: true,
          },
        ]
      : []),
    ...(lackingStudents > 0
      ? [
          {
            key: "lacking",
            label: `문항 부족 ${n(lackingStudents)}명`,
            warn: true,
          },
        ]
      : []),
    ...(d.examOrUnread.length > 0
      ? [
          {
            key: "exam",
            label: `시험기간 ${n(d.examOrUnread.length)}명`,
            warn: false,
          },
        ]
      : []),
    // 범위를 못 낸 학생 — 시안 칩 셋에는 없지만 조용히 빼지 않는다(예전 숫자 줄에 있던 것).
    ...(d.noRange.length > 0
      ? [
          {
            key: "no-range",
            label: `범위 없음 ${n(d.noRange.length)}명`,
            warn: true,
          },
        ]
      : []),
  ];

  async function generateAll() {
    if (progress.running || targets.length === 0 || formatWarnings.length > 0)
      return;
    setProgress({
      done: 0,
      total: targets.length,
      running: true,
      created: progress.created,
      failures: [],
    });
    const created: Record<string, string> = { ...progress.created };
    const failures: Array<{ name: string; message: string }> = [];
    let done = 0;
    for (let at = 0; at < targets.length; at += 3) {
      const chunk = targets.slice(at, at + 3);
      await Promise.all(
        chunk.map(async ({ group, student }) => {
          const count = student.problemCount;
          const requestedFormats =
            count === undefined
              ? undefined
              : formatIntent(formatsByCount[count] ?? emptyFormats());
          const result = await postGenerate(
            d.day,
            group,
            student,
            requestedFormats,
          );
          if (result.ok) created[student.id] = result.testId;
          else failures.push({ name: student.name, message: result.message });
        }),
      );
      done += chunk.length;
      setProgress({
        done,
        total: targets.length,
        running: true,
        created: { ...created },
        failures: [...failures],
      });
    }
    setProgress({
      done,
      total: targets.length,
      running: false,
      created,
      failures,
    });
  }

  // 「지금 가져오기」 — POST /api/eywa-sync (본체는 CLI 와 같은 runEywaSync).
  // 수 분 걸릴 수 있다 — 도는 동안 잠그고, 끝나면 섹션을 새로 읽는다.
  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/eywa-sync", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!res.ok)
        throw new Error(
          body?.error?.message ?? `동기화 실패 (HTTP ${res.status})`,
        );
      setState({ status: "loading" });
      setReloadKey((k) => k + 1);
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "동기화에 실패했습니다",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section
      aria-label="오늘의 확인테스트"
      className="border-b border-divider px-5 py-3"
    >
      <p className={MICRO_LABEL}>오늘의 확인테스트</p>

      {d.attended === 0 ? (
        <p className="mt-1 text-sm text-text-3">오늘 수업 계획이 없습니다.</p>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            {/* 🔴 첫 줄은 **짧게** — 시각(«아침 8시에»)을 적지 않는다(D-131 ⑶). */}
            <p className="text-[15px] font-bold">오늘 초안 {n(draftCount)}장</p>
            <div className="ml-auto flex items-center gap-2">
              {progress.running ? (
                <span className="text-sm text-text-2">
                  출제 중 {progress.done}/{progress.total}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void generateAll()}
                disabled={
                  progress.running ||
                  targets.length === 0 ||
                  formatWarnings.length > 0
                }
                className="cursor-pointer bg-ink px-3 py-1.5 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-side disabled:text-text-3"
              >
                {targets.length === 0 && autoStudents > 0
                  ? "모두 출제됨"
                  : `모두 출제 (${targets.length}명)`}
              </button>
            </div>
          </div>

          {[...sizes.entries()]
            .sort(([a], [b]) => a - b)
            .map(([count, students]) => (
              <FormatQuotaFields
                key={count}
                label={`${count}문항 시험지 형식 배분 · ${students}명`}
                count={count}
                max={30}
                value={formatsByCount[count] ?? emptyFormats()}
                disabled={progress.running}
                onChange={(value) =>
                  setFormatsByCount((current) => ({
                    ...current,
                    [count]: value,
                  }))
                }
              />
            ))}
          {formatWarnings.length > 0 && (
            <p role="alert" className="mt-2 text-sm text-g-red-text">
              {formatWarnings.join(" · ")}
            </p>
          )}
          {/* 칩 — 손 갈 곳만. 누르는 것이 아니다(D-30: 손가락·hover 없음). 없는 갈래는 칩이 없다. */}
          {chips.length > 0 ? (
            <ul aria-label="손 갈 곳" className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <li
                  key={chip.key}
                  className={`rounded-full border bg-white px-2.5 py-0.5 text-[12px] ${
                    chip.warn
                      ? "border-g-red text-g-red-text"
                      : "border-divider text-text-2"
                  }`}
                >
                  {chip.label}
                </li>
              ))}
            </ul>
          ) : null}

          {/* 🔴 반 이름을 늘어놓지 않는다 — 수만(D-133 ⑻). 관리자 계정은 역할 계정의 반까지 보여 이름 줄이 길어진다.
              반 목록은 응답(`noLessonClasses`)에 그대로 있다. */}
          {d.noLessonClasses.length > 0 ? (
            <p className="mt-2 text-sm text-text-3">
              오늘 수업 계획이 없는 반 {n(d.noLessonClasses.length)}개
            </p>
          ) : null}

          {progress.failures.length > 0 ? (
            <p className="mt-2 text-sm text-g-red-text" role="alert">
              출제 실패 {progress.failures.length}건 —{" "}
              {progress.failures
                .map((f) => `${f.name}: ${f.message}`)
                .join(" · ")}
            </p>
          ) : null}
          {/* 링크는 `inline-flex items-center` — 작업실(`.lessonContent a`)이 링크를 44px 높이로 세워
              flex 줄 안에서 글자만 위로 뜨고 «출제됨 N명 — 검수:» 와 높이가 어긋났다(2026-09-16 캡처).
              «자동 출제» 표지(D-133 ⑵)는 **이름 바로 뒤** — 이름과 한 묶음(`inline-flex`)이라 줄이 바뀌어도 떨어지지 않는다. */}
          {doneStudents > 0 || Object.keys(progress.created).length > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-2">
              출제됨 {n(doneStudents)}명 — 검수:
              {reviewEntries.map(({ id, name, today, testId }) => {
                return (
                  <span key={id} className="inline-flex items-center gap-1">
                    <Link
                      href={`/tests/${testId}`}
                      className="inline-flex items-center underline underline-offset-2"
                    >
                      {name}
                      <RouteLinkStatus />
                    </Link>
                    {/* 아침 회차가 세운 시험지만 — 이 화면에서 방금 낸 초안은 `todayTests` 에 없다 */}
                    {today?.autoDraft ? (
                      <span data-auto-draft-tag className={AUTO_DRAFT_TAG}>
                        자동 출제
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </p>
          ) : null}

          {d.lacking.length > 0 ? (
            <div className="mt-2">
              <p className="text-[12px] font-bold text-g-red-text">
                문항 부족 — 자동에서 뺌
              </p>
              <ul>
                {d.lacking.map((g) => (
                  <li
                    key={g.key}
                    className="flex flex-wrap items-center gap-x-2 py-0.5 text-sm"
                  >
                    <span className="text-text-2">
                      {rangeLabel(g, unitById)}
                    </span>
                    <span>{g.students.map((s) => s.name).join(" · ")}</span>
                    <span className="text-[12px] text-g-red-text">
                      문항 {n(g.capacity)}/{g.neededCount}
                    </span>
                    <DraftOrReviewLink
                      student={g.students[0]!}
                      today={testByStudent.get(g.students[0]!.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {d.examOrUnread.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-g-yellow-text">
                시험기간·진도 못 읽음 {d.examOrUnread.length}명 — 자동 출제 제외
              </summary>
              <ul className="mt-1">
                {d.examOrUnread.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-2 py-0.5 text-sm"
                  >
                    <b>{s.name}</b>
                    <span className="text-text-3">
                      {s.grade} · {s.className}
                    </span>
                    {/* 담당(D-132 · 05 §8.11 «한 줄 목록») — 관리자 응답에만 실린다 */}
                    {s.classOwner ? <OwnerTag owner={s.classOwner} /> : null}
                    {s.lines.map((line) => (
                      <span
                        key={line}
                        className="bg-side px-1.5 text-[12px] text-g-yellow-text"
                      >
                        {line}
                      </span>
                    ))}
                    <DraftOrReviewLink
                      student={s}
                      today={testByStudent.get(s.id)}
                    />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {d.auto.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-text-2">
                자동으로 나가는 {n(d.auto.length)}갈래 · {n(autoStudents)}명
              </summary>
              <ul className="mt-1">
                {d.auto.map((g) => (
                  <li
                    key={g.key}
                    className="flex flex-wrap items-center gap-x-2 py-0.5 text-sm"
                  >
                    <span className="text-text-2">
                      {rangeLabel(g, unitById)}
                    </span>
                    <span>{g.students.map((s) => s.name).join(" · ")}</span>
                    <span className="text-[12px] text-text-3">
                      문항 {n(g.capacity)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}

      {/* 동기화 줄은 eywa 소유자에게만 — 계획만 있는 계정에는 원래 없는 배선이다(2026-09-07). */}
      {d.eywaOwner ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[12px] text-text-2">
          {d.sync ? (
            <>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 rounded-full ${stale ? "bg-g-red" : "bg-g-green"}`}
                />
                eywa 동기화 {kstTime(d.sync.ranAt)}
                {stale ? (
                  <b className="text-g-red-text">오래됨 — 48시간 넘음</b>
                ) : null}
              </span>
              <span className="text-text-3">
                {/* 🔴 **반 수를 맨 앞에** 찍는다. 동기화 범위는 `syncScope.ts` 로
                  좁혀져 있는데(원장님 확정: 이수진T 월·목 두 반) 그 사실이 화면에
                  없으면 「지금 가져오기」가 학원 전체를 가져오는 것으로 읽힌다.
                  「미분류」도 무슨 소린지 알 수 없어 «단원 못 찾음»으로 적는다. */}
                반 {n(d.sync.classes)}개만 · 학생 {n(d.sync.students)} · 진도{" "}
                {n(d.sync.progressRows)}행 · 단원 못 찾음{" "}
                {n(d.sync.unresolvedLines)}줄
              </span>
            </>
          ) : (
            <span className="text-g-red-text">eywa 동기화 기록 없음</span>
          )}
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing}
            className="cursor-pointer border border-control px-2 py-0.5 text-[12px] text-ink disabled:cursor-not-allowed disabled:border-divider disabled:text-text-3"
          >
            {syncing ? "가져오는 중" : "지금 가져오기"}
          </button>
          {syncError ? (
            <span className="text-g-red-text" role="alert">
              {syncError}
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

/**
 * 부족 · 시험기간 줄의 링크 — 오늘 시험지가 **이미 있으면 «검수»**(그 시험지), 없으면 «직접 출제».
 * 아침 초안이 선 뒤 그 학생이 자동 묶음 밖으로 바뀐 날, «직접 출제»가 같은 날 두 번째 초안을 세우지 않게(D-133 후속).
 */
function DraftOrReviewLink({
  student,
  today,
}: {
  student: { id: string; classId: string };
  today: { testId: string } | undefined;
}) {
  return (
    <Link
      href={
        today
          ? `/tests/${today.testId}`
          : `/tests/new?classId=${student.classId}&studentId=${student.id}`
      }
      className="inline-flex items-center text-[12px] underline underline-offset-2"
    >
      {today ? "검수" : "직접 출제"}
      <RouteLinkStatus />
    </Link>
  );
}
