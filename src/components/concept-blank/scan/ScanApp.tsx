"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import { aiImageReducedWarning } from "@/components/unified/aiImageBudget";
import type {
  ScanIssueView,
  ScanSubmissionView,
} from "@/contracts/conceptBlankScanApi.contract";
import {
  scanDestination,
  type ScanDestination,
} from "@/lib/concept-blank/scan/navigation";
import { ScanNameCapture } from "./ScanNameCapture";
import { ScanWrittenName } from "./ScanWrittenName";
import { scanSource, type ScanSource } from "./api";
import { encodeScanPhoto, SCAN_PHOTO_ACCEPT } from "./image";
import { scanIsPublished, scanNumbers } from "./view";
import { ScanAnswers, type ScanAnswersHandle } from "./ScanAnswers";
import { ScanPhoto, ScanPhotoPreview } from "./ScanPhoto";
import { ScanResults } from "./ScanResults";
import s from "./scan.module.css";

const stateName = {
  capturing: "촬영 중",
  read: "답 읽는 중",
  checking: "읽은 답 확인",
  graded: "결과 공개",
  "teacher-corrected": "교사 수정",
};
export default function ScanApp({
  destination,
  source = scanSource,
}: {
  destination: ScanDestination;
  source?: ScanSource;
}) {
  const [issue, setIssue] = useState<ScanIssueView>();
  const [view, setView] = useState<ScanSubmissionView>();
  const [student, setStudent] = useState<ScanIssueView["students"][number]>();
  const [page, setPage] = useState(destination.page);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [observedAt, setObservedAt] = useState(0);
  const inFlight = useRef(false);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const answers = useRef<ScanAnswersHandle>(null);
  const startKey = useRef<{ studentId?: string; requestId: string }>(undefined);
  const acceptView = useCallback(
    (next: ScanSubmissionView) => {
      if (next.printedSheetId !== destination.p)
        throw new Error("이 지면에 제출한 답안이 아닙니다.");
      setView(next);
      setObservedAt(Date.now());
    },
    [destination.p],
  );
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const next = await source.issue(destination.p, "", controller.signal);
        if (destination.page > next.pageCount)
          throw new Error("지면의 쪽 번호를 확인해 주세요.");
        if (controller.signal.aborted) return;
        setIssue(next);
        if (next.role === "student") setStudent(next.students[0]);
        if (destination.submission)
          acceptView(
            await source.get(destination.submission, controller.signal),
          );
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "지면을 열지 못했습니다.",
          );
      }
    })();
    return () => controller.abort();
  }, [
    destination.p,
    destination.page,
    destination.submission,
    source,
    acceptView,
    loadVersion,
  ]);
  const refresh = useCallback(async () => {
    if (view) acceptView(await source.get(view.id));
  }, [view, source, acceptView]);
  const pollingId = view?.id;
  const pollingKind = view?.job?.kind;
  useEffect(() => {
    if (!pollingId || !pollingKind) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const next = await source.get(pollingId, controller.signal);
        if (!stopped) acceptView(next);
      } catch (cause) {
        if (!stopped)
          setError(
            cause instanceof Error
              ? cause.message
              : "처리 상태를 확인하지 못했습니다.",
          );
      }
      if (!stopped) timer = setTimeout(() => void poll(), 2500);
    };
    timer = setTimeout(() => void poll(), 1200);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [pollingId, pollingKind, source, acceptView]);
  useEffect(() => {
    if (!dirty.size) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.size]);
  const onDirty = useCallback(
    (slot: string, changed: boolean) =>
      setDirty((old) => {
        if (old.has(slot) === changed) return old;
        const next = new Set(old);
        if (changed) next.add(slot);
        else next.delete(slot);
        return next;
      }),
    [],
  );
  const run = async (task: () => Promise<void>, propagate = false) => {
    if (inFlight.current) {
      if (propagate) throw new Error("앞선 저장을 마친 뒤 다시 시도해 주세요.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "요청을 마치지 못했습니다.",
      );
      if (propagate) throw cause;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const open = async (id: string) => {
    acceptView(await source.get(id));
    window.history.replaceState(
      null,
      "",
      scanDestination({ ...destination, submission: id }),
    );
  };
  const start = () =>
    run(async () => {
      if (!startKey.current || startKey.current.studentId !== student?.id)
        startKey.current = {
          studentId: student?.id,
          requestId: crypto.randomUUID(),
        };
      const result = await source.start({
        printedSheetId: destination.p,
        ...(issue?.role === "teacher" ? { studentId: student?.id } : {}),
        requestId: startKey.current.requestId,
      });
      await open(result.id);
    });
  const photoInput = (file?: File) => {
    if (!file || !view) return;
    void run(async () => {
      try {
        const encoded = await encodeScanPhoto(file);
        const result = await source.photo(view.id, {
          revision: view.revision,
          imageDataUrl: encoded.dataUrl,
        });
        setPage(result.page);
        setNotice(
          [
            `${result.page}쪽 사진을 저장했습니다.`,
            result.page !== page ? "사진의 QR을 보고 그 쪽에 넣었습니다." : "",
            encoded.reducedTo ? aiImageReducedWarning(encoded.reducedTo) : "",
          ]
            .filter(Boolean)
            .join(" "),
        );
      } finally {
        await refresh();
      }
    });
  };
  const job = (kind: "read" | "grade") =>
    run(async () => {
      if (!view) return;
      try {
        await source.job(view.id, { revision: view.revision, kind });
      } finally {
        await refresh();
      }
    });
  const published = view ? scanIsPublished(view) : false;
  const locked = busy || !!view?.job;
  const photo = view?.photos.find((p) => p.page === page);
  const missing =
    view?.snapshot.pages
      .filter(
        (p) =>
          !view.photos.some(
            (image) => image.page === p.number && image.available,
          ),
      )
      .map((p) => p.number) ?? [];
  const canReclaim =
    !!view?.job &&
    !view.job.waiting &&
    observedAt - Date.parse(view.job.startedAt) >= 360_000;
  const stage = published
    ? "결과"
    : view?.state === "checking"
      ? "읽은 답 확인"
      : "답안 촬영";
  return (
    <main className={s.app}>
      <section
        className={`${s.surface} ${view?.role === "teacher" && published ? s.teacher : ""}`}
      >
        <header className={s.head}>
          <p>오늘의수학 · 개념 백지</p>
          <h1>{stage}</h1>
          <p>{issue?.title ?? "발행 지면 확인"}</p>
        </header>
        <div className={s.body}>
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className={s.notice} role="status">
              {notice}
            </p>
          ) : null}
          {!issue ? (
            <div className={s.empty}>
              {error ? (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setLoadVersion((v) => v + 1);
                  }}
                >
                  다시 열기
                </button>
              ) : (
                <p role="status">지면을 확인하고 있습니다.</p>
              )}
            </div>
          ) : !view ? (
            <>
              {issue.role === "teacher" ? (
                // 원장님 2026-11-25: 이름 칸을 따로 찍지 않는다 — 1쪽 전체를 찍으면 이름을 읽어 학생을 찾는다.
                <ScanNameCapture
                  issueId={issue.id}
                  source={source}
                  onLinked={open}
                />
              ) : (
                <>
                  <div className={s.owner}>
                    <p>
                      {student
                        ? `${student.name} · ${student.className}`
                        : "학생 정보를 불러오고 있습니다."}
                    </p>
                  </div>
                  <p className={s.notice}>
                    채점하기 전의 답안을 찍어 주세요. QR과 네 모서리 표식이 모두
                    나오게 한 쪽 전체를 찍습니다.
                  </p>
                  <button
                    type="button"
                    className={s.primary}
                    disabled={busy || !student}
                    onClick={() => void start()}
                  >
                    답안 촬영 시작
                  </button>
                </>
              )}
              {issue.submissions.length ? (
                <details>
                  <summary>이전에 찍은 답안</summary>
                  <ul className={s.checklist}>
                    {issue.submissions.map((entry) => (
                      <li key={entry.id}>
                        <span>
                          {entry.studentName} · {stateName[entry.state]}
                          <span className={s.meta}>
                            {new Date(entry.createdAt).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => open(entry.id))}
                        >
                          답안 열기
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : (
            <>
              <div className={s.owner}>
                <p>
                  <b>{view.student.name}</b> · {view.student.className}
                </p>
                <span>{stateName[view.state]}</span>
              </div>
              {!published ? <ScanWrittenName view={view} /> : null}
              {view.canChangeStudent ? (
                <button
                  type="button"
                  ref={pickerButton}
                  disabled={locked}
                  onClick={() => setPicker(true)}
                >
                  학생 바꾸기
                </button>
              ) : null}
              {view.lastError ? (
                <p className={s.error} role="alert">
                  {view.lastError} 저장된 사진과 읽은 답은 유지됩니다.
                </p>
              ) : null}
              {view.job ? (
                <div className={s.notice} role="status">
                  <p>
                    {view.job.waiting
                      ? "앞선 요청을 기다리고 있습니다."
                      : view.job.kind === "read"
                        ? "사진에서 답을 읽고 있습니다."
                        : "확인한 답을 채점하고 있습니다."}{" "}
                    화면을 떠나도 계속됩니다.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(refresh)}
                  >
                    다시 확인
                  </button>
                  {canReclaim ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void job(view.job!.kind)}
                    >
                      멈춘 처리 다시 시작
                    </button>
                  ) : null}
                </div>
              ) : null}
              {published ? (
                <ScanResults
                  view={view}
                  busy={busy}
                  source={source}
                  onPage={setPage}
                  save={(input) =>
                    run(async () => {
                      await source.override(view.id, input);
                      await refresh();
                    }, true)
                  }
                />
              ) : (
                <>
                  <label>
                    현재 쪽
                    <select
                      value={page}
                      disabled={busy}
                      onChange={(e) => setPage(Number(e.target.value))}
                    >
                      {view.snapshot.pages.map((p) => (
                        <option value={p.number} key={p.number}>
                          {p.number}/{view.snapshot.pageCount}쪽
                        </option>
                      ))}
                    </select>
                  </label>
                  {view.state === "checking" ? (
                    <>
                      {photo ? (
                        <ScanPhoto
                          photo={photo}
                          submissionId={view.id}
                          source={source}
                          numbers={scanNumbers(view)}
                          onField={(slotId) => answers.current?.focus(slotId)}
                        />
                      ) : null}
                      <ScanAnswers
                        ref={answers}
                        view={view}
                        page={page}
                        busy={locked}
                        onDirty={onDirty}
                        save={(input) =>
                          run(async () => {
                            await source.answer(view.id, input);
                            await refresh();
                          }, true)
                        }
                      />
                      <p className={s.notice}>
                        확인을 마치면 ○·△·×와 까닭이 공개됩니다. 공개 뒤에는
                        교사만 판정을 고칠 수 있습니다.
                      </p>
                      {dirty.size ? (
                        <p role="status">
                          입력한 답을 저장한 뒤 채점해 주세요.
                        </p>
                      ) : null}
                      <button
                        className={s.primary}
                        type="button"
                        disabled={locked || !!dirty.size || !!missing.length}
                        onClick={() => void job("grade")}
                      >
                        {view.lastError
                          ? "다시 채점하기"
                          : "확인 마침 · 채점하기"}
                      </button>
                    </>
                  ) : (
                    <div className={s.camera}>
                      <h2>{page}쪽 찍기</h2>
                      <p>
                        QR과 네 모서리 표식이 모두 나오게 한 쪽 전체를 찍습니다.
                        기울어져도 반듯하게 펴서 저장합니다.
                      </p>
                      <div className={s.actions}>
                        <button
                          className={s.primary}
                          type="button"
                          disabled={locked}
                          onClick={() => camera.current?.click()}
                        >
                          사진 찍기
                        </button>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => upload.current?.click()}
                        >
                          사진 파일 고르기
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    className={s.hiddenInput}
                    tabIndex={-1}
                    aria-label="카메라 사진"
                    ref={camera}
                    type="file"
                    accept={SCAN_PHOTO_ACCEPT}
                    capture="environment"
                    disabled={locked || !!dirty.size}
                    onChange={(e) => {
                      photoInput(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <input
                    className={s.hiddenInput}
                    tabIndex={-1}
                    aria-label="사진 파일"
                    ref={upload}
                    type="file"
                    accept={SCAN_PHOTO_ACCEPT}
                    disabled={locked || !!dirty.size}
                    onChange={(e) => {
                      photoInput(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <p className={s.meta}>
                    사진은 답과 이름을 읽고 채점하려고 외부 AI(Claude)로
                    보냅니다.
                  </p>
                  {view.photos.length ? (
                    <PaperStrip
                      label="찍은 쪽"
                      hint="누르면 크게 봅니다"
                      maxScale={0.18}
                      pages={view.photos.map((image) => ({
                        key: image.id,
                        node: (
                          <ScanPhotoPreview
                            photo={image}
                            submissionId={view.id}
                            source={source}
                          />
                        ),
                        caption: `${image.page}쪽 · ${image.available ? "촬영됨" : "지워짐"}`,
                        enlargeLabel: image.available
                          ? `${image.page}쪽 사진 확대`
                          : undefined,
                      }))}
                    />
                  ) : null}
                  <ul className={s.checklist}>
                    {view.snapshot.pages.map((p) => (
                      <li key={p.number}>
                        <span>
                          {p.number}쪽 ·{" "}
                          {missing.includes(p.number) ? "촬영 필요" : "촬영됨"}
                        </span>
                        <button
                          type="button"
                          disabled={locked || !!dirty.size}
                          onClick={() => {
                            setPage(p.number);
                            upload.current?.click();
                          }}
                        >
                          {missing.includes(p.number)
                            ? `${p.number}쪽 사진 고르기`
                            : `${p.number}쪽 다시 찍기`}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {missing.length ? (
                    <p className={s.notice}>
                      {missing.join(" · ")}쪽이 빠졌습니다. 모든 쪽을 찍어야
                      답을 읽습니다.
                    </p>
                  ) : null}
                  {view.state !== "checking" ? (
                    <button
                      type="button"
                      className={s.primary}
                      disabled={locked || !!missing.length}
                      onClick={() => void job("read")}
                    >
                      {view.lastError ? "다시 읽기" : "답 읽기"}
                    </button>
                  ) : null}
                </>
              )}
              <div className={s.actions}>
                <button
                  type="button"
                  disabled={busy || !!dirty.size}
                  onClick={() =>
                    window.location.assign(
                      scanDestination({
                        ...destination,
                        submission: undefined,
                      }),
                    )
                  }
                >
                  다른 답안 보기
                </button>
                <button
                  type="button"
                  disabled={busy || !!dirty.size}
                  onClick={() => void run(refresh)}
                >
                  새로 불러오기
                </button>
                {view.role === "teacher" && photo?.available ? (
                  <button
                    type="button"
                    ref={deleteButton}
                    disabled={locked || !!dirty.size}
                    onClick={() => setDeleting(true)}
                  >
                    {page}쪽 사진 삭제
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
      {picker && issue ? (
        <StudentPicker
          issue={issue}
          source={source}
          opener={pickerButton}
          close={() => setPicker(false)}
          choose={(value) => {
            setPicker(false);
            if (view)
              void run(async () => {
                await source.assignStudent(view.id, {
                  studentId: value.id,
                  revision: view.revision,
                });
                await refresh();
              });
            else setStudent(value);
          }}
        />
      ) : null}
      {deleting && view && photo ? (
        <PickerDialog
          title={`${page}쪽 사진 삭제`}
          returnFocus={deleteButton}
          onClose={() => setDeleting(false)}
          size="fit"
        >
          <div className={s.pickerBody}>
            <p>
              이 사진을 삭제하면 다시 대조할 수 없습니다. 읽은 글·직접 입력·판정
              이력은 남습니다.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await source.remove(
                    view.id,
                    photo.id,
                    view.revision,
                  );
                  await refresh();
                  setDeleting(false);
                  setNotice(
                    result.deleted
                      ? "사진을 삭제했습니다."
                      : "사진 열람을 막았습니다. 삭제는 다음 정리에서 다시 시도합니다.",
                  );
                })
              }
            >
              사진 삭제 확인
            </button>
          </div>
        </PickerDialog>
      ) : null}
    </main>
  );
}

function StudentPicker({
  issue,
  source,
  opener,
  close,
  choose,
}: {
  issue: ScanIssueView;
  source: ScanSource;
  opener: RefObject<HTMLButtonElement | null>;
  close: () => void;
  choose: (student: ScanIssueView["students"][number]) => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(issue);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        void source
          .issue(issue.id, query, controller.signal)
          .then(setResult, (cause) => {
            if (!controller.signal.aborted)
              setError(
                cause instanceof Error
                  ? cause.message
                  : "학생을 찾지 못했습니다.",
              );
          }),
      250,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [source, issue.id, query]);
  return (
    <PickerDialog
      title="학생 고르기"
      returnFocus={opener}
      onClose={close}
      size="fit"
    >
      <div className={s.pickerBody}>
        <label>
          이름·반으로 찾기
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError("");
            }}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        {result.students.map((student) => (
          <div className={s.rosterRow} key={student.id}>
            <span>
              {student.name} · {student.className}
            </span>
            <button
              type="button"
              aria-label={`${student.name} 고르기`}
              onClick={() => choose(student)}
            >
              고르기
            </button>
          </div>
        ))}
        {!result.students.length ? (
          <p>이 지면에 제출할 수 있는 학생이 없습니다.</p>
        ) : null}
        {result.hasMoreStudents ? (
          <p>더 있습니다. 이름이나 반을 입력해 좁혀 주세요.</p>
        ) : null}
      </div>
    </PickerDialog>
  );
}
