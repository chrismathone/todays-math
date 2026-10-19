"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { AppChrome } from "@/components/chrome/AppChrome";
import {
  canOutputFrom,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import { recordProgress } from "@/lib/class/classApi";
import {
  loadClassProgress,
  loadMainDashboard,
  type MainDashboardData,
} from "@/lib/main/loadMainDashboard";
import { buildClassRows, remainingCount } from "@/lib/main/pipeline";
import { DashboardSkeleton } from "@/components/ui/PageSkeletons";
import { Button } from "@/components/ui/Button";

import { ClassCard } from "./ClassCard";
import { DailyReviewSection } from "./DailyReviewSection";
import { DoneSummaryRow } from "./DoneSummaryRow";
import { LedgerTable } from "./LedgerTable";
import { ProgressPanel } from "./ProgressPanel";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready" } & MainDashboardData);

/**
 * 메인이 헤더에 더 붙이는 「전체 표 ⇄ / 오늘 작업 ⇄」 버튼의 모양.
 *
 * 🔴 **상수로 뺀 이유** — 이 버튼은 헤더의 폭을 실제로 먹는데, 로그인 없이 헤더를
 *    볼 자리가 없어서 시안·계측이 매번 이걸 **빠뜨리거나 베껴** 썼다. 베끼면 갈린다.
 *    `/dev/chrome-check` 가 이 상수를 그대로 읽어 «메인과 같은 무게»의 헤더를 그린다.
 */
export const MAIN_VIEW_TOGGLE_CLASS =
  "cursor-pointer bg-ink px-2.5 py-0.5 text-[15.75px] font-extrabold text-bg";

type MainScreenProps = {
  /** Reuse the dashboard within a persistent workspace, without legacy chrome. */
  embedded?: boolean;
  onEmpty?: () => void;
  allowedMenus?: readonly WorkspaceMenu[];
};

export function MainScreen({
  embedded = false,
  onEmpty,
  allowedMenus,
}: MainScreenProps = {}) {
  const router = useRouter();
  // 효과의 의존에 router 를 넣지 않는다 — 시험 더블처럼 렌더마다 새 객체를 주는 라우터면
  // 대시보드를 렌더마다 다시 읽어 선택이 초기화된다. 최신 객체는 ref 로 든다.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selectedClassId, setSelectedClassId] = useState("");
  const [viewOverride, setViewOverride] = useState<"stack" | "ledger" | null>(
    null,
  );
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadGeneration = useRef(0);
  const committedProgress = useRef<MainDashboardData["progressByClass"]>({});
  const [recording, setRecording] = useState(false);
  const recordBusy = useRef(false);
  const canExport = allowedMenus === undefined || canOutputFrom(allowedMenus);
  const menuKey = allowedMenus?.join(",");
  const effectiveMenus = useMemo(
    () =>
      menuKey === undefined
        ? undefined
        : (menuKey.split(",").filter(Boolean) as WorkspaceMenu[]),
    [menuKey],
  );
  // 차시이동 화살표로 "열람 중인" 차시(진도 미기록). null이면 현재 기록된 진도를 본다.
  // 반을 바꾸거나 진도를 기록하면 null로 되돌려 그 반의 실제 진도를 다시 본다.
  const [viewedUnitId, setViewedUnitId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    loadGeneration.current += 1;
    committedProgress.current = {};
    const accept = (data: MainDashboardData) => {
      if (cancelled) return;
      // 🔴 반이 하나도 없으면 메인은 빈 표뿐이다 — S-02 대로 온보딩으로 보낸다.
      //    2026-09-07 새 계정이 로그인 직후 빈 메인에 떨어졌다(가입 경로만 온보딩이었다).
      if (data.classes.length === 0 && !embedded) {
        routerRef.current.replace("/onboarding");
        return;
      }
      setState({
        status: "ready",
        ...data,
        progressByClass: {
          ...data.progressByClass,
          ...committedProgress.current,
        },
      });
      const rows = buildClassRows(
        data.classes,
        data.tests,
        data.progressByClass,
        data.units,
      );
      const firstOpen = rows.find((r) => r.stage !== "done");
      setSelectedClassId((previous) =>
        data.classes.some((cls) => cls.id === previous)
          ? previous
          : (firstOpen?.classId ?? data.classes[0]?.id ?? ""),
      );
    };
    loadMainDashboard({
      allowedMenus: effectiveMenus,
      signal: controller.signal,
      onPartial: accept,
    })
      .then(accept)
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error", message: "목록을 불러오지 못했습니다" });
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
      loadGeneration.current += 1;
    };
  }, [loadAttempt, embedded, effectiveMenus]);

  const rows = useMemo(() => {
    if (state.status !== "ready") return [];
    return buildClassRows(
      state.classes,
      state.tests,
      state.progressByClass,
      state.units,
    );
  }, [state]);

  const remaining = remainingCount(rows);
  const autoView = remaining > 0 ? "stack" : "ledger";
  const view = viewOverride ?? autoView;
  const pending = rows.filter((r) => r.stage !== "done");
  const done = rows.filter((r) => r.stage === "done");
  const metrics = state.status === "ready" ? state.metrics : null;

  // 실제 기록된 현재 진도 차시.
  const committedUnitId =
    state.status === "ready"
      ? (state.progressByClass[selectedClassId]?.unitId ?? null)
      : null;
  // 🔴 반 진도가 **없을 때**의 시작점 제안 (원장님 2026-08-25 「차시이동이 작동하지 않음」).
  //    `adjacentUnitIds` 는 현재 단원이 null 이면 앞·뒤를 둘 다 null 로 돌려주어
  //    화살표가 둘 다 죽는다. 학년 첫 단원에서 시작하면 백 번을 눌러야 하므로
  //    그 반 학생들이 실제로 서 있는 자리를 제안한다.
  //    ⚠️ **제안은 진도가 아니다** — 「이 차시로 진도 기록」을 눌러야 저장된다.
  //       그래서 `committedUnitId` 에는 섞지 않는다(섞으면 «기록됨»으로 보인다).
  const suggestion =
    state.status === "ready"
      ? (state.suggestByClass[selectedClassId] ?? null)
      : null;
  const suggestedUnitId = committedUnitId === null ? suggestion?.unitId : null;

  // 화면에 보여줄 차시 = 열람 중이면 그 차시, 아니면 현재 진도, 그것도 없으면 제안.
  const displayedUnitId =
    viewedUnitId ?? committedUnitId ?? suggestedUnitId ?? null;
  const canRecord =
    !recording &&
    (state.status !== "ready" ||
      !state.progressStatusByClass?.[selectedClassId] ||
      state.progressStatusByClass[selectedClassId] === "ready") &&
    displayedUnitId !== null &&
    displayedUnitId !== committedUnitId;

  const handleSelectClass = useCallback((classId: string) => {
    if (recordBusy.current) return;
    setSelectedClassId(classId);
    setViewedUnitId(null); // 반을 바꾸면 그 반의 실제 진도를 보도록 열람 위치를 초기화한다.
  }, []);

  // 차시이동 화살표 — 진도를 기록하지 않고 열람 위치만 바꾼다(예전엔 클릭마다 진도가 쌓였다).
  const handleStep = useCallback((unitId: string) => {
    setViewedUnitId(unitId);
  }, []);

  // "이 차시로 진도 기록" — 열람 중인 차시를 실제 진도로 커밋한다(명시적 기록).
  const handleRecord = useCallback(async () => {
    if (
      !selectedClassId ||
      state.status !== "ready" ||
      displayedUnitId === null ||
      displayedUnitId === committedUnitId ||
      recordBusy.current ||
      (state.progressStatusByClass?.[selectedClassId] &&
        state.progressStatusByClass[selectedClassId] !== "ready")
    ) {
      return;
    }
    setAdvanceError(null);
    recordBusy.current = true;
    setRecording(true);
    try {
      const next = await recordProgress(selectedClassId, displayedUnitId);
      committedProgress.current[selectedClassId] = next;
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          progressByClass: {
            ...prev.progressByClass,
            [selectedClassId]: next,
          },
        };
      });
      setViewedUnitId(null); // 기록 후엔 방금 기록한 차시(=현재 진도)를 본다.
    } catch {
      setAdvanceError("진도를 저장하지 못했습니다");
    } finally {
      recordBusy.current = false;
      setRecording(false);
    }
  }, [selectedClassId, state, displayedUnitId, committedUnitId]);

  const retryClass = useCallback(async (classId: string) => {
    const generation = loadGeneration.current;
    setState((previous) =>
      previous.status !== "ready"
        ? previous
        : {
            ...previous,
            progressStatusByClass: {
              ...previous.progressStatusByClass,
              [classId]: "loading",
            },
          },
    );
    try {
      const next = await loadClassProgress(classId);
      if (generation !== loadGeneration.current) return;
      setState((previous) =>
        previous.status !== "ready"
          ? previous
          : {
              ...previous,
              progressByClass: {
                ...previous.progressByClass,
                [classId]: next.progress,
              },
              suggestByClass: {
                ...previous.suggestByClass,
                [classId]: next.suggestion,
              },
              progressStatusByClass: {
                ...previous.progressStatusByClass,
                [classId]: "ready",
              },
            },
      );
    } catch {
      if (generation !== loadGeneration.current) return;
      setState((previous) =>
        previous.status !== "ready"
          ? previous
          : {
              ...previous,
              progressStatusByClass: {
                ...previous.progressStatusByClass,
                [classId]: "error",
              },
            },
      );
    }
  }, []);

  if (state.status === "loading") {
    return embedded ? (
      <p role="status" className="p-6 text-base">
        수업 정보를 불러오는 중…
      </p>
    ) : (
      <DashboardSkeleton />
    );
  }

  if (state.status === "error") {
    return (
      <MainFrame embedded={embedded} activeNav="main">
        <main className="px-[26px] py-6">
          <p role="alert" className="mb-3 text-[12.5px] text-g-red-text">
            {state.message}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: "loading" });
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            다시 불러오기
          </Button>
        </main>
      </MainFrame>
    );
  }

  if (embedded && state.classes.length === 0) {
    return (
      <div className="p-6">
        <h3 className="mb-2 text-xl font-bold">첫 수업을 준비해 보세요</h3>
        <p className="mb-5 text-base text-text-2">
          반을 만들고 학생을 등록하면 오늘의 수업과 진도를 관리할 수 있습니다.
        </p>
        {onEmpty ? (
          <Button onClick={onEmpty}>반 · 학생 관리로 이동</Button>
        ) : null}
      </div>
    );
  }

  return (
    <MainFrame
      embedded={embedded}
      activeNav="main"
      remaining={remaining}
      extraNav={
        <button
          type="button"
          onClick={() => setViewOverride(view === "stack" ? "ledger" : "stack")}
          className={MAIN_VIEW_TOGGLE_CLASS}
        >
          {view === "stack" ? "전체 표 ⇄" : "오늘 작업 ⇄"}
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="min-w-0 flex-1">
          {/* 오늘의 확인테스트 — eywa 학생별 진도 (원장님 확정 2026-08-21, 계기판) */}
          {canExport ? <DailyReviewSection units={state.units} /> : null}
          {state.testsStatus === "error" || state.metricsStatus === "error" ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 p-4 text-sm"
            >
              <span>
                일부 시험·통계 정보를 불러오지 못했습니다. 수업과 진도는 계속
                확인할 수 있습니다.
              </span>
              <Button
                variant="secondary"
                onClick={() => setLoadAttempt((value) => value + 1)}
              >
                정보 다시 조회
              </Button>
            </div>
          ) : null}
          {view === "stack" ? (
            <>
              {/*
               * 🔴 `hot` 은 「목록 첫 줄」이 아니라 **「지금 고른 반」**이다
               *    (원장님 확정 2026-08-26). 종전엔 `i === 0` 이라 파란 불이 늘 맨 위에
               *    박혀 있었고, 2·3번 반을 고르면 오른쪽 패널만 바뀌고 왼쪽은 그대로여서
               *    **어느 반을 보고 있는지 화면이 말하지 않았다.**
               *    첫 화면이 지금과 같아 보이는 것은 `selectedClassId` 의 기본값이
               *    「가장 먼저 할 반」(정렬 첫 줄)이기 때문이지, 첫 줄이라서가 아니다.
               */}
              {pending.map((row, i) => (
                <ClassCard
                  key={row.classId}
                  row={row}
                  index={i + 1}
                  hot={row.classId === selectedClassId}
                  onSelect={handleSelectClass}
                  onProgress={handleSelectClass}
                  canExport={canExport}
                  testsPending={
                    state.testsStatus === "loading" ||
                    state.testsStatus === "error"
                  }
                  readStatus={state.progressStatusByClass?.[row.classId]}
                  onRetry={(id) => {
                    void retryClass(id);
                  }}
                />
              ))}
              {done.map((row) => (
                <DoneSummaryRow
                  key={row.classId}
                  row={row}
                  hot={row.classId === selectedClassId}
                  onSelect={handleSelectClass}
                />
              ))}
            </>
          ) : (
            <LedgerTable
              rows={rows}
              selectedClassId={selectedClassId}
              onSelect={handleSelectClass}
              onProgress={handleSelectClass}
              canExport={canExport}
              testsPending={
                state.testsStatus === "loading" || state.testsStatus === "error"
              }
              readStatusByClass={state.progressStatusByClass}
              onRetry={(id) => {
                void retryClass(id);
              }}
            />
          )}
        </div>
        <ProgressPanel
          classes={state.classes}
          units={state.units}
          selectedClassId={selectedClassId}
          selectedUnitId={displayedUnitId}
          printedDays={metrics?.printedDays ?? null}
          unmodifiedRate={
            metrics ? Math.round(metrics.unmodifiedRate * 100) : null
          }
          error={advanceError}
          canRecord={canRecord}
          suggestion={committedUnitId === null ? suggestion : null}
          onStep={handleStep}
          onRecord={() => {
            void handleRecord();
          }}
        />
      </div>
    </MainFrame>
  );
}

function MainFrame({
  embedded,
  children,
  extraNav,
  ...props
}: ComponentProps<typeof AppChrome> & { embedded: boolean }) {
  if (embedded) {
    return (
      <div data-teaching-dashboard>
        <div className="flex justify-end border-b border-divider p-4">
          {extraNav}
        </div>
        {children}
      </div>
    );
  }
  return (
    <AppChrome {...props} extraNav={extraNav}>
      {children}
    </AppChrome>
  );
}
