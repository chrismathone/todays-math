"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import ConfirmDialog from "@/components/unified/ConfirmDialog";
import {
  classManagerHref,
  contextParams,
  type ReturnContext,
} from "@/lib/adminReturn";
import { replaceScreenQuery, useScreenQuery } from "@/hooks/useScreenQuery";
import {
  courseTargets,
  enrollmentKey,
  sharedCourseState,
} from "@/lib/math-srs/courseRoster";
import type {
  CourseDashboard as DashboardData,
  CoursePlan,
  CoursePlanInput,
  CourseRosterStudent,
  CourseStudentDetail,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { solutionForDisplay } from "@/lib/solutionSteps";
import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import Icon from "@/components/unified/WorkspaceIcon";
import { nameSelectionClass } from "@/components/ui/rowSelection";
import CoursePlanForm from "./CoursePlanForm";
import {
  getCourseDashboard,
  getCourseStudentDetail,
  saveCourseStudentPlan,
  getExplorerTeacherSettings,
  saveExplorerTeacherSettings,
} from "./courseApi";
import type { ExplorerSettings } from "@/contracts/mathExplorerSettings.contract";
import formStyles from "./CoursePlanForm.module.css";
import s from "./course-dashboard.module.css";
import g from "./curriculum-graph.module.css";

const CurriculumGraphPanel = dynamic(() => import("./CurriculumGraphPanel"), {
  ssr: false,
  loading: () => (
    <p role="status" className={g.loading}>
      교육과정 연결도를 불러오는 중…
    </p>
  ),
});
const TextbookStudentEvidence = dynamic(
  () => import("@/components/textbook/integration/TextbookStudentEvidence"),
  { ssr: false },
);

const STATUS: Record<CourseSummary["status"], string> = {
  setup: "설정 필요",
  paused: "일시정지",
  learning: "학습 중",
  review: "복습 필요",
  ready: "시작 가능",
  done: "오늘 종료",
  complete: "과정 완료",
};
type Filter =
  "all" | "account" | "primary" | "supplementary" | CourseSummary["status"];
type PlanControl = {
  dirty: boolean;
  busy: boolean;
  save: () => Promise<boolean>;
  discard: () => void;
};
type Failure = { status: number; message: string };
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "2-digit",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateTime = (value: string | null) =>
  value ? dateFormat.format(new Date(value)) : "기록 없음";
function sectionName(id: string | null | undefined) {
  const section = id ? getCourseSection(id) : undefined;
  return section
    ? `초${section.grade} · ${section.semester}학기 · ${section.title}`
    : "미설정";
}
function matches(
  student: CourseRosterStudent,
  filter: Filter,
  primary: Set<string>,
) {
  return filter === "all"
    ? true
    : filter === "primary"
      ? primary.has(student.id)
      : filter === "supplementary"
        ? !primary.has(student.id)
        : filter === "setup"
          ? primary.has(student.id) && !student.plan
          : filter === "account"
            ? !student.hasAccount
            : student.summary.status === filter;
}
function ErrorNotice({ error }: { error: Failure }) {
  return (
    <div role="alert" className={s.error}>
      {error.status === 503 ? (
        <strong>
          학습 기록 서비스를 사용할 수 없습니다. 잠시 후 다시 불러오세요.
        </strong>
      ) : null}
      <p>{error.message}</p>
      {error.status === 401 ? <Link href="/login">다시 로그인하기</Link> : null}
    </div>
  );
}

export default function CourseDashboard({
  admin = false,
  textbookEnabled = false,
  initialBranchId,
}: {
  admin?: boolean;
  textbookEnabled?: boolean;
  initialBranchId?: string;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [classSelection, setClassId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CourseRosterStudent | null>(null);
  const [detailView, setDetailView] = useState<DetailView>("overview");
  const [graphOpen, setGraphOpen] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const panelId = useId();
  const graphPanelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const controlRef = useRef<PlanControl | null>(null);
  const [pending, setPending] = useState<{ action: () => void } | null>(null);
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const replay = useRef(false);
  const urlParams = useScreenQuery();
  const classId =
    classSelection ?? contextParams(urlParams).get("classId") ?? "";
  const branchId = admin
    ? urlParams.has("branchId")
      ? urlParams.get("branchId") || "invalid"
      : initialBranchId
    : undefined;
  const [dataBranchId, setDataBranchId] = useState<string | undefined>(
    branchId,
  );
  const from: ReturnContext = admin ? "admin-srs" : "workspace-srs";
  const accountHref = (row: CourseRosterStudent) =>
    classManagerHref(
      row,
      {
        ...data?.management,
        menus: data?.management?.canOpen ? ["teaching"] : [],
      },
      from,
    );
  const guard = useCallback((action: () => void) => {
    if (controlRef.current?.busy) return;
    if (!controlRef.current?.dirty) {
      action();
      return;
    }
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setMoveError(null);
    setPending({ action });
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (controlRef.current?.dirty || controlRef.current?.busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      if (replay.current || !(event.target instanceof Element)) return;
      const target = event.target.closest<
        HTMLAnchorElement | HTMLButtonElement
      >("a, nav button, [role=tab]");
      if (!target || target.closest("dialog")) return;
      if (target instanceof HTMLButtonElement && root.current?.contains(target))
        return;
      if (target instanceof HTMLAnchorElement) {
        if (
          target.target === "_blank" ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const destination = new URL(target.href, window.location.href);
        if (destination.origin !== window.location.origin) return;
      }
      if (!controlRef.current?.dirty && !controlRef.current?.busy) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      guard(() => {
        replay.current = true;
        target.click();
        replay.current = false;
      });
    };
    document.addEventListener("click", click, true);
    const beforeLeave = (event: Event) => {
      if (!controlRef.current?.dirty && !controlRef.current?.busy) return;
      event.preventDefault();
      const proceed = (event as CustomEvent<{ proceed?: () => void }>).detail
        ?.proceed;
      if (proceed) guard(proceed);
    };
    window.addEventListener("course-srs-before-leave", beforeLeave);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("course-srs-before-leave", beforeLeave);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [guard]);

  useEffect(() => {
    if (!selected) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]"))
        return;
      event.preventDefault();
      event.stopPropagation();
      guard(() => {
        setSelected(null);
        controlRef.current = null;
        replaceScreenQuery({ studentId: null });
        if (opener.current?.isConnected) opener.current.focus();
        else heading.current?.focus();
      });
    };
    document.addEventListener("keydown", escape, true);
    return () => document.removeEventListener("keydown", escape, true);
  }, [selected, guard]);

  useEffect(() => {
    let current = true;
    void (branchId ? getCourseDashboard(branchId) : getCourseDashboard()).then(
      (result) => {
        if (!current) return;
        setLoading(false);
        if (!result.ok) {
          setError(result);
          return;
        }
        setError(null);
        setDataBranchId(branchId);
        // A list request begun before a plan save must not overwrite that save.
        setData((previous) => {
          const previousRows = new Map(
            previous?.students.map((row) => [row.id, row]),
          );
          return {
            ...result.data,
            students: result.data.students.map((row) => {
              const prior = previousRows.get(row.id);
              return prior && prior.revision > row.revision
                ? sharedCourseState(row, prior)
                : row;
            }),
          };
        });
      },
    );
    return () => {
      current = false;
    };
  }, [reload, branchId]);

  const scopedData = dataBranchId === branchId ? data : null;
  const students = scopedData?.students ?? [];
  const targets = courseTargets(students);
  const restored = useRef("");
  const requested = contextParams(urlParams);
  const requestedStudentId = requested.get("studentId");
  const requestedClassId = requested.get("classId") ?? "";
  const requestedKey = `${requested.get("classId") ?? ""}:${requested.get("studentId") ?? ""}`;
  useEffect(() => {
    if (!scopedData || restored.current === `${branchId ?? ""}:${requestedKey}`)
      return;
    restored.current = `${branchId ?? ""}:${requestedKey}`;
    const row = scopedData.students.find(
      (row) =>
        row.id === requestedStudentId &&
        (!requestedClassId || row.classId === requestedClassId),
    );
    if (row)
      guard(() => {
        setSelected(row);
        setDetailView(
          admin && branchId ? "explorers" : row.plan ? "overview" : "plan",
        );
      });
  }, [
    scopedData,
    requestedKey,
    requestedStudentId,
    requestedClassId,
    branchId,
    admin,
    guard,
  ]);
  const selectedGraphStudent = selected
    ? (students.find((row) => enrollmentKey(row) === enrollmentKey(selected)) ??
      selected)
    : null;
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  const inScope = students.filter(
    (student) =>
      (!classId || student.classId === classId) &&
      `${student.name} ${student.className}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalized),
  );
  const visible = inScope.filter((student) =>
    matches(student, filter, targets.primary),
  );
  const filters: [Filter, string][] = [
    ["all", "전체"],
    ["primary", "기본 대상"],
    ["supplementary", "보충 / 학년 확인 필요"],
    ...(Object.entries(STATUS) as [CourseSummary["status"], string][]),
    ["account", "계정 확인 필요"],
  ];
  const refresh = () => {
    setLoading(true);
    setError(null);
    setReload((value) => value + 1);
  };
  const updateRow = (student: CourseRosterStudent) => {
    setSelected((previous) =>
      previous ? sharedCourseState(previous, student) : previous,
    );
    setData((previous) =>
      previous
        ? {
            ...previous,
            students: previous.students.map((row) =>
              sharedCourseState(row, student),
            ),
          }
        : previous,
    );
  };
  const close = () => {
    setSelected(null);
    controlRef.current = null;
    replaceScreenQuery({ studentId: null });
    if (opener.current?.isConnected) opener.current.focus();
    else heading.current?.focus();
  };
  const openStudent = (
    student: CourseRosterStudent,
    trigger: HTMLButtonElement,
  ) => {
    if (controlRef.current?.busy) return;
    if (selected && enrollmentKey(selected) === enrollmentKey(student)) {
      const nextView = student.plan ? "overview" : "plan";
      const focus = () => {
        setDetailView(nextView);
        document.getElementById(`${panelId}-title`)?.focus();
      };
      if (detailView === nextView) focus();
      else guard(focus);
      return;
    }
    guard(() => {
      opener.current = trigger;
      setDetailView(student.plan ? "overview" : "plan");
      setSelected(student);
      setClassId(classId);
      restored.current = `${branchId ?? ""}:${enrollmentKey(student)}`;
      replaceScreenQuery({ classId: student.classId, studentId: student.id });
      if (selected && enrollmentKey(selected) === enrollmentKey(student))
        document.getElementById(`${panelId}-title`)?.focus();
    });
  };

  return (
    <div className={s.dashboard} ref={root}>
      {pending ? (
        <ConfirmDialog
          title="저장하지 않은 학습 계획이 있습니다"
          description="저장 후 이동하거나, 변경을 버리거나, 계속 편집할 수 있습니다."
          confirmLabel="버리고 이동"
          busy={moving}
          error={moveError}
          returnFocus={returnFocus}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            controlRef.current?.discard();
            const action = pending.action;
            setPending(null);
            action();
          }}
        >
          <button
            type="button"
            className={s.button}
            disabled={moving}
            onClick={async () => {
              setMoving(true);
              const saved = await controlRef.current?.save();
              setMoving(false);
              if (saved) {
                const action = pending.action;
                setPending(null);
                action();
              } else
                setMoveError(
                  "저장하지 못했습니다. 입력을 확인하거나 계속 편집하세요.",
                );
            }}
          >
            저장하고 이동
          </button>
          <button
            type="button"
            className={s.button}
            disabled={moving}
            onClick={() => setPending(null)}
          >
            계속 편집
          </button>
        </ConfirmDialog>
      ) : null}
      <header className={s.header}>
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {admin ? "SRS 현황 · 관리자" : "SRS 현황"}
          </h1>
          <p className={s.scope}>지원 교육과정 초3–초6 · 한국 시간 기준</p>
        </div>
        <div className={g.headerActions}>
          <button
            type="button"
            className={g.entryButton}
            aria-expanded={graphOpen}
            aria-controls={graphPanelId}
            onClick={() => setGraphOpen((open) => !open)}
          >
            교육과정 연결도
          </button>
          <button
            type="button"
            className={s.button}
            onClick={refresh}
            disabled={loading}
          >
            목록 새로고침
          </button>
        </div>
      </header>
      {graphOpen ? (
        <CurriculumGraphPanel
          id={graphPanelId}
          student={
            selectedGraphStudent
              ? {
                  id: selectedGraphStudent.id,
                  revision: selectedGraphStudent.revision,
                }
              : null
          }
          onClose={() => setGraphOpen(false)}
        />
      ) : null}

      {loading ? (
        <p role="status" className={s.notice}>
          학생 학습 현황을 불러오는 중…
        </p>
      ) : null}
      {error ? (
        <>
          <ErrorNotice error={error} />
          <button type="button" className={s.button} onClick={refresh}>
            다시 불러오기
          </button>
        </>
      ) : null}
      {data && !error && !loading ? (
        <>
          <dl className={s.totals} aria-label="전체 학생 학습 요약">
            <div>
              <dt>계획 설정</dt>
              <dd>
                {targets.unique.filter((row) => row.plan).length}
                <small> / {targets.unique.length}명</small>
              </dd>
            </div>
            <div>
              <dt>설정 필요</dt>
              <dd>
                {targets.setup.length}
                <small>명</small>
              </dd>
            </div>
            <div>
              <dt>복습 도래</dt>
              <dd>
                {
                  targets.unique.filter((row) => row.summary.dueCount > 0)
                    .length
                }
                <small>명</small>
              </dd>
            </div>
            <div>
              <dt>오늘 종료</dt>
              <dd>
                {
                  targets.unique.filter(
                    (row) =>
                      row.summary.status === "done" ||
                      row.summary.todayAnswered >= row.summary.todayGoal,
                  ).length
                }
                <small>명</small>
              </dd>
            </div>
          </dl>
          <div className={s.controls}>
            <div className={s.toolbar}>
              <label className={s.search}>
                학생 / 반 검색
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="이름 또는 반 이름"
                />
              </label>
              <label>
                반 선택
                <select
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                >
                  <option value="">전체 반</option>
                  {(scopedData?.classes ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={s.filters} role="group" aria-label="학습 상태 필터">
              {filters.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span>
                    {
                      new Set(
                        inScope
                          .filter((row) => matches(row, value, targets.primary))
                          .map((row) => row.id),
                      ).size
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className={s.resultCount} aria-live="polite">
            <span>
              학생{" "}
              <strong>{new Set(visible.map((row) => row.id)).size}명</strong> ·
              등록 {visible.length}건 / 전체 학생 {targets.unique.length}명 ·
              등록 {students.length}건
            </span>
            <span>
              기본 대상 {targets.primary.size}명 · 보충 / 학년 확인 필요{" "}
              {targets.supplementary.length}명 · 계획 대상{" "}
              {targets.target.length}명. 반 등록 학년 기준이며 추정 중1은 확인된
              개인 학년을 뜻하지 않습니다.
            </span>
          </p>
        </>
      ) : null}

      <div className={s.workspace} data-detail={!!selected}>
        <div className={s.roster}>
          {data && !error && !loading ? (
            students.length === 0 ? (
              <div className={s.empty}>
                <h2>등록된 학생이 없습니다</h2>
                <p>
                  반에 학생을 등록하면 여기에서 학습 계획을 설정할 수 있습니다.
                </p>
                <Link href="/classes">반 관리 열기 →</Link>
              </div>
            ) : visible.length === 0 ? (
              <div className={s.empty}>
                <h2>조건에 맞는 학생이 없습니다</h2>
                <p>검색어나 학습 상태를 바꿔 보세요.</p>
                <button
                  type="button"
                  className={s.button}
                  onClick={() => {
                    setQuery("");
                    setClassId("");
                    setFilter("all");
                  }}
                >
                  필터 초기화
                </button>
              </div>
            ) : (
              <div
                className={s.tableScroll}
                role="region"
                aria-label="학생 학습 현황 표"
                tabIndex={0}
              >
                <table className={s.table}>
                  <caption className={s.srOnly}>
                    학생별 계정, 학습 진도, 오늘의 진행 상황
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">학생 / 반</th>
                      <th scope="col">상태 / 계정</th>
                      <th scope="col">학습 진도</th>
                      <th scope="col">오늘 풀이</th>
                      <th scope="col">복습</th>
                      <th scope="col">마지막 활동</th>
                      <th scope="col">자동 학습</th>
                      <th scope="col">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((student) => (
                      <tr
                        key={enrollmentKey(student)}
                        data-selected={
                          selected
                            ? enrollmentKey(selected) === enrollmentKey(student)
                            : false
                        }
                      >
                        <th scope="row">
                          <button
                            type="button"
                            className={`${s.studentButton} ${nameSelectionClass(selected ? enrollmentKey(selected) === enrollmentKey(student) : false)}`}
                            aria-label={`${student.name} 학습 현황 열기`}
                            aria-expanded={
                              selected
                                ? enrollmentKey(selected) ===
                                  enrollmentKey(student)
                                : false
                            }
                            aria-controls={panelId}
                            onClick={(event) => {
                              openStudent(student, event.currentTarget);
                            }}
                          >
                            <span className={s.studentIdentity}>
                              <strong>{student.name}</strong>
                              <span className={s.subline}>
                                {student.className} ·{" "}
                                {student.classGrade || "학년 확인 필요"}
                              </span>
                            </span>
                            <Icon name="chevron" size={15} />
                          </button>
                        </th>
                        <td>
                          <div className={s.studentState}>
                            {!student.plan ? (
                              <button
                                type="button"
                                className={`${s.status} ${s.setupStatus}`}
                                aria-label={`${student.name} 시작 진도 설정`}
                                aria-controls={panelId}
                                aria-expanded={
                                  (selected
                                    ? enrollmentKey(selected) ===
                                      enrollmentKey(student)
                                    : false) && detailView === "plan"
                                }
                                onClick={(event) =>
                                  openStudent(student, event.currentTarget)
                                }
                              >
                                {targets.primary.has(student.id)
                                  ? "설정 필요"
                                  : "보충학습 설정"}{" "}
                                <Icon name="chevron" size={13} />
                              </button>
                            ) : (
                              <span
                                className={s.status}
                                data-status={student.summary.status}
                              >
                                {STATUS[student.summary.status]}
                              </span>
                            )}
                            {!student.hasAccount && accountHref(student) ? (
                              <Link
                                className={s.accountLink}
                                href={accountHref(student) ?? "#"}
                                aria-label="계정 확인 필요 · 계정 관리 ↗"
                              >
                                <Icon name="warning" size={14} />
                                계정 확인
                                <Icon name="chevron" size={12} />
                              </Link>
                            ) : (
                              <span
                                className={
                                  student.hasAccount ? s.srOnly : s.muted
                                }
                              >
                                {student.hasAccount
                                  ? "계정 사용 가능"
                                  : "계정 확인에는 반 관리 권한이 필요합니다"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={s.sectionCell}>
                          {student.plan || student.summary.currentSectionId ? (
                            <>
                              <strong>
                                {sectionName(student.summary.currentSectionId)}
                              </strong>
                              <span className={s.subline}>
                                시작 {sectionName(student.plan?.startSectionId)}
                              </span>
                            </>
                          ) : (
                            <span className={s.unset}>진도 설정 전</span>
                          )}
                        </td>
                        <td>
                          {student.plan || student.summary.todayAnswered > 0 ? (
                            <>
                              <strong>
                                {student.summary.todayAnswered} /{" "}
                                {student.summary.todayGoal}
                              </strong>
                              <progress
                                aria-label={`${student.name} 오늘 진행률`}
                                value={Math.min(
                                  student.summary.todayAnswered,
                                  student.summary.todayGoal,
                                )}
                                max={student.summary.todayGoal}
                              />
                              <span className={s.subline}>
                                정답 {student.summary.todayCorrect}문제
                              </span>
                            </>
                          ) : (
                            <span className={s.unset}>학습 전</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              student.summary.dueCount ? s.reviewCount : s.unset
                            }
                          >
                            {student.summary.dueCount
                              ? `${student.summary.dueCount}개`
                              : "없음"}
                          </span>
                        </td>
                        <td
                          className={
                            !student.summary.lastPracticedAt
                              ? s.unset
                              : undefined
                          }
                        >
                          {dateTime(student.summary.lastPracticedAt)}
                        </td>
                        <td>
                          <span
                            className={s.automation}
                            data-enabled={student.plan?.enabled ?? false}
                          >
                            {student.plan
                              ? student.plan.enabled
                                ? "켜짐"
                                : "일시정지"
                              : "미설정"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={
                              student.plan ? s.rowButton : s.setupButton
                            }
                            aria-label={`${student.name} ${student.plan ? "상세 보기" : "진도 설정"}`}
                            aria-expanded={
                              selected
                                ? enrollmentKey(selected) ===
                                  enrollmentKey(student)
                                : false
                            }
                            aria-controls={panelId}
                            onClick={(event) => {
                              openStudent(student, event.currentTarget);
                            }}
                          >
                            {student.plan ? "상세 보기" : "진도 설정"}{" "}
                            <Icon name="chevron" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>
        {selected &&
        students.some(
          (row) => enrollmentKey(row) === enrollmentKey(selected),
        ) ? (
          <StudentDetail
            key={enrollmentKey(selected)}
            id={panelId}
            student={selected}
            admin={admin}
            branchId={branchId}
            textbookEnabled={textbookEnabled}
            view={detailView}
            onViewChange={(view) => guard(() => setDetailView(view))}
            onClose={() => guard(close)}
            onStudentUpdate={updateRow}
            controlRef={controlRef}
            accountHref={accountHref(selected)}
            supplementary={!targets.primary.has(selected.id)}
          />
        ) : null}
      </div>
    </div>
  );
}

type DetailView =
  | "overview"
  | "sections"
  | "activity"
  | "attempts"
  | "plan"
  | "textbook"
  | "explorers";
const VIEWS: [DetailView, string][] = [
  ["overview", "개요"],
  ["sections", "소단원 분석"],
  ["activity", "일별 활동"],
  ["attempts", "풀이 기록"],
  ["plan", "학습 설정"],
  ["explorers", "탐험 설정"],
  ["textbook", "교재·백지"],
];

function StudentDetail({
  id,
  student,
  admin,
  branchId,
  textbookEnabled,
  view,
  onViewChange: setView,
  onClose,
  onStudentUpdate,
  controlRef,
  accountHref,
  supplementary,
}: {
  id: string;
  student: CourseRosterStudent;
  admin: boolean;
  branchId?: string;
  textbookEnabled: boolean;
  view: DetailView;
  onViewChange: (view: DetailView) => void;
  onClose: () => void;
  onStudentUpdate: (student: CourseRosterStudent) => void;
  controlRef: MutableRefObject<PlanControl | null>;
  accountHref: string | null;
  supplementary: boolean;
}) {
  const [detail, setDetail] = useState<CourseStudentDetail | null>(null);
  const [form, setForm] = useState<{
    plan: CoursePlan | null;
    revision: number;
    key: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Failure | null>(null);
  const [saveError, setSaveError] = useState<Failure | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [wrongOnly, setWrongOnly] = useState(false);
  const [reload, setReload] = useState(0);
  const title = useRef<HTMLHeadingElement | null>(null);
  const active = useRef(false);
  const saving = useRef(false);
  const draft = useRef<CoursePlanInput | null>(null);
  const dirty = useRef(false);
  const explorerControl = useRef<PlanControl | null>(null);
  const onDirtyChange = useCallback(
    (changed: boolean, input: CoursePlanInput | null) => {
      dirty.current = changed;
      draft.current = input;
    },
    [],
  );
  const request = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  const updateRef = useRef(onStudentUpdate);
  useEffect(() => {
    updateRef.current = onStudentUpdate;
  }, [onStudentUpdate]);
  useEffect(() => {
    active.current = true;
    title.current?.focus();
    return () => {
      active.current = false;
      request.current += 1;
    };
  }, []);
  useEffect(() => {
    const token = ++request.current;
    void (
      branchId
        ? getCourseStudentDetail(student.id, student.classId, branchId)
        : getCourseStudentDetail(student.id, student.classId)
    ).then((result) => {
      if (!active.current || request.current !== token) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result);
        return;
      }
      if (
        result.data.student.id !== student.id ||
        result.data.student.classId !== student.classId
      ) {
        setLoadError({
          status: 0,
          message: "학생 기록이 일치하지 않습니다. 다시 불러오세요.",
        });
        return;
      }
      setDetail(result.data);
      setLoadError(null);
      setSaveError(null);
      setConflict(false);
      setMessage((previous) =>
        previous === "학습 계획을 저장했습니다. 최신 상세 기록을 불러옵니다."
          ? "학습 계획을 저장했습니다."
          : previous,
      );
      setNow(Date.now());
      setForm(
        (previous) =>
          previous ?? {
            plan: result.data.student.plan,
            revision: result.data.student.revision,
            key: 0,
          },
      );
      updateRef.current(result.data.student);
    });
    return () => {
      request.current += 1;
    };
  }, [student.id, student.classId, branchId, reload]);

  function refresh() {
    setLoading(true);
    setLoadError(null);
    setMessage(
      conflict ? "최신 기록을 불러옵니다. 입력한 학습 계획은 유지됩니다." : "",
    );
    setReload((value) => value + 1);
  }
  const save = useCallback(
    async (input: CoursePlanInput): Promise<boolean> => {
      if (!detail || loading || loadError || conflict || saving.current)
        return false;
      saving.current = true;
      setBusy(true);
      setMessage("");
      setSaveError(null);
      const result = await saveCourseStudentPlan(
        student.id,
        {
          ...input,
          expectedRevision: detail.student.revision,
        },
        student.classId,
        ...(branchId ? [branchId] : []),
      );
      if (
        result.ok &&
        result.data.id === student.id &&
        result.data.classId === student.classId
      )
        updateRef.current(result.data);
      if (!active.current) return false;
      saving.current = false;
      setBusy(false);
      if (!result.ok) {
        setSaveError(result);
        if (result.code === "REVISION_MISMATCH") setConflict(true);
        return false;
      }
      if (
        result.data.id !== student.id ||
        result.data.classId !== student.classId
      ) {
        setSaveError({
          status: 0,
          message: "저장한 학생 기록이 일치하지 않습니다. 다시 불러오세요.",
        });
        return false;
      }
      dirty.current = false;
      setDetail((previous) =>
        previous
          ? {
              ...previous,
              student: sharedCourseState(previous.student, result.data),
            }
          : previous,
      );
      setForm((previous) => ({
        plan: result.data.plan,
        revision: result.data.revision,
        key: (previous?.key ?? 0) + 1,
      }));
      setMessage("학습 계획을 저장했습니다. 최신 상세 기록을 불러옵니다.");
      setLoading(true);
      setReload((value) => value + 1);
      return true;
    },
    [
      detail,
      loading,
      loadError,
      conflict,
      student.id,
      student.classId,
      branchId,
    ],
  );
  useImperativeHandle(
    controlRef,
    () => ({
      get dirty() {
        return view === "explorers"
          ? (explorerControl.current?.dirty ?? false)
          : dirty.current;
      },
      get busy() {
        return saving.current || (explorerControl.current?.busy ?? false);
      },
      save: () =>
        view === "explorers"
          ? (explorerControl.current?.save() ?? Promise.resolve(false))
          : draft.current
            ? save(draft.current)
            : Promise.resolve(false),
      discard: () => {
        if (view === "explorers") {
          explorerControl.current?.discard();
          return;
        }
        dirty.current = false;
        setForm((previous) =>
          previous ? { ...previous, key: previous.key + 1 } : previous,
        );
      },
    }),
    [save, view],
  );

  const record = detail?.student;
  const reports = detail
    ? [...detail.sections].sort((a, b) => {
        const aDue = Date.parse(a.nextReviewAt) <= now;
        const bDue = Date.parse(b.nextReviewAt) <= now;
        return (
          Number(bDue) - Number(aDue) ||
          a.estimatedRecall - b.estimatedRecall ||
          a.mastery - b.mastery
        );
      })
    : [];
  const attempts =
    detail?.recentAttempts.filter(
      (attempt) => !wrongOnly || !attempt.correct,
    ) ?? [];

  return (
    <section
      id={id}
      className={s.detail}
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={s.detailHeader}>
        <div>
          <h2 id={`${id}-title`} ref={title} tabIndex={-1}>
            {student.name} · 학습 상세
          </h2>
          <p className={s.muted}>
            {student.className} ·{" "}
            {student.hasAccount ? "계정 사용 가능" : "계정 확인 필요"}
          </p>
        </div>
        <button
          type="button"
          className={s.button}
          onClick={onClose}
          aria-label="학생 상세 닫기"
        >
          닫기 <Icon name="close" size={16} />
        </button>
      </header>
      <p className={s.detailHint}>
        목록의 다른 학생을 선택해 비교할 수 있습니다. Esc로 닫기.
      </p>
      {admin ? (
        <p className={s.adminNote}>
          관리자 보고 · 서버에 저장된 풀이 이력과 계획을 표시합니다. 최근 기록은
          전체 누적 기록과 범위가 다를 수 있습니다.
        </p>
      ) : null}
      <div
        className={s.detailNav}
        role="group"
        aria-label="학생 상세 보기 선택"
      >
        {VIEWS.filter(
          ([value]) =>
            (value !== "textbook" || textbookEnabled) &&
            (value !== "explorers" || admin),
        ).map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={view === value}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={s.detailBody}>
        <div className={s.detailTools}>
          <span className={s.muted}>시간 표시 · 한국 시간</span>
          <button
            type="button"
            className={s.textButton}
            onClick={refresh}
            disabled={loading || busy}
          >
            상세 새로고침
          </button>
        </div>
        {loading ? (
          <p role="status" className={s.notice}>
            상세 기록을 불러오는 중…
          </p>
        ) : null}
        {message ? (
          <p role="status" className={s.success}>
            {message}
          </p>
        ) : null}
        {loadError ? <ErrorNotice error={loadError} /> : null}
        {saveError ? <ErrorNotice error={saveError} /> : null}
        {conflict ? (
          <div className={s.conflict}>
            <p>
              다른 곳에서 기록이 변경되었습니다. 입력한 계획은 유지됩니다. 최신
              기록을 불러와 확인한 뒤 다시 저장해 주세요.
            </p>
            <button
              type="button"
              className={s.button}
              disabled={loading}
              onClick={refresh}
            >
              최신 기록 불러오기 · 입력 유지
            </button>
          </div>
        ) : null}

        {detail && record && !loadError && !loading ? (
          <>
            {view === "explorers" && admin ? (
              <ExplorerTeacherSettings
                student={student}
                branchId={branchId}
                controlRef={explorerControl}
                onSaved={() => setReload((value) => value + 1)}
              />
            ) : null}
            {view === "textbook" && textbookEnabled ? (
              <TextbookStudentEvidence
                key={enrollmentKey(student)}
                studentId={student.id}
                refreshKey={reload}
              />
            ) : null}
            {view === "overview" ? (
              <section aria-label="학습 개요">
                <div className={s.overviewHeading}>
                  <span
                    className={s.status}
                    data-status={record.summary.status}
                  >
                    {STATUS[record.summary.status]}
                  </span>
                  <span>
                    자동 학습{" "}
                    {record.plan
                      ? record.plan.enabled
                        ? "켜짐"
                        : "일시정지"
                      : "미설정"}
                  </span>
                </div>
                <dl className={s.facts}>
                  <div>
                    <dt>시작 소단원</dt>
                    <dd>{sectionName(record.plan?.startSectionId)}</dd>
                  </div>
                  <div>
                    <dt>현재 소단원</dt>
                    <dd>{sectionName(record.summary.currentSectionId)}</dd>
                  </div>
                  <div>
                    <dt>오늘 풀이 / 목표</dt>
                    <dd>
                      {record.summary.todayAnswered} /{" "}
                      {record.summary.todayGoal}문제 · 정답{" "}
                      {record.summary.todayCorrect}문제
                    </dd>
                  </div>
                  <div>
                    <dt>완료 소단원 / 복습 도래</dt>
                    <dd>
                      {record.summary.completedSections}개 /{" "}
                      {record.summary.dueCount}개
                    </dd>
                  </div>
                  <div>
                    <dt>마지막 학습</dt>
                    <dd>{dateTime(record.summary.lastPracticedAt)}</dd>
                  </div>
                  <div>
                    <dt>다음 복습</dt>
                    <dd>
                      {record.summary.nextReviewAt
                        ? dateTime(record.summary.nextReviewAt)
                        : "예정 없음"}
                    </dd>
                  </div>
                </dl>
                {record.summary.recommendation ? (
                  <div className={s.recommendation}>
                    <strong>
                      다음 학습 ·{" "}
                      {sectionName(record.summary.recommendation.sectionId)}
                    </strong>
                    <p>{record.summary.recommendation.reason}</p>
                  </div>
                ) : null}
                {!record.hasAccount ? (
                  <AccountNotice student={record} href={accountHref} />
                ) : null}
                <button
                  type="button"
                  className={s.primaryButton}
                  onClick={() => setView("plan")}
                >
                  {record.plan ? "학습 계획 수정" : "시작 진도 설정"}
                </button>
                <h3 className={s.sectionHeading}>
                  최근 학습 세션 <small>{detail.recentSessions.length}건</small>
                </h3>
                {detail.recentSessions.length ? (
                  <div
                    className={s.tableScroll}
                    tabIndex={0}
                    role="region"
                    aria-label="최근 학습 세션 표"
                  >
                    <table className={s.reportTable}>
                      <thead>
                        <tr>
                          <th scope="col">소단원 / 유형</th>
                          <th scope="col">풀이 / 정답 / 힌트</th>
                          <th scope="col">시작 / 완료</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.recentSessions.map((session) => (
                          <tr key={session.id}>
                            <th scope="row">
                              {sectionName(session.sectionId)}
                              <span className={s.subline}>
                                {session.mode === "review" ? "복습" : "새 학습"}
                              </span>
                            </th>
                            <td>
                              {session.answered} / {session.correct} /{" "}
                              {session.hinted}
                            </td>
                            <td>
                              {dateTime(session.startedAt)}
                              <span className={s.subline}>
                                {session.completedAt
                                  ? dateTime(session.completedAt)
                                  : "진행 중"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={s.emptyReport}>아직 학습 세션이 없습니다.</p>
                )}
              </section>
            ) : null}

            {view === "sections" ? (
              <section aria-label="소단원별 기억 분석">
                <h3>복습 도래 · 기억이 약한 소단원</h3>
                <p className={s.muted}>
                  복습 시점이 지난 소단원부터, 기억 추정치가 낮은 순으로
                  표시합니다. 숙련도와 기억 유지율은 풀이·힌트·학습 간격을
                  반영한 추정값이며 실제 기억을 측정한 결과가 아닙니다.
                </p>
                {reports.length ? (
                  <div
                    className={s.tableScroll}
                    tabIndex={0}
                    role="region"
                    aria-label="소단원 분석 표"
                  >
                    <table className={s.reportTable}>
                      <thead>
                        <tr>
                          <th scope="col">소단원</th>
                          <th scope="col">
                            숙련도 / 기억 유지율
                            <br />
                            (추정)
                          </th>
                          <th scope="col">풀이 / 정답</th>
                          <th scope="col">독립 정답 / 힌트 사용 / 자기평가</th>
                          <th scope="col">완료 세션</th>
                          <th scope="col">최근 / 다음 복습</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((section) => (
                          <tr key={section.sectionId}>
                            <th scope="row">
                              {sectionName(section.sectionId)}
                              {Date.parse(section.nextReviewAt) <= now ? (
                                <span className={s.subline}>
                                  <strong className={s.due}>복습 도래</strong>
                                </span>
                              ) : null}
                            </th>
                            <td>
                              <strong>
                                {Math.round(section.mastery)}% /{" "}
                                {Math.round(section.estimatedRecall)}%
                              </strong>
                              <span className={s.subline}>
                                안정성 추정 {section.stabilityDays.toFixed(1)}일
                              </span>
                            </td>
                            <td>
                              {section.attempts} / {section.correct}
                            </td>
                            <td>
                              {section.unaidedCorrect} / {section.hinted} /{" "}
                              {section.selfAssessed}
                            </td>
                            <td>{section.completedSessions}</td>
                            <td>
                              {dateTime(section.lastReviewedAt)}
                              <span className={s.subline}>
                                {dateTime(section.nextReviewAt)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={s.emptyReport}>
                    풀이가 쌓이면 소단원별 추정치가 표시됩니다.
                  </p>
                )}
              </section>
            ) : null}

            {view === "activity" ? (
              <section aria-label="일별 학습 활동">
                <h3>일별 학습 활동</h3>
                <p className={s.muted}>
                  서버가 제공한 {detail.activity.length}일의 기록입니다. 독립
                  정답은 힌트 없이 맞힌 풀이이며, 힌트 사용은 정오와 관계없이
                  집계됩니다.
                </p>
                {detail.activity.length ? (
                  <div
                    className={s.tableScroll}
                    tabIndex={0}
                    role="region"
                    aria-label="일별 활동 표"
                  >
                    <table className={s.reportTable}>
                      <thead>
                        <tr>
                          <th scope="col">날짜 (한국 시간)</th>
                          <th scope="col">풀이</th>
                          <th scope="col">정답</th>
                          <th scope="col">독립 정답</th>
                          <th scope="col">힌트 사용</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...detail.activity]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((day) => (
                            <tr key={day.date}>
                              <th scope="row">{day.date}</th>
                              <td>{day.answered}</td>
                              <td>{day.correct}</td>
                              <td>{day.unaidedCorrect}</td>
                              <td>{day.hinted}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={s.emptyReport}>
                    표시할 일별 활동 기록이 없습니다.
                  </p>
                )}
              </section>
            ) : null}

            {view === "attempts" ? (
              <section aria-label="최근 풀이 기록">
                <div className={s.attemptHeading}>
                  <h3>
                    최근 풀이 <small>{detail.recentAttempts.length}건</small>
                  </h3>
                  <label>
                    <input
                      type="checkbox"
                      checked={wrongOnly}
                      onChange={(event) => setWrongOnly(event.target.checked)}
                    />{" "}
                    오답만 보기
                  </label>
                </div>
                <p className={s.muted}>
                  문제 본문과 실제 제출 답안을 표시합니다. 자기평가 문제의
                  정오는 학생이 판단한 결과입니다.
                </p>
                {attempts.length ? (
                  <ol className={s.attempts}>
                    {attempts.map((attempt) => (
                      <li key={`${attempt.sessionId}-${attempt.problemId}`}>
                        <div className={s.attemptMeta}>
                          <strong
                            className={attempt.correct ? s.correct : s.due}
                          >
                            {attempt.correct ? "정답" : "오답"}
                          </strong>
                          <span>
                            {attempt.usedHint ? "힌트 사용" : "힌트 없음"}
                            {attempt.selfAssessed ? " · 자기평가" : ""}
                          </span>
                          <time dateTime={attempt.answeredAt}>
                            {dateTime(attempt.answeredAt)}
                          </time>
                        </div>
                        <p className={s.muted}>
                          {sectionName(attempt.sectionId)}
                        </p>
                        <div className={s.problem}>
                          <ProblemContent content={attempt.content} />
                        </div>
                        <div className={s.answer}>
                          <strong>제출 답안</strong>
                          <MathText
                            text={attempt.submittedAnswer || "(답안 없음)"}
                            as="div"
                          />
                        </div>
                        <div className={s.expectedAnswer}>
                          <strong>정답</strong>
                          <MathText text={attempt.answer} as="div" />
                        </div>
                        {attempt.solution ? (
                          <details className={s.solution}>
                            <summary>해설 보기</summary>
                            <MathText
                              text={solutionForDisplay(attempt.solution) ?? ""}
                              as="div"
                            />
                          </details>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className={s.emptyReport}>
                    <p>
                      {wrongOnly
                        ? "최근 기록에 오답이 없습니다."
                        : "아직 제출한 풀이가 없습니다."}
                    </p>
                    {wrongOnly && detail.recentAttempts.length > 0 ? (
                      <button
                        type="button"
                        className={s.button}
                        onClick={() => setWrongOnly(false)}
                      >
                        전체 풀이 보기
                      </button>
                    ) : null}
                  </div>
                )}
              </section>
            ) : null}
          </>
        ) : null}

        {form ? (
          <section hidden={view !== "plan"} aria-label="학생 학습 계획">
            <h3>
              {supplementary
                ? "보충학습 · 시작 진도와 자동 학습"
                : "시작 진도와 자동 학습"}
            </h3>
            {supplementary ? (
              <p className={s.muted}>
                반 등록 학년이 초3–초6으로 확인되지 않았습니다. 보충학습 계획을
                저장하면 계획 대상에 포함됩니다. 기존 계획과 이력은 유지됩니다.
              </p>
            ) : null}
            <fieldset
              className={s.planGuard}
              disabled={loading || conflict || !!loadError}
            >
              <legend className={s.srOnly}>학습 계획 입력</legend>
              <CoursePlanForm
                key={form.key}
                plan={form.plan}
                revision={form.revision}
                busy={busy}
                onSave={save}
                onDirtyChange={onDirtyChange}
                submitLabel="학습 계획 저장"
              />
            </fieldset>
            <p className={s.muted}>
              변경한 계획은 저장 후 적용됩니다. 최신 기록을 불러와도 저장 전
              입력은 유지됩니다.
            </p>
            {record && !record.hasAccount ? (
              <AccountNotice student={record} href={accountHref} />
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}

function ExplorerTeacherSettings({
  student,
  branchId,
  controlRef,
  onSaved,
}: {
  student: CourseRosterStudent;
  branchId?: string;
  controlRef: MutableRefObject<PlanControl | null>;
  onSaved: () => void;
}) {
  const [settings, setSettings] = useState<ExplorerSettings | null>(null);
  const [grade, setGrade] = useState(3);
  const [unitId, setUnitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const active = useRef(false);
  const saving = useRef(false);
  const onSavedRef = useRef(onSaved);
  const id = useId();
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);
  const selectedUnit = settings?.units.find(
    (unit) =>
      unit.id === settings.goalUnitId && unit.grade === settings.courseGrade,
  );
  const initialUnitId = selectedUnit?.id ?? "";
  const dirty =
    !!settings && (grade !== settings.courseGrade || unitId !== initialUnitId);
  useEffect(() => {
    let current = true;
    active.current = true;
    void getExplorerTeacherSettings(student.id, student.classId, branchId).then(
      (result) => {
        if (!current) return;
        setLoading(false);
        if (!result.ok) {
          setError(result);
          return;
        }
        if (result.data.studentId !== student.id) {
          setError({
            status: 0,
            message: "학생 설정이 일치하지 않습니다. 다시 불러오세요.",
          });
          return;
        }
        setSettings(result.data);
        setGrade(result.data.courseGrade);
        setUnitId(
          result.data.goalUnitId &&
            result.data.units.some(
              (unit) =>
                unit.id === result.data.goalUnitId &&
                unit.grade === result.data.courseGrade,
            )
            ? result.data.goalUnitId
            : "",
        );
        setError(null);
      },
    );
    return () => {
      current = false;
      active.current = false;
    };
  }, [student.id, student.classId, branchId, reload]);
  const save = useCallback(async () => {
    if (!settings || !unitId || loading || settings.locked || saving.current)
      return false;
    saving.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    const result = await saveExplorerTeacherSettings(
      student.id,
      student.classId,
      {
        expectedRevision: settings.revision,
        courseGrade: grade,
        goalUnitId: unitId,
      },
      branchId,
    );
    if (!active.current) return false;
    saving.current = false;
    setBusy(false);
    if (!result.ok) {
      setError(result);
      return false;
    }
    if (result.data.studentId !== student.id) {
      setError({
        status: 0,
        message: "저장한 학생 설정이 일치하지 않습니다. 다시 불러오세요.",
      });
      return false;
    }
    setSettings(result.data);
    setGrade(result.data.courseGrade);
    setUnitId(result.data.goalUnitId ?? "");
    setMessage(
      "탐험 학년과 목표 단원을 저장했습니다. 학생이 다음 탐험에서 이어갑니다.",
    );
    onSavedRef.current();
    return true;
  }, [settings, unitId, loading, grade, student.id, student.classId, branchId]);
  useImperativeHandle(
    controlRef,
    () => ({
      dirty,
      get busy() {
        return saving.current;
      },
      save,
      discard: () => {
        if (settings) {
          setGrade(settings.courseGrade);
          setUnitId(initialUnitId);
        }
      },
    }),
    [dirty, save, settings, initialUnitId],
  );
  const refresh = () => {
    setLoading(true);
    setReload((value) => value + 1);
  };
  return (
    <section aria-label="탐험 학년과 목표 단원 설정">
      <p className={formStyles.note}>
        학생의 탐험 화면에 표시되는 학년과 목표 단원입니다. 모은 카드와 학습
        기록은 이어집니다.
      </p>
      {loading ? (
        <p role="status" className={s.notice}>
          탐험 설정을 불러오는 중…
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      {message ? (
        <p role="status" className={s.success}>
          {message}
        </p>
      ) : null}
      {settings?.locked ? (
        <p className={s.notice}>
          진행 중인 학습과 오답 복습을 마친 뒤 목표를 바꿀 수 있습니다.
        </p>
      ) : null}
      {settings ? (
        <form
          className={formStyles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset
            className={formStyles.fields}
            disabled={loading || busy || settings.locked}
          >
            <legend className={formStyles.legend}>탐험 목표</legend>
            <div className={formStyles.grid}>
              <label htmlFor={`${id}-grade`}>
                탐험 학년
                <select
                  id={`${id}-grade`}
                  value={grade}
                  onChange={(event) => {
                    setGrade(Number(event.target.value));
                    setUnitId("");
                    setMessage("");
                  }}
                >
                  {[3, 4, 5, 6, 7, 8, 9].map((value) => (
                    <option key={value} value={value}>
                      {value < 7
                        ? `초등 ${value}학년`
                        : `중학교 ${value - 6}학년`}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${id}-unit`}>
                목표 단원
                <select
                  id={`${id}-unit`}
                  value={unitId}
                  required
                  onChange={(event) => {
                    setUnitId(event.target.value);
                    setMessage("");
                  }}
                >
                  <option value="">목표 단원 선택</option>
                  {settings.units
                    .filter((unit) => unit.grade === grade)
                    .map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </fieldset>
          <button
            type="submit"
            className={formStyles.submit}
            disabled={!dirty || !unitId || loading || busy || settings.locked}
          >
            {busy ? "저장 중…" : "탐험 설정 저장"}
          </button>
        </form>
      ) : null}
      <button
        type="button"
        className={s.textButton}
        disabled={busy || loading || dirty}
        onClick={refresh}
      >
        탐험 설정 새로고침
      </button>
      {error?.status === 409 ? (
        <p className={formStyles.note}>
          입력은 유지됩니다. 변경을 취소하고 최신 설정을 불러온 뒤 다시 저장해
          주세요.
        </p>
      ) : null}
      {dirty ? (
        <button
          type="button"
          className={s.textButton}
          disabled={busy}
          onClick={() => {
            if (settings) {
              setGrade(settings.courseGrade);
              setUnitId(initialUnitId);
            }
          }}
        >
          탐험 설정 변경 취소
        </button>
      ) : null}
    </section>
  );
}

function AccountNotice({
  student,
  href,
}: {
  student: CourseRosterStudent;
  href: string | null;
}) {
  return (
    <div className={s.accountNotice}>
      <strong>학생 계정을 확인해 주세요</strong>
      <p>
        계정 미발급 또는 사용 중지 상태입니다. 학습 계획은 미리 설정할 수
        있습니다. 반 관리에서 계정을 발급하거나 사용 상태를 확인해 주세요.
      </p>
      {href ? (
        <Link className={s.noticeAction} href={href}>
          {student.className} · 계정 확인하러 가기{" "}
          <Icon name="arrow" size={16} />
        </Link>
      ) : (
        <p>
          계정 확인에는 반 관리 권한이 필요합니다. 지점 관리자에게 요청하세요.
        </p>
      )}
    </div>
  );
}
