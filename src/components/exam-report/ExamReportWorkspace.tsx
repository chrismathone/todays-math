"use client";

import Link from "next/link";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import type {
  ExamReportList,
  ExamReportOptions,
  ExamReportStyle,
  ExamReportStudent,
  ExamReportSummary,
} from "@/contracts/examReportWorkspace.contract";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import w from "@/components/unified/Workroom.module.css";
import {
  EXAM_REPORT_NOTE_LIMIT,
  EXAM_REPORT_STATUS_LABEL,
} from "@/lib/examReport/settings";
import { studentExamReportPages } from "./ExamReportPaper";
import { EXAM_REPORT_PAPER_CSS } from "./paperStyles";
import {
  downloadExamReport,
  examReportClient,
  type ExamReportClient,
} from "./client";
import { usePaperOverflow } from "./usePaperOverflow";
import s from "./ExamReportWorkspace.module.css";

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
function Badge({ status }: { status: ExamReportSummary["status"] }) {
  return (
    <span className={s.badge} data-status={status}>
      {EXAM_REPORT_STATUS_LABEL[status]}
    </span>
  );
}
const scoreText = (row: ExamReportSummary) =>
  row.score.value === null
    ? "—"
    : `${row.score.value}${row.score.unit === "points" ? "점" : "문항"}`;

const STYLE_LABELS = {
  H1: "H1 (기본)",
  letter: "편지형",
  grid: "정오 격자형",
  ledger: "장부형",
} satisfies Record<ExamReportStyle, string>;

/** Wire A · 합의된 H3 + H1 목록 배지·위쪽 인쇄. 실제 저장만 API로 바꾼다. */
export function ExamReportWorkspace({
  testId,
  source = examReportClient,
}: {
  testId: string;
  source?: ExamReportClient;
}) {
  const [list, setList] = useState<ExamReportList | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState<Record<string, ExamReportStudent>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<
    "note" | "confirm" | "settings" | "print" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [scope, setScope] = useState<"confirmed" | "all">("confirmed");
  const [dialog, setDialog] = useState<"students" | "settings" | null>(null);
  const [pendingOptions, setPendingOptions] =
    useState<ExamReportOptions | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const leaving = useRef(false);
  const selected = details[selectedId];
  const note = notes[selectedId] ?? selected?.report.teacherNote ?? "";
  const dirty = selected !== undefined && note !== selected.report.teacherNote;
  const anyDirty = Object.entries(notes).some(
    ([id, text]) => details[id] && details[id].report.teacherNote !== text,
  );

  useEffect(() => {
    let active = true;
    void source
      .list(testId)
      .then((data) => {
        if (!active) return;
        setList(data);
        setSelectedId((id) =>
          data.students.some((row) => row.student.id === id)
            ? id
            : (data.students[0]?.student.id ?? ""),
        );
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "성적표 목록을 불러오지 못했습니다.",
          );
      });
    return () => {
      active = false;
    };
  }, [source, testId, attempt]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void source
      .student(testId, selectedId)
      .then((data) => {
        if (!active) return;
        setDetails((old) => ({ ...old, [selectedId]: data }));
        setList(
          (old) =>
            old && {
              ...old,
              students: old.students.map((row) =>
                row.student.id === selectedId ? data.summary : row,
              ),
            },
        );
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "학생 성적표를 불러오지 못했습니다.",
          );
      });
    return () => {
      active = false;
    };
  }, [source, testId, selectedId, attempt]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ((anyDirty || busy) && !leaving.current) event.preventDefault();
    };
    const beforeLeave = (event: Event) => {
      if (
        busy ||
        (anyDirty &&
          !window.confirm(
            "저장하지 않은 문장이 있습니다. 성적표를 나가시겠습니까?",
          ))
      )
        event.preventDefault();
      else leaving.current = true;
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("exam-report-before-leave", beforeLeave);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("exam-report-before-leave", beforeLeave);
    };
  }, [anyDirty, busy]);

  const options = list?.options;
  const {
    ref: previewRef,
    overflow,
    checking,
    wrongTableLayout,
    remainingMm,
  } = usePaperOverflow(
    JSON.stringify([selectedId, selected?.report, note, options]),
  );
  let layoutError: string | null = null;
  let pages: ReturnType<typeof studentExamReportPages> = [];
  if (selected?.report.status === "graded" && options) {
    try {
      const outputOptions = {
        mode: options.format,
        style: options.style ?? "H1",
        wrong: options.wrongQuestions,
        retry: options.retries,
        note: options.teacherNote && Boolean(note.trim()),
        average: options.classAverage ? list!.classReport.rollup : null,
        wrongTableLayout,
      };
      pages = studentExamReportPages(
        { ...selected.report, teacherNote: note },
        outputOptions,
      );
    } catch (cause) {
      layoutError =
        cause instanceof Error ? cause.message : "지면을 만들지 못했습니다.";
    }
  }
  const row = selected?.summary;
  const displayStatus =
    row?.status === "confirmed" && dirty ? "stale" : (row?.status ?? "none");
  const confirmed =
    list?.students.filter((student) => student.status === "confirmed").length ??
    0;
  const graded =
    list?.students.filter((student) => student.gradingStatus === "graded")
      .length ?? 0;
  const absent =
    list?.students.filter((student) => student.status === "absent").length ?? 0;
  const canEdit = selected?.report.status === "graded";
  const tooLong = note.length > EXAM_REPORT_NOTE_LIMIT;
  const blocked = Boolean(
    busy || !canEdit || checking || overflow || layoutError || tooLong,
  );

  function choose(id: string) {
    if (!busy) {
      setSelectedId(id);
      setError(null);
      setNotice("");
    }
  }
  async function save(confirm: boolean) {
    if (!selected || blocked) return;
    setBusy(confirm ? "confirm" : "note");
    setError(null);
    setNotice("");
    const id = selectedId;
    try {
      const data = await source[confirm ? "confirm" : "note"](
        testId,
        id,
        selected.summary.revision,
        note,
      );
      setDetails((old) => ({ ...old, [id]: data }));
      setNotes((old) => ({ ...old, [id]: data.report.teacherNote }));
      setList(
        (old) =>
          old && {
            ...old,
            students: old.students.map((student) =>
              student.student.id === id ? data.summary : student,
            ),
          },
      );
      setNotice(
        confirm
          ? "문장을 저장하고 이 학생의 성적표를 확정했습니다."
          : "문장을 저장했습니다.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "저장하지 못했습니다. 입력은 그대로 남아 있습니다.",
      );
      // PDF 실패 전 문장 저장까지는 끝났을 수 있다. 입력을 남기고 최신 판을 다시 읽는다.
      setAttempt((value) => value + 1);
    } finally {
      setBusy(null);
    }
  }
  async function applySettings() {
    if (!list || !pendingOptions || busy) return;
    // 기존 M1도 같은 요약이다. 설정을 그대로 닫는 것만으로 확정을 풀지 않는다.
    if (
      (pendingOptions.style ?? "H1") === (list.options.style ?? "H1") &&
      pendingOptions.wrongQuestions === list.options.wrongQuestions &&
      pendingOptions.retries === list.options.retries &&
      pendingOptions.teacherNote === list.options.teacherNote &&
      pendingOptions.classAverage === list.options.classAverage
    ) {
      setDialog(null);
      return;
    }
    setBusy("settings");
    setError(null);
    try {
      const data = await source.settings(
        testId,
        list.optionsDigest,
        pendingOptions,
      );
      setList(data);
      setDialog(null);
      setDetails((old) =>
        Object.fromEntries(
          Object.entries(old).map(([id, student]) => [
            id,
            {
              ...student,
              options: data.options,
              summary:
                data.students.find((row) => row.student.id === id) ??
                student.summary,
            },
          ]),
        ),
      );
      setAttempt((value) => value + 1);
      setNotice(
        "반 지면 설정을 저장했습니다. 확정한 학생은 다시 확정해 주세요.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "반 지면 설정을 저장하지 못했습니다.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function print(kind: "students" | "class" | "selected") {
    if (busy) return;
    setBusy("print");
    setError(null);
    try {
      const blob =
        kind === "selected"
          ? await source.pdf(testId, selectedId)
          : await source.print(testId, scope, kind);
      downloadExamReport(blob);
      setNotice("PDF를 받았습니다. 파일을 열어 인쇄해 주세요.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "PDF를 받지 못했습니다.",
      );
    } finally {
      setBusy(null);
    }
  }
  function open(next: "students" | "settings", button: HTMLButtonElement) {
    opener.current = button;
    if (next === "settings" && options)
      setPendingOptions({ ...options, format: "S1" });
    setDialog(next);
  }
  const filtered =
    list?.students.filter(
      (student) =>
        student.student.name.includes(query.trim()) &&
        (filter === "all" ||
          (filter === "pending"
            ? !["confirmed", "absent"].includes(student.status)
            : student.status === filter)),
    ) ?? [];
  function roster(inPicker = false) {
    return (
      <>
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
              <option value="all">전체 {list?.students.length}명</option>
              <option value="pending">확정 전</option>
              <option value="confirmed">확정 {confirmed}명</option>
              <option value="stale">다시 확정</option>
              <option value="absent">결시 {absent}명</option>
            </select>
          </label>
        </div>
        <p className={s.listCount}>
          표시 {filtered.length}명 / {list?.students.length}명
        </p>
        {filtered.length ? (
          <ul
            className={s.roster}
            tabIndex={0}
            aria-label="학생 이름과 성적표 상태"
          >
            {filtered.map((student) => (
              <li key={student.student.id}>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  aria-pressed={student.student.id === selectedId}
                  onClick={() => {
                    choose(student.student.id);
                    if (inPicker) setDialog(null);
                  }}
                >
                  <strong>{student.student.name}</strong>
                  <span className={s.score}>{scoreText(student)}</span>
                  <Badge status={student.status} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
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
        )}
      </>
    );
  }
  if (!list)
    return (
      <main className={s.main}>
        <WorkspacePageHeader
          title="성적표"
          description="낸 시험의 학생 성적표"
        />
        <p role={error ? "alert" : "status"}>
          {error ?? "성적표를 불러오는 중입니다."}
        </p>
        {error && (
          <Action
            onClick={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          >
            다시 불러오기
          </Action>
        )}
      </main>
    );
  const report = list.classReport;
  return (
    <div className={s.root}>
      <style>{EXAM_REPORT_PAPER_CSS}</style>
      <main className={s.main}>
        <p className={s.breadcrumb}>
          <Link
            href="/#library"
            onClick={(event) => {
              if (
                !window.dispatchEvent(
                  new Event("exam-report-before-leave", { cancelable: true }),
                )
              )
                event.preventDefault();
            }}
          >
            작업실 · 낸 시험
          </Link>{" "}
          › {report.className} › 성적표
        </p>
        <WorkspacePageHeader
          title={`${report.publication.title} 성적표`}
          description={`${report.className} · ${report.publication.testDate.replaceAll("-", ". ")} · ${report.questions.length}문항`}
        >
          <Action
            disabled={Boolean(busy)}
            onClick={(event) => open("settings", event.currentTarget)}
          >
            반 지면 설정
          </Action>
        </WorkspacePageHeader>
        <div className={s.context}>
          <p>
            채점 {graded}명 · 결시 {absent}명{" "}
            <span>
              확정 {confirmed} / {graded}명
            </span>
          </p>
          <p className={s.meta}>
            지면: 요약 한 장 · {STYLE_LABELS[options?.style ?? "H1"]} · 반
            전체에 적용
          </p>
        </div>
        <section className={s.printBar} aria-label="반 인쇄">
          <div className={s.printTools}>
            <label className={s.inlineField}>
              학생 인쇄 범위
              <select
                disabled={Boolean(busy)}
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as "confirmed" | "all")
                }
              >
                <option value="confirmed">확정된 학생만</option>
                <option value="all">응시 학생 모두 · 확정 전 포함</option>
              </select>
            </label>
            <Action
              disabled={
                Boolean(busy) ||
                (scope === "confirmed" ? confirmed === 0 : graded === 0)
              }
              onClick={() => void print("students")}
            >
              {busy === "print"
                ? "PDF 만드는 중…"
                : `학생 성적표 ${scope === "confirmed" ? confirmed : graded}명 인쇄`}
            </Action>
            <Action
              disabled={Boolean(busy) || list.students.length === 0}
              onClick={() => void print("class")}
            >
              반 성적표 인쇄
            </Action>
          </div>
          <p className={s.meta}>
            저장된 내용으로 PDF를 받습니다. 확정한 학생은 보관본을 쓰며, 결시는
            학생 성적표에서 제외합니다.
            {anyDirty ? " 저장 전 문장은 인쇄에 반영되지 않습니다." : ""}
          </p>
        </section>
        {error && (
          <div className={s.error} role="alert">
            {error}
            <p>입력은 학생별로 남아 있습니다.</p>
            <Action
              disabled={Boolean(busy)}
              onClick={() => {
                setAttempt((value) => value + 1);
                setError(null);
              }}
            >
              최신 기록 다시 확인
            </Action>
          </div>
        )}
        {notice && (
          <p className={s.meta} role="status">
            {notice}
          </p>
        )}
        <div className={s.split}>
          <section
            className={s.listPanel}
            role="region"
            aria-label="반 학생 목록"
          >
            <div className={s.panelHead}>
              <h2>학생</h2>
              <span className={s.meta}>{list.students.length}명</span>
            </div>
            {list.students.length > 20 ? (
              <div className={s.pickerLauncher}>
                <p>
                  <strong>
                    {list.students.find(
                      (student) => student.student.id === selectedId,
                    )?.student.name ?? "학생 없음"}
                  </strong>
                </p>
                <Action
                  disabled={Boolean(busy)}
                  onClick={(event) => open("students", event.currentTarget)}
                >
                  학생 고르기 · {list.students.length}명
                </Action>
                <p className={s.meta}>입력은 학생별로 남습니다.</p>
              </div>
            ) : (
              roster()
            )}
          </section>
          <section className={s.detail} aria-label="선택한 학생 성적표">
            {!selected ? (
              <p className={s.empty}>
                {list.students.length
                  ? "학생 성적표를 불러오는 중입니다."
                  : "이 반의 대상 학생이 없습니다."}
              </p>
            ) : (
              <>
                <header className={s.detailHead}>
                  <h2>
                    {selected.report.student.name}
                    <span>
                      {scoreText(selected.summary)}
                      {canEdit
                        ? ` / ${selected.report.score.maximum}${selected.report.score.unit === "points" ? "점" : "문항"} · 틀린 문항 ${selected.report.wrongQuestions.length}개`
                        : ` · ${EXAM_REPORT_STATUS_LABEL[selected.summary.status]}`}
                    </span>
                  </h2>
                </header>
                {!canEdit ? (
                  <div className={s.absent}>
                    <Badge status={selected.summary.status} />
                    <h3>
                      {selected.report.status === "absent"
                        ? "결시하여 성적표를 만들지 않습니다."
                        : "채점이 끝나면 성적표를 만들 수 있습니다."}
                    </h3>
                    <p>학생 성적표 인쇄·확정 대상에서 제외합니다.</p>
                  </div>
                ) : (
                  <div className={s.detailBody}>
                    <div ref={previewRef} className={s.preview}>
                      {layoutError ? (
                        <p className={s.error} role="alert">
                          {layoutError}
                        </p>
                      ) : (
                        <PaperStrip
                          label="선택한 학생의 성적표"
                          hint={`${STYLE_LABELS[options?.style ?? "H1"]} · 요약 한 장 · ${pages.length}쪽 · 쪽을 누르면 크게 봅니다.`}
                          pages={pages.map((node, i) => ({
                            key: `${selectedId}-${i}`,
                            node: <div className={s.paper}>{node}</div>,
                            caption: `${i + 1} / ${pages.length}쪽`,
                            enlargeLabel: `${selected.report.student.name} 성적표 ${i + 1}쪽 확대`,
                          }))}
                        />
                      )}
                      <p className={s.meta}>
                        틀린 문항 표가 길면 다음 쪽으로 이어집니다. ‘요약 한
                        장’에도 추가 쪽이 붙을 수 있습니다.
                      </p>
                    </div>
                    <section
                      className={s.editor}
                      role="region"
                      aria-label="학생별 문장 편집"
                    >
                      <div className={s.editorTitle}>
                        <h3>원장님 문장</h3>
                        <Badge status={displayStatus} />
                      </div>
                      {displayStatus === "stale" && (
                        <div className={s.warning} role="status">
                          확정 후 문장·지면 설정 또는 채점 기록이 바뀌었습니다.
                          다시 확정해 주세요.
                        </div>
                      )}
                      <label className={s.noteLabel} htmlFor="director-note">
                        원장님 문장
                      </label>
                      <AutoGrowTextarea
                        id="director-note"
                        className={s.noteInput}
                        rows={4}
                        value={note}
                        maxLength={EXAM_REPORT_NOTE_LIMIT}
                        disabled={Boolean(busy)}
                        aria-describedby="note-help note-space note-count"
                        aria-invalid={overflow || tooLong || undefined}
                        placeholder="문장 없이도 확정할 수 있습니다."
                        onChange={(event) => {
                          setNotes((old) => ({
                            ...old,
                            [selectedId]: event.target.value,
                          }));
                          setNotice("");
                        }}
                      />
                      <div className={s.noteHelp}>
                        <p id="note-help">
                          선택 사항 · 비워 두면 지면의 문장 칸을 뺍니다.
                        </p>
                        <p
                          id="note-count"
                          aria-live="polite"
                          data-limit={note.length >= EXAM_REPORT_NOTE_LIMIT}
                        >
                          {note.length}자 · 저장 상한 {EXAM_REPORT_NOTE_LIMIT}자
                        </p>
                      </div>
                      <p id="note-space" className={s.meta} role="status">
                        {checking
                          ? "지면에 남은 자리 확인 중"
                          : !options?.teacherNote
                            ? "지면의 문장 칸이 꺼져 있습니다."
                            : overflow
                              ? "지면에 남은 자리가 없습니다. 문장이나 지면 설정을 확인해 주세요."
                              : remainingMm === null
                                ? "지면에 남은 자리는 미리보기에서 확인합니다."
                                : `지면에 남은 자리: 세로 약 ${Math.floor(remainingMm)}mm. 줄바꿈에 따라 달라집니다.`}
                      </p>
                      {(overflow || tooLong) && (
                        <p role="alert" className={s.error}>
                          지면을 벗어나거나 문장 상한을 넘었습니다. 문장을
                          줄이거나 반 지면 설정을 조정해 주세요.
                        </p>
                      )}
                      <p className={s.meta}>
                        ‘이 학생 확정’은 현재 문장 저장을 포함합니다. 문장
                        저장·PDF 보관에 실패하면 확정하지 않습니다.
                      </p>
                      <div className={s.editorActions}>
                        <span className={s.meta} role="status">
                          {busy === "confirm"
                            ? "문장 저장 · PDF 보관 · 확정 중…"
                            : busy === "note"
                              ? "문장 저장 중…"
                              : checking
                                ? "지면 확인 중"
                                : dirty
                                  ? "저장 전 수정"
                                  : EXAM_REPORT_STATUS_LABEL[row!.status]}
                        </span>
                        <div className={s.actions}>
                          <Action
                            disabled={blocked || !dirty}
                            onClick={() => void save(false)}
                          >
                            {busy === "note" ? "저장 중…" : "문장 저장"}
                          </Action>
                          <Action
                            primary
                            disabled={
                              blocked || (row?.status === "confirmed" && !dirty)
                            }
                            onClick={() => void save(true)}
                          >
                            {busy === "confirm"
                              ? "확정 중…"
                              : displayStatus === "confirmed"
                                ? "확정됨"
                                : displayStatus === "stale"
                                  ? "다시 확정"
                                  : "이 학생 확정"}
                          </Action>
                        </div>
                      </div>
                      {row?.status === "confirmed" && (
                        <Action
                          disabled={Boolean(busy)}
                          onClick={() => void print("selected")}
                        >
                          확정 PDF 받기
                        </Action>
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
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
      {dialog === "settings" && pendingOptions && (
        <PickerDialog
          title="반 지면 설정"
          size="fit"
          doneLabel={busy === "settings" ? "저장 중…" : "적용"}
          doneDisabled={Boolean(busy)}
          cancelLabel="취소"
          returnFocus={opener}
          onClose={() => void applySettings()}
          onCancel={() => {
            if (!busy) setDialog(null);
          }}
        >
          <div className={s.settingsBody}>
            <p className={s.dialogIntro}>
              {report.className} 전체에 적용합니다. 지면이 바뀌면 확정한 학생은
              다시 확정합니다.
            </p>
            <div className={s.settingLayout}>
              <fieldset className={s.settingFields} disabled={Boolean(busy)}>
                <legend>학생 성적표 구성</legend>
                {([["S1", "요약 한 장"]] as const).map(([format, label]) => (
                  <label key={format}>
                    <input
                      type="radio"
                      name="paper-mode"
                      checked={pendingOptions.format === format}
                      onChange={() =>
                        setPendingOptions((old) => old && { ...old, format })
                      }
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              <fieldset className={s.settingFields} disabled={Boolean(busy)}>
                <legend>학생 성적표 양식</legend>
                {(Object.keys(STYLE_LABELS) as ExamReportStyle[]).map(
                  (style) => (
                    <label key={style}>
                      <input
                        type="radio"
                        name="paper-style"
                        checked={(pendingOptions.style ?? "H1") === style}
                        onChange={() =>
                          setPendingOptions((old) => old && { ...old, style })
                        }
                      />
                      {STYLE_LABELS[style]}
                    </label>
                  ),
                )}
              </fieldset>
            </div>
            <fieldset className={s.settingFields} disabled={Boolean(busy)}>
              <legend>지면에 담을 기록</legend>
              {(
                [
                  ["wrongQuestions", "틀린 문항"],
                  ["retries", "재시험 결과"],
                  ["teacherNote", "원장님 문장"],
                  ["classAverage", "반 평균 · 기본 꺼짐"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={pendingOptions[key]}
                    onChange={(event) =>
                      setPendingOptions(
                        (old) => old && { ...old, [key]: event.target.checked },
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <p className={s.meta}>
              문장 칸은 문장이 있는 학생에게만 표시됩니다. 반 평균은 응시 학생
              기준입니다. 틀린 문항 표가 길면 다음 쪽으로 이어집니다.
            </p>
            {error && (
              <p className={s.error} role="alert">
                {error}
              </p>
            )}
          </div>
        </PickerDialog>
      )}
    </div>
  );
}
