"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import type { ScanNameCaptureView } from "@/contracts/conceptBlankScanName.contract";
import { encodeScanPhoto } from "./image";
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
    <section aria-label="이름으로 답안 촬영">
      <p>
        학생지 1쪽 이름 칸으로 답안 주인을 찾습니다. 이름이 하나로 정해지지
        않으면 직접 고릅니다.
      </p>
      <p className={s.meta}>
        읽기·채점을 위해 사진과 답안이 외부 AI 서비스 Claude로 전송됩니다(이름
        칸 포함).
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
          이름 칸부터 사진 찍기
        </button>
        <button
          type="button"
          disabled={waiting}
          onClick={() => input.current?.click()}
        >
          이름 칸 1쪽 파일 고르기
        </button>
      </div>
      <input
        className={s.hiddenInput}
        tabIndex={-1}
        aria-label="이름 칸 카메라 사진"
        ref={camera}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
        aria-label="이름 칸 1쪽 사진 파일"
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
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
          이름 읽기 상태 확인
        </button>
      ) : null}
      {view?.job ? (
        <p role="status">
          {view.job === "waiting"
            ? "차례를 기다리는 중"
            : "1쪽의 이름과 답을 읽고 있습니다."}{" "}
          화면을 떠나도 처리를 이어갑니다.
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
            다시 시도 · 이름 읽기
          </button>
        </>
      ) : null}
      {view?.writtenName && !view.submissionId ? (
        <>
          <p>
            읽은 이름: {view.writtenName.text || "읽은 이름 없음"} ·{" "}
            {view.writtenName.status === "uncertain"
              ? "흐림"
              : view.result === "ambiguous"
                ? "같은 이름이 여럿"
                : "학생 확인 필요"}
          </p>
          <button
            ref={opener}
            type="button"
            disabled={waiting}
            onClick={() => setPicker(true)}
          >
            답안 주인 고르기
          </button>
        </>
      ) : null}
      {picker && view ? (
        <PickerDialog
          title="답안 주인 고르기"
          returnFocus={opener}
          onClose={() => setPicker(false)}
          size="fit"
        >
          <div className={s.pickerBody}>
            <p>
              읽은 이름: {view.writtenName?.text || "읽은 이름 없음"}. 같은 이름
              후보를 먼저 표시합니다.
            </p>
            <label>
              학생·반 찾기
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {error ? <p role="alert">{error}</p> : null}
            {view.students.map((student) => (
              <div className={s.rosterRow} key={student.id}>
                <span>
                  {student.candidate ? "이름 일치 후보 · " : ""}
                  {student.name} · {student.className}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => choose(student.id)}
                >
                  선택 · {student.name}
                </button>
              </div>
            ))}
            {!view.students.length ? (
              <p>일치하는 학생이 없습니다. 학생·반 검색으로 확인해 주세요.</p>
            ) : null}
            {view.hasMoreStudents ? (
              <p>학생 이름이나 반을 입력해 범위를 좁혀 주세요.</p>
            ) : null}
          </div>
        </PickerDialog>
      ) : null}
    </section>
  );
}
