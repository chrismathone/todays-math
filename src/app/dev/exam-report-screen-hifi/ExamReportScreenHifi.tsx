"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import AutoGrowTextarea from "@/components/english/AutoGrowTextarea";
import {
  classExamReportPages,
  studentExamReportPages,
} from "@/components/exam-report/ExamReportPaper";
import { EXAM_REPORT_PAPER_CSS } from "@/components/exam-report/paperStyles";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import w from "@/components/unified/Workroom.module.css";
import {
  classFixture,
  INITIAL_SETTINGS,
  NOTE_LIMIT,
  SCENARIOS,
  screenFixture,
  STATUS_LABEL,
  statusOf,
  VARIANTS,
  type PaperSettings,
  type ReportStatus,
  type Scenario,
  type ScreenStudent,
  type VariantId,
} from "./fixtures";
import s from "./ExamReportScreenHifi.module.css";

function Action({
  primary,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={`${primary ? w.primaryButton : w.outlineButton} ${s.action} ${className}`}
      {...props}
    />
  );
}

function Status({
  student,
  plain = false,
}: {
  student: ScreenStudent;
  plain?: boolean;
}) {
  const status = statusOf(student);
  return (
    <span className={plain ? s.statusText : s.badge} data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function scoreText(student: ScreenStudent) {
  return student.report.status === "absent"
    ? "—"
    : `${student.report.score.value}점`;
}

function paperOptions(
  settings: PaperSettings,
  students: ScreenStudent[],
  student: ScreenStudent,
) {
  return {
    ...settings,
    // 빈 문장은 실제 H1 부품의 note 옵션으로 칸 자체를 뺀다.
    note: settings.note && Boolean(student.note.trim()),
    average: settings.average ? classFixture(students).rollup : null,
  };
}

function studentPages(
  student: ScreenStudent,
  settings: PaperSettings,
  students: ScreenStudent[],
) {
  return studentExamReportPages(
    { ...student.report, teacherNote: student.note.trim() },
    paperOptions(settings, students, student),
  );
}

function Preview({
  student,
  settings,
  students,
}: {
  student: ScreenStudent;
  settings: PaperSettings;
  students: ScreenStudent[];
}) {
  const pages = studentPages(student, settings, students);
  return (
    <PaperStrip
      label="선택한 학생의 성적표"
      hint={`${settings.mode === "S1" ? "요약 한 장" : "요약 + 틀린 문항 풀이"} · ${pages.length}쪽 · 쪽을 누르면 크게 봅니다.`}
      pages={pages.map((node, i) => ({
        key: `${student.report.student.id}-${i}`,
        node: <div className={s.paper}>{node}</div>,
        caption: `${i + 1} / ${pages.length}쪽`,
        enlargeLabel: `${student.report.student.name} 성적표 ${i + 1}쪽 확대`,
      }))}
    />
  );
}

type Activity = {
  id: string;
  kind: "saving" | "save-error" | "confirm-error";
} | null;
type PrintScope = "confirmed" | "all" | "selected";

/** 공용 H1을 그대로 관찰한다. 줄바꿈·긴 오답 표는 글자 수만으로 안전하다고 판정하지 않는다. */
function usePaperOverflow(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{
    key: string;
    overflow: boolean;
    ready: boolean;
  } | null>(null);
  useEffect(() => {
    let active = true;
    const measure = () => {
      if (!active) return;
      const sheets =
        ref.current?.querySelectorAll<HTMLElement>(".er-sheet") ?? [];
      const overflow = [...sheets].some((sheet) => {
        if (!sheet.clientHeight) return false;
        const footer = sheet.querySelector<HTMLElement>(".er-footer");
        const rect = sheet.getBoundingClientRect();
        const scale = rect.height / sheet.clientHeight;
        const elements = [...sheet.children] as HTMLElement[];
        return (
          sheet.scrollHeight > sheet.clientHeight + 1 ||
          sheet.scrollWidth > sheet.clientWidth + 1 ||
          elements.some((element, i) => {
            if (element.scrollHeight > element.clientHeight + 2) return true;
            const next = elements[i + 1];
            return (
              next &&
              element.getBoundingClientRect().bottom >
                next.getBoundingClientRect().top + scale
            );
          }) ||
          Boolean(
            footer &&
            footer.getBoundingClientRect().bottom >
              rect.bottom - ((9 * 96) / 25.4) * scale,
          )
        );
      });
      setFit({
        key,
        overflow,
        ready: !document.fonts || document.fonts.status === "loaded",
      });
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      active = false;
    };
  }, [key]);
  return {
    ref,
    overflow: fit?.key === key && fit.overflow,
    checking: fit?.key !== key || !fit.ready,
  };
}

export function ExamReportScreenHifi() {
  const [variant, setVariant] = useState<VariantId>("H1");
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [students, setStudents] = useState(
    () => screenFixture("normal").students,
  );
  const [selectedId, setSelectedId] = useState(
    () => screenFixture("normal").selectedId,
  );
  const [settings, setSettings] = useState<PaperSettings>(INITIAL_SETTINGS);
  const [pendingSettings, setPendingSettings] =
    useState<PaperSettings>(INITIAL_SETTINGS);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [activity, setActivity] = useState<Activity>(null);
  const [scope, setScope] = useState<PrintScope>("confirmed");
  const [dialog, setDialog] = useState<
    "students" | "settings" | "student-print" | "class-print" | null
  >(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const student = students.find((row) => row.report.student.id === selectedId)!;
  const status = statusOf(student);
  const dirty = student.note !== student.savedNote;
  const saving = activity?.kind === "saving";
  const ownActivity = activity?.id === selectedId ? activity.kind : null;
  const counts = students.reduce(
    (all, row) => {
      all[statusOf(row)]++;
      return all;
    },
    { none: 0, draft: 0, confirmed: 0, stale: 0, absent: 0 } satisfies Record<
      ReportStatus,
      number
    >,
  );
  const eligible = students.filter((row) => row.report.status === "graded");
  const filtered = students.filter(
    (row) =>
      row.report.student.name.includes(query.trim()) &&
      (filter === "all" ||
        (filter === "pending"
          ? !["confirmed", "absent"].includes(statusOf(row))
          : statusOf(row) === filter)),
  );
  const targets =
    scope === "confirmed"
      ? students.filter(
          (row) => statusOf(row) === "confirmed" && row.note === row.savedNote,
        )
      : scope === "all"
        ? eligible
        : student.report.status === "graded"
          ? [student]
          : [];
  const paperKey = JSON.stringify([
    selectedId,
    student.note,
    settings,
    variant,
  ]);
  const { ref: previewRef, overflow, checking } = usePaperOverflow(paperKey);
  const title = VARIANTS.find((option) => option.id === variant)!;

  function updateStudent(change: (row: ScreenStudent) => ScreenStudent) {
    setStudents((rows) =>
      rows.map((row) =>
        row.report.student.id === selectedId ? change(row) : row,
      ),
    );
  }
  function changeScenario(next: Scenario) {
    if (timer.current) clearTimeout(timer.current);
    const fixture = screenFixture(next);
    setScenario(next);
    setStudents(fixture.students);
    setSelectedId(fixture.selectedId);
    setQuery("");
    setFilter("all");
    setScope("confirmed");
    setSettings(INITIAL_SETTINGS);
    setActivity(
      next === "saving" || next === "save-error" || next === "confirm-error"
        ? { id: fixture.selectedId, kind: next === "saving" ? "saving" : next }
        : null,
    );
  }
  function choose(id: string) {
    if (saving) return;
    setSelectedId(id);
  }
  function save() {
    if (saving || checking || overflow || !dirty) return;
    const savedId = selectedId;
    const note = student.note;
    setActivity({ id: savedId, kind: "saving" });
    timer.current = setTimeout(() => {
      setStudents((rows) =>
        rows.map((row) =>
          row.report.student.id === savedId ? { ...row, savedNote: note } : row,
        ),
      );
      setActivity(null);
      timer.current = null;
    }, 650);
  }
  function confirm() {
    if (
      saving ||
      checking ||
      dirty ||
      overflow ||
      status === "absent" ||
      status === "confirmed"
    )
      return;
    updateStudent((row) => ({
      ...row,
      confirmedNote: row.savedNote,
      staleReason: null,
    }));
    setActivity(null);
  }
  function open(next: NonNullable<typeof dialog>, button: HTMLButtonElement) {
    opener.current = button;
    if (next === "settings") setPendingSettings({ ...settings });
    setDialog(next);
  }
  function applySettings() {
    if (JSON.stringify(settings) !== JSON.stringify(pendingSettings)) {
      setSettings(pendingSettings);
      setStudents((rows) =>
        rows.map((row) =>
          row.confirmedNote === null
            ? row
            : { ...row, staleReason: "반 지면 설정이 바뀌었습니다." },
        ),
      );
    }
    setDialog(null);
  }

  const confirmButton = (
    <Action
      primary
      disabled={
        saving ||
        checking ||
        dirty ||
        overflow ||
        status === "confirmed" ||
        status === "absent"
      }
      onClick={confirm}
    >
      {status === "confirmed"
        ? "확정됨"
        : status === "stale"
          ? "다시 확정"
          : "이 학생 확정"}
    </Action>
  );
  const settingsButton = (
    <Action
      disabled={saving}
      onClick={(event) => open("settings", event.currentTarget)}
    >
      반 지면 설정
    </Action>
  );
  const printTools = (
    <div className={s.printTools} aria-label="인쇄 도구">
      <label className={s.inlineField}>
        학생 인쇄 범위
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as PrintScope)}
        >
          <option value="confirmed">확정된 학생만</option>
          <option value="all">응시 학생 모두 · 확정 전 포함</option>
          <option value="selected">선택한 학생 · 확정 전 포함</option>
        </select>
      </label>
      <Action
        disabled={
          saving ||
          !targets.length ||
          ((checking || overflow) &&
            targets.some((row) => row.report.student.id === selectedId))
        }
        onClick={(event) => open("student-print", event.currentTarget)}
      >
        학생 성적표 {targets.length}명 인쇄
      </Action>
      <Action
        disabled={saving}
        onClick={(event) => open("class-print", event.currentTarget)}
      >
        반 성적표 인쇄
      </Action>
      {!targets.length && (
        <span className={s.meta}>선택한 범위에 인쇄할 학생이 없습니다.</span>
      )}
    </div>
  );

  const filters = (
    <div className={s.listFilters}>
      <label>
        이름 검색
        <input
          type="search"
          value={query}
          placeholder="학생 이름"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label>
        상태
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">전체 {students.length}명</option>
          <option value="pending">
            확정 전 {counts.none + counts.draft + counts.stale}명
          </option>
          <option value="confirmed">확정 {counts.confirmed}명</option>
          <option value="stale">다시 확정 {counts.stale}명</option>
          <option value="absent">결시 {counts.absent}명</option>
        </select>
      </label>
    </div>
  );

  function roster(inPicker = false) {
    return (
      <>
        {filters}
        <p className={s.listCount}>
          표시 {filtered.length}명 / {students.length}명
        </p>
        {filtered.length === 0 ? (
          <div className={s.empty}>
            <p>조건에 맞는 학생이 없습니다.</p>
            <Action
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              조건 해제
            </Action>
          </div>
        ) : variant === "H2" ? (
          <table className={s.rosterTable}>
            <thead>
              <tr>
                <th scope="col">학생</th>
                <th scope="col">점수 / 100</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.report.student.id}
                  data-selected={row.report.student.id === selectedId}
                >
                  <th scope="row">
                    <button
                      type="button"
                      disabled={saving}
                      aria-pressed={row.report.student.id === selectedId}
                      aria-label={`${row.report.student.name} ${scoreText(row)} ${STATUS_LABEL[statusOf(row)]} 열기`}
                      onClick={() => {
                        choose(row.report.student.id);
                        if (inPicker) setDialog(null);
                      }}
                    >
                      {row.report.student.name}
                    </button>
                  </th>
                  <td>
                    {row.report.status === "absent"
                      ? "—"
                      : row.report.score.value}
                  </td>
                  <td>
                    <Status student={row} plain />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul
            className={s.roster}
            tabIndex={0}
            aria-label="학생 이름과 성적표 상태"
          >
            {filtered.map((row) => (
              <li key={row.report.student.id}>
                <button
                  type="button"
                  disabled={saving}
                  aria-pressed={row.report.student.id === selectedId}
                  aria-label={`${row.report.student.name} ${scoreText(row)} ${STATUS_LABEL[statusOf(row)]} 열기`}
                  onClick={() => {
                    choose(row.report.student.id);
                    if (inPicker) setDialog(null);
                  }}
                >
                  <strong>{row.report.student.name}</strong>
                  <span className={s.score}>{scoreText(row)}</span>
                  <Status student={row} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const editor = (
    <section className={s.editor} role="region" aria-label="학생별 문장 편집">
      <div className={s.editorTitle}>
        <h3>원장님 문장</h3>
        <Status student={student} />
      </div>
      {status === "stale" && (
        <div className={s.warning} role="status">
          <strong>다시 확정이 필요합니다.</strong>
          <p>
            {student.staleReason ?? "확정 후 문장이 바뀌었습니다."} 저장하고
            다시 확정하면 새 내용이 확정됩니다.
          </p>
        </div>
      )}
      <label className={s.noteLabel} htmlFor="director-note">
        원장님 문장
      </label>
      <AutoGrowTextarea
        id="director-note"
        className={s.noteInput}
        value={student.note}
        maxLength={NOTE_LIMIT}
        disabled={saving}
        aria-describedby="note-help note-count"
        aria-invalid={overflow || undefined}
        placeholder="문장 없이도 확정할 수 있습니다."
        onChange={(event) => {
          const note = event.target.value;
          if (note.length <= NOTE_LIMIT) {
            updateStudent((row) => ({ ...row, note }));
            setActivity(null);
          }
        }}
      />
      <div className={s.noteHelp}>
        <p id="note-help">선택 사항 · 비워 두면 지면의 문장 칸을 뺍니다.</p>
        <p
          id="note-count"
          aria-live="polite"
          data-limit={student.note.length === NOTE_LIMIT}
        >
          남은 {NOTE_LIMIT - student.note.length}자 / {NOTE_LIMIT}자
        </p>
      </div>
      {overflow && (
        <div className={s.error} role="alert">
          H1 한 장을 벗어납니다. 문장을 줄이거나 반 지면 설정을 조정해 주세요.
          넘침이 있으면 저장·확정을 진행할 수 없습니다.
        </div>
      )}
      {ownActivity === "save-error" && (
        <div className={s.error} role="alert">
          문장을 저장하지 못했습니다. 입력은 그대로 남아 있습니다. 다시 저장해
          주세요.
        </div>
      )}
      {ownActivity === "confirm-error" && (
        <div className={s.error} role="alert">
          확정하지 못했습니다. 저장된 문장은 그대로입니다. 다시 확정해 주세요.
        </div>
      )}
      <div className={s.editorActions}>
        <span className={s.meta} role="status">
          {saving
            ? "문장 저장 중 · 잠시 기다려 주세요."
            : checking
              ? "지면 확인 중"
              : dirty
                ? "저장 전 수정 · 문장을 먼저 저장해 주세요."
                : status === "confirmed"
                  ? "확정됨 · 수정하면 다시 확정합니다."
                  : status === "none"
                    ? "문장 없음 · 이대로 확정할 수 있습니다."
                    : "문장 저장됨 · 아직 확정 전"}
        </span>
        <div className={s.actions}>
          <Action
            disabled={saving || checking || !dirty || overflow}
            onClick={save}
          >
            {saving
              ? "저장 중…"
              : ownActivity === "save-error"
                ? "다시 저장"
                : "문장 저장"}
          </Action>
          {variant !== "H4" && confirmButton}
        </div>
      </div>
      {variant === "H4" && (
        <p className={s.meta}>학생 이름 옆의 확정 단추로 확정합니다.</p>
      )}
    </section>
  );

  const reviewPages =
    dialog === "class-print"
      ? classExamReportPages(classFixture(students))
      : dialog === "student-print" && targets[0]
        ? studentPages(targets[0], settings, students)
        : [];

  return (
    <div
      className={`${w.workspace} ${s.root}`}
      data-product="math"
      data-variant={variant}
    >
      <style>{EXAM_REPORT_PAPER_CSS}</style>
      <div className={s.devBar}>
        <div>
          <strong>원장님 화면 Hi-fi</strong>
          <p>
            지어낸 자료 · 이 화면 안에서만 저장·확정합니다. 새로 열면
            초기화됩니다.
          </p>
          <p>문장 상한 {NOTE_LIMIT}자는 실측 전 비교값입니다.</p>
        </div>
        <label>
          예시 상황
          <select
            value={scenario}
            onChange={(event) => changeScenario(event.target.value as Scenario)}
          >
            {Object.entries(SCENARIOS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={s.comparison}>
        <div
          className={s.variantButtons}
          role="group"
          aria-label="Hi-fi 비교안"
        >
          {VARIANTS.map((option) => (
            <Action
              key={option.id}
              aria-pressed={variant === option.id}
              onClick={() => setVariant(option.id)}
            >
              {option.id} · {option.name}
            </Action>
          ))}
        </div>
        <p>{title.axis}</p>
      </div>
      <main className={s.main}>
        <p className={s.breadcrumb}>작업실 › 낸 시험 › 중1 가람반 › 성적표</p>
        <WorkspacePageHeader
          title="10월 월말평가 성적표"
          description={`중1 가람반 · 2026. 10. 24. · 20문항 · 100점 만점`}
        >
          {variant !== "H4" && settingsButton}
        </WorkspacePageHeader>
        <div className={s.context}>
          <p>
            채점 {eligible.length}명 · 결시 {counts.absent}명{" "}
            <span>
              확정 {counts.confirmed} / {eligible.length}명
            </span>
          </p>
          <p className={s.meta}>
            지면: H1 ·{" "}
            {settings.mode === "S1" ? "요약 한 장" : "요약 + 틀린 문항 풀이"} ·
            반 전체에 적용
          </p>
        </div>
        {variant !== "H4" && (
          <section className={s.printBar} aria-label="반 인쇄">
            {printTools}
          </section>
        )}
        <div className={s.split}>
          <section
            className={s.listPanel}
            role="region"
            aria-label="반 학생 목록"
          >
            <div className={s.panelHead}>
              <h2>학생</h2>
              <span className={s.meta}>{students.length}명</span>
            </div>
            {students.length > 20 ? (
              <div className={s.pickerLauncher}>
                <p>
                  <strong>{student.report.student.name}</strong> ·{" "}
                  {scoreText(student)} <Status student={student} />
                </p>
                <Action
                  disabled={saving}
                  onClick={(event) => open("students", event.currentTarget)}
                >
                  학생 고르기 · {students.length}명
                </Action>
                <p className={s.meta}>
                  긴 명단은 고르기 창에서 이름·상태로 찾습니다. 입력은 학생별로
                  남습니다.
                </p>
              </div>
            ) : (
              roster()
            )}
            {saving && (
              <p className={s.listCount}>
                저장 중에는 학생을 바꿀 수 없습니다.
              </p>
            )}
          </section>
          <section className={s.detail} aria-labelledby="selected-title">
            <header className={s.detailHead}>
              <div>
                <h2 id="selected-title">
                  {student.report.student.name}
                  <span>
                    {student.report.status === "absent"
                      ? "결시 · 점수 없음"
                      : `${scoreText(student)} / 100점 · 틀린 문항 ${student.report.wrongQuestions.length}개`}
                  </span>
                </h2>
              </div>
              {variant === "H4" && confirmButton}
            </header>
            {variant === "H4" && (
              <div className={s.inlineSettings}>
                <span className={s.meta}>
                  이 반의 지면 ·{" "}
                  {settings.mode === "S1"
                    ? "요약 한 장"
                    : "요약 + 틀린 문항 풀이"}
                </span>
                {settingsButton}
              </div>
            )}
            {status === "absent" ? (
              <div className={s.absent}>
                <span className={s.badge} data-status="absent">
                  결시
                </span>
                <h3>결시하여 성적표를 만들지 않습니다.</h3>
                <p>
                  점수·문장·확정 대상이 없습니다. 학생 성적표 인쇄에서도
                  제외합니다.
                </p>
              </div>
            ) : (
              <>
                <div className={s.detailBody}>
                  <div ref={previewRef} className={s.preview}>
                    <Preview
                      student={student}
                      students={students}
                      settings={settings}
                    />
                  </div>
                  {editor}
                </div>
              </>
            )}
          </section>
        </div>
        {variant === "H4" && (
          <section
            className={`${s.printBar} ${s.bottomPrint}`}
            aria-label="반 인쇄"
          >
            <h2>인쇄</h2>
            {printTools}
          </section>
        )}
      </main>
      {dialog === "students" && (
        <PickerDialog
          title="성적표를 볼 학생 고르기"
          returnFocus={opener}
          onClose={() => setDialog(null)}
        >
          {roster(true)}
        </PickerDialog>
      )}
      {dialog === "settings" && (
        <PickerDialog
          title="반 지면 설정"
          size="fit"
          doneLabel="적용"
          cancelLabel="취소"
          returnFocus={opener}
          onClose={applySettings}
          onCancel={() => setDialog(null)}
        >
          <p className={s.dialogIntro}>
            중1 가람반 전체에 적용합니다. 지면이 바뀌면 확정한 학생은 다시
            확정합니다.
          </p>
          <fieldset className={s.settingFields}>
            <legend>학생 성적표 구성</legend>
            {(
              [
                ["S1", "요약 한 장"],
                ["M1", "요약 + 틀린 문항 풀이"],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="paper-mode"
                  value={value}
                  checked={pendingSettings.mode === value}
                  onChange={() =>
                    setPendingSettings((old) => ({ ...old, mode: value }))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <fieldset className={s.settingFields}>
            <legend>지면에 담을 기록</legend>
            {(
              [
                ["wrong", "틀린 문항"],
                ["retry", "재시험 결과"],
                ["note", "원장님 문장"],
                ["average", "반 평균 · 기본 꺼짐"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={pendingSettings[key]}
                  onChange={(event) =>
                    setPendingSettings((old) => ({
                      ...old,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className={s.meta}>
            문장 칸은 문장이 있는 학생에게만 표시됩니다. 반 평균은 응시 학생
            기준입니다.
          </p>
        </PickerDialog>
      )}
      {(dialog === "student-print" || dialog === "class-print") && (
        <PickerDialog
          title={
            dialog === "student-print"
              ? "학생 성적표 인쇄 검토"
              : "반 성적표 인쇄 검토"
          }
          returnFocus={opener}
          onClose={() => setDialog(null)}
        >
          <p className={s.dialogIntro}>
            시안의 인쇄 검토입니다. 실제 인쇄·PDF 생성·전송은 하지 않습니다.
          </p>
          {dialog === "student-print" && (
            <>
              <p>
                대상 {targets.length}명 · 확정 전 학생{" "}
                {targets.filter((row) => statusOf(row) !== "confirmed").length}
                명 포함 · 결시 {counts.absent}명 제외
              </p>
              <p className={s.meta}>
                {targets.map((row) => row.report.student.name).join(" · ")}
              </p>
              <p className={s.meta}>
                아래는 첫 학생 {targets[0]?.report.student.name}의 지면입니다.
              </p>
            </>
          )}
          {dialog === "class-print" && students.length > 20 && (
            <p className={s.warning}>
              긴 명단의 반 성적표는 현재 H1 부품의 한 장을 넘을 수 있습니다. 이
              시안에서 출력하지 않습니다.
            </p>
          )}
          <PaperStrip
            label="인쇄 검토 지면"
            hint="H1 공용 지면 · 쪽을 누르면 크게 봅니다."
            pages={reviewPages.map((node, i) => ({
              key: `review-${i}`,
              node: (
                <div
                  className={s.paper}
                  data-landscape-preview={dialog === "class-print"}
                >
                  {node}
                </div>
              ),
              caption: `${i + 1} / ${reviewPages.length}쪽`,
              enlargeLabel: `인쇄 검토 ${i + 1}쪽 확대`,
            }))}
          />
        </PickerDialog>
      )}
    </div>
  );
}
