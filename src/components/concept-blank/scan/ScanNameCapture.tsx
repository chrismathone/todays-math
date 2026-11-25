"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import type { ScanNameCaptureView } from "@/contracts/conceptBlankScanName.contract";
import { encodeScanPhoto, SCAN_PHOTO_ACCEPT } from "./image";
import type { ScanSource } from "./api";
import s from "./scan.module.css";

export function ScanNameCapture({
  issueId,
  source,
  onLinked,
}: {
  issueId: string;
  source: ScanSource;
  onLinked: (id: string) => Promise<void>;
}) {
  const [captureId, setCaptureId] = useState<string | undefined>(() =>
    typeof window === "undefined"
      ? undefined
      : (new URL(window.location.href).searchParams.get("nameCapture") ??
        undefined),
  );
  const [view, setView] = useState<ScanNameCaptureView>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [picker, setPicker] = useState(false),
    [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    autoOpened = useRef<string | null>(null),
    linking = useRef(false),
    inFlight = useRef(false);
  const linked = useRef(onLinked);
  useEffect(() => {
    linked.current = onLinked;
  }, [onLinked]);
  const receive = useCallback(
    async (next: ScanNameCaptureView) => {
      if (next.printedSheetId !== issueId)
        throw new Error("이 지면의 이름 촬영 기록이 아닙니다.");
      setView(next);
      if (next.submissionId && !linking.current) {
        linking.current = true;
        try {
          await linked.current(next.submissionId);
        } finally {
          linking.current = false;
        }
      } else if (
        next.writtenName &&
        !next.job &&
        !next.submissionId &&
        autoOpened.current !== next.id
      ) {
        autoOpened.current = next.id;
        setPicker(true);
      }
    },
    [issueId],
  );
  useEffect(() => {
    if (!captureId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await source.nameGet(captureId, query, controller.signal);
        if (controller.signal.aborted) return;
        await receive(next);
        if (next.job) timer = setTimeout(() => void poll(), 2500);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "이름 읽기 상태를 확인하지 못했습니다.",
          );
      }
    };
    timer = setTimeout(() => void poll(), query ? 250 : 0);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [captureId, query, source, receive, view?.job]);
  const act = async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청을 마치지 못했습니다.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const photo = (file?: File) => {
    if (!file) return;
    void act(async () => {
      const image = await encodeScanPhoto(file);
      const result = await source.nameStart({
        printedSheetId: issueId,
        requestId: crypto.randomUUID(),
        imageDataUrl: image.dataUrl,
      });
      const url = new URL(window.location.href);
      url.searchParams.set("nameCapture", result.id);
      window.history.replaceState(null, "", url);
      setCaptureId(result.id);
      setView(undefined);
      setQuery("");
    });
  };
  const choose = (studentId: string) =>
    void act(async () => {
      const result = await source.nameAction(captureId!, {
        action: "choose",
        studentId,
      });
      await linked.current(result.id);
    });
  const waiting = busy || !!view?.job;
  return (
    <section aria-label="1쪽 촬영">
      <p className={s.notice}>
        채점하기 전의 답안을 1쪽부터 찍어 주세요. QR과 네 모서리 표식이 모두
        나오게 한 쪽 전체를 찍습니다. 1쪽의 이름을 읽어 학생을 찾습니다.
      </p>
      <p className={s.meta}>
        사진은 답과 이름을 읽고 채점하려고 외부 AI(Claude)로 보냅니다.
      </p>
      {error ? (
        <p role="alert" className={s.error}>
          {error}
        </p>
      ) : null}
      <div className={s.actions}>
        <button
          type="button"
          className={s.primary}
          disabled={waiting}
          onClick={() => camera.current?.click()}
        >
          1쪽 찍기
        </button>
        <button
          type="button"
          disabled={waiting}
          onClick={() => input.current?.click()}
        >
          사진 파일 고르기
        </button>
      </div>
      <input
        className={s.hiddenInput}
        tabIndex={-1}
        aria-label="1쪽 카메라 사진"
        ref={camera}
        type="file"
        accept={SCAN_PHOTO_ACCEPT}
        capture="environment"
        disabled={waiting}
        onChange={(e) => {
          photo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        className={s.hiddenInput}
        tabIndex={-1}
        aria-label="1쪽 사진 파일"
        ref={input}
        type="file"
        accept={SCAN_PHOTO_ACCEPT}
        disabled={waiting}
        onChange={(e) => {
          photo(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {captureId ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void act(async () => receive(await source.nameGet(captureId)))
          }
        >
          다시 확인
        </button>
      ) : null}
      {view?.job ? (
        <p role="status">
          {view.job === "waiting"
            ? "앞선 요청을 기다리고 있습니다."
            : "1쪽에서 이름과 답을 읽고 있습니다."}{" "}
          화면을 떠나도 계속됩니다.
        </p>
      ) : null}
      {view?.lastError ? (
        <>
          <p role="alert">{view.lastError}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await source.nameAction(captureId!, { action: "retry" });
                await receive(await source.nameGet(captureId!));
              })
            }
          >
            다시 읽기
          </button>
        </>
      ) : null}
      {view?.writtenName && !view.submissionId ? (
        <>
          <p>
            이름으로 학생을 정하지 못했습니다.{" "}
            {view.writtenName.status === "blank"
              ? "이름 칸이 비어 있습니다."
              : view.writtenName.status === "read" && view.writtenName.text
                ? `읽은 이름: ${view.writtenName.text} · ${
                    view.result === "ambiguous"
                      ? "같은 이름의 학생이 여럿입니다."
                      : "명단에 같은 이름이 없습니다."
                  }`
                : "이름을 또렷하게 읽지 못했습니다."}
          </p>
          <button
            ref={opener}
            type="button"
            disabled={waiting}
            onClick={() => setPicker(true)}
          >
            학생 고르기
          </button>
        </>
      ) : null}
      {picker && view ? (
        <PickerDialog
          title="학생 고르기"
          returnFocus={opener}
          onClose={() => setPicker(false)}
          size="fit"
        >
          <div className={s.pickerBody}>
            {view.writtenName?.text ? (
              <p>
                읽은 이름: {view.writtenName.text}. 이름이 같은 학생을 위에
                두었습니다.
              </p>
            ) : null}
            <label>
              이름·반으로 찾기
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {error ? <p role="alert">{error}</p> : null}
            {view.students.map((student) => (
              <div className={s.rosterRow} key={student.id}>
                <span>
                  {student.candidate ? "이름 같음 · " : ""}
                  {student.name} · {student.className}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`${student.name} 고르기`}
                  onClick={() => choose(student.id)}
                >
                  고르기
                </button>
              </div>
            ))}
            {!view.students.length ? (
              <p>찾는 학생이 없습니다. 이름이나 반으로 찾아 주세요.</p>
            ) : null}
            {view.hasMoreStudents ? (
              <p>더 있습니다. 이름이나 반을 입력해 좁혀 주세요.</p>
            ) : null}
          </div>
        </PickerDialog>
      ) : null}
    </section>
  );
}
