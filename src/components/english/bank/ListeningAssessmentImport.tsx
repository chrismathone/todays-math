"use client";

import { useEffect, useRef, useState } from "react";
import { ENGLISH_GRADES } from "@/contracts/english.contract";
import { LISTENING_MAX_DURATION_MS } from "@/contracts/englishListeningSource.contract";
import type { ListeningSetDetail } from "@/contracts/englishListeningHttp.contract";
import type { ListeningAudioRef } from "@/contracts/englishListening.contract";
import type { ListeningEditQuestion } from "../listening/listeningDraft";
import {
  listeningError,
  listeningRequest,
  ListeningRequestError,
} from "../listening/listeningClient";
import { uploadListeningAudio } from "../listening/listeningUpload";
import { ListeningTeacherAudio } from "../listening/ListeningTeacherAudio";
import { usesWholeSourceAssessmentAudio } from "@/lib/english/listening/wholeSource";
import {
  listeningPdfAnswers,
  readListeningPdfText,
  readListeningQuestionPdf,
} from "./listeningPdfImport";
import s from "../EnglishStudio.module.css";
import w from "@/components/unified/Workroom.module.css";
import b from "./ListeningAssessmentImport.module.css";

export function ListeningAssessmentImport({
  active = true,
  onImported,
  onState,
}: {
  active?: boolean;
  onImported: (id: string) => void;
  onState?: (dirty: boolean, busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("중1");
  const [year, setYear] = useState(new Date().getFullYear());
  const [round, setRound] = useState(2);
  const [provider, setProvider] = useState("직접 제작");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ListeningEditQuestion[]>([]);
  const [transcript, setTranscript] = useState("");
  const [basis, setBasis] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [distribute, setDistribute] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const previewRef = useRef("");
  const controller = useRef<AbortController | null>(null);
  const saved = useRef<ListeningSetDetail | null>(null);
  const uploaded = useRef<ListeningAudioRef | null>(null);
  const groupId = useRef("");
  const wholeSourceAudio = usesWholeSourceAssessmentAudio({
    source: { kind: "other" },
    groups: [{ questions }],
  });
  useEffect(() => {
    onState?.(Boolean(title || audioFile || questionFile), busy);
  }, [title, audioFile, questionFile, busy, onState]);
  useEffect(
    () => () => {
      controller.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function chooseAudio(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file ? URL.createObjectURL(file) : "";
    setPreviewUrl(previewRef.current);
    setAudioFile(file);
    uploaded.current = null;
    setHasUploaded(false);
  }

  async function readFiles() {
    if (!questionFile) {
      setError("문제지 PDF를 선택하세요.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setNotice("문제지의 그림·표와 문항을 읽는 중입니다.");
    try {
      const parsed = await readListeningQuestionPdf(
        questionFile,
        30,
        request.signal,
      );
      if (answerFile) {
        const answers = listeningPdfAnswers(
          await readListeningPdfText(answerFile),
        );
        for (const question of parsed) {
          const answer = answers.get(question.sourceNumber!);
          if (answer !== undefined)
            question.answerChoiceId = question.choices[answer].id;
        }
      }
      const script = transcriptFile
        ? await readListeningPdfText(transcriptFile)
        : "";
      if (script.length > 40000)
        throw new Error(
          "대본이 40,000자를 초과합니다. 묶음을 나눠 등록하세요.",
        );
      request.signal.throwIfAborted();
      setQuestions(parsed);
      setTranscript(script);
      setNotice(
        `${parsed.length}문항을 읽었습니다. 정답 ${parsed.filter((q) => q.answerChoiceId).length}개 확인. 그림과 문항 번호를 아래에서 확인하세요.`,
      );
    } catch (cause) {
      if (!request.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : listeningError(cause),
        );
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  async function register() {
    if (
      !audioFile ||
      !questionFile ||
      !questions.length ||
      !title.trim() ||
      !basis.trim() ||
      !rightsConfirmed
    ) {
      setError(
        "제목·음원·문제지를 준비하고 문항 읽기와 출처 확인을 완료하세요.",
      );
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    const rights = {
      rightsStatus: "approved" as const,
      allowedUses: [
        "store_original" as const,
        "teacher_review" as const,
        ...(distribute ? ["distribution" as const] : []),
      ],
    };
    try {
      setNotice("듣기 자료를 등록하는 중입니다.");
      if (!saved.current) {
        saved.current = await listeningRequest<ListeningSetDetail>(
          "/sets",
          request.signal,
          "POST",
          {
            title: title.trim(),
            level,
            examId: null,
            basis: basis.trim(),
            rights,
            source: {
              kind: "other",
              provider: provider.trim(),
              year,
              round,
              month: null,
              originalFilename: questionFile.name,
            },
          },
        );
        groupId.current = crypto.randomUUID();
        setHasSaved(true);
      } else
        saved.current = await listeningRequest<ListeningSetDetail>(
          `/sets/${saved.current.id}`,
          request.signal,
        );
      const current = saved.current;
      if (!current.document.rightsReview)
        saved.current = await listeningRequest<ListeningSetDetail>(
          `/sets/${current.id}/review`,
          request.signal,
          "POST",
          {
            expectedRevision: current.revision,
            kind: "rights",
            basis: basis.trim(),
          },
        );
      if (!uploaded.current)
        uploaded.current = await uploadListeningAudio(
          current.id,
          audioFile,
          request.signal,
          setNotice,
        );
      setHasUploaded(true);
      const audio = uploaded.current;
      for (const question of questions)
        if (question.audioRange && question.audioRange.endMs > audio.durationMs)
          throw new ListeningRequestError(
            `${question.sourceNumber}번 음원 구간이 파일 길이를 넘습니다.`,
            400,
            "question_audio_range",
          );
      const authoritative = saved.current!;
      await listeningRequest<ListeningSetDetail>(
        `/sets/${current.id}`,
        request.signal,
        "PATCH",
        {
          title: authoritative.document.title,
          level: authoritative.document.level,
          examId: null,
          basis: authoritative.document.provenance.basis,
          rights: authoritative.document.rights,
          expectedRevision: authoritative.revision,
          groups: [
            {
              id: groupId.current,
              audio,
              transcript: {
                revision: 1,
                text: transcript,
                spokenText: transcript,
                translation: null,
              },
              questions,
            },
          ],
        },
      );
      saved.current = null;
      uploaded.current = null;
      setHasSaved(false);
      setTitle("");
      chooseAudio(null);
      setQuestionFile(null);
      setAnswerFile(null);
      setTranscriptFile(null);
      setQuestions([]);
      setTranscript("");
      setRightsConfirmed(false);
      setBasis("");
      setOpen(false);
      setFileInputKey((value) => value + 1);
      setNotice("듣기 자료를 등록했습니다.");
      onImported(current.id);
    } catch (cause) {
      if (!request.signal.aborted) setError(listeningError(cause));
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className={b.root}>
      <button
        type="button"
        className={w.outlineButton}
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        듣기평가 파일 등록
      </button>
      {open && (
        <form
          className={b.form}
          onSubmit={(event) => {
            event.preventDefault();
            void register();
          }}
        >
          <h2>직접 제작한 듣기 자료 등록</h2>
          <fieldset disabled={busy || hasSaved} className={b.fields}>
            <label className={s.field}>
              제목
              <input
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className={s.field}>
              학년
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                {ENGLISH_GRADES.map((grade) => (
                  <option key={grade}>{grade}</option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              출제 기관
              <input
                maxLength={200}
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              />
            </label>
            <label className={s.field}>
              연도
              <input
                type="number"
                min={1900}
                max={2200}
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              />
            </label>
            <label className={s.field}>
              회차
              <input
                type="number"
                min={1}
                max={10}
                value={round}
                onChange={(event) => setRound(Number(event.target.value))}
              />
            </label>
          </fieldset>
          <fieldset disabled={busy} className={b.files} key={fileInputKey}>
            <label className={s.field}>
              음원 MP3·WAV
              <input
                type="file"
                accept=".mp3,.wav"
                disabled={hasUploaded}
                onChange={(event) =>
                  chooseAudio(event.target.files?.[0] ?? null)
                }
              />
            </label>
            <label className={s.field}>
              문제지 PDF
              <input
                type="file"
                accept=".pdf"
                disabled={hasSaved}
                onChange={(event) => {
                  setQuestionFile(event.target.files?.[0] ?? null);
                  setQuestions([]);
                }}
              />
            </label>
            <label className={s.field}>
              정답 PDF (선택)
              <input
                type="file"
                accept=".pdf"
                disabled={hasSaved}
                onChange={(event) => {
                  setAnswerFile(event.target.files?.[0] ?? null);
                  setQuestions([]);
                }}
              />
            </label>
            <label className={s.field}>
              대본 PDF (선택)
              <input
                type="file"
                accept=".pdf"
                disabled={hasSaved}
                onChange={(event) => {
                  setTranscriptFile(event.target.files?.[0] ?? null);
                  setQuestions([]);
                }}
              />
            </label>
          </fieldset>
          <p>
            직접 작성·녹음하거나 직접 작성한 대본으로 만든 TTS 음원과 문제지를
            등록하세요. 음원 최대 64MB·30분. 그림·표를 보존하며 정답이 없는
            문항은 미정으로 남깁니다.
          </p>
          {previewUrl && active && (
            <>
              {wholeSourceAudio ? <p>회차 전체 원본 음원</p> : null}
              <ListeningTeacherAudio
                key={previewUrl}
                url={previewUrl}
                durationMs={LISTENING_MAX_DURATION_MS}
                disabled={busy}
              />
            </>
          )}
          <button
            type="button"
            className={w.outlineButton}
            disabled={busy || !questionFile || hasSaved}
            onClick={() => void readFiles()}
          >
            문항 읽기
          </button>
          {notice && <p role="status">{notice}</p>}
          {questions.length > 0 && (
            <div className={b.questions}>
              {questions.map((question, index) => (
                <details key={question.id}>
                  <summary>
                    {question.sourceNumber}번 · {question.prompt} · 정답{" "}
                    {question.answerChoiceId
                      ? question.choices.findIndex(
                          (c) => c.id === question.answerChoiceId,
                        ) + 1
                      : "미정"}
                  </summary>
                  {question.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- Preserve the cropped local PDF without an external image request.
                    <img
                      src={question.image.dataUrl}
                      width={question.image.width}
                      height={question.image.height}
                      alt={`${question.sourceNumber}번 원본 문항`}
                    />
                  )}
                  <label className={s.field}>
                    정답
                    <select
                      disabled={busy}
                      value={question.answerChoiceId ?? ""}
                      onChange={(event) =>
                        setQuestions((rows) =>
                          rows.map((row, i) =>
                            i === index
                              ? {
                                  ...row,
                                  answerChoiceId: event.target.value || null,
                                }
                              : row,
                          ),
                        )
                      }
                    >
                      <option value="">미정</option>
                      {question.choices.map((choice, i) => (
                        <option key={choice.id} value={choice.id}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  {wholeSourceAudio ? null : (
                    <>
                      <div className={b.range}>
                        <label className={s.field}>
                          전체 음원 시작 (초)
                          <input
                            disabled={busy}
                            type="number"
                            min={0}
                            step={0.001}
                            value={
                              question.audioRange
                                ? question.audioRange.startMs / 1000
                                : ""
                            }
                            onChange={(event) => {
                              const startMs = Math.round(
                                Number(event.target.value) * 1000,
                              );
                              setQuestions((rows) =>
                                rows.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        audioRange:
                                          event.target.value === ""
                                            ? undefined
                                            : {
                                                startMs,
                                                endMs: Math.max(
                                                  startMs + 1,
                                                  row.audioRange?.endMs ??
                                                    startMs + 1000,
                                                ),
                                              },
                                      }
                                    : row,
                                ),
                              );
                            }}
                          />
                        </label>
                        <label className={s.field}>
                          전체 음원 끝 (초)
                          <input
                            disabled={busy}
                            type="number"
                            min={0}
                            step={0.001}
                            value={
                              question.audioRange
                                ? question.audioRange.endMs / 1000
                                : ""
                            }
                            onChange={(event) => {
                              const endMs = Math.round(
                                Number(event.target.value) * 1000,
                              );
                              setQuestions((rows) =>
                                rows.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        audioRange:
                                          event.target.value === ""
                                            ? undefined
                                            : {
                                                startMs:
                                                  row.audioRange?.startMs ?? 0,
                                                endMs,
                                              },
                                      }
                                    : row,
                                ),
                              );
                            }}
                          />
                        </label>
                      </div>
                      <p>
                        회차 전체는 바로 담을 수 있습니다. 문항별로 골라
                        담으려면 해당 문항 전체가 들리는 시작·끝을 지정하세요.
                      </p>
                    </>
                  )}
                </details>
              ))}
            </div>
          )}
          <fieldset disabled={busy || hasSaved} className={b.rights}>
            <label className={s.field}>
              출처·사용 근거
              <input
                maxLength={1000}
                value={basis}
                onChange={(event) => {
                  setBasis(event.target.value);
                  setRightsConfirmed(false);
                }}
                placeholder="출처와 원본 보관·수업 사용 가능 범위"
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={distribute}
                onChange={(event) => {
                  setDistribute(event.target.checked);
                  setRightsConfirmed(false);
                }}
              />{" "}
              문항 재구성·시험지 출력에도 사용 가능
            </label>
            <label>
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => setRightsConfirmed(event.target.checked)}
              />{" "}
              원본 보관·재생과 선택한 사용 범위를 확인했습니다
            </label>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            className={w.primaryButton}
            disabled={busy || !questions.length || !rightsConfirmed}
          >
            {busy ? "등록 중…" : "듣기은행에 등록"}
          </button>
          {hasSaved && (
            <p>
              등록 초안은 보존됩니다. 같은 자료로 다시 등록을 누르면 이어서
              저장합니다.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
