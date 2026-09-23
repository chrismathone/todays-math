"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type {
  CourseDashboard as DashboardData,
  CoursePlan,
  CoursePlanInput,
  CourseRosterStudent,
  CourseStudentDetail,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import CoursePlanForm from "./CoursePlanForm";
import {
  getCourseDashboard,
  getCourseStudentDetail,
  saveCourseStudentPlan,
} from "./courseApi";
import s from "./course-dashboard.module.css";

const STATUS: Record<CourseSummary["status"], string> = {
  setup: "설정 필요",
  paused: "일시정지",
  learning: "학습 중",
  review: "복습 필요",
  ready: "시작 가능",
  done: "오늘 종료",
  complete: "과정 완료",
};
type Filter = "all" | "account" | CourseSummary["status"];
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
function matches(student: CourseRosterStudent, filter: Filter) {
  return filter === "all"
    ? true
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
}: {
  admin?: boolean;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Failure | null>(null);
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CourseRosterStudent | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    let current = true;
    void getCourseDashboard().then((result) => {
      if (!current) return;
      setLoading(false);
      if (!result.ok) {
        setError(result);
        return;
      }
      setError(null);
      // A list request begun before a plan save must not overwrite that save.
      setData((previous) => {
        const previousRows = new Map(
          previous?.students.map((row) => [row.id, row]),
        );
        return {
          ...result.data,
          students: result.data.students.map((row) => {
            const prior = previousRows.get(row.id);
            return prior && prior.revision > row.revision ? prior : row;
          }),
        };
      });
    });
    return () => {
      current = false;
    };
  }, [reload]);

  const students = data?.students ?? [];
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  const inScope = students.filter(
    (student) =>
      (!classId || student.classId === classId) &&
      `${student.name} ${student.className}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalized),
  );
  const visible = inScope.filter((student) => matches(student, filter));
  const filters: [Filter, string][] = [
    ["all", "전체"],
    ...(Object.entries(STATUS) as [CourseSummary["status"], string][]),
    ["account", "계정 확인 필요"],
  ];
  const refresh = () => {
    setLoading(true);
    setError(null);
    setReload((value) => value + 1);
  };
  const updateRow = (student: CourseRosterStudent) => {
    setData((previous) =>
      previous
        ? {
            ...previous,
            students: previous.students.map((row) =>
              row.id === student.id && row.revision <= student.revision
                ? student
                : row,
            ),
          }
        : previous,
    );
  };
  const close = () => {
    setSelected(null);
    if (opener.current?.isConnected) opener.current.focus();
    else heading.current?.focus();
  };

  return (
    <div className={s.dashboard}>
      <header className={s.header}>
        <div>
          <h1 ref={heading} tabIndex={-1}>
            {admin ? "SRS 현황 · 관리자" : "SRS 현황"}
          </h1>
          <p className={s.scope}>지원 교육과정 초3–초6 · 한국 시간 기준</p>
        </div>
        <button
          type="button"
          className={s.button}
          onClick={refresh}
          disabled={loading}
        >
          목록 새로고침
        </button>
      </header>

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
                {students.filter((row) => row.plan).length}
                <small> / {students.length}명</small>
              </dd>
            </div>
            <div>
              <dt>설정 필요</dt>
              <dd>
                {students.filter((row) => !row.plan).length}
                <small>명</small>
              </dd>
            </div>
            <div>
              <dt>복습 도래</dt>
              <dd>
                {students.filter((row) => row.summary.dueCount > 0).length}
                <small>명</small>
              </dd>
            </div>
            <div>
              <dt>오늘 종료</dt>
              <dd>
                {
                  students.filter(
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
                  {data.classes.map((item) => (
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
                    {inScope.filter((row) => matches(row, value)).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <p className={s.resultCount} aria-live="polite">
            <span>
              학생 <strong>{visible.length}명</strong> / 전체 {students.length}
              명
            </span>
            <span>요약 수치는 전체 학생 기준</span>
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
                      <th scope="col">시작 → 현재 소단원</th>
                      <th scope="col">오늘 풀이</th>
                      <th scope="col">복습</th>
                      <th scope="col">마지막 활동</th>
                      <th scope="col">자동 학습</th>
                      <th scope="col">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((student) => (
                      <tr
                        key={student.id}
                        data-selected={selected?.id === student.id}
                      >
                        <th scope="row">
                          <button
                            type="button"
                            className={s.studentButton}
                            aria-label={`${student.name} 학습 현황 열기`}
                            aria-expanded={selected?.id === student.id}
                            aria-controls={panelId}
                            onClick={(event) => {
                              opener.current = event.currentTarget;
                              setSelected(student);
                            }}
                          >
                            <strong>{student.name}</strong>
                            <span className={s.subline}>
                              {student.className}
                            </span>
                          </button>
                        </th>
                        <td>
                          <span
                            className={s.status}
                            data-status={student.summary.status}
                          >
                            {STATUS[student.summary.status]}
                          </span>
                          <span className={s.subline}>
                            {student.hasAccount ? (
                              "계정 사용 가능"
                            ) : (
                              <Link
                                href={`/classes/${encodeURIComponent(student.classId)}`}
                              >
                                계정 확인 필요 · 계정 관리 ↗
                              </Link>
                            )}
                          </span>
                        </td>
                        <td className={s.sectionCell}>
                          <span className={s.subline}>
                            시작 {sectionName(student.plan?.startSectionId)}
                          </span>
                          <strong>
                            {sectionName(student.summary.currentSectionId)}
                          </strong>
                        </td>
                        <td>
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
                        </td>
                        <td>
                          <strong
                            className={
                              student.summary.dueCount ? s.due : undefined
                            }
                          >
                            {student.summary.dueCount}개
                          </strong>
                        </td>
                        <td>{dateTime(student.summary.lastPracticedAt)}</td>
                        <td>
                          {student.plan
                            ? student.plan.enabled
                              ? "켜짐"
                              : "일시정지"
                            : "미설정"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={s.rowButton}
                            aria-label={`${student.name} 상세 보기`}
                            aria-expanded={selected?.id === student.id}
                            aria-controls={panelId}
                            onClick={(event) => {
                              opener.current = event.currentTarget;
                              setSelected(student);
                            }}
                          >
                            상세 보기 <span aria-hidden="true">↗</span>
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
        {selected ? (
          <StudentDetail
            key={selected.id}
            id={panelId}
            student={selected}
            admin={admin}
            onClose={close}
            onStudentUpdate={updateRow}
          />
        ) : null}
      </div>
    </div>
  );
}

type DetailView = "overview" | "sections" | "activity" | "attempts" | "plan";
const VIEWS: [DetailView, string][] = [
  ["overview", "개요"],
  ["sections", "소단원 분석"],
  ["activity", "일별 활동"],
  ["attempts", "풀이 기록"],
  ["plan", "학습 설정"],
];

function StudentDetail({
  id,
  student,
  admin,
  onClose,
  onStudentUpdate,
}: {
  id: string;
  student: CourseRosterStudent;
  admin: boolean;
  onClose: () => void;
  onStudentUpdate: (student: CourseRosterStudent) => void;
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
  const [view, setView] = useState<DetailView>("overview");
  const [wrongOnly, setWrongOnly] = useState(false);
  const [reload, setReload] = useState(0);
  const title = useRef<HTMLHeadingElement | null>(null);
  const active = useRef(false);
  const saving = useRef(false);
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
    void getCourseStudentDetail(student.id).then((result) => {
      if (!active.current || request.current !== token) return;
      setLoading(false);
      if (!result.ok) {
        setLoadError(result);
        return;
      }
      if (result.data.student.id !== student.id) {
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
  }, [student.id, reload]);

  function refresh() {
    setLoading(true);
    setLoadError(null);
    setMessage(
      conflict ? "최신 기록을 불러옵니다. 입력한 학습 계획은 유지됩니다." : "",
    );
    setReload((value) => value + 1);
  }
  async function save(input: CoursePlanInput) {
    if (!detail || loading || loadError || conflict || saving.current) return;
    saving.current = true;
    setBusy(true);
    setMessage("");
    setSaveError(null);
    const result = await saveCourseStudentPlan(student.id, {
      ...input,
      expectedRevision: detail.student.revision,
    });
    if (result.ok && result.data.id === student.id)
      updateRef.current(result.data);
    if (!active.current) return;
    saving.current = false;
    setBusy(false);
    if (!result.ok) {
      setSaveError(result);
      if (result.status === 409) setConflict(true);
      return;
    }
    if (result.data.id !== student.id) {
      setSaveError({
        status: 0,
        message: "저장한 학생 기록이 일치하지 않습니다. 다시 불러오세요.",
      });
      return;
    }
    setDetail((previous) =>
      previous ? { ...previous, student: result.data } : previous,
    );
    setForm((previous) => ({
      plan: result.data.plan,
      revision: result.data.revision,
      key: (previous?.key ?? 0) + 1,
    }));
    setMessage("학습 계획을 저장했습니다. 최신 상세 기록을 불러옵니다.");
    setLoading(true);
    setReload((value) => value + 1);
  }

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
          닫기 <span aria-hidden="true">×</span>
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
        {VIEWS.map(([value, label]) => (
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
                {!record.hasAccount ? <AccountNotice student={record} /> : null}
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
                            <MathText text={attempt.solution} as="div" />
                          </details>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={s.emptyReport}>
                    {wrongOnly
                      ? "최근 기록에 오답이 없습니다."
                      : "아직 제출한 풀이가 없습니다."}
                  </p>
                )}
              </section>
            ) : null}
          </>
        ) : null}

        {form ? (
          <section hidden={view !== "plan"} aria-label="학생 학습 계획">
            <h3>시작 진도와 자동 학습</h3>
            {record && !record.hasAccount ? (
              <AccountNotice student={record} />
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
                submitLabel="학습 계획 저장"
              />
            </fieldset>
            <p className={s.muted}>
              변경한 계획은 저장 후 적용됩니다. 최신 기록을 불러와도 저장 전
              입력은 유지됩니다.
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function AccountNotice({ student }: { student: CourseRosterStudent }) {
  return (
    <div className={s.accountNotice}>
      <strong>학생 계정을 확인해 주세요</strong>
      <p>
        계정 미발급 또는 사용 중지 상태입니다. 학습 계획은 미리 설정할 수
        있습니다. 반 관리에서 계정을 발급하거나 사용 상태를 확인해 주세요.
      </p>
      <Link href={`/classes/${encodeURIComponent(student.classId)}`}>
        {student.className} · 계정 확인하러 가기 →
      </Link>
    </div>
  );
}
