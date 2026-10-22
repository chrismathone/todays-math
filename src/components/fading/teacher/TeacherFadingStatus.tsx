"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  fadingTeacherDashboardResponseSchema,
  fadingTeacherStudentResponseSchema,
  type FadingTeacherDashboard,
  type FadingTeacherFlag,
  type FadingTeacherQuota,
  type FadingTeacherQuotaInput,
  type FadingTeacherStudent,
} from "@/contracts/fadingTeacher.contract";
import { FadingMath } from "../FadingMath";
import { curriculumName } from "../labels";
import type { FadingPreview as PreviewComponent } from "../FadingPreview";
import { TeacherFadingSourceError, type TeacherFadingSource } from "./source";
import type { TeacherHifiVariant } from "./hifiVariants";
import { QuotaCard, RelearnTodayCard } from "./TeacherQuotaCards";
import { teacherWireKey } from "./wireKey";
import s from "./TeacherFadingStatus.module.css";

const FadingPreview = lazy(() =>
  import("../FadingPreview").then((module) => ({
    default: module.FadingPreview,
  })),
);
export type TeacherFadingPreviewData = ComponentProps<typeof PreviewComponent>;
export type TeacherFadingPreviewSource =
  | TeacherFadingPreviewData
  | ((today: string) => Promise<TeacherFadingPreviewData>);
export type TeacherFadingStatusProps = TeacherFadingSource & {
  preview: TeacherFadingPreviewSource;
  initialClass?: string;
  variant?: TeacherHifiVariant;
};
type Row = FadingTeacherDashboard["students"][number];
type ReadState<T> =
  | { key: string; read: () => Promise<T>; kind: "ready"; data: T }
  | { key: string; read: () => Promise<T>; kind: "error"; error: unknown };

/** Ignore responses from a previous scope, selection, retry, or unmounted view. */
function useTeacherRead<T>(key: string, read: () => Promise<T>) {
  const [result, setResult] = useState<ReadState<T> | null>(null);
  useEffect(() => {
    let current = true;
    void Promise.resolve().then(async () => {
      if (!current) return;
      try {
        const data = await read();
        if (current) setResult({ key, read, kind: "ready", data });
      } catch (error) {
        if (current) setResult({ key, read, kind: "error", error });
      }
    });
    return () => {
      current = false;
    };
  }, [key, read]);
  return result?.key === key && result.read === read ? result : null;
}

const FLAG_LABELS: Record<FadingTeacherFlag, string> = {
  "no-account": "계정 없음",
  "not-started": "시작 전",
  overdue: "복습 밀림",
  idle: "오래 쉼",
  "relearn-stop": "보충 필요",
  "quota-check": "분량 점검 필요",
};
function Flags({ flags }: { flags: readonly FadingTeacherFlag[] }) {
  return flags.length ? (
    <span className={s.flags}>
      {flags.map((flag) => (
        <span className={s.flag} data-reason={flag} key={flag}>
          {FLAG_LABELS[flag]}
        </span>
      ))}
    </span>
  ) : (
    <span className={s.muted}>해당 없음</span>
  );
}

function ReadMessage({
  error,
  onRetry,
  detail = false,
}: {
  error?: unknown;
  onRetry?: () => void;
  detail?: boolean;
}) {
  const status =
    error instanceof TeacherFadingSourceError ? error.status : undefined;
  const closed = status === 404;
  const forbidden = status === 403;
  return (
    <div className={s.message} role={error ? "alert" : "status"}>
      {error ? (
        <>
          <h3>
            {closed ? "닫혀 있음" : forbidden ? "권한 없음" : "불러오기 실패"}
          </h3>
          <p>
            {closed
              ? "현재 배포판에서는 오늘의 기억 학생 현황이 열려 있지 않습니다."
              : forbidden
                ? "이 학생 현황을 볼 권한이 없습니다."
                : detail
                  ? "학생 상세를 불러오지 못했습니다."
                  : "학생 현황을 불러오지 못했습니다."}
          </p>
          {!closed && !forbidden && onRetry ? (
            <button className={s.button} type="button" onClick={onRetry}>
              다시 시도
            </button>
          ) : null}
        </>
      ) : (
        <p>
          {detail
            ? "학생 상세를 불러오는 중입니다."
            : "학생 현황을 불러오는 중입니다."}
        </p>
      )}
    </div>
  );
}

function RosterTable({
  rows,
  label,
  selectedKey,
  onSelect,
}: {
  rows: readonly Row[];
  label: string;
  selectedKey: string | null;
  onSelect: (row: Row) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <table className={s.roster} aria-label={label}>
        <thead>
          <tr>
            <th scope="col">학생</th>
            <th scope="col">복습일 됨</th>
            <th scope="col">밀림</th>
            <th scope="col">살펴볼 까닭</th>
            <th scope="col">상세</th>
          </tr>
        </thead>
        <tbody>
          {(expanded ? rows : rows.slice(0, 5)).map((row) => {
            const key = teacherWireKey(row.id, row.classId);
            return (
              <tr
                key={key}
                data-selected={key === selectedKey ? "true" : undefined}
              >
                <th scope="row">
                  <span>{row.name}</span>
                  <small>{row.className}</small>
                </th>
                <td>
                  {row.summary.due}
                  <span className={s.unit}>개</span>
                </td>
                <td>
                  {row.summary.overdue}
                  <span className={s.unit}>개</span>
                </td>
                <td>
                  <Flags flags={row.summary.flags} />
                </td>
                <td>
                  <button
                    type="button"
                    className={s.viewButton}
                    aria-label={`${label} ${row.name} ${row.className} 보기`}
                    aria-pressed={key === selectedKey}
                    onClick={() => onSelect(row)}
                  >
                    보기
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > 5 ? (
        <button
          className={s.moreButton}
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {label} {expanded ? "접기" : "더 보기"}
        </button>
      ) : null}
    </>
  );
}

function StudentDetailContent({
  detail,
  memberships,
  onSaveQuota,
  onReload,
}: {
  detail: FadingTeacherStudent;
  memberships: string[];
  onSaveQuota?: (input: FadingTeacherQuotaInput) => Promise<FadingTeacherQuota>;
  onReload: () => Promise<FadingTeacherQuota | undefined>;
}) {
  const { student, summary, concepts, days } = detail;
  return (
    <>
      <header className={s.detailHeader}>
        <p className={s.eyebrow}>학생 상세</p>
        <h3>{student.name}</h3>
        <p>{memberships.join(" · ")}</p>
        <small>현재 {student.className} 기준</small>
      </header>
      <Flags flags={summary.flags} />
      <dl className={s.primaryMetrics}>
        <div>
          <dt>복습일 된 개념</dt>
          <dd>
            {summary.due}
            <span>개</span>
          </dd>
        </div>
        <div>
          <dt>밀린 개념</dt>
          <dd>
            {summary.overdue}
            <span>개</span>
          </dd>
        </div>
      </dl>
      <dl className={s.metrics}>
        <div>
          <dt>고른 개념</dt>
          <dd>{summary.picked}개</dd>
        </div>
        <div>
          <dt>배운 개념</dt>
          <dd>{summary.learned}개</dd>
        </div>
        <div>
          <dt>오늘 마친 풀이</dt>
          <dd>{summary.reviewedToday}회</dd>
        </div>
        <div>
          <dt>오늘 처음 배움</dt>
          <dd>{summary.freshToday}개</dd>
        </div>
        <div>
          <dt>가장 오래 밀림</dt>
          <dd>{summary.longestOverdueDays}일</dd>
        </div>
        <div>
          <dt>마지막 평가</dt>
          <dd>{summary.lastOn ?? "기록 없음"}</dd>
        </div>
        <div>
          <dt>쉬어 간 날</dt>
          <dd>
            {summary.idleDays === null ? "기록 없음" : `${summary.idleDays}일`}
          </dd>
        </div>
        <div>
          <dt>연속 · 가장 긴 연속</dt>
          <dd>
            {summary.streak.current}일 · {summary.streak.best}일
          </dd>
        </div>
        <div>
          <dt>‘다시’ 평가</dt>
          <dd>{summary.lapses}회</dd>
        </div>
        {summary.relearn ? (
          <>
            <div>
              <dt>추가 확인 남음</dt>
              <dd>{summary.relearn.waiting}문장</dd>
            </div>
            <div>
              <dt>추가 확인 틀림</dt>
              <dd>
                {summary.relearn.fails}회 · {summary.relearn.failing}문장
              </dd>
            </div>
            <div>
              <dt>추가 확인 횟수</dt>
              <dd>{summary.relearn.checks}회</dd>
            </div>
            <div>
              <dt>가장 오래 남은 추가 확인</dt>
              <dd>
                {summary.relearn.sinceOn
                  ? `${summary.relearn.sinceOn}부터`
                  : "없음"}
              </dd>
            </div>
          </>
        ) : null}
        {summary.recent ? (
          <div>
            <dt>최근 7일</dt>
            <dd>
              평가한 날 {summary.recent.days}일 · 첫 평가 {summary.recent.fresh}
              개
            </dd>
          </div>
        ) : null}
      </dl>
      <RelearnTodayCard detail={detail} />
      {detail.quota ? (
        <QuotaCard
          quota={detail.quota}
          today={detail.today}
          onSave={onSaveQuota}
          onReload={onReload}
        />
      ) : null}
      <p className={s.note}>배운 개념은 첫 평가를 마친 개념입니다.</p>
      {summary.relearn ? (
        <p className={s.note}>
          추가 확인 남음 · 틀림 · 횟수는 대기열에 남은 문장의 기록입니다.
        </p>
      ) : null}
      <dl className={s.steps} aria-label="단계별 개념 수">
        {([1, 2, 3, 4] as const).map((step) => (
          <div key={step}>
            <dt>{step}단계</dt>
            <dd>{summary.stepCounts[step]}개</dd>
          </div>
        ))}
      </dl>
      <section className={s.detailSection}>
        <h4>고른 개념</h4>
        {concepts.length ? (
          <ul className={s.concepts}>
            {concepts.map((concept) => (
              <li key={concept.id}>
                <strong>
                  {concept.terms.map((term, index) => (
                    <span key={index}>
                      {index ? " · " : ""}
                      <FadingMath text={term} />
                    </span>
                  ))}
                </strong>
                <span className={s.muted} data-section-name>
                  {concept.section
                    .split("::")
                    .slice(1)
                    .map(curriculumName)
                    .join(" · ")}
                </span>
                <span>
                  {concept.step}단계 ·{" "}
                  {concept.rated ? "첫 평가 마침" : "평가 전"}
                </span>
                <span>
                  {concept.dueOn === null
                    ? "복습일 없음"
                    : concept.daysUntil !== null && concept.daysUntil < 0
                      ? `복습 ${-concept.daysUntil}일 밀림 · ${concept.dueOn}`
                      : concept.daysUntil === 0
                        ? `오늘 복습 · ${concept.dueOn}`
                        : `다음 복습 ${concept.dueOn}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>고른 개념이 없습니다.</p>
        )}
      </section>
      <section className={s.detailSection}>
        <h4>최근 평가 기록</h4>
        <p className={s.note}>‘다시’ 외 평가는 학생이 매긴 평가 건수입니다.</p>
        {days.length ? (
          <table className={s.days} aria-label="최근 평가 집계">
            <thead>
              <tr>
                <th scope="col">날짜</th>
                <th scope="col">마친 풀이</th>
                <th scope="col">‘다시’ 외 평가</th>
                <th scope="col">처음 배움</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{day.date}</th>
                  <td>{day.reviews}회</td>
                  <td>{day.passed}회</td>
                  <td>{day.fresh}개</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={s.empty}>평가 기록이 없습니다.</p>
        )}
      </section>
    </>
  );
}

function StudentDetail({
  row,
  dashboard,
  getStudent,
  setQuota,
}: {
  row: Row;
  dashboard: FadingTeacherDashboard;
  getStudent: TeacherFadingSource["getStudent"];
  setQuota?: TeacherFadingSource["setQuota"];
}) {
  const [retry, setRetry] = useState(0);
  const read = useCallback(async () => {
    const data = fadingTeacherStudentResponseSchema.parse(
      await getStudent(row.id, row.classId),
    ).data;
    if (data.student.id !== row.id || data.student.classId !== row.classId)
      throw new Error("Student scope mismatch");
    return data;
  }, [getStudent, row.id, row.classId]);
  const result = useTeacherRead(
    `${teacherWireKey(row.id, row.classId)}:${retry}`,
    read,
  );
  const memberships = [
    ...new Set(
      dashboard.students
        .filter((member) => member.id === row.id)
        .map((member) => member.className),
    ),
  ];
  return (
    <aside
      className={s.detail}
      aria-label={`${row.name} 학생 상세`}
      aria-busy={!result}
    >
      {!result ? (
        <ReadMessage detail />
      ) : result.kind === "error" ? (
        <ReadMessage
          error={result.error}
          detail
          onRetry={() => setRetry((value) => value + 1)}
        />
      ) : (
        <StudentDetailContent
          detail={result.data}
          memberships={memberships}
          onSaveQuota={
            setQuota
              ? async (input) =>
                  (await setQuota(row.id, row.classId, input)).data
              : undefined
          }
          onReload={async () =>
            fadingTeacherStudentResponseSchema.parse(
              await getStudent(row.id, row.classId),
            ).data.quota
          }
        />
      )}
    </aside>
  );
}

function LoadedStatus({
  dashboard,
  getStudent,
  setQuota,
  initialClass,
}: {
  dashboard: FadingTeacherDashboard;
  getStudent: TeacherFadingSource["getStudent"];
  setQuota?: TeacherFadingSource["setQuota"];
  initialClass?: string;
}) {
  const [classId, setClassId] = useState(initialClass ?? "all");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const rows = dashboard.students.filter(
    (row) =>
      (classId === "all" || row.classId === classId) &&
      row.name.includes(search.trim()),
  );
  const flagged = rows.filter((row) => row.summary.flags.length);
  const selected =
    rows.find((row) => teacherWireKey(row.id, row.classId) === selection) ??
    rows.find((row) => row.summary.flags.includes("overdue")) ??
    rows[0];
  const selectedKey = selected
    ? teacherWireKey(selected.id, selected.classId)
    : null;
  const empty = search.trim()
    ? "이름에 맞는 학생이 없습니다."
    : classId !== "all"
      ? "이 반에 등록된 학생이 없습니다."
      : dashboard.classes.length
        ? "등록된 학생이 없습니다."
        : "등록된 반이 없습니다.";
  const table = (members: readonly Row[], label: string) => (
    <RosterTable
      key={`${classId}:${search}:${label}`}
      rows={members}
      label={label}
      selectedKey={selectedKey}
      onSelect={(row) => setSelection(teacherWireKey(row.id, row.classId))}
    />
  );
  return (
    <>
      <div className={s.toolbar}>
        <label>
          반 선택
          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setSelection(null);
            }}
          >
            <option value="all">전체 반</option>
            {dashboard.classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          학생 이름
          <input
            type="search"
            value={search}
            placeholder="이름 검색"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <p className={s.scope}>
          학생 {new Set(rows.map((row) => row.id)).size}명 · 등록 {rows.length}
          건<small>기준일 {dashboard.today}</small>
        </p>
      </div>
      {classId === "all" ? (
        <p className={s.registrationNote}>
          두 반에 등록된 학생은 반마다 표시됩니다. 학생 수는 한 번만 셉니다.
        </p>
      ) : null}
      {rows.length ? (
        <div className={s.body}>
          <div className={s.rosterPanel}>
            <section className={s.attention}>
              <header className={s.sectionHeading}>
                <h4>살펴볼 학생</h4>
                <span>{new Set(flagged.map((row) => row.id)).size}명</span>
              </header>
              {flagged.length ? (
                table(flagged, "살펴볼 학생")
              ) : (
                <p className={s.empty}>살펴볼 학생이 없습니다.</p>
              )}
            </section>
            <section className={s.allRoster}>
              <header className={s.sectionHeading}>
                <h4>전체 명단</h4>
                <span>등록 {rows.length}건</span>
              </header>
              {table(rows, "전체 명단")}
            </section>
          </div>
          {selected ? (
            <StudentDetail
              row={selected}
              dashboard={dashboard}
              getStudent={getStudent}
              setQuota={setQuota}
            />
          ) : null}
        </div>
      ) : (
        <div className={s.message} role="status">
          <h3>{empty}</h3>
          <p>학생이 등록되면 현황을 확인할 수 있습니다.</p>
        </div>
      )}
      <footer className={s.footer}>
        학생이 고른 개념과 평가 기록 · 정책 {dashboard.policy}판
      </footer>
    </>
  );
}

function PreviewDataView({
  read,
}: {
  read: () => Promise<TeacherFadingPreviewData>;
}) {
  const [retry, setRetry] = useState(0);
  const result = useTeacherRead(String(retry), read);
  if (!result)
    return (
      <p className={s.empty} role="status">
        미리 보기 자료를 불러오는 중입니다.
      </p>
    );
  if (result.kind === "error")
    return (
      <div className={s.message} role="alert">
        <p>미리 보기 자료를 불러오지 못했습니다.</p>
        <button
          type="button"
          className={s.button}
          onClick={() => setRetry((value) => value + 1)}
        >
          다시 시도
        </button>
      </div>
    );
  return (
    <Suspense
      fallback={
        <p className={s.empty} role="status">
          미리 보기를 불러오는 중입니다.
        </p>
      }
    >
      <FadingPreview {...result.data} />
    </Suspense>
  );
}

/** Recommended H2; intended for the workspace SRS content pane, with no rail or API gate of its own. */
export function TeacherFadingStatus({
  getDashboard,
  getStudent,
  setQuota,
  preview,
  initialClass,
  variant = "H2",
}: TeacherFadingStatusProps) {
  const [retry, setRetry] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewButton = useRef<HTMLButtonElement>(null);
  const wasPreviewOpen = useRef(false);
  useEffect(() => {
    if (previewOpen) {
      wasPreviewOpen.current = true;
    } else if (wasPreviewOpen.current) {
      previewButton.current?.focus();
      wasPreviewOpen.current = false;
    }
  }, [previewOpen]);
  const read = useCallback(
    async () =>
      fadingTeacherDashboardResponseSchema.parse(await getDashboard()).data,
    [getDashboard],
  );
  const result = useTeacherRead(String(retry), read);
  const today =
    typeof preview === "function"
      ? result?.kind === "ready"
        ? result.data.today
        : ""
      : preview.today;
  const previewCache = useRef<{
    source: TeacherFadingPreviewSource;
    today: string;
    data: TeacherFadingPreviewData;
  } | null>(null);
  const readPreview = useCallback(async () => {
    if (typeof preview !== "function") return preview;
    if (
      previewCache.current?.source === preview &&
      previewCache.current.today === today
    )
      return previewCache.current.data;
    const data = await preview(today);
    previewCache.current = { source: preview, today, data };
    return data;
  }, [preview, today]);
  return (
    <section
      className={s.root}
      data-hifi={variant}
      aria-label="오늘의 기억 학생 현황"
    >
      <div hidden={previewOpen}>
        <header className={s.productHeader}>
          <div>
            <p className={s.eyebrow}>오늘의 기억 · SRS</p>
            <h2>학생 현황</h2>
          </div>
          <div className={s.previewSlot}>
            <button
              type="button"
              ref={previewButton}
              className={s.button}
              disabled={
                typeof preview === "function" && result?.kind !== "ready"
              }
              onClick={() => setPreviewOpen(true)}
            >
              미리 보기
            </button>
            <span>저장되지 않음</span>
          </div>
        </header>
        {!result ? (
          <ReadMessage />
        ) : result.kind === "error" ? (
          <ReadMessage
            error={result.error}
            onRetry={() => setRetry((value) => value + 1)}
          />
        ) : (
          <LoadedStatus
            key={`${retry}`}
            dashboard={result.data}
            getStudent={getStudent}
            setQuota={setQuota}
            initialClass={initialClass}
          />
        )}
      </div>
      {previewOpen ? (
        <section className={s.preview} aria-label="기억 학습 미리 보기">
          <header className={s.previewHeader}>
            <button
              type="button"
              className={s.button}
              onClick={() => setPreviewOpen(false)}
            >
              학생 현황으로
            </button>
            <div>
              <h2>기억 학습 미리 보기</h2>
              <p>
                별도 기억 학습 화면입니다. 탐험이 포함된 학생 홈과 다르며
                저장되지 않습니다.
              </p>
            </div>
          </header>
          <PreviewDataView read={readPreview} />
        </section>
      ) : null}
    </section>
  );
}
